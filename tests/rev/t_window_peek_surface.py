"""Window sight reveals the visible room while preserving the exterior facade."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.wait_for_timeout(300)
   result=await q.evaluate('''()=>{const G=__game,S=G.S,c=G.ctx;S.fade=0;G.moveCamera(1);G.benchDraw(2);const k=c.canvas.width/innerWidth,scale=G.SCALE*k;
    c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle='#ff00ff';c.fillRect(0,0,c.canvas.width,c.canvas.height);c.setTransform(scale,0,0,scale,(innerWidth/2-G.cam.x*G.SCALE)*k,(innerHeight/2-G.cam.y*G.SCALE)*k);G.drawWindowSight(S.player,-1);c.restore();
    for(const wy of [264,312]){const x=Math.round(((216-G.cam.x)*G.SCALE+innerWidth/2)*k),y=Math.round(((wy-G.cam.y)*G.SCALE+innerHeight/2)*k),v=c.getImageData(x,y,1,1).data;
    if(v[0]!==255||v[1]!==0||v[2]!==255)throw Error('window peek repaints the warehouse facade '+wy+' '+[...v]);}
    const image=c.getImageData(0,0,c.canvas.width,c.canvas.height).data;let visible=0;for(let i=0;i<image.length;i+=4)if(image[i]!==255||image[i+1]!==0||image[i+2]!==255)visible++;
    if(!visible)throw Error('legitimate window sight was disabled');
    const windows=S.windows.filter(a=>a.ty===G.BLD[0].y1&&a.tx<=G.BLD[0].x1);if(windows.length!==3)throw Error('visual fix changed actual opening geometry');
    G.benchDraw(1);return{exteriorPreserved:true,visibleRoomPixels:visible,actualWindows:windows.length};}''')
   assert not errors,errors;print('PASS window peek facade',w,result,flush=True);await q.close()
  await b.close()
asyncio.run(main())
