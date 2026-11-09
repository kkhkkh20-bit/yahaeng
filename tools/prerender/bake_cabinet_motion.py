"""Bake planted cabinet grips by rotating the actual two-link arm rigs only.

The access approach must stop 18 world pixels nearer the cabinet than the old
openHigh approach.  See cabinetProfile in the exported metadata.  No runtime
pixel deformation, translated bodies or lengthened limbs are used.
"""
import asyncio,base64,io,json,math,sys,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from PIL import Image
from playwright.async_api import async_playwright
from bake_modular import RECIPES,KEY,QuietHandler
from run import outline

R=Path(__file__).resolve().parents[2];H=R/'tools/prerender';O=R/'build/pr';FR=64
HERO=['heroAgent','heroAgentCrew','heroAgentWorker','heroAgentFormal']
PROFILE={'standShift':-18,'baseY':-35.34,'normalWidth':16,'normalAngle':math.pi*.42,'wideWidth':40,'wideAngle':math.pi/4,'nativeHandleOffsets':[5.25,3.75]}

async def main():
 selected=next((v.split('=',1)[1].split(',')for v in sys.argv if v.startswith('--only=')),HERO)
 for arg,key in [('--stand-shift=','standShift'),('--wide-angle=','wideAngle')]:
  value=next((float(v.split('=',1)[1])for v in sys.argv if v.startswith(arg)),None)
  if value is not None:PROFILE[key]=math.radians(value)if key=='wideAngle'else value
 if set(selected)-set(HERO):raise ValueError('Unknown heroine body')
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(H)));threading.Thread(target=server.serve_forever,daemon=True).start()
 results={}
 try:
  async with async_playwright()as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.goto(f'http://127.0.0.1:{server.server_port}/render.html?modular');await q.evaluate('window.__ready')
   for body in selected:
    await q.evaluate('(look)=>loadModularLook(look)',RECIPES[body][0]);await q.evaluate('(c)=>setTex(c)',KEY);await q.evaluate('window.fluidPadding=1;window.spritePadding=1')
    defs=[('cabinetOpen','open',False),('cabinetClose','close',False),('cabinetOpenWide','open',True),('cabinetCloseWide','close',True)]
    data=await q.evaluate('''async({defs,profile})=>{
     const out=document.createElement('canvas');out.width=68*64;out.height=8*64;const c=out.getContext('2d'),src=document.querySelector('canvas'),encode=src.toDataURL;src.toDataURL=()=>'';
     const grounds={},scales={},hands={},feet={},max={fixed:0,length:0,contact:0},frames=[];
     try{for(let row=0;row<8;row++)for(let a=0;a<defs.length;a++){
      const[name,kind,wide]=defs[a];hands[name]||=[];feet[name]||=[];hands[name][row]=[];feet[name][row]=[];
      for(let i=0;i<17;i++){
       renderCabinetPose(kind,i/16,row*Math.PI/4,{standShift:profile.standShift,baseY:profile.baseY,width:wide?profile.wideWidth:profile.normalWidth,angle:wide?profile.wideAngle:profile.normalAngle});
       c.drawImage(src,(a*17+i)*64,row*64,64,64);grounds[name]=frameGroundY;scales[name]=frameScale;
       hands[name][row].push(frameClimbHands);feet[name][row].push(frameClimbFeet);
       const f=frameCabinet;max.fixed=Math.max(max.fixed,f.invariants.fixed);max.length=Math.max(max.length,f.invariants.length);
       if(row===6&&f.weight===1)for(let h=0;h<2;h++){
        const actual=[(frameClimbHands[h][0]-32)*frameScale,13+(frameClimbHands[h][1]-frameGroundY)*frameScale];
        max.contact=Math.max(max.contact,Math.hypot(actual[0]-f.targets[h][0],actual[1]-f.targets[h][1]));
       }
       if(row===6)frames.push({name,frame:i,weight:f.weight,open:f.open,targets:f.targets,hands:frameClimbHands});
      }
     }}finally{src.toDataURL=encode;}return{png:out.toDataURL(),grounds,scales,hands,feet,max,frames};}''',{'defs':defs,'profile':PROFILE})
    if errors:raise RuntimeError(errors)
    assert data['max']['contact']<2,data['max']
    assert data['max']['fixed']<1e-7,data['max']
    assert data['max']['length']<1e-3,data['max']
    raw=Image.open(io.BytesIO(base64.b64decode(data['png'].split(',')[1]))).convert('RGBA');out=Image.new('RGBA',raw.size)
    for row in range(8):
     for col in range(68):
      tile=raw.crop((col*FR,row*FR,(col+1)*FR,(row+1)*FR));box=tile.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox()
      assert box and min(box[:2])>1 and max(box[2:])<FR-1,(body,row,col,box)
      out.paste(outline(tile),(col*FR,row*FR))
    out=out.quantize(colors=64,method=Image.FASTOCTREE).convert('RGBA');name=body+'CabinetMotion';path=O/f'body_{name}.webp';out.save(path,'WEBP',lossless=True,method=6)
    meta={'cols':68,'anims':{n:[i*17,17]for i,(n,_,_)in enumerate(defs)},'grounds':data['grounds'],'scales':data['scales'],'fluid':True,'loops':{},'baseBody':body,'cabinetProfile':PROFILE,'ik':data['max']}
    for n,_,_ in defs:meta[n+'Hands']=data['hands'][n];meta[n+'Feet']=data['feet'][n]
    results[body]=(name,meta);print(name,path.stat().st_size,json.dumps(data['max']),flush=True)
    report=R/'build/wardrobes-v247';report.mkdir(exist_ok=True);(report/(name+'.json')).write_text(json.dumps({'profile':PROFILE,'max':data['max'],'frames':data['frames']},indent=2))
   await b.close()
  if '--no-publish' in sys.argv:
   (R/'build/wardrobes-v247/cabinet-draft-meta.json').write_text(json.dumps(results,separators=(',',':')))
   return
  # Publish metadata only after every requested sheet and invariant passes.
  m=json.loads((O/'pr_meta.json').read_text())
  for body,(name,meta)in results.items():
   m['bodies'][name]=meta
   for anim in meta['anims']:m['fluidBodies'].setdefault(body,{})[anim]=name
  temp=O/'pr_meta.json.tmp';temp.write_text(json.dumps(m,separators=(',',':')));temp.replace(O/'pr_meta.json')
 finally:server.shutdown();server.server_close()

if __name__=='__main__':asyncio.run(main())
