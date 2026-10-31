"""Player intent must survive overlap, repeated input and animation transitions."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.add_init_script('window.requestAnimationFrame=()=>0')
        await pg.goto((ROOT / 'build/preview_city.html').as_uri())
        await pg.wait_for_function('!!window.__game')
        await pg.evaluate('''() => {
          const G=window.__game;
          window.check=(ok,msg)=>{if(!ok)throw Error(msg)};
          window.fresh=()=>{
            G.start(G.STAGES.findIndex(s=>s.id==='m1'));
            for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
            const S=G.S,P=S.player;S.guards.forEach(g=>{g.x=g.y=-9999});
            for(const k of ['props','corpses','hides','notes','lamps','bfuses','cams','items','windows','fwindows','doors','ladders','wires','traps'])S[k]=[];
            S.facOn=false;S.usesDone={};G.STAGE.uses=[];S.t=10;
            Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0,outfit:null,disguise:null,item:null,carry:null,carrying:null,captive:null,light:1});
            G.setLayer(0);window.P=P;window.S=S;
          };
          window.advance=(seconds)=>{for(let t=0;t<seconds;t+=.02){G.S.t+=.02;G.updatePlayer(.02)}};
          window.finishAccess=()=>{let n=0;while(G.S.player.trav&&n++<400)advance(.01);check(n<400,'Access never completes')};
          window.choose=(k,obj)=>{const n=G.envChoices().length;for(let i=0;i<n;i++){const a=G.envAction();if(a.k===k&&(!obj||a.c===obj||a.p===obj))return a;G.cycleEnv()}throw Error('Missing choice '+k)};
          window.prop=(id,dx=24)=>{const a={id,name:id,x:P.x+dx,y:P.y,fl:0,taken:false};S.props.push(a);return a};
          window.body=(dx)=>{const c={x:P.x+dx,y:P.y,fl:0,z:0,ch:'sam',outfit:'crew',stripped:false,carried:false,stashed:false};S.corpses.push(c);return c};
        }''')
        result = await pg.evaluate('''() => {
          const G=window.__game,passed=[];
          fresh();const a=prop('can'),b=prop('medicine',-24);
          check(G.envChoices().filter(a=>a.k==='pickup').length===2,'Both overlapping props must be selectable');
          choose('pickup',b);G.actEnv();check(!P.item&&P.interact,'Pickup must show a reach before acquisition');
          const I=P.interact;advance(.1);for(let i=0;i<8;i++){G.actEnv();G.actAttack();G.actGrab()}
          check(P.interact===I&&I.t>=.1&&!P.item,'Repeated presses must not reset or skip pickup');
          check(G.envAction().busy&&G.attackAction().k==='none','Busy prompts must match input lock');
          advance(.18);check(P.item===b&&P.interact,'Selected prop must transfer at contact, with recovery still playing');
          advance(.3);check(!P.interact&&a.taken===false&&b.taken,'Pickup must finish on selected prop');passed.push('overlap and pickup phases');
          fresh();P.a=Math.PI;const d={x:P.x+24,y:P.y,fl:0,tx:33,ty:21,locked:true,orig:'.'};d.group=[d];
          G.doAct({k:'door',d});advance(.22);check(!d.locked&&Math.abs(Math.atan2(Math.sin(P.a),Math.cos(P.a)))<.1,'Character must face door before contact '+JSON.stringify({locked:d.locked,a:P.a,t:P.interact&&P.interact.t}));advance(.2);passed.push('facing at contact');
          fresh();const door={x:P.x+24,y:P.y,fl:0,tx:33,ty:21,locked:true,orig:'.'};door.group=[door];G.doAct({k:'door',d:door});
          door.locked=false;advance(.5);check(!door.locked,'A door opened by someone else must not close at contact');passed.push('door intent');
          fresh();const far=body(30),near=body(-15);
          choose('carry',far);const selected=G.envAction();P.x+=1;G.actEnv();
          check(P.carrying===far&&!near.carried,'Carry must use selected corpse, not nearest corpse');
          const BA=P.bodyAnim;G.actCarry({k:'dress',c:near});G.actAttack();check(P.carrying===far&&P.bodyAnim===BA&&!near.stripped,'Lift animation must not be overwritten');
          advance(.8);check(!G.actionBusy(),'Lift must release controls after completion');passed.push('selected corpse and lift lock');
          fresh();const c=body(24);choose('carry',c);
          prop('new candidate',-10);S.t+=.02;
          check(G.envAction().k==='carry'&&G.envAction().c===c,'Candidate insertion must preserve action as well as object');passed.push('selection stability');
          fresh();const cloth=body(24);choose('dress',cloth);G.actEnv();
          check(!P.outfit&&!cloth.stripped,'Dress must wait for contact');advance(.2);G.actEnv();check(!P.outfit,'Dress cannot skip preparation');
          advance(.35);check(P.outfit==='crew'&&cloth.stripped&&P.interact,'Dress applies once and completes recovery');advance(.35);check(!P.interact&&S.stats.dressed===1,'Dress must finish once');passed.push('dress phases');
          fresh();P.item={id:'dose'};G.STAGE.uses=[{need:'dose',at:[33,21],fl:0,permit:'waiter',act:s=>s.effect=(s.effect||0)+1}];
          P.outfit=P.disguise='waiter';P.disguiseBlown=false;G.actEnv();check(!S.effect&&!S.usesDone[0],'Use effect must wait for hands to touch');
          advance(.15);G.actEnv();advance(.32);check(S.effect===1&&S.usesDone[0]&&P.interact,'Use effect must commit exactly once');advance(.4);check(!P.interact&&!(P.useT>S.t),'Authorized work must remain innocent');passed.push('single use effect and permission');
          fresh();const gone=prop('gone');G.actEnv();gone.taken=true;advance(.6);check(!P.item&&!P.interact,'Disappearing target cannot be replaced by another object');passed.push('target revalidation');
          fresh();const distant=prop('distant');G.actEnv();P.x+=100;advance(.6);check(!distant.taken&&!P.interact,'Displaced player cannot complete remote pickup');passed.push('distance revalidation');
          fresh();const x=P.x,y=P.y;G.startTrav({pts:[{x,y,f:0},{x:x+50,y,f:1}],dur:.6,phases:[{to:1,pose:'walk'}]});
          const T=P.trav;advance(.1);G.actCarry({k:'pickup',p:prop('mid-travel')});G.actEnv();G.actGrab();G.actAttack();
          check(P.trav===T&&!P.interact&&!P.item,'Travel cannot be replaced by a hand action');advance(.6);check(!P.trav&&Math.abs(P.x-x-50)<.1,'Travel must finish original trajectory');passed.push('travel continuity');
          fresh();const v={x:P.x+20,y:P.y,tx:33,ty:21,z:0,roof:false};S.vents=[v];const vx=P.x;
          G.doAct({k:'ventIn',v});check(P.trav&&!P.vent&&P.x===vx,'Vent entry must begin at current position');
          const V=P.trav;advance(.1);G.actEnv();G.actAttack();check(P.trav===V&&!P.vent,'Vent entry cannot be skipped by input');
          finishAccess();check(P.vent&&!P.trav&&S.stats.vents===1,'Vent entry must finish inside');
          G.doAct({k:'ventOut',v});check(P.trav&&P.vent,'Vent exit must start inside');finishAccess();check(!P.trav&&!P.vent,'Vent exit must finish');passed.push('vent transitions');
          fresh();const stair={x:P.x,y:P.y};P.pick={kind:'latch',w:{st:'lock'},x:P.x,y:P.y,t:.3,nt:10,dur:.8};const K=P.pick;
          G.actEnv();G.actCarry({k:'pickup',p:prop('while-picking')});check(P.pick===K&&K.t===.3&&!P.interact,'Repeated action cannot restart lockpick');passed.push('lockpick continuity');
          fresh();let found=false;
          for(let y=1;y<G.MH-1&&!found;y++)for(let x=2;x<G.MW-2;x++)if(G.tileCh(x,y)==='#'&&!G.solidAt(x-1,y)&&!G.solidAt(x,y+1)){
            // Stand close to either side of the same wall: euclidean range is valid, physical reach is not.
            P.x=x*48-13;P.y=(y+1)*48-17;const o={x:x*48+17,y:(y+1)*48+13,fl:0};
            if(!G.objectReachable(o,60)){S.props=[{...o,id:'blocked',name:'blocked'}];S.corpses=[{...o,ch:'sam'}];S.hides=[{...o,type:'box'}];found=true;break}
          }
          check(found&&!G.nearProp()&&!G.nearCorpse()&&!G.nearHide(),'Wall must block prop, corpse and hide candidates');passed.push('wall access');
          fresh();S.props=[{id:'upstairs',name:'upstairs',x:P.x+10,y:P.y,fl:1}];check(!G.nearProp(),'Props on another floor cannot be selected');passed.push('floor access');
          let vents=0;
          for(const id of ['m1','m2','m3','m4','m5','m6']){
            G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
            G.S.guards.forEach(q=>{q.x=q.y=-9999});
            for(const v of G.S.vents){const P=G.S.player;
              Object.assign(P,{trav:null,jump:null,vent:false,hide:null,cover:null,snap:null,pick:null,interact:null,carrying:null,captive:null,bodyAnim:null,strikeT:0,x:v.x,y:v.y,fl:0,z:v.z});G.setLayer(0);
              G.doAct({k:'ventIn',v});finishAccess();check(P.vent&&!P.trav,id+' vent entry must finish');
              G.doAct({k:'ventOut',v});finishAccess();check(!P.vent&&!P.trav&&P.z===v.z,id+' vent exit must preserve roof height');
              check(P.z||!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48)),id+' vent exit must land on open ground');vents++;
            }
          }
          check(vents>0,'Mission vent coverage missing');passed.push(vents+' mission vent roundtrips');
          return passed;
        }''')
        assert not errors, errors
        print('PASS', ', '.join(result))
        # Exercise the actual keyboard and touch bindings with controlled render frames.
        for mobile in [False, True]:
            context = await b.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 800}, has_touch=mobile, is_mobile=mobile)
            ui = await context.new_page()
            ui.on('pageerror', lambda e: errors.append(str(e)))
            await ui.add_init_script('''(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()''')
            await ui.goto((ROOT / 'build/preview_city.html').as_uri())
            await ui.wait_for_function('!!window.__game')
            await ui.evaluate('''()=>{const G=window.__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
              const S=G.S,P=S.player;S.guards.forEach(q=>{q.x=q.y=-9999;q.route=[{x:-9999,y:-9999,pause:999}];q.path=q.sched=q.wander=null});
              P.x=33*48;P.y=21*48;P.fl=P.z=0;G.setLayer(0);S.props=[{id:'clothes',name:'자경대원 옷',outfit:'crew',x:P.x+20,y:P.y,fl:0}];S.items=[];S.notes=[];
              const n=G.envChoices().length;for(let i=0;i<n&&G.envAction().k!=='pickup';i++)G.cycleEnv();window.__step(2)}''')
            if mobile:
                await ui.locator('#btnCarry').tap()
            else:
                await ui.keyboard.press('KeyX')
            await ui.evaluate('()=>{window.__I=window.__game.S.player.interact;window.__step(8)}')
            assert await ui.evaluate("!!window.__I&&document.querySelector('#btnCarry').textContent.includes('갈아입는 중')"), 'Busy clothing label must match the action'
            if mobile:
                for selector in ['#btnAct', '#btnCarry', '#btnGrab']:
                    await ui.locator(selector).tap()
            else:
                for key in ['KeyZ', 'KeyX', 'KeyC']:
                    await ui.keyboard.press(key)
            assert await ui.evaluate('window.__game.S.player.interact===window.__I'), 'Repeated real input must preserve animation'
            await ui.evaluate('window.__step(60)')
            assert await ui.evaluate("!window.__game.S.player.interact&&window.__game.S.player.outfit==='crew'&&window.__game.S.stats.dressed===1")
            await context.close()
        assert not errors, errors
        print('PASS keyboard and mobile touch, busy labels, uninterrupted dress and one completion')
        await b.close()

asyncio.run(main())
