// A small official 2D City subset, used only in the first freight courtyard.
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
function freeCityGround(c,ch,tx,ty){
 if(!STAGE.freeCityPilot||CUR_F||tx<1||tx>13||![7,13,17].includes(ty)||bldAt(tx,ty)>=0||!'.=,'.includes(ch)||!freeCityReady())return false;
 const name=ch==='='?'pavers':'asphalt';let tile=freeCityPatterns[name];
 if(!tile){const f=freeCityArt.frames[name].rect;tile=document.createElement('canvas');tile.width=f[2]*2;tile.height=f[3]*2;const t=tile.getContext('2d');t.imageSmoothingEnabled=false;t.drawImage(freeCityAtlas,...f,0,0,tile.width,tile.height);freeCityPatterns[name]=tile;}
 c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(tx*TILE,ty*TILE,TILE,TILE);return true;
}
function refreshFreeCity(){
 if(!freeCityDirty||!S||!mapC)return;freeCityDirty=false;if(!STAGE.freeCityPilot)return;
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;}finally{setLayer(layer);}
}
function drawFreeDepotDetails(c,b,x,y,w,h){
 if(!STAGE.freeCityPilot||BLD.indexOf(b)!==0||!freeCityReady())return;
 c.save();c.imageSmoothingEnabled=false;
 const gateW=Math.min(w-88,192),gateX=x+Math.floor((w-gateW)/2),gateY=y+Math.max(18,h-62);
 for(let dx=0;dx<gateW;dx+=64)freeCityDraw(c,'awning',gateX+dx,gateY-20);
 c.fillStyle='rgba(7,16,25,.24)';c.fillRect(gateX,gateY+16,gateW,5);
 freeCityDraw(c,'window',x+w-70,y+10);
 freeCityDraw(c,'vending',x+w-188,y+h-64);
 c.restore();
}
