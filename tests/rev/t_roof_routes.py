"""Walk across roof joins and into rooftop stair doors using normal player movement."""
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
        result = await pg.evaluate('''() => {
          const G=window.__game,dt=1/120,check=(v,m)=>{if(!v)throw Error(m)};
          let joins=0,crossings=0,doors=0;
          const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.guards.forEach(g=>{g.x=g.y=-9999});return G.S};
          const place=(S,x,y,z,fl=0)=>{Object.assign(S.player,{x,y,z,fl,vx:0,vy:0,trav:null,cover:null,snap:null,jump:null,ledge:null,wire:null,hide:null,under:null,vent:null,carrying:null,captive:null,grabIn:null,interact:null,bodyAnim:null,pick:null,lunge:null,strikeT:0,lethalHold:null});S.keys={};S.stairArm=true;G.input.joy=null;G.input.sneakToggle=false;G.setLayer(fl)};
          const tick=S=>{S.t+=dt;G.updatePlayer(dt)};
          const move=(S,x,y,mobile)=>{if(mobile){G.input.sneakToggle=true;G.input.joy={x:x*.35,y:y*.35,mag:.35}}else{S.keys={};S.keys[x?(x>0?'ArrowRight':'ArrowLeft'):(y>0?'ArrowDown':'ArrowUp')]=true}};
          for(const id of ['m3','m4','m5']) {
            const S=fresh(id),P=S.player;
            for(const p of G.PLANKS) {
              // This test covers equal-height walking links, including both joins in the report's m3 screenshot.
              if(!p.a||!p.b)continue;
              const solid=G.solidFor(p.z);
              for(let y=p.y0;y<=p.y1;y++)for(let x=p.x0;x<=p.x1;x++)check(!solid(x,y),id+' broken plank collision');
              for(const mobile of [false,true])for(const reverse of [false,true]) {
                const a=reverse?p.b:p.a,b=reverse?p.a:p.b,dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y),tag=id+' bridge '+JSON.stringify(p)+' '+mobile+' '+reverse;
                place(S,a.x*48+24,a.y*48+24,p.z);move(S,dx,dy,mobile);
                let n=0;
                while(n++<1500&&((b.x*48+24-P.x)*dx+(b.y*48+24-P.y)*dy)>2){tick(S);check(!P.trav&&!P.jump&&!P.ledge&&P.z===p.z,tag+' requires a jump or grabs the edge')}
                check(n<1500,tag+' cannot walk to other rooftop');check(!solid(Math.floor(P.x/48),Math.floor(P.y/48)),tag+' blocked landing');crossings++;
              }
              joins++;
            }
            if(id==='m3'){
              check(G.PLANKS.length===2&&G.PLANKS.every(p=>p.y0===8&&p.a.y===7&&p.b.y===12),'reported north/south bridge does not reach the actual roof');
              // Drawing spans the facade and overlaps both roofs, rather than stopping at the building footprint.
              const c=G.ctx,fill=c.fillRect,rects=[];c.fillRect=function(...a){rects.push(a);return fill.apply(this,a)};
              try{G.drawPlanks()}finally{c.fillRect=fill}
              for(const p of G.PLANKS){check(rects.some(([x,y,w,h])=>x===p.x0*48+4&&y<p.y0*48&&y+h>(p.y1+1)*48),'painted bridge missing roof overlap')}
            }
          }
          for(const id of ['m1','m2','m3','m4','m5','m6','city']) {
            const S=fresh(id),P=S.player;
            for(const l of S.ladders.filter(l=>l.kind==='stair'&&l.roofDoor)) {
              const d=l.roofDoor,tag=id+' door '+l.tx+','+l.ty;
              // A walk-in room must not hide a nearby pipe's deliberate descent action.
              place(S,l.rx,l.ry,l.tz);
              const pipe={kind:'pipe',tz:l.tz,bz:0,bfl:0,x:l.rx,y:l.ry,ux:l.rx,uy:l.ry,rx:l.rx,ry:l.ry};S.ladders.push(pipe);
              check(G.nearClimbDown(true)===pipe&&G.envChoices().some(a=>a.k==='down'&&a.l===pipe),tag+' hides nearby pipe control');S.ladders.pop();
              for(const mobile of [false,true]) {
                place(S,l.rx,l.ry,l.tz);check(!G.envChoices().some(a=>a.k==='down'&&a.l===l),tag+' still exposes a descent button');
                for(let n=0;n<20;n++)tick(S);check(!P.trav&&P.z===l.tz,tag+' descends while idle');
                // Passing beside the door, pushing its side, walking away and other levels cannot descend.
                move(S,-d.dy,d.dx,mobile);for(let n=0;n<8;n++)tick(S);check(!P.trav,tag+' catches a passerby');
                place(S,l.rx,l.ry,l.tz);move(S,d.dx,d.dy,mobile);for(let n=0;n<8;n++)tick(S);check(!P.trav,tag+' descends moving away');
                place(S,d.x+d.dx*18-d.dy*36,d.y+d.dy*18+d.dx*36,l.tz);move(S,-d.dx,-d.dy,mobile);for(let n=0;n<8;n++)tick(S);check(!P.trav,tag+' enters through side wall');
                place(S,d.x-d.dx*24,d.y-d.dy*24,l.tz);check(!G.roofStairAccess(l),tag+' accepts back of room');
                place(S,l.rx,l.ry,l.tz+1);check(!G.roofStairAccess(l),tag+' accepts wrong height');
                place(S,l.rx,l.ry,l.tz);move(S,-d.dx,-d.dy,mobile);
                const count=S.stats.roofStair||0;let n=0;
                for(;n<250&&!P.trav;n++)tick(S);
                check(P.trav&&P.trav.stairs&&!P.trav.stairs.up,tag+' no automatic descent '+mobile);check(n<100,tag+' entrance is hard to enter');
                let changes=0,prev=P.z;
                for(n=0;n<1000&&P.trav;n++){const x=P.x,y=P.y;tick(S);check(Math.hypot(P.x-x,P.y-y)<2,tag+' teleports');if(P.z!==prev){prev=P.z;changes++}}
                check(!P.trav&&P.z===0&&P.fl===(l.bfl||0)&&changes===1,tag+' wrong floor or multiple changes');
                const lower=G.stairFloor(l.tx,l.ty,l.bfl||0).up.entry;check(Math.hypot(P.x-lower.x,P.y-lower.y)<1&&!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48)),tag+' blocked interior arrival');
                for(let n=0;n<15;n++)tick(S);check(!P.trav&&P.z===0,tag+' held movement bounces back');check(S.stats.roofStair===count+1,tag+' counts descent more than once');
                G.input.joy=null;S.keys={};tick(S);doors++;
              }
            }
          }
          return {joins,crossings,doorApproaches:doors};
        }''')
        # Exercise actual browser keyboard/touch events as well as the exhaustive movement cases above.
        mobile = await browser.new_page(viewport={'width':390,'height':844},has_touch=True)
        mobile.on('pageerror', lambda e: errors.append(str(e)))
        await mobile.add_init_script('window.requestAnimationFrame=()=>0')
        await mobile.goto((ROOT / 'build/preview_city.html').as_uri())
        await mobile.wait_for_function('!!window.__game')
        setup = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m3'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,l=S.ladders.find(l=>l.roofDoor&&G.bldAt(l.tx,l.ty)===3);S.guards.forEach(g=>{g.x=g.y=-9999});Object.assign(S.player,{x:l.rx,y:l.ry,z:l.tz,fl:0,vx:0,vy:0,trav:null,cover:null});G.setLayer(0);S.stairArm=true;G.input.joy=null;S.keys={}}'''
        enter = '''()=>{const G=__game,S=G.S,P=S.player;for(let i=0;i<120&&!P.trav;i++){S.t+=1/120;G.updatePlayer(1/120)}if(!P.trav?.stairs||P.trav.stairs.up)throw Error('browser input did not enter rooftop doorway');for(let i=0;i<1000&&P.trav;i++){S.t+=1/120;G.updatePlayer(1/120)}if(P.trav||P.z||P.fl!==1)throw Error('browser input arrived on wrong floor')}'''
        await pg.evaluate(setup)
        await pg.keyboard.down('ArrowUp')
        await pg.evaluate(enter)
        await pg.keyboard.up('ArrowUp')
        await mobile.evaluate(setup)
        cdp = await mobile.context.new_cdp_session(mobile)
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':75,'y':650}]})
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':75,'y':625}]})
        assert await mobile.evaluate('!!__game.input.joy && __game.input.joy.y<-.1'), 'touch joystick did not receive movement'
        await mobile.evaluate(enter)
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        assert await mobile.evaluate('__game.input.joy===null'), 'touch release left movement active'
        assert not errors, errors
        print('PASS', result, 'actual keyboard and mobile touch events')
        await browser.close()

asyncio.run(main())
