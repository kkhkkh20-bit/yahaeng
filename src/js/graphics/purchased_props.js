// Owned Office Interior variants at one native pixel scale. This module dresses
// existing furniture/wall cells only; it creates no objects, colliders or goals.
const purchasedPropsArt=A.purchasedProps||null,purchasedPropsAtlas=new Image();
let purchasedPropsDirty=false;
purchasedPropsAtlas.onload=()=>{purchasedPropsDirty=true;};
if(purchasedPropsArt?.src)purchasedPropsAtlas.src=purchasedPropsArt.src;
function purchasedPropsReady(){return !window.__PURCHASED_PROPS_BASELINE__&&!!purchasedPropsArt&&purchasedPropsAtlas.complete&&purchasedPropsAtlas.naturalWidth>0;}
function purchasedPropFrame(name){return purchasedPropsArt?.frames[name]?.rect;}
function purchasedPropBlit(c,name,x,y,scale=1.5){
 const r=purchasedPropFrame(name);if(!r||!purchasedPropsReady())return false;
 c.imageSmoothingEnabled=false;c.drawImage(purchasedPropsAtlas,...r,Math.round(x),Math.round(y),r[2]*scale,r[3]*scale);return true;
}
function refreshPurchasedProps(){
 if(!purchasedPropsDirty||!S||!mapC)return;
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;purchasedPropsDirty=false;}finally{setLayer(layer);}
}
function purchasedPropCargoBounds(tx,ty){
 const key='cargoStable'+(((tx*7+ty*13)%3+3)%3),r=purchasedPropFrame(key);if(!r)return null;
 return{key,x:tx*TILE,y:ty*TILE-3,w:r[2]*1.5,h:r[3]*1.5,visibleHeight:purchasedPropsArt.frames[key].visibleHeight*1.5};
}
function drawPurchasedPropCargo(c,tx,ty){
 if(!purchasedPropsReady())return false;const b=purchasedPropCargoBounds(tx,ty);if(!b)return false;
 c.save();c.fillStyle='#08121a44';c.beginPath();c.ellipse(tc(tx)+2,(ty+1)*TILE-5,21,5,0,0,TAU);c.fill();purchasedPropBlit(c,b.key,b.x,b.y);c.restore();return true;
}
function purchasedPropFurnKey(f){
 if(!purchasedPropsReady()||!officeReady())return null;
 // Authored furniture has a specific narrative/composition role. Do not replace
 // those, the physical hiding cabinets, or the root-owned freight assembly.
 if(STAGE.officeArt?.furniture?.some(a=>a.x===f.x&&a.y===f.y&&(a.fl||0)===(f.fl||0)&&a.t===f.t))return null;
 const bi=bldAt(f.x,f.y);if(bi<0||BLD[bi]?.vacant)return null;
 const style=officeStyle(bi,f.fl||0),seed=((f.seed??(f.x*31+f.y*17+(f.fl||0)*7))>>>0),v=seed%3;
 if(f.t==='cab'&&f.h===1)return ['filesBlue','filesGold','filesRed'][v];
 if((f.t==='shelf'||f.t==='shelfS')&&f.h===1){
  if(f.skin==='freight'||style===OFFICE_STYLES.security)return null;
  return ['bookcaseBlue','bookcaseWood','bookcaseRed'][v];
 }
 if(f.t==='plant'&&f.w===1&&f.h===1)return seed%2?'plantLean':'plantWide';
 if(f.t==='board'&&f.h===1)return f.w>1&&seed%2?'noticeBoard':'graphBoard';
 // A printer may be explicitly assigned to an existing service counter. Never
 // put one on a food bar, loose floor, or a surface holding mission loot.
 if(f.t==='counter'&&f.w>=2&&f.h===1&&STAGE.purchasedProps?.counterPrinters?.some(a=>a.x===f.x&&a.y===f.y&&(a.fl||0)===(f.fl||0))){
  if((S.items||[]).some(a=>!a.got&&a.surface===f)||(S.props||[]).some(a=>!a.taken&&a.surface===f))return null;
  return 'serviceCounter';
 }
 return null;
}
function purchasedPropFurnBounds(f){
 const key=purchasedPropFurnKey(f);if(!key||key==='serviceCounter')return null;const r=purchasedPropFrame(key);if(!r)return null;
 const count=['cab','shelf','shelfS'].includes(f.t)?Math.max(1,Math.floor(f.w)):1,w=r[2]*1.5,h=r[3]*1.5;
 // All source pixels stay exactly 1.5x. Skip a variant that cannot fit instead
 // of shrinking or anisotropically stretching the artwork into a small cell.
 if(w>(count>1?TILE:f.w*TILE)||h>f.h*TILE+40)return null;
 return{key,count,x:f.x*TILE+(TILE-w)/2,y:(f.y+f.h)*TILE-h-3,w,h};
}
function drawPurchasedPropFurn(c,f,shadow=false){
 const key=purchasedPropFurnKey(f);if(!key)return false;
 if(key==='serviceCounter'){
  const b=officeFurnBounds(f);if(!b)return false;
  c.save();if(shadow){c.fillStyle='#09121a33';c.beginPath();c.ellipse((f.x+f.w/2)*TILE+2,(f.y+f.h)*TILE-5,f.w*TILE*.4,6,0,0,TAU);c.fill();}
  officeBlit(c,b.key,b.x,b.y,b.w,b.h);
  const r=purchasedPropFrame('printerService'),x=(f.x+f.w/2)*TILE-r[2]*.75,y=b.y+b.h*.42-r[3]*1.5;
  purchasedPropBlit(c,'printerService',x,y);c.restore();return true;
 }
 const b=purchasedPropFurnBounds(f);if(!b)return false;
 c.save();if(shadow){c.fillStyle='#09121a33';c.beginPath();c.ellipse((f.x+f.w/2)*TILE+2,(f.y+f.h)*TILE-5,f.w*TILE*.4,6,0,0,TAU);c.fill();}
 for(let i=0;i<b.count;i++)purchasedPropBlit(c,b.key,b.x+i*TILE,b.y);c.restore();return true;
}
function purchasedPropWallLayout(fl){
 if(!purchasedPropsReady()||!officeReady())return[];
 const old=officeDecorLayout(fl),out=[];
 for(let bi=0;bi<BLD.length;bi++){
  const b=BLD[bi];if(b.vacant)continue;
  // One correctly wall-mounted extinguisher per existing workplace floor.
  // Houses/estates retain their authored walls and belongings.
  const style=officeStyle(bi,fl);if([OFFICE_STYLES.residence,OFFICE_STYLES.estate].includes(style))continue;
  for(let tx=b.x0+1;tx<b.x1;tx++){
   const ty=b.y0,x=tc(tx)-7.5,y=ty*TILE+16,w=15,h=27;
   if(G[ty]?.[tx]!=='#'||['#','N','V'].includes(G[ty+1]?.[tx]||'V'))continue;
   if(old.some(a=>a.b===bi&&a.x<x+w+5&&a.x+a.w>x-5&&a.y<y+h&&a.y+a.h>y))continue;
   if((S.lamps||[]).some(l=>flOf(l)===fl&&[l.fixture,l.control].some(a=>a&&Math.abs(a.x-tc(tx))<25&&Math.abs(a.y-(ty*TILE+24))<55)))continue;
   if((S.ladders||[]).some(l=>l.tx===tx&&Math.abs(l.ty-ty)<=2))continue;
   if(FURN.some(f=>flOf(f)===fl&&f.y<=ty+1&&f.x<=tx&&f.x+f.w>tx))continue;
   out.push({key:'extinguisher',x,y,w,h,bi,fl,tx,ty});break;
  }
 }
 return out;
}
function drawPurchasedPropWallDetails(c,fl,x0,y0,x1,y1){
 if(!purchasedPropsReady())return false;
 for(const d of purchasedPropWallLayout(fl)){const b=BLD[d.bi];if(b.x1<x0||b.x0>x1||b.y1<y0||b.y0>y1)continue;purchasedPropBlit(c,d.key,d.x,d.y);}
 return true;
}
