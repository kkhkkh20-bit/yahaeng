"""Verify the authored standing pose on all heroine costumes, frames and facings."""
import asyncio,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
HERE=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(HERE)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright()as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);pg=await b.new_page();await pg.goto(f'http://127.0.0.1:{server.server_port}/render.html?modular');await pg.evaluate('window.__ready')
   n=0
   for look in ['hero','heroSuit','heroWorker','heroCrew']:
    await pg.evaluate('loadModularLook',look)
    result=await pg.evaluate('''()=>{const assert=(v,m)=>{if(!v)throw Error(m)};for(let d=0;d<8;d++)for(let f=0;f<2;f++){renderFrame('Walk',.25,d*Math.PI/4,0,undefined,false,{sway:f});const M=poseMetrics(),sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),axis=sub(M.LeftArm,M.RightArm),mid=M.LeftArm.map((v,i)=>(v+M.RightArm[i])/2),len=Math.hypot(...axis);assert(Object.values(M).flat().every(Number.isFinite),'nonfinite skeleton');assert(Math.hypot(M.Neck[0]-M.Spine[0],M.Neck[2]-M.Spine[2])<2,'forward torso lean');assert(dot(sub(M.LeftHand,mid),axis)/len>len/2+5&&dot(sub(M.RightHand,mid),axis)/len<-len/2-5,'hands buried in torso');assert(M.LeftHand[1]<M.LeftForeArm[1]&&M.RightHand[1]<M.RightForeArm[1],'arms do not hang down');assert(Math.abs(M.LeftFoot[1]-M.RightFoot[1])<1&&Math.abs(Math.min(M.LeftFoot[1],M.RightFoot[1]))<1,'feet are off the ground')}return 16}''');n+=result
   print('PASS',n,'standing poses: upright torso, visible arms, grounded feet');await b.close()
 finally:server.shutdown();server.server_close()
asyncio.run(main())
