// Whole architectural sections, never per-fragment holes. A hysteresis band
// keeps the building in the same view mode while walking around its perimeter.
export function createCutaway(G){
 let focused=false,west=false,north=false;
 const latch=(old,d,enter,leave)=>d<(old?leave:enter);
 function update(){
  const P=G.S.player,b=G.BLD[0],x=P.x/48,z=P.y/48,dx=Math.max(b.x0-x,0,x-(b.x1+1)),dz=Math.max(b.y0-z,0,z-(b.y1+1)),distance=Math.hypot(dx,dz),inside=x>=b.x0&&x<=b.x1+1&&z>=b.y0&&z<=b.y1+1;
  focused=!P.z&&(inside||latch(focused,distance,2.8,4));
  west=focused&&latch(west,x-b.x0,-.12,.18);north=focused&&latch(north,z-b.y0,-.12,.18);
  const T=P.trav,upper=(P.fl||0)>0||!!(T?.stairs&&!T.stairs.roof&&T.stairs.up&&T.t/T.dur>.55);
  return{mode:focused?'floor-cutaway':'exterior',focused,inside,west,north,upper,floor:upper?1:0};
 }
 return{update};
}
