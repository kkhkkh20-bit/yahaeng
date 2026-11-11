// Paid, original pixel details. This module only dresses the optional playable study.
const studyArt=A.cityStudy,studyAtlas=new Image();
studyAtlas.onload=()=>{freeCityDirty=true;studyWindowTiles.clear();};
if(studyArt)studyAtlas.src=studyArt.src;
function studyReady(){return !!studyArt&&studyAtlas.complete&&studyAtlas.naturalWidth>0;}
// 구매 팩 건물 정면(층마다 3칸 창 묶음)·옥상·출입구로 그리는 판: 요원 도시 연구판과 큰 도시 시험판
function studyStage(){return !!(STAGE.agentStudy||STAGE.studyFacades);}
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
 drawStudyBoards(b,'roof');
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
const citySignArt2=A.citySigns2,citySignAtlas2=new Image();  // 큰 도시 가게 간판 (Galmuri 글씨)
if(citySignArt2)citySignAtlas2.src=citySignArt2.src;
// 대형 광고판 (tools/import_city_billboards.py): 건물 정면에 거는 판(face)과 옥상에 세우는 판(roof).
// spec.boards = [{image, mode:'face'|'roof', x, fl}] · x = 건물 왼쪽에서 칸 · fl = 정면 판의 아래 끝이 걸리는 층
const cityBoardArt=A.cityBoards,cityBoardAtlas=new Image();
if(cityBoardArt)cityBoardAtlas.src=cityBoardArt.src;
function boardRect(b,d){
 const f=cityBoardArt?.frames[d.image]?.rect;if(!f)return null;
 const k=TILE/cityBoardArt.tile,x0=(b.x0+d.x)*TILE;
 if(d.mode==='roof'){const room=Math.max(TILE,(b.y1-b.fh+1-b.y0)*TILE+TILE*.5),s=Math.min(k,room/f[3],((b.x1+1-b.x0-d.x)*TILE)/f[2]),w=f[2]*s,h=f[3]*s,bottom=(b.y1-b.fh+1)*TILE+6;return{f,x:x0,y:bottom-h,w,h,legs:bottom};}
 const top=(b.y1-b.fh+1)*TILE+4,bottom=(b.y1-(d.fl||0)+1)*TILE-4;if(bottom-top<TILE*1.4&&cityBoardArt.frames[d.image].rect[3]>40)return null;  // 너무 좁으면 걸지 않는다
 const s=Math.min(k,(bottom-top)/f[3],((b.x1+1-b.x0-d.x)*TILE-6)/f[2]),w=f[2]*s,h=f[3]*s;
 return{f,x:x0+3,y:bottom-h,w,h};
}
function drawStudyBoards(b,mode,lit){
 const spec=STAGE.referenceBuildings?.[BLD.indexOf(b)];if(!spec?.boards||!cityBoardAtlas.complete||!cityBoardAtlas.naturalWidth)return;
 for(const d of spec.boards){if(d.mode!==mode)continue;const r=boardRect(b,d);if(!r||!inView(r.x+r.w/2,r.y+r.h/2,r.w+r.h))continue;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(lit){ctx.globalCompositeOperation='lighter';for(const [pad,a] of [[18,.05],[8,.09]]){ctx.fillStyle=`rgba(255,214,150,${a})`;ctx.fillRect(r.x-pad,r.y-pad,r.w+pad*2,r.h+pad*2);}ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.82;}
  else if(r.legs){ctx.fillStyle='#2a3038';for(const lx of [r.x+r.w*.2,r.x+r.w*.8-6])ctx.fillRect(lx,r.y+r.h-4,6,r.legs-(r.y+r.h)+4);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(r.x+8,r.legs-2,r.w-16,6);}
  ctx.drawImage(cityBoardAtlas,...r.f,Math.round(r.x),Math.round(r.y),Math.round(r.w),Math.round(r.h));
  ctx.restore();}
}
// 어둠 위에 한 번 더: 광고판은 밤에 스스로 빛난다 (들어간 건물은 정면·옥상이 걷히므로 뺀다)
function drawBillboardsLit(){
 if(!STAGE.referenceBuildings)return;
 BLD.forEach((b,i)=>{if(b.vacant||i===S.openB||!STAGE.referenceBuildings[i]?.boards)return;drawStudyBoards(b,'face',true);drawStudyBoards(b,'roof',true);});
}

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
 const two=!citySignArt?.frames[a.image]&&!!citySignArt2?.frames[a.image],art=two?citySignArt2:citySignArt,img=two?citySignAtlas2:citySignAtlas;
 const f=art?.frames[a.image]?.rect;
 if(!f||!img.complete||!img.naturalWidth)return;
 const x=(b.x0+a.x)*TILE,y=(b.y1-a.fl)*TILE,w=a.w*TILE,h=a.h*TILE;
 const scale=Math.min(w/f[2],h/f[3]),dw=Math.round(f[2]*scale),dh=Math.round(f[3]*scale);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(img,...f,Math.round(x+(w-dw)/2),Math.round(y+(h-dh)/2),dw,dh);
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
 drawStudyBoards(b,'face');
 if(STAGE.cityLife)drawStoreSigns(b,!DBG.neon);  // 간판은 여기서 한 번만: 정면은 어둠·네온 단계 뒤(지붕 단계)에 그려지므로 빛 번짐도 여기서 같이 그린다
 b.signRects=[];ctx.restore();
}
function studyGround(c,ch,tx,ty){
 if(!studyReady())return false;
 if(ch==='B'||ch==='T'){const adjacent=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>G[ty+y]?.[tx+x]);ch=adjacent.includes('=')?'=':',';}
 if('.Rpxrm'.includes(ch)){studyDraw(c,'pavement',tx*TILE,ty*TILE,TILE,TILE);return true;}
 if(!'=,F'.includes(ch))return false;
 studyDraw(c,ch==='='?'pavement':'alleyBrick',tx*TILE,ty*TILE,TILE,TILE);
 if(ch==='='){
  // A complete curb module includes paving and a broad curved border. Using
  // it as a 48px ground cell made walkable pavement look like a second wall.
  // Keep the purchased two-pixel edge at native scale on the road side only.
  const r=studyArt.frames.curbS.rect,road=(x,y)=>G0[y]?.[x]==='.';
  for(const [dx,dy,a]of [[0,-1,0],[1,0,Math.PI/2],[0,1,Math.PI],[-1,0,-Math.PI/2]])if(road(tx+dx,ty+dy)){
   c.save();c.translate(tc(tx),tc(ty));c.rotate(a);c.drawImage(studyAtlas,r[0],r[1],r[2],2,-TILE/2,-TILE/2,TILE,3);c.restore();
  }
 }
 return true;
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
