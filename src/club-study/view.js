import * as THREE from 'three';
import {buildWorld,FLOOR} from './world.js';
import {createActors} from './actors.js';
import {makeReveal} from './reveal.js';
const style=document.createElement('style');style.textContent='.keys .kx{display:none}';document.head.append(style);
const loading=document.createElement('div');loading.id='clubLoading';loading.setAttribute('role','status');loading.style.cssText='position:fixed;inset:0;z-index:100;background:#10191c;color:#d8ccb3;display:grid;place-items:center;font:16px system-ui;letter-spacing:.1em';loading.textContent='골목 불러오는 중';document.body.append(loading);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 while(!window.__game)await sleep(25);await document.fonts.ready;const G=window.__game;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.domElement.id='clubWorld';renderer.domElement.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';const original=document.getElementById('game');original.before(renderer.domElement);original.style.background='transparent';
 renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.25:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#17272d');scene.fog=new THREE.Fog('#17272d',35,65);
 const sky=new THREE.HemisphereLight('#b5ced8','#49473b',1.35);scene.add(sky);
 const moon=new THREE.DirectionalLight('#c0d5de',2.6);moon.position.set(-9,18,8);scene.add(moon);moon.target.position.set(12,0,10);scene.add(moon.target);moon.castShadow=true;moon.shadow.mapSize.set(1536,1536);moon.shadow.camera.left=moon.shadow.camera.bottom=-22;moon.shadow.camera.right=moon.shadow.camera.top=22;moon.shadow.camera.near=1;moon.shadow.camera.far=60;moon.shadow.normalBias=.025;moon.shadow.bias=-.00015;moon.shadow.radius=2;
 const fill=new THREE.DirectionalLight('#e4be8b',.6);fill.position.set(10,12,-9);scene.add(fill);
 const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,150);camera.position.set(20,20,20);camera.lookAt(0,0,0);const target=new THREE.Vector3(10,0,10),offset=new THREE.Vector3(20,20,20),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),ndc=new THREE.Vector2();
 let world=null,people=null,reveal=null,occluded=false,state=null,lastT=0,width=0,height=0,pending=null,ready=false,lastFrame=performance.now(),frameCosts=[],contactTrace=[],degraded=false,lastOcclusion=-9;
 const ring=new THREE.Mesh(new THREE.RingGeometry(.29,.325,48),new THREE.MeshBasicMaterial({color:'#c5c6a1',transparent:true,opacity:.8,depthWrite:false,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.renderOrder=100;scene.add(ring);
 const targetRing=new THREE.Mesh(new THREE.RingGeometry(.31,.345,48),new THREE.MeshBasicMaterial({color:'#c96d57',transparent:true,opacity:.85,depthWrite:false}));targetRing.rotation.x=-Math.PI/2;scene.add(targetRing);
 function size(){if(innerWidth===width&&innerHeight===height)return;width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);const span=matchMedia('(pointer:coarse)').matches?14:14.5;camera.left=-span*width/height/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}
 function project(p){const v=p.clone().project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2,z:v.z};}
 function screenToWorld(x,y){ndc.set(x/width*2-1,1-y/height*2);ray.setFromCamera(ndc,camera);plane.constant=-(people?.height(G.S.player)||0);const p=new THREE.Vector3();return ray.ray.intersectPlane(plane,p)?{x:p.x*48,y:p.z*48}:null;}
 function direction(x,y){const n=Math.hypot(x,y);if(n<1e-6)return{x:0,y:0};const a=(x+y/Math.sin(Math.atan(1/Math.SQRT2)))/Math.SQRT2,b=(-x+y/Math.sin(Math.atan(1/Math.SQRT2)))/Math.SQRT2,k=n/Math.hypot(a,b);return{x:a*k,y:b*k};}
 async function rebuild(){
  ready=false;loading.style.display='grid';loading.textContent='골목 불러오는 중';const S=G.S;
  if(world){scene.remove(world.root);world.root.traverse(o=>{if(o.isMesh&&o.geometry!==ring.geometry)o.geometry.dispose();});}
  if(people)for(const a of people.actors.values())scene.remove(a.driver.root);
  world=buildWorld(G,scene);reveal=makeReveal(world.root);people=await createActors(G,scene);state=S;lastT=S.t;target.set(S.player.x/48-1.5,.6,S.player.y/48-1.5);size();camera.position.copy(target).add(offset);camera.lookAt(target);world.update();people.render(0);await renderer.compileAsync(scene,camera);ready=true;loading.style.display='none';
 }
 function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
 function badge(c,p,text,color='#e3cc8e'){
  if(p.z>1||p.x<8||p.x>width-8||p.y<150||p.y>height-120)return;c.font='600 12px "IBM Plex Sans KR",sans-serif';const w=c.measureText(text).width+15,x=Math.max(8,Math.min(width-w-8,p.x-w/2)),y=p.y-25;c.fillStyle='rgba(17,27,28,.88)';rounded(c,x,y,w,25,3);c.fill();c.fillStyle=color;c.textAlign='center';c.fillText(text,x+w/2,y+17);c.textAlign='left';
 }
 function overlay(ctx,canvas){
  const dpr=canvas.width/width;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);const P=G.S.player;
  G.SPEECH_R.length=0;G.ACTION_R.length=0;
  for(const o of world.items)if(!o.it.got&&(o.it.fl||0)===(P.fl||0)){const q=project(o.at);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#dfbd72';ctx.fillRect(-4,-4,8,8);ctx.restore();}
  const marked=G.S.marked;
  for(const g of G.S.guards){if(g.civ||['DEAD','CAPTIVE'].includes(g.state)||(g.fl||0)!==(P.fl||0)||g!==marked&&!g.seen&&!(g.meter>.15))continue;
   const cn=G.guardCone(g,G.guardFov(g),G.guardRanges(g)),base=people.height(g)+.025,points=[new THREE.Vector3(g.x/48,base,g.y/48)];
   for(const r of cn.rays){let k=r.lv.length-1;while(k>=0&&r.lv[k]<(P.mode==='sneak'?2:1))k--;const d=k<0?0:Math.min(r.w,(k+1)*cn.STP);points.push(new THREE.Vector3((g.x+Math.cos(r.a)*d)/48,base,(g.y+Math.sin(r.a)*d)/48));}
   ctx.beginPath();points.map(project).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=g.seen?'rgba(202,91,73,.13)':'rgba(179,199,199,.09)';ctx.strokeStyle=g.seen?'rgba(202,91,73,.5)':'rgba(179,199,199,.32)';ctx.lineWidth=1;ctx.fill();ctx.stroke();
  }
  if(G.input.aiming){const pt=G.aimPoint(),from=project(new THREE.Vector3(P.x/48,people.height(P)+1,P.y/48));if(pt){const to=project(new THREE.Vector3(pt.x/48,people.height(P)+.05,pt.y/48));ctx.strokeStyle='#cbd6c3';ctx.lineWidth=1.5;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.ellipse(to.x,to.y,10,5,0,0,Math.PI*2);ctx.stroke();}}
  const grab=G.grabAction(),env=G.envAction();if(grab.k==='grab'&&grab.g)badge(ctx,project(new THREE.Vector3(grab.g.x/48,people.height(grab.g)+1.85,grab.g.y/48)),matchMedia('(pointer:coarse)').matches?'붙잡기':'C · 붙잡기');
  if(env.k&&!['none','step','up'].includes(env.k)&&env.label&&!G.actionBusy()){
   const at=env.d||env.h||env.w||env.n||env.it||null;if(at?.x!=null)badge(ctx,project(new THREE.Vector3(at.x/48,(at.fl||0)*FLOOR+1.25,at.y/48)),(matchMedia('(pointer:coarse)').matches?'':'X · ')+env.label.replace(/ ·.*$/,''));
  }
  const spoken=G.S.guards.filter(g=>g.say&&(g.fl||0)===(P.fl||0)&&Math.hypot(g.x-P.x,g.y-P.y)<240).slice(0,2);
  for(const g of spoken){const p=project(new THREE.Vector3(g.x/48,people.height(g)+1.9,g.y/48));if(p.y<160||p.y>height-180||p.x<5||p.x>width-5)continue;const text=String(g.say),lines=[];for(let i=0;i<text.length;i+=18)lines.push(text.slice(i,i+18));ctx.font='13px "IBM Plex Sans KR",sans-serif';const w=Math.min(245,Math.max(90,...lines.map(l=>ctx.measureText(l).width))+22),h=lines.length*20+16,x=Math.max(10,Math.min(width-w-10,p.x-w/2)),y=Math.max(160,p.y-h-13);ctx.fillStyle='#f7f6f1';ctx.strokeStyle='#343b37';ctx.lineWidth=1;rounded(ctx,x,y,w,h,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-5,y+h);ctx.lineTo(p.x,y+h+8);ctx.lineTo(p.x+5,y+h);ctx.fill();ctx.fillStyle='#242a28';ctx.textAlign='center';lines.forEach((l,i)=>ctx.fillText(l,x+w/2,y+22+i*20));ctx.textAlign='left';G.SPEECH_R.push({x,y,w,h,speaker:g,text});}
  if(G.S.exitOpen){const e=G.S.exit,p=project(new THREE.Vector3(e.x/48,.2,e.y/48));ctx.strokeStyle='#ddc38d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,15,8,0,0,Math.PI*2);ctx.stroke();}
 }
 function draw(ctx,canvas){
  if(state!==G.S){if(!pending)pending=rebuild().finally(()=>pending=null);return;}if(!ready)return;const started=performance.now();size();const P=G.S.player,dt=Math.max(0,Math.min(.1,G.S.t-lastT));lastT=G.S.t;
  G.S.openB=P.z?-1:G.bldAt(Math.floor(P.x/48),Math.floor(P.y/48));world.update();people.render(dt);const y=people.height(P),want=new THREE.Vector3(P.x/48-1.5,y+.65,P.y/48-1.5);target.lerp(want,dt?1-Math.exp(-dt*9):1);camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateMatrixWorld(true);
  const I=P.interact,F=P.trav?.hideFlow;let contact=null,progress=0,closing=false;
  if(I?.a?.d){const o=world.doors.find(o=>o.d===I.a.d);if(o){contact=o.pivot.localToWorld(new THREE.Vector3(.75,.99,-.09));progress=I.t/I.dur;}}
  else if(P.pick){const o=world.items.find(o=>o.it===P.pick.it);if(o){contact=o.at.clone();contact.y-=.23;const toward=new THREE.Vector3(P.x/48-contact.x,0,P.y/48-contact.z).normalize();contact.addScaledVector(toward,.1);progress=P.pick.t/P.pick.dur;}}
  else if(F){const q=P.trav.t-F.walk,begin=F.handPre||0,finish=begin+F.duration;const o=world.hides.find(o=>o.h===F.h);if(o&&(q>=0&&q<begin||q>=finish&&q<finish+(F.handPost||0))){contact=o.v.grip();closing=q>=finish;progress=q<begin?q/Math.max(.01,begin):(q-finish)/Math.max(.01,F.handPost);}}
  if(contact){const weight=I?.a?.d?Math.min(1,Math.max(0,progress/.18),Math.max(0,(.62-progress)/.25)):F?Math.min(1,Math.max(0,closing?(progress-.3)/.2:progress/.18),Math.max(0,closing?(1-progress)/.18:(.58-progress)/.22)):Math.min(1,Math.max(0,progress/.25),Math.max(0,(1-progress)/.22)),distance=people.player.driver.reach('Right',contact,weight);if(weight>.9){contactTrace.push({t:G.S.t,kind:I?.a?.k||P.pick?.kind||F?.kind,distance});if(contactTrace.length>400)contactTrace.shift();}}
  ring.position.set(P.x/48,y+.035,P.y/48);ring.visible=!P.hide||!!P.trav?.hideFlow;
  const a=G.attackAction(),enemy=a.g||(a.list||[])[0];targetRing.visible=!!enemy&&Math.hypot(enemy.x-P.x,enemy.y-P.y)<100;if(enemy)targetRing.position.set(enemy.x/48,people.height(enemy)+.025,enemy.y/48);
  if(G.S.t-lastOcclusion>.12||G.S.t<lastOcclusion){lastOcclusion=G.S.t;const head=new THREE.Vector3(P.x/48,y+1.15,P.y/48),v=offset.clone().normalize();ray.set(head.clone().addScaledVector(v,70),v.negate());ray.far=69.8;world.root.updateMatrixWorld(true);const hits=ray.intersectObject(world.root,true).filter(hit=>{for(let p=hit.object;p;p=p.parent)if(!p.visible)return false;const m=Array.isArray(hit.object.material)?hit.object.material[0]:hit.object.material;return !m.transparent||m.opacity>.7;});occluded=hits.length>0;ray.far=Infinity;}
  const torso=new THREE.Vector3(P.x/48,y+.9,P.y/48),sp=project(torso),depth=-torso.clone().applyMatrix4(camera.matrixWorldInverse).z;reveal.update({x:sp.x,y:sp.y,depth,floor:y,dpr:renderer.getPixelRatio(),height,occluded:occluded&&(!P.hide||P.trav?.hideFlow),dt});
  renderer.render(scene,camera);overlay(ctx,canvas);frameCosts.push(performance.now()-started);if(frameCosts.length>120)frameCosts.shift();
  if(!degraded&&frameCosts.length===120&&frameCosts.reduce((a,b)=>a+b,0)/120>35){renderer.setPixelRatio(.85);renderer.setSize(width,height,false);degraded=true;}
  lastFrame=performance.now();
 }
 const view={get ready(){return ready},draw,direction,screenToWorld,project,actorPick(o){return project(new THREE.Vector3(o.x/48,people.height(o)+1,o.y/48));},actorScreen(o){return project(new THREE.Vector3(o.x/48,people.height(o),o.y/48));},get occlusion(){return{occluded,radius:reveal?.radius}},get world(){return world},get people(){return people},get scene(){return scene},get camera(){return camera},get renderer(){return renderer},get contactTrace(){return contactTrace;},get metrics(){const a=frameCosts.slice().sort((a,b)=>a-b);return{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),medianMs:a[Math.floor(a.length*.5)]||0,p95Ms:a[Math.floor(a.length*.95)]||0};},async readyForScene(){while(pending||!ready||state!==G.S)await sleep(20);}};
 window.__clubView=view;G.start(G.STAGES.findIndex(s=>s.artSlice));while(G.DLG.modal)G.advanceDialog();await rebuild();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(G.STAGE.artSlice){loading.textContent='화면 복구 중';loading.style.display='grid';}});renderer.domElement.addEventListener('webglcontextrestored',()=>{loading.style.display='none';moon.shadow.needsUpdate=true;});
}catch(error){console.error(error);loading.textContent='새 화면을 열지 못했습니다. ';const link=document.createElement('a');link.href='../tone-study/game.html';link.textContent='기존 게임 열기';link.style.color='#e2c58b';loading.append(link);window.__clubError=String(error);}
