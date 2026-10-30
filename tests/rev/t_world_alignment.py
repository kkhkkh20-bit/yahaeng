"""Carried-body rendering, faction borders and rooftop entrances must agree with the world."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        pg = await browser.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.add_init_script('window.requestAnimationFrame=()=>0')
        await pg.goto((ROOT / 'build/preview_city.html').as_uri())
        await pg.wait_for_function('!!window.__game')
        await pg.wait_for_function('window.__game.prBench().n > 0')
        result = await pg.evaluate('''() => {
          const G=window.__game,passed=[];
          const check=(ok,msg)=>{if(!ok)throw Error(msg)};
          const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();return G.S};
          const overlaps=(a,b)=>!(a[2]<b[0]||a[0]>b[2]||a[3]<b[1]||a[1]>b[3]);
          for(let repeat=0;repeat<3;repeat++)for(const id of ['m1','m2','m3','m4','m5','m6']){
            const S=fresh(id);
            if(['m2','m3','m4','m5'].includes(id))check(S.guards.filter(g=>g.rival).length===3,id+' must retain three rivals');
            for(const r of S.turf.B){
              check(!S.turf.A.some(a=>overlaps(r,a)),id+' A/B territories must not overlap');
              for(const b of G.BLD)if(overlaps(r,[b.x0,b.y0,b.x1,b.y1]))check(b.gang==='B',id+' rival border encloses another faction building');
            }
            for(const g of S.guards.filter(g=>g.rival&&S.turf.B.some(r=>r.dyn)))for(const wp of [{x:g.x,y:g.y},...g.route])check(G.inTurf('B',wp.x,wp.y),id+' rival spawn/waypoint outside territory');
          }
          passed.push('territories and rival routes across six missions, three starts each');
          {
            const S=fresh('m4'),P=S.player,ctx=G.ctx,draw=ctx.drawImage;
            let count=0;ctx.drawImage=function(...a){count++;return draw.apply(this,a)};
            try{for(const fl of [0,1,2]){
              const c={ch:'sam',x:P.x,y:P.y,fl,z:0,a:0,carried:false};P.fl=fl;P.z=0;P.carrying=null;count=0;G.drawBody(c);check(count>0,'Loose corpse must render on floor '+fl);
              c.carried=true;P.carrying=c;count=0;G.drawBody(c);check(count===0,'Paired carry must suppress duplicate floor corpse on floor '+fl);
              P.carrying=null;c.carried=false;count=0;G.drawBody(c);check(count>0,'Dropped corpse must render again on floor '+fl);
            }}finally{ctx.drawImage=draw}
          }
          passed.push('no duplicate corpse on ground, second and third floors; drop restores rendering');
          let doors=0;
          for(const id of ['m1','m2','m3','m4','m5','m6']){
            const S=fresh(id),P=S.player;S.guards.forEach(g=>{g.x=g.y=-9999});
            for(const l of S.ladders.filter(l=>l.roofDoor)){
              Object.assign(P,{x:l.rx,y:l.ry,fl:0,z:l.tz,trav:null,jump:null,ledge:null,wire:null,cover:null,snap:null,pick:null,interact:null,lunge:null,grabIn:null,bodyAnim:null,strikeT:0,carrying:null,captive:null});G.setLayer(0);
              const d=l.roofDoor;
              check(G.nearClimbDown()===l,id+' roof door must be usable from its step');
              const a=G.envChoices().find(a=>a.k==='down'&&a.l===l);
              check(a&&a.at===d,id+' label must point at the physical doorway');
              check(Math.hypot(d.x-l.rx,d.y-l.ry)>10,id+' doorway and standing tile must have distinct anchors');
              P.x=l.rx-d.dy*43;P.y=l.ry+d.dx*43;
              check(G.nearClimbDown()!==l,id+' empty space beside the room must not select the doorway');
              P.x=d.x-d.dx*25;P.y=d.y-d.dy*25;
              check(G.nearClimbDown()!==l,id+' room back wall must not select the doorway');
              P.x=l.rx;P.y=l.ry;for(let i=0;i<G.envChoices().length;i++){const a=G.envAction();if(a.k==='down'&&a.l===l)break;G.cycleEnv()}
              check(G.envAction().k==='down'&&G.envAction().l===l,id+' selected action must match this doorway');G.actEnv();check(P.trav,id+' descent must play the traversal animation');
              for(let t=0;t<1.5&&P.trav;t+=.02){S.t+=.02;G.updatePlayer(.02)}
              check(!P.trav&&P.z===0&&P.fl===(l.bfl||0),id+' descent must finish on the correct interior floor');
              const e=G.stairFloor(l.tx,l.ty,l.bfl||0).up.entry;check(Math.hypot(P.x-e.x,P.y-e.y)<2,id+' descent must land at its open interior entry');doors++;
            }
          }
          check(doors>0,'Missing rooftop doorway fixtures');passed.push(doors+' rooftop doors: labels, approach sides and actual descent');
          {
            const S=fresh('m4'),r=S.turf.B.find(r=>r.dyn),g=S.guards.find(g=>g.rival),x=g.x,y=g.y;
            r[0]=10;r[2]=24;delete r.dyn;g.route=[{x:11*48+24,y:14*48+24,pause:3}];
            S.player.outfit=S.player.disguise='crew';S.ladders.forEach(l=>delete l.roofDoor);
            G.saveCheckpoint();check(G.loadCheckpoint(),'Checkpoint must restore');
            const R=G.S.turf.B[0],q=G.S.guards.find(q=>q.id===g.id);
            check(R.dyn&&!G.S.turf.A.some(a=>overlaps(R,a)),'Old checkpoint territory must be migrated');
            check(G.S.ladders.some(l=>l.roofDoor),'Old checkpoint rooftop anchors must be rebuilt');
            check(q.x===x&&q.y===y&&q.route.every(p=>G.inTurf('B',p.x,p.y)),'Checkpoint migration must repair routes without teleporting NPCs');
            check(G.S.player.outfit==='crew','Checkpoint migration must preserve player progress');
          }
          passed.push('legacy checkpoint repair without losing progress');
          return passed;
        }''')
        assert not errors, errors
        print('PASS', '; '.join(result))
        await browser.close()

asyncio.run(main())
