import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Merge static material surfaces, retaining dynamic hinges, cut walls and floor visibility.
export function batchStatic(root,skip=new Set()){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),materials=new Map(),remove=[];
 function visit(o){if(o!==root&&(skip.has(o)||o.userData.dynamic))return;if(o.isMesh){const source=o.geometry,transform=inverse.clone().multiply(o.matrixWorld),list=Array.isArray(o.material)?o.material:[o.material],g=source.index?source.toNonIndexed():source.clone();g.applyMatrix4(transform);const groups=Array.isArray(o.material)?source.groups:[{start:0,count:g.attributes.position.count,materialIndex:0}];
  for(const group of groups){const m=list[group.materialIndex||0],p=new THREE.BufferGeometry();for(const[key,a]of Object.entries(g.attributes)){const values=a.array.slice(group.start*a.itemSize,(group.start+group.count)*a.itemSize);p.setAttribute(key,new THREE.BufferAttribute(values,a.itemSize,a.normalized));}(materials.get(m)||materials.set(m,[]).get(m)).push(p);}g.dispose();remove.push(o);
 }for(const c of o.children)visit(c);}
 visit(root);for(const o of remove)o.removeFromParent();for(const[m,parts]of materials){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!g)continue;const mesh=new THREE.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}return{before:remove.length,after:materials.size};
}
