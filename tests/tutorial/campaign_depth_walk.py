"""Known-map native PC/touch replays, live AI and ordinary RAF.
Only coordinate/route/state inspection; no health, scene, objective or AI overrides.
"""
import argparse,asyncio,json,math,os
from pathlib import Path
from playwright.async_api import async_playwright
from native_driver import NativeDriver

async def nudge(r,dx,dy,seconds=.06):
 q=r.q;d=math.hypot(dx,dy);ks=[]
 if d<1:return
 if r.mobile:
  await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]})
  await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55+dx/d*35,'y':520+dy/d*35}]})
 else:
  if abs(dx)>3:ks.append('ArrowRight'if dx>0 else'ArrowLeft')
  if abs(dy)>3:ks.append('ArrowDown'if dy>0 else'ArrowUp')
  for k in ks:await q.keyboard.down(k)
 await q.wait_for_timeout(seconds*1000)
 if r.mobile:await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 else:
  for k in ks:await q.keyboard.up(k)

async def rear_ko(r,id):
 q=r.q
 for _ in range(800):
  v=await q.evaluate('''id=>{const G=__game,P=G.S.player,g=G.S.guards[id],a=G.attackAction(),p=[0,.6,-.6].map(d=>({x:g.x-Math.cos(g.a+d)*32,y:g.y-Math.sin(g.a+d)*32})).find(p=>!G.solidAt(Math.floor(p.x/48),Math.floor(p.y/48)));return{ready:['kill','counter'].includes(a.k)&&(a.g===g||a.list?.includes(g)),p:{x:P.x,y:P.y},back:p,over:G.S.over,g:{x:g.x,y:g.y,state:g.state}}}''',id)
  assert not v['over'],v
  if v['ready']:
   await r.press('z','#btnAct');await q.wait_for_timeout(1400);return
  if v['back']:await nudge(r,v['back']['x']-v['p']['x'],v['back']['y']-v['p']['y'])
  else:await q.wait_for_timeout(60)
 raise AssertionError(('rear approach timeout',id,v))

async def smoke_nw(r):
 q=r.q;await r.tool('smoke')
 if r.mobile:
  b=await q.locator('#btnTool').bounding_box();t={'id':2,'x':b['x']+b['width']/2,'y':b['y']+b['height']/2};j={'id':1,'x':55,'y':520}
  await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[t]});await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[t,j]})
  await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[t,{'id':1,'x':21,'y':486}]});await q.wait_for_timeout(350)
  await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[t]});await q.wait_for_timeout(1100);await r.cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 else:
  await q.keyboard.down('v');await q.keyboard.down('ArrowLeft');await q.keyboard.down('ArrowUp');await q.wait_for_timeout(350);await q.keyboard.up('ArrowLeft');await q.keyboard.up('ArrowUp');await q.wait_for_timeout(1100);await q.keyboard.up('v')
 await q.wait_for_timeout(700)

async def prison(r):
 q=r.q
 await r.move(456,264);await r.move(456,323);await r.env('pick');await r.move(456,408);await r.crouch(True);await r.move(552,408)
 await rear_ko(r,0);await r.env('dress');await q.wait_for_timeout(200);assert (await r.state())['p']['outfit']=='crew'
 await r.env('carry');await r.route(696,408);await r.env('stash')
 await r.snap('disguise');await r.learn(['kit','dart','smoke']);await r.crouch(False)
 await r.route(1608,360);assert await q.evaluate('__game.S.gearRecovered')
 await r.route(1368,264);await r.move(1368,275);await r.move(1348,275);await rear_ko(r,4);await r.env('carry');await r.route(1224,264);await r.env('stash');await r.move(1320,240);await r.env('camroom');assert await q.evaluate('__game.S.camsOff')
 await r.route(888,264);await r.floor(0,1);await r.crouch(True);await r.move(840,504)
 await smoke_nw(r);await r.move(696,504)
 for id in [2,3]:await r.dart(id)
 assert await q.evaluate('[2,3].every(id=>__game.S.guards[id].state==="DEAD")'),await r.snap('dart-failure')
 await r.route(648,312);await r.env('loot');assert (await r.state())['items']==[True,False];await r.snap('radio')
 await r.floor(0,0);await r.crouch(False);await r.route(1128,696);await r.route(1704,1224)
 it=await q.evaluate('()=>{const i=__game.S.items[1];return{x:i.x,y:i.y}}');await r.route(it['x'],it['y']);await r.crouch(True)
 await q.wait_for_function('(()=>{const g=__game.S.guards.find(g=>g.tag==="paperKeeper");return g.wait>5&&g.y>1000})()',timeout=120000)
 await r.env('loot');assert all((await r.state())['items']);await r.snap('handover')
 await r.crouch(False);await r.route(1704,1224);await r.route(840,1272);await r.finish()

