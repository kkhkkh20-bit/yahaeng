"""Bake dense heroine and paired-victim tracks without changing legacy atlases.
python tools/prerender/bake_fluid_motion.py [--only=hero,heroCrew,key]
The pinned, CC0 models and shared authored renderer are used offline only.
"""
import asyncio,base64,io,json,math,sys,threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image
from playwright.async_api import async_playwright
from bake_modular import RECIPES,KEY,QuietHandler,FRAME_PADDING
from run import outline
R=Path(__file__).resolve().parents[2];H=R/'tools/prerender';O=R/'build/pr';FR=64
HERO=['hero','heroSuit','heroWorker','heroCrew','heroAgent','heroAgentCrew','heroAgentWorker']
# Seconds per loop keep physical footsteps and paired actors on their own clocks.
PERIODS={'walk':1,'run':.64,'sneak':1.24,'idleC':3.2,'crouch':3.2,'carry':8/7,'grab':.55/.4,'hold':8/9,'hugStep':4/4.5,'hang':4/6,'climb':4/7,'workHigh':.7,'workLow':.7}
def flow(name,t,a):return f"renderFluidPose('{name}',{t},{a})"
def regular(clip,t,a,cr=0):return f"renderFrame('{clip}',{t},{a},{cr})"
def pair(kind,t,a,part,clip='Idle'):
 if kind in ['stab','choke'] and abs(t-round(t))>1e-7:
  k=int(t);return f"renderPair('{kind}','{clip}',{k},{a},'{part}',{{k1:{k+1},f:{t-k}}})"
 return f"renderPair('{kind}','{clip}',{t},{a},'{part}')"
def recipe(group):
 if group=='Gait':
  return [('walk',16,True,lambda t,a:regular('Walk',t,a)),('run',16,True,lambda t,a:regular('Run',t*.63,a)),('sneak',16,True,lambda t,a:regular('Walk',t,a,.7)),('idleC',12,True,lambda t,a:flow('idleC',t,a)),('crouch',8,True,lambda t,a:flow('crouch',t,a)),('carry',16,True,lambda t,a:pair('carry',t,a,'a','Walk')),('grab',12,True,lambda t,a:pair('grab',t,a,'a','Walk')),('hold',16,True,lambda t,a:f"renderFrame('Walk',{t},{a},0,undefined,true)"),('punch',12,False,lambda t,a:regular('Punch',.12+t*.53,a))]
 if group=='Action':
  return [('duck',17,False,lambda t,a:f"renderHidePose('duck',{t},{a})"),('dress',37,False,lambda t,a:flow('dress',t,a)),('workHigh',16,True,lambda t,a:flow('workHigh',t,a)),('workLow',16,True,lambda t,a:flow('workLow',t,a)),('climb',16,True,lambda t,a:flow('climb',t,a)),('hang',16,True,lambda t,a:flow('hang',t,a)),('ledgePull',25,False,lambda t,a:f"renderHidePose('ledgePull',{t},{a})"),('hugStep',16,True,lambda t,a:flow('hugStep',t,a))]+[(f'settle{k}',7,False,lambda t,a,k=k:flow(f'settle{k}',t,a)) for k in range(4)]
 if group=='Combat':return [(name,25,False,lambda t,a,name=name:pair(name,t*3,a,'a')) for name in ['stab','choke']]
 raise ValueError(group)
