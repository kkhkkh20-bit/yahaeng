// Purchased 2D pixels. Render choices never mutate the collision grid or AI.
const officeArt=A.office||null,officeAtlas=new Image();
let officeArtDirty=false;
officeAtlas.onload=()=>{officeArtDirty=true;};
if(officeArt?.src)officeAtlas.src=officeArt.src;
const OFFICE_STYLES={
 dispatch:{floor:'floorCarpet',wall:'wallPanel',accent:'#bc9862',ink:'#172630',warm:false},
 freight:{floor:'floorSlate',wall:'wallPanel',accent:'#ba915e',ink:'#19262c',warm:false},
 archive:{floor:'floorTile',wall:'wallPale',accent:'#b19773',ink:'#252c30',warm:true},
 exchange:{floor:'floorCarpet',wall:'wallPanel',accent:'#658b9b',ink:'#17232f',warm:false},
 executive:{floor:'floorIvory',wall:'wallWood',accent:'#b49a69',ink:'#2c2628',warm:true},
 club:{floor:'floorWine',wall:'wallWood',accent:'#9c687d',ink:'#2b2029',warm:true},
 security:{floor:'floorSlate',wall:'wallPanel',accent:'#779197',ink:'#17262b',warm:false},
 detention:{floor:'floorTile',wall:'wallPanel',accent:'#838d8c',ink:'#20292c',warm:false},
 residence:{floor:'floorOak',wall:'wallPale',accent:'#ac9b83',ink:'#2d2b2a',warm:true},
 estate:{floor:'floorParquet',wall:'wallPale',accent:'#b49b6a',ink:'#2e2d2b',warm:true}
};
function officeReady(){return !window.__OFFICE_ART_BASELINE__&&!!STAGE.officeArt&&!!officeArt&&officeAtlas.complete&&officeAtlas.naturalWidth>0;}
function officeFrame(name){return officeArt?.frames[name]?.rect;}
function officeBlit(c,name,x,y,w,h){
 const r=officeFrame(name);if(!r||!officeReady())return false;
 c.imageSmoothingEnabled=false;c.drawImage(officeAtlas,...r,Math.round(x),Math.round(y),Math.round(w??r[2]),Math.round(h??r[3]));return true;
}
function officeStyle(bi,fl=CUR_F){
 const spec=STAGE.officeArt;if(!spec)return null;
 const levels=spec.buildings?.[bi],key=(Array.isArray(levels)?levels[Math.min(fl,levels.length-1)]:levels)||spec.default||'residence';
 return OFFICE_STYLES[key]||OFFICE_STYLES.residence;
}
function officeGround(c,ch,tx,ty){
 if(!officeReady())return false;
 const bi=bldAt(tx,ty),b=BLD[bi];if(!b||b.vacant||tx<=b.x0||tx>=b.x1||ty<=b.y0||ty>=b.y1)return false;
 if(!'wvthKEY'.includes(ch))return false;
 const bath=PLANS[bi]?.[CUR_F]?.units?.some(u=>u.bath&&tx>=u.bath.x0&&tx<=u.bath.x1&&ty>=u.bath.y0&&ty<=u.bath.y1);
 const style=officeStyle(bi),name=bath?'floorTile':ch==='h'?'floorSlate':style.floor;
 return officeBlit(c,name,tx*TILE,ty*TILE,TILE,TILE);
}
function officeWall(c,tx,ty){
 if(!officeReady()||G[ty]?.[tx]!=='#')return false;
 const bi=bldAt(tx,ty);if(bi<0||BLD[bi].vacant)return false;
 const p=officeStyle(bi),x=tx*TILE,y=ty*TILE,south=!['#','N','V'].includes(G[ty+1]?.[tx]||'V');
 c.fillStyle=p.ink;c.fillRect(x,y,TILE,TILE);
 if(south){officeBlit(c,p.wall,x,y+12,TILE,TILE-12);c.fillStyle='#abb2b0';c.fillRect(x,y+10,TILE,2);c.fillStyle=p.accent;c.fillRect(x,y+TILE-5,TILE,3);}
 else{c.fillStyle='#536068';c.fillRect(x+3,y,2,TILE);c.fillStyle='#73818a';c.fillRect(x+5,y,1,TILE);c.fillStyle='#10191fa0';c.fillRect(x+TILE-5,y,5,TILE);}
 return true;
}
function officeFurnKey(f){
 if(!STAGE.officeArt)return null;
 const bi=bldAt(f.x,f.y);if(bi<0)return null;
 const style=officeStyle(bi,f.fl||0),r=((f.r||0)%4+4)%4;
 if(f.t==='shelf'&&f.skin==='freight')return null;
 if(f.t==='locker'||f.t==='wardrobe'||f.t==='bed'||f.t==='cbed'||f.t==='bedD'||f.t==='dance'||f.t==='rug'||f.t==='boxes'||f.t==='sink'||f.t==='stove'||f.t==='toilet'||f.t==='tub')return null;
 if(f.t==='desk'||f.t==='desk2'){
  if(r===1)return 'deskSideE';if(r===3)return 'deskSideW';
  if(style===OFFICE_STYLES.executive||style===OFFICE_STYLES.estate)return 'deskExecutive';
  return f.t==='desk'?'deskComputer':((f.x+f.y)%3===0?'deskFiles':'deskGlass');
 }
 if(f.t==='table')return f.w>1?'tableGlass':'tableRound';
 if(f.t==='chair'||f.t==='chairD')return([OFFICE_STYLES.executive,OFFICE_STYLES.estate,OFFICE_STYLES.club].includes(style)?['chairRed','chairRedE','chairRedBack','chairRedW']:['chairBlue','chairBlueE','chairBlueBack','chairBlueW'])[r];
 if(f.t==='sofa'||f.t==='sofaV')return [OFFICE_STYLES.executive,OFFICE_STYLES.estate,OFFICE_STYLES.club].includes(style)?'chairRed':'chairBlue';
 return{cab:style.warm?'filesGold':'filesBlue',safe:null,shelf:f.skin==='freight'?'counterWood':style===OFFICE_STYLES.security?'monitorRackBlue':style.warm?'cabinetWood':'cabinetBlue',pc:'deskLaptop',counter:style.warm?'counterWood':'counterGlass',bar:'counterWood',fridge:null,plant:style.warm?'plant':'plantBlue',board:'board',medcab:'filesBlue',pot:'tableRound'}[f.t]||null;
}
function officeFurnBounds(f){
 const key=officeFurnKey(f),r=officeFrame(key);if(!r)return null;
 const maxW=f.w*TILE-6,maxH=f.h*TILE+(['shelf','cab','medcab','fridge'].includes(f.t)?30:18),scale=Math.min(maxW/r[2],maxH/r[3]);
 const w=Math.round(r[2]*scale),h=Math.round(r[3]*scale);
 return{key,x:f.x*TILE+(f.w*TILE-w)/2,y:(f.y+f.h)*TILE-h-3,w,h};
}
function drawOfficeFurn(c,f,shadow){
 if(!officeReady())return false;
 const b=officeFurnBounds(f);if(!b)return false;
 c.save();if(shadow){c.fillStyle='#09121a33';c.beginPath();c.ellipse((f.x+f.w/2)*TILE+3,(f.y+f.h)*TILE-5,f.w*TILE*.42,7,0,0,TAU);c.fill();}
 if(f.t==='sofa'||f.t==='sofaV'){
  const count=Math.max(f.w,f.h);for(let i=0;i<count;i++)officeBlit(c,b.key,f.x*TILE+4+(f.w>1?i*TILE:0),f.y*TILE-10+(f.h>1?i*TILE:0),TILE-8,TILE+6);
 }else officeBlit(c,b.key,b.x,b.y,b.w,b.h);
 c.restore();return true;
}
function officeSurfacePoint(o){
 const f=o?.surface;if(!f||!officeReady())return null;
 const b=officeFurnBounds(f);if(!b)return null;
 // The reach point remains the existing furniture footprint. Only the visible
 // paper/receiver moves onto its purchased tabletop, using the same draw bounds.
 const u=o.surfaceU??.5;
 const x=f.t==='desk'||f.t==='desk2'?f.x*TILE+24:(f.x+f.w*u)*TILE;
 return{x,y:b.y+b.h*.42};
}
function officeWallDecor(c,fl,x0,y0,x1,y1){
 if(!officeReady())return;
 for(const d of STAGE.officeArt.decor||[]){
  if(d.fl!==fl)continue;
  const b=BLD[d.b];if(!b||b.x1<x0||b.x0>x1||b.y1<y0||b.y0>y1)continue;
  const tx=Math.round(b.x0+1+(b.x1-b.x0-2)*d.u),ty=b.y0;
  // A board belongs on a real wall, never across a window, door or staircase.
  if(G[ty]?.[tx]!=='#'||G[ty+1]?.[tx]==='#')continue;
  const r=officeFrame(d.art);if(!r)continue;
  const w=Math.min(d.w||64,TILE*(b.x1-b.x0-1)),h=w*r[3]/r[2];
  officeBlit(c,d.art,tc(tx)-w/2,ty*TILE+TILE-h-3,w,h);
 }
}
function drawOfficeLamp(l,c=ctx){
 if(!officeReady()||!l.fixture)return false;
 const f=l.fixture,on=lampOn(l),horizontal=!!f.ny,style=officeStyle(bldAt(Math.floor(l.x/TILE),Math.floor(l.y/TILE)),flOf(l)),warm=[OFFICE_STYLES.executive,OFFICE_STYLES.estate,OFFICE_STYLES.club].includes(style);
 c.save();c.translate(f.x,f.y);if(!horizontal)c.rotate(Math.PI/2);
 officeBlit(c,warm?'warmLamp':'fluorescent',-22,-6,44,16);
 // Only the tube changes; the lamp's real polygon, circuit and switch remain.
 c.fillStyle=on?(warm?'#e4c493':'#e1e9da'):'#43535a';c.fillRect(-13,1,26,2);c.fillStyle=on?'#f6f2d8':'#354149';c.fillRect(-12,1,24,1);
 c.restore();return true;
}
function officeCabinetLeaf(c,g,hinge,side,projection,depth){
 if(!officeReady()||projection<1)return;
 const key=g.locker?'lockerSteel':'wardrobeWood',r=officeFrame(key);if(!r)return;
 c.save();c.transform(side*projection/r[2],depth/r[2],0,(g.doorBottom-g.doorTop)/r[3],hinge,g.doorTop);
 c.drawImage(officeAtlas,...r,0,0,r[2],r[3]);c.restore();
}
function paintOfficeWindow(w,lit,L,T){
 if(!officeReady())return false;
 const st=winSt(w),open=st==='open';ctx.fillStyle='#101c29';ctx.fillRect(-L/2,-T/2,L,T);
 ctx.fillStyle=lit?'#b5a783':'#496a85';ctx.fillRect(-L/2+4,-T/2+3,open?L*.31:L-8,T-6);
 officeBlit(ctx,'windowFrame',-L/2-2,-T/2-2,L+4,T+4);
 ctx.fillStyle='#889fa8';ctx.fillRect(open?-L*.18:-1,-T/2+2,2,T-4);
 if(st==='lock'){ctx.fillStyle='#d1ae65';ctx.fillRect(-3,-2,5,5);}
 if(st==='bar'){ctx.fillStyle='#101922';for(let x=-L/2+6;x<L/2-3;x+=8)ctx.fillRect(x,-T/2,2,T);}
 return true;
}
function refreshOfficeArt(){
 if(!officeArtDirty||!S||!mapC)return;
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;officeArtDirty=false;}finally{setLayer(layer);}
}
