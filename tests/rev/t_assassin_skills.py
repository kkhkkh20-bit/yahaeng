"""Two earned abilities: target rules, physical chain, interruption, save and real inputs."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v147';O.mkdir(exist_ok=True)
FRESH='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tS'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;Object.assign(P,{x:440,y:432,mode:'sneak'});G.input.sneakToggle=true;G.update(.02);window.tick=(seconds,full=true)=>{for(let t=0;t<seconds-1e-6;t+=.01){if(full)G.update(.01);else{S.t+=.01;G.updatePlayer(.01)}}};window.press=()=>{S.keys.KeyB=true;G.combatPress('KeyB');G.beginAssassinSkill()};window.release=()=>{S.keys.KeyB=false;G.combatRelease('KeyB')};window.__skillChain=()=>{S.selectedSkill='chain';S.practiceSkill='chain';S.tutI=4;P.x=906;P.y=456;};}'''
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  await q.evaluate(FRESH)
  checks=await q.evaluate('''()=>{
   const G=__game,S=G.S,P=S.player,ok=(v,m)=>{if(!v)throw Error(m)},passed=[];
   ok(G.assassinOpportunity()?.ids.join(',')==='0,1','No dual opportunity');
   ok(G.attackAction().list.length===1,'Normal attack still grants a free double');
   for(const [field,value] of [['civ',true],['dog',true],['child',true],['elite',true],['fl',1],['z',1],['seen',true],['meter',.4],['state','ALERT'],['a',Math.PI]]){
    const g=S.guards[1],old=g[field];g[field]=value;ok(!G.assassinOpportunity(),'Invalid dual victim '+field);g[field]=old;
   }passed.push('target restrictions and single ordinary attack');
   for(const field of ['wire','ledge','car','hide','carrying','captive','jump','trav','interact']){P[field]={};ok(!G.assassinOpportunity(),'Invalid player state '+field);P[field]=null;}
   press();tick(.6);release();tick(1);ok(!S.stats.kills&&!P.assassinAnim&&!P.skillHold,'Short press caused a kill');
   press();tick(.6);S.guards[1].a=Math.PI;tick(.05);ok(!P.skillHold&&!S.stats.kills,'Turned victim was retargeted');Object.assign(S.guards[1],{a:0,want:0,seen:false,meter:0,state:'PATROL',sense:null});release();
   press();tick(1.55);ok(S.stats.kills===2&&S.corpses.length===2&&S.corpses.every(c=>!c.ko),'Dual must create exactly two lethal corpses');tick(1);release();
   ok(S.stats.dualAssassinations===1&&!P.assassinAnim&&S.corpses.every(c=>!c.skillAnimating)&&S.guards.every(g=>!g.doomed),'Dual failed to release actors');ok(!G.assassinOpportunity(),'Cooldown ignored');passed.push('held preparation, cancellation, dual and recovery');
   return passed;
  }''')
  await q.evaluate(FRESH)
  checks+=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,ok=(v,m)=>{if(!v)throw Error(m)};window.__skillChain();ok(G.assassinOpportunity(),'No chain opportunity');press();tick(1.7);ok(S.stats.kills===1,'First chain kill missing');const x=P.x;tick(.15);ok(P.x>x&&P.x<992&&S.guards[3].state!=='DEAD','Chain teleported or killed remotely');tick(2);release();ok(S.stats.kills===2&&S.stats.chainAssassinations===1&&P.x===992,'Physical chain did not finish');return ['physical movement and delayed second hit'];}''')
  for reason in ['wall','floor','awareness','damage']:
   await q.evaluate(FRESH)
   await q.evaluate('''reason=>{const G=__game,S=G.S,P=S.player;window.__skillChain();press();tick(1.6);if(S.stats.kills!==1)throw Error('No first committed hit');if(reason==='wall')G.G0[9][20]='#';if(reason==='floor')S.guards[3].fl=1;if(reason==='awareness')S.guards[3].seen=true;if(reason==='damage')P.hurtT=.5;tick(.02,false);if(P.assassinAnim||S.stats.kills!==1||S.guards[3].state==='DEAD'||!(S.skillReadyAt>S.t)||S.corpses.some(c=>c.skillAnimating)||S.guards.some(g=>g.doomed))throw Error('Interruption failed: '+reason);}''',reason)
  checks+=['wall, floor, awareness and damage interrupt chain, preserve first death and recovery']
  await q.evaluate(FRESH)
  checks+=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;window.__skillChain();G.G0[9][20]='#';if(G.assassinOpportunity())throw Error('Selects through wall');G.G0[9][20]='.';press();tick(1.6);G.saveCheckpoint();if(!G.loadCheckpoint())throw Error('Save unavailable');const T=G.S;if(T.stats.kills!==1||T.player.assassinAnim||T.player.skillHold||T.corpses.some(c=>c.skillAnimating)||T.guards.some(g=>g.doomed)||!(T.skillReadyAt>T.t))throw Error('Save left ghost skill actors or reset recovery');return ['mid-action checkpoint preserves actual outcome and clears unfinished work'];}''')
  await q.evaluate(FRESH)
  checks+=await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();if(G.S.skillStars||G.assassinOpportunity())throw Error('Practice unlocked campaign skill');const s=G.STAGES.find(s=>s.id==='m1'),ids=s.challenges.slice(0,2),record={_clear:true};ids.forEach(k=>record[k]=true);localStorage.setItem('yahaeng.ch',JSON.stringify({m1:record}));localStorage.removeItem('yahaeng.skillTree.v1');G.initAssassinSkills();if(G.S.skillStars!==3)throw Error('Does not reuse earned mission stars');G.openAssassinMenu();if(document.querySelector('[data-skill="dual"]').disabled||!document.querySelector('[data-skill="chain"]').disabled)throw Error('Incorrect unlock threshold');G.chooseAssassinSkill('chain');if(G.S.selectedSkill!=='dual')throw Error('Locked skill selected');G.closeAssassinMenu();s.challenges.slice(0,5).forEach(k=>record[k]=true);localStorage.setItem('yahaeng.ch',JSON.stringify({m1:record}));localStorage.removeItem('yahaeng.skillTree.v1');G.initAssassinSkills();if(G.S.skillStars!==6)throw Error('Six-star record counted incorrectly');G.openAssassinMenu();G.chooseAssassinSkill('chain');G.closeAssassinMenu();G.initAssassinSkills();if(G.S.selectedSkill!=='chain'||localStorage.getItem('yahaeng.assassinSkill')!=='chain')throw Error('Earned chain choice not persisted');localStorage.clear();return ['practice does not unlock campaign; existing 3/6-star progress unlocks and persists skills'];}''')
  await q.evaluate(FRESH)
  checks+=await q.evaluate('''()=>{const G=__game,S=G.S;G.killGuard(S.guards[0]);G.update(.02);if(!S.over||!S.toasts.some(t=>t.text.includes('공격을 1초')))throw Error('Practice failure hides the relevant instruction');return ['practice wrong-action retry explains the skill input'];}''')
  # A visible third guard is still able to see the actual attack and react.
  await q.evaluate(FRESH)
  checks+=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;const w=S.guards[2];Object.assign(w,{x:P.x-100,y:P.y,a:0,post:0,want:0,seen:false});S.guards=S.guards.slice(0,3);press();tick(2.5);if(!w.seen&&w.state!=='ALERT'&&!(w.meter>0))throw Error('Skill grants invisibility against witness');return ['third-party witness retains normal vision'];}''')
  assert not errors,errors
  # Real desktop keyboard and CDP touch, including skill menu and cancellation.
  for mobile in [False,True]:
   print("INPUT",mobile,flush=True)
   c=await b.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},is_mobile=mobile,has_touch=mobile)
   ui=await c.new_page();ui.on('pageerror',lambda e:errors.append(str(e)));await ui.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await ui.goto((R/'build/preview_city.html').as_uri());await ui.wait_for_function('!!__game');await ui.evaluate(FRESH)
   cdp=await c.new_cdp_session(ui)if mobile else None
   async def down():
    if mobile:
     r=await ui.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
    else:await ui.keyboard.down('b')
   async def up(cancel=False):
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel'if cancel else'touchEnd','touchPoints':[]})
    else:await ui.keyboard.up('b')
   await down();await ui.evaluate('tick(.5)');await up(True);await ui.evaluate('tick(1)');assert await ui.evaluate('!__game.S.stats.kills&&!__game.S.player.skillHold')
   await down();await ui.evaluate('tick(.5)');assert await ui.locator('#btnAct').text_content()and await ui.evaluate('!!__game.S.player.skillHold'),(mobile,await ui.evaluate('({t:__game.S.t,over:__game.S.over,hold:__game.S.player.skillHold,down:document.querySelector("#btnSkill").className,choice:__game.assassinOpportunity(),keys:__game.S.keys})')); await ui.evaluate('tick(2)');await up();assert await ui.evaluate('__game.S.stats.dualAssassinations===1&&__game.S.tutI===2'),(mobile,await ui.evaluate('({stats:__game.S.stats,t:__game.S.t,step:__game.S.tutI,over:__game.S.over})'))
   if mobile:await ui.locator('#btnPause').click();await ui.locator('#btnSkillsPause').click()
   else:await ui.keyboard.press('k')
   assert await ui.locator('#skillScreen').is_visible();await ui.locator('[data-skill="chain"]').click()
   assert await ui.evaluate('localStorage.getItem("yahaeng.assassinSkill")===null'),'Practice selection was persisted'
   await ui.locator('#btnSkillsBack').click()
   if mobile:await ui.locator('#btnResume').click()
   await ui.evaluate('tick(.02);__game.S.player.x=906;__game.S.player.y=456;tick(.02)');await down();await ui.evaluate('tick(3.6)');await up();assert await ui.evaluate('__game.S.stats.chainAssassinations===1&&__game.S.tutI===5&&!__game.S.over')
   # App switch clears a fresh pending press.
   await ui.evaluate(FRESH);await down();await ui.evaluate('tick(.5);window.dispatchEvent(new Event("blur"));window.dispatchEvent(new Event("focus"))');await up();await ui.evaluate('tick(2)');assert await ui.evaluate('!__game.S.stats.kills')
   await c.close()
  checks+=['PC B/K and actual touch: short press, touch cancel, both abilities, menu and focus loss']
  assert not errors,errors;(O/'mechanics.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS','; '.join(checks));await b.close()
asyncio.run(main())
