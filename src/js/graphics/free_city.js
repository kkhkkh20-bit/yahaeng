// Purchased Dotonbori exteriors, with the official free-city set as a load fallback.
// Shared across every stage; 2D pixels and the existing 48px collision grid.
let freeCityArt=A.dotonbori||A.freeCity||null;
const freeCityAtlas=new Image(),freeCityPatterns={};
let freeCityDirty=false;
freeCityAtlas.onload=()=>{freeCityDirty=true;};
freeCityAtlas.onerror=()=>{if(freeCityArt===A.dotonbori&&A.freeCity){freeCityArt=A.freeCity;for(const k in freeCityPatterns)delete freeCityPatterns[k];freeCityAtlas.src=freeCityArt.src;}};
if(freeCityArt?.src)freeCityAtlas.src=freeCityArt.src;
function freeCityReady(){return !!freeCityArt&&freeCityAtlas.complete&&freeCityAtlas.naturalWidth>0;}
function freeCityDraw(c,name,x,y,scale=2){
 const f=freeCityArt?.frames[name]?.rect;if(!f||!freeCityReady())return false;
 c.drawImage(freeCityAtlas,...f,Math.round(x),Math.round(y),f[2]*scale,f[3]*scale);return true;
}
function freeCityBuilding(b){return !!b&&!b.vacant&&!!STAGE.freeCityExteriors;}
function cityBuildingStyle(b){
 if(STAGE.industrialBuildings?.includes(BLD.indexOf(b)))return 'metal';
 if(b.glass||b.kind==='shop')return 'green';
 return (b.x0*7+b.y0*3)%3===0?'brick':'stone';
}
function freeCityPattern(name){
 let tile=freeCityPatterns[name];if(tile)return tile;
 const f=freeCityArt?.frames[name]?.rect;if(!f||!freeCityReady())return null;
 tile=document.createElement('canvas');const scale=name==='pavers'&&freeCityArt===A.dotonbori?1:2;tile.width=f[2]*scale;tile.height=f[3]*scale;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(freeCityAtlas,...f,0,0,tile.width,tile.height);
 if(name==='pavers'&&freeCityArt===A.dotonbori){c.fillStyle='rgba(92,100,104,.35)';c.fillRect(0,0,tile.width,tile.height);}
 if(name==='asphalt'){c.fillStyle='rgba(19,27,40,.6)';c.fillRect(0,0,tile.width,tile.height);}
 return freeCityPatterns[name]=tile;
}
function paintFreeCityWall(c,b,x,y,w,h){
 if(!freeCityBuilding(b))return false;const style=cityBuildingStyle(b),name={metal:'wallMetal',brick:'wallBrick',green:'wallGreen',stone:'wallPanel'}[style],tile=freeCityPattern(freeCityArt?.frames[name]?name:'wallPanel');if(!tile)return false;
 c.save();c.translate(x,y);c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,w,h);
 if(freeCityArt===A.dotonbori){
  // Continuous cornice and pilasters: no repeated fake doors or lit panes.
  c.save();c.beginPath();c.rect(0,0,w,h);c.clip();
  for(let dx=0;dx<w;dx+=192)freeCityDraw(c,'cornice',dx,0);
  for(const dx of [0,w-8])for(let dy=20;dy<h;dy+=44)freeCityDraw(c,'pilaster',dx,dy);
  c.restore();
 }c.restore();return true;
}
function paintFreeCityRoof(c,b,w,h){
 if(!freeCityBuilding(b)||!freeCityReady())return false;
 if(freeCityArt===A.dotonbori){
  const style=cityBuildingStyle(b),name=style==='metal'?'roofTile':style==='brick'?'roofWave':'roofTerrace';
  const f=(freeCityArt.frames[name]||freeCityArt.frames.roofTile).rect,e=freeCityArt.roofSlice,border=e*2;
  const spans=[[0,e,0,border],[e,f[2]-e*2,border,w-border*2],[f[2]-e,e,w-border,border]];
  const rows=[[0,e,0,border],[e,f[3]-e*2,border,h-border*2],[f[3]-e,e,h-border,border]];
  // Tile each nine-slice region at native 2x, clipping the last tile, never stretching.
  for(const [sx,sw,dx,dw]of spans)for(const [sy,sh,dy,dh]of rows){
   if(dw<=0||dh<=0)continue;c.save();c.beginPath();c.rect(dx,dy,dw,dh);c.clip();
   for(let yy=dy;yy<dy+dh;yy+=sh*2)for(let xx=dx;xx<dx+dw;xx+=sw*2)c.drawImage(freeCityAtlas,f[0]+sx,f[1]+sy,sw,sh,xx,yy,sw*2,sh*2);
   c.restore();
  }
  // Shallow panel joints and a recessed deck avoid a stretched striped slab.
  c.save();c.fillStyle='rgba(38,50,57,.2)';c.fillRect(border,border,w-border*2,h-border*2);
  for(let yy=border+96;yy<h-border;yy+=96){c.fillStyle='#202c3544';c.fillRect(border,yy,w-border*2,2);}
  c.restore();return true;
 }
 const tile=freeCityPattern('roofTile');if(!tile)return false;
 c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,w,h);
 c.fillStyle='#27353c';c.fillRect(0,0,w,10);c.fillRect(0,h-10,w,10);c.fillRect(0,0,10,h);c.fillRect(w-10,0,10,h);
 c.fillStyle='#84918c';c.fillRect(2,2,w-4,2);c.fillRect(2,2,2,h-4);c.fillStyle='#4b5d61';c.fillRect(2,h-6,w-4,2);c.fillRect(w-6,2,2,h-4);
 c.fillStyle='rgba(14,24,32,.28)';for(let y=128;y<h-10;y+=128)c.fillRect(10,y,w-20,2);
 return true;
}
function freeCityGround(c,ch,tx,ty){
 if(!STAGE.freeCityExteriors||CUR_F||bldAt(tx,ty)>=0||!freeCityReady())return false;
 if(ch==='B')ch='d';
 if(ch==='T'){const n=[[0,1],[0,-1],[1,0],[-1,0]].map(([dx,dy])=>G[ty+dy]?.[tx+dx]);ch=n.includes('g')?'g':n.includes('d')?'d':n.includes('=')?'=':'.';}
 const name=ch==='g'?((tx*7+ty*3)%5?'grass':'grassAlt'):ch==='d'?'soil':'=,F'.includes(ch)?'pavers':'.Rpxrm'.includes(ch)?'asphalt':null;
 const tile=name&&freeCityPattern(name);if(!tile)return false;
 c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(tx*TILE,ty*TILE,TILE,TILE);return true;
}
function drawCityPlant(ch,tx,ty,near){
 if(!STAGE.freeCityExteriors||freeCityArt!==A.dotonbori||!freeCityReady())return false;
 const x=tc(tx),y=tc(ty),h=((tx*92821)^(ty*68917))>>>0;
 ctx.save();
 if(ch==='B'){
  const bs=S.bushShake,u=bs?(S.t-bs.t)/.5:1,shake=u>=0&&u<1&&Math.abs(bs.x-x)<30&&Math.abs(bs.y-y)<30?Math.sin(u*22.5)*3*(1-u):0;
  ctx.globalAlpha=near?.48:1;freeCityDraw(ctx,'bush'+(h%2),tx*TILE-16+shake,ty*TILE-18,2);
 }else{
  ctx.fillStyle='rgba(6,13,20,.27)';ctx.beginPath();ctx.ellipse(x,y+13,20,8,0,0,TAU);ctx.fill();
  const name=h%5===0?'treePlanter':h%3?'treeOval':'treeRound';freeCityDraw(ctx,name,x-24,y-78,3);
 }
 ctx.restore();return true;
}
function cityBoundaryWall(c,tx,ty){
 if(!STAGE.freeCityExteriors||CUR_F||bldAt(tx,ty)>=0)return false;
 const tile=freeCityPattern('wallPanel');if(!tile)return false;
 const x=tx*TILE,y=ty*TILE;c.save();c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(x,y,TILE,TILE);c.fillStyle='#202b36';c.fillRect(x,y,TILE,8);c.fillStyle='#8d99a1';c.fillRect(x,y+2,TILE,3);c.fillStyle='#101a2788';c.fillRect(x,y+TILE-5,TILE,5);c.restore();return true;
}
function refreshFreeCity(){
 if(!freeCityDirty||!S||!mapC)return;freeCityDirty=false;if(!STAGE.freeCityPilot&&!STAGE.freeCityExteriors)return;
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;BLD.forEach((b,i)=>{if(freeCityBuilding(b)){b.roofC=buildRoofCanvas(b,i);b.cityPropsC=null;}});}finally{setLayer(layer);}
}
function drawCityRoofProps(b){
 if(!freeCityBuilding(b)||!freeCityReady()||!b.kitProps?.length)return;
 if(!b.cityPropsC){
  const c=b.cityPropsC=document.createElement('canvas');c.width=(b.x1-b.x0+1)*TILE;c.height=b.roofC.rh;const q=c.getContext('2d');q.imageSmoothingEnabled=false;q.translate(-b.x0*TILE,-b.y0*TILE);
  for(const p of b.kitProps){
   const x=(p.x||0)*TILE,y=(p.y||0)*TILE;
   if(p.t==='sh'){
    const xs=p.cells.map(a=>a[0]),ys=p.cells.map(a=>a[1]),px=Math.min(...xs)*TILE,py=Math.min(...ys)*TILE,w=(Math.max(...xs)-Math.min(...xs)+1)*TILE,h=(Math.max(...ys)-Math.min(...ys)+1)*TILE;
    const tile=freeCityPattern('wallPanel');q.fillStyle='#13202b';q.fillRect(px+4,py+6,w,h);q.fillStyle=q.createPattern(tile,'repeat');q.fillRect(px,py-16,w,h+16);q.fillStyle='#87939b';q.fillRect(px,py-16,w,4);q.fillStyle='#34434e';q.fillRect(px+3,py-12,w-6,h-10);
    const l=S.ladders.find(l=>l.kind==='stair'&&l.tx===p.sx&&l.ty===p.sy),d=l?.roofDoor;
    if(d){q.fillStyle='#111d28';q.fillRect(d.x-10,d.y-23,20,24);q.strokeStyle='#84939e';q.lineWidth=2;q.strokeRect(d.x-10,d.y-23,20,24);q.fillStyle='#bfc7bd';q.fillRect(d.x+5,d.y-10,2,5);}
   }else if(p.t==='tank'){
    q.fillStyle='#101b29aa';q.fillRect(x+4,y+8,44,42);q.fillStyle='#72808b';q.fillRect(x+2,y-7,42,48);q.fillStyle='#3d515f';q.fillRect(x+5,y-4,36,38);freeCityDraw(q,'roofUnit',x+7,y,1);q.fillStyle='#a2aaa7';q.fillRect(x+2,y-7,42,3);
   }else if(p.t==='ac'||p.t==='vent'){freeCityDraw(q,'roofUnit',x+8,y+4,1);}
   else if(p.t==='plant'){for(let k=0;k<4;k++)freeCityDraw(q,'roofPlanter',x+k*TILE+8,y+8,2);}
   else if(p.t==='solar'){q.fillStyle='#213243';q.fillRect(x,y,3*TILE,2*TILE);q.strokeStyle='#5b7481';q.lineWidth=2;for(let k=0;k<=3;k++)q.strokeRect(x+k*TILE,y,TILE,2*TILE);q.beginPath();q.moveTo(x,y+TILE);q.lineTo(x+3*TILE,y+TILE);q.stroke();}
  }
 }
 ctx.drawImage(b.cityPropsC,b.x0*TILE,b.y0*TILE);
}
function freeCityFront(b){
 return{windows:S.windows.filter(w=>!flOf(w)&&w.ty===b.y1&&w.tx>=b.x0&&w.tx<=b.x1),doors:S.doors.filter(d=>!flOf(d)&&d.ty===b.y1&&d.tx>=b.x0&&d.tx<=b.x1)};
}
function drawFreeDepotDetails(c,b,x,y,w,h){
 if(!freeCityBuilding(b)||!freeCityReady())return;
 const front=freeCityFront(b),openings=front.windows.concat(front.doors),gateW=Math.min(w-88,192),gateX=x+Math.floor((w-gateW)/2),gateY=y+Math.max(18,h-62);
 c.save();c.imageSmoothingEnabled=false;
 for(const a of front.windows){
  freeCityDraw(c,'window',a.x-26,a.y-16);
  c.save();c.translate(a.x,a.y);paintWindow(a,lightAt(a.x,a.y)>.45,44,20);c.restore();
 }
 for(const d of front.doors){
  if(!freeCityDraw(c,doorVisualOpen(d)>.5?'doorOpen':'doorClosed',d.tx*TILE,d.ty*TILE,2))blit(c,doorVisualOpen(d)>.5?'fDoorOpen':'fDoor',d.tx*TILE,d.ty*TILE,TILE,TILE);
  if(d.locked&&d.keyLock){c.fillStyle=keyCol(d.keyLock);c.fillRect(d.tx*TILE+19,d.ty*TILE+22,10,10);}
 }
 for(const a of S.windows)if(!flOf(a)&&(a.tx===b.x0||a.tx===b.x1)&&a.ty>=b.y1-b.fh+1&&a.ty<b.y1)drawWindowEdge(a,b);
 // Upper storeys follow the actual floor-window list and their own circuit.
 if(freeCityArt===A.dotonbori){
  const layer=CUR_F;
  try{
   for(const a of S.fwindows||[]){
    if(a.fl<1||a.fl>=b.fh||a.ty!==b.y1||a.tx<b.x0||a.tx>b.x1)continue;
    setLayer(a.fl);const lit=lightAt(a.x,a.y-16)>.45,cy=(b.y1-a.fl)*TILE+28;
    freeCityDraw(c,'upperWindow',a.x-26,cy-12);
    c.save();c.translate(a.x,cy);paintWindow(a,lit,44,12);c.restore();
   }
  }finally{setLayer(layer);}
 }
 // A shallow drip cap fits above real ground-floor openings, not across a storey.
 const top=openings.length?(freeCityArt===A.dotonbori?b.y1*TILE-8:y+28):gateY-20;
 const left=openings.length?Math.min(...openings.map(a=>a.tx))*TILE-8:gateX;
 const right=openings.length?Math.max(...openings.map(a=>a.tx))*TILE+TILE+8:gateX+gateW;
 const capH=freeCityArt===A.dotonbori?12:36;
 c.save();c.beginPath();c.rect(left,top,right-left,capH);c.clip();for(let dx=left;dx<right;dx+=64)freeCityDraw(c,'awning',dx,top);c.restore();
 c.fillStyle='rgba(7,16,25,.24)';c.fillRect(left,top+capH,right-left,3);
 if(STAGE.freeCityPilot&&BLD.indexOf(b)===0)freeCityDraw(c,'vending',x+w-188,y+h-64);
 c.restore();
}

// Only the wall-mounted lamp artwork changes. The emitter, switch and circuit stay put.
function drawCityWallLamp(l,m,on){
 if(!STAGE.freeCityExteriors||freeCityArt!==A.dotonbori||!freeCityReady()||m.kind!=='wall')return false;
 const x=l.x,y=l.y-m.height,ay=m.ay-m.height;
 ctx.fillStyle='#46545f';ctx.fillRect(m.ax-3,ay-6,6,12);
 ctx.strokeStyle='#84939e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(m.ax,ay);ctx.lineTo(x,y);ctx.stroke();
 freeCityDraw(ctx,on?'lampOn':'lampOff',x-16,y-9,1);
 if(l.broken){ctx.strokeStyle='#a69a8a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-3,y-4);ctx.lineTo(x+3,y+3);ctx.stroke();}
 return true;
}
