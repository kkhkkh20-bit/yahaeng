// Whole architectural sections, never per-fragment holes. A hysteresis band
// keeps the building in the same view mode while walking around its perimeter.
export function createCutaway(G){
 const states=new Map();
 const latch=(old,d,enter,leave)=>d<(old?leave:enter);
 function update(){
  const P=G.S.player,x=P.x/48,z=P.y/48,T=P.trav,upper=(P.fl||0)>0||!!(T?.stairs&&!T.stairs.roof&&T.stairs.up&&T.t/T.dur>.55),buildings={};
  for(const bi of G.STAGE.cutawayBuildings||[0]){const b=G.BLD[bi];if(!b)continue;const old=states.get(bi)||{},dx=Math.max(b.x0-x,0,x-(b.x1+1)),dz=Math.max(b.y0-z,0,z-(b.y1+1)),distance=Math.hypot(dx,dz),inside=x>=b.x0&&x<=b.x1+1&&z>=b.y0&&z<=b.y1+1,focused=!P.z&&(inside||latch(old.focused,distance,2.8,4)),state={bi,mode:focused?'floor-cutaway':'exterior',focused,inside,west:focused&&latch(old.west,x-b.x0,-.12,.18),north:focused&&latch(old.north,z-b.y0,-.12,.18),upper:bi===0&&upper,floor:bi===0&&upper?1:0};states.set(bi,state);buildings[bi]=state;}
  return{...buildings[0],buildings};
 }
 return{update};
}
