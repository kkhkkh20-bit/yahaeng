"""Bake supported lowering, a relaxed corpse and a distinct deliberate finish.
Same pinned CC0 rigs, 64px frames and palettes as existing actors; no runtime 3D.
"""
import asyncio,base64,io,json,math,sys,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from PIL import Image
from bake_modular import RECIPES,KEY,QuietHandler
from run import outline
R=Path(__file__).resolve().parents[2];H=R/'tools/prerender';O=R/'build/pr';FR=64
HERO=['hero','heroSuit','heroWorker','heroCrew','heroAgent','heroAgentCrew','heroAgentWorker','heroAgentFormal']
async def main():
 m=json.loads((O/'pr_meta.json').read_text());selected=next((a.split('=',1)[1].split(',')for a in sys.argv if a.startswith('--only=')),list(m['fluidBodies']))
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(H)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  from playwright.async_api import async_playwright
  async with async_playwright()as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);q=await b.new_page();q.on('pageerror',lambda e:print('PAGE ERROR',str(e),flush=True));q.on('console',lambda m:print('BROWSER',m.text,flush=True)if m.type=='error'else None);await q.goto(f'http://127.0.0.1:{server.server_port}/render.html?modular');await q.wait_for_function('!!window.__ready',timeout=15000);await q.evaluate('window.__ready')
   for body in selected:
    look,shape,_=RECIPES[body];hero=body in HERO
    await q.evaluate('(v)=>loadModularLook(...v)',[look,'guard']if hero else['heroAgent',look]);await q.evaluate('(s)=>setBody(s,'+('0'if hero else'1')+')',shape);await q.evaluate('(c)=>setTex(c)',KEY)
    defs=[('lower',13,'lower','a'),('finish',9,'finish','a')]if hero else[('lowered',13,'lower','b')]
    # Independent bodies use their own exact rig for the endpoint, not a partner.
    frames=[];anims={};col=0
    for name,n,mode,part in defs:anims[name]=[col,n];col+=n
    for row in range(8):
     for name,n,mode,part in defs:
      for i in range(n):frames.append([(anims[name][0]+i)*FR,row*FR,f"renderTakedownEnd('{mode}',{i/(n-1)},{row*math.pi/4},'{part}')",name])
    data=await q.evaluate('''({frames,cols})=>{const out=document.createElement('canvas');out.width=cols*64;out.height=512;const c=out.getContext('2d'),src=document.querySelector('canvas'),enc=src.toDataURL,grounds={},scales={};src.toDataURL=()=>'';try{for(const[x,y,js,name]of frames){(0,eval)(js);c.drawImage(src,x,y,64,64);grounds[name]=frameGroundY;scales[name]=frameScale;}}finally{src.toDataURL=enc;}return{png:out.toDataURL(),grounds,scales};}''',{'frames':frames,'cols':col})
    image=Image.open(io.BytesIO(base64.b64decode(data['png'].split(',')[1]))).convert('RGBA')
    if not hero:
     # Rest clips are baked with this body in the primary slot, at the origin.
     await q.evaluate('(v)=>loadModularLook(v)',look);await q.evaluate('(s)=>setBody(s,0)',shape);await q.evaluate('(c)=>setTex(c)',KEY)
     extra=[('restIn',9),('rest',1)];tail=Image.new('RGBA',((col+10)*FR,512));tail.paste(image,(0,0))
     for name,n in extra:
      anims[name]=[col,n]
      for row in range(8):
       for i in range(n):
        d=await q.evaluate('''({name,t,a})=>{renderTakedownEnd(name,t,a,'a');return{png:document.querySelector('canvas').toDataURL(),g:frameGroundY,s:frameScale};}''',{'name':name,'t':i/(n-1)if n>1 else 1,'a':row*math.pi/4})
        im=Image.open(io.BytesIO(base64.b64decode(d['png'].split(',')[1]))).convert('RGBA').resize((64,64),Image.Resampling.LANCZOS);tail.paste(im,((col+i)*FR,row*FR));data['grounds'][name]=d['g'];data['scales'][name]=d['s']
      col+=n
     image=tail
    out=Image.new('RGBA',image.size)
    for row in range(8):
     for i in range(col):out.paste(outline(image.crop((i*FR,row*FR,(i+1)*FR,(row+1)*FR))),(i*FR,row*FR))
    name=body+'EndMotion';path=O/f'body_{name}.webp';out=out.quantize(colors=64 if body.startswith('heroAgent')else 192,method=Image.FASTOCTREE).convert('RGBA');out.save(path,'WEBP',lossless=True,method=6)
    m['bodies'][name]={'cols':col,'anims':anims,'grounds':data['grounds'],'scales':data['scales'],'fluid':True,'loops':{},'baseBody':body,'restShift':[[24*math.cos(a),6+24*math.sin(math.radians(52))*math.sin(a)]for a in [i*math.pi/4 for i in range(8)]]}
    m['bodies'][name]['bounds']={k:[[out.crop(((start+i)*FR,row*FR,(start+i+1)*FR,(row+1)*FR)).getchannel('A').getbbox() for i in range(n)]for row in range(8)]for k,(start,n)in anims.items() if k in ['rest','restIn']};m['fluidBodies'][body]['end']=name;(O/'pr_meta.json').write_text(json.dumps(m,separators=(',',':')));print(body,col,path.stat().st_size,flush=True)
   await b.close()
 finally:server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
