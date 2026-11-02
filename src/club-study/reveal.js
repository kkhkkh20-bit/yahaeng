import * as THREE from 'three';
// Peel foreground geometry along the ground plan. Streets remain continuous;
// a circular/dithered hole must not suggest that the actor stands on a roof.
export function makeReveal(root,G,slope){
 const w=G.MW,h=G.MH,data=new Uint8Array(w*h*4),materials=new Set();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,b=G.bldAt(x,y);data[i]=b+2;data[i+3]=255;}
 const texture=new THREE.DataTexture(data,w,h);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 const uniforms={cutPlan:{value:texture},cutSize:{value:new THREE.Vector2(w,h)},cutSlope:{value:new THREE.Vector2(...slope)},cutActor:{value:new THREE.Vector3()},cutArea:{value:1},cutFloor:{value:0},cutRange:{value:7},cutEnabled:{value:1}};
 root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.isMeshStandardMaterial&&m.userData.tacticalOccluder&&!m.userData.noForeground)materials.add(m);});
 for(const m of materials){const previous=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=shader=>{previous?.(shader);Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 cutWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncutWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader='uniform sampler2D cutPlan;uniform vec2 cutSize;uniform vec2 cutSlope;uniform vec3 cutActor;uniform float cutArea;uniform float cutFloor;uniform float cutRange;uniform float cutEnabled;varying vec3 cutWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 if(cutEnabled>.5&&cutWorld.y>cutFloor+.26){
  vec2 ground=cutWorld.xz-cutSlope*(cutWorld.y-cutFloor);
  vec2 uv=ground/cutSize;
  if(all(greaterThanEqual(uv,vec2(0.0)))&&all(lessThan(uv,vec2(1.0)))&&distance(ground,cutActor.xz)<cutRange){
   float area=texture2D(cutPlan,uv).r*255.0;
   if(abs(area-cutArea)<.25)discard;
  }
 }`);};m.customProgramCacheKey=()=>key+'-ground-plan-cutaway-v2';m.needsUpdate=true;}
 return{update({floor,range=7,enabled=true}){const P=G.S.player,R=G.traversalRoom(P.trav),b=R?.b??G.bldAt(Math.floor(P.x/48),Math.floor(P.y/48));uniforms.cutActor.value.set(P.x/48,floor,P.y/48);uniforms.cutArea.value=b+2;uniforms.cutFloor.value=floor;uniforms.cutRange.value=range;uniforms.cutEnabled.value=enabled?1:0;},get range(){return uniforms.cutRange.value},get mode(){return'ground-plan'},dispose(){texture.dispose();}};
}
