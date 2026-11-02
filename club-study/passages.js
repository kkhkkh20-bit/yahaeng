import * as THREE from 'three';
import {batchStatic} from './batch.js?v=v135-5442be5db15c';
export const SEWER_Y=-2.2,DUCT_Y=-1.05,WELL_HIDE_Y=-1.7;
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v)};
export function passageMode(P){const F=P.trav?.accessFlow;if(F){const p=clamp((F.t-F.walk-F.pre)/F.core);if(F.kind==='sewerDown')return p>.04?'sewer':null;if(F.kind==='surface')return p<.72?'sewer':null;if(F.kind==='ventIn')return p>.5?'duct':null;if(F.kind==='ventOut')return p<.5?'duct':null;}return P.under?'sewer':P.vent?'duct':null;}
export function accessMotion(P,G){const F=P.trav?.accessFlow;if(!F)return null;const p=G.accessProgress(F),q=F.t-F.walk,walking=F.t<F.walk,pre=q>=0&&q<F.pre,post=!!F.post&&q>=F.pre+F.core,kind=F.kind;
 let from=kind==='surface'?SEWER_Y:kind==='ventOut'?DUCT_Y:kind==='sewerDown'?WELL_HIDE_Y:0,to=kind==='ventIn'?DUCT_Y:kind==='sewerDown'?SEWER_Y:0;
 const y=walking||pre?from:post?to:from+(to-from)*ease(p),work=pre?{p:q/F.pre,closing:false}:post?{p:(q-F.pre-F.core)/F.post,closing:true}:null;
 return{F,p,y,walking,work,pose:kind==='surface'||kind==='sewerDown'?'climb':'duck'};
}
// Surface fixtures and passage cells use the simulation's exact map coordinates.
export function createPassages(G,scene,mat,{box,bar,mesh}){
 const root=new THREE.Group(),sewer=new THREE.Group(),duct=new THREE.Group();root.add(sewer,duct);scene.add(root);const grids={sewer:[],duct:[]},fixtures=[];
 const dark=new THREE.MeshStandardMaterial({color:'#172322',roughness:.96}),metal=new THREE.MeshStandardMaterial({color:'#59665e',roughness:.72,metalness:.25}),stone=new THREE.MeshStandardMaterial({color:'#56605a',roughness:1}),stripe=new THREE.MeshBasicMaterial({color:'#b6aa7d'});
 function makeWell(parent,h){const g=new THREE.Group();g.position.set(h.x/48,0,h.y/48);g.userData.dynamic=true;parent.add(g);
  const disk=new THREE.CylinderGeometry(.405,.405,.025,32),rim=new THREE.Mesh(new THREE.TorusGeometry(.435,.045,8,32),mat.steel);rim.rotation.x=Math.PI/2;rim.position.y=.043;g.add(rim);mesh(g,disk,mat.dark,0,.035,0);
  const lid=new THREE.Group();g.add(lid);mesh(lid,new THREE.CylinderGeometry(.405,.405,.055,32),metal,0,.085,0);for(let i=-3;i<=3;i++)box(lid,mat.dark,i*.09,.116,0,.025,.008,Math.sqrt(.39*.39-i*i*.0081)*1.8);box(lid,mat.steel,.19,.12,0,.095,.015,.045);
  return{group:g,grip(){return lid.localToWorld(new THREE.Vector3(.19,.12,0));},open(v){lid.position.set(v*.72,v*.08,-v*.12);lid.rotation.z=-v*.08;}};
 }
 function makeVent(parent,v){const g=new THREE.Group(),wall=!!v.street;g.position.set(v.x/48+(wall?.43:0),0,v.y/48);if(wall)g.rotation.y=-Math.PI/2;g.userData.dynamic=true;parent.add(g);const pivot=new THREE.Group();g.add(pivot);
  if(wall){box(g,metal,0,.5,0,.8,.84,.32);box(g,mat.dark,0,.51,.18,.67,.65,.025);pivot.position.set(-.36,.18,.2);box(pivot,mat.trim,.36,.32,0,.72,.64,.04);for(let k=0;k<6;k++)box(pivot,mat.steel,.36,.09+k*.09,.034,.61,.022,.028);box(pivot,mat.steel,.65,.32,.055,.025,.14,.035);}
  else{box(g,mat.trim,0,.025,0,.88,.045,.84);box(g,mat.dark,0,.055,0,.72,.045,.68);pivot.position.set(-.38,.065,-.36);box(pivot,mat.trim,.38,.025,.36,.82,.05,.78);for(let k=0;k<6;k++)box(pivot,mat.steel,.38,.055,.08+k*.11,.66,.025,.035);box(pivot,mat.steel,.7,.08,.36,.045,.03,.16);}
  const o={h:{type:'vent',x:v.x,y:v.y,tx:v.tx,ty:v.ty,fl:0,z:v.z||0,source:v},obj:v,v:{group:g,grip(){return pivot.localToWorld(wall?new THREE.Vector3(.65,.32,.055):new THREE.Vector3(.7,.08,.36));},open(t){if(wall)pivot.rotation.y=-t*Math.PI*.55;else pivot.rotation.z=t*Math.PI*.56;}}};fixtures.push(o);return o;
 }
 for(const[k,group,test,level]of [['sewer',sewer,G.ugAt,SEWER_Y],['duct',duct,G.ventAt,DUCT_Y]]){
  for(let y=0;y<G.MH;y++)for(let x=0;x<G.MW;x++)if(test(x,y)){grids[k].push([x,y]);box(group,k==='sewer'?stone:metal,x+.5,level-.07,y+.5,.995,.14,.995);
   if(k==='duct'){for(const z of [-.34,.34])box(group,mat.trim,x+.5,level+.012,y+.5+z,.95,.025,.025);}
   else{box(group,dark,x+.81,level+.008,y+.5,.16,.018,.98);if((x+y)%3===0){for(let k=-1;k<=1;k++)box(group,mat.steel,x+.78+k*.05,level+.025,y+.5,.018,.025,.24);}}
   for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(!test(x+dx,y+dy)){const front=dx>0||dy>0,H=front?.35:k==='sewer'?1.45:.9;box(group,k==='sewer'?stone:metal,x+.5+dx*.48,level+H/2,y+.5+dy*.48,dx?.065:1,H,dy?.065:1);if(!front&&k==='sewer')bar(group,mat.trim,new THREE.Vector3(x+.5+dx*.41-(dy?.5:0),level+.7,y+.5+dy*.41-(dx?.5:0)),new THREE.Vector3(x+.5+dx*.41+(dy?.5:0),level+.7,y+.5+dy*.41+(dx?.5:0)),.035);if(!front&&(x+y)%3===0)box(group,stripe,x+.5+dx*.43,level+.5,y+.5+dy*.43,dx?.018:.45,.035,dy?.018:.45);}
  }
  const openings=k==='sewer'?G.S.hides.filter(h=>h.type==='well'):G.S.vents;
  for(const h of openings){const x=h.x/48,z=h.y/48;if(k==='sewer'){for(const dx of [-.28,.28])bar(group,mat.steel,new THREE.Vector3(x+dx,level+.1,z-.3),new THREE.Vector3(x+dx,.02,z-.3),.018);for(let yy=level+.22;yy<.05;yy+=.28)bar(group,mat.steel,new THREE.Vector3(x-.28,yy,z-.3),new THREE.Vector3(x+.28,yy,z-.3),.016);}else{for(const dx of [-.31,.31])bar(group,mat.steel,new THREE.Vector3(x+dx,level+.08,z-.3),new THREE.Vector3(x+dx,.02,z-.3),.015);}
   const marker=new THREE.Mesh(new THREE.RingGeometry(.28,.31,32),stripe);marker.rotation.x=-Math.PI/2;marker.position.set(x,level+.035,z);group.add(marker);
  }
  batchStatic(group);
 }
 root.visible=false;
 function update(){const mode=passageMode(G.S.player);root.visible=!!mode;sewer.visible=mode==='sewer';duct.visible=mode==='duct';for(const o of fixtures){const F=G.S.player.trav?.accessFlow,T=G.S.player.trav?.ventPull;const open=F?.obj===o.obj?G.accessOpen(F):T?.v===o.obj?Math.min(1,T.t/.12,(T.dur-T.t)/.12):0;o.v.open(open);}return mode;}
 function drawMini(cv){const mode=passageMode(G.S.player);if(!mode)return false;const c=cv.getContext('2d'),s=Math.min(cv.width/G.MW,cv.height/G.MH),P=G.S.player;c.fillStyle='#172124';c.fillRect(0,0,cv.width,cv.height);c.fillStyle=mode==='sewer'?'#5c695e':'#697778';for(const[x,y]of grids[mode])c.fillRect(x*s+.5,y*s+.5,s-1,s-1);const exits=mode==='sewer'?G.S.hides.filter(h=>h.type==='well'):G.S.vents;c.strokeStyle='#d9c18b';c.lineWidth=1.3;for(const e of exits){c.beginPath();c.arc(e.x/48*s,e.y/48*s,3,0,Math.PI*2);c.stroke();}c.save();c.translate(P.x/48*s,P.y/48*s);c.rotate(P.a);c.fillStyle='#9fdcdd';c.beginPath();c.moveTo(4,0);c.lineTo(-3,-3);c.lineTo(-1,0);c.lineTo(-3,3);c.closePath();c.fill();c.restore();return true;}
 return{root,sewer,duct,grids,fixtures,makeWell,makeVent,update,drawMini,dispose(){root.removeFromParent();const geometry=new Set();root.traverse(o=>{if(o.isMesh)geometry.add(o.geometry);});geometry.forEach(g=>g.dispose());for(const m of[dark,metal,stone,stripe])m.dispose();}};
}
