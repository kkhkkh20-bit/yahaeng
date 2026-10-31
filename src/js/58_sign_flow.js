// A suspended object has a reachable fixing, intact chains and one delayed impact.
function signGeometry(t) {
  const b=BLD[bldAt(t.at[0],t.at[1])],x=tc(t.at[0]),y=tc(t.at[1]);
  return{x,y,z:rLv(t.at[0],t.at[1]),boardY:y+38,w:t.text==='실외기'?64:88,h:t.text==='실외기'?34:24,appliance:t.text==='실외기',b};
}
function signPosition(t) {
  const g=signGeometry(t);if(t.wreck)return{x:t.wreck.x,y:t.wreck.y,angle:.15};
  if(t.fall){const u=clamp(t.fall.t/t.fall.dur,0,1);return{x:g.x+(t.fall.x-g.x)*u,y:g.boardY+(t.fall.y-g.boardY)*u*u,angle:u*.18};}
  return{x:g.x+Math.sin(S.t*1.6+(t.i||0))*.7,y:g.boardY,angle:Math.sin(S.t*1.6+(t.i||0))*.007};
}
function signBounds(t){const g=signGeometry(t),p=signPosition(t);return{x:Math.min(g.x-g.w/2-12,p.x-g.w/2-12),y:Math.min(g.y-24,p.y-g.h/2-12),w:g.w+28,h:Math.max(g.y+20,p.y+g.h/2+14)-Math.min(g.y-24,p.y-g.h/2-12)};}
function signFixture(t){const g=signGeometry(t);return{type:'sign',trap:t,x:g.x,y:g.y,tx:t.at[0],ty:t.at[1],z:g.z,fl:0};}
function signReplacesFacade(b,r){return r===0&&(S.traps||[]).some(t=>t.k==='drop'&&t.text!=='실외기'&&signGeometry(t).b===b);}
function drawHangingSign(t,part='all',c=ctx) {
  const g=signGeometry(t),p=signPosition(t);c.save();
  if(!t.wreck){
    c.lineWidth=4;c.strokeStyle='#424b48';for(const dx of [-29,29]){c.beginPath();c.moveTo(g.x+dx,g.y-18);c.lineTo(g.x+dx,g.y+7);c.lineTo(g.x+dx+8,g.y+10);c.stroke();}
    c.fillStyle='#8f9687';for(const dx of [-29,29]){c.fillRect(g.x+dx-3,g.y-16,6,5);}
    c.lineWidth=1.6;c.strokeStyle='#899183';c.setLineDash([2,2]);
    for(const dx of [-28,28]){c.beginPath();c.moveTo(g.x+dx+5,g.y+8);c.lineTo(t.used?g.x+dx+7:p.x+dx,t.used?g.y+15:p.y-g.h/2);c.stroke();}c.setLineDash([]);
  }
  if(!t.wreck&&t.used&&!t.fall){c.restore();return;}
  c.translate(p.x,p.y);c.rotate(p.angle);if(t.wreck&&!g.appliance)c.scale(1,.45);c.fillStyle='#05090870';c.fillRect(-g.w/2+3,-g.h/2+5,g.w,g.h);
  c.fillStyle=g.appliance?'#626c67':'#333f3c';c.fillRect(-g.w/2,-g.h/2,g.w,g.h);c.strokeStyle='#939785';c.lineWidth=2;c.strokeRect(-g.w/2,-g.h/2,g.w,g.h);
  if(g.appliance){c.strokeStyle='#26322e';c.beginPath();c.arc(10,0,11,0,TAU);c.stroke();for(let k=0;k<4;k++){c.beginPath();c.moveTo(-24,-9+k*6);c.lineTo(-7,-9+k*6);c.stroke();}}
  else{c.fillStyle='#d4cfb8';c.font='600 13px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(t.text||'간판',0,1,g.w-8);}
  c.restore();
}
function canReleaseSign(t) {
  const P=S.player;if(!t||t.k!=='drop'||t.used||t.busy||P.under||P.vent||P.wire||P.ledge||P.jump||P.hide||P.carrying||P.captive||flOf(P))return false;
  const g=signGeometry(t);return g.z>0&&P.z===g.z&&objectReachable({x:g.x,y:g.y,z:g.z,fl:0},42);
}
function beginSignRelease(t) {
  const P=S.player;if(P.trav||!canReleaseSign(t))return false;
  const h=signFixture(t),F={t,h,stand:{x:P.x,y:P.y},fl:flOf(P),z:P.z||0,x:h.x,y:h.y,started:false};t.busy=true;
  startTrav({pts:[{x:P.x,y:P.y,f:0},{x:P.x,y:P.y,f:1}],dur:.75,phases:[{to:1,pose:'release'}],local:true,signFlow:F});return true;
}
function signWorkSample(F,p){const h=F.h;return accessHandSample(h,F.stand,p,false,true);}
function updateSignRelease(P,dt) {
  const T=P.trav,F=T.signFlow,t=F.t;T.t+=dt;const p=clamp(T.t/T.dur,0,1);
  if(!S.traps.includes(t)||flOf(P)!==F.fl||P.z!==F.z||tc(t.at[0])!==F.x||tc(t.at[1])!==F.y){t.busy=false;P.trav=null;P.x=F.stand.x;P.y=F.stand.y;return;}
  const s=signWorkSample(F,p);P.x=s.x;P.y=s.y;P.a=s.a;P.moving=false;P.vx=P.vy=0;
  if(!F.started&&p>=.65){F.started=true;t.used=true;t.busy=false;const g=signGeometry(t);t.fall={t:0,dur:.5+g.z*.08,x:(t.hit[0]+t.hit[2]+1)/2*TILE,y:(t.hit[1]+t.hit[3]+1)/2*TILE};play('metal',.45);}
  if(p>=1){P.trav=null;P.x=F.stand.x;P.y=F.stand.y;RC=null;}
}
function drawSignWork(){const P=S.player,T=P.trav,F=T?.signFlow;if(!F)return;const s=signWorkSample(F,clamp(T.t/T.dur,0,1)),old=playerInkKey;playerInkKey=isTouch?playerKey(P):null;try{drawPR(playerKey(P),s.x,s.y,s.a,s.anim,0,1,1,0,s.frame);}finally{playerInkKey=old;}}
function updateFallingSigns(dt) {
  for(const t of S.traps||[]){if(!t.fall)continue;t.fall.t+=dt;if(t.fall.t<t.fall.dur)continue;
    const p={x:t.fall.x,y:t.fall.y};t.fall=null;t.wreck=p;let n=0;
    for(const g of S.guards)if(!g.child&&!flOf(g)&&!g.z&&g.state!=='DEAD'&&inZone(g,t.hit)){accidentKill(g,'fall');n++;}
    play('thud',.8);play('metal',.55);noise(p.x,p.y,260,'crash',0,0);S.shakeT=.18;
    if(n)toast(`${signGeometry(t).appliance?'실외기':'간판'}에 ${n}명이 깔렸다`,2,'good');
  }
}
function drawHangingSigns(openB=-1) {
  for(const t of S.traps||[]){if(t.k!=='drop')continue;const g=signGeometry(t),p=signPosition(t);
    if(!inView(p.x,p.y,170)&&!inView(g.x,g.y,100))continue;if(!S.player.z&&!S.player.vent&&!t.fall&&!t.wreck&&g.b===BLD[openB])continue;
    drawLitContainer(signFixture(t));
    if(!t.used&&S.player.z===g.z&&dist(S.player.x,S.player.y,g.x,g.y)<100){ctx.fillStyle='#d2c7a3';ctx.fillRect(g.x-3,g.y-12,6,6);}
  }
}
