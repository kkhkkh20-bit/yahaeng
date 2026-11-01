import * as THREE from 'three';
// A small view opening through foreground architecture keeps feet and actions readable.
// It clips only geometry above the actor's floor and nearer than the actor, never actors.
export function makeReveal(root){
 const uniforms={studyCenter:{value:new THREE.Vector2()},studyRadius:{value:0},studyDepth:{value:100},studyFloor:{value:0},fixtureCenter:{value:new THREE.Vector2()},fixtureRadius:{value:0},fixtureDepth:{value:100},fixtureFloor:{value:0}},materials=new Set();
 root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.isMeshStandardMaterial&&!m.userData.noForeground)materials.add(m);});
 for(const m of materials){const previous=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=shader=>{previous?.(shader);Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying float studyHeight;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nstudyHeight=(modelMatrix*vec4(transformed,1.0)).y;');shader.fragmentShader='uniform vec2 fixtureCenter;uniform float fixtureRadius;uniform float fixtureDepth;uniform float fixtureFloor;uniform vec2 studyCenter;uniform float studyRadius;uniform float studyDepth;uniform float studyFloor;varying float studyHeight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 if(fixtureRadius>1.0&&studyHeight>fixtureFloor+.24&&vViewPosition.z<fixtureDepth-.5){
  if(length(gl_FragCoord.xy-fixtureCenter)<fixtureRadius)discard;
 }
 if(studyRadius>1.0&&studyHeight>studyFloor+.24&&vViewPosition.z<studyDepth-.12){
  float r=length(gl_FragCoord.xy-studyCenter)/studyRadius;
  float keep=smoothstep(.62,1.0,r);
  float stipple=fract(sin(dot(floor(gl_FragCoord.xy/2.0),vec2(12.9898,78.233)))*43758.5453);
  if(stipple>keep)discard;
 }`);};m.customProgramCacheKey=()=>key+'-club-foreground-reveal-v1';m.needsUpdate=true;}
 let radius=0;
 return{update({x,y,depth,floor,dpr,height,occluded,dt,fixture}){radius+=((occluded?Math.min(90,height*.105):0)-radius)*(1-Math.exp(-Math.max(.016,dt)*15));uniforms.fixtureRadius.value=fixture?fixture.radius*dpr:0;if(fixture){uniforms.fixtureCenter.value.set(fixture.x*dpr,(height-fixture.y)*dpr);uniforms.fixtureDepth.value=fixture.depth;uniforms.fixtureFloor.value=fixture.floor;}uniforms.studyCenter.value.set(x*dpr,(height-y)*dpr);uniforms.studyRadius.value=radius*dpr;uniforms.studyDepth.value=depth;uniforms.studyFloor.value=floor;},get radius(){return radius}};
}
