"""Overlapping pole, light and facility actions must retain distinct reachable targets."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[2]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.add_init_script('window.requestAnimationFrame=()=>0')
        await pg.goto((ROOT / 'build/preview_city.html').as_uri())
        await pg.wait_for_function('!!window.__game')
        result = await pg.evaluate('''() => {
          const G=window.__game,check=(ok,msg)=>{if(!ok)throw Error(msg)};let lamps=0;
          const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.guards.forEach(g=>g.x=g.y=-9999);return G.S};
          const choose=(k,l)=>{for(let i=0;i<G.envChoices().length;i++){const a=G.envAction();if(a.k===k&&(!l||a.l===l))return a;G.cycleEnv()}throw Error('Missing action '+k)};
          const tick=t=>{for(let n=0;n<t;n+=.02){G.S.t+=.02;G.updatePlayer(.02)}};
          for(const id of ['m1','m2','m3','m4','m5','m6','city']){
            const S=fresh(id),P=S.player;
            for(const l of S.lamps.filter(l=>l.pole)){
              const at=G.lampControl(l);Object.assign(P,{fl:0,z:0,trav:null,interact:null});G.setLayer(0);S.t+=.02;
              const foot=[[26,0],[0,32],[-26,32],[26,32],[0,-44]].find(([dx,dy])=>{P.x=at.x+dx;P.y=at.y+dy;return !G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48))&&G.objectReachable(at,48)&&G.nearPole()});
              check(foot,id+' inaccessible switch approach');
              const choices=G.envChoices(),a=choices.find(a=>a.k==='lamp'&&a.l===l),pole=choices.find(a=>a.k==='wireOn'&&a.pole);
              check(a&&pole,id+' pole must not hide light action');check(a.at.x===at.x&&a.at.y===at.y,id+' label anchor disagrees with control');
              if(Math.hypot(P.x-at.x,P.y-at.y)<Math.hypot(P.x-pole.targetObject.x,P.y-pole.targetObject.y))check(G.envAction().k==='lamp',id+' hand at switch should offer light first');
              choose('wireOn');const selected=G.envAction();P.x+=1;S.t+=.02;check(G.envAction().k==='wireOn'&&G.envAction().targetObject===selected.targetObject,id+' explicit pole selection lost');P.x-=1;
              choose('lamp',l);G.actEnv();check(P.interact&&!P.trav,id+' light press started climbing');tick(.5);check(l.off&&!P.interact&&!P.trav,id+' switch did not turn off');
              choose('lamp',l);G.actEnv();tick(.5);check(!l.off,id+' switch cannot turn on again');
              // Blink darkness is not a broken lamp or missing switch.
              if(l.flk){S.t=(Math.PI/2-l.flk.p)/l.flk.f;check(G.nearLamp()===l,id+' blinking light loses interaction')}
              delete l.control;const restored=G.lampControl(l);check(restored.x===at.x&&restored.y===at.y,id+' legacy save switch anchor');lamps++;
            }
          }
          {
            const S=fresh('m1'),P=S.player;for(const k of ['poles','wires','ladders','props','hides','notes','windows','fwindows','doors','lamps','bfuses','traps','corpses','items'])S[k]=[];
            S.vehicles=null;S.camRoom=null;S.facOn=false;G.STAGE.fuse=null;Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0});G.setLayer(0);
            const o={x:P.x,y:P.y-20,tx:33,ty:20,z:2},w={a:{x:o.x,y:o.y,pole:o,z:2},b:{x:o.x+200,y:o.y,z:2},sag:8};o.wires=[w];S.poles=[o];S.wires=[w];
            const l={x:P.x+4,y:P.y,fl:0,pole:true,control:{x:P.x+4,y:P.y,fl:0,z:0}};S.lamps=[l];
            const d={x:P.x-15,y:P.y,tx:32,ty:21,fl:0,locked:false,orig:'.'};d.group=[d];S.doors=[d];
            const keys=G.envChoices().map(a=>a.k);check(['lamp','wireOn','door'].every(k=>keys.includes(k)),'third overlapping facility lost: '+keys);
            // A global fuse has its own identity, so it cannot truncate candidates after it.
            G.STAGE.fuse=[33,21,33,21];S.t+=.02;check(G.envChoices().some(a=>a.k==='door'),'global fuse blocked another facility');G.STAGE.fuse=null;
            // The pole base must also respect walls, including an opaque intermediate tile.
            let tested=false;
            for(let y=1;y<G.MH-1&&!tested;y++)for(let x=1;x<G.MW-1&&!tested;x++)if(G.tileG(x,y)==='#'&&!G.solidAt(x-1,y)&&!G.solidAt(x,y-1)){
              P.x=x*48-14;P.y=y*48+20;const pole={x:x*48+20,y:y*48-14,z:2,wires:[w]};
              if(G.los(P.x,P.y,pole.x,pole.y))continue;S.poles=[pole];check(Math.hypot(P.x-pole.x,P.y-pole.y)<56,'wall fixture outside radius');
              check(!G.nearPole(),'pole reachable through a wall corner');tested=true;
            }
            check(tested,'missing wall-corner fixture');
          }
          return {poleLights:lamps,overlap:'pole/light/door and global fuse',legacyAnchors:true};
        }''')
        assert not errors, errors
        print('PASS', result)
        for mobile in [False, True]:
            context = await b.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile)
            ui = await context.new_page()
            ui.on('pageerror', lambda e: errors.append(str(e)))
            await ui.add_init_script('''(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()''')
            await ui.goto((ROOT / 'build/preview_city.html').as_uri())
            await ui.wait_for_function('!!window.__game')
            await ui.evaluate('''()=>{const G=window.__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player;
              S.guards.forEach(g=>{g.x=g.y=-9999;g.route=[{x:-9999,y:-9999,pause:999}];g.path=g.wander=g.sched=null});
              const l=S.lamps.find(l=>l.pole),at=G.lampControl(l);window.__lamp=l;Object.assign(P,{x:at.x,y:at.y+32,fl:0,z:0});G.setLayer(0);G.cam.x=P.x;G.cam.y=P.y;
              for(let i=0;i<G.envChoices().length&&G.envAction().k!=='lamp';i++)G.cycleEnv();window.__step(2)}''')
            assert await ui.evaluate("window.__game.envAction().k==='lamp'"), 'Touch fixture lost light action'
            if mobile:
                await ui.locator('#btnCarry').tap()
            else:
                await ui.keyboard.press('KeyX')
            assert await ui.evaluate('!!window.__game.S.player.interact&&!window.__game.S.player.trav'), 'Light control input climbed the pole'
            await ui.evaluate('window.__step(35)')
            assert await ui.evaluate('window.__lamp.off&&!window.__game.S.player.trav'), 'Actual input did not switch light off'
            await context.close()
        assert not errors, errors
        print('PASS actual keyboard and mobile light-switch input')
        await b.close()

asyncio.run(main())
