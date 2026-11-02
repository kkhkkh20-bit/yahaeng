"""Package the fixed-camera playable art sample. Reuse CC0 source rigs and pose code.
No downloaded code is executed. Keep only animations used by the sample.
"""
from pathlib import Path
import json,struct,shutil,re,hashlib
R=Path(__file__).resolve().parents[1];O=R/'src/club-study';P=R/'tools/prerender';O.mkdir(exist_ok=True)
def optimize(src,dst):
 b=src.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);pos=20+n;binary=b[pos+8:pos+8+struct.unpack_from('<I',b,pos)[0]]
 d['animations']=[a for a in d.get('animations',[])if a['name']in ['Idle','Idle_Neutral','Walk','Run','Interact','Death','Punch_Right','HitRecieve']]
 used=set()
 for mesh in d.get('meshes',[]):
  for q in mesh['primitives']:
   used.update(q['attributes'].values());used.update(q.get('targets',[{}])[0].values())
   if'indices'in q:used.add(q['indices'])
 for s in d.get('skins',[]):
  if'inverseBindMatrices'in s:used.add(s['inverseBindMatrices'])
 for a in d['animations']:
  for s in a['samplers']:used.update([s['input'],s['output']])
 remap={v:i for i,v in enumerate(sorted(used))};d['accessors']=[d['accessors'][v]for v in sorted(used)]
 for mesh in d.get('meshes',[]):
  for q in mesh['primitives']:
   q['attributes']={k:remap[v]for k,v in q['attributes'].items()}
   if'indices'in q:q['indices']=remap[q['indices']]
   if'targets'in q:q['targets']=[{k:remap[v]for k,v in t.items()}for t in q['targets']]
 for s in d.get('skins',[]):
  if'inverseBindMatrices'in s:s['inverseBindMatrices']=remap[s['inverseBindMatrices']]
 for a in d['animations']:
  for s in a['samplers']:s['input']=remap[s['input']];s['output']=remap[s['output']]
 views=sorted(set(a['bufferView']for a in d['accessors']if'bufferView'in a)|set(i['bufferView']for i in d.get('images',[])if'bufferView'in i));vm={v:i for i,v in enumerate(views)};packed=bytearray();new=[]
 for v in views:
  q=d['bufferViews'][v].copy();start=q.get('byteOffset',0);size=q['byteLength'];q['byteOffset']=len(packed);packed+=binary[start:start+size];packed+=b'\0'*(-len(packed)%4);new.append(q)
 for a in d['accessors']:
  if'bufferView'in a:a['bufferView']=vm[a['bufferView']]
 for i in d.get('images',[]):
  if'bufferView'in i:i['bufferView']=vm[i['bufferView']]
 d['bufferViews']=new;d['buffers']=[{'byteLength':len(packed)}];j=json.dumps(d,separators=(',',':')).encode();j+=b' '*(-len(j)%4);data=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(packed))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(packed),0x004e4942)+packed;dst.write_bytes(data);return len(data)
manifest={'license':'CC0-1.0','originals':'https://github.com/kkhkkh20-bit/yahaeng/blob/main/tools/prerender/characters/sources.json','sources':['https://quaternius.com/packs/ultimatemodularwomen.html','https://quaternius.com/packs/ultimatemodularcharacters.html'],'files':{}}
for name in ['Female-Casual','Female-Suit','Female-Worker','Male-Swat','Male-Casual_2','Male-Suit','Male-Worker']:
 p=O/'assets/models'/(name+'.glb');p.parent.mkdir(parents=True,exist_ok=True);n=optimize(P/'characters/models'/(name+'.glb'),p);manifest['files'][p.name]={'bytes':n,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()};print(name,n)
shutil.copy(P/'characters/LICENSE.txt',O/'assets/LICENSE-characters.txt')
lib=O/'lib';lib.mkdir(exist_ok=True);three=P/'node_modules/three';shutil.copy(three/'build/three.module.min.js',lib/'three.module.min.js');shutil.copy(three/'LICENSE',lib/'LICENSE-Three.txt')
for f in ['loaders/GLTFLoader.js','utils/SkeletonUtils.js','utils/BufferGeometryUtils.js']:
 p=lib/'addons'/f;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy(three/'examples/jsm'/f,p)
