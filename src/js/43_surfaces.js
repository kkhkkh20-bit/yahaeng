// A tabletop is a visual anchor; its footprint is the physical reach target.
// Coordinates are measured on the existing baked sprites, with a top-down fallback.
function surfaceFixture(o){
  const f=o?.surface;if(!f)return o;const tx=clamp(Math.floor(surfacePoint(o).x/TILE),f.x,f.x+f.w-1);
  return{x:tc(tx),y:(f.y+f.h/2)*TILE,tx,ty:f.y,w:1,h:f.h,fl:f.fl||0,z:0,furn:true};
}
function surfacePoint(o){
  const f=o?.surface;if(!f)return{x:o?.dx??o?.x,y:o?.dy??o?.y};
  const k=kitFurn[furnKey(f)],baked=KIT&&k&&kitOk(k.img),u=o.surfaceU??.5;
  let x=(f.x+f.w*u)*TILE,y=(f.y+f.h*.5)*TILE;
  if(baked){y=f.y*TILE+(f.t==='shelf'?-58:-2);if(f.t==='desk'||f.t==='desk2'){x=f.x*TILE+24;y=f.y*TILE-2;}}
  return{x,y};
}
function attachSurface(o,spec){
  if(!spec||o.dropped)return false;
  const bi=spec.b??bldAt(Math.floor(o.x/TILE),Math.floor(o.y/TILE));
  const choices=FURN.filter(f=>(f.fl||0)===flOf(o)&&bldAt(f.x,f.y)===bi&&(spec.types||[spec.t]).includes(f.t));
  choices.sort((a,b)=>dist(o.x,o.y,(a.x+a.w/2)*TILE,(a.y+a.h/2)*TILE)-dist(o.x,o.y,(b.x+b.w/2)*TILE,(b.y+b.h/2)*TILE));
  const f=choices[0],grid=flOf(o)?GF[flOf(o)]:G0;if(!f||!grid)return false;
  const cells=[];for(let y=f.y-1;y<=f.y+f.h;y++)for(let x=f.x-1;x<=f.x+f.w;x++){
    if((x<f.x||x>=f.x+f.w)&&(y<f.y||y>=f.y+f.h))continue;
    if(grid[y]&&grid[y][x]!==undefined&&!SOLID.has(grid[y][x])&&grid[y][x]!=='Y'&&bldAt(x,y)===bi)cells.push({x:tc(x),y:tc(y)});
  }
  cells.sort((a,b)=>dist(o.x,o.y,a.x,a.y)-dist(o.x,o.y,b.x,b.y));if(!cells[0])return false;
  o.surface={...f};o.surfaceU=spec.u??.5;o.x=cells[0].x;o.y=cells[0].y;const p=surfacePoint(o);o.dx=p.x;o.dy=p.y;return true;
}
function usePoint(u){
  if(!u.surface)return{x:tc(u.at[0]),y:tc(u.at[1]),fl:u.fl||0};
  S.usePoints=S.usePoints||{};const i=STAGE.uses.indexOf(u);
  if(!S.usePoints[i]){const p={x:tc(u.at[0]),y:tc(u.at[1]),fl:u.fl||0};attachSurface(p,u.surface);S.usePoints[i]=p;}
  return S.usePoints[i];
}
function syncSurfaceObjects(){
  const phone=S.rendezvous?.phone;if(phone&&!phone.surface){const f=FURN.find(f=>f.x===phone.tx&&f.y===phone.ty&&(f.fl||0)===flOf(phone)&&f.t==='desk');if(f)phone.surface={...f};}
  for(const [i,n]of (S.notes||[]).entries()){
    const d=STAGE.notes?.[i];if(!d)continue;n.title=d.title;
    if(d.surface||/책상/.test(n.title)){attachSurface(n,d.surface||{types:['desk','desk2']});n.furn=null;}
  }
  for(const d of STAGE.props||[]){
    let p=S.props.find(p=>p.id===d.id);if(!p){p={...d,x:tc(d.at[0]),y:tc(d.at[1]),fl:d.fl||0,taken:false};S.props.push(p);}
    // Older saves may already have dropped a prop away from its original location.
    if(p.surface&&p.surface.x==null)p.surface=null;
    if(!p.surface&&!p.dropped&&p.x===tc(d.at[0])&&p.y===tc(d.at[1]))attachSurface(p,d.surface);
  }
}
function syncServiceRoomLight(){
  const d=STAGE.dining;if(!d)return;
  const def=STAGE.lamps.find(l=>l[0]===d.toilet[0]&&l[1]===d.toilet[1]&&!l[3]);if(!def)return;
  const x=tc(def[0]),y=tc(def[1]);if(S.lamps.some(l=>!flOf(l)&&l.x===x&&l.y===y))return;
  const L0=CUR_F;setLayer(0);const l={x,y,r:def[2],fl:0,outdoor:false,broken:false,poly:[]};
  for(let i=0;i<180;i++){const a=i/180*TAU,r=Math.min(l.r,castRay(x,y,a,l.r)+20);l.poly.push(x+Math.cos(a)*r,y+Math.sin(a)*r);}
  S.lamps.push(l);setLayer(L0);LG=null;for(const k in lightCache)delete lightCache[k];
}
