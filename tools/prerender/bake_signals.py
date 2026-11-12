"""Bake the free-mode traffic and pedestrian signals as shaded 3/4 sprites (same projection as the buildings).

Pole, arm and housing are rendered from simple solids with kenney_ruk/bake.html; lamps are left dark so the
game lights the current one on top. Output: src/art/signals/signals.webp (atlas) + signals.json.
"""
import asyncio,base64,io,json,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2];HERE=ROOT/'tools/prerender';OUT=ROOT/'src/art/signals'
PPU=48;H=1.0;ARM=64/48;POLE=0x6d7680;DARK=0x15171b;PLATE=0xd8aa22;LENS=0x2a2d33
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def head(cx,cz,vertical):
 L,D=46/48,16/48;w,d=(D,L) if vertical else (L,D)
 items=[{'box':[cx-w/2-.05,H-.16,cz-d/2-.05,cx+w/2+.05,H-.1,cz+d/2+.05],'color':PLATE,'rough':.6},
        {'box':[cx-w/2,H-.12,cz-d/2,cx+w/2,H+.1,cz+d/2],'color':DARK,'rough':.5,'metal':.3}]
 lamps=[]
 for k in range(4):
  o=-L/2+6/48+k*11.3/48;lx,lz=(cx,cz+o) if vertical else (cx+o,cz)
  items.append({'cyl':[lx,H+.1,lz,lx,H+.13,lz],'r':4.4/48,'color':LENS,'rough':.3,'metal':.1});lamps.append([lx,lz-(H+.13)])
 return items,lamps
def signal(dx,dz,vertical):
 hx,hz=dx*ARM,dz*ARM;it,lamps=head(hx,hz,vertical)
 it=[{'box':[-.12,0,-.12,.12,.08,.12],'color':0x4a515a},{'cyl':[0,0,0,0,H+.04,0],'r':.065,'color':POLE,'rough':.5,'metal':.4},
     {'cyl':[0,H,0,hx,H,hz],'r':.045,'color':POLE,'rough':.5,'metal':.4}]+it
 return it,lamps
def walk():
 # 보행 신호: 짧은 기둥 위 상자, 앞(남쪽)면이 보인다. 그림(서 있는/걷는 사람)은 게임이 앞면에 켠다
 h=.95;it=[{'box':[-.1,0,-.1,.1,.06,.1],'color':0x4a515a},{'cyl':[0,0,0,0,h,0],'r':.05,'color':POLE,'rough':.5,'metal':.4},
  {'box':[-.19,h-.05,-.12,.19,h+.52,.1],'color':DARK,'rough':.5,'metal':.3},{'box':[-.16,h+.25,.1,.16,h+.49,.12],'color':LENS},{'box':[-.16,h-.02,.1,.16,h+.22,.12],'color':LENS}]
 return it,[[0,.12-(h+.37)],[0,.12-(h+.10)]]
async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 recipes={'sigE':signal(0,-1,True),'sigW':signal(0,1,True),'sigS':signal(1,0,False),'sigN':signal(-1,0,False),'walk':walk()}
 srv=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(HERE)));threading.Thread(target=srv.serve_forever,daemon=True).start()
 sprites={}
 try:
  async with async_playwright() as p:
   b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);page=await b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(f'http://127.0.0.1:{srv.server_port}/kenney_ruk/bake.html');await page.wait_for_function('window.__ok')
   for key,(items,lamps) in recipes.items():
    box=[-2,-3,2,1.5];spec={'box':box,'ppu':PPU,'ground':False,'ys':1,'hemi':1.25,'sun':1.5,'items':items}
    data=await page.evaluate('async s=>{await bake(s);return document.querySelector("canvas").toDataURL("image/png")}',spec)
    im=Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA');bb=im.getbbox();im=im.crop(bb)
    # 원점(기둥 발) 기준 위치: 화면 px = (x - box[0]) * PPU
    ox,oy=box[0]*PPU+bb[0],box[1]*PPU+bb[1]
    sprites[key]={'im':im,'ox':round(ox),'oy':round(oy),'lamps':[[round(x*PPU,1),round(z*PPU,1)] for x,z in lamps]}
    print('baked',key,im.size,flush=True)
   assert not errors,errors;await b.close()
 finally:srv.shutdown()
 W=sum(s['im'].width+2 for s in sprites.values());Hh=max(s['im'].height for s in sprites.values());atlas=Image.new('RGBA',(W,Hh));x=0;meta={}
 for k,s in sprites.items():
  atlas.paste(s['im'],(x,0));meta[k]={'x':x,'y':0,'w':s['im'].width,'h':s['im'].height,'ox':s['ox'],'oy':s['oy'],'lamps':s['lamps']};x+=s['im'].width+2
 atlas.save(OUT/'signals.webp',lossless=True);(OUT/'signals.json').write_text(json.dumps(meta,indent=1)+'\n')
if __name__=='__main__':asyncio.run(main())
