// Purchased Dotonbori exteriors, with the official free-city set as a load fallback.
// Structure uses native 2x pixels, paving/lamp heads native 1x. Physics stays on 48px cells.
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
function freeCityBuilding(b){return !!b&&!!STAGE.freeCityExteriors&&(STAGE.industrialBuildings?.includes(BLD.indexOf(b))||STAGE.freeCityPilot&&freeCityArt===A.dotonbori);}
function freeCityPattern(name){
 let tile=freeCityPatterns[name];if(tile)return tile;
 const f=freeCityArt?.frames[name]?.rect;if(!f||!freeCityReady())return null;
 tile=document.createElement('canvas');const scale=name==='pavers'&&freeCityArt===A.dotonbori?1:2;tile.width=f[2]*scale;tile.height=f[3]*scale;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(freeCityAtlas,...f,0,0,tile.width,tile.height);if(name==='pavers'&&freeCityArt===A.dotonbori){c.fillStyle='rgba(100,106,105,.62)';c.fillRect(0,0,tile.width,tile.height);}return freeCityPatterns[name]=tile;
}
function paintFreeCityWall(c,b,x,y,w,h){
 if(!freeCityBuilding(b))return false;const tile=freeCityPattern('wallPanel');if(!tile)return false;
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
  const f=freeCityArt.frames.roofTile.rect,e=freeCityArt.roofSlice,border=e*2;
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
 if(!STAGE.freeCityPilot||CUR_F||tx<1||tx>32||bldAt(tx,ty)>=0||!'.=,'.includes(ch)||!freeCityReady())return false;
 const paid=freeCityArt===A.dotonbori;
 if(paid?!(ty>=7&&ty<=12||[13,17].includes(ty)):tx>13||![7,13,17].includes(ty))return false;
 const tile=freeCityPattern(paid||ch==='='?'pavers':'asphalt');if(!tile)return false;
 c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(tx*TILE,ty*TILE,TILE,TILE);return true;
}
function refreshFreeCity(){
 if(!freeCityDirty||!S||!mapC)return;freeCityDirty=false;if(!STAGE.freeCityPilot&&!STAGE.freeCityExteriors)return;
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;BLD.forEach((b,i)=>{if(freeCityBuilding(b))b.roofC=buildRoofCanvas(b,i);});}finally{setLayer(layer);}
}
function freeCityFront(b){
 return{windows:S.windows.filter(w=>!flOf(w)&&w.ty===b.y1&&w.tx>=b.x0&&w.tx<=b.x1),doors:S.doors.filter(d=>!flOf(d)&&d.ty===b.y1&&d.tx>=b.x0&&d.tx<=b.x1)};
}
function drawFreeDepotDetails(c,b,x,y,w,h){
 if(!freeCityBuilding(b)||!freeCityReady())return;
 const front=freeCityFront(b),openings=front.windows.concat(front.doors),gateW=Math.min(w-88,192),gateX=x+Math.floor((w-gateW)/2),gateY=y+Math.max(18,h-62);
 c.save();c.imageSmoothingEnabled=false;
 for(const a of front.windows){
  freeCityDraw(c,'window',a.x-26,a.y-16);drawWindow(a,c.globalAlpha);
 }
 for(const d of front.doors){blit(c,doorVisualOpen(d)>.5?'fDoorOpen':'fDoor',d.tx*TILE,d.ty*TILE,TILE,TILE);if(d.locked&&d.keyLock){c.fillStyle=keyCol(d.keyLock);c.fillRect(d.tx*TILE+19,d.ty*TILE+22,10,10);}}
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
