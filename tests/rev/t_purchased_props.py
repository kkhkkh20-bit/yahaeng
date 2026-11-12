"""Owned prop cuts, supported cargo, fixed pixel density and pure renderer contracts.
Standalone browser fixtures below test the production module without adding game
objects. The root's campaign integration is verified separately after bundling.
"""
import asyncio,base64,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/props-v247'

def source_checks():
 m=json.loads((R/'src/art/purchased-props/props.json').read_text());a=Image.open(R/'src/art/purchased-props/props.webp').convert('RGBA');raw=Path('/workspace/work/office-v226/private/Tilemap/MainTileMap.png')
 source=Image.open(raw).convert('RGBA')if raw.exists()else None
 cargo=[]
 for name,f in m['frames'].items():
  x,y,w,h=f['rect'];im=a.crop((x,y,x+w,y+h));assert im.getbbox(),name
  assert f['worldScale']==1.5
  if name.startswith('cargoStable'):
   assert im.size==(32,32);base=f['base'];top=f['upper'];bb=im.getbbox();assert bb[3]-bb[1]==30 and 45<=(bb[3]-bb[1])*1.5<=48
   assert top['x']>=base['x']and top['x']+top['w']<=base['x']+base['w']
   assert top['y']+top['h']==base['y']+1
   assert f['sourceBorder']==1 and f['shippingLabel']==[2,2]
   # Every point on the bottom of the upper carton is supported by the lower
   # carton's top row; no air gaps are hidden behind an alpha outline.
   y0=base['y']
   assert all(im.getpixel((xx,y0))[3]==255 for xx in range(top['x'],top['x']+top['w']))
   if source:
    palette=set(source.crop(tuple(f['sourceRect'])).get_flattened_data());assert all(p in palette or p[3]==0 for p in im.get_flattened_data())
   cargo.append(name)
  elif source:
   assert im.tobytes()==source.crop(tuple(f['sourceRect'])).tobytes(),name
 assert len(cargo)==3 and len(m['frames'])==15
 return m

