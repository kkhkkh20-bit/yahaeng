"""Every direct takedown is nonlethal on tap; lethal intent belongs to one held input."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!window.__game')
  result=await pg.evaluate('''()=>{
   const G=window.__game,check=(ok,msg)=>{if(!ok)throw Error(msg)},passed=[];
   let S,P,g;
   const fresh=(kind='crew')=>{G.start(G.STAGES.findIndex(s=>s.id==='m1'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();S=G.S;P=S.player;
    const base=S.guards.find(q=>!q.civ&&!q.dog&&!q.child);for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
    S.vehicles=null;S.camRoom=null;S.facOn=false;S.keys={};S.t=10;S.exitOpen=false;S.koNext=S.lethalNext=false;S.koHold=null;G.input.pressIds={};
    Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0,captive:null,carrying:null,hide:null,cover:null,snap:null,strikeT:0,killAnim:null});G.setLayer(0);
    g={...base,id:111,x:P.x+30,y:P.y,fl:0,z:0,a:0,want:0,target:kind==='target',civ:kind==='civilian',dog:false,child:false,elite:false,hasKey:'red',state:'PATROL',path:null,act:null,route:[{x:P.x+30,y:P.y,pause:999}]};S.guards=[g];return g;
   };
   const press=id=>{S.keys[id]=true;G.combatPress(id)},release=id=>{S.keys[id]=false;G.combatRelease(id)};
   const advance=seconds=>{for(let n=0;n<seconds;n+=.01){S.t+=.01;G.updatePlayer(.01);G.updateKoHold()}};
   for(const kind of ['crew','target','civilian']){
    fresh(kind);check(G.grabAction().k==='grab'&&G.grabAction().g===g,kind+' key theft hides grab');
    const a=G.attackAction();check(a.label.includes('기절')&&a.hold==='처치',kind+' inconsistent attack label');
    press('KeyZ');G.actAttack();advance(.08);release('KeyZ');advance(1.4);
    check(S.corpses.length===1&&S.corpses[0].ko&&S.stats.kills===0,kind+' tap killed');
    if(kind==='target')check(!G.targetEliminated(g)&&!S.exitOpen,'unconscious target completes assassination');
    fresh(kind);press('KeyZ');G.actAttack();advance(.6);check(S.stats.kills===0,kind+' killed before hold threshold');advance(.6);release('KeyZ');
    check(S.stats.kills===1&&!S.corpses[0].ko&&S.stats.ko===0,kind+' held input did not kill once');
    if(kind==='target')check(G.targetEliminated(g)&&S.exitOpen,'held target kill does not complete objective');
   }passed.push('crew, target and civilian: tap KO / hold kill and accurate mission outcome');
   for(const type of ['box','bush'])for(const held of [false,true]){
    fresh('target');g.state='CAPTIVE';P.captive=g;const h={type,x:P.x+24,y:P.y,tx:33,ty:21,fl:0,z:0,bodies:0,cap:3};S.hides=[h];
    const a=G.envAction();check(a.k==='drag'&&a.label.includes('기절')&&a.hold==='처치',type+' drag label');
    press('KeyX');G.actEnv();advance(.08);if(!held)release('KeyX');advance(3.5);release('KeyX');
    check(S.stats.kills===(held?1:0)&&S.corpses[0].ko===!held,type+' drag input ignored nonlethal tap');
   }passed.push('container and bush: same environment button controls tap/hold');
   fresh('target');press('KeyZ');G.actAttack();advance(.2);release('KeyZ');press('KeyX');advance(1.4);release('KeyX');check(S.stats.kills===0,'another button completed lethal hold');
   advance(.2);check(G.attackAction().k==='finish','unconscious target cannot be finished later');
   press('KeyZ');G.actAttack();advance(.4);release('KeyZ');check(S.stats.kills===0&&!P.lethalHold,'early release killed unconscious person');
   press('KeyZ');G.actAttack();advance(1.1);release('KeyZ');check(S.stats.kills===1,'separate deliberate hold cannot finish target');passed.push('release, different input and deliberate later finish');
   fresh('target');const q={...g,id:112,x:g.x,y:g.y+24};S.guards.push(q);press('KeyZ');G.doAct({k:'kill2',list:[g,q]});advance(1.2);release('KeyZ');check(S.stats.kills===2,'double takedown leaves one victim outside hold');passed.push('double takedown keeps both selected victims');
   for(const lethal of [false,true]){fresh('target');const t={type:'guard',ref:g,x:g.x,y:g.y};G.actKunai(t,lethal);check(S.kunais.length===1,'dart did not launch');G.kunaiHit(S.kunais[0]);check(!!S.corpses[0].ko===!lethal&&S.stats.kills===(lethal?1:0),'dart tap/hold policy mismatch '+JSON.stringify({lethal,projectile:S.kunais[0].lethal,ko:S.corpses[0].ko,kills:S.stats.kills,koNext:S.koNext}))}
   passed.push('dart KO / lethal intent carried to impact');
   fresh();press('KeyC');G.actGrab();advance(1.5);release('KeyC');check(P.captive===g&&!S.corpses.length&&S.stats.kills===0,'holding grab kills or knocks out captive');passed.push('holding grab remains a living grapple');
   fresh();const trap={k:'shock',used:false,sw:[33,21],hit:[32,20,34,22]};press('KeyX');G.doAct({k:'trap',tp:{t:trap},inputGroup:'env'});check(P.lethalHold&&!trap.used,'fatal trap fires on tap');advance(.3);release('KeyX');advance(1.1);check(!trap.used,'cancelled trap still fires');passed.push('fatal environment action requires uninterrupted hold');
   fresh();g.dog=true;press('KeyZ');G.doAct({k:'kill',list:[g]});advance(.3);g.fl=1;advance(1);release('KeyZ');check(S.stats.kills===0&&!P.lethalHold,'held action crossed target floor');
   passed.push('pending lethal target cannot change floors');
   return passed;
  }''')
  assert not errors,errors;print('PASS', '; '.join(result))
  for mobile in [False,True]:
   context=await b.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},is_mobile=mobile,has_touch=mobile)
   ui=await context.new_page();ui.on('pageerror',lambda e:errors.append(str(e)))
   await ui.add_init_script('''(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()''')
   await ui.goto((ROOT/'build/preview_city.html').as_uri());await ui.wait_for_function('!!window.__game')
   await ui.evaluate('''()=>{window.__fresh=()=>{const G=window.__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player,base=S.guards.find(g=>!g.dog&&!g.civ&&!g.child);
     for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
     S.vehicles=null;S.camRoom=null;S.facOn=false;S.keys={};G.input.pressIds={};Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0});G.setLayer(0);G.cam.x=P.x;G.cam.y=P.y;
     const g={...base,id:111,target:true,civ:false,child:false,dog:false,elite:false,x:P.x+30,y:P.y,fl:0,z:0,a:0,want:0,state:'PATROL',meter:0,path:null,act:null,sched:null,wander:null,hasKey:'red',route:[{x:P.x+30,y:P.y,pause:999}],wait:999};S.guards=[g];window.__g=g;window.__step(2)};
     window.__texts=[];const c=window.__game.ctx,draw=c.fillText;c.fillText=function(t,...a){window.__texts.push(String(t));return draw.call(this,t,...a)};window.__fresh()}''')
   if mobile:assert await ui.evaluate("getComputedStyle(document.querySelector('#btnCarry')).position==='absolute'&&document.querySelector('#btnCarry').getBoundingClientRect().bottom>innerHeight*.85"),'Environment button moved from existing position'
   cdp=await context.new_cdp_session(ui) if mobile else None
   async def down(key,button):
    if mobile:
     r=await ui.locator(button).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
    else:await ui.keyboard.down(key)
   async def up(key):
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await ui.keyboard.up(key)
   for atk,grab in [('KeyZ','KeyC')] if mobile else [('KeyZ','KeyC'),('Space','KeyQ')]:
    await ui.evaluate('__fresh()');await ui.evaluate('(mode)=>{window.__game.input.kset=mode;window.__texts=[];window.__step(2)}','arrow' if atk=='KeyZ' else 'wasd')
    assert await ui.evaluate("window.__game.grabAction().k==='grab'&&window.__texts.some(t=>t.includes('붙잡기'))"),'Missing visible grab prompt beside key-carrying target'
    if not mobile:assert await ui.evaluate('(key)=>window.__texts.includes(key)','C' if grab=='KeyC' else 'Q'),'Missing grab key on target'
    await down(atk,'#btnAct');await up(atk);await ui.evaluate('__step(90)')
    assert await ui.evaluate('window.__game.S.stats.kills===0&&window.__game.S.corpses[0].ko'),'Real tap kills target'
    await ui.evaluate('__fresh()');await down(atk,'#btnAct');await ui.evaluate('__step(40)');assert await ui.evaluate('window.__game.S.stats.kills===0');assert await ui.evaluate("+document.querySelector('#btnAct').style.getPropertyValue('--hold')>0&&+document.querySelector('#btnCarry').style.getPropertyValue('--hold')===0")
    await ui.evaluate('__step(50)');await up(atk);assert await ui.evaluate('window.__game.S.stats.kills===1&&!window.__game.S.corpses[0].ko'),'Real held attack does not kill'
    await ui.evaluate('__fresh()');await down(grab,'#btnGrab');await ui.evaluate('__step(80)');await up(grab)
    assert await ui.evaluate('window.__game.S.player.captive===window.__g&&window.__game.S.stats.kills===0'),'Real grapple input kills target'
   for held in [False,True]:
    await ui.evaluate('''()=>{__fresh();const S=window.__game.S,P=S.player;P.captive=__g;__g.state='CAPTIVE';S.hides=[{type:'bush',x:P.x+24,y:P.y,tx:33,ty:21,fl:0,z:0,cap:3,bodies:0}];__step(2)}''')
    assert await ui.evaluate("document.querySelector('#btnCarry').textContent.includes('끌고 기절')&&document.querySelector('#btnCarry').textContent.includes('길게 처치')")
    await down('KeyX','#btnCarry')
    if not held:await up('KeyX')
    if held:
     await ui.evaluate('__step(40)');assert await ui.evaluate("+document.querySelector('#btnCarry').style.getPropertyValue('--hold')>0&&+document.querySelector('#btnAct').style.getPropertyValue('--hold')===0");await ui.evaluate('__step(50)')
    else:await ui.evaluate('__step(90)')
    if held:await up('KeyX')
    assert await ui.evaluate('(held)=>window.__game.S.stats.kills===(held?1:0)&&!!window.__game.S.corpses[0].ko===!held',held),'Real environment tap/hold differs from attack policy'
   await ui.evaluate('__fresh()');await down('KeyZ','#btnAct');await ui.evaluate('__step(25);window.dispatchEvent(new Event("blur"));__step(10);window.dispatchEvent(new Event("focus"))');await up('KeyZ');await ui.evaluate('__step(90)');assert await ui.evaluate('window.__game.S.stats.kills===0&&window.__game.S.corpses[0].ko'),'App switch continued lethal input'
   await context.close()
  assert not errors,errors;print('PASS visible grab prompt, both PC key sets and actual mobile touch: tap/hold attack, grapple and bush drag');await b.close()
asyncio.run(main())
