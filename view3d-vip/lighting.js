import * as THREE from 'three';
// The switch, action point and hand contact all reference lampControl().
export function createLighting(G,root,floors,mat,{box,bar}){
 const lamps=[];
 for(const l of G.S.lamps){const fl=l.fl||0,p=floors[fl]||root,base=fl*2.8,m=l.mount,x=l.x/48,z=l.y/48,at=G.lampControl(l),cx=at.x/48,cz=at.y/48,H=m?.kind==='street'?3.1:2.35;
  if(m?.kind==='street'){const ax=m.ax/48,az=m.ay/48;box(p,mat.trim,ax,base+.1,az,.17,.2,.17);bar(p,mat.steel,new THREE.Vector3(ax,base+.15,az),new THREE.Vector3(ax,base+H,az),.035);bar(p,mat.steel,new THREE.Vector3(ax,base+H,az),new THREE.Vector3(x,base+H,z),.024);}
  else if(m){bar(p,mat.trim,new THREE.Vector3(m.ax/48,base+H,m.ay/48),new THREE.Vector3(x,base+H,z),.024);box(p,mat.dark,m.ax/48,base+H,m.ay/48,.09,.22,.09);}
  else{bar(p,mat.trim,new THREE.Vector3(x,base+H,z),new THREE.Vector3(x,base+2.8,z),.009);bar(p,mat.trim,new THREE.Vector3(cx,base+2.55,cz),new THREE.Vector3(x,base+2.55,z),.009);}
  box(p,mat.trim,x,base+H,z,.3,.09,.27);const bulbMaterial=mat.warm.clone(),bulb=box(p,bulbMaterial,x,base+H-.055,z,.23,.025,.2);bulb.userData.dynamic=true;
  // Aim the plate away from its supporting wall; roadside controls face the pavement.
  let nx=m?.nx||0,nz=m?.ny||0;
  if(!m){const grid=fl?G.GF[fl]:G.G0,tx=Math.floor(cx),tz=Math.floor(cz),candidates=[];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){if(!'#XEN'.includes(grid[tz+dz]?.[tx+dx]||'!'))continue;const d=dx?Math.abs(cx-(dx>0?tx+1:tx)):Math.abs(cz-(dz>0?tz+1:tz));candidates.push({nx:-dx,nz:-dz,d});}candidates.sort((a,b)=>a.d-b.d);if(candidates[0])({nx,nz}=candidates[0]);else nz=1;}
  const group=new THREE.Group();group.position.set(cx,base+1.05,cz);group.rotation.y=Math.atan2(nx,nz);group.userData.dynamic=true;p.add(group);
  const plateMat=mat.metal.clone();plateMat.userData.noForeground=true;const switchMat=mat.paper.clone();switchMat.userData.noForeground=true;box(group,plateMat,0,0,-.025,.17,.25,.055);const lever=box(group,switchMat,0,0,.015,.055,.09,.035);bar(p,mat.trim,new THREE.Vector3(cx,base+1.2,cz),new THREE.Vector3(cx,base+H,cz),.007);
  const controlAt=new THREE.Vector3(cx,base+1.05,cz),light=new THREE.PointLight('#efc48c',l.outdoor?10:7,6,2);light.position.set(x,base+H-.1,z);root.add(light);lamps.push({l,light,base:light.intensity,bulb,bulbMaterial,group,lever,controlAt,at});
 }
 return lamps;
}
