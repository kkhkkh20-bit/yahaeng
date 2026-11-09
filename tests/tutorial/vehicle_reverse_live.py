"""Driving fixture; native keyboard/CDP touch with ordinary RAF after placement."""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from action_flow_live import Controls
async def main(url,out):
 O=Path(out);O.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},is_mobile=mobile,has_touch=mobile);await q.goto(url+'?study=agent-city&nostats');await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.click('#btnBrGo');await q.evaluate('()=>{while(__game.DLG.modal)__game.advanceDialog()}');await q.wait_for_timeout(700)
   await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,v=G.traffic.makeVehicle({x:700,y:1152,a:0});S.guards=[];S.vehicles=[v];Object.assign(P,{x:v.x,y:v.y,z:0,fl:0,car:v});G.moveCamera(2)}''');c=Controls(q,await q.context.new_cdp_session(q),mobile)
   await c.steer('x',-1);await q.wait_for_timeout(850);await c.steer();reverse=await q.evaluate('({x:__game.S.player.car.x,v:__game.S.player.car.v,a:__game.S.player.car.a})');assert reverse['x']<675 and reverse['v']<0 and abs(reverse['a'])<.02,reverse
   await q.screenshot(path=str(O/('mobile-reverse.png'if mobile else'pc-reverse.png')))
   await c.steer('x',1);await q.wait_for_timeout(2600 if mobile else 1300);await c.steer();forward=await q.evaluate('({x:__game.S.player.car.x,v:__game.S.player.car.v,a:__game.S.player.car.a})');assert forward['x']>reverse['x'] and forward['v']>0,forward
   rows.append({'mobile':mobile,'reverse':reverse,'forward':forward});print('PASS native reverse',json.dumps(rows[-1]),flush=True);await q.close()
  await b.close()
 (O/'reverse.json').write_text(json.dumps(rows,indent=2))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',required=True);a.add_argument('--out',required=True);v=a.parse_args();asyncio.run(main(v.url,v.out))
