"""Reproduce the title composition using existing game sprites, not reference art."""
import asyncio,base64,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/title-v251';O.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium')
  for name,w,h,cx,cy,px,py,z in [('city-wide',1600,960,18.5,19.5,24.5,19.5,1.15),('city-portrait',720,1280,21,22.5,24.5,19.5,1.15)]:
   q=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1);await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(os.environ.get('YH_TITLE_URL','http://127.0.0.1:8052/build/preview_city.html?study=agent-city'));await q.wait_for_function('__game?.officeReady()&&__game.purchasedReady()',polling=100);await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.agentStudy));while(__game.DLG.modal)__game.advanceDialog()");await q.wait_for_timeout(1000)
   await q.evaluate('''({cx,cy,px,py,z})=>{const G=__game,S=G.S;window.__skip.ui=true;window.__skip.cone=true;S.guards=[];S.cams=[];S.fade=0;S.marked=null;S.facOn=false;Object.assign(S.player,{x:px*48,y:py*48,fl:0,z:0,a:-Math.PI/2,hidden:false,moving:false});G.setZoom(z);G.moveCamera(1);G.cam.x=cx*48;G.cam.y=cy*48;G.benchDraw(40);}''',{'cx':cx,'cy':cy,'px':px,'py':py,'z':z});raw=await q.locator('#game').evaluate("c=>c.toDataURL('image/webp',.96).split(',')[1]");(O/(name+'.webp')).write_bytes(base64.b64decode(raw));await q.close()
  await b.close()
asyncio.run(main())
