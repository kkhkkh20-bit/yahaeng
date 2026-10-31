"""Bake CC0 modular people using the game's existing 8-direction pose contract.

npm install --prefix tools/prerender --ignore-scripts
python3 tools/prerender/bake_modular.py [--only=hero,heroSuit]
The browser renderer uses the same poses as legacy run.py. No runtime 3D engine.
"""
import asyncio, base64, io, json, math, sys, threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image
from playwright.async_api import async_playwright
from run import ANIMS, js_for, HANG_SWAY, outline
from bodies import BODIES, CIV_ANIMS
from frame_bounds import frame_bounds

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / 'build' / 'pr'
FR = 64
KEY = dict(skin='#ff0000', hair='#00ff00', shirt='#0000ff', pants='#ff00ff', shoes='#00ffff', eyes='#000000')
# Shape is separate from palette. Full hero sheets retain every traversal,
# two-person and combat frame; civilians use their existing smaller contract.
RECIPES = {
 'key': ('guard', None, None),
 'hero': ('hero', None, None), 'heroSuit': ('heroSuit', None, None),
 'heroWorker': ('heroWorker', None, None), 'heroCrew': ('heroCrew', None, None),
 'male': ('male', None, CIV_ANIMS), 'suit': ('suit', None, CIV_ANIMS),
 'worker': ('worker', None, CIV_ANIMS + ['hold', 'holdI']),
 'femaleSuit': ('heroSuit', None, CIV_ANIMS),
 'femaleWorker': ('heroWorker', None, CIV_ANIMS + ['hold', 'holdI']),
 'big': ('male', BODIES['big'], CIV_ANIMS),
 'fBob': ('woman', None, CIV_ANIMS), 'fLong': ('formal', None, CIV_ANIMS),
 'fTail': ('woman', {'parts': [BODIES['fTail']['parts'][0]]}, CIV_ANIMS),
 'coat': ('suit', None, CIV_ANIMS), 'old': ('suit', BODIES['old'], CIV_ANIMS),
 'pack': ('hoodie', {'parts': BODIES['pack']['parts']}, CIV_ANIMS),
 'helmet': ('worker', None, CIV_ANIMS + ['hold', 'holdI']),
 'kid': ('male', BODIES['kid'], ['idle', 'walk', 'run', 'crouch', 'idleC', 'talk']),
}
LOOK_MAP = {'ninja': 'hero', 'noble': 'suit', 'old': 'old', 'doc': 'suit',
            'staff': 'worker', 'courier': 'helmet', 'waiter': 'suit', 'cater': 'worker', 'strip': 'male'}
LOOK_MAP.update({f'civ{i}': ['male', 'fBob', 'male', 'fLong', 'male', 'coat', 'fTail', 'pack', 'old', 'male'][i] for i in range(10)})
# Widen crowded civilian frames; exported scale/ground anchors retain world size.
FRAME_PADDING = {name:1.4 for name in ['big','coat','pack','helmet','male','suit','worker']} | {'old':1.6}
PLAYER_MAP = {'crew': 'heroCrew', 'staff': 'heroWorker', 'courier': 'heroWorker',
              'waiter': 'heroSuit', 'cater': 'heroWorker'}
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self, *args): pass

