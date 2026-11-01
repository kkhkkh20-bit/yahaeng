import * as THREE from 'three';
import {FLOOR} from './world.js?v=v130-ddb1c767dc19';
// Simulation-owned effects: removing a blood stain or consuming a lure removes its mesh.
// These are pooled by object identity rather than rebuilt on every frame.
export function createEffects(G,scene,visibility){
 const root=new THREE.Group();scene.add(root);const entries=new Map(),circle=new THREE.CircleGeometry(1,18),ring=new THREE.RingGeometry(.985,1,48),ball=new THREE.SphereGeometry(.06,6,4),dart=new THREE.ConeGeometry(.035,.25,5);
 const materials={blood:new THREE.MeshBasicMaterial({color:'#5b2524',transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),noise:new THREE.MeshBasicMaterial({color:'#c8b68a',transparent:true,opacity:.3,depthWrite:false}),stone:new THREE.MeshStandardMaterial({color:'#b7b8ab',roughness:.65}),dart:new THREE.MeshStandardMaterial({color:'#b4b9b1',metalness:.5,roughness:.4}),lure:new THREE.MeshStandardMaterial({color:'#b0a88c',roughness:.9})};
 function update(){const S=G.S,P=S.player,used=new Set();for(const[k,list]of [['blood',S.decals],['noise',S.noises],['stone',S.stones],['dart',S.kunais],['lure',S.lures]])for(const o of list){used.add(o);let e=entries.get(o);if(!e){const material=k==='noise'?materials[k].clone():materials[k],mesh=new THREE.Mesh(k==='blood'?circle:k==='noise'?ring:k==='dart'?dart:ball,material);root.add(mesh);e={mesh,k};entries.set(o,e);}const mesh=e.mesh;let x=o.x,y=o.y,z=(o.fl??P.fl??0)*FLOOR+.025;
  if(k==='stone'||k==='dart'){const f=Math.min(1,o.t/o.dur),end=k==='dart'?o.tgt:{x:o.x1,y:o.y1};x=o.x0+(end.x-o.x0)*f;y=o.y0+(end.y-o.y0)*f;z+=k==='stone'?1.1*(1-f)+Math.sin(f*Math.PI)*.65:1;}
  if(k==='lure'&&!o.landed){const f=Math.min(1,o.t/.35);x=o.x0+(o.x-o.x0)*f;y=o.y0+(o.y-o.y0)*f;z+=Math.sin(f*Math.PI)*.6;}
  mesh.visible=visibility.visible({x,y,fl:o.fl||0,z:o.z||0});mesh.position.set(x/48,z,y/48);
  if(k==='blood'){mesh.rotation.set(-Math.PI/2,0,o.rot||0);mesh.scale.set(o.r/48,o.r*.7/48,1);}
  if(k==='noise'){mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(Math.max(.02,o.r/48*(.25+.75*o.t/.7)));mesh.material.opacity=Math.max(0,1-o.t/.7)*(o.heard?.4:.2);}
  if(k==='dart'){const to=new THREE.Vector3(o.tgt.x-o.x0,0,o.tgt.y-o.y0).normalize();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to);}
  if(k==='lure')mesh.scale.set(1,.4,1);
 }
 for(const[o,e]of entries)if(!used.has(o)){e.mesh.removeFromParent();if(e.k==='noise')e.mesh.material.dispose();entries.delete(o);}}
 return{entries,update,dispose(){root.removeFromParent();[circle,ring,ball,dart].forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());for(const e of entries.values())if(e.k==='noise')e.mesh.material.dispose();entries.clear();}};
}
