// Paid, original pixel details. This module only dresses the optional playable study.
const studyArt=A.cityStudy,studyAtlas=new Image();
studyAtlas.onload=()=>{freeCityDirty=true;studyWindowTiles.clear();};
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
 studyRepeat(ctx,'bridgeDeck',x,y,w,h,1.5);
 studyRepeat(ctx,'rail',x,y-12,w,24,1.5);
 studyRepeat(ctx,'rail',x,y+h-16,w,24,1.5);
 ctx.restore();return true;
}
function drawStudyRoof(b){
 if(!studyReady())return;
 for(const p of b.kitProps||[])if(p.t==='tank'){
  studyDraw(ctx,'serviceFan',p.x*TILE,p.y*TILE-48,48,96);
  studyDraw(ctx,'antenna',p.x*TILE+8,p.y*TILE-76,24,48);
 }
}

function studyWall(c,b,x,y,w,h){
 const style=cityBuildingStyle(b),tile={green:'wallGreen',brick:'wallTan',office:'wallBlue',stone:'wallSlate'}[style]||'wallSlate';
 studyRepeat(c,tile,x,y,w,h,2);
 const pier=freeCityArt?.frames.masonryPier?.rect;
 if(pier)for(const px of [x,x+w-8])c.drawImage(freeCityAtlas,...pier,px,y,8,h);
 return true;
}
const cityVehicleArt=A.cityVehicles,cityVehicleAtlas=new Image();
if(cityVehicleArt)cityVehicleAtlas.src=cityVehicleArt.src;
function drawAssetCar(v){
 if(!cityVehicleArt||!cityVehicleAtlas.complete||!cityVehicleAtlas.naturalWidth)return false;
 const model=v.police?'police':['sedan','civic','hatch','wagon','luxury'][((v.c%5)+5)%5],f=cityVehicleArt.frames[model];
 const i=Math.round(((v.a%TAU+TAU)%TAU)/TAU*48)%48,scale=f.scale;
 ctx.save();ctx.rotate(-v.a-Math.PI/2);ctx.imageSmoothingEnabled=false;
 if(v.dead)ctx.filter='brightness(.28) saturate(.2)';
 ctx.drawImage(cityVehicleAtlas,...f.rects[i],-f.anchor[0]*scale,-f.anchor[1]*scale,100*scale,100*scale);
 ctx.restore();return true;
}
const citySignArt=A.citySigns,citySignAtlas=new Image();
if(citySignArt)citySignAtlas.src=citySignArt.src;

const studyWindowTiles=new Map();
function studySourceRow(b,fl){const i=BLD.indexOf(b),s=STAGE.referenceBuildings[i];return{s,row:STAGE.referenceRow(i,fl)};}
function studyCellImage(b,tx,fl,w){
 const{ s,row }=studySourceRow(b,fl),col=((tx-b.x0-1)%3+3)%3,f=studyArt.frames[s.front].rect;
 const state=w?winSt(w):'closed',lit=w&&windowRoomLit(w),key=s.front+':'+row+':'+col+':'+state+':'+!!lit;
 if(studyWindowTiles.has(key))return studyWindowTiles.get(key);
 const c=document.createElement('canvas');c.width=c.height=32;const q=c.getContext('2d');q.imageSmoothingEnabled=false;
 // Ground-storey wooden doors in the source are scenery, not extra entrances.
 const shutter=s.front==='frontWood'&&!fl?studyArt.frames.shopShutter.rect:null;
 q.drawImage(studyAtlas,shutter?shutter[0]+col*32:f[0]+col*32,shutter?shutter[1]:f[1]+row*32,32,32,0,0,32,32);
 if(w){
  const im=q.getImageData(0,0,32,32),d=im.data;
  // Tint only source glass. Original mullions, transoms, posters and sills stay.
  for(let y=3;y<30;y++)for(let x=2;x<30;x++){const p=(y*32+x)*4,r=d[p],g=d[p+1],bl=d[p+2];if(bl>r*1.18&&bl>g*1.07){if(state==='open'&&x>16){d[p]=14;d[p+1]=23;d[p+2]=35;}else if(lit){const v=(r+g+bl)/3;d[p]=Math.min(205,v*1.08);d[p+1]=Math.min(202,v*1.06);d[p+2]=Math.min(184,v*.98);}else{d[p]*=.66;d[p+1]*=.76;d[p+2]*=.88;}}}
  q.putImageData(im,0,0);
  if(state==='bar'){q.strokeStyle='#15202b';q.lineWidth=2;for(let x=6;x<29;x+=7){q.beginPath();q.moveTo(x,4);q.lineTo(x,30);q.stroke();}}
  if(state==='lock'){q.fillStyle='#d1ae6b';q.fillRect(26,23,3,4);}
 }
 studyWindowTiles.set(key,c);return c;
}
function drawStudySign(b,a){
 const f=citySignArt?.frames[a.image]?.rect;
 if(!f||!citySignAtlas.complete||!citySignAtlas.naturalWidth)return;
 const x=(b.x0+a.x)*TILE,y=(b.y1-a.fl)*TILE,w=a.w*TILE,h=a.h*TILE;
 const scale=Math.min(w/f[2],h/f[3]),dw=Math.round(f[2]*scale),dh=Math.round(f[3]*scale);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(citySignAtlas,...f,Math.round(x+(w-dw)/2),Math.round(y+(h-dh)/2),dw,dh);
 ctx.restore();
}

