// A single authored office is the free-asset lighting pilot. All art is 2D at runtime.
const roomArt={};
for(const[key,a]of Object.entries(window.__ROOM_ART__||{})){
 const img=new Image();roomArt[key]={...a,img};img.onload=()=>{if(S?.roomFinish)S.floorC={};};img.src=a.src;
}
function roomArtDraw(x,key,px,py,alpha=1,scale=1){
 const a=roomArt[key];if(!a?.img.complete||!a.img.naturalWidth)return false;
 x.save();x.globalAlpha*=alpha;x.imageSmoothingEnabled=false;x.drawImage(a.img,px+a.ox*scale,py+a.oy*scale,a.w*scale,a.h*scale);x.restore();return true;
}
const roomArtRotation=(nx,ny)=>Math.abs(nx)>Math.abs(ny)?nx>0?1:3:ny>0?0:2;
function restoreRoomFinishOrigins(){
 for(const l of S.lamps||[])if(l.finishOrigin){Object.assign(l,l.finishOrigin);delete l.roomFinish;delete l.finishOrigin;}
}
function initRoomFinish(){
 restoreRoomFinishOrigins();
 for(const w of S.fwindows||[])delete w.roomFinish;
 S.roomFinish=null;
 if(STAGE.id!=='m2'||window.__ROOM_FINISH_BASELINE__)return;
 const b=0,fl=1,room=PLANS[b]?.[fl]?.store;
 if(BLD[b]?.name!=='사무동'||room?.use!=='office')return;
 const within=(x,y)=>x>=room.x0&&x<=room.x1&&y>=room.y0&&y<=room.y1;
 const lamps=S.lamps.filter(l=>!l.outdoor&&!l.hearth&&flOf(l)===fl&&l.fixture&&within(Math.floor(l.x/TILE),Math.floor(l.y/TILE)));
 if(!lamps.length)return;
 S.roomFinish={b,fl,room:{...room},circuits:[...new Set(lamps.map(l=>l.circuit))]};
 const L0=CUR_F;setLayer(fl);
 for(const l of lamps){
  l.finishOrigin={x:l.x,y:l.y,r:l.r,col:l.col};l.roomFinish=true;
  // Put the emitter just inside the mounted fixture, never in the old room centre.
  l.x=l.fixture.x+l.fixture.nx*8;l.y=l.fixture.y+l.fixture.ny*8;l.r=300;l.col='235,218,183';
  l.poly=[];for(let i=0;i<180;i++){const a=i/180*TAU,d=Math.min(l.r,castRay(l.x,l.y,a,l.r));l.poly.push(l.x+Math.cos(a)*d,l.y+Math.sin(a)*d);}
 }
 for(const w of S.fwindows||[]){
  if(w.fl!==fl||bldAt(w.tx,w.ty)!==b)continue;
  w.roomFinish=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>within(w.tx+dx,w.ty+dy));
 }
 setLayer(L0);LG=null;for(const key in lightCache)delete lightCache[key];S.floorC={};refreshBodyLighting();
}
function roomFinishFurnKey(it){
 if(STAGE.firstSteps&&it.fl===0){const kind={desk2:'desk',chairD:'chair',cab:'cab'}[it.t];if(kind)return kind+'-'+(it.r||0);}
 const f=S?.roomFinish,r=f?.room;if(STAGE.id!=='m2'||!f||it.fl!==f.fl||it.x<r.x0||it.x>r.x1||it.y<r.y0||it.y>r.y1)return null;
 const kind={sofa:'sofa',chairD:'chair',cab:'cab',desk2:'desk'}[it.t];return kind?kind+'-'+(it.r||0):null;
}
function drawRoomFinishFurn(x,it){
 const key=roomFinishFurnKey(it);if(!key||!roomArt[key]?.img.naturalWidth)return false;
 x.save();x.fillStyle='rgba(9,13,18,.22)';x.beginPath();x.ellipse((it.x+it.w/2)*TILE,(it.y+it.h/2)*TILE,it.w*TILE*.46,it.h*TILE*.35,0,0,TAU);x.fill();x.restore();
 return roomArtDraw(x,key,it.x*TILE,it.y*TILE);
}
function roomFinishLamps(){const f=S?.roomFinish;return f?S.lamps.filter(l=>l.roomFinish&&flOf(l)===f.fl):[];}
function roomFinishWindowLit(w){return !!w.roomFinish&&roomFinishLamps().some(l=>lampOn(l));}
function drawRoomFinishWindow(w,alpha=1,ex=w.x,ey=w.y){
 if(!w.roomFinish||!S.roomFinish)return false;
 const b=BLD[S.roomFinish.b],nx=w.tx===b.x0?1:w.tx===b.x1?-1:0,ny=w.ty===b.y0?1:w.ty===b.y1?-1:0;
 const lit=roomFinishWindowLit(w),opened=winSt(w)==='open',r=roomArtRotation(nx,ny);
 return roomArtDraw(ctx,'window-'+Number(lit)+'-'+Number(opened)+'-'+r,ex,ey,alpha);
}
function drawRoomFinishFacadeWindow(w,x,y){
 if(!w.roomFinish||!S.roomFinish)return false;
 return roomArtDraw(ctx,'window-'+Number(roomFinishWindowLit(w))+'-'+Number(winSt(w)==='open')+'-0',x,y+10,1,.68);
}
function drawRoomFinishExterior(openB){
 const f=S.roomFinish;if(!f||openB===f.b)return;const b=BLD[f.b];
 if(!b?.facade||f.fl>=b.fh)return;
 // Window-sight overlays contain the ground-floor plan. Upper-floor panes
 // stay on their facade row and retain their own room's electrical state.
 for(const w of S.fwindows||[])if(w.roomFinish&&w.ty===b.y1)
  drawRoomFinishFacadeWindow(w,w.tx*TILE+24,(b.y1-f.fl)*TILE+24);
}
function drawRoomFinishFixtures(fl,building){
 const f=S.roomFinish;if(!f||f.fl!==fl||building>=0&&building!==f.b)return;
 const controls=new Set();
 for(const l of roomFinishLamps()){
  const m=l.fixture,on=lampOn(l);if(!m)continue;
  roomArtDraw(ctx,'lamp-'+Number(on)+'-'+roomArtRotation(m.nx,m.ny),m.x,m.y);
  if(on){const y=m.y-35;ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(m.x,y,0,m.x,y,10);g.addColorStop(0,'rgba(255,212,142,.28)');g.addColorStop(1,'rgba(255,212,142,0)');ctx.fillStyle=g;ctx.fillRect(m.x-10,y-10,20,20);ctx.restore();}
  if(l.broken){ctx.strokeStyle='#89867c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(m.x-3,m.y-38);ctx.lineTo(m.x+3,m.y-29);ctx.stroke();}
  if(!l.control||controls.has(l.circuit))continue;controls.add(l.circuit);
  const p=l.control;roomArtDraw(ctx,'switch-'+Number(!lampCircuitOff(l))+'-'+roomArtRotation(-p.nx,-p.ny),p.x+p.nx*5,p.y+p.ny*5);
 }
}
function drawRoomFinishGlow(l,color){
 if(!l.roomFinish)return false;
 ctx.save();ctx.beginPath();for(let i=0;i<l.poly.length;i+=2)i?ctx.lineTo(l.poly[i],l.poly[i+1]):ctx.moveTo(l.poly[i],l.poly[i+1]);ctx.closePath();ctx.clip();
 const g=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*.65);g.addColorStop(0,`rgba(${color},.075)`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2);ctx.restore();return true;
}
