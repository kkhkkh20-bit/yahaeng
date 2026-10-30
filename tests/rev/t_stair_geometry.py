"""Stair art, access, landing, player input and NPC routes share one physical structure."""
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
          const G=window.__game, check=(ok,msg)=>{if(!ok)throw Error(msg)}, dt=1/120;
          let flights=0,roofs=0,compact=0,automatic=0,npcs=0;
          for(const id of ['m1','m2','m3','m4','m5','m6','city']) {
            G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
            const S=G.S,P=S.player;S.guards.forEach(g=>{g.x=g.y=-9999});
            const place=(e,fl,z=0)=>{Object.assign(P,{x:e.x,y:e.y,fl,z,trav:null,cover:null,snap:null,carrying:null,captive:null,jump:null,interact:null,bodyAnim:null,pick:null,strikeT:0,hide:null,under:null,vent:null,wire:null});S.keys={};G.input.joy=null;S.stairArm=true;G.setLayer(fl)};
            const tick=()=>{S.t+=dt;G.updatePlayer(dt)};
            const finish=(label)=>{let frames=0,crosses=0,lastFl=P.fl,lastZ=P.z;
              while(P.trav&&frames++<800){const x=P.x,y=P.y;tick();check(Math.hypot(P.x-x,P.y-y)<2,label+' discontinuous position');if(P.fl!==lastFl||P.z!==lastZ){crosses++;lastFl=P.fl;lastZ=P.z}if(P.carrying)check(P.carrying.fl===P.fl&&Math.hypot(P.carrying.x-P.x,P.carrying.y-P.y)<2,label+' detached carry')}
              check(!P.trav&&crosses===1,label+' must cross exactly once');
              check(!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48))||P.z,label+' blocked arrival');
            };
            for(const l of S.ladders.filter(l=>['fstair','stair'].includes(l.kind))) {
              const tag=id+':'+l.tx+','+l.ty+':'+(l.bfl||0),lo=G.stairFloor(l.tx,l.ty,l.bfl||0),up=l.kind==='fstair'?G.stairFloor(l.tx,l.ty,l.tfl):null;
              place(lo.up.entry,l.bfl||0);check(!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48)),tag+' blocked lower entry');
              // Compact shared shafts separate the upper and lower actions along the full-width flight.
              if(!lo.compact)check(G.stairAccess(l,true),tag+' no action at physical foot');
              const a=lo.compact?lo.shaft:lo.up.entry;place(a,l.bfl||0);check(G.stairAccess(l,true),tag+' no up access');
              P.x=a.x-lo.d[1]*40;P.y=a.y+lo.d[0]*40;check(!G.stairAccess(l,true),tag+' through side rail');
              place(a,l.bfl||0);
              if(up)P.carrying={x:P.x,y:P.y,fl:P.fl,z:0,ch:'sam',carried:true};
              G.doAct({k:'up',l});check(P.trav&&P.trav.stairs,tag+' missing up traversal');finish(tag+' up');
              const e=up?up.down.entry:{x:l.rx!=null?l.rx:l.ux,y:l.ry!=null?l.ry:l.uy};check(Math.hypot(P.x-e.x,P.y-e.y)<1,tag+' arrival disagrees with stairs');
              if(up){
                flights++;if(up.compact)compact++;
                check(G.stairAccess(l,false),tag+' cannot descend immediately from arrival');
                const back={x:up.down.marker.x-up.d[0]*24,y:up.down.marker.y-up.d[1]*24};
                P.x=back.x;P.y=back.y;check(!G.stairAccess(l,false),tag+' down from closed end');
                P.x=e.x-up.d[1]*40;P.y=e.y+up.d[0]*40;check(!G.stairAccess(l,false),tag+' down through railing');
                P.x=e.x;P.y=e.y;G.doAct({k:'fdown',l});
              }else{roofs++;G.doAct({k:'down',l})}
              check(P.trav,tag+' missing descent');finish(tag+' down');check(Math.hypot(P.x-lo.up.entry.x,P.y-lo.up.entry.y)<1,tag+' wrong lower landing');
              if(up){
                // Keyboard and slow mobile joystick use the same entrance; held input cannot re-trigger.
                for(const mobile of [false,true]){
                  place(a,l.bfl||0);const d=lo.d,key=d[0]?(d[0]>0?'ArrowLeft':'ArrowRight'):(d[1]>0?'ArrowUp':'ArrowDown');
                  if(mobile){G.input.joy={x:-d[0]*.35,y:-d[1]*.35,mag:.35};G.input.sneakToggle=true}else S.keys[key]=true;
                  for(let n=0;n<300&&!P.trav;n++)tick();check(P.trav,tag+' auto up '+mobile);finish(tag+' automatic up');
                  for(let n=0;n<20;n++)tick();check(!P.trav&&P.fl===l.tfl,tag+' held input bounced');
                  S.keys={};G.input.joy=null;tick();G.input.sneakToggle=false;
                  P.x=up.down.entry.x;P.y=up.down.entry.y;
                  G.input.joy={x:-up.d[0]*.35,y:-up.d[1]*.35,mag:.35};
                  for(let n=0;n<200&&!P.trav;n++)tick();check(P.trav,tag+' auto down '+mobile);finish(tag+' automatic down');G.input.joy=null;tick();automatic++;
                }
              }
              // The NPC graph uses walkable entries and the identical turn/flight trajectory.
              G.lvlInit();const edge=S.lvl.ends.find(e=>e.l===l);check(edge,tag+' missing NPC link');
              for(const reverse of [false,true]){
                const from=reverse?edge.B:edge.A,to=reverse?edge.A:edge.B,g={...from,id:990,a:0,hop:{e:edge,from,to}};
                check(G.hopClimb(g,true)&&g.climb.stairs,tag+' NPC stair plan');let frames=0;
                while(g.climb&&frames++<800){const x=g.x,y=g.y;G.updateClimbG(g,dt);check(Math.hypot(g.x-x,g.y-y)<2,tag+' NPC teleports')}
                check(!g.climb&&Math.hypot(g.x-to.x,g.y-to.y)<1&&g.fl===to.fl&&g.z===to.z,tag+' NPC wrong arrival');npcs++;
              }
            }
          }
          // v81 saves can contain a blocked landing and the previous well orientation.
          G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
          const S=G.S,l=S.ladders.find(l=>l.kind==='fstair'&&l.tx===53&&l.ty===10),expected=[];
          for(let y=7;y<=13;y++)for(let x=50;x<=56;x++)expected.push([x,y,G.GF[1][y][x]]);
          S.player.keys.red=true;const px=S.player.x,py=S.player.y;delete S.stairVersion;G.saveCheckpoint();
          G.CP.grids[1][10][52]='K';G.CP.grids[1][9][52]='K';G.CP.grids[1][8][52]='E';
          check(G.loadCheckpoint(),'legacy checkpoint load');
          check(expected.every(([x,y,ch])=>G.GF[1][y][x]===ch),'legacy static stair footprint not repaired');
          check(G.S.player.keys.red&&G.S.player.x===px&&G.S.player.y===py,'checkpoint migration lost progress');
          const e=G.downPt(G.S.ladders.find(q=>q.kind==='fstair'&&q.tx===53&&q.ty===10));G.setLayer(1);
          check(!G.solidAt(Math.floor(e.x/48),Math.floor(e.y/48)),'legacy landing still blocked');
          return {flights,roofs,compact,automatic,npcs,legacySave:true};
        }''')
        assert not errors, errors
        print('PASS', result)
        await browser.close()

asyncio.run(main())
