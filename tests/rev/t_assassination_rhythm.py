"""Native late attack presses, early locomotion release and distance-based footfalls.
Controlled scenes isolate input intent; no claim of a live campaign clear.
"""
import asyncio,ast
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skill-rhythm-v188';O.mkdir(exist_ok=True)
module=ast.parse((R/'tests/rev/t_recovery_buffer.py').read_text());SETUP=next(ast.literal_eval(n.value)for n in module.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='SETUP'for t in n.targets))
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.wait_for_function('__game.prBench().n>0',polling=100);cdp=await q.context.new_cdp_session(q)
   async def tap():
    await q.evaluate('__game.updateHUD(true)')
    if mobile:
     r=await q.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':2,'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.press('z')
   async def scene(at=1):
    await q.evaluate(SETUP);await q.evaluate('()=>{const S=__game.S,P=S.player,a=S.guards[0];S.guards.push({...a,id:100,x:P.x+32,y:P.y+26,route:[],state:"PATROL",seen:false,meter:0});}');await tap();await q.evaluate('t=>tick(t)',at)
   await scene();await tap();assert await q.evaluate('!!__game.S.player.followupAttack');await q.evaluate('tick(.85)');assert await q.evaluate('__game.S.stats.ko===2&&__game.S.stats.kills===0&&__game.S.corpses.every(c=>c.ko)'),'released followup was lost or lethal';await q.evaluate('tick(1)');assert await q.evaluate('__game.S.stats.ko===2'),'one press repeats'
   for case,change in [('moving','__game.S.keys.ArrowLeft=true'),('damage','__game.S.player.hurtT=1'),('target gone','__game.S.guards[1].x+=160'),('other floor','__game.S.guards[1].fl=1'),('noticed','__game.S.guards[1].seen=true'),('turns around','__game.S.guards[1].a=Math.PI')]:
    await scene();await tap();await q.evaluate(change);await q.evaluate('tick(.5)');assert await q.evaluate('__game.S.stats.ko===1&&!__game.S.player.followupAttack'),case
   await scene();await tap();await q.click('#btnPause');await q.click('#btnResume');await q.evaluate('tick(.5)');assert await q.evaluate('__game.S.stats.ko===1&&!__game.S.player.followupAttack')
   if mobile:
    await scene();await q.evaluate('__game.updateHUD(true)');box=await q.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':2,'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]});assert await q.evaluate('!!__game.S.player.followupAttack');await cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});await q.evaluate('tick(.5)');assert await q.evaluate('__game.S.stats.ko===1&&!__game.S.player.followupAttack')
   await scene(.6);await tap();assert not await q.evaluate('!!__game.S.player.followupAttack'),'early presses must not persist'
   # A released Z may not borrow another currently held attack key.
   if not mobile:
    await scene();await tap();await q.keyboard.down('Space');await q.evaluate('tick(2)');await q.keyboard.up('Space');assert await q.evaluate('__game.S.stats.ko===2&&!__game.S.stats.kills')
   await q.evaluate(SETUP);await q.keyboard.down('z');await q.evaluate('tick(.8)');await q.keyboard.down('ArrowLeft');await q.evaluate('tick(.19)');assert await q.evaluate('__game.S.player.x===1584&&!__game.S.stats.kills');await q.evaluate('tick(.20)');await q.keyboard.up('z');await q.keyboard.up('ArrowLeft');assert await q.evaluate('__game.S.stats.kills===1&&__game.S.player.x<1584&&!__game.S.player.killAnim&&__game.S.corpses[0].hideT<=__game.S.t'),'grounded finish did not release movement'
   await q.evaluate(SETUP);await q.evaluate('__game.S.player.stepT=.4;window.gaitBefore=__game.S.player.gaitTime||0');await q.keyboard.down('ArrowLeft');await q.evaluate('tick(.2)');await q.keyboard.up('ArrowLeft');assert await q.evaluate('Math.abs((.4-__game.S.player.stepT)-(__game.S.player.gaitTime-gaitBefore))<.00001'),'footfalls do not follow actual gait'
   await scene();await q.evaluate('__game.S.guards[1].x=__game.S.player.x+92;__game.S.guards[1].y=__game.S.player.y');await tap();assert not await q.evaluate('!!__game.S.player.followupAttack'),'buffer grants an unlearned reach'
   await q.evaluate("__game.storeSkillTree({schema:1,rewardVersion:152,learned:['silentHands','reach']})");assert await q.evaluate('__game.skillSpent(__game.loadSkillTree())===3')
   await scene();await q.evaluate('__game.S.guards[1].x=__game.S.player.x+92;__game.S.guards[1].y=__game.S.player.y');await tap();assert await q.evaluate('!!__game.S.player.followupAttack');await q.evaluate('tick(.06)');assert await q.evaluate('__game.S.player.x>1584&&__game.S.player.x<1632'),'learned approach does not physically travel';await q.evaluate('tick(1.4)');assert await q.evaluate('__game.S.stats.ko===2&&!__game.S.stats.kills')
   assert not errors,errors;await q.screenshot(path=str(O/f'rhythm-{"mobile"if mobile else"pc"}.png'));print('PASS rhythm',mobile,'single nonlethal continuation, cancellation, deliberate lethal hold, grounded movement release, gait-synced steps',flush=True);await q.close()
  await b.close()
asyncio.run(main())