async def main():
 m=source_checks();m['src']='data:image/webp;base64,'+base64.b64encode((R/'src/art/purchased-props/props.webp').read_bytes()).decode();O.mkdir(exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1200,'height':900});await q.goto('about:blank')
  await q.evaluate('''a=>{window.A={purchasedProps:a};window.TILE=48;window.TAU=Math.PI*2;window.tc=x=>x*48+24;window.CUR_F=3;window.S={floorC:{old:1},items:[],props:[],lamps:[],ladders:[]};window.STAGE={};window.FURN=[];window.BLD=[{x0:0,y0:0,x1:10,y1:10}];window.G=Array.from({length:11},(_,y)=>Array(11).fill(y?'w':'#'));window.bldAt=()=>0;window.flOf=o=>o.fl||0;window.OFFICE_STYLES={security:{},residence:{},estate:{}};window.testStyle={};window.officeStyle=()=>testStyle;window.officeReady=()=>true;window.officeDecorLayout=()=>[];window.mapC={old:1};window.miniBase={old:1};window.setLayer=f=>{CUR_F=f};window.renderCount=0;window.renderMap=()=>({generation:++renderCount});window.bigify=a=>a;window.requestMapRebuild=()=>{window.mapC=bigify(renderMap());};}''',m)
  module=(R/'src/js/graphics/purchased_props.js').read_text();await q.add_script_tag(content=module+'\nwindow.PROP_TEST={purchasedPropsReady,purchasedPropFrame,purchasedPropBlit,purchasedPropCargoBounds,drawPurchasedPropCargo,purchasedPropFurnKey,purchasedPropFurnBounds,drawPurchasedPropFurn,purchasedPropWallLayout,refreshPurchasedProps};')
  await q.wait_for_function('PROP_TEST.purchasedPropsReady()')
  r=await q.evaluate('''()=>{const T=PROP_TEST,check=(v,m)=>{if(!v)throw Error(m)},c=document.createElement('canvas');c.width=800;c.height=500;const x=c.getContext('2d');let draws=[];const raw=x.drawImage;x.drawImage=function(...a){draws.push(a);return raw.apply(this,a)};
   const before=JSON.stringify([x.globalAlpha,x.getTransform(),x.fillStyle]);for(let i=0;i<3;i++){draws=[];T.drawPurchasedPropCargo(x,i,0);check(draws.length===1,'cargo duplicates whole pile');const a=draws[0],b=T.purchasedPropCargoBounds(i,0);check(a[7]===48&&a[8]===48&&b.visibleHeight===45,'cargo has wrong source scale or visible height');}check(JSON.stringify([x.globalAlpha,x.getTransform(),x.fillStyle])===before,'cargo leaks canvas state');
   const cases=[{t:'cab',x:1,y:2,w:1,h:1,seed:0},{t:'cab',x:1,y:2,w:1,h:1,seed:1},{t:'cab',x:1,y:2,w:1,h:1,seed:2},{t:'shelf',x:1,y:2,w:1,h:1,seed:0},{t:'shelf',x:1,y:2,w:1,h:1,seed:1},{t:'shelf',x:1,y:2,w:1,h:1,seed:2},{t:'plant',x:1,y:2,w:1,h:1,seed:0},{t:'plant',x:1,y:2,w:1,h:1,seed:1},{t:'board',x:1,y:2,w:2,h:1,seed:1},{t:'board',x:1,y:2,w:1,h:1,seed:0}];
   const variants=[];for(const f of cases){const json=JSON.stringify(f),b=T.purchasedPropFurnBounds(f);draws=[];check(T.drawPurchasedPropFurn(x,f,true),'missing matching furniture '+f.t);check(JSON.stringify(f)===json,'renderer mutates furniture');const a=draws[0],r=T.purchasedPropFrame(b.key);check(a[7]===r[2]*1.5&&a[8]===r[3]*1.5,'pixel scale changed');check(b.w<=f.w*48&&b.h<=f.h*48+40,'furniture exceeds expected footprint');variants.push(b.key);}
   const sentinel={t:'shelf',x:1,y:2,w:1,h:1,seed:0};testStyle=OFFICE_STYLES.security;check(T.purchasedPropFurnKey(sentinel)===null,'security monitor shelf replaced');testStyle={};check(T.purchasedPropFurnKey({...sentinel,skin:'freight'})===null,'freight assembly replaced');check(T.purchasedPropFurnKey({...sentinel,t:'wardrobe'})===null,'physical hiding cabinet replaced');STAGE.officeArt={furniture:[{...sentinel,art:'authored'}]};check(T.purchasedPropFurnKey(sentinel)===null,'authored furniture replaced');STAGE.officeArt={};
   const counter={t:'counter',x:3,y:4,w:2,h:1};check(T.purchasedPropFurnKey(counter)===null,'unassigned counter gains a printer');STAGE.purchasedProps={counterPrinters:[{x:3,y:4,fl:0}]};check(T.purchasedPropFurnKey(counter)==='serviceCounter','assigned service printer absent');S.items=[{surface:counter,got:false}];check(T.purchasedPropFurnKey(counter)===null,'printer covers mission loot');S.items=[];
   const walls=T.purchasedPropWallLayout(0);check(walls.length===1&&walls[0].y>=16&&G[walls[0].ty][walls[0].tx]==='#','extinguisher is not wall mounted');G[0][walls[0].tx]='N';const moved=T.purchasedPropWallLayout(0);check(moved.length===1&&moved[0].tx!==walls[0].tx,'extinguisher covers a window');
   const world=JSON.stringify({FURN,G,BLD,items:S.items});T.refreshPurchasedProps();check(CUR_F===3&&renderCount===1&&Object.keys(S.floorC).length===0&&miniBase===null,'late art load did not refresh floor caches');check(JSON.stringify({FURN,G,BLD,items:S.items})===world,'cache refresh mutates world');T.refreshPurchasedProps();check(renderCount===1,'refresh rebuilds every frame');
   window.__PURCHASED_PROPS_BASELINE__=true;check(!T.drawPurchasedPropCargo(x,0,0)&&!T.drawPurchasedPropFurn(x,sentinel),'cold/baseline path hides fallback');return{cargo:3,variants,wallMounts:walls.length,keepsSourceScale:true,worldUnchanged:true,lateLoadRebuildsOnce:true};}''')
  print('PASS purchased props',json.dumps(r),flush=True);(O/'checks.json').write_text(json.dumps(r,indent=2))
  preview=await q.evaluate('''()=>{window.__PURCHASED_PROPS_BASELINE__=false;const c=document.createElement('canvas');c.width=1280;c.height=850;const x=c.getContext('2d');x.fillStyle='#192630';x.fillRect(0,0,c.width,c.height);x.textAlign='center';x.font='22px sans-serif';x.fillStyle='#e0e2db';x.fillText('Owned Office Interior props - 2x review of 1.5x game sprites',640,38);const keys=Object.keys(A.purchasedProps.frames);keys.forEach((key,i)=>{const xx=i%5*256,yy=65+Math.floor(i/5)*255,r=PROP_TEST.purchasedPropFrame(key);x.fillStyle='#243541';x.fillRect(xx+10,yy+5,236,235);x.save();x.translate(xx+128,yy+120);x.scale(2,2);PROP_TEST.purchasedPropBlit(x,key,-r[2]*.75,-r[3]*.75);x.restore();x.fillStyle='#e0e2db';x.font='16px sans-serif';x.fillText(key,xx+128,yy+218);});return c.toDataURL();}''')
  (O/'prop-gallery.png').write_bytes(base64.b64decode(preview.split(',')[1]));await b.close()
if __name__=='__main__':asyncio.run(main())