async def cleanup(r):
 q=r.q
 await r.learn(['kit','dart','kunai','silentHands'])
 await r.route(120,552);await r.route(120,504);await r.env('pickup');assert (await r.state())['p']['outfit']=='crew'
 await r.route(120,744);await r.route(1656,792);await r.route(1656,1224);await r.route(1608,1272)
 await q.wait_for_function('__game.S.guards[0].y>1190&&__game.S.guards[0].x>1550&&__game.S.guards[0].wait>3&&__game.S.guards[0].state==="PATROL"',timeout=300000)
 await r.dart(1);await r.dart(0,True,'blade')
 assert await q.evaluate('__game.targetEliminated(__game.S.guards[0])&&__game.S.guards[1].state==="DEAD"'),await r.snap('collector-failure')
 drop=await q.evaluate('()=>__game.S.keyDrop&&({x:__game.S.keyDrop.x,y:__game.S.keyDrop.y})');
 if drop:await r.route(drop['x'],drop['y'])
 assert (await r.state())['keys'].get('red'),'the red card must be picked up physically'
 await r.snap('collector')
 # A third dart is an authored supply pickup, not an inventory grant.
 await r.route(1848,1080);assert await q.evaluate('__game.S.player.got.supplies')
 # Warehouse guard faces the street: enter the side room, then approach his back.
 await r.route(1656,1224);await r.route(1656,744);await r.route(840,552);await r.route(840,456);await r.env('camCable');await r.route(552,408);await r.env('read')
 for _ in range(15):
  if not await q.evaluate('__game.DLG.modal'):break
  await q.click('#dlg');await q.wait_for_timeout(30)
 await r.route(744,408);await r.move(744,360);await r.move(684,360);await rear_ko(r,4);await r.env('carry');await r.route(744,360);await r.env('stash')
 await r.route(648,216);await r.env('loot');await r.route(600,264);assert (await r.state())['keys'].get('blue');await r.snap('cash')
 # Boardroom back door separates the VIP from the public club floor.
 await r.route(744,552);await r.route(1656,552);await r.route(2136,552);await r.route(2136,216);await r.route(1992,216);await r.crouch(True);await rear_ko(r,19);await r.route(1848,312);await rear_ko(r,3);await r.dart(2,True,'blade')
 assert await q.evaluate('__game.targetEliminated(__game.S.guards[2])');await r.snap('vip');await r.crouch(False)
 # Read the warehouse note before using the physical 7316 keypad.
 await r.route(1512,600);await r.route(1512,216);await r.floor(2,1);await r.crouch(True)
 await r.route(1416,312)
 await q.wait_for_function('__game.S.guards[6].state==="DEAD"||__game.S.guards[6].x>1260',timeout=90000)
 for id in [6,20]:
  if await q.evaluate('id=>__game.S.guards[id].state!=="DEAD"',id):await r.dart(id)
 assert await q.evaluate('[6,20].every(id=>__game.S.guards[id].state==="DEAD")'),await r.snap('security-failure')
 await r.route(1224,312);assert (await r.state())['keys'].get('green')
 await r.env('camroom')
 await r.snap('green');await r.floor(2,0);await r.crouch(False)
 await r.route(1656,744);await r.route(1656,1224);await r.route(552,1224);await r.floor(4,1);await r.crouch(True)
 await q.wait_for_function('__game.S.guards[12].x<220&&__game.S.guards[12].wait>5',timeout=90000)
 await r.route(408,984);await r.env('loot');assert all((await r.state())['items']);await r.snap('contracts')
 await r.floor(4,0);await r.crouch(False);await r.route(840,1150);await r.finish()

async def main(a):
 rows=[];out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']}if a.url.startswith('https:')else None)
  for mobile in ([False,True]if a.device=='both'else[a.device=='mobile']):
   name=a.stage+('-mobile'if mobile else'-pc');q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear()');await q.goto(a.url+'?nostats&review=campaign-depth');await q.wait_for_function('!!window.__game',timeout=60000)
   await q.click('#btnLedger');i=await q.evaluate('id=>__game.STAGES.findIndex(s=>s.id===id)',a.stage);await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   for _ in range(20):
    if not await q.evaluate('__game.DLG.modal'):break
    await q.click('#dlg');await q.wait_for_timeout(30)
   r=NativeDriver(q,mobile,out,name);await r.setup()
   try:
    await r.snap('start');await prison(r) if a.stage=='m6'else await cleanup(r)
    assert not errors,errors;rows.append({'stage':a.stage,'mobile':mobile,'state':await r.state(),'errors':errors});print('PASS campaign native',name,flush=True)
   except Exception:
    await r.snap('failure');(out/(name+'-storage.json')).write_text(json.dumps(await q.evaluate('Object.fromEntries(Object.entries(localStorage))')));raise
   finally:await q.close()
  await b.close()
 (out/(a.stage+'-results.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:8032/public/');a.add_argument('--stage',choices=['m4','m6'],required=True);a.add_argument('--device',choices=['pc','mobile','both'],default='both');a.add_argument('--out',default='/workspace/work/campaign-v187/native');asyncio.run(main(a.parse_args()))
