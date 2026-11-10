// Functional fixtures use selected owned pixels; gameplay geometry stays authoritative.
const purchasedArt=A.purchasedDetails||null,purchasedAtlas=new Image();let purchasedDirty=false;
purchasedAtlas.onload=()=>{purchasedDirty=true;};if(purchasedArt)purchasedAtlas.src=purchasedArt.src;
function purchasedReady(){return !window.__PURCHASED_BASELINE__&&!!purchasedArt&&purchasedAtlas.complete&&purchasedAtlas.naturalWidth>0;}
function purchasedFrame(name){return purchasedArt?.frames[name]?.rect;}
function purchasedBlit(c,name,x,y,w,h){const r=purchasedFrame(name);if(!r||!purchasedReady())return false;c.imageSmoothingEnabled=false;c.drawImage(purchasedAtlas,...r,Math.round(x),Math.round(y),Math.round(w??r[2]*1.5),Math.round(h??r[3]*1.5));return true;}
function purchasedRepeat(c,name,x,y,w,h,scale=1.5){const r=purchasedFrame(name);if(!r||!purchasedReady())return false;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();for(let yy=y;yy<y+h;yy+=r[3]*scale)for(let xx=x;xx<x+w;xx+=r[2]*scale)purchasedBlit(c,name,xx,yy,r[2]*scale,r[3]*scale);c.restore();return true;}
function refreshPurchasedArt(){
 if(!purchasedDirty||!S||!mapC)return;purchasedDirty=false;const layer=CUR_F;
 try{setLayer(0);mapC=bigify(renderMap());S.floorC={};miniBase=null;for(const k in hideFixtureCache)delete hideFixtureCache[k];for(const b of BLD)b.cityPropsC=null;}finally{setLayer(layer);}
}
function drawPurchasedStairs(c,tx,ty){
 if(!purchasedReady())return false;
 const g=stairFloor(tx,ty,CUR_F),[dx,dy]=g.d,cx=(tx+.5+dx/2)*TILE,cy=(ty+.5+dy/2)*TILE,rot=Math.atan2(-dy,-dx)+Math.PI/2;
 const flight=(x,y,down)=>{c.save();c.translate(x,y);c.rotate(rot);c.fillStyle='#111923';c.fillRect(-24,-48,48,96);purchasedRepeat(c,'stairTreads',-21,-48,42,96);if(down){const shade=c.createLinearGradient(0,-48,0,48);shade.addColorStop(0,'#080e19e8');shade.addColorStop(1,'#080e1922');c.fillStyle=shade;c.fillRect(-21,-48,42,96);}purchasedRepeat(c,'pipe',-24,-48,3,96);purchasedRepeat(c,'pipe',21,-48,3,96);c.restore();};
 flight(cx,cy,false);if(CUR_F>0&&g.well)flight(cx+g.well.s[0]*TILE,cy+g.well.s[1]*TILE,true);return true;
}
function drawPurchasedLadder(c,x,y,h=42){
 if(!purchasedReady())return false;const r=purchasedFrame('ladder');c.save();c.beginPath();c.rect(x-15,y,30,h);c.clip();for(let yy=y;yy<y+h;yy+=r[3]*1.5)purchasedBlit(c,'ladder',x-r[2]*.75,yy);c.restore();return true;
}
function purchasedBridgeBounds(p){
 const x=p.x0*TILE-(p.ew&&p.a?8:0),y=p.y0*TILE-(!p.ew&&p.a?8:0),w=(p.x1-p.x0+1)*TILE+(p.ew?((p.a?8:0)+(p.b?8:0)):0),h=(p.y1-p.y0+1)*TILE+(!p.ew?((p.a?8:0)+(p.b?8:0)):0);return{x,y,w,h};
}
function drawPurchasedBridge(p,x,y,w,h,part='all'){
 if(!purchasedReady())return false;
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(part!=='front'){
  ctx.fillStyle='#080f1b55';ctx.fillRect(x+5,y+10,w,h);
  // Rotate just the floor when the route runs north/south. A front-facing
  // railing cannot be rotated sideways and still read as an upright rail.
  if(p.ew)purchasedRepeat(ctx,'bridgeDeck',x,y,w,h);
  else{ctx.save();ctx.translate(x,y+h);ctx.rotate(-Math.PI/2);purchasedRepeat(ctx,'bridgeDeck',0,0,h,w);ctx.restore();}
  ctx.fillStyle='#0e1a2530';ctx.fillRect(x,y,w,h);
  if(p.ew){purchasedRepeat(ctx,'rail',x,y-15,w,15);purchasedBlit(ctx,'bridgePost',x+w-4.5,y-15,4.5,15);}
 }
 if(part!=='back'){
  if(p.ew){purchasedRepeat(ctx,'rail',x,y+h-15,w,15);purchasedBlit(ctx,'bridgePost',x+w-4.5,y+h-15,4.5,15);}
  else{purchasedBlit(ctx,'bridgeSideRail',x-1,y,4.5,h);purchasedBlit(ctx,'bridgeSideRail',x+w-3.5,y,4.5,h);}
 }
 ctx.restore();return true;
}
function drawPurchasedCargo(c,tx,ty){
 if(drawPurchasedPropCargo(c,tx,ty))return true;
 if(!purchasedReady())return false;const r=purchasedFrame('parcel'),scale=Math.min(2,42/r[2]),w=r[2]*scale,h=r[3]*scale;
 c.save();c.fillStyle='#08121a44';c.beginPath();c.ellipse(tc(tx)+2,(ty+1)*TILE-5,w*.45,5,0,0,TAU);c.fill();
 // The source already contains two grounded cartons supporting a third. Draw
 // this arrangement once; duplicating the whole pile creates floating cartons.
 purchasedBlit(c,'parcel',tc(tx)-w/2,(ty+1)*TILE-h-5,w,h);c.restore();return true;
}
function drawPurchasedFreight(c,f,shadow){
 if(!purchasedReady())return false;
 if(shadow){c.save();c.fillStyle='#09121b44';c.fillRect(f.x*TILE+4,(f.y+f.h)*TILE-8,f.w*TILE-8,12);c.restore();}
 // Real storage cabinets keep their source aspect; no hand-painted carton grid.
 const count=Math.max(1,f.w),r=purchasedFrame('cabinetBlue'),scale=Math.min(1.5,(TILE-6)/r[2],(f.h*TILE+40)/r[3]);
 for(let i=0;i<count;i++)purchasedBlit(c,'cabinetBlue',(f.x+i)*TILE+(TILE-r[2]*scale)/2,(f.y+f.h)*TILE-r[3]*scale-3,r[2]*scale,r[3]*scale);return true;
}
function drawPurchasedDoor(d){
 if(!purchasedReady())return false;const bi=bldAt(d.tx,d.ty),style=officeStyle(bi,flOf(d)),wood=style===OFFICE_STYLES.residence||style===OFFICE_STYLES.estate,key=wood?'doorWood':'doorOffice',r=purchasedFrame(key),a=doorVisualOpen(d)*Math.PI/2;
 ctx.save();ctx.translate(d.x,d.y);if(!d.horiz)ctx.rotate(Math.PI/2);
 ctx.fillStyle='#0a1520';ctx.fillRect(-24,-7,48,14);
 // Project the purchased jamb and leaf into the existing top-down hinge plane.
 purchasedBlit(ctx,key,-24,-7,5,14);purchasedBlit(ctx,key,19,-7,5,14);
 ctx.save();ctx.transform(Math.cos(a),Math.sin(a),-Math.sin(a)*.22,Math.cos(a),-19,-6);ctx.drawImage(purchasedAtlas,...r,0,0,38,10);ctx.restore();
 if(d.locked&&doorVisualOpen(d)<.2&&d.keyLock){ctx.fillStyle='#b59d69';ctx.fillRect(-3,-2,6,4);}ctx.restore();return true;
}
function purchasedCabinetLeaves(h,open){
 const g=cabinetGeometry(h),key=g.locker?'lockerSteel':'wardrobeWood',spec=purchasedArt?.frames[key],leafW=(g.doorRight-g.doorLeft)/g.doors,H=g.doorBottom-g.doorTop,angle=clamp(open,0,1)*cabinetMaxAngle(h),projection=leafW*Math.cos(angle),depth=Math.sin(angle)*9;
 return Array.from({length:g.doors},(_,i)=>{const side=i===1?-1:1,hinge=i===1?g.doorRight:g.doorLeft,rect=spec.leafRects[i],handleInset=i===1?3.75:5.25,u=1-handleInset/leafW;return{i,side,hinge,leafW,projection,depth,rect,key,handleInset,handle:{x:hinge+side*projection*u,y:g.doorTop+H*.78+depth*u}};});
}
function drawPurchasedCabinetLeaf(c,spec,leaf,H){
 const r=spec.rect,[sx,sy,sw,sh]=leaf.rect,W=leaf.leafW,x=leaf.side===1?0:-W,native=1.5,edge=native,[bandY,bandH]=spec.handleBand;
 const blit=(px,py,pw,ph,dx,dy,dw,dh)=>c.drawImage(purchasedAtlas,r[0]+sx+px,r[1]+sy+py,pw,ph,dx,dy,dw,dh);
 // Expand only the flat panel. Its original corners and border thickness keep
 // the same 1.5x pixels in both one-cell lockers and wide wardrobes.
 for(const [py,ph,dy,dh]of [[0,1,0,edge],[2,1,edge,H-2*edge],[sh-1,1,H-edge,edge]]){
  blit(0,py,1,ph,x,dy,edge,dh);
  blit(2,py,1,ph,x+edge,dy,W-2*edge,dh);
  blit(sw-1,py,1,ph,x+W-edge,dy,edge,dh);
 }
 // The complete knob and its adjacent flat pixels stay native-sized, anchored
 // to the meeting edge. A wide leaf must not produce a giant door handle.
 const knobX=leaf.i===1?1:4,knobW=5,knobDx=leaf.i===1?x+native:x+W-(sw-knobX)*native;
 blit(knobX,bandY,knobW,bandH,knobDx,H*.78-bandH*native/2,knobW*native,bandH*native);
}
function drawPurchasedCabinet(h,part,c,open){
 if(!purchasedReady()||!officeReady())return false;
 const g=cabinetGeometry(h),key=g.locker?'lockerSteel':'wardrobeWood',spec=purchasedArt.frames[key],r=spec.rect,w=g.right-g.left,H=g.bottom-g.top,doorH=g.doorBottom-g.doorTop;
 c.save();c.imageSmoothingEnabled=false;
 if(part!=='front'){
  c.fillStyle='#08111c55';c.fillRect(g.left+3,h.ty*TILE+7,w+3,(h.h||1)*TILE-9);
  // Only the two leaves move. Header, posts and plinth remain fixed.
  c.drawImage(purchasedAtlas,r[0],r[1],r[2],7,g.left,g.top,w,5);
  c.drawImage(purchasedAtlas,r[0],r[1]+7,2,r[3]-10,g.left,g.top+5,3,H-13);
  c.drawImage(purchasedAtlas,r[0]+r[2]-2,r[1]+7,2,r[3]-10,g.right-3,g.top+5,3,H-13);
  c.fillStyle='#0c1420';c.fillRect(g.doorLeft,g.doorTop,g.doorRight-g.doorLeft,doorH);
 }
 if(part!=='back'){
  for(const leaf of purchasedCabinetLeaves(h,open)){
   c.save();c.transform(leaf.projection/leaf.leafW,leaf.side*leaf.depth/leaf.leafW,0,1,leaf.hinge,g.doorTop);
   // Keep each source leaf's orientation: the right leaf is hinged at its
   // RIGHT edge, rather than mirroring its handle onto the outside frame.
   drawPurchasedCabinetLeaf(c,spec,leaf,doorH);
   c.restore();
  }
  c.drawImage(purchasedAtlas,r[0],r[1]+r[3]-3,r[2],3,g.left,g.bottom-8,w,8);
 }
 c.restore();return true;
}
function drawPurchasedManhole(h,part,c,open){
 if(!purchasedReady()||h.type!=='well')return false;
 c.save();if(part!=='front'){c.fillStyle='#060c15';c.beginPath();c.ellipse(h.x,h.y,22,14,0,0,TAU);c.fill();purchasedBlit(c,'manhole',h.x-22+open*29,h.y-14-open*15,44,28);}
 if(part!=='back'){const r=purchasedFrame('manhole');c.drawImage(purchasedAtlas,r[0],r[1]+Math.floor(r[3]*.7),r[2],Math.ceil(r[3]*.3),h.x-22,h.y+5,44,9);}c.restore();return true;
}
function drawPurchasedVent(v,part,c,open){
 if(!purchasedReady())return false;const g=ventGeometry(v),x=g.x,y=g.y,r=purchasedFrame('ventGrille');c.save();
 if(part!=='front'){
  c.fillStyle='#080f1b44';c.fillRect(x-21,y+5,44,v.y-y+10);
  if(g.kind!=='floor')purchasedBlit(c,g.kind==='roof'?'roofUnit':'aircon',x-24,y-4,48,v.y-y+18);
  c.fillStyle='#080f1b';c.fillRect(x-18,y-12,36,24);
  c.save();c.translate(x+open*10,y-12-open*14);c.drawImage(purchasedAtlas,...r,-18,0,36,24*(1-open*.7));c.restore();
 }
 if(part!=='back')c.drawImage(purchasedAtlas,r[0],r[1]+r[3]-2,r[2],2,x-20,y+12,40,3);
 c.restore();return true;
}
function drawPurchasedPipe(l){
 if(!purchasedReady())return false;const g=pipeGeometry(l),h=g.base.y-g.top.y;ctx.save();if(l.gas)ctx.filter='sepia(.7) saturate(1.3)';purchasedRepeat(ctx,'pipe',g.top.x-4,g.top.y,8,h);ctx.restore();return true;
}
function drawPurchasedSwitch(l,outdoor=false){
 if(!purchasedReady())return false;const p=outdoor?lampControl(l):switchVisualPoint(l);if(!p)return false;
 ctx.save();ctx.translate(p.x,p.y);const side=outdoor?false:!!p.nx;if(!side)ctx.rotate(Math.PI/2);
 purchasedBlit(ctx,'switchPlate',-4,-7,8,14);ctx.fillStyle=lampCircuitOff(l)?'#293a48':'#c4cfb1';ctx.fillRect(-1,-2,2,4);ctx.restore();return true;
}
function drawPurchasedPaper(c,key,x,y,scale=1){
 if(!purchasedReady()||!['folder','paper','parcel'].includes(key))return false;
 const name=key==='parcel'?'parcel':'paper',r=purchasedFrame(name),s=key==='parcel'?Math.min(1,25/r[2]):Math.min(1.3,20/r[2]);return purchasedBlit(c,name,x-r[2]*s*scale/2,y-r[3]*s*scale/2,r[2]*s*scale,r[3]*s*scale);
}
function drawPurchasedRoofHouse(c,p){
 if(!purchasedReady()||!freeCityReady())return false;
 const xs=p.cells.map(a=>a[0]),ys=p.cells.map(a=>a[1]),x=Math.min(...xs)*TILE,y=Math.min(...ys)*TILE,w=(Math.max(...xs)-Math.min(...xs)+1)*TILE,h=(Math.max(...ys)-Math.min(...ys)+1)*TILE;
 const l=S.ladders.find(l=>l.kind==='stair'&&l.tx===p.sx&&l.ty===p.sy),d=l?.roofDoor;
 // The old interior skirting repeated across the entire hut, with a clipped
 // wooden bridge above it. Use the same purchased masonry/roof as the building.
 const wall=freeCityPattern('wallPanel'),f=freeCityArt.frames.roofTile?.rect;if(!wall||!f)return false;
 // Roof sheets include their outer coping. Repeat only the interior field;
 // otherwise a tiny hut acquires random bands from the large roof's borders.
 let roof=freeCityPatterns.roofHouseField;
 if(!roof){const e=freeCityArt.roofSlice||4;roof=document.createElement('canvas');roof.width=(f[2]-2*e)*1.5;roof.height=(f[3]-2*e)*1.5;const q=roof.getContext('2d');q.imageSmoothingEnabled=false;q.drawImage(freeCityAtlas,f[0]+e,f[1]+e,f[2]-2*e,f[3]-2*e,0,0,roof.width,roof.height);freeCityPatterns.roofHouseField=roof;}
 c.save();c.imageSmoothingEnabled=false;
 c.fillStyle='#08111a66';c.fillRect(x+4,y+4,w,h);
 c.fillStyle=c.createPattern(wall,'repeat');c.fillRect(x,y-16,w,h+16);
 const side=p.dir==='W'||p.dir==='E',rx=x+(p.dir==='W'?12:0),rw=w-(side?12:0),ry=y-16+(p.dir==='N'?12:0),rh=h-12-(p.dir==='N'?12:0);
 c.fillStyle=c.createPattern(roof,'repeat');c.fillRect(rx,ry,rw,rh);
 c.fillStyle='#85909a';c.fillRect(rx,ry,rw,2);c.fillRect(rx,ry,2,rh);
 c.fillStyle='#1a2633';c.fillRect(rx,ry+rh-3,rw,3);c.fillRect(rx+rw-3,ry,3,rh);
 // Draw the complete source image on its wall plane. Side doors use a narrow
 // projection, rather than hiding half a front door behind a rectangular clip.
 if(d&&!STAGE.agentStudy){
  if(side)purchasedBlit(c,'doorExterior',p.dir==='W'?x-1:x+w-13,d.y-28,14,30);
  else if(p.dir==='N')purchasedBlit(c,'doorExterior',d.x-14,y-16,28,13);
  else purchasedBlit(c,'doorExterior',d.x-14,d.y-31,28,32);
 }
 c.restore();return true;
}
