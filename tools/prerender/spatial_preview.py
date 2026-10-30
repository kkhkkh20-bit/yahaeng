"""Render one real mission building at a consistent camera angle in three spatial states.
Outputs a review prototype, never overwrites production building atlases or collision maps.
Requires the existing CC0 source models and local game/prerender HTTP servers.
"""
import asyncio, base64, importlib.util, json, math
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/spatial';OUT.mkdir(exist_ok=True)
MODEL=ROOT/'tools/prerender/kenney_ruk'
ns={'__name__':'furniture_preview'}
exec((MODEL/'bake_base.py').read_text().rsplit('asyncio.run(main())',1)[0].replace("'/root/game", "'"+str(ROOT)),ns)
spec=importlib.util.spec_from_file_location('city_preview',MODEL/'bake_mk.py');city=importlib.util.module_from_spec(spec);spec.loader.exec_module(city)

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
  game=await browser.new_page();await game.add_init_script('window.requestAnimationFrame=()=>0')
  await game.goto('http://127.0.0.1:8001/build/preview_city.html?nostats');await game.wait_for_function('!!window.__game')
  data=await game.evaluate('''()=>{const G=window.__game;G.start(G.STAGES.findIndex(s=>s.id==='m4'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const l=G.LADDERS.find(l=>l.kind==='fstair'&&l.bfl===1),bi=G.bldAt(l.tx,l.ty),b=G.kitSpec().b[bi];G.benchDraw(2);const key=G.characterLook(G.S.player),sh=G.prVar[key],c=document.createElement('canvas');c.width=c.height=64;c.getContext('2d').drawImage(sh.parts[0],0,128,64,64,0,0,64,64);return{b,bi,hero:c.toDataURL(),grids:[0,1,2].map(f=>{G.setLayer(f);return Array.from({length:b.y1-b.y0+1},(_,y)=>Array.from({length:b.x1-b.x0+1},(_,x)=>G.tileG(b.x0+x,b.y0+y)))}),furn:G.FURN.filter(f=>f.x>b.x0&&f.x<b.x1&&f.y>b.y0&&f.y<b.y1),stairs:G.LADDERS.filter(l=>G.bldAt(l.tx,l.ty)===bi).map(l=>({tx:l.tx,ty:l.ty,kind:l.kind,bfl:l.bfl,tfl:l.tfl,rx:l.rx,ry:l.ry,lower:l.kind==='fstair'||l.kind==='stair'?G.stairFloor(l.tx,l.ty,l.bfl||0):null,upper:l.kind==='fstair'?G.stairFloor(l.tx,l.ty,l.tfl):null}))}}''')
  await game.close();pg=await browser.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto('http://127.0.0.1:8766/kenney_ruk/bake_view.html');await pg.wait_for_function('window.__ok')
  b=data['b'];W=b['x1']-b['x0']+1;D=b['y1']-b['y0']+1;L=1.65;H=b['h']*L
  def box(a,c,color,**kw):return {'box':[*a,*c],'color':color,**kw}
  def facade(levels,hollow=False):
   it=[]
   for f in range(levels):
    if not hollow:it.append(box((0,f*L,0),(W,(f+1)*L,D-.18),0x272b30))
    else:
     it.extend([box((0,f*L,0),(W,f*L+.04,D),0x343737),box((0,f*L,0),(.13,(f+1)*L,D),0x505958),box((W-.13,f*L,0),(W,(f+1)*L,D),0x505958)])
    for x in range(W):
     ch=b['front'][f][x];name='Brick_Window_Trim_Single' if ch=='N' else 'Brick_Plain_3'
     if ch=='D':
      it.extend([city.M('DoorFrame_Trim',x+.5,f*L,D,s=(.5,L/3,.5),wallTint=0x9c9e9d),city.M('Door_1',x+.6,f*L,D-.06,s=(.5,L/3,.5))])
     else:it.append(city.M(name,x+.5,f*L,D,s=(.5,L/3,.5),wallTint=0x9c9e9d,lit=(x+f)%3==0))
    # Matching side windows, repeated at real floor heights.
    for z in range(D):
     for x,r in [(W,1),(0,3)]:it.append(city.M('Brick_Window_Square_Single' if z%2 else 'Brick_Plain_3',x,f*L,z+.5,r=r,s=(.5,L/3,.5),wallTint=0x828b91,lit=(z+f)%4==0))
   return it
  common=[box((-3,-.12,-2),(W+3,-.03,D+5),0x292f35),box((-1,-.04,-1),(W+1,.0,D+1.2),0x626463)]
  for z in range(-1,D+2):common.append(box((-1,.002,z),(W+1,.008,z+.012),0x494e50))
  for x in range(-1,W+2):common.append(box((x,.002,-1),(x+.012,.008,D+1.2),0x494e50))
  # The street remains present at exactly the same position in all three views.
  for x in range(-2,W+3,3):common.append(box((x,.005,D+3),(x+1.4,.014,D+3.045),0x999272))
  common.extend([box((W+1,.0,D+.5),(W+1.5,.35,D+1.4),0x4e5c5b),box((W+1,.35,D+.5),(W+1.5,.4,D+1.4),0x707c74)])
  cached={}
  for f in data['furn']:
   if f.get('fl',0)!=1:continue
   key=(f['t'],f['w'],f['h'],f.get('r',0))
   if key not in cached:cached[key]=await ns['furn_items'](pg,*key)
  for state in ['street','interior','roof']:
   items=common+facade(1 if state=='interior' else b['h'],state=='interior')
   if state=='interior':
    F=L;g=data['grids'][1];holes=set()
    for l in data['stairs']:
     h=l.get('upper',{});h=h and h.get('well')
     if l.get('tfl')==1 and h:
      holes.update((round(h[k]['x']/48-.5)-b['x0'],round(h[k]['y']/48-.5)-b['y0'])for k in ['c1','c2'])
    for z,row in enumerate(g):
     for x,ch in enumerate(row):
      if (x,z)not in holes:
       color=0x66605a if ch=='v' else 0x716152
       items.append(box((x,F-.12,z),(x+1,F,z+1),color))
       for k in [.25,.5,.75]:items.append(box((x+k,F+.001,z),(x+k+.009,F+.004,z+1),0x453f39))
      if ch=='#':
       high=.18 if z==D-1 else .72 if x in [0,W-1] else 1.15
       same=lambda xx,zz:0<=zz<D and 0<=xx<W and g[zz][xx]=='#'
       vertical=x in [0,W-1] or ((same(x,z-1)or same(x,z+1))and not same(x-1,z)and not same(x+1,z))
       a,c=((x+.42,F,z),(x+.58,F+high,z+1))if vertical else((x,F,z+.42),(x+1,F+high,z+.58))
       items.append(box(a,c,0x73766f));items.append(box((a[0],F+high,a[2]),(c[0],F+high+.045,c[2]),0xaaa79b))
      elif ch=='N':items.append(box((x,F+.05,z+.42),(x+1,F+.18,z+.58),0xaaa79b))
      elif ch=='K'and(x,z)not in holes:items.append(box((x+.04,F,z+.08),(x+.96,F+.22,z+.14),0x4c5559))
    for f in data['furn']:
     if f.get('fl',0)!=1:continue
     for item in cached[(f['t'],f['w'],f['h'],f.get('r',0))]:items.append({**item,'x':item['x']+f['x']-b['x0'],'y':item.get('y',0)+F,'z':item['z']+f['y']-b['y0']})
    for l in data['stairs']:
     if l.get('tfl')!=1 or not (l.get('upper')or{}).get('well'):continue
     h=l['upper']['well'];dx,dz=h['d'];cx=h['c2']['x']/48-b['x0'];cz=h['c2']['y']/48-b['y0']
     for k in range(10):
      t=k/10*1.8;xx=cx-dx*t;zz=cz-dz*t;y=F-.12-k/10*1.4
      if dx:items.append(box((xx-.11,y-.13,zz-.43),(xx+.11,y,zz+.43),0x696963))
      else:items.append(box((xx-.43,y-.13,zz-.11),(xx+.43,y,zz+.11),0x696963))
     for sign in [-1,1]:
      xx=cx-dx*.5-dz*.47*sign;zz=cz-dz*.5+dx*.47*sign
      items.append(box((xx-.035,F+.05,zz-.035),(xx+.035,F+.48,zz+.035),0x5b6466))
     hero=l['upper']['down']['entry'];px=hero['x']/48-b['x0'];pz=hero['y']/48-b['y0']
    # Exposed slab and the lower-floor facade are the height cue, not a different tint.
    items.extend([box((0,F-.15,D-.01),(W,F,D+.08),0xa5a49a),box((W,F-.15,0),(W+.08,F,D+.08),0x7c8688)])
    py=F+.015
   else:
    items.append(box((0,H-.12,0),(W,H,D),0x777e7f))
    for x in range(W):
     for z in range(D):
      items.append(box((x+.02,H+.002,z+.02),(x+.98,H+.009,z+.98),0x7b8280 if(x+z)%3 else 0x6e7777))
    for a,c in [((0,H,0),(W,H+.25,.12)),((0,H,0),(.12,H+.25,D)),((W-.12,H,0),(W,H+.25,D)),((0,H,D-.12),(W,H+.16,D))]:items.append(box(a,c,0x969d99))
    _,old=city.bld_items(b);_,bare=city.bld_items({**b,'props':[]});plain={json.dumps(i,sort_keys=True)for i in bare}
    for item in old:
     if json.dumps(item,sort_keys=True)in plain:continue
     # Reuse the exact original rooftop props, including their real west-facing stair door.
     if 'box'in item:
      a,y,z,c,yy,zz=item['box'];items.append({**item,'box':[a-b['x0'],H+y-b['h'],z-b['y0']-b['h'],c-b['x0'],H+yy-b['h'],zz-b['y0']-b['h']]})
     elif 'cyl'in item:
      a,y,z,c,yy,zz=item['cyl'];items.append({**item,'cyl':[a-b['x0'],H+y-b['h'],z-b['y0']-b['h'],c-b['x0'],H+yy-b['h'],zz-b['y0']-b['h']]})
     else:items.append({**item,'x':item['x']-b['x0'],'y':H+item.get('y',0)-b['h'],'z':item['z']-b['y0']-b['h']})
    door=next(p for p in b['props']if p['t']=='sh')['door']
    if state=='roof':px=door[0]-b['x0']+.5;pz=door[1]-b['y0']+.5;py=H+.06
    else:px=b['front'][0].index('D')+.5;pz=D+1.45;py=.015
   # Contact shadow and the actual game heroine share a physical foot anchor.
   items.extend([box((px-.18,py-.008,pz-.10),(px+.18,py-.002,pz+.10),0x262b2d),{'sprite':data['hero'],'x':px,'y':py,'z':pz,'w':1.2,'h':1.2,'ground':46.8/64,'cast':False}])
   render={'box':[-3,-2,W+3,D+5],'ppu':74,'items':items,'ground':False,'cam':{'elev':52,'azimuth':-12,'fit':[-2,-1,W+2,D+4,H+1.3]},'night':True,'hemi':1.9,'sun':2.1,'lamps':[{'x':W*.35,'y':L+1.4,'z':D*.5,'c':0xffd4a1,'i':6,'d':8}]if state=='interior'else[]}
   url=await pg.evaluate('bake',render);(OUT/(state+'.png')).write_bytes(base64.b64decode(url.split(',')[1]));print(state,'rendered',len(items),'objects',flush=True)
  assert not errors,errors
  clean={k:v for k,v in data.items()if k!='hero'};(OUT/'building.json').write_text(json.dumps(clean,ensure_ascii=False,indent=2))
  await browser.close()

if __name__=='__main__':asyncio.run(main())
