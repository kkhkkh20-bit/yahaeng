"""Bake grounded, eight-direction officer gestures and hand-attached props.
Uses the existing CC0 models offline; the browser receives only 2D sprites.
python tools/prerender/bake_target_personality.py [--only=suit,big]
"""
import asyncio,base64,io,json,math,sys,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from PIL import Image
from playwright.async_api import async_playwright
from bake_modular import RECIPES,KEY,QuietHandler,FRAME_PADDING
from frame_bounds import frame_bounds
from run import outline
R=Path(__file__).resolve().parents[2];H=R/'tools/prerender';O=R/'build/pr';FR=64
GESTURES=['phone','ledger','point','drink','smoke'];N=14
async def main():
 selected=next((a.split('=',1)[1].split(',')for a in sys.argv if a.startswith('--only=')),['pack','worker','suit','bossBig','old','helmet','femaleSuit','femaleBoss','femaleWorker'])
 meta=json.loads((O/'pr_meta.json').read_text())
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(H)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.goto(f'http://127.0.0.1:{server.server_port}/render.html?modular');await q.evaluate('window.__ready')
   for body in selected:
    look,shape,_=RECIPES[body];await q.evaluate('(x)=>loadModularLook(x)',look);await q.evaluate('(x)=>setBody(x)',shape);await q.evaluate('(x)=>setTex(x)',KEY)
    await q.evaluate('(x)=>{window.spritePadding=x.padding;window.bossLeftHand=x.left;}',{'padding':FRAME_PADDING.get(body,1),'left':body=='old'})
    anims={a:[i*N,N]for i,a in enumerate(GESTURES)};cols=len(GESTURES)*N
    result=await q.evaluate('''({anims,cols,n,fr})=>{
     const out=document.createElement('canvas');out.width=cols*fr;out.height=8*fr;const c=out.getContext('2d'),src=document.querySelector('canvas'),encode=src.toDataURL;src.toDataURL=()=>'';const grounds={},scales={};
     try{for(let row=0;row<8;row++)for(const[name,[start]]of Object.entries(anims))for(let i=0;i<n;i++){
      renderBossGesture(name,i/(n-1),row*Math.PI/4);c.drawImage(src,(start+i)*fr,row*fr,fr,fr);grounds[name]=window.frameGroundY;scales[name]=window.frameScale;
     }}finally{src.toDataURL=encode;}return{png:out.toDataURL(),grounds,scales};
    }''',{'anims':anims,'cols':cols,'n':N,'fr':FR})
    raw=Image.open(io.BytesIO(base64.b64decode(result['png'].split(',')[1]))).convert('RGBA');atlas=Image.new('RGBA',raw.size)
    for row in range(8):
     for col in range(cols):
      box=(col*FR,row*FR,(col+1)*FR,(row+1)*FR);im=raw.crop(box);bounds=im.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
      if not bounds or min(bounds[:2])<=1 or max(bounds[2:])>=FR-1:raise ValueError((body,row,col,'empty/clipped gesture',bounds))
      atlas.paste(outline(im),box[:2])
    atlas=atlas.quantize(colors=192,method=Image.FASTOCTREE).convert('RGBA');name=body+'PersonaMotion';path=O/f'body_{name}.webp';atlas.save(path,'WEBP',lossless=True,method=6)
    meta['bodies'][name]={'cols':cols,'anims':anims,'grounds':result['grounds'],'scales':result['scales'],'baseBody':body,'fluid':True,'bounds':{name:[[atlas.crop(((start+i)*FR,row*FR,(start+i+1)*FR,(row+1)*FR)).getchannel('A').getbbox() for i in range(count)]for row in range(8)]for name,(start,count)in anims.items()}}
    (O/'pr_meta.json').write_text(json.dumps(meta,separators=(',',':')));print(name,path.stat().st_size,flush=True)
   if errors:raise RuntimeError(errors)
   await b.close()
 finally:server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
