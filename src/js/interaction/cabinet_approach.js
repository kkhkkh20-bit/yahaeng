// Central door contact for existing cabinets. Call on the cabinet's active floor.
// This helper reads geometry only; it never moves an actor or changes map layers.
// An optional world adapter lets inspection tools use the exact production maps.
function cabinetFrontStand(h,world={}){
 if(!h?.furn||h.type==='bed')return null;
 const tile=world.tile??TILE,foot=(world.footprint??hideFootprint)(h),solid=world.solid??solidFor(h.z||0),radius=14;
 const stand={x:h.x,y:foot.y1+12},workStand={x:h.x,y:foot.y1-6};
 // The two pixel overlap with this cabinet is the existing hand lean. Every
 // other solid tile, including neighbouring furniture and walls, stays solid.
 if(!cabinetFrontClear(stand,stand,foot,solid,tile,radius))return null;
 // The visible feet are drawn 13 pixels below the actor pivot. Walk the pivot
 // in to the handles while keeping that grounded six-pixel foot disc outside.
 if(!cabinetFrontClear(stand,workStand,foot,solid,tile,10)||!cabinetFrontClear({x:stand.x,y:stand.y+13},{x:workStand.x,y:workStand.y+13},foot,solid,tile,6,false))return null;
 const ty=Math.floor(foot.y1/tile),entries=[];
 for(let tx=Math.floor(foot.x0/tile);tx<foot.x1/tile;tx++){
  if(solid(tx,ty))continue;
  const entry={tx,ty,x:(tx+.5)*tile,y:(ty+.5)*tile};
  if(cabinetFrontClear(entry,stand,foot,solid,tile,radius))entries.push(entry);
 }
 entries.sort((a,b)=>Math.abs(a.x-stand.x)-Math.abs(b.x-stand.x)||a.tx-b.tx);
 return entries.length?{...stand,workStand,entries,radius}:null;
}
function cabinetFrontClear(from,to,foot,solid,tile=48,radius=14,allowTarget=true){
 const n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4));
 for(let i=0;i<=n;i++){
  const x=from.x+(to.x-from.x)*i/n,y=from.y+(to.y-from.y)*i/n;
  for(let ty=Math.floor((y-radius)/tile);ty<=Math.floor((y+radius)/tile);ty++)for(let tx=Math.floor((x-radius)/tile);tx<=Math.floor((x+radius)/tile);tx++){
   if(!solid(tx,ty))continue;
   const x0=tx*tile,y0=ty*tile,x1=x0+tile,y1=y0+tile;
   if(allowTarget&&x0>=foot.x0&&x1<=foot.x1&&y0>=foot.y0&&y1<=foot.y1)continue;
   const dx=x-Math.max(x0,Math.min(x1,x)),dy=y-Math.max(y0,Math.min(y1,y));
   if(dx*dx+dy*dy<radius*radius-.001)return false;
  }
 }
 return true;
}
