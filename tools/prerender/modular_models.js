// Quaternius modular characters, CC0. Keep the legacy pose renderer shared:
// aliases adapt the GLB rig to its existing semantic bone names.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachConceptHead } from './concept_agent.js';
import { attachWardrobe } from './wardrobe.js';

const loader = new GLTFLoader();
const loaded = new Map();
export const LOOKS = {
  heroAgent: ['Female-Suit', 'Female-Punk', 'Female-Suit', 'Female-Worker'],
  heroAgentFormal: ['Female-Suit', 'Female-Suit', 'Female-Suit', 'Female-Suit'],
  heroAgentCrew: ['Female-Suit', 'Female-Worker', 'Female-Suit', 'Female-Worker'],
  heroAgentWorker: ['Female-Suit', 'Female-Worker', 'Female-Worker', 'Female-Suit'],
  hero: ['Female-Casual', 'Female-Suit', 'Female-Casual', 'Female-Worker'],
  heroSuit: ['Female-Casual', 'Female-Suit', 'Female-Suit', 'Female-Worker'],
  heroWorker: ['Female-Casual', 'Female-Worker', 'Female-Worker', 'Female-Worker'],
  heroCrew: ['Female-Casual', 'Male-Swat', 'Female-Casual', 'Female-Worker'],
  bossWoman: ['Female-Suit', 'Female-Suit', 'Female-Suit', 'Female-Worker'],
  guard: ['Male-Swat'], male: ['Male-Casual_2'], suit: ['Male-Suit'],
  worker: ['Male-Worker'], woman: ['Female-Casual'], formal: ['Female-Formal'],
  hoodie: ['Male-Casual_Hoodie'],
  trench: ['Male-Suit'],
  vest: ['Male-Casual_2', 'Male-Worker', 'Male-Casual_2', 'Male-Worker'],
  jacket: ['Female-Casual', 'Female-Punk', 'Female-Casual', 'Female-Worker'],
  guardPatrol:['Male-Casual_2','Male-Worker','Male-Suit','Male-Worker'],
};
const aliases = { Spine: 'Abdomen', Spine1: 'Torso', Spine2: 'Chest' };
for (const [side, suffix] of [['Left', '.L'], ['Right', '.R']]) {
  Object.assign(aliases, {
    [side + 'Shoulder']: 'Shoulder' + suffix,
    [side + 'Arm']: 'UpperArm' + suffix, [side + 'ForeArm']: 'LowerArm' + suffix,
    [side + 'Hand']: 'Wrist' + suffix, [side + 'UpLeg']: 'UpperLeg' + suffix,
    [side + 'Leg']: 'LowerLeg' + suffix, [side + 'Foot']: 'Foot' + suffix,
    [side + 'ToeBase']: 'PT' + suffix,
  });
}
const keys = { skin: 0xff0000, hair: 0x00ff00, shirt: 0x0000ff, pants: 0xff00ff, shoes: 0x00ffff, accent:0xffff00 };
function partOf(node) {
  for (let o = node; o; o = o.parent) {
    const m = /_(Head|Body|Legs|Feet)$/.exec(o.name);
    if (m) return m[1];
  }
  return null;
}
function materialFor(mesh, source) {
  const part = partOf(mesh), name = source.name.toLowerCase();
  let role = /skin/.test(name) ? 'skin' : /hair/.test(name) ? 'hair' :
    part === 'Head' ? null : part === 'Legs' ? 'pants' : part === 'Feet' ? 'shoes' : 'shirt';
  if (part === 'Body' && mesh.parent.name === 'Suit_Body' && name === 'white') role = null;
  // The helmet belongs to the role's equipment; eyes stay dark rather than
  // being painted like skin. Each mesh gets separate material instances.
  if(part==='Head'&&name==='pink')role='hair'; // Original Punk hairstyle, recoloured to the agent palette.
  if (part === 'Head' && !role && /worker|swat|visor/.test(name)) role = 'shoes';
  const m = new THREE.MeshPhongMaterial({ color: role ? keys[role] : source.color, shininess: 4 });
  m.userData.role = role;
  return m;
}
async function asset(name) {
  if (!loaded.has(name)) loaded.set(name, loader.loadAsync(new URL('characters/models/' + name + '.glb', import.meta.url).href));
  return loaded.get(name);
}
export async function loadModular(name) {
  const recipe = LOOKS[name];
  if (!recipe) throw new Error('Unknown character look: ' + name);
  const slots = ['Head', 'Body', 'Legs', 'Feet'];
  const src = await asset(recipe[0]);
  const { clone } = await import('three/addons/utils/SkeletonUtils.js');
  const model = clone(src.scene), bones = {}, mats = [];
  // glTF may keep unweighted shoulder joints as Object3D rather than Bone.
  // They still participate in the pose hierarchy and must be addressable.
  model.traverse(o => { if (o.name && !o.isMesh) bones[o.name] = o; });
  for (let i = 0; i < slots.length; i++) {
    const donorName = recipe[i] || recipe[0];
    if (donorName !== recipe[0]) {
      const donor = clone((await asset(donorName)).scene);
      const old = []; model.traverse(o => { if (o.name.endsWith('_' + slots[i])) old.push(o); });
      old.forEach(o => o.parent.remove(o));
      const parts = []; donor.traverse(o => { if (o.name.endsWith('_' + slots[i])) parts.push(o); });
      for (const part of parts) {
        model.add(part);
        part.traverse(o => { if (!o.isSkinnedMesh) return;
          const skeleton = new THREE.Skeleton(o.skeleton.bones.map(b => {
          if (!bones[b.name]) throw new Error('Missing modular joint ' + b.name);
          return bones[b.name];
        }), o.skeleton.boneInverses.map(m => m.clone()));
          o.bind(skeleton, o.bindMatrix.clone());
        });
      }
    }
  }
  model.traverse(o => {
    if (!o.isMesh) return;
    if (!partOf(o)) { o.visible = false; return; }
    o.frustumCulled = false;
    o.material = Array.isArray(o.material) ? o.material.map(m => materialFor(o, m)) : materialFor(o, o.material);
    if(name.startsWith('heroAgent')){
      const materials=Array.isArray(o.material)?o.material:[o.material];
      for(const m of materials){m.shininess=0;m.flatShading=true;}
      // Tailor the cloth while preserving the original skeleton/contact space.
      if(partOf(o)==='Body'&&materials.every(m=>m.userData.role==='shirt')){
        o.geometry=o.geometry.clone();const pos=o.geometry.attributes.position;
        for(let i=0;i<pos.count;i++)pos.setX(i,pos.getX(i)*(name==='heroAgent'?.94:1));
        pos.needsUpdate=true;o.geometry.computeVertexNormals();
      }
    }
    mats.push(...(Array.isArray(o.material) ? o.material : [o.material]));
  });
  // All looks use one rig scale. Normalising each costume's bounding box
  // independently would shrink helmet wearers and break two-person poses.
  model.scale.multiplyScalar(280);
  for (const [alias, original] of Object.entries(aliases)) {
    const joint = bones[original] || bones[THREE.PropertyBinding.sanitizeNodeName(original)];
    if (!joint) throw new Error('Missing modular joint ' + original);
    bones[alias] = joint;
  }
  const top = new THREE.Object3D(); top.position.y = 0.22;
  bones.Head.add(top); bones.HeadTop_End = top;
  // The game's sprite contract samples Walk over 1s, Run over .63s and Death
  // over 3.5s. Native modular clips have different durations; sampling them as
  // legacy seconds would wrap the death clip back to a standing pose.
  const durations = { Walk: 1, Run: 0.63, Death: 3.5, Punch_Right: 0.7 };
  const clips = Object.fromEntries(src.animations.map(original => {
    const a = original.clone(), duration = durations[a.name];
    if (duration && a.duration > 0) {
      const factor = duration / a.duration;
      for (const track of a.tracks) track.times = Float32Array.from(track.times, t => t * factor);
      a.duration = duration;
    }
    return [a.name, a];
  }));
  if(name.startsWith('heroAgent'))await attachConceptHead(model,bones,mats);
  if(['heroAgent','trench','vest'].includes(name))attachWardrobe(name,model,bones,mats);
  clips.Punch = clips.Punch_Right;
  return { model, bones, mats, clips, mixer: new THREE.AnimationMixer(model) };
}
export function colorModular(materials, colors) {
  for (const m of materials) {
    const role = m.userData.role;
    if (role) m.color.set(colors[role] || keys[role]);
  }
}
