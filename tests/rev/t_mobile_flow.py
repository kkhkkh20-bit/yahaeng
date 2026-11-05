"""One attack control, explicit body clean-up, and cancellation at physical boundaries."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
O=R/'build/mobile-v154';O.mkdir(exist_ok=True)
SKILL='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tS'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;Object.assign(P,{x:440,y:432,mode:'sneak'});G.input.sneakToggle=true;G.update(.02);window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)G.update(.01)};}'''
BODY='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,base=S.guards.find(g=>!g.civ&&!g.dog&&!g.child);for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];S.vehicles=null;S.camRoom=null;S.facOn=false;S.keys={};S.t=10;S.exitOpen=false;G.input.pressIds={};Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0,captive:null,carrying:null,hide:null,cover:null,snap:null,strikeT:0,killAnim:null});G.setLayer(0);const g={...base,id:111,x:P.x+30,y:P.y,fl:0,z:0,a:0,want:0,target:false,civ:false,dog:false,child:false,elite:false,hasKey:null,state:'PATROL',path:null,act:null,route:[{x:P.x+30,y:P.y,pause:999}]};S.guards=[g];const h={type:'bush',x:P.x,y:P.y+48,tx:33,ty:22,fl:0,z:0,bodies:0,cap:3};S.bushes=[h];G.G0[22][33]='B';window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01){S.t+=.01;G.updatePlayer(.01);G.updateKoHold()}};window.down=id=>{S.keys[id]=true;G.combatPress(id)};window.up=(id,cancel=false)=>{S.keys[id]=false;G.combatRelease(id,cancel)};}'''
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  checks=[]
  for reason in ['tap','held','cancel','blur','floor','turn','move']:
   await q.evaluate(SKILL)
   await q.keyboard.down('z');await q.evaluate('tick(.25)')
   assert await q.evaluate('!!__game.S.player.skillHold'),reason
   if reason=='held':await q.evaluate('tick(2.4)')
   elif reason=='cancel':await q.evaluate('__game.combatRelease("KeyZ",true)')
   elif reason=='blur':await q.evaluate('window.dispatchEvent(new Event("blur"));window.dispatchEvent(new Event("focus"))')
   elif reason in ['floor','turn','move']:
    await q.evaluate('''reason=>{const G=__game;if(reason==='floor')G.S.player.fl=1;if(reason==='turn')G.S.guards[0].a=Math.PI;if(reason==='move')G.S.player.x-=20;tick(.02)}''',reason)
   await q.keyboard.up('z');await q.evaluate('tick(1.5)')
   assert await q.evaluate('''reason=>{const S=__game.S;return !S.player.skillHold&&(reason==='tap'?S.corpses.length===1&&S.corpses[0].ko&&S.stats.kills===0:reason==='held'?S.stats.kills===2&&S.stats.dualAssassinations===1:S.corpses.length===0)}''',reason),(reason,await q.evaluate('({stats:__game.S.stats,corpses:__game.S.corpses.length})'))
   checks.append('attack '+reason)
  # A paid chain still moves to its second target; locked skills do not intercept normal tap.
  await q.evaluate(SKILL);await q.evaluate('Object.assign(__game.S,{selectedSkill:"chain",practiceSkill:"chain",tutI:4});Object.assign(__game.S.player,{x:906,y:456})');await q.keyboard.down('Space');await q.evaluate('tick(1.8)');assert await q.evaluate('__game.S.stats.kills===1&&__game.S.player.x>906&&__game.S.player.x<992');await q.evaluate('tick(2)');await q.keyboard.up('Space');assert await q.evaluate('__game.S.stats.chainAssassinations===1');checks.append('attack held physical chain')
  for reason in ['store','full','gone','floor','damage','pause','wall','save']:
   await q.evaluate(BODY)
   # No live enemy can enter this flow.
   assert await q.evaluate('!__game.envChoices().some(a=>a.k==="quickStash")')
   await q.evaluate('down("KeyZ");__game.actAttack();tick(.08);up("KeyZ");tick(1.4)')
   state=await q.evaluate('''()=>{const G=__game,c=G.S.corpses[0],L=G.envChoices();return {ko:c?.ko,default:G.envAction().k,kinds:L.map(a=>a.k),hide:!!G.quickStashChoice(c)}}''')
   assert state['ko']and state['default']=='dress'and'carry'in state['kinds']and'quickStash'in state['kinds'],state
   await q.evaluate('__game.selectEnvTarget(__game.envToken(__game.envChoices().find(a=>a.k==="quickStash")));__game.S.player.hidden=true;down("KeyX");__game.actEnv();up("KeyX");tick(.2)')
   assert await q.evaluate('!__game.S.player.hidden&&__game.S.corpses[0].carried&&!__game.S.corpses[0].hidden&&!__game.S.corpses[0].stashed&&!!__game.S.player.quickStash'),'Body vanished before lifting finished'
   if reason!='store':
    await q.evaluate('''reason=>{const G=__game,S=G.S,P=S.player,h=S.bushes[0];if(reason==='full')h.cap=0;if(reason==='gone')S.bushes=[];if(reason==='floor')h.fl=1;if(reason==='damage')P.hurtT=.5;if(reason==='pause')G.clearPlayerInput();if(reason==='wall')G.G0[22][33]='#';if(reason==='save'){G.saveCheckpoint();G.loadCheckpoint()}}''',reason)
   await q.evaluate('''()=>{if(__game.S.player.quickStash||!__game.S.player.carrying)return;const S=__game.S;window.tick=s=>{for(let t=0;t<s;t+=.01){S.t+=.01;__game.updatePlayer(.01)}}}''')
   await q.evaluate('tick(3)')
   state=await q.evaluate('''()=>{const S=__game.S,c=S.corpses[0];return{carried:c.carried,hidden:c.hidden,stashed:c.stashed,trav:!!S.player.trav,queued:!!S.player.quickStash,stats:S.stats.stashed}}''')
   if reason=='store':assert state['hidden']and not state['carried']and state['stats']==1,state
   if reason=='store':assert await q.evaluate('!__game.quickStashChoice(__game.S.corpses[0])'),'Already concealed body offered again'
   else:assert not state['hidden']and not state['stashed']and not state['queued'],(reason,state)
   checks.append('body '+reason)
  # Actual container geometry also keeps the body outside until the storage contact.
  for reason in ['store','filledDuringOpen','damageDuringOpen']:
   await q.evaluate(BODY)
   await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,g=S.guards[0];Object.assign(P,{x:1656,y:1080});Object.assign(g,{x:1626,y:1080,a:Math.PI,want:Math.PI});S.bushes=[];P.hidden=false;G.G0[22][33]='.';G.G0[22][34]='.';G.G0[21][34]='#';S.hides=[{type:'box',tx:34,ty:21,x:1656,y:1032,fl:0,z:0,bodies:0,cap:1}];down('KeyZ');G.actAttack();tick(.08);up('KeyZ');tick(1.4);const stash=G.envChoices().find(a=>a.k==='quickStash');if(!stash)throw Error('Box not offered: '+JSON.stringify(G.envChoices()));G.selectEnvTarget(G.envToken(stash));down('KeyX');G.actEnv();up('KeyX');tick(.9);if(!P.trav?.hideFlow?.quick||S.corpses[0].stashed)throw Error('No physical box opening')}''')
   await q.evaluate('''reason=>{const S=__game.S;if(reason==='filledDuringOpen')S.hides[0].bodies=1;if(reason==='damageDuringOpen')S.player.hurtT=.5;tick(3);const c=S.corpses[0];if(reason==='store'?!c.stashed||c.carried||S.hides[0].bodies!==1:c.stashed||!c.carried)throw Error('Box '+reason+' '+JSON.stringify(c))}''',reason)
   checks.append('container '+reason)
  # Touch uses the same attack source; pointer cancellation must never execute the tap fallback.
  for mobile,w,h in [(True,390,844),(True,844,390),(True,320,568),(False,1440,900)]:
   c=await b.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile);ui=await c.new_page();ui.on('pageerror',lambda e:errors.append(str(e)));await ui.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await ui.goto((R/'build/preview_city.html').as_uri());await ui.wait_for_function('!!__game');await ui.evaluate(SKILL)
   await ui.evaluate('__game.moveCamera(1);__game.updateHUD(true);__game.benchDraw(2)')
   if w==320:
    geometry=await ui.evaluate('''()=>{const G=__game,P=G.S.player,x=(P.x-G.cam.x)*G.SCALE+innerWidth/2,y=(P.y-G.cam.y)*G.SCALE+innerHeight/2;const blocks=[...document.querySelectorAll('.pad > button,.sysbtns button,#btnSkill')].filter(e=>!e.hidden&&e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return{id:e.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom}});return{x,y,blocked:blocks.filter(r=>x+30>r.left&&x-30<r.right&&y+48>r.top&&y-45<r.bottom)}}''')
    assert not geometry['blocked'],geometry
    checks.append('320px portrait reserves player and contact area above controls')
   if mobile:
    cdp=await c.new_cdp_session(ui)
    async def press():
     r=await ui.locator('#btnAct').bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=w and r['y']+r['height']<=h,r;await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
    async def release(cancel=False):await cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel'if cancel else'touchEnd','touchPoints':[]})
   else:
    async def press():await ui.keyboard.down('z')
    async def release(cancel=False):await ui.keyboard.up('z')
   await press();await ui.evaluate('tick(.35);__game.updateHUD(true)');assert await ui.evaluate('+document.querySelector("#btnAct").style.getPropertyValue("--hold")>0');await release(mobile);await ui.evaluate('tick(1.5)');assert await ui.evaluate('__game.S.corpses.length===0'if mobile else'__game.S.corpses.length===1&&__game.S.corpses[0].ko'),(mobile,w,h,await ui.evaluate('({corpses:__game.S.corpses.length,hold:!!__game.S.player.skillHold,stats:__game.S.stats})'))
   await ui.evaluate(SKILL);await press();await ui.evaluate('tick(2.6)');await release();assert await ui.evaluate('__game.S.stats.dualAssassinations===1')
   await ui.evaluate(BODY);await press();await ui.evaluate('tick(.08)');await release();await ui.evaluate('tick(1.5);__game.updateHUD(true)')
   await ui.evaluate("__game.selectEnvTarget(__game.envToken(__game.envChoices().find(a=>a.k==='quickStash')));__game.updateHUD(true)")
   if mobile:await ui.locator('#btnCarry').tap()
   else:await ui.keyboard.press('x')
   await ui.evaluate('tick(3)');assert await ui.evaluate('__game.S.corpses[0].hidden&&!__game.S.player.carrying')
   checks.append(f'native {w}x{h} tap/cancel, held double and one-press body disposal');await c.close()
  assert not errors,errors;(O/'mechanics.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2));print('PASS',len(checks),'mobile action flow checks');await b.close()
asyncio.run(main())
