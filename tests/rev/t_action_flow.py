"""Native timing inputs in isolated scenes; campaign playbacks are separate."""
import asyncio,ast,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/action-flow-v192';O.mkdir(parents=True,exist_ok=True)
module=ast.parse((R/'tests/rev/t_recovery_buffer.py').read_text())
SETUP=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SETUP' for t in n.targets))
async def main():
 rows=[]
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');cdp=await q.context.new_cdp_session(q)
   points={}
   async def touch(kind,id,x=0,y=0):
    if kind=='touchCancel':points.clear();payload=[]
    elif kind=='touchEnd':
     ended=points.pop(id,None)
     if not ended:return
     payload=[ended]
    else:points[id]={'id':id,'x':x,'y':y};payload=list(points.values())
    await cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':payload})
   async def direction(on=True,back=False):
    if mobile:
     if not on:await touch('touchEnd',1);return
     await touch('touchStart',1,55,520);await touch('touchMove',1,31 if back else 79,520)
    else:
     await q.keyboard.up('ArrowLeft');await q.keyboard.up('ArrowRight')
     if on:await q.keyboard.down('ArrowLeft' if back else 'ArrowRight')
   async def tap(key,button,cancel=False):
    if mobile:
     await q.evaluate('__game.updateHUD(true)');r=await q.locator(button).bounding_box();assert r
     await touch('touchStart',2,r['x']+r['width']/2,r['y']+r['height']/2);await touch('touchCancel' if cancel else 'touchEnd',2)
    else:await q.keyboard.press(key)
   async def scene(distance=60):
    if points:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':list(points.values())})
    points.clear();await q.evaluate(SETUP);await q.evaluate('d=>{const G=__game;G.clearPlayerInput();G.S.player.outfit="crew";G.S.player.disguise="sam";G.S.guards[0].x=G.S.player.x+d}',distance)
   await scene();await direction();await tap('z','#btnAct');assert await q.evaluate('!!__game.S.player.approachAttack&&!__game.S.player.killAnim')
   await q.evaluate('tick(.05)');assert await q.evaluate('__game.S.player.x>1584&&!__game.S.player.killAnim&&!__game.S.stats.ko'),await q.evaluate('({p:__game.S.player,joy:__game.input.joy,keys:__game.S.keys})')
   await q.evaluate('tick(.24)');assert await q.evaluate('!!__game.S.player.killAnim&&Math.hypot(__game.S.player.x-__game.S.guards[0].x,__game.S.player.y-__game.S.guards[0].y)<=__game.MELEE_CONTACT')
   await direction(False);await q.evaluate('tick(1.3)');assert await q.evaluate('__game.S.stats.ko===1&&!__game.S.stats.kills&&!__game.S.player.approachAttack')
   passed=['released approach press travels into actual contact, one nonlethal victim']
   for label,change in [('turn','__game.S.guards[0].a=Math.PI'),('floor','__game.S.guards[0].fl=1'),('wall','__game.G0[21][34]="#"'),('damage','__game.S.player.hurtT=1'),('noticed','__game.S.guards[0].seen=true'),('new victim','__game.S.guards=[{...__game.S.guards[0],id:999}]')]:
    await scene();await direction();await tap('z','#btnAct');await q.evaluate(change);await q.evaluate('tick(.06)');assert await q.evaluate('!__game.S.player.approachAttack&&!__game.S.player.killAnim'),label
    await direction(False);await q.evaluate('tick(1)');assert await q.evaluate('!__game.S.stats.ko'),label
   for back in [False,True]:
    await scene();await direction();await tap('z','#btnAct');await direction(False)
    if back:await direction(True,True)
    await q.evaluate('tick(.4)');assert await q.evaluate('!__game.S.player.approachAttack&&!__game.S.stats.ko');await direction(False)
   await scene();await direction();await tap('z','#btnAct');await q.click('#btnPause');await q.click('#btnResume');await q.evaluate('tick(.5)');assert await q.evaluate('!__game.S.player.approachAttack&&!__game.S.stats.ko')
   if mobile:
    await scene();await direction();await tap('z','#btnAct',True);await q.evaluate('tick(.5)');assert await q.evaluate('!__game.S.player.approachAttack&&!__game.S.stats.ko');await direction(False)
   passed.append('turn, floor, damage, notice, replacement, stop, retreat, pause and touch cancel discard the original intention')
   await scene(90);await direction();await tap('z','#btnAct');assert await q.evaluate('!__game.S.player.approachAttack');await direction(False)
   await scene();await direction();await tap('z','#btnAct');await q.evaluate('__game.S.t+=.5;tick(.01)');assert await q.evaluate('!__game.S.player.approachAttack&&!__game.S.stats.ko');await direction(False)
   if not mobile:
    await scene();await direction();await tap('z','#btnAct');await q.keyboard.down('Space');await q.evaluate('tick(.25)');await direction(False);await q.evaluate('tick(2)');await q.keyboard.up('Space');assert await q.evaluate('__game.S.stats.ko===1&&!__game.S.stats.kills')
    await scene();await direction();await q.keyboard.down('z');await q.evaluate('tick(.25)');await direction(False);await q.evaluate('tick(2)');await q.keyboard.up('z');assert await q.evaluate('__game.S.stats.kills===1&&!__game.S.stats.ko')
   passed.append('short expiry, limited anticipation range and released press cannot borrow another held attack')
   await scene(28);await tap('z','#btnAct');await q.evaluate('tick(.76)');await tap('x','#btnCarry');assert await q.evaluate('!!__game.S.player.recoveryQueue&&!__game.S.player.carrying')
   await q.evaluate('tick(.24)');assert await q.evaluate('!__game.S.player.carrying'),'body lifted before the grounded recovery beat'
   await q.evaluate('tick(.05)');assert await q.evaluate('__game.S.player.carrying===__game.S.corpses[0]&&!__game.S.player.killAnim&&__game.S.corpses[0].hideT<=__game.S.t')
   before=await q.evaluate('__game.S.player.x');await direction(True,True);await q.evaluate('tick(.20)');assert await q.evaluate('x=>Math.abs(__game.S.player.x-x)<.01',before)
   await q.evaluate('tick(.27)');assert await q.evaluate('x=>__game.S.player.x<x&&!__game.S.player.bodyAnim&&!!__game.S.player.carrying',before);await direction(False)
   passed.append('early recovery tap connects only after landing; movement begins after the load is secured')
   await scene(28);await direction();await tap('z','#btnAct');await q.evaluate('tick(.76)');await tap('x','#btnCarry');assert await q.evaluate('!!__game.S.player.recoveryQueue');await q.evaluate('tick(.76)');assert await q.evaluate('__game.S.player.x>1584&&!!__game.S.player.carrying&&!__game.S.player.recoveryQueue&&!__game.S.stats.kills');await direction(False)
   await scene(28);await direction();await tap('z','#btnAct');await q.evaluate('tick(.76)');await tap('x','#btnCarry');await direction(True,True);await q.evaluate('tick(.6)');assert await q.evaluate('!__game.S.player.carrying&&!__game.S.player.recoveryQueue');await direction(False)
   passed.append('held approach direction flows into carrying; a new retreat direction cancels it')
   await scene(28);await tap('z','#btnAct');await q.evaluate('tick(.76);__game.S.player.outfit=null;__game.S.player.disguise=null');await tap('x','#btnCarry');assert await q.evaluate('__game.S.player.recoveryQueue?.kind==="dress"');await q.evaluate('tick(.55)');assert await q.evaluate('__game.S.player.interact?.a.k==="dress"&&!__game.S.player.carrying')
   passed.append('useful clothing keeps its separate full action')
   geometry=await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p0'));while(G.DLG.modal)G.advanceDialog();const path=G.astar(7,8,3,8);return{wall:!G.los(168,408,280,408),pocket:G.tileAt(168,408)==='B',entry:!G.solidAt(6,8),path:path.length};}''')
   assert geometry['wall'] and geometry['pocket'] and geometry['entry'] and geometry['path'],geometry
   assert not errors,errors;rows.append({'mobile':mobile,'checks':passed,'escapeGeometry':geometry});print('PASS action flow',mobile,json.dumps(rows[-1]),flush=True);await q.close()
  await b.close()
 (O/'checks.json').write_text(json.dumps(rows,indent=2))
asyncio.run(main())
