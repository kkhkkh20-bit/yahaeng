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
 if(south){
  // Clip a square source module; stretching 32px to 48x36 distorts its pixels.
  c.save();c.beginPath();c.rect(x,y+12,TILE,TILE-12);c.clip();officeBlit(c,p.wall,x,y,TILE,TILE);c.restore();
  c.fillStyle='#849097';c.fillRect(x,y+10,TILE,2);c.fillStyle='#35444e';c.fillRect(x,y+TILE-4,TILE,3);
 }
 else{
  // Visible side faces use the same purchased wall material as the front face.
  for(const [dx,left]of [[-1,true],[1,false]])if(!['#','N','V'].includes(G[ty]?.[tx+dx]||'V')){
   c.save();c.beginPath();c.rect(left?x:x+TILE-18,y,18,TILE);c.clip();officeBlit(c,p.wall,x,y,TILE,TILE);c.restore();
   c.fillStyle='#849097';c.fillRect(left?x+17:x+TILE-18,y,1,TILE);
  }
  c.fillStyle='#536068';c.fillRect(x+22,y,4,TILE);
 }
 return true;
}
function officeFurnKey(f){
 if(!STAGE.officeArt)return null;
 const authored=STAGE.officeArt.furniture?.find(a=>a.x===f.x&&a.y===f.y&&(a.fl||0)===(f.fl||0)&&a.t===f.t);
 if(authored&&officeFrame(authored.art))return authored.art;
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
 if(f.t==='chair'||f.t==='chairD'){
  const executive=style===OFFICE_STYLES.executive&&FURN.some(a=>flOf(a)===flOf(f)&&(a.t==='desk'||a.t==='desk2')&&a.x===f.x&&Math.abs(a.y-f.y)===1&&officeFurnKey(a)==='deskExecutive');
  const prefix=executive?'chairRed':[OFFICE_STYLES.executive,OFFICE_STYLES.estate,OFFICE_STYLES.club].includes(style)?'chairLounge':'chairBlue';
  return prefix+['','E','Back','W'][r];
 }
 if(f.t==='sofa'||f.t==='sofaV')return [OFFICE_STYLES.executive,OFFICE_STYLES.estate,OFFICE_STYLES.club].includes(style)?'chairLounge':'chairBlue';
 return{cab:style.warm?'filesGold':'filesBlue',safe:null,shelf:f.skin==='freight'?'counterWood':style===OFFICE_STYLES.security?'monitorRackBlue':style.warm?'cabinetWood':'cabinetBlue',pc:'deskLaptop',counter:style.warm?'counterWood':'counterGlass',bar:'counterWood',fridge:null,plant:style.warm?'plant':'plantBlue',board:'board',medcab:'filesBlue',pot:'tableRound'}[f.t]||null;
}
function officeFurnBounds(f){
 const key=officeFurnKey(f),r=officeFrame(key);if(!r)return null;
 const maxW=f.w*TILE-6,maxH=f.h*TILE+(['shelf','cab','medcab','fridge'].includes(f.t)?30:18);
 const chair=f.t==='chair'||f.t==='chairD'||f.t==='sofa'||f.t==='sofaV';
 const scale=Math.min(chair?(key.startsWith('chairRed')?1:1.5):1.5,maxW/r[2],maxH/r[3]);
 const w=Math.round(r[2]*scale),h=Math.round(r[3]*scale);
 return{key,x:f.x*TILE+(f.w*TILE-w)/2,y:(f.y+f.h)*TILE-h-3,w,h};
}
function drawOfficeFurn(c,f,shadow){
 if(!officeReady())return false;
 const b=officeFurnBounds(f);if(!b)return false;
 c.save();if(shadow){c.fillStyle='#09121a33';c.beginPath();c.ellipse((f.x+f.w/2)*TILE+3,(f.y+f.h)*TILE-5,f.w*TILE*.42,7,0,0,TAU);c.fill();}
 if(f.t==='sofa'||f.t==='sofaV'){
  const count=Math.max(f.w,f.h),r=officeFrame(b.key),s=Math.min(b.key.startsWith('chairRed')?1:1.5,(TILE-8)/r[2],(TILE+6)/r[3]);
  for(let i=0;i<count;i++){const w=r[2]*s,h=r[3]*s;officeBlit(c,b.key,f.x*TILE+(TILE-w)/2+(f.w>1?i*TILE:0),(f.y+1)*TILE-h-3+(f.h>1?i*TILE:0),w,h);}
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
function officeDecorLayout(fl){
 if(!officeReady())return [];
 const placed=[];
 for(const d of STAGE.officeArt.decor||[]){
  if(d.fl!==fl)continue;
  const b=BLD[d.b],r=officeFrame(d.art);if(!b||!r)continue;
  const w=Math.min(d.w||64,r[2]*1.5,TILE*(b.x1-b.x0-1)),h=w*r[3]/r[2],y=b.y0*TILE+TILE-h-3;
  const target=Math.round(b.x0+1+(b.x1-b.x0-2)*d.u),candidates=[];
  for(let tx=b.x0+1;tx<b.x1;tx++)candidates.push(tx);
  candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));
  for(const tx of candidates){
   const x=tc(tx)-w/2,right=x+w;let clear=x>=(b.x0+1)*TILE&&right<=b.x1*TILE;
   for(let xx=Math.floor(x/TILE);xx<=Math.floor((right-1)/TILE);xx++)if(G[b.y0]?.[xx]!=='#'||G[b.y0+1]?.[xx]==='#')clear=false;
   if(!clear||placed.some(a=>a.b===d.b&&a.x<right+8&&a.x+a.w>x-8))continue;
   if(S.lamps.some(l=>flOf(l)===fl&&l.control&&l.control.ty===b.y0&&tc(l.control.tx)>x-12&&tc(l.control.tx)<right+12))continue;
   if(FURN.some(f=>{if(flOf(f)!==fl||f.y>b.y0+1)return false;const a=officeFurnBounds(f);return a&&a.x<right&&a.x+a.w>x&&a.y<y+h&&a.y+a.h>y;}))continue;
   placed.push({...d,x,y,w,h});break;
  }
 }
 return placed;
}
function officeWallDecor(c,fl,x0,y0,x1,y1){
 for(const d of officeDecorLayout(fl)){
  const b=BLD[d.b];if(b.x1<x0||b.x0>x1||b.y1<y0||b.y0>y1)continue;
  officeBlit(c,d.art,d.x,d.y,d.w,d.h);
 }
}
function drawOfficeLamp(l,c=ctx){
 if(!officeReady()||!l.fixture)return false;
 const f=l.fixture,on=lampOn(l),style=officeStyle(bldAt(Math.floor(l.x/TILE),Math.floor(l.y/TILE)),flOf(l));
 const warm=[OFFICE_STYLES.executive,OFFICE_STYLES.estate,OFFICE_STYLES.club].includes(style);
 c.save();c.translate(f.x,f.y);if(!f.ny)c.rotate(Math.PI/2);
 c.fillStyle='#111c27';c.fillRect(-16,-4,32,9);
 c.save();if(!on)c.globalAlpha*=.5;officeBlit(c,warm?'warmLamp':'fluorescent',-15,-4,30,7);c.restore();
 // A small diffuser within a real mounting bracket. No luminous window frame.
 c.fillStyle=on?(warm?'#d0b98a':'#b9d2d0'):'#46555f';c.fillRect(-5,-2,10,3);
 if(on){c.fillStyle=warm?'#e1d0a7':'#d4e6dc';c.fillRect(-4,-2,8,1);}
 if(l.broken){c.fillStyle='#18232d';c.fillRect(-2,-3,2,5);}
 c.restore();return true;
}
function officeCabinetLeaf(c,g,hinge,side,projection,depth){
 if(!officeReady()||projection<1)return;
 const key=g.locker?'lockerSteel':'wardrobeWood',r=officeFrame(key);if(!r)return;
 c.save();c.transform(side*projection/r[2],depth/r[2],0,(g.doorBottom-g.doorTop)/r[3],hinge,g.doorTop);
 c.drawImage(officeAtlas,...r,0,0,r[2],r[3]);c.restore();
}
const officeWindowImages=new Map();
function officeWindowImage(w,lit,L=40,T=26){
 if(!officeReady())return null;
 L=Math.max(16,Math.round(L));T=Math.max(12,Math.round(T));
 const state=winSt(w),key=state+'|'+Number(lit)+'|'+L+'|'+T;
 if(officeWindowImages.has(key))return officeWindowImages.get(key);
 const r=officeFrame('windowFrame'),c=document.createElement('canvas');c.width=L;c.height=T;
 const q=c.getContext('2d');q.imageSmoothingEnabled=false;
 q.fillStyle='#101b26';q.fillRect(0,0,L,T);
 q.fillStyle=lit?'#857b64':'#354f63';q.fillRect(4,4,L-8,T-8);
 q.fillStyle=lit?'#6d6b61':'#2b4056';q.fillRect(4,Math.floor(T*.55),L-8,T-4-Math.floor(T*.55));
 q.fillStyle=lit?'#a39a7e':'#587087';q.fillRect(5,5,Math.floor((L-10)*.4),1);
 const open=state==='open',join=open?Math.floor(L*.42):Math.floor(L/2);
 if(open){q.fillStyle='#101a24';q.fillRect(join+2,4,L-join-6,T-8);}
 q.fillStyle='#56616e';q.fillRect(join,3,2,T-6);
 // Keep source corner and jamb thickness instead of stretching the whole frame.
 const xs=[[0,3,0,3],[3,r[2]-6,3,L-6],[r[2]-3,3,L-3,3]];
 const ys=[[0,3,0,3],[3,r[3]-6,3,T-6],[r[3]-3,3,T-3,3]];
 for(let xi=0;xi<3;xi++)for(let yi=0;yi<3;yi++){
  if(xi===1&&yi===1)continue;const[sx,sw,dx,dw]=xs[xi],[sy,sh,dy,dh]=ys[yi];
  q.drawImage(officeAtlas,r[0]+sx,r[1]+sy,sw,sh,dx,dy,dw,dh);
 }
 q.fillStyle=state==='lock'?'#b59b6d':'#75818b';q.fillRect(join-2,Math.floor(T*.6),3,2);
 if(state==='bar'){q.fillStyle='#17232f';for(let x=8;x<L-5;x+=8){q.fillRect(x,3,2,T-6);q.fillStyle='#53606a';q.fillRect(x,3,1,T-6);q.fillStyle='#17232f';}}
 officeWindowImages.set(key,c);return c;
}
function paintOfficeWindow(w,lit,L=40,T=26){
 const im=officeWindowImage(w,lit,L,T);if(!im)return false;
 ctx.fillStyle='#0d1822';ctx.fillRect(-im.width/2-2,-im.height/2-2,im.width+4,im.height+5);
 ctx.drawImage(im,-im.width/2,-im.height/2);
 ctx.fillStyle='#465460';ctx.fillRect(-im.width/2-2,im.height/2,im.width+4,4);
 ctx.fillStyle='#687580';ctx.fillRect(-im.width/2-1,im.height/2,im.width+2,1);return true;
}
function paintOfficeSideWindow(w,lit,side){
 if(!officeReady())return false;
 const st=winSt(w),open=st==='open';
 // A cut in the wall seen from above, with jambs seated in the masonry.
 // No freestanding front-facing card or protruding sill in the alley.
 ctx.fillStyle='#0d1721';ctx.fillRect(-6,-18,12,36);
 ctx.fillStyle='#485663';ctx.fillRect(-5,-17,10,2);ctx.fillRect(-5,15,10,2);
 ctx.fillStyle='#253441';ctx.fillRect(-4,-15,8,30);
 ctx.fillStyle=lit?'#827860':'#354c60';ctx.fillRect(-3,-14,6,open?12:28);
 ctx.fillStyle='#5b6874';ctx.fillRect(-4,open?-1:0,8,2);
 if(st==='bar'){ctx.fillStyle='#192632';for(let y=-10;y<14;y+=7)ctx.fillRect(-4,y,8,2);}
 if(st==='lock'){ctx.fillStyle='#ad9469';ctx.fillRect(side<0?-4:2,1,2,3);}
 return true;
}
function refreshOfficeArt(){
 if(!officeArtDirty||!S||!mapC)return;
 const layer=CUR_F;try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;for(const k in lightCache)delete lightCache[k];officeArtDirty=false;}finally{setLayer(layer);}
}
