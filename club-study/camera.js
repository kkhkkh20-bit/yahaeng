import * as THREE from 'three';
// Tactical ground coverage, including the narrow portrait viewport.
export function createCameraRig(camera){
 const pitch=54*Math.PI/180,sin=Math.sin(pitch),offset=new THREE.Vector3(20,Math.hypot(20,20)*Math.tan(pitch),20).normalize().multiplyScalar(Math.sqrt(1200)),right=new THREE.Vector3(1,0,-1).normalize(),up=new THREE.Vector3(-sin/Math.SQRT2,Math.cos(pitch),-sin/Math.SQRT2),target=new THREE.Vector3();
 let span=14.5,width=0,height=0,initialized=false;
 const profile=()=>{const touch=matchMedia('(pointer:coarse)').matches;return{touch,x:touch?.45:.5,y:.60};};
 function resize(w,h,passage,zoom=1){const p=profile(),base=passage?10:p.touch?Math.max(15,8*h/w):14.5,desired=base/zoom,resized=w!==width||h!==height;span=resized?desired:span+(desired-span)*.3;if(!resized&&Math.abs(desired-span)<.001)return false;width=w;height=h;camera.left=-span*w/h/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();return resized;}
 function follow(x,y,z,dt=0){const p=profile(),want=new THREE.Vector3(x,y,z).addScaledVector(right,(.5-p.x)*span*width/height).addScaledVector(up,(p.y-.5)*span);target.lerp(want,!initialized||!dt?1:1-Math.exp(-dt*9));initialized=true;camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateMatrixWorld(true);}
 function groundToScreen(x,y){return{x:(x-y)/Math.SQRT2,y:(x+y)*sin/Math.SQRT2};}
 function direction(x,y){const n=Math.hypot(x,y);if(n<1e-6)return{x:0,y:0};const a=(x+y/sin)/Math.SQRT2,b=(-x+y/sin)/Math.SQRT2,k=n/Math.hypot(a,b);return{x:a*k,y:b*k};}
 function pace(x,y){const n=Math.hypot(x,y),p=groundToScreen(x,y);return n<1e-6?1:n/Math.hypot(p.x,p.y);}
 return{resize,follow,direction,groundToScreen,pace,offset,get span(){return span},get framing(){return{pitch:54,span,width,height,groundWidth:span*width/height,anchor:profile(),slope:[offset.x/offset.y,offset.z/offset.y]};}};
}
