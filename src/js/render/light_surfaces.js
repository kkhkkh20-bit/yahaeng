// A receiving surface is separate from the ground visibility polygon. It can
// receive light at its near face without opening a path through the obstacle.
const LIGHT_SURFACE_Q=2,LIGHT_SURFACE_STEP=8;
let lightReceiverIndex=null,lightSurfaceScratch=null;
function lightFalloff(l,x,y,flick=1){
 const d=dist(l.x,l.y,x,y)/(l.r*flick);
 return d>=1?0:d<.55?.9-d/.55*.14:.76*(1-d)/.45;
}
function lightSurfaceAmount(l,x,y,flick=1){
 if(l.angle!=null&&Math.abs(angDiff(l.angle,Math.atan2(y-l.y,x-l.x)))>l.fov)return 0;
 const amount=lightFalloff(l,x,y,flick);
 return amount>0&&los(l.x,l.y,x,y)?amount:0;
}
function lightReceiverBounds(o){
 const f=o.furn;
 if(f){
  if(f.t==='locker'||f.t==='wardrobe'){const g=cabinetGeometry({type:f.t,tx:f.x,ty:f.y,w:f.w,h:f.h,furn:true,fl:f.fl||0});return{x:g.left,y:g.top,w:g.right-g.left,h:g.bottom-g.top+5};}
  const b=purchasedPropFurnBounds(f)||officeFurnBounds(f);
  if(b)return{x:b.x,y:b.y,w:b.w+(b.count>1?(b.count-1)*TILE:0),h:b.h};
  return{x:f.x*TILE-24,y:f.y*TILE-80,w:f.w*TILE+48,h:f.h*TILE+104};
 }
 if(o.ch==='C')return{x:o.x0,y:o.y0-8,w:TILE,h:TILE+8};
 return{x:o.x0-48,y:o.y0-112,w:TILE+96,h:TILE+144};
}
function lightReceiversNear(l){
 if(!lightReceiverIndex||lightReceiverIndex.state!==S)lightReceiverIndex={state:S,layers:new Map()};
 let index=lightReceiverIndex.layers.get(CUR_F);
 if(!index||index.furniture!==FURN||index.count!==FURN.length){
  index={furniture:FURN,count:FURN.length,cells:new Map()};
  const add=o=>{for(let y=Math.floor(o.y0/LG_C);y<=Math.floor(o.y1/LG_C);y++)for(let x=Math.floor(o.x0/LG_C);x<=Math.floor(o.x1/LG_C);x++){const key=x+':'+y;let list=index.cells.get(key);if(!list)index.cells.set(key,list=[]);list.push(o);}};
  for(const f of FURN)if(flOf(f)===CUR_F&&!FURN_FLAT.has(f.t))add({furn:f,x0:f.x*TILE,y0:f.y*TILE,x1:(f.x+f.w)*TILE,y1:(f.y+f.h)*TILE});
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)if('CTBO'.includes(G[y][x]))add({ch:G[y][x],tx:x,ty:y,x0:x*TILE,y0:y*TILE,x1:(x+1)*TILE,y1:(y+1)*TILE});
  lightReceiverIndex.layers.set(CUR_F,index);
 }
 const found=new Set();
 for(let y=Math.floor((l.y-l.r)/LG_C);y<=Math.floor((l.y+l.r)/LG_C);y++)for(let x=Math.floor((l.x-l.r)/LG_C);x<=Math.floor((l.x+l.r)/LG_C);x++)for(const o of index.cells.get(x+':'+y)||[])found.add(o);
 return found;
}
function lightReceiverProbe(o,l,x){
 // Project a sprite column onto the first face of its physical footprint.
 const cx=clamp(x,o.x0+1,o.x1-1),cy=(o.y0+o.y1)/2,dx=l.x-cx,dy=l.y-cy;
 const kx=Math.abs(dx)<.001?Infinity:(dx<0?cx-o.x0:o.x1-cx)/Math.abs(dx),ky=Math.abs(dy)<.001?Infinity:(dy<0?cy-o.y0:o.y1-cy)/Math.abs(dy),k=Math.min(kx,ky);
 if(!Number.isFinite(k)||k>=1)return null;
 const length=Math.hypot(dx,dy);
 return{x:cx+dx*k+dx/length*2,y:cy+dy*k+dy/length*2};
}
function drawLightReceiver(c,o,l,flick){
 const b=lightReceiverBounds(o),strips=[];
 for(let x=b.x;x<b.x+b.w;x+=LIGHT_SURFACE_STEP){const w=Math.min(LIGHT_SURFACE_STEP,b.x+b.w-x),p=lightReceiverProbe(o,l,x+w/2),a=p?lightSurfaceAmount(l,p.x,p.y,flick):0;strips.push({x,w,a});}
 if(!strips.some(s=>s.a>0))return;
 if(!lightSurfaceScratch){const canvas=document.createElement('canvas');lightSurfaceScratch={canvas,ctx:canvas.getContext('2d')};}
 const B=lightSurfaceScratch,w=Math.ceil(b.w/LIGHT_SURFACE_Q),h=Math.ceil(b.h/LIGHT_SURFACE_Q);
 if(B.canvas.width<w||B.canvas.height<h){B.canvas.width=Math.max(w,B.canvas.width);B.canvas.height=Math.max(h,B.canvas.height);}
 const q=B.ctx;q.resetTransform();q.clearRect(0,0,B.canvas.width,B.canvas.height);q.globalCompositeOperation='source-over';q.globalAlpha=1;q.imageSmoothingEnabled=false;
 q.setTransform(1/LIGHT_SURFACE_Q,0,0,1/LIGHT_SURFACE_Q,-b.x/LIGHT_SURFACE_Q,-b.y/LIGHT_SURFACE_Q);
 if(o.furn)drawFurnArt(q,o.furn);
 else if(o.ch==='C')drawCityCargo(q,o.tx,o.ty);
 else if(o.ch==='O')drawStreetPlanter(q,o.tx,o.ty);
 else drawCityPlant(o.ch,o.tx,o.ty,false,q);
 // Erase only each strip's unused opacity. Alpha remains confined to the
 // actual source sprite, including raised pixels above its ground footprint.
 q.globalCompositeOperation='destination-out';
 for(const s of strips){q.fillStyle=`rgba(0,0,0,${1-s.a})`;q.fillRect(s.x,b.y,s.w,b.h);}
 q.globalCompositeOperation='source-over';q.resetTransform();
 c.drawImage(B.canvas,0,0,b.w/LIGHT_SURFACE_Q,b.h/LIGHT_SURFACE_Q,b.x,b.y,b.w,b.h);
}
function lightReceivingSurfaces(c,l,flick){
 c.save();
 const radius=l.r*flick,x0=Math.max(0,Math.floor((l.x-radius)/TILE)),x1=Math.min(MW-1,Math.floor((l.x+radius)/TILE)),y0=Math.max(0,Math.floor((l.y-radius)/TILE)),y1=Math.min(MH-1,Math.floor((l.y+radius)/TILE));
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
  if(!'#SX'.includes(G[ty][tx]))continue;
  const x=tx*TILE,y=ty*TILE;
  for(const [nx,ny]of [[-1,0],[1,0],[0,-1],[0,1]]){
   if(opaqueAt(tx+nx,ty+ny))continue;
   for(let at=0;at<TILE;at+=LIGHT_SURFACE_STEP){
    const px=nx?x+TILE/2+nx*(TILE/2+2):x+at+LIGHT_SURFACE_STEP/2,py=ny?y+TILE/2+ny*(TILE/2+2):y+at+LIGHT_SURFACE_STEP/2,amount=lightSurfaceAmount(l,px,py,flick);if(!amount)continue;
    c.fillStyle=`rgba(0,0,0,${amount})`;
    if(ny)c.fillRect(x+at,ny<0?y:y+8,LIGHT_SURFACE_STEP,ny<0?12:TILE-8);
    else c.fillRect(nx<0?x:x+TILE-18,y+at,18,LIGHT_SURFACE_STEP);
   }
  }
 }
 for(const o of lightReceiversNear(l))drawLightReceiver(c,o,l,flick);
 c.restore();
}
// Moving beams already affect detection. Render the same radius, cone and
// first-hit occlusion, without caching a moving actor into a static lightmap.
function dynamicLightSources(fl){
 const sources=[];
 for(const g of S.guards||[])if(g.torch&&flOf(g)===fl&&!g.z&&!['DEAD','CAPTIVE'].includes(g.state)&&inView(g.x,g.y,TORCH_R))sources.push({x:g.x,y:g.y,r:TORCH_R,angle:g.a,fov:TORCH_FOV,fl,outdoor:bldAt(Math.floor(g.x/TILE),Math.floor(g.y/TILE))<0,owner:g});
 for(const c of S.cams||[])if(c.search&&flOf(c)===fl&&camOn(c)&&inView(c.x,c.y,SL_R))sources.push({x:c.x,y:c.y,r:SL_R,angle:c.a,fov:SL_FOV,fl,owner:c});
 return sources;
}
function drawDynamicLightFields(c,fl){
 for(const l of dynamicLightSources(fl)){
  l.poly=[l.x,l.y];
  for(let i=0;i<=32;i++){const a=l.angle-l.fov+2*l.fov*i/32,r=castRay(l.x,l.y,a,l.r);l.poly.push(l.x+Math.cos(a)*r,l.y+Math.sin(a)*r);}
  lampLight(c,l,1);
 }
}
function invalidateLightRegion(fl,tx,ty){
 const previous=CUR_F;try{setLayer(fl);
  for(const l of S.lamps)if(flOf(l)===fl&&dist(l.x,l.y,tc(tx),tc(ty))<l.r+TILE)rebuildLampPolygon(l);
  for(const key in lightCache)if(lightCache[key].floor===fl)delete lightCache[key];
 }finally{setLayer(previous);}
}
