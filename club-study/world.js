import * as THREE from 'three';
import {batchStatic} from './batch.js?v=v131-585247f537b3';
import {makeMaterials} from './materials.js?v=v131-585247f537b3';
import {createVisibility} from './visibility.js?v=v131-585247f537b3';
import {createPassages} from './passages.js?v=v131-585247f537b3';
import {createLighting} from './lighting.js?v=v131-585247f537b3';
export const FLOOR=2.8;
const boxG=new THREE.BoxGeometry(1,1,1),postG=new THREE.CylinderGeometry(.028,.028,1,8);
function mesh(parent,geo,mat,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export const box=(p,m,x,y,z,w,h,d)=>mesh(p,boxG,m,x,y,z,w,h,d);
function bar(p,m,a,b,r=.025){const v=new THREE.Vector3().subVectors(b,a),o=mesh(p,postG,m,...a.clone().add(b).multiplyScalar(.5).toArray(),r/.028,v.length(),r/.028);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function sign(parent,text,w,h,color='#d6c9a8',background='#1d2c2b'){
 const c=document.createElement('canvas');c.width=768;c.height=192;const x=c.getContext('2d');x.fillStyle=background;x.fillRect(0,0,768,192);x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font='600 108px "IBM Plex Sans KR",sans-serif';x.fillText(text,384,105,700);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:'#d6c6aa',emissiveIntensity:.3,roughness:.65});const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);parent.add(o);return o;
}
function puddle(p,x,z,sx,sz){const m=new THREE.MeshStandardMaterial({color:'#3f5056',roughness:.18,metalness:.28,transparent:true,opacity:.38});const o=new THREE.Mesh(new THREE.CircleGeometry(1,32),m);o.rotation.x=-Math.PI/2;o.scale.set(sx,sz,1);o.position.set(x,.014,z);o.receiveShadow=true;p.add(o);}
function cabinet(p,m,x,y,z,w,d,steel=false){
 const g=new THREE.Group();g.position.set(x,y,z);p.add(g);const H=steel?1.9:1.75,mat=steel?m.metal:m.wood;
 box(g,m.dark,0,H/2,0,w,H,d);box(g,mat,0,H-.04,0,w+.03,.08,d+.03);box(g,mat,-w/2+.035,H/2,0,.07,H,d);box(g,mat,w/2-.035,H/2,0,.07,H,d);box(g,mat,0,.06,0,w,.12,d);
 const leaves=[];for(let k=0;k<(steel?1:2);k++){const width=(w-.15)/(steel?1:2),side=k? -1:1,hinge=new THREE.Group();hinge.position.set(k?w/2-.08:-w/2+.08,.1,d/2+.015);g.add(hinge);box(hinge,mat,side*width/2,(H-.2)/2,0,width,H-.2,.055);box(hinge,m.steel,side*(width-.07),.87,.05,.025,.15,.035);if(steel)for(let j=0;j<4;j++)box(hinge,m.dark,side*width/2,1.45+j*.045,.034,width*.62,.013,.012);leaves.push({hinge,side,handle:new THREE.Vector3(side*(width-.07),.87,.05)});}
 return{group:g,leaves,grip(){return leaves[0].hinge.localToWorld(leaves[0].handle.clone());},open(v){leaves.forEach(({hinge,side})=>hinge.rotation.y=-side*v*Math.PI*.53);}};
}
function dumpster(p,m,x,z){
 const g=new THREE.Group();g.position.set(x,0,z);p.add(g);const w=1.18,d=.9,H=1.12;
 box(g,m.dark,0,.64,0,w,H,d);box(g,m.metal,0,.6,d/2,w,.94,.055);box(g,m.metal,-w/2,.6,0,.05,.94,d);box(g,m.metal,w/2,.6,0,.05,.94,d);box(g,m.metal,0,.6,-d/2,w,.94,.05);
 for(const x of [-.48,.48])for(const z of [-.32,.32]){const wheel=mesh(g,new THREE.CylinderGeometry(.105,.105,.065,12),m.dark,x,.11,z);wheel.rotation.z=Math.PI/2;}
 const lid=new THREE.Group();lid.position.set(0,1.15,-d/2);g.add(lid);box(lid,m.metal,0,.025,d/2,w+.07,.06,d+.07);for(let k=-2;k<=2;k++)box(lid,m.trim,k*.21,.065,d/2,.018,.035,d-.08);box(lid,m.steel,0,.06,d-.06,.26,.05,.035);
 return{group:g,grip(){return lid.localToWorld(new THREE.Vector3(0,.06,d-.06));},open(v){lid.rotation.x=-v*1.65;}};
}
export function buildWorld(G,scene){
 const visibility=createVisibility(G),mat=makeMaterials(),root=new THREE.Group();scene.add(root);const floorGroups=[],frontWalls=[],frontCuts=[],roofs=[],doors=[],windows=[],hides=[],items=[],lamps=[],bld=G.BLD,grids=[G.G0,...G.GF.slice(1)],stairs=[];
 const passages=createPassages(G,scene,mat,{box,bar,mesh});
 const baseMat=mat.asphalt.clone();baseMat.map=baseMat.map.clone();baseMat.map.repeat.set(G.MW/2,G.MH/2);baseMat.bumpMap=baseMat.map;
 box(root,baseMat,G.MW/2,-.13,G.MH/2,G.MW+60,.24,G.MH+60);
 // A kerb and long, quiet paving slabs separate the street from the service lane.
 for(let x=1;x<G.MW-1;x++){box(root,mat.concrete,x+.5,.025,18.5,.985,.055,3.8);box(root,mat.trim,x+.5,.035,16.55,.985,.08,.14);}
 const allDoors=new Map(G.S.doors.map(d=>[`${d.fl||0}:${d.tx},${d.ty}`,d])),allWindows=new Map(G.S.windows.concat(G.S.fwindows||[]).map(w=>[`${w.fl||0}:${w.tx},${w.ty}`,w]));
 const atB=(x,z)=>bld.findIndex(b=>x>=b.x0&&x<=b.x1&&z>=b.y0&&z<=b.y1);
 const holes=new Set();
 for(const l of G.S.ladders.filter(l=>l.kind==='fstair')){
  const lo=G.stairFloor(l.tx,l.ty,l.bfl||0),plan=G.stairTravel(l,lo.up.entry,true),pts=plan.pts.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>1).map(p=>new THREE.Vector3(p.x/48,0,p.y/48));let length=0;const distances=[0];for(let i=1;i<pts.length;i++){length+=pts[i].distanceTo(pts[i-1]);distances.push(length);}
  const group=new THREE.Group();root.add(group);const n=Math.ceil(FLOOR/.16),ys=(l.bfl||0)*FLOOR;
  const point=t=>{const d=t*length;let k=1;while(k<distances.length-1&&d>distances[k])k++;return pts[k-1].clone().lerp(pts[k],(d-distances[k-1])/Math.max(.001,distances[k]-distances[k-1]));};
  for(let i=0;i<n;i++){const p=point((i+.5)/n),a=point(i/n),b=point((i+1)/n),h=(i+1)/n*FLOOR;const tread=box(group,mat.concrete,p.x,ys+h/2,p.z,.9,h,length/n+.02);tread.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);const hx=Math.floor(p.x),hz=Math.floor(p.z);if(grids[l.tfl]?.[hz]?.[hx]==='K')holes.add(`${l.tfl}:${hx},${hz}`);}
  for(const side of [-1,1]){let prev=null;for(let i=0;i<=n;i++){const p=point(i/n),ahead=point(Math.min(1,(i+1)/n)),behind=point(Math.max(0,(i-1)/n)),d=ahead.sub(behind).normalize();p.x+=d.z*side*.46;p.z-=d.x*side*.46;p.y=ys+FLOOR*i/n+.92;if(i%3===0){const low=p.clone();low.y-=.85;bar(group,mat.trim,low,p,.018);}if(prev)bar(group,mat.steel,prev,p,.021);prev=p;}}
  stairs.push({l,plan,points:pts,length,group});
 }
 for(let fl=0;fl<grids.length;fl++){
  const grid=grids[fl];if(!grid)continue;const group=new THREE.Group();floorGroups[fl]=group;root.add(group);
  for(let z=0;z<G.MH;z++)for(let x=0;x<G.MW;x++){
   const ch=grid[z][x],bi=atB(x,z),originalB=bld[bi],b=bi===0&&fl===1?{...originalB,x0:11,y1:12}:originalB;if(!fl&&bi<0&&x>0&&z>0&&x<G.MW-1&&z<G.MH-1)continue;if(fl&&(!b||b.h<=fl))continue;
   if(ch==='V')continue;
   if(b&&ch!=='V'&&!holes.has(`${fl}:${x},${z}`))box(group,bi===0?mat.wood:mat.concrete,x+.5,fl*FLOOR-.05,z+.5,1,.1,1);
   const door=allDoors.get(`${fl}:${x},${z}`),win=allWindows.get(`${fl}:${x},${z}`),edge=b&&(x===b.x0||x===b.x1||z===b.y0||z===b.y1);
   if(door||win){
    const vert=door?G.S.doors.some(d=>d===door)&&(x===b?.x0||x===b?.x1):x===b?.x0||x===b?.x1;const g=new THREE.Group();g.position.set(x+.5,fl*FLOOR,z+.5);g.rotation.y=vert?Math.PI/2:0;group.add(g);
    const h=win?1.07:0,top=win?2.14:2.17;
    const wallM=[mat.brick,mat.brick,mat.concrete,mat.concrete,mat.brick,mat.brick];if(b){wallM[vert?(x===b.x0?4:5):(z===b.y0?4:5)]=mat.plaster;}
    if(win)box(g,wallM,0,h/2,0,1,h,1);box(g,wallM,0,(top+FLOOR)/2,0,1,FLOOR-top,1);
    for(const s of [-1,1]){box(g,mat.trim,s*.46,(h+top)/2,0,.08,top-h,.99);box(g,mat.steel,s*.43,(h+top)/2,.51,.025,top-h,.035);}box(g,mat.trim,0,top-.035,0,.98,.07,1);
    if(door){
     const pivot=new THREE.Group();pivot.position.set(-.415,.02,0);g.add(pivot);box(pivot,mat.metal,.415,1.06,0,.83,2.12,.075);box(pivot,mat.trim,.415,.52,-.045,.65,.73,.025);box(pivot,mat.glass,.415,1.56,-.046,.65,.55,.015);box(pivot,mat.steel,.75,.99,-.09,.035,.14,.04);pivot.userData.dynamic=true;doors.push({d:door,pivot,group:g});
     if(!fl&&bi===0){box(g,mat.concrete,0,.015,.55,1.02,.05,.26);box(g,mat.trim,0,2.25,.48,1.7,.11,1.8);const s=sign(g,'백야',1.2,.28);s.position.set(0,2.02,.52);}
    }else{const pivot=new THREE.Group();g.add(pivot);box(pivot,mat.glass,0,(h+top)/2,0,.82,top-h-.1,.04);box(pivot,mat.steel,0,(h+top)/2,.04,.025,top-h-.08,.04);box(g,mat.trim,0,h+.01,.12,1.08,.07,1.28);pivot.userData.dynamic=true;windows.push({w:win,pivot});if(bi===0&&(x===b.x1||z===b.y1))frontCuts.push({group:g,fl,x:x+.5,z:z+.5,height:FLOOR});}
   }else if('#NSXV'.includes(ch)&&ch!=='V'){
    const materials=[mat.brick,mat.brick,mat.concrete,mat.concrete,mat.brick,mat.brick];if(b){if(z===b.y0)materials[4]=mat.plaster;if(z===b.y1)materials[5]=mat.plaster;if(x===b.x0)materials[0]=mat.plaster;if(x===b.x1)materials[1]=mat.plaster;}
    if(bi<0){box(group,mat.trim,x+.5,.18,z+.5,1,.36,1);if((x+z)%2===0){for(const a of [-.27,.27])bar(group,mat.trim,new THREE.Vector3(x+.5+a,.3,z+.5),new THREE.Vector3(x+.5+a,1.25,z+.5),.012);}continue;}
    const h=FLOOR,m=box(group,edge&&(x===b.x1||z===b.y1)?mat.brick:edge?materials:mat.plaster,x+.5,fl*FLOOR+h/2,z+.5,1,h,1);
    if(bi===0&&edge&&(x===b.x1||z===b.y1)){m.userData.dynamic=true;frontWalls.push({mesh:m,fl,height:h});}
    if(edge&&bi===0)box(group,mat.trim,x+.5,fl*FLOOR+.12,z+.5,1.015,.17,1.015);
   }
  }
 }
 for(const [bi,b]of bld.entries()){
  const g=new THREE.Group();root.add(g);const shape=bi===0?{...b,x0:11,y1:12}:b,cx=(shape.x0+shape.x1+1)/2,cz=(shape.y0+shape.y1+1)/2,w=shape.x1-shape.x0+1,d=shape.y1-shape.y0+1,y=b.h*FLOOR;
  box(g,mat.metal,cx,y+.09,cz,w+.16,.2,d+.16);for(let x=shape.x0+.15;x<shape.x1+1;x+=.55)box(g,mat.trim,x,y+.21,cz,.025,.035,d+.18);
  for(const z of [shape.y0-.03,shape.y1+1.03])box(g,mat.concrete,cx,y-.08,z,w+.12,.22,.17);
  if(bi===0){for(const [x,z]of [[b.x1-2,b.y0+2],[b.x1-4,b.y0+2]]){box(g,mat.steel,x,y+.43,z,.95,.64,.7);box(g,mat.trim,x,y+.48,z+.36,.8,.46,.04);const fan=mesh(g,new THREE.TorusGeometry(.17,.018,6,20),mat.dark,x,y+.48,z+.4);for(let k=0;k<4;k++){const blade=box(g,mat.trim,x,y+.48,z+.41,.31,.025,.025);blade.rotation.z=k*Math.PI/4;}}}

  if(bi===0){
   box(g,mat.metal,9.5,FLOOR+.08,8.5,3,.16,9);box(g,mat.metal,14.5,FLOOR+.08,14.5,13,.16,3);
   for(let x=8.2;x<21;x+=.55)box(g,mat.trim,x,FLOOR+.18,14.5,.025,.025,3.1);
   for(let z=4.2;z<13;z+=.55)box(g,mat.trim,9.5,FLOOR+.18,z,3.1,.025,.025);
  }
  roofs.push({bi,group:g});
  if(bi!==0){const s=sign(g,bi===1?'골목식당':'레코드',2.3,.47,bi===1?'#d7ba92':'#a7bfc0',bi===1?'#49382b':'#233536');s.position.set(cx,2.2,b.y1+1.02);box(g,mat.metal,cx,1.02,b.y1+.72,w-.8,1.7,.1);for(let j=.25;j<1.8;j+=.1)box(g,mat.trim,cx,j,b.y1+.79,w-.85,.015,.018);}
 }
 // Actual furniture footprints, built at human scale. No decorative blocking objects.
 const hidden=new Set(G.S.hides.filter(h=>h.furn&&['locker','wardrobe','cab'].includes(h.type)).map(h=>`${h.fl||0}:${h.tx},${h.ty}`));
 for(const f of G.FURN){const p=floorGroups[f.fl||0];if(!p)continue;const x=f.x+f.w/2,z=f.y+f.h/2,y=(f.fl||0)*FLOOR,w=f.w*.92,d=f.h*.83;
  if(hidden.has(`${f.fl||0}:${f.x},${f.y}`))continue;
  if(['desk','desk2','table','tableS'].includes(f.t)){
   box(p,mat.wood,x,y+.78,z,w,.1,d);for(const a of [-1,1])for(const b of [-1,1])box(p,mat.trim,x+a*(w/2-.08),y+.37,z+b*(d/2-.07),.055,.74,.055);
   if(f.t.startsWith('desk')){box(p,mat.dark,x-.1,y+1.04,z-.13,.36,.4,.06);box(p,mat.trim,x-.1,y+.83,z-.13,.07,.16,.06);box(p,mat.dark,x-.1,y+.85,z+.13,.4,.025,.15);box(p,mat.paper,x+.23,y+.85,z+.15,.16,.018,.21);}
  }else if(f.t==='bar'){box(p,mat.dark,x,y+.48,z,w,.95,d);box(p,mat.wood,x,y+1.01,z,w+.06,.1,d+.05);box(p,mat.steel,x,y+.2,z+d/2,w,.035,.035);for(let k=0;k<f.w*2;k++){mesh(p,new THREE.CylinderGeometry(.025,.033,.2,8),mat.glass,x-w/2+.15+k*.32,y+1.15,z-.1);}}
  else if(f.t==='sofa'){box(p,mat.leather,x,y+.4,z,w,.3,d);box(p,mat.leather,x,y+.7,z-d/2+.1,w,.65,.18);for(const side of [-1,1])box(p,mat.leather,x+side*(w/2-.07),y+.55,z,.14,.52,d);for(let k=0;k<f.w;k++)box(p,mat.leather,f.x+.5+k,y+.6,z+.04,.78,.14,d-.2);}
  else if(['locker','wardrobe','cab','shelf','shelfS'].includes(f.t)){cabinet(p,mat,x,y,z,w,d,f.t==='locker');}
  else if(f.t==='chairD'||f.t==='chair'){box(p,mat.leather,x,y+.49,z,.45,.12,.45);box(p,mat.leather,x,y+.8,z-.19,.46,.59,.09);for(const a of [-1,1])for(const b of [-1,1])box(p,mat.trim,x+a*.17,y+.23,z+b*.17,.025,.46,.025);}
  else if(['boxes','spk'].includes(f.t)){box(p,mat.wood,x,y+.45,z,w,.9,d);}
  else if(f.t==='plant'){box(p,mat.concrete,x,y+.25,z,w,.5,d);for(let k=0;k<7;k++){const leaf=mesh(p,new THREE.SphereGeometry(.18,6,4),mat.leather,x+Math.sin(k)*.19,y+.6+(k%2)*.16,z+Math.cos(k)*.19,.5,1.9,1);leaf.rotation.z=k;}}
 }
 for(const h of G.S.hides){if(!['box','well','locker','wardrobe','cab'].includes(h.type))continue;const fl=h.fl||0,p=floorGroups[fl]||root,x=h.furn?h.tx+(h.w||1)/2:h.x/48,z=h.furn?h.ty+(h.h||1)/2:h.y/48;const v=h.type==='well'?passages.makeWell(p,h):h.type==='box'?dumpster(p,mat,x,z):cabinet(p,mat,x,fl*FLOOR,z,(h.w||1)*.92,(h.h||1)*.8,h.type==='locker');v.group.userData.dynamic=true;hides.push({h,v});}
 // Dense, low foliage is a real hide surface, using the existing bush occupancy/rules.
 mat.foliage=new THREE.MeshStandardMaterial({color:'#46513c',roughness:1});
 for(const h of G.S.bushes){const g=new THREE.Group();g.position.set(h.x/48,(h.fl||0)*FLOOR,h.y/48);(floorGroups[h.fl||0]||root).add(g);box(g,mat.concrete,0,.12,0,1.05,.24,1.05);box(g,mat.dark,0,.245,0,.9,.05,.9);for(let i=0;i<11;i++){const a=i*2.399,r=i?.12+(i%3)*.11:0;mesh(g,new THREE.IcosahedronGeometry(.26,1),mat.foliage,Math.cos(a)*r,.48+(i%3)*.065,Math.sin(a)*r,1,1.2,1);}g.userData.dynamic=true;hides.push({h,v:{group:g,open(){},grip(){return new THREE.Vector3(h.x/48,.5,h.y/48);}}});}
 for(const v of G.S.vents)passages.makeVent(floorGroups[0]||root,v);
 // Foreground cutaways must never cut the container they are revealing.
 for(const {v}of [...hides,...passages.fixtures]){const clones=new Map();v.group.traverse(o=>{if(!o.isMesh)return;const clone=m=>{if(!clones.has(m)){const n=m.clone();n.userData.noForeground=true;clones.set(m,n);}return clones.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});}
 for(const it of G.S.items){const f=G.FURN.filter(f=>(f.fl||0)===(it.fl||0)&&f.t===it.furn).sort((a,b)=>Math.hypot(a.x+.5-it.dx/48,a.y+.5-it.dy/48)-Math.hypot(b.x+.5-it.dx/48,b.y+.5-it.dy/48))[0];const dx=it.x/48-(f?f.x+f.w/2:it.x/48),dz=it.y/48-(f?f.y+f.h/2:it.y/48),norm=Math.hypot(dx,dz)||1,x=f?f.x+f.w/2+dx/norm*.42:it.x/48,z=f?f.y+f.h/2+dz/norm*.42:it.y/48,y=(it.fl||0)*FLOOR+(f?.t.startsWith('desk')?.86:.82);const o=box(floorGroups[it.fl||0]||root,mat.wood,x,y,z,.23,.045,.3);box(o,mat.paper,0,.55,0,.82,.18,.84);o.userData.dynamic=true;items.push({it,mesh:o,at:new THREE.Vector3(x,y+.25,z)});}
 lamps.push(...createLighting(G,root,floorGroups,mat,{box,bar}));
 // Drainage, cable runs and rain marks sit on their real outside surfaces.
 for(let z=4;z<16;z++){box(root,mat.trim,7.65,.012,z+.5,.2,.024,.92);for(let k=0;k<5;k++)box(root,mat.dark,7.65,.029,z+.17+k*.14,.16,.012,.035);}
 for(const x of [8.02,20.98])bar(root,mat.trim,new THREE.Vector3(x,.12,4.0),new THREE.Vector3(x,5.65,4.0),.045);
 const cablePts=[new THREE.Vector3(4.5,3.1,11.8),new THREE.Vector3(6.3,2.9,12),new THREE.Vector3(8.1,3.4,12.2)];mesh(root,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts),24,.016,5,false),mat.dark,0,0,0);
 puddle(root,6.1,14.2,1.3,.52);puddle(root,12.7,17.1,2.1,.55);puddle(root,6,4.7,.8,.4);
 const logo=sign(root,'백야',.55,1.5,'#a9d5d2','#233a3c');logo.position.set(8.3,1.95,16.03);logo.rotation.y=0;
 const glow=new THREE.PointLight('#58a7ab',3,4,2);glow.position.set(8.3,2,16.5);root.add(glow);
 // Quiet neighbouring facades give the lane context beyond the playable fence.
 for(const [x,z,w,d,h]of [[-4,3,5,11,7.4],[29,5,7,12,8.3],[9,-5,13,6,8.1],[18,28,14,5,6.8]]){
  box(root,mat.brick,x,h/2,z,w,h,d);box(root,mat.trim,x,h,z,w+.2,.18,d+.2);
  for(let xx=x-w/2+.7;xx<x+w/2;xx+=1.4)for(let yy=1.4;yy<h-.4;yy+=2.3){box(root,mat.trim,xx,yy,z+d/2+.035,.72,1.1,.08);box(root,mat.glass,xx,yy,z+d/2+.09,.58,.94,.025);}
 }
 for(const o of frontWalls)frontCuts.push({group:o.mesh,fl:o.fl,x:o.mesh.position.x,z:o.mesh.position.z,height:o.height});
 const planes=[];for(const o of frontCuts){const plane=new THREE.Plane(new THREE.Vector3(0,-1,0),o.fl*FLOOR+o.height+.01);o.group.traverse(n=>{if(!n.isMesh)return;const clone=m=>{const c=m.clone();c.clippingPlanes=[plane];return c;};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);});o.group.userData.dynamic=true;const cap=box(floorGroups[o.fl],mat.concrete,o.x,o.fl*FLOOR+.24,o.z,1.005,.035,1.005);cap.visible=false;cap.userData.dynamic=true;planes.push({...o,plane,cap,current:o.height});}
 const batch={};for(let f=0;f<floorGroups.length;f++)if(floorGroups[f])batch['floor'+f]=batchStatic(floorGroups[f]);for(const o of roofs)batch['roof'+o.bi]=batchStatic(o.group);batch.street=batchStatic(root,new Set([...floorGroups.filter(Boolean),...roofs.map(o=>o.group)]));
 const fades=[];for(const group of [floorGroups[1],...roofs.filter(o=>o.bi===0).map(o=>o.group)].filter(Boolean)){const cloned=new Map();group.traverse(o=>{if(!o.isMesh)return;const clone=m=>{if(!cloned.has(m)){const c=m.clone();c.userData.maxOpacity=m.opacity;c.transparent=true;cloned.set(m,c);}return cloned.get(m)};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});fades.push({group,value:1,materials:[...cloned.values()]});}
 visibility.install(floorGroups[1],'overhead');visibility.install(roofs.find(o=>o.bi===0)?.group,'overhead');for(const o of planes)if(!o.fl)visibility.install(o.group,'wall');
 // The sight shader clones materials; fades must drive those live instances.
 for(const f of fades){const live=new Set();f.group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])live.add(m);});f.materials=[...live];}
 let updated=G.S.t;
 return{root,mat,visibility,passages,floorGroups,frontWalls,roofs,doors,windows,hides,items,lamps,stairs,batch,update(){visibility.update();const mode=passages.update();root.visible=!mode;const dt=Math.max(.016,Math.min(.08,G.S.t-updated));updated=G.S.t;const alpha=1-Math.exp(-dt*14),P=G.S.player,inside=visibility.inside===0&&!P.z,upper=inside&&((P.fl||0)>0||P.trav?.stairs&&P.trav.t/P.trav.dur>.6);
  for(const f of fades){const wanted=f.group===floorGroups[1]?(!inside||upper?1:0):inside?0:1;f.value+=(wanted-f.value)*alpha;f.group.visible=f.value>.005;for(const m of f.materials){m.opacity=m.userData.maxOpacity*f.value;m.depthWrite=f.value>.98;}}
  for(const o of planes){const h=inside&&o.fl===(upper?1:0)?.24:o.height;o.current+=(h-o.current)*alpha;o.plane.constant=o.fl*FLOOR+o.current+.005;o.cap.position.y=o.fl*FLOOR+o.current;o.cap.visible=o.current<o.height-.05;}
  for(const {d,pivot}of doors)pivot.rotation.y=G.doorVisualOpen(d)*Math.PI*.54;
  for(const {w,pivot}of windows)pivot.rotation.y=(!w.st||w.st==='open')?Math.PI*.55:0;
  for(const {h,v}of hides){v.group.visible=visibility.visible(h,true)||P.hide===h||P.trav?.hideFlow?.h===h;let open=0;const T=P.trav;if(T?.hideFlow?.h===h)open=G.hideFlowOpen(T);else if(T?.accessFlow?.h===h)open=G.accessOpen(T.accessFlow);else if(G.S.amb?.h===h){const f=G.S.amb.t/1.2;open=Math.min(1,f/.18,(1-f)/.16);}v.open(open);}
  for(const o of passages.fixtures)o.v.group.visible=visibility.visible(o.h,true)||G.S.player.trav?.accessFlow?.obj===o.obj;
  for(const o of items)o.mesh.visible=!o.it.got&&visibility.visible(o.it);for(const o of lamps){const on=G.lampOn(o.l);o.light.intensity=on?o.base:0;o.bulbMaterial.emissiveIntensity=on?1.1:0;o.lever.rotation.x=on?-.16:.16;}
 }};
}
