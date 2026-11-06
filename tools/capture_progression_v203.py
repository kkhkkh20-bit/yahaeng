"""Controlled same-game map review; native journey evidence is separate."""
import asyncio,argparse,json
from pathlib import Path
from playwright.async_api import async_playwright
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for label,url in [('before',a.before),('after',a.after)]:
   q=await b.new_page(viewport={'width':1440,'height':960});q.set_default_timeout(60000);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0')
   await q.goto(url);await q.wait_for_function('!!__game',polling=100);await q.click('#btnQuick');await q.evaluate('document.fonts.ready');await q.wait_for_timeout(500)
   await q.evaluate('()=>{const G=__game;G.S.fade=0;G.update(.01);G.cam.x=G.S.player.x;G.cam.y=G.S.player.y;G.updateHUD(true);G.benchDraw(2)}');await q.wait_for_timeout(500);await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(out/(label+'-depot.png')))
   await q.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const g=G.S.guards.find(g=>g.radio&&g.hasKey)||G.S.guards.find(g=>g.radio);Object.assign(G.S.player,{x:g.x-40,y:g.y+90,fl:g.fl||0,z:g.z||0});G.cam.x=g.x;G.cam.y=g.y;G.S.fade=0;G.benchDraw(2)}");await q.wait_for_timeout(500);await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(out/(label+'-gear.png')));assert not errors,errors;await q.close()
  await b.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--before',default='http://127.0.0.1:8012/public/');p.add_argument('--after',default='http://127.0.0.1:8013/public/');p.add_argument('--out',default='build/progression-v203/visual');asyncio.run(main(p.parse_args()))
