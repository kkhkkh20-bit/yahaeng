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
function drawPurchasedBridge(p,x,y,w,h){
 if(!purchasedReady())return false;
 ctx.save();ctx.translate(x+w/2,y+h/2);if(!p.ew)ctx.rotate(Math.PI/2);const length=p.ew?w:h,depth=p.ew?h:w;
 ctx.fillStyle='#080f1b55';ctx.fillRect(-length/2+5,-depth/2+10,length,depth);
 purchasedRepeat(ctx,'bridgeDeck',-length/2,-depth/2,length,depth);
 purchasedRepeat(ctx,'rail',-length/2,-depth/2-10,length,24);
 purchasedRepeat(ctx,'rail',-length/2,depth/2-14,length,24);ctx.restore();return true;
}
function drawPurchasedCargo(c,tx,ty){
 if(!purchasedReady())return false;const r=purchasedFrame('parcel'),w=Math.min(42,r[2]*1.5),h=r[3]*w/r[2];c.save();c.fillStyle='#08121a44';c.beginPath();c.ellipse(tc(tx)+2,(ty+1)*TILE-7,20,6,0,0,TAU);c.fill();purchasedBlit(c,'parcel',tc(tx)-w/2,(ty+1)*TILE-h-5,w,h);purchasedBlit(c,'parcel',tc(tx)-w/2-2,(ty+1)*TILE-h*1.85-5,w,h);c.restore();return true;
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
function drawPurchasedCabinet(h,part,c,open){
 if(!purchasedReady()||!officeReady())return false;
 const g=cabinetGeometry(h),key=g.locker?'lockerSteel':'wardrobeWood',r=purchasedFrame(key),w=g.right-g.left,H=g.bottom-g.top;
 c.save();
 if(part!=='front'){
  c.fillStyle='#08111c55';c.fillRect(g.left+3,h.ty*TILE+7,w+3,(h.h||1)*TILE-9);
  purchasedBlit(c,key,g.left,g.top,w,H);c.fillStyle='#0c1420';c.fillRect(g.doorLeft,g.doorTop,g.doorRight-g.doorLeft,g.doorBottom-g.doorTop);
 }
 if(part!=='back'){
  const count=g.locker?1:2,leaf=(g.doorRight-g.doorLeft)/count,angle=clamp(open,0,1)*Math.PI*.48,projection=leaf*Math.cos(angle),depth=Math.sin(angle)*9;
  for(let i=0;i<count;i++){
   const side=i===1?-1:1,hinge=i===1?g.doorRight:g.doorLeft;
   c.save();c.transform(side*projection/(r[2]/count),depth/(r[2]/count),0,(g.doorBottom-g.doorTop)/r[3],hinge,g.doorTop);
   c.drawImage(purchasedAtlas,r[0]+(i===1?r[2]/2:0),r[1],r[2]/count,r[3],0,0,r[2]/count,r[3]);c.restore();
  }
  // The original bottom plinth is the front occluder throughout hiding.
  c.drawImage(purchasedAtlas,r[0],r[1]+r[3]-4,r[2],4,g.left,g.bottom-9,w,8);
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
 if(!purchasedReady())return false;
 const xs=p.cells.map(a=>a[0]),ys=p.cells.map(a=>a[1]),x=Math.min(...xs)*TILE,y=Math.min(...ys)*TILE,w=(Math.max(...xs)-Math.min(...xs)+1)*TILE,h=(Math.max(...ys)-Math.min(...ys)+1)*TILE;
 purchasedRepeat(c,'wallPanel',x,y-16,w,h+16);purchasedRepeat(c,'bridgeDeck',x,y-16,w,12);
 const l=S.ladders.find(l=>l.kind==='stair'&&l.tx===p.sx&&l.ty===p.sy),d=l?.roofDoor;
 if(d&&!STAGE.agentStudy){c.save();c.beginPath();c.rect(x,y-16,w,h+16);c.clip();purchasedBlit(c,'doorExterior',d.x-14,d.y-32,28,33);c.restore();}return true;
}
