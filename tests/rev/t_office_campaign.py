"""Purchased interior coverage on every public episode; visual-only world invariants.
The scene inspections below are explicit fixtures, not native completion claims.
"""
import asyncio,hashlib,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FOCUS={'tB':[1,1],'p0':[0,1],'e2':[1,2],'m2':[1,0],'m4':[3,1],'m6':[0,0],'m7':[1,1],'m5':[0,1],'n1':[0,1]}
START="""id=>{let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;}"""
WORLD="""()=>{const G=__game,S=G.S;return{grid:G.GF.map(g=>g?.map(r=>r.join('')).join('\\n')),furniture:G.FURN.map(f=>[f.x,f.y,f.w,f.h,f.t,f.fl,f.r]),guards:S.guards.map(g=>[g.tag,g.x,g.y,g.fl,g.z,g.state]),lights:S.lamps.map(l=>[l.x,l.y,l.r,l.fl,l.off,l.broken,l.circuit,l.control]),stairs:S.ladders.map(l=>[l.kind,l.tx,l.ty,l.bfl,l.tfl,l.rx,l.ry]),items:S.items.map(i=>[i.x,i.y,i.fl]),hides:S.hides.map(h=>[h.type,h.x,h.y,h.fl,h.cap]),exits:S.exits.map(e=>[e.x,e.y,e.r])}}"""
async def main():
 out=ROOT/'build/office-v226';out.mkdir(exist_ok=True);rows=[]
 meta=json.loads((ROOT/'src/art/office/interiors.json').read_text());atlas=Image.open(ROOT/'src/art/office/interiors.webp').convert('RGBA')
 assert meta['sourceSha256']=='cb793dd0023f6450d85474988a3d058c30d7a9b06d6dc872244885e07126324c'
 for name,f in meta['frames'].items():
  x,y,w,h=f['rect'];assert w>0 and h>0 and atlas.crop((x,y,x+w,y+h)).getbbox(),name
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((ROOT/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  route=await q.evaluate('__game.LEARNING_ROUTE')
  for id in route:
   await q.evaluate('window.__OFFICE_ART_BASELINE__=true');await q.evaluate(START,id);baseline=await q.evaluate(WORLD)
   await q.evaluate('window.__OFFICE_ART_BASELINE__=false');await q.evaluate(START,id);await q.wait_for_function('__game.officeReady()');world=await q.evaluate(WORLD)
   assert world==baseline,('art changed physical world',id,[k for k in world if world[k]!=baseline[k]])
   row=await q.evaluate("""()=>{const G=__game,covered=G.FURN.filter(f=>G.officeFurnKey(f)),styles=[];for(let bi=0;bi<G.BLD.length;bi++)for(let fl=0;fl<G.BLD[bi].h;fl++)styles.push(G.officeStyle(bi,fl).floor);const bounds=covered.map(f=>({f,b:G.officeFurnBounds(f)}));for(const{f,b}of bounds){if(!b||!Number.isFinite(b.x+b.y+b.w+b.h)||b.w>f.w*48||b.h>f.h*48+30)throw Error('invalid prop bounds '+f.t);}for(const i of G.S.items.filter(i=>i.surface)){const p=G.surfacePoint(i),f=i.surface;if(p.x<f.x*48||p.x>(f.x+f.w)*48||p.y>(f.y+f.h)*48)throw Error('loot floats off its furniture');}return{id:G.STAGE.id,name:G.STAGE.name,covered:covered.length,furniture:G.FURN.length,styles:[...new Set(styles)],floors:G.GF.length};}""")
   assert row['covered']>0 and row['styles'],row
   # Wall compositions must be entirely on solid walls, preserve source aspect,
   # avoid each other and leave the adjacent doorway / stairwell unobscured.
   row['wallCompositions']=await q.evaluate('''()=>{const G=__game;let count=0;for(let fl=0;fl<G.GF.length;fl++){G.setLayer(fl);const ds=G.officeDecorLayout(fl);for(const d of ds){const b=G.BLD[d.b],r=G.officeMeta.frames[d.art].rect;if(Math.abs(d.w/d.h-r[2]/r[3])>.001)throw Error('distorted wall object');for(let x=Math.floor(d.x/48);x<=Math.floor((d.x+d.w-1)/48);x++)if(G.tileCh(x,b.y0)!=='#')throw Error('decor covers entrance');if(ds.some(a=>a!==d&&a.b===d.b&&a.x<d.x+d.w&&a.x+a.w>d.x))throw Error('overlapping wall decor');count++;}}G.setLayer(0);return count;}''')
   assert row['wallCompositions']>=3,row
   world_json=json.dumps(world,sort_keys=True,ensure_ascii=False).encode();row['physicalSha256']=hashlib.sha256(world_json).hexdigest();row['physicsUnchanged']=True
   await q.evaluate("""([bi,fl])=>{const G=__game;G.setLayer(fl);const b=G.BLD[bi],cx=(b.x0+b.x1+1)*24,cy=(b.y0+b.y1+1)*24,cells=[];for(let y=b.y0+1;y<b.y1;y++)for(let x=b.x0+1;x<b.x1;x++)if(!G.solidFor(0)(x,y))cells.push({x:x*48+24,y:y*48+24});cells.sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));Object.assign(G.S.player,{...cells[0],fl,z:0});G.setZoom(1);G.moveCamera(2);G.updateHUD(true);G.benchDraw(3);}""",FOCUS[id])
   await q.screenshot(path=str(out/(id+'.png')));rows.append(row)
  # A real circuit still toggles every fixture, with no electrical skill needed.
  await q.evaluate(START,'tB');light=await q.evaluate("""()=>{const G=__game,S=G.S,P=S.player,l=S.lamps.find(l=>!l.outdoor&&l.control),at=l.control;G.setLayer(l.fl||0);Object.assign(P,{x:at.tx*48+24,y:at.ty*48+24,fl:l.fl||0,z:0});S.guards=[];const group=S.lamps.filter(a=>a.circuit===l.circuit),before=group.map(a=>a.off);G.actPrimary({k:'lamp',l,at,viaZ:true});G.updateObjectAction(P,.4);S.t+=1;return{trained:G.skillOn('electric'),count:group.length,off:group.every(a=>a.off),before};}""")
  assert not light['trained'] and light['count'] and light['off'],light
  # Existing cabinet geometry continues to animate rather than becoming a static decal.
  cabinet=await q.evaluate("""()=>{const G=__game,h=G.S.hides.find(h=>h.furn&&h.type==='locker');if(!h)throw Error('missing physical cabinet');const c=document.createElement('canvas');c.width=G.MW*48;c.height=G.MH*48;const x=c.getContext('2d');G.drawCabinet(h,'all',x,0);const closed=c.toDataURL();x.clearRect(0,0,c.width,c.height);G.drawCabinet(h,'all',x,1);return{changes:c.toDataURL()!==closed,aperture:G.cabinetAperture(h,1).w};}""")
  assert cabinet['changes'] and cabinet['aperture']>20,cabinet
  assert not errors,errors;await b.close()
 result={'episodes':rows,'atlasFrames':len(meta['frames']),'switch':light,'cabinet':cabinet,'errors':errors}
 (out/'coverage.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS paid office campaign',len(rows),'episodes; unchanged physical worlds; switches/cabinets',flush=True)
if __name__=='__main__':asyncio.run(main())
