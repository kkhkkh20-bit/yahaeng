// 수거함은 뚜껑·입구·앞판을 같은 좌표로 그린다. 결과는 몸이 들어간 뒤 한 번만 적용한다.
function hideSpace(h, bodies=0, self=false) {
  const occupied=h.type==='box'?((S.player.hide===h?1:0)+(self&&S.player.hide!==h?1:0)):0;
  return (h.bodies||0)+bodies+occupied<=(h.cap??Infinity);
}
function hideFootprint(h) {
  const it=h.furn?FURN.find(it=>it.x===h.tx&&it.y===h.ty&&(it.fl||0)===flOf(h)&&(it.t===h.type||h.type==='bed'&&it.t==='cbed')):null;
  const w=h.w||it?.w||1,v=h.h||it?.h||1;
  return {x0:h.tx*TILE,y0:h.ty*TILE,x1:(h.tx+w)*TILE,y1:(h.ty+v)*TILE,w,h:v,it};
}
function hideDistance(h,P=S.player) {
  if(!h.furn)return dist(P.x,P.y,h.x,h.y);
  const b=hideFootprint(h);return dist(P.x,P.y,clamp(P.x,b.x0,b.x1),clamp(P.y,b.y0,b.y1));
}
function cabinetGeometry(h) {
  const b=hideFootprint(h),locker=h.type==='locker',inset=locker?5:4;
  const left=b.x0+inset,right=b.x1-inset,top=b.y0-(locker?58:63),bottom=b.y1-5;
  return {left,right,top,bottom,doorLeft:left+3,doorRight:right-3,doorTop:top+5,doorBottom:bottom-8,locker};
}
function cabinetAperture(h,open) {
  const g=cabinetGeometry(h),w=g.doorRight-g.doorLeft,leaf=w/(g.locker?1:2),panel=leaf*Math.cos(clamp(open,0,1)*Math.PI*.48);
  return {...g,x:g.doorLeft+panel,y:g.doorTop,w:Math.max(0,w-panel*(g.locker?1:2)),h:g.doorBottom-g.doorTop};
}
function drawCabinet(h,part='all',target=ctx,open=0) {
  const c=target,g=cabinetGeometry(h),w=g.right-g.left,H=g.bottom-g.top,steel=g.locker;
  c.save();
  if(part!=='front'){
    c.fillStyle='#070b0d66';c.fillRect(g.left+3,h.ty*TILE+7,w+3,(h.h||1)*TILE-9);
    c.fillStyle=steel?'#687786':'#806449';c.fillRect(g.left,g.top,w,H-3);
    c.fillStyle=steel?'#9ba8b2':'#a48460';c.fillRect(g.left,g.top,w,4);
    c.fillStyle='#0d1416';c.fillRect(g.doorLeft,g.doorTop,g.doorRight-g.doorLeft,g.doorBottom-g.doorTop);
    c.fillStyle=steel?'#29373d':'#392d23';c.fillRect(g.doorLeft+3,g.doorTop+4,g.doorRight-g.doorLeft-6,3);
    c.strokeStyle=steel?'#9aa7ad':'#ad906c';c.lineWidth=1;c.strokeRect(g.left+.5,g.top+.5,w-1,H-4);
    c.fillStyle='#172023';c.fillRect(g.left+1,g.bottom-3,3,5);c.fillRect(g.right-4,g.bottom-3,3,5);
  }
  if(part!=='back'){
    const count=steel?1:2,leaf=(g.doorRight-g.doorLeft)/count,angle=clamp(open,0,1)*Math.PI*.48,projection=leaf*Math.cos(angle),depth=Math.sin(angle)*9;
    for(let i=0;i<count;i++){
      const side=i===1?-1:1,hinge=i===1?g.doorRight:g.doorLeft,edge=hinge+side*projection;
      c.fillStyle=steel?'#81909e':i?'#987653':'#a28059';c.strokeStyle=steel?'#566572':'#624c36';c.lineWidth=1;
      c.beginPath();c.moveTo(hinge,g.doorTop);c.lineTo(edge,g.doorTop+depth);c.lineTo(edge,g.doorBottom+depth);c.lineTo(hinge,g.doorBottom);c.closePath();c.fill();c.stroke();
      const wide=Math.abs(projection),hx=edge-side*Math.min(5,wide*.25),hy=(g.doorTop+g.doorBottom)/2+depth;
      c.strokeStyle=steel?'#2d3c45':'#5d4733';c.lineWidth=2;c.beginPath();c.moveTo(hx,hy-4);c.lineTo(hx,hy+4);c.stroke();
      if(steel&&wide>8){c.strokeStyle='#52636f';c.lineWidth=1;for(let k=0;k<3;k++){c.beginPath();c.moveTo(hinge+side*wide*.2,g.doorTop+12+k*4+depth*.2);c.lineTo(hinge+side*wide*.75,g.doorTop+12+k*4+depth*.75);c.stroke();}}
    }
    c.fillStyle=steel?'#4b5c68':'#684f38';c.fillRect(g.left+1,g.bottom-9,w-2,3);
  }
  c.restore();
}
function hideGeometry(h) {
  const b=hideFootprint(h),f=h.furn;
  return {x:h.x,y:f?h.y:h.y-(h.type==='well'?4:10),rim:f?b.y1-6:h.y+(h.type==='well'?8:-5),back:f?b.y0:h.y-23,left:f?b.x0:h.x-28,right:f?b.x1:h.x+28,footprint:b};
}
function hidePerimeter(h) {
  const b=hideFootprint(h),points=[];
  for(let x=h.tx;x<b.x1/TILE;x++){points.push({tx:x,ty:h.ty-1,nx:0,ny:-1},{tx:x,ty:b.y1/TILE,nx:0,ny:1});}
  for(let y=h.ty;y<b.y1/TILE;y++){points.push({tx:h.tx-1,ty:y,nx:-1,ny:0},{tx:b.x1/TILE,ty:y,nx:1,ny:0});}
  return points;
}
function hideApproach(h) {
  const P=S.player,L0=CUR_F;setLayer(flOf(P));
  if(h.type==='bush'){setLayer(L0);return{points:[{x:P.x,y:P.y}],stand:{x:P.x,y:P.y},length:0};}
  let best=null;
  for(const {tx,ty,nx,ny}of hidePerimeter(h)){
    if(!inMap(tx,ty)||solidFor(P.z||0)(tx,ty))continue;
    const same=Math.floor(P.x/TILE)===tx&&Math.floor(P.y/TILE)===ty;
    const path=same?[]:astar(Math.floor(P.x/TILE),Math.floor(P.y/TILE),tx,ty);
    if(!same&&!path.length)continue;
    const stand=h.furn?{x:tc(tx),y:tc(ty)}:{x:h.x+nx*38,y:h.y+ny*38},points=[{x:P.x,y:P.y}];
    for(const p of path)if(dist(points.at(-1).x,points.at(-1).y,p.x,p.y)>2)points.push({x:p.x,y:p.y});
    points.push(stand);let length=0;for(let i=1;i<points.length;i++)length+=dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
    const score=length+(h.type==='box'&&ny!==1?320:0)+(h.furn&&h.type!=='bed'&&ny!==1?160:0);
    if(!best||score<best.score)best={points,stand,length,score};
  }
  setLayer(L0);return best;
}
function hideExitPoint(h,dir) {
  const P=S.player,L0=CUR_F;setLayer(flOf(P));
  dir=dir||(P.hideFrom?{x:P.hideFrom.x-h.x,y:P.hideFrom.y-h.y}:{x:Math.cos(P.a),y:Math.sin(P.a)});
  let best=null,score=-Infinity;const len=Math.hypot(dir.x,dir.y)||1;
  // Cabinet doors and beds use the whole footprint, including old checkpoints.
  const candidates=h.furn?hidePerimeter(h):N8.map(([nx,ny])=>({tx:h.tx+nx,ty:h.ty+ny,nx,ny}));
  for(const {tx,ty,nx,ny}of candidates){
    const solid=solidFor(P.z||0);if(!inMap(tx,ty)||solid(tx,ty))continue;
    if(!h.furn&&nx&&ny&&(solid(h.tx+nx,h.ty)||solid(h.tx,h.ty+ny)))continue;
    const dx=tc(tx)-h.x,dy=tc(ty)-h.y,s=(dx*dir.x+dy*dir.y)/Math.hypot(dx,dy)/len;
    if(s>score){score=s;best={x:tc(tx),y:tc(ty)};}
  }
  setLayer(L0);return best;
}
function beginHideFlow(kind,h,subject=null,dir=null) {
  const P=S.player;if(P.trav)return false;
  const needBody=kind==='stash'||kind==='drag',needSelf=kind==='enter'||kind==='drag';
  if(kind!=='exit'&&!hideSpace(h,needBody?1:0,needSelf)){toast(withJosa(hideName(h),'은/는')+' 가득 찼다',1.4);return true;}
  if(kind!=='exit'&&!objectReachable(h,64))return false;
  const exit=kind==='exit'?hideExitPoint(h,dir):null;
  if(kind==='exit'&&!exit){toast('나올 공간이 없다',1.4);return true;}
  const route=kind==='exit'?{points:[],stand:exit,length:0}:hideApproach(h);if(!route)return false;
  const g=kind==='drag'?subject:null,c=kind==='stash'?subject:null;
  if(g&&P.captive!==g||c&&P.carrying!==c)return false;
  const walk=route.length/130,duration=kind==='drag'?1.7:kind==='stash'?1.15:h.type==='box'?1.05:1.1;
  const F={kind,h,g,c,route,walk,duration,geo:hideGeometry(h),from:{x:P.x,y:P.y},hx:h.x,hy:h.y,fl:flOf(P),z:P.z||0,committed:false,held:0,holding:true,intent:g?{...(g.takedownIntent||{lethal:false})}:null};
  if(g){g.containerMoving=true;g.doomed=true;}
  startTrav({pts:[{x:P.x,y:P.y,f:0},{x:route.stand.x,y:route.stand.y,f:1}],dur:walk+duration,phases:[{to:1,pose:'container'}],hideB:h,local:true,hideFlow:F});
  if(kind==='exit')S.hideExitLock=true;
  closeEnvPicker();return true;
}
function hideFlowProgress(T) {const F=T.hideFlow;return clamp((T.t-F.walk)/F.duration,0,1);}
function hideFlowOpen(T) {const f=hideFlowProgress(T);return Math.min(clamp((f-.02)/.14,0,1),clamp((1-f)/(T.hideFlow.h.furn?.16:.06),0,1));}
function hideRoutePoint(points,d) {
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=dist(a.x,a.y,b.x,b.y);if(d<=len){const k=len?d/len:1;return{x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k};}d-=len;}
  return points.at(-1);
}
function cancelHideFlow(P,T) {
  const F=T.hideFlow;if(F.g){F.g.containerMoving=false;F.g.doomed=false;if(F.g.state==='DEAD'&&P.captive===F.g)P.captive=null;}
  if(F.c&&!S.corpses.includes(F.c)&&P.carrying===F.c)P.carrying=null;
  P.trav=null;P.moving=false;if(!P.hide){P.x=F.from.x;P.y=F.from.y;}RC=null;
}
function updateHideFlow(P,dt) {
  const T=P.trav,F=T.hideFlow,h=F.h;T.t+=dt;
  if(!S.hides.includes(h)&&!(S.bushes||[]).includes(h)){cancelHideFlow(P,T);return;}
  if(flOf(h)!==F.fl||(h.z||0)!==F.z||h.x!==F.hx||h.y!==F.hy){cancelHideFlow(P,T);return;}
  if(flOf(P)!==F.fl||(P.z||0)!==F.z||F.g&&!F.committed&&(P.captive!==F.g||F.g.state!=='CAPTIVE')||F.c&&!F.committed&&(P.carrying!==F.c||!S.corpses.includes(F.c))){cancelHideFlow(P,T);return;}
  if(F.intent){if(F.holding&&combatHeld(F.intent.source))F.held+=dt;else F.holding=false;}
  F.witnessed=F.witnessed||S.guards.some(g=>g.seen&&flOf(g)===F.fl&&(g.z||0)===F.z&&!['DEAD','CAPTIVE'].includes(g.state));
  const f=hideFlowProgress(T),walking=T.t<F.walk;
  P.vx=P.vy=0;P.moving=walking;P.hidden=!!P.hide;P.light=P.hide?0:lightAt(P.x,P.y,!!P.z);
  if(walking){const at=hideRoutePoint(F.route.points,T.t*130);P.a=Math.atan2(at.y-P.y,at.x-P.x);P.x=at.x;P.y=at.y;return;}
  const at=F.route.stand;
  if(F.kind==='exit'){
    if(f>.18)P.hide=null;
    const u=hideEase((f-.38)/.46);P.x=h.x+(at.x-h.x)*u;P.y=h.y+(at.y-h.y)*u;P.a=Math.atan2(at.y-h.y,at.x-h.x);
  }else{
    P.a=Math.atan2(F.geo.y-at.y,h.x-at.x);
    const u=F.kind==='enter'?hideEase((f-.16)/.78):F.kind==='drag'?hideEase((f-.52)/.42):0;
    P.x=at.x+(h.x-at.x)*u;P.y=at.y+(h.y-at.y)*u;
    const contact=F.kind==='stash'?.73:F.kind==='drag'?.69:.96;
    if(!F.committed&&f>=contact){
      if(!hideSpace(h,F.kind==='enter'?0:1,F.kind!=='stash')){cancelHideFlow(P,T);toast(withJosa(hideName(h),'은/는')+' 가득 찼다',1.4);return;}
      F.committed=true;
      if(F.c){const c=F.c;c.carried=false;c.stashed=true;c.container=h;c.x=h.x;c.y=h.y;c.fl=flOf(h);c.z=h.z||0;P.carrying=null;h.bodies=(h.bodies||0)+1;S.stats.stashed++;}
      if(F.g){const g=F.g;g.containerMoving=false;g.doomed=false;g.takedownIntent={...F.intent,lethal:F.intent.lethal||(F.holding&&F.held>=LETHAL_HOLD),container:h};P.captive=null;
        killGuard(g,h.type==='bush'?'bush':'stash',h,true);if(S.koHold?.g===g)S.koHold.t0=S.t-F.held;S.stats.special++;
      }
      if(F.kind==='enter')enterHideNow(h,false,true,F.witnessed);
      play(h.type==='bush'?'cloth':'drop',.25);
    }
    if(F.kind==='drag'&&F.committed&&!P.hide&&f>=.96){enterHideNow(h,false,true,F.witnessed);}
  }
  if(!F.opened&&f>.08){F.opened=true;play(h.type==='bush'||h.furn?'cloth':'metal',.25);}
  if(!F.closed&&f>.94){F.closed=true;play(h.type==='bush'||h.furn?'cloth':'metal',.2);}
  if(T.t>=T.dur){
    P.trav=null;P.moving=false;if(F.kind==='stash'||F.kind==='exit'){P.x=at.x;P.y=at.y;}else if(P.hide){P.x=h.x;P.y=h.y;}
    if(F.kind==='exit')h.spotted=false;RC=null;
  }
}
// 대형 수거함: 바퀴·넓은 입구·뒤쪽 경첩·회전하는 뚜껑. 앞판은 사람을 넣는 동안 몸의 아래를 가린다.
function containerOpen(h) {
  const T=S.player.trav;if(T?.hideFlow?.h===h)return hideFlowOpen(T);
  const A=S.amb;if(A?.h===h){const f=A.t/AMB_DUR;return Math.min(clamp(f/.18,0,1),clamp((1-f)/.16,0,1));}
  return 0;
}
function drawContainer(h,part='all',target=ctx,open=containerOpen(h)) {
  const ctx=target,x=h.x,y=h.y;ctx.save();ctx.translate(x,y);
  if(h.type==='box'){
    if(part!=='front'){
      ctx.fillStyle='#07101199';ctx.beginPath();ctx.ellipse(3,22,32,9,0,0,TAU);ctx.fill();
      ctx.fillStyle='#151d1b';for(const dx of [-19,19]){ctx.fillRect(dx-3,14,6,9);ctx.beginPath();ctx.arc(dx,22,4,0,TAU);ctx.fill();}
      ctx.fillStyle='#26372f';ctx.fillRect(-27,-19,54,34);ctx.strokeStyle='#839184';ctx.lineWidth=2;ctx.strokeRect(-27,-19,54,34);
      ctx.fillStyle='#050c0c';ctx.fillRect(-24,-20,48,17);ctx.fillStyle='#15261d';ctx.fillRect(-22,-18,44,13);
      if(open>.05){ctx.fillStyle='#050b0a';ctx.fillRect(-22,-18,44,13);}
      const tip=-23+18*Math.cos(open*1.35)-24*Math.sin(open*1.35);
      ctx.fillStyle=open>.5?'#506453':'#465b4b';ctx.strokeStyle='#98a18a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-28,-23);ctx.lineTo(28,-23);ctx.lineTo(29,tip);ctx.lineTo(-29,tip);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#26382c';ctx.lineWidth=2;for(const dx of [-17,0,17]){ctx.beginPath();ctx.moveTo(dx,-21);ctx.lineTo(dx,tip-2);ctx.stroke();}
      ctx.fillStyle='#171f1a';ctx.fillRect(-7,tip-2,14,3);ctx.fillStyle='#a0a48c';ctx.fillRect(-24,-25,7,3);ctx.fillRect(17,-25,7,3);
    }
    if(part!=='back'){
      ctx.fillStyle='#31463b';ctx.beginPath();ctx.moveTo(-27,-4);ctx.lineTo(27,-4);ctx.lineTo(24,18);ctx.lineTo(-24,18);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#718271';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-27,-4);ctx.lineTo(27,-4);ctx.stroke();
      ctx.strokeStyle='#1e3028';for(const dx of [-18,-9,9,18]){ctx.beginPath();ctx.moveTo(dx,1);ctx.lineTo(dx*.9,14);ctx.stroke();}
      ctx.fillStyle='#b9bd9b';ctx.fillRect(-7,2,14,9);ctx.strokeStyle='#3f5544';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(0,4);ctx.lineTo(4,7);ctx.lineTo(0,9);ctx.closePath();ctx.stroke();
      ctx.fillStyle='#9ca88a66';for(const [dx,dy]of [[-21,8],[18,13],[-10,15]])ctx.fillRect(dx,dy,3,1);
      ctx.fillStyle='#82917c';ctx.fillRect(-30,0,5,8);ctx.fillRect(25,0,5,8);
    }
  }else if(h.furn&&h.type!=='bed'){ctx.restore();drawCabinet(h,part,target,open);return;
  }else if(h.type==='well'&&part==='front'){ctx.strokeStyle='#8b9489';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,22,14,0,0,Math.PI);ctx.stroke();
  }else if(h.type==='well'){
    ctx.fillStyle='#080e12';ctx.beginPath();ctx.ellipse(0,0,22,14,0,0,TAU);ctx.fill();ctx.strokeStyle='#75807c';ctx.lineWidth=3;ctx.stroke();
    ctx.save();ctx.translate(open*29,-open*15);ctx.fillStyle='#3b4544';ctx.beginPath();ctx.ellipse(0,0,19,12,0,0,TAU);ctx.fill();ctx.strokeStyle='#97a09a';ctx.lineWidth=1.5;ctx.stroke();
    ctx.strokeStyle='#222c2c';for(let dx=-10;dx<=10;dx+=5){ctx.beginPath();ctx.moveTo(dx,-7);ctx.lineTo(dx,7);ctx.stroke();}ctx.restore();
  }
  ctx.restore();
}
// 닫힌 시설은 두 장의 작은 그림을 공유하고, 동작 중인 시설만 부품을 그린다.
const hideFixtureCache={};
function drawHideFixtures() {
  for(const h of S.hides){if(!['box','well'].includes(h.type)||flOf(h)||!inView(h.x,h.y,90))continue;
    if(S.player.trav?.hideFlow?.h===h||S.amb?.h===h)continue;
    let image=hideFixtureCache[h.type];if(!image){image=document.createElement('canvas');image.width=80;image.height=96;drawContainer({type:h.type,x:40,y:58},'all',image.getContext('2d'),0);hideFixtureCache[h.type]=image;}
    ctx.drawImage(image,h.x-40,h.y-58);
  }
}
function drawHideFlowVisual() {
  const P=S.player,T=P.trav,F=T?.hideFlow,A=S.amb;
  const h=F?.h||(['box','well'].includes(A?.h?.type)?A.h:null);if(!h)return;
  const old=playerInkKey;playerInkKey=isTouch?playerKey(P):null;
  try{
    drawContainer(h,'back');
    if(F)drawHideFlowActors(P,T);
    else drawContainerAmbush(A);
    drawContainer(h,'front');
    if(F&&hideActorOutside(T))drawHideFlowHero(P,T);
    if(F&&hideFlowTargetOutside(T))drawHideFlowTarget(P,T);
  }finally{playerInkKey=old;}
}
const hideEase = v => {const t=clamp(v,0,1);return t*t*(3-2*t);};
// A single continuous root and pose phase drives both rendering and occlusion.
// Moving behind the lip is allowed only while the feet already clear it.
function hideHeroSample(P,T) {
  const F=T.hideFlow,f=hideFlowProgress(T),h=F.h,at=F.route.stand,exit=F.kind==='exit';
  if(T.t<F.walk)return{x:P.x,y:P.y,anim:F.c?'carry':F.g?'grab':'walk',frame:-1,outside:true};
  if(F.kind==='stash')return{x:at.x,y:at.y,anim:f<.26?'carryI':f<.65?'lift':f<.85?'stoop':'idleC',frame:f<.42?1:0,outside:true};
  if(F.kind==='drag'&&f<.52)return{x:at.x,y:at.y,anim:'grabI',frame:0,outside:true};
  const q=exit?1-f:F.kind==='drag'?clamp((f-.52)/.48,0,1):f;
  if(h.furn||h.type==='bush'){
    const u=hideEase((q-.16)/.64),bed=h.type==='bed',cabinet=h.furn&&!bed;
    const x=at.x+(h.x-at.x)*u,y=at.y+(h.y-at.y)*u+(bed?u*12:cabinet?-u*15:0);
    const pose=clamp((q-.06)/.32,0,1),moving=u>0&&u<1;
    return{x,y,anim:cabinet?(moving?'walk':'idleC'):'duck',frame:cabinet?(moving?-1:0):Math.round(pose*8),outside:true,inside:cabinet&&u>=.99};
  }
  const t=clamp((q-.14)/.74,0,1),r=1-t,rim=F.geo.rim,control=rim-(h.type==='well'?80:96),end=rim+40;
  const x=r*r*at.x+(1-r*r)*h.x,y=r*r*at.y+2*r*t*control+t*t*end;
  return{x,y,anim:h.type==='well'?'duck':'hide',frame:Math.round(t*(h.type==='well'?8:16)),outside:t<.53,visible:q<.96};
}
function hideActorOutside(T) {return hideHeroSample(S.player,T).outside;}
function drawHideFlowHero(P,T) {
  const F=T.hideFlow,h=F.h,s=hideHeroSample(P,T);if(s.visible===false)return;
  ctx.save();
  if(!s.outside){ctx.beginPath();ctx.rect(h.x-140,h.y-200,280,200+F.geo.rim-h.y);ctx.clip();}
  if(h.furn&&h.type!=='bed'?s.inside:h.furn||h.type==='bush')clipHideFurniture(T);
  drawPR(playerKey(P),s.x,s.y,P.a,s.anim,T.t,1,1,0,s.frame);ctx.restore();
  if(T.t<F.walk){const other=F.c?carryKey(F.c):F.g?charOf(F.g):null;if(other)drawPR(other,P.x,P.y,P.a,F.c?'carried':'held',T.t);}
}
function clipHideFurniture(T) {
  const F=T.hideFlow,h=F.h,b=F.geo.footprint;ctx.beginPath();ctx.rect(h.x-240,h.y-260,480,520);
  if(h.furn&&h.type!=='bed'){
    const g=cabinetAperture(h,hideFlowOpen(T));ctx.rect(g.left,g.top,g.right-g.left,g.bottom-g.top+5);ctx.rect(g.x,g.y,g.w,g.h);
  }else ctx.rect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
  ctx.clip('evenodd');
}
function hideFlowTargetOutside(T) {
  const F=T.hideFlow;if(T.t<F.walk||(!F.h.furn&&F.committed)||!F.c&&!F.g)return false;
  const f=hideFlowProgress(T),u=F.c?clamp((f-.28)/.45,0,1):clamp((f-.26)/.43,0,1);
  return F.h.furn||F.h.type==='bush'||u<.65;
}
function drawHideFlowTarget(P,T) {
  const F=T.hideFlow,f=hideFlowProgress(T),h=F.h,at=F.route.stand;if((F.committed&&!h.furn&&h.type!=='bush')||T.t<F.walk||!F.c&&!F.g)return;
  const u=F.c?clamp((f-.28)/.45,0,1):clamp((f-.26)/.43,0,1),furn=h.furn||h.type==='bush',move=furn?hideEase(u):clamp((u-.40)/.25,0,1),drop=furn?0:clamp((u-.65)/.35,0,1)*85;
  const x=at.x+(h.x-at.x)*move,y=at.y+((furn?h.y:F.geo.y)-at.y)*move+drop+(h.type==='bed'?12*move:0);
  ctx.save();if(furn){if(!h.furn||h.type==='bed'||move>=.99)clipHideFurniture(T);}else if(u>=.65){ctx.beginPath();ctx.rect(h.x-160,h.y-220,320,220+F.geo.rim-h.y);ctx.clip();}
  if(F.c)drawPR(carryKey(F.c),x,y,P.a,furn&&u>.55?(h.type==='bed'?'death':'crouch'):f<.26?'carriedI':'lifted',0,1,1,0,furn&&h.type==='bed'&&u>.55?5:f<.42?1:0);
  if(F.g)drawPR(charOf(F.g),x,y,P.a,u<.65?'heldI':'crouch',0);
  ctx.restore();
}
function drawHideFlowActors(P,T) {
  if(!hideActorOutside(T))drawHideFlowHero(P,T);
  if(!hideFlowTargetOutside(T))drawHideFlowTarget(P,T);
}
function drawContainerAmbush(A) {
  const h=A.h,P=S.player,f=clamp(A.t/AMB_DUR,0,1),u=clamp((f-.22)/.55,0,1),g=A.g,geo=hideGeometry(h),a=Math.atan2(A.y0-h.y,A.x0-h.x);
  ctx.save();ctx.beginPath();ctx.rect(h.x-140,h.y-220,280,220+geo.rim-h.y);ctx.clip();
  if(f<.7)drawPR(playerKey(P),h.x,h.y+13,a,'grabI',0,1,1,Math.sin(f*Math.PI)*14);
  drawPR(charOf(g),g.x+(h.x-g.x)*u,g.y+(geo.y-g.y)*u+Math.max(0,u-.4)*105,a,u<.5?'heldI':'crouch',0);
  ctx.restore();
}
