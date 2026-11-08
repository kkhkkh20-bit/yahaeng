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
 const paid=officeSurfacePoint(o);if(paid)return paid;
 const f=o?.surface,a=f&&propArtFrame(f);if(a?.surfaceHeight==null)return null;
 const u=o.surfaceU??.5,x=f.t==='desk'||f.t==='desk2'?f.x*TILE+24:(f.x+f.w*u)*TILE;
 return{x,y:(f.y+f.h*.5-a.surfaceHeight*f.h/a.footprint[1])*TILE};
}
function drawPropFurn(x,it,shadow=false){
 if(drawOfficeFurn(x,it,shadow))return true;
 if(it.t==='boxes'&&STAGE.freeCityExteriors&&freeCityArt===A.dotonbori&&freeCityReady()){for(let y=0;y<it.h;y++)for(let k=0;k<it.w;k++)drawCityCargo(x,it.x+k,it.y+y);return true;}
 if(it.t==='shelf'&&it.skin==='freight')return drawFreightShelf(x,it,shadow);
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
// Original pixel parcel rack: the shelf footprint and cover stay unchanged.
// Storage no longer borrows the shop's colourful book/grocery display.
function drawFreightShelf(c,f,shadow){
 const px=f.x*TILE,py=f.y*TILE,w=f.w*TILE,h=f.h*TILE;
 c.save();c.translate(px,py);c.imageSmoothingEnabled=false;
 if(shadow){c.fillStyle='rgba(4,9,14,.23)';c.fillRect(5,h-5,w-5,10);}
 c.fillStyle='#26343a';c.fillRect(1,-17,w-2,h+16);c.fillStyle='#17262c';c.fillRect(5,-13,w-10,h+8);
 const cols=Math.max(1,Math.round(f.w)),cw=(w-12)/cols;
 for(let row=0;row<2;row++)for(let col=0;col<cols;col++){
  const bx=Math.round(7+col*cw),by=-11+row*27,bw=Math.floor(cw-5),bh=21;
  c.fillStyle=(col+row)%2?'#876c50':'#a18460';c.fillRect(bx,by,bw,bh);
  c.fillStyle='#b49870';c.fillRect(bx,by,bw,3);c.fillStyle='#604e3c';c.fillRect(bx+bw-3,by+3,3,bh-3);
  c.fillStyle='#c4b48b';c.fillRect(bx+Math.floor(bw*.48),by+1,4,bh-2);
  c.fillStyle='#d1c7ac';c.fillRect(bx+4,by+9,8,5);c.fillStyle='#736955';c.fillRect(bx+5,by+11,5,1);
 }
 for(const y of [-17,13,h-6]){c.fillStyle='#536064';c.fillRect(0,y,w,4);c.fillStyle='#78817d';c.fillRect(0,y,w,1);}
 for(const bx of [0,w-4]){c.fillStyle='#536064';c.fillRect(bx,-17,4,h+17);c.fillStyle='#8a938b';c.fillRect(bx,-13,2,2);c.fillRect(bx,17,2,2);}
 c.restore();return true;
}
function refreshPropArt(){
 if(!propArtDirty||!S||!mapC)return;
 // An atlas arriving after departure replaces both floor caches in one repaint.
 // No world update, randomness, collision or lighting computation is involved.
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;propArtDirty=false;}finally{setLayer(layer);}
}
// Quiet, authored environmental art baked with each floor. These marks never
// act as UI, colliders or additional interaction targets.
function drawEpisodeDressing(c,fl,x0,y0,x1,y1){
 for(const d of STAGE.dressing||[]){
  if((d.fl||0)!==fl||d.x+d.w<x0||d.x>x1+1||d.y+d.h<y0||d.y>y1+1)continue;
  const px=Math.round(d.x*TILE),py=Math.round(d.y*TILE),w=Math.round(d.w*TILE),h=Math.round(d.h*TILE);
  c.save();c.imageSmoothingEnabled=false;
  if(d.kind==='bay'){
   c.strokeStyle='rgba(190,165,105,.36)';c.lineWidth=2;c.strokeRect(px,py,w,h);
   for(const [a,b]of [[px,py],[px+w-14,py],[px,py+h-4],[px+w-14,py+h-4]]){c.fillStyle='rgba(190,165,105,.48)';c.fillRect(a,b,14,4);}
   c.fillStyle='rgba(210,197,157,.32)';c.font=uiFont(14);c.textAlign='center';c.fillText(d.text||'',px+w/2,py+h-9);
  }else if(d.kind==='board'){
   if(officeReady()){officeBlit(c,'board',px,py,w,h);c.restore();continue;}
   c.fillStyle='#111b23';c.fillRect(px+2,py+3,w,h);c.fillStyle='#59656a';c.fillRect(px,py,w,h);c.fillStyle='#23323a';c.fillRect(px+3,py+3,w-6,h-6);
   c.fillStyle='#bcbaad';c.font=uiFont(10);c.textAlign='left';c.fillText(d.text||'배차 현황',px+7,py+13);
   for(let r=0;r<2;r++)for(let k=0;k<5;k++){c.fillStyle=k===0?'#ad8e61':'#738382';c.fillRect(px+8+k*(w-16)/5,py+19+r*7,(w-26)/5,3);}
   c.fillStyle='#87908a';c.fillRect(px+2,py+2,2,2);c.fillRect(px+w-4,py+2,2,2);
  }
  c.restore();
 }
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
