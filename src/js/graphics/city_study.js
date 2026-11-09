// Paid, original pixel details. This module only dresses the optional playable study.
const studyArt=A.cityStudy,studyAtlas=new Image();
if(studyArt)studyAtlas.src=studyArt.src;
function studyReady(){return !!studyArt&&studyAtlas.complete&&studyAtlas.naturalWidth>0;}
function studyDraw(c,name,x,y,w,h){
 const f=studyArt?.frames[name]?.rect;if(!f||!studyReady())return false;
 c.drawImage(studyAtlas,...f,Math.round(x),Math.round(y),w??f[2]*2,h??f[3]*2);return true;
}
function studyRepeat(c,name,x,y,w,h,scale=2){
 const f=studyArt?.frames[name]?.rect;if(!f||!studyReady())return;
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
 for(let yy=y;yy<y+h;yy+=f[3]*scale)for(let xx=x;xx<x+w;xx+=f[2]*scale)studyDraw(c,name,xx,yy,f[2]*scale,f[3]*scale);
 c.restore();
}
function drawStudyBridge(p,x,y,w,h){
 if(!studyReady()||!p.ew)return false;
 ctx.save();ctx.imageSmoothingEnabled=false;
 // Same physical PLANKS bounds and roof level. Cars continue underneath.
 ctx.fillStyle='rgba(3,8,18,.38)';ctx.fillRect(x+10,y+22,w,h);
 studyRepeat(ctx,'tileFloor',x,y,w,h,1.5);
 studyRepeat(ctx,'rail',x,y-12,w,24,1.5);
 studyRepeat(ctx,'rail',x,y+h-16,w,24,1.5);
 ctx.restore();return true;
}
function drawStudyRoof(b){
 if(!studyReady())return;
 // Antennae are attached to the existing solid stair house, never a new
 // obstacle on an otherwise empty route. Small mechanical props use kit cells.
 for(const p of b.kitProps||[]){
  if(p.t==='sh'){
   const x=Math.min(...p.cells.map(c=>c[0]))*TILE,y=Math.min(...p.cells.map(c=>c[1]))*TILE;
   studyDraw(ctx,'antenna',x+5,y-55,32,64);
  }
 }
}
function studyFacadeDetails(c,b,x,y,w,h){
 if(!studyReady())return;
 const bi=BLD.indexOf(b),upper=S.fwindows||[],all=S.windows.concat(upper,S.doors);
 const opening=(tx,fl)=>all.some(a=>(flOf(a)===fl)&&a.ty===b.y1&&Math.abs(a.tx-tx)<1);
 // Source cornices sit between actual storeys; never over an aperture.
 for(let fl=1;fl<b.fh;fl++){
  const yy=(b.y1-fl+1)*TILE;
  const f=studyArt.frames.shopCornice.rect;
  c.save();c.beginPath();c.rect(x,yy-5,w,9);c.clip();
  for(let xx=x;xx<x+w;xx+=144)c.drawImage(studyAtlas,f[0],f[1]+22,f[2],6,xx,yy-5,144,9);
  c.restore();
 }
 // Keep wall details at source aspect and clear of every functional window.
 for(let fl=0;fl<b.fh;fl++)for(let tx=b.x0+1;tx<b.x1-1;tx++){
  if(opening(tx,fl)||opening(tx+1,fl))continue;
  const yy=(b.y1-fl)*TILE;
  if((tx+fl+bi)%5===0)studyDraw(c,'aircon',tx*TILE+7,yy+12,32,32);
 }
 const sx=x+TILE,sy=y+h-TILE;
 studyDraw(c,['cafeSign','foodSign','gallerySign','gateSign'][bi%4],sx,sy,bi%4>=2?96:48,48);
 // Original ivy is fixed to masonry; it cannot be mistaken for ground cover.
 if(bi%3===1)studyDraw(c,'ivy',x+w-45,y,48,96);
}

function studyWall(c,b,x,y,w,h){
 const style=cityBuildingStyle(b),tile={green:'wallGreen',brick:'wallTan',office:'wallBlue',stone:'wallSlate'}[style]||'wallSlate';
 studyRepeat(c,tile,x,y,w,h,2);
 const pier=freeCityArt?.frames.masonryPier?.rect;
 if(pier)for(const px of [x,x+w-8])c.drawImage(freeCityAtlas,...pier,px,y,8,h);
 return true;
}
function drawStudyCar(v){
 if(!studyReady())return false;
 const name='car'+(v.c%3);
 ctx.save();ctx.rotate(Math.PI);ctx.imageSmoothingEnabled=false;
 // A licensed pixel car replaces the rounded procedural body. Keep the same
 // physics centre and lamp direction; the front of these sprites points down.
 studyDraw(ctx,name,-CAR_W/2,-CAR_LEN/2,CAR_W,CAR_LEN);
 if(v.dead){ctx.fillStyle='rgba(9,14,23,.7)';ctx.fillRect(-CAR_W/2,-CAR_LEN/2,CAR_W,CAR_LEN);}
 ctx.restore();return true;
}