async def main():
 OUT.mkdir(parents=True, exist_ok=True)
 meta = json.loads((OUT/'pr_meta.json').read_text())
 selected = next((x.split('=',1)[1].split(',') for x in sys.argv if x.startswith('--only=')), list(RECIPES))
 requested_patch = set(next((x.split('=',1)[1].split(',') for x in sys.argv if x.startswith('--patch=')), []))
 if requested_patch-set(a[0] for a in ANIMS):raise ValueError('Unknown animation patch')
 unknown = set(selected)-RECIPES.keys()
 if unknown: raise ValueError(f'Unknown looks: {unknown}')
 server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(HERE)))
 threading.Thread(target=server.serve_forever, daemon=True).start()
 try:
  async with async_playwright() as p:
   browser = await p.chromium.launch(executable_path='/usr/bin/chromium', args=['--enable-unsafe-swiftshader'])
   page = await browser.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(f'http://127.0.0.1:{server.server_port}/render.html?modular')
   await page.evaluate('window.__ready')
   faces = []
   for bn, (look, body, names) in RECIPES.items():
    if bn not in selected: continue
    await page.evaluate('(n)=>loadModularLook(n)',look)
    await page.evaluate('(b)=>setBody(b)',body)
    await page.evaluate('(n)=>window.spritePadding=n',FRAME_PADDING.get(bn,1))
    await page.evaluate('(c)=>setTex(c)',KEY)
    anims=[a for a in ANIMS if names is None or a[0] in names]
    cmap={};col=0
    for a in anims:cmap[a[0]]=[col,len(a[2])];col+=len(a[2])
    patch=requested_patch & cmap.keys()
    if requested_patch and not patch:continue
    if patch:
     previous=meta if bn=='key' else meta['bodies'][bn]
     if previous['cols']!=col or previous['anims']!=cmap:
      compatible=all(cmap.get(k)==v for k,v in previous['anims'].items()) and col>=previous['cols'] and set(cmap)-set(previous['anims'])<=patch
      if '--append' not in sys.argv or not compatible:raise ValueError(f'{bn}: animation layout changed; rebuild full sheet')
    # Assemble inside the browser: one PNG encode/IPC transfer per look, rather
    # than thousands of per-frame PNG transfers. Existing render APIs stay usable.
    expressions=[]
    for direction in range(8):
     c=0
     for a in anims:
      if patch and a[0] not in patch:
       c+=len(a[2]);continue
      for ti,t in enumerate(a[2]):
       hang=HANG_SWAY[ti] if a[0]=='hang' else 'undefined'
       pair = a[4] if len(a)>4 else None
       victim = bool(pair and pair[0] in ['carry','grab','lift','stab','choke'] and pair[1]=='b')
       expressions.append([c*FR,direction*FR,js_for(a,t,ti,direction*math.pi/4,hang),victim,a[0]])
       c+=1
    result=await page.evaluate('''async({frames,cols,fr,look,body,key})=>{
     const canvas=document.createElement('canvas');canvas.width=cols*fr;canvas.height=8*fr;
     const ctx=canvas.getContext('2d'),source=document.querySelector('canvas');
     const encode=source.toDataURL;source.toDataURL=()=>'';
     const holds=[],hangs=[],grounds={},scales={},climbHands=[],climbFeet=[],hangHands=[],ledgePullHands=[],openLowHands=[],openHighHands=[];
     try {for(const victim of [false,true]) {
       if(!frames.some(f=>f[3]===victim))continue;
       await loadModularLook(victim?'hero':look,victim?look:'guard');
       setBody(body,victim?1:0);setTex(key);
       for(const [x,y,js,isVictim,anim] of frames){if(isVictim!==victim)continue;(0,eval)(js);ctx.drawImage(source,x,y,fr,fr);
         if(js.includes('true)')&&window.lastHold)holds[y/fr]=window.lastHold.map(v=>v/2);
         grounds[anim]=window.frameGroundY;scales[anim]=window.frameScale||1;
         if(anim==='openLow'){const row=y/fr;(openLowHands[row]||=([])).push(window.frameClimbHands);}
         if(anim==='openHigh'){const row=y/fr;(openHighHands[row]||=([])).push(window.frameClimbHands);}
         if(anim==='ledgePull'){const row=y/fr;(ledgePullHands[row]||=([])).push(window.frameClimbHands);}
         if(anim==='hang'){const row=y/fr;(hangHands[row]||=([])).push(window.frameClimbHands);}
         if(anim==='climb'){const row=y/fr;(climbHands[row]||=([])).push(window.frameClimbHands);(climbFeet[row]||=([])).push(window.frameClimbFeet);}
       }
     }}finally{source.toDataURL=encode}
     return {png:canvas.toDataURL(),holds,hangs,grounds,scales,climbHands,climbFeet,hangHands,ledgePullHands,openLowHands,openHighHands};
    }''',{'frames':expressions,'cols':col,'fr':FR,'look':look,'body':body,'key':KEY})
    image=Image.open(io.BytesIO(base64.b64decode(result['png'].split(',')[1]))).convert('RGBA')
    outlined=Image.new('RGBA',image.size)
    patch_cols=[c for a in anims if not patch or a[0] in patch for c in range(cmap[a[0]][0],cmap[a[0]][0]+cmap[a[0]][1])]
    for direction in range(8):
     for c in patch_cols:
      box=(c*FR,direction*FR,(c+1)*FR,(direction+1)*FR)
      outlined.paste(outline(image.crop(box)),box[:2])
    image=outlined.quantize(colors=192,method=Image.FASTOCTREE).convert('RGBA')
    filename='key.webp' if bn=='key' else f'body_{bn}.webp'
    if patch:
     original=Image.open(OUT/filename).convert('RGBA')
     if original.size!=image.size:
      if '--append' not in sys.argv or original.height!=image.height or original.width>image.width:raise ValueError(f'{bn}: incompatible sheet size')
      expanded=Image.new('RGBA',image.size);expanded.paste(original,(0,0));original=expanded
     previous.update(cols=col,anims=cmap)
     for direction in range(8):
      for c in patch_cols:
       box=(c*FR,direction*FR,(c+1)*FR,(direction+1)*FR);original.paste(image.crop(box),box[:2])
     previous['bounds']=frame_bounds(original,FR,cmap)
     original.save(OUT/filename,'WEBP',lossless=True,method=6)
     if bn=='key':original.save(OUT/'key.png',optimize=True)
     if 'climb' in patch:previous.update(climbHands=result['climbHands'],climbFeet=result['climbFeet'])
     if 'hang' in patch:previous['hangHands']=result['hangHands']
     for access in ['openLow','openHigh']:
      if access in patch:previous[access+'Hands']=result[access+'Hands']
     if 'ledgePull' in patch:previous['ledgePullHands']=result['ledgePullHands']
     previous.setdefault('grounds',{}).update({name:value for name,value in result['grounds'].items() if name in patch})
     previous.setdefault('scales',{}).update({name:value for name,value in result['scales'].items() if name in patch})
     (OUT/'pr_meta.json').write_text(json.dumps(meta,separators=(',',':')))
     print(bn,'patched',','.join(sorted(patch)),(OUT/filename).stat().st_size,flush=True)
     continue
    image.save(OUT/filename,'WEBP',lossless=True,method=6)
    # Also preserve the PNG used by legacy append tools for the base contract.
    if bn=='key':
     image.save(OUT/'key.png',optimize=True);meta.update(fr=FR,cols=col,groundY=46.8,anims=cmap,grounds=result['grounds'],scales=result['scales'])
    else:meta.setdefault('bodies',{})[bn]={'cols':col,'anims':cmap,'grounds':result['grounds'],'scales':result['scales']}
    (meta if bn=='key' else meta['bodies'][bn])['bounds']=frame_bounds(image,FR,cmap)
    for access in ['openLow','openHigh']:
     if result[access+'Hands']:(meta if bn=='key' else meta['bodies'][bn])[access+'Hands']=result[access+'Hands']
    if result['ledgePullHands']:(meta if bn=='key' else meta['bodies'][bn])['ledgePullHands']=result['ledgePullHands']
    if result['hangHands']:(meta if bn=='key' else meta['bodies'][bn])['hangHands']=result['hangHands']
    if result['climbHands']:(meta if bn=='key' else meta['bodies'][bn]).update(climbHands=result['climbHands'],climbFeet=result['climbFeet'])
    await page.evaluate('(n)=>loadModularLook(n)',look)
    await page.evaluate('(b)=>setBody(b)',body)
    await page.evaluate('(c)=>setTex(c)',KEY)
    if bn=='hero':
     meta['holdHand']=result['holds']
     # Explicit measurement avoids stale values from earlier animations.
     await page.evaluate("renderFrame('Idle',0,Math.PI*1.5,0,0)")
     meta['hangHand']=await page.evaluate('window.lastHand.map(v=>v/2)')
    face=await page.evaluate('renderFace(0.42,256)')
    face_im=Image.open(io.BytesIO(base64.b64decode(face.split(',')[1]))).convert('RGBA')
    # Keep individual keys to allow incremental/reproducible rebuilds.
    face_im.save(OUT/f'face_{bn}.webp','WEBP',lossless=True,method=6)
    print(bn,col,(OUT/filename).stat().st_size,flush=True)
    (OUT/'pr_meta.json').write_text(json.dumps(meta,separators=(',',':')))
   for bn in RECIPES:
    face=OUT/f'face_{bn}.webp'
    if face.exists():faces.append((bn,Image.open(face).convert('RGBA')))
   if len(faces)==len(RECIPES) and not requested_patch:
    image=Image.new('RGBA',(256*len(faces),256))
    for i,(_,face) in enumerate(faces):image.paste(face,(i*256,0))
    image.save(OUT/'face.webp','WEBP',lossless=True,method=6)
    meta['faces']={'fr':256,'cols':{('' if bn=='key' else bn):i for i,(bn,_) in enumerate(faces)}}
    meta.update(style='modular',looks=LOOK_MAP,playerLooks=PLAYER_MAP,
      bodyGender={bn:('female' if bn.startswith(('hero','female')) or bn in ['fBob','fLong','fTail'] else 'male') for bn in RECIPES})
   (OUT/'pr_meta.json').write_text(json.dumps(meta,separators=(',',':')))
   if errors:raise RuntimeError(errors)
   await browser.close()
 finally:server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
