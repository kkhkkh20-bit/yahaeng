import * as THREE from 'three';
// Share the game's wall rays, light samples and standing/crouching visibility bands.
// Ground meshes are depth-tested, so roofs, walls and props occlude the display.
export function createSight(G,scene,people){
 const entries=new Map();
 function make(g){const geometry=new THREE.BufferGeometry(),material=new THREE.MeshBasicMaterial({color:'#aabfc0',transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);const e={g,mesh,t:-Infinity,signature:'',cells:[]};entries.set(g,e);return e;}
 function rebuild(e,cn,level){
  const pos=[],cells=[],R=cn.rays;
  for(let i=0;i<R.length-1;i++){
   const a=R[i],b=R[i+1];
   for(let j=0;j<Math.min(a.lv.length,b.lv.length);j++){
    if(a.lv[j]<level||b.lv[j]<level)continue;
    const start=j*cn.STP,endA=Math.min(a.w,(j+1)*cn.STP),endB=Math.min(b.w,(j+1)*cn.STP);
    if(start>=endA||start>=endB)continue;
    const angle=(a.ra+b.ra)/2,d=(start+Math.min(endA,endB))/2,g=e.g,P=G.S.player,x=g.x+Math.cos(g.a+angle)*d,y=g.y+Math.sin(g.a+angle)*d;
    G.setLayer(g.fl||0);const visible=G.canSee(g,x,y,G.lightAtG(x,y,g.fl||0),false,P.cover?2:P.mode==='sneak',g.z||0)>0;G.setLayer(0);
    if(!visible)continue;
    const point=(r,d)=>[Math.cos(r.ra)*d/48,0,Math.sin(r.ra)*d/48],p=point(a,start),q=point(b,start),r=point(a,endA),s=point(b,endB);
    pos.push(...p,...r,...q,...q,...r,...s);cells.push({angle:(a.ra+b.ra)/2,from:start,to:Math.min(endA,endB)});
   }
  }
  e.mesh.geometry.dispose();e.mesh.geometry=new THREE.BufferGeometry();e.mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));e.cells=cells;
 }
 function update(){
  const S=G.S,P=S.player,level=P.mode==='sneak'||P.cover?2:1;
  for(const g of S.guards){
   if(g.civ)continue;const e=entries.get(g)||make(g),active=!['DEAD','CAPTIVE','TERROR','SLEEP'].includes(g.state)&&!g.doomed&&!g.climb&&(g.fl||0)===(P.fl||0)&&G.miniGuardVisible(g);
   e.mesh.visible=active;if(!active)continue;
   const cn=G.guardCone(g,G.guardFov(g),G.guardRanges(g)),signature=level+':'+!!P.cover+':'+cn.STP;
   if(e.cn!==cn||e.signature!==signature){rebuild(e,cn,level);e.cn=cn;e.signature=signature;e.t=S.t;}
   e.mesh.position.set(g.x/48,people.height(g)+.075,g.y/48);e.mesh.rotation.y=-g.a;
   const phase=G.guardAwareness(g).phase;e.phase=phase;e.mesh.material.color.set(phase==='seen'?'#cb7864':['suspect','search'].includes(phase)?'#d4ba7b':'#aabfc0');e.mesh.material.opacity=g===S.marked?.23:phase==='seen'?.25:.2;
  }
  for(const[g,e]of entries)if(!S.guards.includes(g)){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();entries.delete(g);}
 }
 return{entries,update,dispose(){for(const e of entries.values()){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.dispose();}entries.clear();}};
}