function drawStudyFacade(b){
 const x=b.x0*TILE,y=(b.y1-b.fh+1)*TILE,w=(b.x1-b.x0+1)*TILE,h=b.fh*TILE,bi=BLD.indexOf(b),spec=STAGE.referenceBuildings[bi];
 if(!spec)return;
 ctx.save();ctx.imageSmoothingEnabled=false;studyWall(ctx,b,x,y,w,h);
 // The original 96px storeys repeat as complete three-bay units, at one
 // shared pixel scale. They are never stretched to a whole warehouse width.
 for(let fl=0;fl<b.fh;fl++)for(let tx=b.x0+1;tx<b.x1;tx++){
  const a=(fl?S.fwindows:S.windows).find(a=>flOf(a)===fl&&a.tx===tx&&a.ty===b.y1);
  ctx.drawImage(studyCellImage(b,tx,fl,a),tx*TILE,(b.y1-fl)*TILE,TILE,TILE);
 }
 const pier=freeCityArt.frames.masonryPier.rect;
 for(let tx=b.x0;tx<=b.x1;tx+=3)ctx.drawImage(freeCityAtlas,...pier,tx*TILE,y,8,h);
 for(let tx=b.x0;tx<=b.x1;tx++){const l=b.fl?.[tx-b.x0]??.2;ctx.fillStyle=`rgba(4,8,22,${.22*(1-clamp(l,0,1))})`;ctx.fillRect(tx*TILE,y,TILE,h);}
 for(let fl=1;fl<b.fh;fl+=3)studyDraw(ctx,'aircon',x+8,(b.y1-fl)*TILE+10,32,32);
 if(bi%3===0)studyDraw(ctx,'ivy',x+w-30,y,24,48);
 if(spec.ad)drawStudySign(b,spec.ad);
 b.signRects=[];ctx.restore();
}
function studyGround(c,ch,tx,ty){
 if(!studyReady())return false;
 if(ch==='B'||ch==='T'){const adjacent=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>G[ty+y]?.[tx+x]);ch=adjacent.includes('=')?'=':',';}
 if('.Rpxrm'.includes(ch)){studyDraw(c,'pavement',tx*TILE,ty*TILE,TILE,TILE);return true;}
 if(!'=,F'.includes(ch))return false;
 let name=ch==='='?'pavement':'alleyBrick';
 if(ch==='='){
  const road=(x,y)=>G0[y]?.[x]==='.',n=road(tx,ty-1),s=road(tx,ty+1),w=road(tx-1,ty),e=road(tx+1,ty);
  name=n?(w?'curbNW':e?'curbNE':'curbN'):s?(w?'curbSW':e?'curbSE':'curbS'):w?'curbW':e?'curbE':name;
 }
 studyDraw(c,name,tx*TILE,ty*TILE,TILE,TILE);return true;
}
function paintStudyRoof(c,b,w,h){
 const spec=STAGE.referenceBuildings[BLD.indexOf(b)];if(!spec)return false;
 studyRepeat(c,spec.roof,0,0,w,h,1.5);
 // Keep the purchased coping pixels, not a second procedural outline.
 const f=freeCityArt.frames.roofTerrace.rect;
 for(let x=0;x<w;x+=48){c.drawImage(freeCityAtlas,f[0]+32,f[1],32,5,x,0,48,7.5);c.drawImage(freeCityAtlas,f[0]+32,f[1]+91,32,5,x,h-7.5,48,7.5);}
 for(let y=0;y<h;y+=48){c.drawImage(freeCityAtlas,f[0],f[1]+32,5,32,0,y,7.5,48);c.drawImage(freeCityAtlas,f[0]+91,f[1]+32,5,32,w-7.5,y,7.5,48);}
 return true;
}
function drawStudyEntrance(b,e){
 if(!studyReady()||e.ny!==1)return false;
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(const d of e.doors){const open=doorVisualOpen(d),x=d.tx*TILE,y=e.wallY-TILE,f=studyArt.frames.doorPanel.rect;
  studyDraw(ctx,'doorPanel',x,y,TILE,TILE);
  if(open>.02){ctx.fillStyle='#0b1420';ctx.fillRect(x+6,y+9,36,36);const leaf=Math.max(0,36*(1-open));if(leaf>0)ctx.drawImage(studyAtlas,f[0]+4,f[1]+6,24,24,x+6,y+9,leaf,36);}
  const awning=freeCityArt.frames.awningGreen?.rect;
  if(awning)ctx.drawImage(freeCityAtlas,...awning,x-6,y-15,60,20);
 }
 ctx.restore();return true;
}

function drawStudyStreetLamp(l,m,on){
 if(!studyReady()||m.kind!=='street')return false;
 // One source post per real lamp, at the physical mount, never scenery poles
 // with no switch or light. The bulb swaps with the existing circuit state.
 const x=m.ax-24,y=m.ay-91;
 studyDraw(ctx,'streetPost',x,y,48,96);
 if(on&&!l.broken)studyDraw(ctx,'streetBulb',x,y,48,24);
 return true;
}
