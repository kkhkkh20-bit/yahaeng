import * as THREE from 'three';
// Share the game's wall rays, light samples and standing/crouching visibility bands.
// Ground meshes are depth-tested, so roofs, walls and props occlude the display.
export function createSight(G,scene,people,visibility){
 const entries=new Map();
 function make(g){const geometry=new THREE.BufferGeometry(),material=new THREE.MeshBasicMaterial({color:'#aabfc0',transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);const e={g,mesh,t:-Infinity,signature:'',cells:[]};entries.set(g,e);return e;}
 function rebuild(e,cn,level){
  const pos=[],cells=[],R=cn.rays,restore=G.layer;G.setLayer(e.g.fl||0);
  for(let i=0;i<R.length-1;i++){
   const a=R[i],b=R[i+1];
   for(let j=0;j<Math.min(a.lv.length,b.lv.length);j++){
    if(a.lv[j]<level||b.lv[j]<level)continue;
    const start=j*cn.STP,endA=Math.min(a.w,(j+1)*cn.STP),endB=Math.min(b.w,(j+1)*cn.STP);
    if(start>=endA||start>=endB)continue;
    const angle=(a.ra+b.ra)/2,d=(start+Math.min(endA,endB))/2,g=e.g,P=G.S.player,x=g.x+Math.cos(g.a+angle)*d,y=g.y+Math.sin(g.a+angle)*d;
    const visible=G.canSee(g,x,y,G.lightAtG(x,y,g.fl||0),false,P.cover?2:P.mode==='sneak',g.z||0)>0;
    if(!visible)continue;
    const point=(r,d)=>[Math.cos(r.ra)*d/48,0,Math.sin(r.ra)*d/48],p=point(a,start),q=point(b,start),r=point(a,endA),s=point(b,endB);
    pos.push(...p,...r,...q,...q,...r,...s);cells.push({angle:(a.ra+b.ra)/2,from:start,to:Math.min(endA,endB)});
   }
  }
  // The AI also detects very close targets behind its forward cone.
  const g=e.g,P=G.S.player,radius=P.mode==='sneak'||P.cover?23:P.mode==='run'&&P.moving?71:33;
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,b=(i+1)/48*Math.PI*2,mid=(a+b)/2,ra=Math.min(radius,G.castRay(g.x,g.y,g.a+a,radius,g.z||0)),rb=Math.min(radius,G.castRay(g.x,g.y,g.a+b,radius,g.z||0)),r=Math.min(ra,rb);if(r<3)continue;
   pos.push(0,0,0,Math.cos(a)*ra/48,0,Math.sin(a)*ra/48,Math.cos(b)*rb/48,0,Math.sin(b)*rb/48);cells.push({angle:mid,from:0,to:r,near:true,running:radius===71});
  }
  G.setLayer(restore);
  e.mesh.geometry.dispose();e.mesh.geometry=new THREE.BufferGeometry();e.mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));e.cells=cells;
 }
 function update(){
  const S=G.S,P=S.player,level=P.mode==='sneak'||P.cover?2:1,context=[level,!!P.cover,P.mode,!!P.moving,...S.doors.map(d=>+d.locked),...S.lamps.map(l=>+G.lampOn(l))].join(':');
  for(const g of S.guards){
   if(g.civ)continue;const e=entries.get(g)||make(g),active=!['DEAD','CAPTIVE','TERROR','SLEEP'].includes(g.state)&&!g.doomed&&!g.climb&&(g.fl||0)===(P.fl||0)&&(!visibility||visibility.visible(g));
   e.mesh.visible=active;if(!active)continue;
   const signature=context+':'+g.state;
   if(!e.sample||e.signature!==signature||S.t<e.t||S.t-e.t>=.05||Math.abs(g.a-e.sample.a)>.04){g._cone=null;const cn=G.guardCone(g,G.guardFov(g),G.guardRanges(g));rebuild(e,cn,level);e.cn=cn;e.signature=signature;e.t=S.t;e.sample={x:g.x,y:g.y,a:g.a};}
   e.mesh.position.set(g.x/48,people.height(g)+.075,g.y/48);e.mesh.rotation.y=-g.a;
   const phase=G.guardAwareness(g).phase;e.phase=phase;e.mesh.material.color.set(phase==='seen'?'#cb7864':['suspect','search'].includes(phase)?'#d4ba7b':'#aabfc0');e.mesh.material.opacity=g===S.marked?.23:phase==='seen'?.25:.2;
  }
  for(const[g,e]of entries)if(!S.guards.includes(g)){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();entries.delete(g);}
 }
 return{entries,update,dispose(){for(const e of entries.values()){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();}entries.clear();}};
}
