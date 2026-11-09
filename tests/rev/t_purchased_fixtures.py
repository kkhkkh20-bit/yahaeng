"""Owned-pixel integration and unchanged physical worlds on all 27 existing stages.
Comparison screenshots position actors and freeze RAF; they are visual fixtures.
"""
import asyncio,base64,hashlib,json,os
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/purchased-v246'
START="""([id,base])=>{window.__PURCHASED_BASELINE__=base;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;}"""
WORLD="""()=>{const G=__game,S=G.S;return{grid:G.GF.map(g=>g?.map(r=>r.join('')).join('\\n')),furniture:G.FURN.map(f=>[f.x,f.y,f.w,f.h,f.t,f.fl,f.r]),guards:S.guards.map(g=>[g.tag,g.x,g.y,g.fl,g.z,g.state]),lights:S.lamps.map(l=>[l.x,l.y,l.r,l.fl,l.off,l.broken,l.circuit,l.control]),stairs:S.ladders.map(l=>[l.kind,l.tx,l.ty,l.bfl,l.tfl,l.rx,l.ry]),items:S.items.map(i=>[i.x,i.y,i.fl]),hides:S.hides.map(h=>[h.type,h.x,h.y,h.fl,h.cap]),exits:S.exits.map(e=>[e.x,e.y,e.r])}}"""
async def main():
 O.mkdir(exist_ok=True);meta=json.loads((R/'src/art/purchased-details/fixtures.json').read_text());atlas=Image.open(R/'src/art/purchased-details/fixtures.webp').convert('RGBA')
 for n,f in meta['frames'].items():
  x,y,w,h=f['rect'];assert w>0 and h>0 and atlas.crop((x,y,x+w,y+h)).getbbox(),n
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 850},is_mobile=mobile,has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.purchasedReady()&&__game.officeReady()');await q.evaluate('document.fonts.ready')
   rows=[]
   for id in await q.evaluate('__game.STAGES.map(s=>s.id)'):
    await q.evaluate(START,[id,True]);before=await q.evaluate(WORLD)
    await q.evaluate(START,[id,False]);after=await q.evaluate(WORLD);assert before==after,('art changed world',id,[k for k in before if before[k]!=after[k]])
    row=await q.evaluate('''()=>{const G=__game,S=G.S;if(!G.officeReady())throw Error('stage kept old interior');const render=CanvasRenderingContext2D.prototype.drawImage;let calls=0;CanvasRenderingContext2D.prototype.drawImage=function(...a){if(a[0]===G.purchasedAtlas)calls++;return render.apply(this,a)};try{for(let fl=0;fl<G.GF.length;fl++){G.setLayer(fl);G.renderMap();}}finally{CanvasRenderingContext2D.prototype.drawImage=render;G.setLayer(0)}return{id:G.STAGE.id,floors:G.GF.length,atlasCalls:calls,stairs:S.ladders.filter(l=>['fstair','stair'].includes(l.kind)).length,parcels:G.FURN.filter(f=>f.t==='boxes').length,cabinets:S.hides.filter(h=>h.furn&&h.type!=='bed').length};}''')
    rows.append(row)
   assert sum(r['atlasCalls']for r in rows)>100
   await q.evaluate(START,['tB',False])
   # Actual projected fixtures use the paid atlas, have distinct open/closed
   # images and preserve the original actor/contact aperture geometry.
   state=await q.evaluate('''()=>{const G=__game,c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),h=G.S.hides.find(h=>h.furn&&h.type==='locker');const orig={...h};Object.assign(h,{tx:2,ty:2,x:120,y:120});G.drawCabinet(h,'all',x,0);const closed=c.toDataURL();x.clearRect(0,0,256,256);G.drawCabinet(h,'all',x,1);const cabinet=closed!==c.toDataURL()&&G.cabinetAperture(h,1).w>20;Object.assign(h,orig);const v={x:120,y:120,tx:2,ty:2,roof:true};x.clearRect(0,0,256,256);G.drawPurchasedVent(v,'all',x,0);const a=c.toDataURL();x.clearRect(0,0,256,256);G.drawPurchasedVent(v,'all',x,1);return{cabinet,vent:a!==c.toDataURL()};}''')
   assert state['cabinet']and state['vent'],state
   for label,bi,fl in [('stairs',0,1),('freight',0,0)]:
    await q.evaluate(START,['tB',False]);await q.evaluate('''([bi,fl])=>{const G=__game,S=G.S,P=S.player;S.tutI=6;G.setLayer(fl);const l=S.ladders.find(l=>l.kind==='fstair'&&(l.bfl||0)===0),d=fl?G.downPt(l):{x:504,y:504};Object.assign(P,{x:fl?d.x:504,y:fl?d.y+54:504,fl,z:0});S.guards=[];G.setZoom(1.3);G.moveCamera(2);G.updateHUD(true);G.benchDraw(10);}''',[bi,fl]);await q.wait_for_timeout(250);await q.evaluate('__game.benchDraw(4)');await q.screenshot(path=str(O/(label+('-touch'if mobile else'-pc')+'.png')))
   assert not errors,errors;(O/('touch.json'if mobile else'pc.json')).write_text(json.dumps({'maps':rows,'physicalWorldsUnchanged':True,'animatedFixtures':state,'errors':errors},indent=2));print('PASS purchased fixtures',mobile,len(rows),'maps',sum(r['atlasCalls']for r in rows),'paid draw calls',state,flush=True);await q.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
