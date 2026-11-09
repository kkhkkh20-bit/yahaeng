// Offline costume details share the existing animated joints and contact rig.
import * as THREE from 'three';

export function attachWardrobe(name,model,bones,mats){
 model.updateMatrixWorld(true);
 const at=n=>bones[n].getWorldPosition(new THREE.Vector3());
 const hips=at('Hips'),head=at('Head'),foot=at('LeftFoot');
 const h=head.y-foot.y,w=at('LeftArm').distanceTo(at('RightArm'));
 const material=(role,color,basic=false)=>{
  const m=basic?new THREE.MeshBasicMaterial({color}):new THREE.MeshPhongMaterial({color,shininess:0,flatShading:true});
  m.userData.role=role;mats.push(m);return m;
 };
 const cloth=material('shirt',0x0000ff),dark=material('shoes',0x00ffff),trim=material(null,0xa8b0b7);
 const accent=material('accent',0xffff00,true);
 const add=(bone,size,offset,mat,rz=0)=>{
  const p=at(bone),mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
  mesh.position.copy(p).add(new THREE.Vector3(...offset));mesh.rotation.z=rz;mesh.frustumCulled=false;
  // Dimensions/offsets above are measured in world units. Attach the unparented
  // mesh directly, so the model's 280x import scale is not applied a second time.
  mesh.updateMatrixWorld(true);bones[bone].attach(mesh);return mesh;
 };
 if(name==='heroAgent'){
  // Wrap collar, fitted waist, split sash and a compact sheathed blade. No cape
  // or long weapon obscures paired takedowns, climbing hands or the target.
  add('Spine2',[w*.09,h*.13,h*.012],[-w*.09,-h*.02,h*.072],trim,-.46);
  add('Spine2',[w*.09,h*.13,h*.012],[w*.09,-h*.02,h*.072],trim,.46);
  add('Hips',[w*.77,h*.037,h*.12],[0,h*.075,0],accent);
  add('Hips',[w*.12,h*.05,h*.135],[-w*.40,h*.075,0],accent,-.15);
  const sash=add('Hips',[w*.18,h*.18,h*.014],[-w*.40,-h*.03,h*.075],accent,-.2);
  add('Hips',[w*.12,h*.13,h*.014],[-w*.29,-h*.005,h*.08],accent,.25);
  add('Hips',[h*.025,h*.22,h*.025],[-w*.07,h*.095,-h*.075],dark,-1.05);
  // Short forearm and shin wraps add readable ninja costume bands.
  for(const side of ['Left','Right']){
   add(side+'Hand',[h*.044,h*.03,h*.045],[0,0,0],dark);
   add(side+'Leg',[h*.056,h*.018,h*.055],[0,-h*.085,0],trim);
  }
  model.userData.wardrobe={sash,rest:sash.rotation.z,bones};
 }
 if(name==='trench'){
  add('Hips',[w*.80,h*.31,h*.025],[0,-h*.10,-h*.065],cloth);
  for(const side of [-1,1])add('Hips',[w*.35,h*.29,h*.025],[side*w*.25,-h*.09,h*.05],cloth,side*.04);
  add('Spine2',[w*.13,h*.15,h*.015],[-w*.13,-h*.01,h*.075],dark,-.35);
  add('Spine2',[w*.13,h*.15,h*.015],[w*.13,-h*.01,h*.075],dark,.35);
 }
 if(name==='femaleCoat'){
  // A knee-length tailored coat, split below the waist so walking legs and
  // reaction/contact poses remain readable from all eight directions.
  add('Hips',[w*.76,h*.30,h*.025],[0,-h*.10,-h*.065],cloth);
  for(const side of [-1,1])add('Hips',[w*.31,h*.28,h*.025],[side*w*.24,-h*.09,h*.052],cloth,side*.035);
  add('Spine2',[w*.12,h*.14,h*.018],[-w*.12,-h*.01,h*.076],dark,-.33);
  add('Spine2',[w*.12,h*.14,h*.018],[w*.12,-h*.01,h*.076],dark,.33);
 }
 if(name==='femaleBlazer'){
  // Short blazer hem and contrasting lapels distinguish trousers from the
  // existing dresses, cropped jackets and long coats without a new rig.
  add('Hips',[w*.78,h*.10,h*.13],[0,h*.005,0],cloth);
  for(const side of [-1,1])add('Spine2',[w*.10,h*.13,h*.02],[side*w*.14,-h*.01,h*.078],dark,side*.33);
 }
 if(name==='workApron'){
  // An apron is a front garment, not a backpack or a full cylindrical skirt.
  const apron=material('accent',0xffff00,true);
  add('Spine2',[w*.49,h*.19,h*.022],[0,-h*.035,h*.075],apron);
  add('Hips',[w*.70,h*.27,h*.025],[0,-h*.055,h*.082],apron);
  add('Hips',[w*.28,h*.065,h*.018],[0,h*.01,h*.101],dark);
  add('Hips',[w*.78,h*.025,h*.13],[0,h*.075,0],apron);
 }
 if(name==='vest'){
  for(const side of [-1,1])add('Spine2',[w*.24,h*.10,h*.027],[side*w*.23,-h*.025,h*.078],dark);
 }
}

export function updateWardrobe(model){
 const w=model?.userData.wardrobe;if(!w)return;
 // A restrained secondary response follows the actual leg swing, so the sash
 // settles at idle and never advances on a separate animation/game clock.
 const a=w.bones.LeftUpLeg.quaternion.x-w.bones.RightUpLeg.quaternion.x;
 w.sash.rotation.z=w.rest+THREE.MathUtils.clamp(a*.12,-.12,.12);
}
