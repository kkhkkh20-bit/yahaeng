// Build-time only: approved 2D head art follows the existing animated head joint.
// The exported game assets remain ordinary 8-direction WebP sprite sheets.
import * as THREE from 'three';
let textures;
async function headTextures(){
 if(!textures)textures=(async()=>{
  const image=new Image();image.src=new URL('./agent_art/heads.png',import.meta.url).href;await image.decode();
  return Array.from({length:8},(_,i)=>{
   const c=document.createElement('canvas');c.width=c.height=24;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=false;x.drawImage(image,i*24,0,24,24,0,0,24,24);
   // Encode the same skin/hair palette channels as the animated body. Disguises
   // retain this head's identity, rather than recolouring hair as uniform cloth.
   const a=x.getImageData(0,0,24,24),d=a.data;
   for(let p=0;p<d.length;p+=4){if(d[p+3]<128){d[p+3]=0;continue;}const r=d[p],g=d[p+1],b=d[p+2];
    if(r<24&&g<24&&b<24)continue;
    if(r>g*1.08&&r>b*1.2&&r>90){d[p]=Math.min(250,Math.round(r*.7+80));d[p+1]=d[p+2]=0;}
    else{d[p]=d[p+2]=0;d[p+1]=Math.min(245,Math.round(120+Math.max(r,g,b)*1.25));}
    d[p+3]=255;
   }
   x.putImageData(a,0,0);const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;return t;
  });
 })();return textures;
}
export async function attachConceptHead(model,bones,mats){
 const maps=await headTextures();
 // These modular rigs share a scale and joint spacing. Keep the jaw at the
 // neck, with the fuller bob silhouette from the approved four-head-tall design.
 model.updateMatrixWorld(true);
 const center=bones.Head.getWorldPosition(new THREE.Vector3()),neck=bones.Neck.getWorldPosition(new THREE.Vector3());
 const span=center.distanceTo(neck),height=span*4.8;center.y+=span*2;
 const anchor=bones.Head.worldToLocal(center.clone());
 const up=bones.Head.worldToLocal(center.clone().add(new THREE.Vector3(0,height,0))).sub(anchor);
 model.traverse(o=>{if(o.name.endsWith('_Head'))o.visible=false;});
 const material=new THREE.MeshBasicMaterial({map:maps[2],alphaTest:.5,side:THREE.DoubleSide});
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);plane.name='ConceptHead';plane.frustumCulled=false;
 model.add(plane);mats.push(material);
 model.userData.conceptHead={plane,maps,anchor,height,up,bones};
}
const point=new THREE.Vector3(),tip=new THREE.Vector3(),base=new THREE.Vector3(),forward=new THREE.Vector3(),worldQ=new THREE.Quaternion(),scale=new THREE.Vector3();
export function updateConceptHead(model,camera){
 const h=model?.userData.conceptHead;if(!h)return;
 model.updateMatrixWorld(true);model.getWorldQuaternion(worldQ);forward.set(0,0,1).applyQuaternion(worldQ);
 const dir=((Math.round(Math.atan2(forward.z,forward.x)/(Math.PI/4))%8)+8)%8;
 h.plane.material.map=h.maps[dir];
 point.copy(h.anchor);h.bones.Head.localToWorld(point);model.worldToLocal(point);h.plane.position.copy(point);
 tip.copy(h.anchor).add(h.up);h.bones.Head.localToWorld(tip);tip.project(camera);
 base.copy(h.anchor);h.bones.Head.localToWorld(base);base.project(camera);
 const roll=-Math.atan2(tip.x-base.x,tip.y-base.y);
 h.plane.quaternion.copy(worldQ.invert()).multiply(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),roll));
 model.getWorldScale(scale);h.plane.scale.set(h.height/scale.x,h.height/scale.y,1);
}
