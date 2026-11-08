"""Every authored map uses the new exterior kit, with opaque roofs and visible cover.
Controlled render fixtures; native walkthroughs are separate.
"""
import asyncio,json,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
GEOMETRY_JS='''()=>{const G=__game,S=G.S;G.setLayer(0);return{grid:G.GF.map(g=>g?.map(r=>r.join('')).join('\\n')),buildings:G.BLD.map(b=>[b.x0,b.y0,b.x1,b.y1,b.h,b.fh,b.kitProps]),roofBlocks:Array.from({length:G.MW*G.MH},(_,i)=>G.robAt(i%G.MW,Math.floor(i/G.MW))?1:0).join(''),stairs:S.ladders.map(l=>[l.kind,l.tx,l.ty,l.bx,l.by,l.bfl,l.tz,l.rx,l.ry,l.roofDoor]),lights:S.lamps.map(l=>[l.x,l.y,l.fl,l.z,l.r,l.off,l.broken,l.cut]),guards:S.guards.map(g=>[g.id,g.tag,g.x,g.y,g.fl,g.z])}}'''
START_JS='''id=>{let n=42;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.setLayer(0);}'''
async def main():
 out=ROOT/'build/world-v221';out.mkdir(exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':900});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((ROOT/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.freeCityReady()')
  await q.evaluate('''()=>{window.__cityDraws=0;const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(im?.src&&im.src===__ASSETS__.dotonbori.src)__cityDraws++;return draw.call(this,im,...args)}}''')
  ids=await q.evaluate('__game.STAGES.map(s=>s.id)')
  for id in ids:
   await q.evaluate(START_JS,id)
   row=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(G.STAGE.id+': '+m)},S=G.S,types={},c=document.createElement('canvas');c.width=c.height=48;const ctx=c.getContext('2d');
    ok(G.STAGE.freeCityExteriors,'exterior pilot restriction remains');
    let terrain=0,plants=0,opaque=0,solidProps=0;
    for(let y=0;y<G.MH;y++)for(let x=0;x<G.MW;x++){
     const ch=G.G0[y][x];if('BT'.includes(ch)){ok(G.drawCityPlant(ch,x,y,false),'old vegetation still renders');plants++;}
     if(G.bldAt(x,y)>=0)continue;const floor=G.propGround(ch,x,y);
     if(!'.=,gdBT'.includes(floor))continue;
     ok(G.freeCityGround(ctx,floor,x,y),'old outdoor ground remains at '+x+','+y+' '+floor);types[floor]=(types[floor]||0)+1;terrain++;
    }
    for(const b of G.BLD){if(b.vacant)continue;ok(G.freeCityBuilding(b),'old building fallback');const rc=b.roofC,px=rc.getContext('2d').getImageData(0,0,rc.width,rc.rh).data;for(let k=3;k<px.length;k+=4)ok(px[k]===255,'roof exposes interior');opaque++;
     G.drawCityRoofProps(b);
     for(const p of b.kitProps||[])if(p.t==='sh'||p.t==='tank'){
      ok(b.cityPropsC,'roof collider has no artwork');const cells=p.t==='sh'?p.cells:[[p.x,p.y]],q=b.cityPropsC.getContext('2d');
      for(const [x,y]of cells){const px=(x-b.x0)*48+24,py=(y-b.y0)*48+24;ok(px<b.cityPropsC.width&&py<b.cityPropsC.height&&q.getImageData(px,py,1,1).data[3]>0,'invisible rooftop obstacle '+x+','+y);}solidProps++;
     }
    }
    G.moveCamera(1);G.benchDraw(2);ok(__cityDraws>0,'selected city atlas was never painted');
    return{id:G.STAGE.id,name:G.STAGE.name,terrain,types,plants,opaque,solidProps,styles:G.BLD.filter(b=>!b.vacant).map(G.cityBuildingStyle),atlasDraws:__cityDraws};}''')
   geometry=await q.evaluate(GEOMETRY_JS);row['geometrySha256']=hashlib.sha256(json.dumps(geometry,sort_keys=True,separators=(',',':')).encode()).hexdigest()
   if not await q.evaluate('__game.tactical'):await q.evaluate('__game.toggleTactical()')
   await q.evaluate('__game.moveCamera(1);__game.moveCamera(1);__game.updateHUD(true);__game.benchDraw(2)');await q.screenshot(path=str(out/(id+'.png')))
   rows.append(row);print('PASS world art',id,row['terrain'],row['opaque'],row['plants'],flush=True)
  assert not errors,errors
  # The bush silhouette keeps its original hiding/leaf response, not a solid tree.
  await q.evaluate(START_JS,'tB');check=await q.evaluate('''()=>{const G=__game,S=G.S;let at;for(let y=0;y<G.MH;y++)for(let x=0;x<G.MW;x++)if(G.G0[y][x]==='B')at={x:x*48+24,y:y*48+24};Object.assign(S.player,{...at,mode:'sneak'});G.input.sneakToggle=true;G.updatePlayer(.016);return{hidden:S.player.hidden,leaf:!!S.bushShake}}''');assert check['hidden']and check['leaf'],check
  await b.close()
 (out/'coverage.json').write_text(json.dumps({'maps':rows,'cover':check,'errors':errors},ensure_ascii=False,indent=2));print('PASS all-map exterior coverage',len(rows),flush=True)
if __name__=='__main__':asyncio.run(main())
