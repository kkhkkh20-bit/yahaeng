"""A one-building visual trial must preserve floor geometry, interaction anchors and bitmap budget."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch();pg=await browser.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!window.__game')
  result=await pg.evaluate('''()=>{
   const G=window.__game,check=(ok,msg)=>{if(!ok)throw Error(msg)},sig=()=>JSON.stringify({grids:G.GF.map(g=>g&&g.map(r=>r.join(''))),ladders:G.LADDERS.map(l=>[l.tx,l.ty,l.kind,l.x,l.y,l.rx,l.ry,l.bfl,l.tfl,l.tz,l.roofDoor]),doors:G.S.doors.map(d=>[d.tx,d.ty,d.fl,d.x,d.y])});
   for(const id of ['m1','m2','m3','m4','m5','m6','city']){G.start(G.STAGES.findIndex(s=>s.id===id));check(G.BLD.filter((b,i)=>G.hasHeightCues(i)).length===(id==='m4'?1:0),'trial leaked outside chosen building '+id)}
   G.start(G.STAGES.findIndex(s=>s.id==='m4'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player,b=G.BLD[4],snapshot=sig(),create=document.createElement;let canvases=0;
   const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
   const settings=G.STAGE.heightCueBuildings;G.STAGE.heightCueBuildings=[];G.floorCanvas(4,1);S.floorC={};
   document.createElement=function(tag,...rest){if(tag==='canvas')canvases++;return create.call(this,tag,...rest)};
   let plain,trial,n0,n1;
   try{plain=G.floorCanvas(4,1);n0=canvases;S.floorC={};canvases=0;G.STAGE.heightCueBuildings=settings;trial=G.floorCanvas(4,1);n1=canvases;check(G.floorCanvas(4,1)===trial,'floor graphic does not reuse its cache');check(canvases===n1,'warm floor allocates new bitmap')}
   finally{document.createElement=create;G.STAGE.heightCueBuildings=settings}
   check(n0===n1&&n1===1,'height cues allocated another bitmap: '+n0+' -> '+n1);check(plain.width===trial.width&&plain.height===trial.height,'floor footprint changed');
   const a=pixels(plain),c=pixels(trial),w=plain.width;check(!same(a,c),'no visible trial on chosen floor');let walk=0,windows=0;
   G.setLayer(1);
   for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++){
    const window=G.tileG(x,y)==='N';if(!window&&G.solidAt(x,y))continue;
    const pad=window?0:14,size=window?48:20;
    for(let dy=pad;dy<pad+size;dy++)for(let dx=pad;dx<pad+size;dx++)for(let ch=0;ch<4;ch++){
     const i=((y-b.y0)*48+dy)*w*4+((x-b.x0)*48+dx)*4+ch;check(a[i]===c[i],'cue covers '+(window?'window':'walkable floor')+' '+x+','+y);
    }if(window)windows++;else walk++;
   }
   G.STAGE.heightCueBuildings=[];S.floorC={};const other=pixels(G.floorCanvas(0,1));G.STAGE.heightCueBuildings=settings;S.floorC={};check(same(other,pixels(G.floorCanvas(0,1))),'another building changed');
   for(const fl of [1,2]){
    const l=G.LADDERS.find(l=>l.kind==='fstair'&&l.tfl===fl&&G.bldAt(l.tx,l.ty)===4),e=G.stairFloor(l.tx,l.ty,fl).down.entry;Object.assign(P,{x:e.x,y:e.y,fl,z:0});G.setLayer(fl);
    const before=G.envChoices().map(a=>[a.k,a.at&&a.at.x,a.at&&a.at.y]);G.benchDraw(2);check(JSON.stringify(before)===JSON.stringify(G.envChoices().map(a=>[a.k,a.at&&a.at.x,a.at&&a.at.y])),'drawing changed interaction choice on '+fl);
   }
   const l=G.LADDERS.find(l=>l.kind==='stair'&&G.bldAt(l.tx,l.ty)===4);Object.assign(P,{x:l.rx,y:l.ry,fl:0,z:l.tz});G.setLayer(0);check(G.nearClimbDown()===l,'roof entry not usable');
   const at=l.roofDoor;G.benchDraw(2);check(G.nearClimbDown()===l&&l.roofDoor===at,'roof coping changed entry anchor');check(!G.envChoices().some(a=>a.k==='down'&&a.l===l),'rooftop doorway should use walking entry');
   check(sig()===snapshot,'visual pass modified collision or traversal geometry');
   const ctx=G.ctx;ctx.save();ctx.globalAlpha=.4;ctx.globalCompositeOperation='xor';ctx.setTransform(1.2,0,0,1.2,5,7);
   const state=()=>JSON.stringify([ctx.globalAlpha,ctx.globalCompositeOperation,ctx.getTransform().toString()]),was=state();G.drawFloorThickness(b,1);G.drawRoofCoping(b);check(state()===was,'cue leaks canvas state');ctx.restore();
   return {pilot:'m4 building 4',unchangedWalkableTiles:walk,unchangedWindows:windows,extraCanvases:n1-n0,geometry:'unchanged'};
  }''')
  assert not errors,errors;print('PASS',result);await browser.close()
asyncio.run(main())
