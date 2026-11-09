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
 if(STAGE.agentStudy)return STAGE.studyStyles[BLD.indexOf(b)]||'stone';
 if(STAGE.industrialBuildings?.includes(BLD.indexOf(b)))return b.h>1?'office':'metal';
 if(b.glass)return 'office';
 if(b.kind==='shop')return (b.x0+b.y0)%2?'brick':'green';
 return (b.x0*7+b.y0*3)%3===0?'brick':'stone';
}
function freeCityPattern(name){
 const key=name==='asphalt'&&STAGE.agentStudy?'asphalt:study':name;
 let tile=freeCityPatterns[key];if(tile)return tile;
 const f=freeCityArt?.frames[name]?.rect;if(!f||!freeCityReady())return null;
 tile=document.createElement('canvas');const scale=name==='pavers'&&freeCityArt===A.dotonbori?1:2;tile.width=f[2]*scale;tile.height=f[3]*scale;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(freeCityAtlas,...f,0,0,tile.width,tile.height);
 if(name==='pavers'&&freeCityArt===A.dotonbori){c.fillStyle='rgba(92,100,104,.35)';c.fillRect(0,0,tile.width,tile.height);}
 if(name==='asphalt'){c.fillStyle=STAGE.agentStudy?'rgba(24,32,48,.16)':'rgba(19,27,40,.6)';c.fillRect(0,0,tile.width,tile.height);}
 return freeCityPatterns[key]=tile;
}
function paintFreeCityWall(c,b,x,y,w,h){
 if(!freeCityBuilding(b))return false;
 if(STAGE.agentStudy&&studyReady())return studyWall(c,b,x,y,w,h);
 const style=cityBuildingStyle(b),name={metal:'metalStorey',office:'slateStorey',brick:'brickStorey',green:'brickStorey',stone:'slateStorey'}[style];
 if(style==='green'&&freeCityArt===A.dotonbori){
  const tile=freeCityPattern('wallGreen');if(!tile)return false;
  // The green casement belongs to this masonry, not the brown brick storey.
  // Paint one continuous surface; the window contributes only its own frame.
  c.save();c.translate(x,y);c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,w,h);
  c.fillStyle='#27333d';c.fillRect(0,0,3,h);c.fillRect(w-3,0,3,h);c.restore();return true;
 }
 const f=freeCityArt?.frames[name]?.rect;
 if(f&&freeCityReady()){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.imageSmoothingEnabled=false;
  for(let yy=y;yy<y+h;yy+=TILE)for(let xx=x;xx<x+w;xx+=f[2]*1.5)c.drawImage(freeCityAtlas,...f,xx,yy,f[2]*1.5,TILE);
  // Use the original continuous pier, rather than capping each floor tile.
  const p=freeCityArt.frames.masonryPier?.rect;
  if(p)for(const xx of [x,x+w-6])c.drawImage(freeCityAtlas,...p,xx,y,6,h);
  c.restore();return true;
 }
 const tile=freeCityPattern('wallPanel');if(!tile)return false;c.save();c.translate(x,y);c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,w,h);c.restore();return true;
}
function paintFreeCityRoof(c,b,w,h){
 if(!freeCityBuilding(b)||!freeCityReady())return false;
 if(STAGE.agentStudy&&studyReady())return paintStudyRoof(c,b,w,h);
 if(freeCityArt===A.dotonbori){
  const style=cityBuildingStyle(b),name=STAGE.agentStudy?'roofTile':style==='metal'?'roofTile':style==='brick'?'roofWave':'roofTerrace';
  const f=(freeCityArt.frames[name]||freeCityArt.frames.roofTile).rect,e=freeCityArt.roofSlice,border=e*2;
  const spans=[[0,e,0,border],[e,f[2]-e*2,border,w-border*2],[f[2]-e,e,w-border,border]];
  const rows=[[0,e,0,border],[e,f[3]-e*2,border,h-border*2],[f[3]-e,e,h-border,border]];
  // Tile each nine-slice region at native 2x, clipping the last tile, never stretching.
  for(const [sx,sw,dx,dw]of spans)for(const [sy,sh,dy,dh]of rows){
   if(dw<=0||dh<=0)continue;c.save();c.beginPath();c.rect(dx,dy,dw,dh);c.clip();
   for(let yy=dy;yy<dy+dh;yy+=sh*2)for(let xx=dx;xx<dx+dw;xx+=sw*2)c.drawImage(freeCityAtlas,f[0]+sx,f[1]+sy,sw,sh,xx,yy,sw*2,sh*2);
   c.restore();
  }
  // Keep the source roof surface continuous; no extra repeated cross-bands.
  c.save();c.fillStyle='rgba(38,50,57,.2)';c.fillRect(border,border,w-border*2,h-border*2);
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
 if(STAGE.agentStudy&&studyGround(c,ch,tx,ty))return true;
 if(freeCityArt===A.dotonbori&&studyReady()&&'.Rpxrm'.includes(ch)){studyDraw(c,'pavement',tx*TILE,ty*TILE,TILE,TILE);return true;}
 if(ch==='T'||ch==='B'){const n=[[0,1],[0,-1],[1,0],[-1,0]].map(([dx,dy])=>G[ty+dy]?.[tx+dx]);ch=n.includes('g')?'g':n.includes('d')?'d':n.includes('=')?'=':'.';}
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
  ctx.fillStyle='rgba(13,25,21,.32)';ctx.beginPath();ctx.ellipse(x,y+9,24,12,0,0,TAU);ctx.fill();
  ctx.globalAlpha=near?.48:1;freeCityDraw(ctx,'bush'+(h%2),tx*TILE-8+shake,ty*TILE-12,2);
 }else{
  ctx.fillStyle='rgba(6,13,20,.27)';ctx.beginPath();ctx.ellipse(x,y+13,20,8,0,0,TAU);ctx.fill();
  const name=h%5===0?'treePlanter':h%3?'treeOval':'treeRound';freeCityDraw(ctx,name,x-24,y-78,3);
 }
 ctx.restore();return true;
}
function drawCityCargo(c,tx,ty){
 if(!STAGE.freeCityExteriors||freeCityArt!==A.dotonbori||!freeCityReady())return false;
 const x=tx*TILE,y=ty*TILE;c.save();c.fillStyle='rgba(5,12,22,.28)';c.fillRect(x+4,y+5,44,43);const painted=freeCityDraw(c,'cargoCrate'+((tx+ty)%2),x,y,2);c.restore();return painted;
}
function cityWallEdges(tx,ty){
 const wall=(x,y)=>!!G0[y]&&'#NS'.includes(G0[y][x]||' ');
 return{n:wall(tx,ty-1),s:wall(tx,ty+1),e:wall(tx+1,ty),w:wall(tx-1,ty)};
}
function cityBoundaryWall(c,tx,ty){
 if(!STAGE.freeCityExteriors||CUR_F||bldAt(tx,ty)>=0)return false;
 const tile=freeCityPattern('wallPanel');if(!tile)return false;
 const x=tx*TILE,y=ty*TILE,a=cityWallEdges(tx,ty);c.save();c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(x,y,TILE,TILE);
 if(!a.n){c.fillStyle='#202b36';c.fillRect(x,y,TILE,8);c.fillStyle='#8d99a1';c.fillRect(x,y+2,TILE,3);}
 if(!a.w&&(a.n||a.s)){c.fillStyle='#202b36';c.fillRect(x,y,7,TILE);c.fillStyle='#8d99a1';c.fillRect(x+2,y,3,TILE);}
 if(!a.e&&(a.n||a.s)){c.fillStyle='#1d2b38';c.fillRect(x+TILE-6,y,6,TILE);c.fillStyle='#6f808e';c.fillRect(x+TILE-5,y,2,TILE);}
 if(!a.s){c.fillStyle='#101a2788';c.fillRect(x,y+TILE-5,TILE,5);}
 if(!a.e&&!a.n&&!a.s){c.fillStyle='#6f808e';c.fillRect(x+TILE-4,y+2,3,TILE-2);}
 if(!a.w&&!a.n&&!a.s){c.fillStyle='#8d99a1';c.fillRect(x+1,y+2,3,TILE-2);}
 c.restore();return true;
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
    if(STAGE.agentStudy&&studyReady()){studyDraw(q,'stairHouse',px,py,w,h);}else{const tile=freeCityPattern('wallPanel');q.fillStyle='#13202b';q.fillRect(px+4,py+6,w,h);q.fillStyle=q.createPattern(tile,'repeat');q.fillRect(px,py-16,w,h+16);q.fillStyle='#87939b';q.fillRect(px,py-16,w,4);q.fillStyle='#34434e';q.fillRect(px+3,py-12,w-6,h-10);}
    const l=S.ladders.find(l=>l.kind==='stair'&&l.tx===p.sx&&l.ty===p.sy),d=l?.roofDoor;
    if(d&&!STAGE.agentStudy){q.fillStyle='#111d28';q.fillRect(d.x-10,d.y-23,20,24);q.strokeStyle='#84939e';q.lineWidth=2;q.strokeRect(d.x-10,d.y-23,20,24);q.fillStyle='#bfc7bd';q.fillRect(d.x+5,d.y-10,2,5);}
   }else if(p.t==='tank'){
    q.fillStyle='#101b29aa';q.fillRect(x+4,y+8,44,42);q.fillStyle='#72808b';q.fillRect(x+2,y-7,42,48);q.fillStyle='#3d515f';q.fillRect(x+5,y-4,36,38);freeCityDraw(q,'roofUnit',x+7,y,1);q.fillStyle='#a2aaa7';q.fillRect(x+2,y-7,42,3);
   }else if(p.t==='ac'||p.t==='vent'){freeCityDraw(q,p.t==='vent'&&freeCityArt.frames.roofVent?'roofVent':'roofUnit',x,y-8,1.5);}
   else if(p.t==='plant'){for(let k=0;k<4;k++)freeCityDraw(q,'roofPlanter',x+k*TILE+8,y+8,2);}
   else if(p.t==='solar'){q.fillStyle='#213243';q.fillRect(x,y,3*TILE,2*TILE);q.strokeStyle='#5b7481';q.lineWidth=2;for(let k=0;k<=3;k++)q.strokeRect(x+k*TILE,y,TILE,2*TILE);q.beginPath();q.moveTo(x,y+TILE);q.lineTo(x+3*TILE,y+TILE);q.stroke();}
  }
 }
 ctx.drawImage(b.cityPropsC,b.x0*TILE,b.y0*TILE);
}
const cityWindowImages={};
function cityWindowImage(name,w,lit){
 const state=winSt(w),key=name+'|'+state+'|'+Number(lit);if(cityWindowImages[key])return cityWindowImages[key];
 const f=freeCityArt?.frames[name]?.rect;if(!f||!freeCityReady())return null;
 const c=document.createElement('canvas');c.width=c.height=32;c.cityWindowFrame=name;const q=c.getContext('2d');q.imageSmoothingEnabled=false;q.drawImage(freeCityAtlas,...f,0,0,32,32);
 const box=name==='metalWindow'?[3,19,29,29]:name==='greenWindow'?[2,2,30,13]:[3,3,29,29],a=q.getImageData(0,0,32,32),p=a.data;
 for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const i=(y*32+x)*4,r=p[i],g=p[i+1],b=p[i+2];if(b>r*1.2&&b>g*1.05){const v=(r+g+b)/3;if(lit){p[i]=Math.min(210,v*1.15);p[i+1]=Math.min(180,v);p[i+2]=Math.min(140,v*.72);}else{p[i]*=.7;p[i+1]*=.78;p[i+2]*=.86;}}}
 q.putImageData(a,0,0);
 if(state==='open'){const mid=Math.floor((box[0]+box[2])/2);q.fillStyle='#0c1722';q.fillRect(mid,box[1],box[2]-mid,box[3]-box[1]);q.fillStyle='#a1afb5';q.fillRect(mid-1,box[1],2,box[3]-box[1]);}
 if(state==='bar'){q.strokeStyle='#182431';q.lineWidth=2;for(let x=box[0]+4;x<box[2]-1;x+=6){q.beginPath();q.moveTo(x,box[1]);q.lineTo(x,box[3]);q.stroke();}}
 if(state==='lock'){q.fillStyle='#d0ad72';q.fillRect(15,Math.min(25,box[3]-4),3,3);}
 return cityWindowImages[key]=c;
}
function drawCityWindow(c,b,w,fl){
 const style=cityBuildingStyle(b),name=STAGE.agentStudy&&['stone','office'].includes(style)?'officeWindow':{metal:'metalWindow',office:'officeWindow',brick:'brickWindow',green:'greenWindow',stone:'shopWindow'}[style];
 const im=cityWindowImage(name,w,windowRoomLit(w));if(!im)return false;
 if(style==='green'){
  // The lower half of the source tile is wall, not part of the window.
  c.drawImage(im,0,0,32,16,w.tx*TILE,(b.y1-fl)*TILE+8,TILE,TILE/2);return true;
 }
 c.drawImage(im,w.tx*TILE,(b.y1-fl)*TILE,TILE,TILE);return true;
}
function cityExteriorEntries(b){
 if(b.cityEntrySource===S.doors)return b.cityEntries;
 const all=[];
 for(const d of S.doors){
  if(flOf(d)||d.gate||d.tx<b.x0||d.tx>b.x1||d.ty<b.y0||d.ty>b.y1)continue;
  const nx=d.tx===b.x0?-1:d.tx===b.x1?1:0,ny=nx?0:d.ty===b.y0?-1:d.ty===b.y1?1:0;if(!nx&&!ny)continue;
  all.push({d,nx,ny,along:nx?d.ty:d.tx});
 }
 const entries=[];
 for(const a of all.sort((a,b)=>a.nx-b.nx||a.ny-b.ny||a.along-b.along)){
  const old=entries.at(-1);if(old&&old.nx===a.nx&&old.ny===a.ny&&a.along===old.last+1){old.doors.push(a.d);old.last=a.along;}else entries.push({nx:a.nx,ny:a.ny,doors:[a.d],last:a.along});
 }
 for(const e of entries){e.x=e.doors.reduce((n,d)=>n+d.x,0)/e.doors.length;e.y=e.doors.reduce((n,d)=>n+d.y,0)/e.doors.length;e.wallX=e.nx<0?b.x0*TILE:e.nx>0?(b.x1+1)*TILE:e.x;e.wallY=e.ny<0?b.y0*TILE:e.ny>0?(b.y1+1)*TILE:e.y;}
 b.cityEntrySource=S.doors;return b.cityEntries=entries;
}
function drawCityEntrances(b){
 if(!freeCityBuilding(b)||!freeCityReady())return;
 for(const e of cityExteriorEntries(b)){
  if(!inView(e.x,e.y,140))continue;
  const d=e.doors[0],open=doorVisualOpen(d),name=open>.5?'doorOpen':'doorClosed',side=!!e.nx;
  if((side||e.ny<0)&&(S.player.z||flOf(S.player)))continue;
  if(side){
   const span=e.doors.length*TILE,x=e.wallX+(e.nx<0?0:-22),y=e.y-span/2;
   ctx.save();ctx.imageSmoothingEnabled=false;
   ctx.fillStyle='#111d27';ctx.fillRect(x,y,22,span);
   ctx.fillStyle='#53616b';ctx.fillRect(x,y,22,3);ctx.fillRect(x,y+span-3,22,3);
   const leaf=Math.round(16*(1-open));
   ctx.fillStyle=d.locked?'#655f51':'#43545f';ctx.fillRect(x+3,y+4,leaf,span-8);
   if(leaf>3){ctx.fillStyle='#82908e';ctx.fillRect(x+4,y+5,1,span-10);ctx.fillStyle=d.locked?'#bea16b':'#a3aaa1';ctx.fillRect(x+Math.max(5,leaf-2),y+span*.55,2,4);}
   ctx.fillStyle='#74817f';ctx.fillRect(e.nx<0?x:x+19,y+3,3,span-6);
   ctx.restore();continue;
  }
  if(e.ny<0){
   const span=e.doors.length*TILE,x=e.x-span/2,y=e.wallY;
   ctx.save();ctx.fillStyle='#111d27';ctx.fillRect(x,y,span,18);
   ctx.fillStyle='#53616b';ctx.fillRect(x,y,3,18);ctx.fillRect(x+span-3,y,3,18);
   const leaf=Math.round(12*(1-open));ctx.fillStyle=d.locked?'#655f51':'#43545f';ctx.fillRect(x+3,y+3,span-6,leaf);
   if(leaf>3){ctx.fillStyle=d.locked?'#bea16b':'#a3aaa1';ctx.fillRect(x+span*.6,y+Math.max(4,leaf-1),4,2);}
   ctx.restore();continue;
  }
  if(STAGE.agentStudy&&drawStudyEntrance(b,e))continue;
  const count=e.doors.length,span=Math.max(TILE,count*TILE),x=e.x-span/2,y=e.wallY-TILE;
  const width=span,height=48;
  ctx.save();ctx.imageSmoothingEnabled=false;
  // A real aperture interrupts the opaque roof/side wall at the actual door cell.
  ctx.fillStyle='#111c27';ctx.fillRect(x-3,y-3,width+6,height+4);const f=freeCityArt.frames[name]?.rect;
  if(f)ctx.drawImage(freeCityAtlas,...f,x,y,width,height);
  else{ctx.fillStyle=d.locked?'#65554b':'#111d28';ctx.fillRect(x+2,y+2,width-4,height-4);}
  ctx.strokeStyle='#9da9ae';ctx.lineWidth=2;ctx.strokeRect(x-1,y-1,width+2,height+1);
  if(d.locked){ctx.fillStyle='#d2ad70';ctx.fillRect(x+width-9,y+height*.58,5,7);}
  const light=lightAt(e.x+e.nx*32,e.y+e.ny*32);ctx.fillStyle=`rgba(5,12,24,${.34*(1-clamp(light,0,1))})`;ctx.fillRect(x-3,y-3,width+6,height+4);
  if(e.ny>0&&cityBuildingStyle(b)!=='metal'){const a=freeCityArt.frames[cityBuildingStyle(b)==='brick'?'awningGreen':'awningBlue']?.rect;if(a)ctx.drawImage(freeCityAtlas,...a,x-3,y-14,width+6,18);}
  ctx.restore();
 }
}
function drawCityEntryThresholds(){
 if(tactical||S.player.z||flOf(S.player)||!freeCityReady())return;
 for(const b of BLD){if(!freeCityBuilding(b))continue;for(const e of cityExteriorEntries(b)){
  if(!inView(e.x,e.y,100))continue;const side=!!e.nx,span=e.doors.length*TILE;
  const x=side?e.wallX+(e.nx<0?-24:1):e.x-span/2,y=side?e.y-span/2:e.wallY+(e.ny<0?-24:0),w=side?23:span,h=side?span:20;
  ctx.fillStyle='#4c5965';ctx.fillRect(x,y,w,h);ctx.fillStyle='#9aa7ae';if(side)ctx.fillRect(x+(e.nx<0?3:w-5),y,2,h);else ctx.fillRect(x,y+h-4,w,2);
 }}
}
function freeCityFront(b){
 return{windows:S.windows.filter(w=>!flOf(w)&&w.ty===b.y1&&w.tx>=b.x0&&w.tx<=b.x1),doors:S.doors.filter(d=>!flOf(d)&&d.ty===b.y1&&d.tx>=b.x0&&d.tx<=b.x1)};
}
function drawFreeDepotDetails(c,b,x,y,w,h){
 if(!freeCityBuilding(b)||!freeCityReady())return;
 const front=freeCityFront(b),openings=front.windows.concat(front.doors),gateW=Math.min(w-88,192),gateX=x+Math.floor((w-gateW)/2),gateY=y+Math.max(18,h-62);
 c.save();c.imageSmoothingEnabled=false;
 for(const a of front.windows){
  if(freeCityArt===A.dotonbori&&drawCityWindow(c,b,a,0))continue;
  freeCityDraw(c,'window',a.x-26,a.y-16);
  c.save();c.translate(a.x,a.y);paintWindow(a,lightAt(a.x,a.y)>.45,44,20);c.restore();
 }
 if(freeCityArt!==A.dotonbori)for(const d of front.doors){
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
    if(!drawCityWindow(c,b,a,a.fl)){freeCityDraw(c,'upperWindow',a.x-26,cy-12);c.save();c.translate(a.x,cy);paintWindow(a,lit,44,12);c.restore();}
   }
  }finally{setLayer(layer);}
 }
 // A shallow drip cap fits above real ground-floor openings, not across a storey.
 if(freeCityArt!==A.dotonbori){
 const top=openings.length?b.y1*TILE-8:gateY-20;
 const left=openings.length?Math.min(...openings.map(a=>a.tx))*TILE-8:gateX;
 const right=openings.length?Math.max(...openings.map(a=>a.tx))*TILE+TILE+8:gateX+gateW;
 const capH=freeCityArt===A.dotonbori?12:36;
 c.save();c.beginPath();c.rect(left,top,right-left,capH);c.clip();for(let dx=left;dx<right;dx+=64)freeCityDraw(c,'awning',dx,top);c.restore();
 c.fillStyle='rgba(7,16,25,.24)';c.fillRect(left,top+capH,right-left,3);
 }
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
