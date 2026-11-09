"""Known-map native play: real input and active AI; only read-only route planning."""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from action_flow_live import Controls
from compound_live import CompoundControls
async def main(mobile,url,out):
 OUT=Path(out);OUT.mkdir(parents=True,exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},is_mobile=mobile,has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.goto(url+('&'if'?'in url else'?')+'study=agent-city&nostats');await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.click('#btnBrGo')
  for _ in range(5):
   if not await q.evaluate('__game.DLG.modal'):break
   await q.keyboard.press('Space');await q.wait_for_timeout(120)
  c=Controls(q,await q.context.new_cdp_session(q),mobile);cc=CompoundControls(q,c,OUT,'mobile'if mobile else'pc')
  try:
   await q.wait_for_timeout(500);await cc.shot('start');await c.press('Control','#btnCrouch')
   g=await q.evaluate('(()=>{const g=__game.S.guards.find(g=>g.tag==="alleyGuard");return{x:g.x,y:g.y}})()');await cc.walk(g['x']-40,g['y']);await c.press('z','#btnAct');await q.wait_for_function('__game.S.guards.find(g=>g.tag==="alleyGuard").state==="DEAD"&&!__game.actionBusy()',timeout=8000)
   assert await q.evaluate('__game.S.corpses.some(c=>c.ko&&c.g.tag==="alleyGuard")')
   await cc.env('dress','alleyGuard');await cc.shot('disguise');await cc.hide('alleyGuard');await cc.shot('hidden-body')
   await c.press('Control','#btnCrouch')
   # Use the actual south stair entrance and ordinary internal staircase.
   await cc.walk(14.5*48,18.5*48);await cc.walk(14.5*48,16.5*48);await cc.stairs(1,0);await cc.shot('second-floor')
   target=await q.evaluate('(()=>{const g=__game.S.guards.find(g=>g.target);return{x:g.x,y:g.y,a:g.a}})()')
   import math
   await cc.walk(target['x']-math.cos(target['a'])*40,target['y']-math.sin(target['a'])*40);await c.press('z','#btnAct',lethal=True);await q.wait_for_function('__game.S.guards.find(g=>g.target).state==="DEAD"&&!__game.actionBusy()',timeout=10000);await cc.shot('target-down')
   # The document is attached to a real desk. Approach its usable edge.
   it=await q.evaluate('(()=>{const i=__game.S.items[0];return{x:i.x,y:i.y}})()');await cc.walk(it['x'],it['y']);await cc.env('loot');await cc.shot('record-recovered')
   await cc.finish();assert not errors,errors
   (OUT/('mobile.json'if mobile else'pc.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2))
   print('PASS native mission',mobile,flush=True)
  except Exception:
   await q.screenshot(path=str(OUT/('mobile-fail.png'if mobile else'pc-fail.png')));print('FAIL STATE',await q.evaluate('(()=>{const G=__game;return{p:G.S.player,action:G.envChoices().map(a=>[a.k,a.label]),over:G.S.over,errors:0}})()'),flush=True);raise
  finally:await b.close()
parser=argparse.ArgumentParser();parser.add_argument('--mobile',action='store_true');parser.add_argument('--url',required=True);parser.add_argument('--out',default='build/agent-city-live');args=parser.parse_args();asyncio.run(main(args.mobile,args.url,args.out))
