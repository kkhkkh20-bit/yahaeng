// Close, same-floor sight through a real window or an open door. The roof stays
// opaque everywhere else; the revealed pixels are the lit, live world beneath it.
let aperturePeekState={owner:null,opening:null,alpha:0,t:0},aperturePeekFrame=null;
const apertureScene=document.createElement('canvas');
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
 // The entire connected room fades in continuously as the player approaches.
 // No distance threshold swaps a thin cone for a room in a single frame.
 const room=apertureRoom(c);if(!room)return aperturePeekFrame=null;
 return aperturePeekFrame={...c,alpha:state.alpha,pts:room.bounds,cells:room.cells,surfaces:room.surfaces};
}
function apertureRoom(c){
 const b=BLD[c.b],doors=new Set(S.doors.filter(d=>!flOf(d)).map(d=>d.ty*MW+d.tx));
 const cells=new Set(),queue=[[Math.floor(c.x/TILE),Math.floor(c.y/TILE)]],surfaces=[];
 for(let i=0;i<queue.length;i++){
  const [tx,ty]=queue[i],key=ty*MW+tx;
  if(cells.has(key)||tx<=b.x0||tx>=b.x1||ty<=b.y0||ty>=b.y1||'#NVX'.includes(G0[ty]?.[tx]||'#')||doors.has(key))continue;
  cells.add(key);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){
   const x=tx+dx,y=ty+dy;
   if(G0[y]?.[x]==='#')surfaces.push([x*TILE+(dx<0?30:0),y*TILE+(dy<0?12:0),dx?18:TILE,dy?36:TILE]);
   else if(!cells.has(y*MW+x))queue.push([x,y]);
  }
 }
 if(!cells.size)return null;
 const xs=[...cells].map(k=>k%MW),ys=[...cells].map(k=>Math.floor(k/MW));
 return{cells,surfaces,bounds:[{x:Math.min(...xs)*TILE-18,y:Math.min(...ys)*TILE-36},{x:(Math.max(...xs)+1)*TILE+18,y:(Math.max(...ys)+1)*TILE+12}]};
}
function aperturePeekContains(o,f=aperturePeekFrame){
 if(!f||flOf(o)||(o.z||0)||bldAt(Math.floor(o.x/TILE),Math.floor(o.y/TILE))!==f.b)return false;
 return f.cells.has(Math.floor(o.y/TILE)*MW+Math.floor(o.x/TILE));
}
function aperturePeekPath(c,f){
 c.beginPath();for(const k of f.cells)c.rect(k%MW*TILE,Math.floor(k/MW)*TILE,TILE,TILE);for(const r of f.surfaces)c.rect(...r);
}

function captureAperturePeek(sc){
 const f=aperturePeekFrame;if(!f)return;
 const xs=f.pts.map(p=>p.x),ys=f.pts.map(p=>p.y),ox=W/2*DPR-cam.x*sc,oy=H/2*DPR-cam.y*sc;
 const x=Math.max(0,Math.floor(Math.min(...xs)*sc+ox)-2),y=Math.max(0,Math.floor(Math.min(...ys)*sc+oy)-2);
 const w=Math.min(canvas.width,Math.ceil(Math.max(...xs)*sc+ox)+2)-x,h=Math.min(canvas.height,Math.ceil(Math.max(...ys)*sc+oy)+2)-y;
 if(w<2||h<2)return;
 // Small reusable region buffers, not a second full-screen mobile scene.
 const aw=Math.ceil(w/64)*64,ah=Math.ceil(h/64)*64;
 if(apertureScene.width!==aw||apertureScene.height!==ah){apertureScene.width=aw;apertureScene.height=ah;}
 const q=apertureScene.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,aw,ah);q.drawImage(canvas,x,y,w,h,0,0,w,h);
 f.capture={x,y,w,h};
}
function drawAperturePeek(){
 const f=aperturePeekFrame,p=f?.capture;if(!p)return;
 const b=BLD[f.b];ctx.save();aperturePeekPath(ctx,f);ctx.clip();
 ctx.beginPath();ctx.rect((b.x0+1)*TILE,(b.y0+1)*TILE,(b.x1-b.x0-1)*TILE,(b.y1-b.y0-1)*TILE);ctx.clip();
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=f.alpha;ctx.drawImage(apertureScene,0,0,p.w,p.h,p.x,p.y,p.w,p.h);ctx.restore();
}