s=(P/'modular_models.js').read_text().replace("'characters/models/'", "'../assets/models/'");(lib/'modular_models.js').write_text(s)
# The same skeletal manipulation as the sprite baker, with raster capture removed.
s=(P/'render.html').read_text();s=s[s.index('window.CR ='):s.index('</script></body>')]
s=re.sub(r'window\.(CR|PZ|KZ)\s*=',r'const \1 =',s);s=re.sub(r'window\.(render\w+)\s*=',r'const \1 =',s)
# Across the shoulders, with hanging arms and bent knees; the original sprite pose
# turns almost upside-down when viewed from the opposite side in live 3D.
s=s.replace("model2.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), th).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI)));", "model2.quaternion.setFromEuler(new THREE.Euler(.25,0,Math.PI*.47));")
# Live geometry uses physical elevation; sprite framing offsets must not leak
# into blended poses when a climb changes to standing/hand work.
s=s.replace("model.position.y = -fy + lift - (name === 'climb' ? 200 : 0);", "model.position.y = -fy + lift;")
s=s.replace("// 타기: 팔이 잘리지 않게 200 내려 찍는다 (게임에서 14px 올려 그린다)", "// Feet stay in the live actor coordinate system.")
names=re.findall(r'const (render\w+)\s*=',s)
pre="""// Generated from the shared CC0 pose baker by tools/build_club_study.py.
import * as THREE from 'three';
export function createPoseDriver(a,b){
 let {model,mixer,bones,mats,clips}=a;
 let model2=b.model,mixer2=b.mixer,bones2=b.bones,mats2=b.mats,clips2=b.clips;
 const partsOn=[[],[]],BODY=null,window={},modular=true,CY=210,RS=128,shadow=new THREE.Object3D(),root=new THREE.Group(),scene=root,grp=new THREE.Group();root.add(model,grp);grp.add(model2);model2.visible=false;
 const renderer={domElement:{toDataURL:()=>''},setSize:()=>{}},renderSprite=()=>{};
"""
post="\nreturn {handPosition(side='Right'){root.updateMatrixWorld(true);return bones[side+'Hand'].getWorldPosition(new THREE.Vector3());},handling(t,a){renderHandling(t,a,'a');grp.add(model);grp.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));model2.visible=true;},offsetPartner(v){const yaw=grp.rotation.y;model2.position.add(v.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-yaw));},reach(side,target,weight=1){if(weight<.001)return 0;root.updateMatrixWorld(true);const B=bones,s=new THREE.Vector3(),e=new THREE.Vector3(),w=new THREE.Vector3();B[side+'Arm'].getWorldPosition(s);B[side+'ForeArm'].getWorldPosition(e);B[side+'Hand'].getWorldPosition(w);target=w.clone().lerp(target,weight);const initialHip=B.Spine.quaternion.clone(),direction=target.clone().sub(s);direction.y=0;direction.normalize();const full=e.distanceTo(s)+w.distanceTo(e);for(const lean of [.0,.15,.3,.45,.6,.75,.9,1.05,1.2,1.35]){B.Spine.quaternion.copy(initialHip);B.Spine.updateMatrixWorld(true);aimB(B.Spine,B.Spine1,new THREE.Vector3(direction.x*Math.sin(lean*weight),Math.cos(lean*weight),direction.z*Math.sin(lean*weight)));root.updateMatrixWorld(true);B[side+'Arm'].getWorldPosition(s);B[side+'ForeArm'].getWorldPosition(e);B[side+'Hand'].getWorldPosition(w);if(s.distanceTo(target)<full*.99)break;}const u=e.distanceTo(s),v=w.distanceTo(e),dir=target.clone().sub(s),d=Math.min(dir.length(),(u+v)*.995);dir.normalize();const pole=new THREE.Vector3(side==='Left'?1:-1,-.45,.1);pole.addScaledVector(dir,-pole.dot(dir)).normalize();const a=(u*u-v*v+d*d)/(2*Math.max(.0001,d)),h=Math.sqrt(Math.max(0,u*u-a*a)),elbow=s.clone().addScaledVector(dir,a).addScaledVector(pole,h);aimB(B[side+'Arm'],B[side+'ForeArm'],elbow.sub(s).normalize());B[side+'ForeArm'].getWorldPosition(e);aimB(B[side+'ForeArm'],B[side+'Hand'],target.clone().sub(e).normalize());root.updateMatrixWorld(true);B[side+'Hand'].getWorldPosition(w);return w.distanceTo(target);},snapshot:snapPose,mix:mixPose,pair(kind,clip,t,a){if(clip==='Walk'&&(kind==='carry'||kind==='grab')){posePair(kind,clip,t);grp.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));model2.visible=true;return;}const k=Math.min(2,Math.floor(t));posePair(kind,clip,k);const A=snapPose();posePair(kind,clip,k+1);const B=snapPose();mixPose(A,B,t-k);grp.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));model2.visible=true;},root,model,get partner(){return model2},setPrimary(a){model.removeFromParent();({model,mixer,bones,mats,clips}=a);root.add(model);},setPartner(b){model2.removeFromParent();({model:model2,mixer:mixer2,bones:bones2,mats:mats2,clips:clips2}=b);grp.add(model2);},"+','.join(names)+",reset(){root.add(model);grp.rotation.set(0,0,0);grp.position.set(0,0,0);root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);root.updateMatrixWorld(true);model2.visible=false;}};\n}\n"
(O/'pose_driver.js').write_text(pre+s+post);(O/'assets/sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