def reaction():return [('stabbed',25,False,lambda t,a:pair('stab',t*3,a,'b')),('choked',25,False,lambda t,a:pair('choke',t*3,a,'b')),('death',16,False,lambda t,a:regular('Death',.2+t*3.25,a))]
async def main():
 selected=next((x.split('=',1)[1].split(',') for x in sys.argv if x.startswith('--only=')),HERO+['key']+[k for k in RECIPES if not k.startswith('hero') and not k.endswith(('Motion','Lid')) and k not in ['kid','key']])
 m=json.loads((O/'pr_meta.json').read_text());m.setdefault('fluidBodies',{});jobs=[]
 for body in selected:
  look,shape,_=RECIPES[body]
  for group in (['Gait','Action','Combat'] if body in HERO else ['React']):jobs.append((body,group,look,shape))
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(H)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright()as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.goto(f'http://127.0.0.1:{server.server_port}/render.html?modular');await q.evaluate('window.__ready')
   for body,group,look,shape in jobs:
    victim=group=='React';await q.evaluate('(v)=>loadModularLook(...v)',['hero',look] if victim else [look,'guard']);await q.evaluate('(s)=>setBody(s,'+('1'if victim else'0')+')',shape);await q.evaluate('(c)=>setTex(c)',KEY);await q.evaluate('(p)=>window.spritePadding=p',FRAME_PADDING.get(body,1))
    defs=reaction() if victim else recipe(group);anims={};frames=[];col=0
    for name,n,loop,make in defs:anims[name]=[col,n];col+=n
    for row in range(8):
     for name,n,loop,make in defs:
      for i in range(n):frames.append([(anims[name][0]+i)*FR,row*FR,make(i/(n if loop else n-1),row*math.pi/4),name])
    padding={}
    for attempt in range(5):
     data=await q.evaluate('''async({frames,cols,fr,padding})=>{
     const out=document.createElement('canvas');out.width=cols*fr;out.height=8*fr;const c=out.getContext('2d'),src=document.querySelector('canvas'),encode=src.toDataURL;src.toDataURL=()=>'';
     const grounds={},scales={},hands={},feet={};try{for(const[x,y,js,name]of frames){window.fluidPadding=padding[name]||1;(0,eval)(js);c.drawImage(src,x,y,fr,fr);grounds[name]=window.frameGroundY;scales[name]=window.frameScale||1;
      if(['climb','hang','ledgePull'].includes(name)){const row=y/fr;(hands[name]||=[])[row]||=[];hands[name][row].push(window.frameClimbHands);(feet[name]||=[])[row]||=[];feet[name][row].push(window.frameClimbFeet);}
     }}finally{src.toDataURL=encode;}return{png:out.toDataURL(),grounds,scales,hands,feet};}''',{'frames':frames,'cols':col,'fr':FR,'padding':padding})
     preview=Image.open(io.BytesIO(base64.b64decode(data['png'].split(',')[1]))).convert('RGBA');clipped=set()
     for anim,(start,count) in anims.items():
      for row in range(8):
       for i in range(count):
        box=preview.crop(((start+i)*FR,row*FR,(start+i+1)*FR,(row+1)*FR)).getchannel('A').point(lambda v:255 if v>40 else 0).getbbox()
        if not box:raise ValueError((body,group,anim,row,i,'empty frame'))
        if min(box[:2])<=1 or max(box[2:])>=FR-1:clipped.add(anim)
     if not clipped:break
     for anim in clipped:padding[anim]=padding.get(anim,1)*1.15
    else:raise ValueError((body,group,'clipped after margin retries',padding))
    image=Image.open(io.BytesIO(base64.b64decode(data.pop('png').split(',')[1]))).convert('RGBA');out=Image.new('RGBA',image.size)
    for row in range(8):
     for i in range(col):out.paste(outline(image.crop((i*FR,row*FR,(i+1)*FR,(row+1)*FR))),(i*FR,row*FR))
    out=out.quantize(colors=64 if body=='heroAgent' else 192,method=Image.FASTOCTREE).convert('RGBA');name=body+group+'Motion';path=O/f'body_{name}.webp';out.save(path,'WEBP',lossless=True,method=6)
    meta={'cols':col,'anims':anims,'grounds':data['grounds'],'scales':data['scales'],'fluid':True,'loops':{n:PERIODS[n] for n,_,loop,_ in defs if loop},'baseBody':body}
    for n,points in data['hands'].items():meta[n+'Hands']=points;meta[n+'Feet']=data['feet'][n]
    m['bodies'][name]=meta;m['fluidBodies'].setdefault(body,{})[group.lower()]=name
    (O/'pr_meta.json').write_text(json.dumps(m,separators=(',',':')));print(name,col,path.stat().st_size,flush=True)
   if errors:raise RuntimeError(errors)
   await b.close()
 finally:server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
