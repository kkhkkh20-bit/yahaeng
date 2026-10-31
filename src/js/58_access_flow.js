// Hands, covers and the passage use the same world contact point.
const ACCESS_WORK=.6;
function fixtureGrip(h,open=0) {
  if(h.type==='sign')return{x:h.x-24,y:h.y-12};
  if(h.type==='vent'){const g=ventGeometry(h.source||h);return{x:g.x+open*10,y:g.y-4-open*12};}
  if(h.furn&&h.type!=='bed'){
    const g=cabinetGeometry(h),leaf=(g.doorRight-g.doorLeft)/(g.locker?1:2),p=leaf*Math.cos(open*Math.PI*.48);
    return{x:g.doorLeft+p-Math.min(5,p*.25),y:g.doorTop+(g.doorBottom-g.doorTop)*.78+Math.sin(open*Math.PI*.48)*9};
  }
  if(h.type==='box')return{x:h.x,y:h.y-24+18*Math.cos(open*1.35)-24*Math.sin(open*1.35)};
  return{x:h.x+open*29,y:h.y-open*15};
}
function workOpen(p,closing=false){const f=hideEase((p-.24)/.42);return closing?1-f:f;}
function accessHandSample(h,stand,p,closing=false,high=false) {
  p=clamp(p,0,1);const key=playerKey(S.player),anim=high||h.furn?'openHigh':'openLow',m=PR.bodies?.[prSplit(key)[1]]||PR,[,n]=m.anims[anim]||PR.anims[anim],frame=Math.round(p*(n-1));
  const face=Math.atan2(h.y-stand.y,h.x-stand.x),turn=closing?1-hideEase(p/.2)+hideEase((p-.8)/.2):0,a=face+Math.PI*turn;
  const row=prDir(a),hands=m[anim+'Hands']?.[row]?.[frame]||PR[anim+'Hands']?.[row]?.[frame],scale=m.scales?.[anim]||PR.scales?.[anim]||1,gy=m.grounds?.[anim]??PR.grounds?.[anim]??PR.groundY;
  const at=fixtureGrip(h,workOpen(p,closing)),weight=closing?hideEase((p-.2)/.14)*hideEase((.8-p)/.12):hideEase(p/.3)*hideEase((1-p)/.25);let x=stand.x,y=stand.y;
  if(hands){const hx=(hands[0][0]+hands[1][0])/2,hy=(hands[0][1]+hands[1][1])/2;x+=(at.x-(hx-PR.fr/2)*scale-x)*weight;y+=(at.y-13-(hy-gy)*scale-y)*weight;}
  return{x,y,a,anim,frame,outside:true,contact:at,weight};
}
// The trailing forearm stays above the lip while the person pulls the cover shut from inside.
function drawInsideCoverHand(h,open,weight) {
  if(h.furn||weight<=0)return;const g=h.type==='vent'?ventGeometry(h.source||h):{x:h.x,y:h.y+(h.type==='box'?-18:0)},at=fixtureGrip(h,open),pal=prPalette(...prSplit(playerKey(S.player)))||PR_PAL.ninja;
  ctx.save();ctx.globalAlpha=.85*weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=pal[2];ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(g.x-8,g.y+5);ctx.quadraticCurveTo((g.x+at.x)/2-5,g.y-7,at.x-2,at.y+2);ctx.stroke();
  ctx.fillStyle=pal[0];ctx.beginPath();ctx.ellipse(at.x,at.y,2.8,2,0,0,TAU);ctx.fill();ctx.restore();
}
function hideWork(T) {
  const F=T.hideFlow,at=T.t-F.walk;
  if(at>=0&&at<(F.handPre||0))return{p:at/F.handPre,closing:false};
  const end=(F.handPre||0)+F.duration;
  if(F.handPost&&at>=end)return{p:clamp((at-end)/F.handPost,0,1),closing:true};
  return null;
}
function ventKind(v){return v.roof?'roof':v.street?'wall':'floor';}
function ventName(v){return({roof:'옥상 환기함',wall:'외벽 환기구',floor:'바닥 환풍구'})[ventKind(v)];}
function ventGeometry(v){const kind=ventKind(v);return{x:v.x,y:v.y-(kind==='roof'?22:kind==='wall'?24:0),rim:v.y+(kind==='floor'?10:-3),kind};}
function ventFixture(v){return{type:'vent',source:v,x:v.x,y:v.y,tx:v.tx,ty:v.ty,z:v.z||0,fl:0};}
function drawVent(v,part='all',c=ctx,open=v.open?1:0) {
  const g=ventGeometry(v),x=g.x,y=g.y;c.save();
  if(part!=='front'){
    c.fillStyle='#080d0f66';c.beginPath();c.ellipse(x+3,v.y+14,25,9,0,0,TAU);c.fill();
    if(g.kind!=='floor'){
      c.fillStyle='#424b49';c.fillRect(x-23,y+1,46,v.y-y+11);c.fillStyle='#242e2d';c.fillRect(x-19,y+7,38,v.y-y);
      c.strokeStyle='#707974';c.lineWidth=2;c.strokeRect(x-23,y,46,v.y-y+11);
      c.fillStyle='#17201f';for(let i=0;i<3;i++)c.fillRect(x-16,v.y-6+i*5,32,2);
      if(g.kind==='roof'){c.fillStyle='#6d7770';c.fillRect(x-25,y-6,50,7);c.fillStyle='#273330';c.fillRect(x-27,y-8,54,3);}
    }else{c.fillStyle='#282f2c';c.beginPath();c.ellipse(x,y+4,25,16,0,0,TAU);c.fill();}
    c.fillStyle='#090f10';c.fillRect(x-18,y-12,36,24);c.strokeStyle='#757f74';c.lineWidth=2;c.strokeRect(x-20,y-14,40,28);
    // A visible throat and ladder sit below a floor opening; a hood sits above the roof.
    if(open>.05){c.strokeStyle='#3b4842';c.lineWidth=2;for(const dx of [-9,9]){c.beginPath();c.moveTo(x+dx,y+2);c.lineTo(x+dx,y+11);c.stroke();}c.beginPath();c.moveTo(x-9,y+7);c.lineTo(x+9,y+7);c.stroke();}
    c.save();c.translate(x+open*10,y-12-open*14);const height=24*(1-open*.7);c.fillStyle='#59645d';c.strokeStyle='#92998a';c.lineWidth=1.5;c.fillRect(-18,0,36,height);c.strokeRect(-18,0,36,height);
    c.strokeStyle='#26322d';for(let i=1;i<5;i++){c.beginPath();c.moveTo(-14,i*height/5);c.lineTo(14,i*height/5);c.stroke();}c.restore();
    c.fillStyle='#a0a28a';for(const dx of [-22,20])c.fillRect(x+dx,y-15,3,4);
  }
  if(part!=='back'){c.strokeStyle='#8b9385';c.lineWidth=2;c.beginPath();c.moveTo(x-20,y+14);c.lineTo(x+20,y+14);c.stroke();}
  c.restore();
}
function accessStand(h,z,dir) {
  const L0=CUR_F;setLayer(0);const P=S.player,sol=solidFor(z),candidates=[];
  for(const [nx,ny]of N8){const tx=h.tx+nx,ty=h.ty+ny;if(!inMap(tx,ty)||sol(tx,ty))continue;if(nx&&ny&&(sol(h.tx+nx,h.ty)||sol(h.tx,h.ty+ny)))continue;
    const at={x:h.x+nx*26,y:h.y+ny*26},points=[{x:P.x,y:P.y}];let length=0;
    if(!dir){const sx=Math.floor(P.x/TILE),sy=Math.floor(P.y/TILE),same=sx===tx&&sy===ty,path=same?[]:astar(sx,sy,tx,ty,sol);if(!same&&!path.length)continue;
      for(const p of path)if(dist(points.at(-1).x,points.at(-1).y,p.x,p.y)>2)points.push(p);points.push(at);for(let i=1;i<points.length;i++)length+=dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);if(length>180)continue;}
    const score=dir?-(nx*dir.x+ny*dir.y)/Math.hypot(nx,ny):length+(ny===1?0:25);candidates.push({...at,points,length,score});}
  setLayer(L0);return candidates.sort((a,b)=>a.score-b.score)[0]||null;
}
function beginAccessFlow(kind,obj) {
  const P=S.player;if(!obj||!['ventIn','ventOut','sewerDown','surface'].includes(kind)||actionBusy(P)||P.carrying||P.captive||P.wire||P.ledge)return false;const vent=kind.startsWith('vent'),exit=kind==='ventOut'||kind==='surface',h=vent?ventFixture(obj):obj,z=vent?obj.z||0:0;
  if(vent&&!S.vents.includes(obj)||!vent&&!S.hides.includes(obj))return false;
  if(vent&&(exit?!P.vent:P.vent||P.under||P.hide||(P.z||0)!==z||flOf(P)))return false;
  if(exit&&(flOf(P)||dist(P.x,P.y,h.x,h.y)>(vent?36:50)))return false;
  if(!vent&&(h.type!=='well'||flOf(h)||(h.z||0)))return false;
  if(kind==='surface'&&(!P.under||!ugAt(obj.tx,obj.ty)))return false;
  if(kind==='sewerDown'&&(P.hide!==obj||!ugAt(obj.tx,obj.ty)))return false;
  if(!exit&&kind!=='sewerDown'&&!objectReachable(h,64))return false;
  const stand=accessStand(h,z,exit?{x:0,y:1}:null);if(!stand&&kind!=='sewerDown'){toast('출입할 공간이 없다',1.4);return false;}
  const at=stand||{x:h.x,y:h.y+36},pre=!exit&&kind!=='sewerDown'?ACCESS_WORK:0,post=exit?ACCESS_WORK:0,walk=!exit&&kind!=='sewerDown'?at.length/125:0;
  const F={kind,obj,h,hx:h.x,hy:h.y,z,exit,stand:at,from:{x:P.x,y:P.y,z:P.z||0,fl:flOf(P),vent:!!P.vent,under:!!P.under,hide:P.hide},walk,pre,post,core:.85,crossed:false,t:0};
  startTrav({pts:[{x:P.x,y:P.y,f:0},{x:at.x,y:at.y,f:1}],dur:walk+pre+F.core+post,phases:[{to:1,pose:'access'}],local:true,accessFlow:F});closeEnvPicker();return true;
}
function accessProgress(F){return clamp((F.t-F.walk-F.pre)/F.core,0,1);}
function accessOpen(F){const q=F.t-F.walk;if(q<0)return 0;if(q<F.pre)return workOpen(q/F.pre);const c=accessProgress(F);if(F.post&&q>=F.pre+F.core)return workOpen((q-F.pre-F.core)/F.post,true);return F.exit?clamp(c/.2,0,1):Math.min(1,clamp((1-c)/.14,0,1));}
function accessActorSample(F) {
  const p=accessProgress(F),q=F.t-F.walk,h=F.h,g=h.type==='vent'?ventGeometry(F.obj):{x:h.x,y:h.y,rim:h.y+8};
  if(F.t<F.walk){const at=hideRoutePoint(F.stand.points,F.t*125);return{...at,a:Math.atan2(F.stand.y-at.y,F.stand.x-at.x),anim:'walk',frame:-1,outside:true};}
  if(q<F.pre)return accessHandSample(h,F.stand,q/F.pre,false,F.obj.street||F.obj.roof);
  if(F.post&&q>=F.pre+F.core)return accessHandSample(h,F.stand,(q-F.pre-F.core)/F.post,true,F.obj.street||F.obj.roof);
  if(F.kind==='sewerDown')return{x:h.x,y:h.y+10+p*42,a:-Math.PI/2,anim:'climb',frame:Math.floor(p*7)%4,outside:false,rim:h.y+10};
  const t=F.exit?1-p:p,r=1-t,u=hideEase(t),x=F.stand.x+(g.x-F.stand.x)*u,y=r*r*F.stand.y+2*r*t*(g.rim-56)+t*t*(g.rim+42);
  return{x,y,a:Math.atan2(g.y-F.stand.y,g.x-F.stand.x)+(F.exit?Math.PI:0),anim:'duck',frame:Math.round(clamp(t/.65,0,1)*8),outside:t<.42,rim:g.rim};
}
function updateAccessFlow(P,dt) {
  const T=P.trav,F=T.accessFlow;T.t+=dt;F.t=T.t;
  if((F.h.type==='vent'?!S.vents.includes(F.obj):!S.hides.includes(F.obj))||F.obj.x!==F.hx||F.obj.y!==F.hy){P.trav=null;Object.assign(P,F.from);return;}
  const p=accessProgress(F),s=accessActorSample(F),q=F.t-F.walk;P.x=s.x;P.y=s.y;
  if(q>=F.pre&&q<=F.pre+F.core){const u=hideEase(p);P.x=F.kind==='sewerDown'?F.h.x:F.exit?F.h.x+(F.stand.x-F.h.x)*u:F.stand.x+(F.h.x-F.stand.x)*u;P.y=F.kind==='sewerDown'?F.h.y:F.exit?F.h.y+(F.stand.y-F.h.y)*u:F.stand.y+(F.h.y-F.stand.y)*u;}P.a=s.a;P.moving=F.t<F.walk;P.vx=P.vy=0;
  if(!F.crossed&&p>=(F.exit?.08:.94)){F.crossed=true;
    if(F.kind==='ventIn'){P.vent=true;P.z=0;P.fl=0;S.stats.vents=(S.stats.vents||0)+1;}
    if(F.kind==='ventOut'){P.vent=false;P.z=F.z;P.fl=0;}
    if(F.kind==='sewerDown'){P.hide=null;P.under=true;P.z=0;P.fl=0;}
    if(F.kind==='surface'){P.under=false;P.hide=null;P.z=0;P.fl=0;}
    RC=null;
  }
  P.hidden=!!(P.vent||P.under||P.hide)||!s.outside;P.light=P.hidden?0:lightAt(P.x,P.y,!!P.z);
  if(F.h.type==='vent')F.obj.open=accessOpen(F)>.25;
  if(!F.sound&&F.t>=F.walk+.12){F.sound=true;play('metal',.3);noise(F.h.x,F.h.y,35,'vent',0,F.z);}
  if(F.t>=T.dur){P.trav=null;P.moving=false;P.x=F.exit?F.stand.x:F.h.x;P.y=F.exit?F.stand.y:F.h.y;if(F.obj.open!=null)F.obj.open=false;if(F.kind==='surface')F.obj.spotted=false;RC=null;}
}
function drawAccessFlow() {
  const P=S.player,T=P.trav,F=T?.accessFlow;if(!F)return;const s=accessActorSample(F),h=F.h,old=playerInkKey;playerInkKey=isTouch?playerKey(P):null;
  try{
    drawLitContainer(h,'back');ctx.save();if(!s.outside){ctx.beginPath();ctx.rect(h.x-140,h.y-220,280,220+(s.rim??h.y+10)-h.y);ctx.clip();}
    drawPR(playerKey(P),s.x,s.y,s.a,s.anim,T.t,1,1,s.anim==='climb'?14:0,s.frame);ctx.restore();const p=accessProgress(F),q=F.exit?p:1-p;if(F.t>=F.walk+F.pre&&F.t<F.walk+F.pre+F.core&&q<.22)drawInsideCoverHand(h,accessOpen(F),hideEase(q/.06)*hideEase((.22-q)/.08));drawLitContainer(h,'front');
  }finally{playerInkKey=old;}
}
