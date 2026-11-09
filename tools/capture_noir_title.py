"""Menu artwork captured from the current game, using only its real objects.
Camera/actor poses are composition fixtures, not gameplay evidence.
"""
import asyncio,base64,argparse
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1]
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch()
  scenes=[('wide',1600,960,720,1530,1.4),('portrait',720,1280,880,1900,1.2)] if a.stage=='m2' else [('wide',1600,960,1320,650,1.4),('portrait',720,1280,1320,730,1.2)]
  for name,w,h,cx,cy,zoom in scenes:
   q=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(a.url);await q.wait_for_function('!!__game')
   await q.evaluate("id=>{__game.start(__game.STAGES.findIndex(s=>s.id===id));while(__game.DLG.modal)__game.advanceDialog()}",a.stage)
   await q.wait_for_function('__game.officeReady()&&__game.fieldArtReady',polling=100);await q.wait_for_timeout(500)
   await q.evaluate('''({cx,cy,zoom,stage})=>{const G=__game,S=G.S,P=S.player;window.__skip.ui=true;window.__skip.cone=true;S.fade=0;S.marked=null;S.facOn=false;
    Object.assign(P,{x:stage==='m2'?888:1320,y:stage==='m2'?1700:650,fl:0,z:0,a:-Math.PI/2,hidden:false,moving:false});
    S.guards=S.guards.filter(g=>g.civ);S.cams=[];G.setZoom(zoom);G.moveCamera(1);G.cam.x=cx;G.cam.y=cy;G.ctx.fillText=()=>{};G.benchDraw(10);
   }''',{'cx':cx,'cy':cy,'zoom':zoom,'stage':a.stage})
   data=await q.locator('#game').evaluate("c=>c.toDataURL('image/webp',.94).split(',')[1]")
   (out/f'alley-{name}.webp').write_bytes(base64.b64decode(data));await q.close()
  await b.close()
 print('Captured current',a.stage,'architecture to',out)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--url',default='http://127.0.0.1:8043/build/preview_city.html');a.add_argument('--out',default='build/front-end-v243');a.add_argument('--stage',choices=['m2','m4'],default='m4');asyncio.run(main(a.parse_args()))
