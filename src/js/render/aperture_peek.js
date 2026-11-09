// Close, same-floor sight through a real window or an open door. The roof stays
// opaque everywhere else; the revealed pixels are the lit, live world beneath it.
let aperturePeekState={owner:null,opening:null,alpha:0,t:0},aperturePeekFrame=null;
const apertureScene=document.createElement('canvas'),apertureMask=document.createElement('canvas');
function aperturePeekCandidate(P=S.player,openB=S.openB){
 if(tactical||P.z||flOf(P)||P.hide||P.vent||P.under||P.trav||P.jump)return null;
 let best=null,nearest=Infinity;
 const candidates=S.windows.map(o=>({o,door:false})).concat(S.doors.filter(d=>!d.gate&&doorVisualOpen(d)>.8).map(o=>({o,door:true})));
 for(const{ o,door }of candidates){
  if(flOf(o))continue;
  const bi=bldAt(o.tx,o.ty),b=BLD[bi];if(!b||b.vacant||bi===openB)continue;
  const nx=o.tx===b.x0?-1:o.tx===b.x1?1:0,ny=nx?0:o.ty===b.y0?-1:o.ty===b.y1?1:0;if(!nx&&!ny)continue;
  const dx=P.x-o.x,dy=P.y-o.y,depth=dx*nx+dy*ny,along=dx*-ny+dy*nx;
  const d=Math.hypot(dx,dy),score=openingTargetScore(P,o);
  if(depth<24||depth>87||Math.abs(along)>30||d>95||score>=nearest)continue;
  if(!los(P.x,P.y,o.x+nx*25,o.y+ny*25))continue;
  const x=o.x-nx*26,y=o.y-ny*26;if(opaqueAt(Math.floor(x/TILE),Math.floor(y/TILE)))continue;
  nearest=score;best={opening:o,door,b:bi,nx,ny,x,y,depth,d};
 }
 return best;
}
function updateAperturePeek(P,openB){
 let state=aperturePeekState;
 if(state.owner!==S)state=aperturePeekState={owner:S,opening:null,alpha:0,t:S.t};
 const dt=clamp(S.t-state.t,0,.06);state.t=S.t;
 const c=aperturePeekCandidate(P,openB);
 if(!c){state.alpha=0;state.opening=null;return aperturePeekFrame=null;}
 if(state.opening!==c.opening){state.opening=c.opening;state.alpha=0;}
 const goal=clamp((88-c.d)/32,0,1);state.alpha+=(goal-state.alpha)*(reducedFxMotion.matches?1:1-Math.exp(-dt*13));
 if(state.alpha<.015)return aperturePeekFrame=null;
 const span=c.door?18:14,tx=-c.ny,ty=c.nx,pts=[{x:c.x-tx*span,y:c.y-ty*span}],range=TILE*3.5;
 for(let i=0;i<=28;i++){
  const u=-span+2*span*i/28,x=c.x+tx*u,y=c.y+ty*u,a=Math.atan2(y-P.y,x-P.x),r=Math.max(0,castRay(x,y,a,range)-1);
  pts.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r});
 }
 pts.push({x:c.x+tx*span,y:c.y+ty*span});
 return aperturePeekFrame={...c,alpha:state.alpha,pts,range};
}
function aperturePeekContains(o,f=aperturePeekFrame){
 if(!f||flOf(o)||(o.z||0)||bldAt(Math.floor(o.x/TILE),Math.floor(o.y/TILE))!==f.b)return false;
 let inside=false;const p=f.pts;
 for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i].y>o.y)!==(p[j].y>o.y)&&o.x<(p[j].x-p[i].x)*(o.y-p[i].y)/(p[j].y-p[i].y)+p[i].x)inside=!inside;
 return inside;
}
function aperturePeekPath(c,f){
 c.beginPath();f.pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
}
function captureAperturePeek(sc){
 const f=aperturePeekFrame;if(!f)return;
 const xs=f.pts.map(p=>p.x),ys=f.pts.map(p=>p.y),ox=W/2*DPR-cam.x*sc,oy=H/2*DPR-cam.y*sc;
 const x=Math.max(0,Math.floor(Math.min(...xs)*sc+ox)-2),y=Math.max(0,Math.floor(Math.min(...ys)*sc+oy)-2);
 const w=Math.min(canvas.width,Math.ceil(Math.max(...xs)*sc+ox)+2)-x,h=Math.min(canvas.height,Math.ceil(Math.max(...ys)*sc+oy)+2)-y;
 if(w<2||h<2)return;
 // Small reusable region buffers, not a second full-screen mobile scene.
 const aw=Math.ceil(w/64)*64,ah=Math.ceil(h/64)*64;
 if(apertureScene.width!==aw||apertureScene.height!==ah){apertureScene.width=apertureMask.width=aw;apertureScene.height=apertureMask.height=ah;}
 const q=apertureScene.getContext('2d'),m=apertureMask.getContext('2d');q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.clearRect(0,0,aw,ah);q.drawImage(canvas,x,y,w,h,0,0,w,h);
 m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,aw,ah);m.setTransform(sc,0,0,sc,ox-x,oy-y);
 const cx=f.x-f.nx*48,cy=f.y-f.ny*48,g=m.createRadialGradient(cx,cy,12,cx,cy,f.range);
 g.addColorStop(0,'#fff');g.addColorStop(.55,'rgba(255,255,255,.94)');g.addColorStop(1,'rgba(255,255,255,0)');m.fillStyle=g;aperturePeekPath(m,f);m.fill();
 q.globalCompositeOperation='destination-in';q.filter='blur('+Math.max(2,sc*3)+'px)';q.drawImage(apertureMask,0,0);q.filter='none';q.globalCompositeOperation='source-over';
 f.capture={x,y,w,h};
}
function drawAperturePeek(){
 const f=aperturePeekFrame,p=f?.capture;if(!p)return;
 const b=BLD[f.b];ctx.save();aperturePeekPath(ctx,f);ctx.clip();
 ctx.beginPath();ctx.rect((b.x0+1)*TILE,(b.y0+1)*TILE,(b.x1-b.x0-1)*TILE,(b.y1-b.y0-1)*TILE);ctx.clip();
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=f.alpha;ctx.drawImage(apertureScene,0,0,p.w,p.h,p.x,p.y,p.w,p.h);ctx.restore();
}
