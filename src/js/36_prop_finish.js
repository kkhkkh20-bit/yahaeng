// Shared, grounded 2D furniture. One atlas avoids a request and GPU texture per prop.
const propArt=window.__PROP_ART__||{frames:{}},propAtlas=new Image();
let propArtDirty=false;
propAtlas.onload=()=>{propArtDirty=true;if(S)S.floorC={};};
if(propArt.src)propAtlas.src=propArt.src;
const propClothKinds=new Set(['bed','bedD','cbed','sofa','sofaV','rug','chair','chairD']);
function propArtFrame(it){
 const r=((it.r||0)%4+4)%4,v=propClothKinds.has(it.t)?Math.abs(Math.floor(it.seed||0))%3:0;
 return propArt.frames[it.t+'-'+r+'-'+v]||null;
}
function propSurfacePoint(o){
 const f=o?.surface,a=f&&propArtFrame(f);if(a?.surfaceHeight==null)return null;
 const u=o.surfaceU??.5,x=f.t==='desk'||f.t==='desk2'?f.x*TILE+24:(f.x+f.w*u)*TILE;
 return{x,y:(f.y+f.h*.5-a.surfaceHeight*f.h/a.footprint[1])*TILE};
}
function drawPropFurn(x,it,shadow=false){
 const a=propArtFrame(it);if(!a||!propAtlas.complete||!propAtlas.naturalWidth)return false;
 const px=it.x*TILE,py=it.y*TILE,w=it.w*TILE,h=it.h*TILE,sx=it.w/a.footprint[0],sy=it.h/a.footprint[1];
 x.save();x.imageSmoothingEnabled=false;
 if(shadow&&!FURN_FLAT.has(it.t)){
  x.fillStyle='rgba(4,9,14,.23)';x.beginPath();x.ellipse(px+w/2+2,py+h*.63+2,w*.43,h*.29,0,0,TAU);x.fill();
 }
 x.drawImage(propAtlas,a.sx,a.sy,a.w,a.h,px+a.ox*sx,py+a.oy*sy,a.w*sx,a.h*sy);
 if(it.t==='shelf'&&BLD[bldAt(it.x,it.y)]?.name==='약국')drawPharmacyStock(x,it);
 x.restore();return true;
}
function refreshPropArt(){
 if(!propArtDirty||!S||!mapC)return;
 // An atlas arriving after departure replaces both floor caches in one repaint.
 // No world update, randomness, collision or lighting computation is involved.
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;propArtDirty=false;}finally{setLayer(layer);}
}
function switchArtNormal(l){
 const p=l.control;
 if(Number.isFinite(p?.nx)&&Number.isFinite(p?.ny)&&(p.nx||p.ny))return[-p.nx,-p.ny];
 const grid=GF[flOf(l)]||G0,tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);let best=null;
 for(let y=ty-1;y<=ty+1;y++)for(let x=tx-1;x<=tx+1;x++){
  if(!'#NV'.includes(grid[y]?.[x]||' '))continue;
  const dx=p.x-tc(x),dy=p.y-tc(y),d=Math.hypot(dx,dy);
  if(!best||d<best.d)best={d,n:Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)]};
 }
 return best?.n.some(Boolean)?best.n:[l.fixture?.nx||0,l.fixture?.ny||1];
}
