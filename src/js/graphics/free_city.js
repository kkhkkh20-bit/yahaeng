// Official 2D City materials for freight exteriors; courtyard paving stays local.
// Source pixels are drawn at 2x; the physical 48px grid and all actions stay intact.
const freeCityArt=A.freeCity||null,freeCityAtlas=new Image(),freeCityPatterns={};
let freeCityDirty=false;
freeCityAtlas.onload=()=>{freeCityDirty=true;};
if(freeCityArt?.src)freeCityAtlas.src=freeCityArt.src;
function freeCityReady(){return !!freeCityArt&&freeCityAtlas.complete&&freeCityAtlas.naturalWidth>0;}
function freeCityDraw(c,name,x,y){
 const f=freeCityArt?.frames[name]?.rect;if(!f||!freeCityReady())return false;
 c.drawImage(freeCityAtlas,...f,Math.round(x),Math.round(y),f[2]*2,f[3]*2);return true;
}
function freeCityBuilding(b){return !!b&&!!STAGE.freeCityExteriors&&STAGE.industrialBuildings?.includes(BLD.indexOf(b));}
function freeCityPattern(name){
 let tile=freeCityPatterns[name];if(tile)return tile;
 const f=freeCityArt?.frames[name]?.rect;if(!f||!freeCityReady())return null;
 tile=document.createElement('canvas');tile.width=f[2]*2;tile.height=f[3]*2;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(freeCityAtlas,...f,0,0,tile.width,tile.height);return freeCityPatterns[name]=tile;
}
function paintFreeCityWall(c,b,x,y,w,h){
 if(!freeCityBuilding(b))return false;const tile=freeCityPattern('wallPanel');if(!tile)return false;
 c.save();c.translate(x,y);c.globalAlpha*=.78;c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,w,h);c.restore();return true;
}
function paintFreeCityRoof(c,b,w,h){
 if(!freeCityBuilding(b))return false;const tile=freeCityPattern('roofTile');if(!tile)return false;
 c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,w,h);
 c.fillStyle='#27353c';c.fillRect(0,0,w,10);c.fillRect(0,h-10,w,10);c.fillRect(0,0,10,h);c.fillRect(w-10,0,10,h);
 c.fillStyle='#84918c';c.fillRect(2,2,w-4,2);c.fillRect(2,2,2,h-4);c.fillStyle='#4b5d61';c.fillRect(2,h-6,w-4,2);c.fillRect(w-6,2,2,h-4);
 c.fillStyle='rgba(14,24,32,.28)';for(let y=128;y<h-10;y+=128)c.fillRect(10,y,w-20,2);
 return true;
}
function freeCityGround(c,ch,tx,ty){
 if(!STAGE.freeCityPilot||CUR_F||tx<1||tx>13||![7,13,17].includes(ty)||bldAt(tx,ty)>=0||!'.=,'.includes(ch)||!freeCityReady())return false;
 const tile=freeCityPattern(ch==='='?'pavers':'asphalt');if(!tile)return false;
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
 // The canopy follows real openings; it never invents a new usable doorway.
 const left=openings.length?Math.min(...openings.map(a=>a.tx))*TILE-8:gateX;
 const right=openings.length?Math.max(...openings.map(a=>a.tx))*TILE+TILE+8:gateX+gateW;
 const top=openings.length?y+28:gateY-20;
 c.save();c.beginPath();c.rect(left,top,right-left,36);c.clip();for(let dx=left;dx<right;dx+=64)freeCityDraw(c,'awning',dx,top);c.restore();
 c.fillStyle='rgba(7,16,25,.24)';c.fillRect(left,top+36,right-left,4);
 if(STAGE.freeCityPilot&&BLD.indexOf(b)===0)freeCityDraw(c,'vending',x+w-188,y+h-64);
 c.restore();
}
