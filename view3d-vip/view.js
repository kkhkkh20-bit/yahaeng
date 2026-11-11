import * as THREE from 'three';
import {buildWorld,FLOOR} from './world.js?v=v267-a0125c89e509';
import {createActors} from './actors.js?v=v267-a0125c89e509';
import {createSight} from './sight.js?v=v267-a0125c89e509';
import {createEffects} from './effects.js?v=v267-a0125c89e509';
import {passageMode,accessMotion,SEWER_Y,DUCT_Y} from './passages.js?v=v267-a0125c89e509';
import {prepareEpisode} from './episode.js?v=v267-a0125c89e509';
import {drawFeedback} from './feedback.js?v=v267-a0125c89e509';
import {createCameraRig} from './camera.js?v=v267-a0125c89e509';
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
 const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,150),rig=createCameraRig(camera),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),ndc=new THREE.Vector2();
 let world=null,people=null,sight=null,effects=null,state=null,lastT=0,width=0,height=0,pending=null,ready=false,lastFrame=performance.now(),frameCosts=[],contactTrace=[],degraded=false;
 const ring=new THREE.Mesh(new THREE.RingGeometry(.30,.345,48),new THREE.MeshBasicMaterial({color:'#e4ddc4',transparent:true,opacity:.95,depthWrite:false,depthTest:true}));ring.rotation.x=-Math.PI/2;ring.renderOrder=100;scene.add(ring);
 const targetRing=new THREE.Mesh(new THREE.RingGeometry(.31,.345,48),new THREE.MeshBasicMaterial({color:'#c96d57',transparent:true,opacity:.85,depthWrite:false}));targetRing.rotation.x=-Math.PI/2;scene.add(targetRing);
 function size(){const resized=rig.resize(innerWidth,innerHeight,passageMode(G.S.player),G.viewZoom||1);width=innerWidth;height=innerHeight;if(resized)renderer.setSize(width,height,false);}
 function project(p){const v=p.clone().project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2,z:v.z};}
 function screenToWorld(x,y){ndc.set(x/width*2-1,1-y/height*2);ray.setFromCamera(ndc,camera);plane.constant=-(people?.height(G.S.player)||0);const p=new THREE.Vector3();return ray.ray.intersectPlane(plane,p)?{x:p.x*48,y:p.z*48}:null;}
 const direction=rig.direction,pace=rig.pace;
 async function rebuild(){
  ready=false;loading.style.display='grid';loading.textContent='골목 불러오는 중';const S=G.S;
  if(world){world.passages.dispose();world.visibility.dispose();scene.remove(world.root);world.root.traverse(o=>{if(o.isMesh&&o.geometry!==ring.geometry)o.geometry.dispose();});}
  people?.dispose();
  sight?.dispose();effects?.dispose();
  world=buildWorld(G,scene);people=await createActors(G,scene,world.visibility);sight=createSight(G,scene,people,world.visibility);effects=createEffects(G,scene,world.visibility);state=S;lastT=S.t;size();rig.follow(S.player.x/48,0,S.player.y/48);world.update();people.render(0);sight.update();await renderer.compileAsync(scene,camera);ready=true;loading.style.display='none';
 }
 function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
 function badge(c,p,text,color='#e3cc8e'){
  if(p.z>1||p.x<8||p.x>width-8||p.y<150||p.y>height-120)return;c.font='600 12px "IBM Plex Sans KR",sans-serif';const w=c.measureText(text).width+15,x=Math.max(8,Math.min(width-w-8,p.x-w/2)),y=p.y-25;c.fillStyle='rgba(17,27,28,.88)';rounded(c,x,y,w,25,3);c.fill();c.fillStyle=color;c.textAlign='center';c.fillText(text,x+w/2,y+17);c.textAlign='left';
 }
 function overlay(ctx,canvas,currentEnv){
  const dpr=canvas.width/width;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);const P=G.S.player;
  G.SPEECH_R.length=0;G.ACTION_R.length=0;
  for(const o of world.items)if(o.mesh.visible){const q=project(o.at);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#dfbd72';ctx.fillRect(-4,-4,8,8);ctx.restore();}
  for(const o of world.notes)if(o.mesh.visible&&!o.n.read&&Math.hypot(o.n.x-P.x,o.n.y-P.y)<180){const q=project(o.at);ctx.fillStyle='#dbd4b8';ctx.fillRect(q.x-3,q.y-5,6,8);}
  if(G.input.aiming){const pt=G.aimPoint(),from=project(new THREE.Vector3(P.x/48,people.height(P)+1,P.y/48));if(pt){const to=project(new THREE.Vector3(pt.x/48,people.height(P)+.05,pt.y/48));ctx.strokeStyle='#cbd6c3';ctx.lineWidth=1.5;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.ellipse(to.x,to.y,10,5,0,0,Math.PI*2);ctx.stroke();}}
  const grab=G.grabAction(),env=currentEnv,mode=passageMode(P);if(grab.k==='grab'&&grab.g)badge(ctx,project(new THREE.Vector3(grab.g.x/48,people.height(grab.g)+1.85,grab.g.y/48)),matchMedia('(pointer:coarse)').matches?'붙잡기':'C · 붙잡기');
  if(env.k&&!['none','step','up'].includes(env.k)&&env.label&&!G.actionBusy()){
   const at=G.objectActionPoint(env),anchor=world.systems.anchor(env);if(anchor||at?.x!=null)badge(ctx,project(anchor||new THREE.Vector3(at.x/48,mode?people.height(P)+1.4:(at.fl||0)*FLOOR+(env.h?.type==='well'?.6:env.v?.street?1.2:1.25),at.y/48)),(matchMedia('(pointer:coarse)').matches?'':'X · ')+env.label.replace(/ ·.*$/,''));
  }
  // One compact cue per real, visible fixture; no off-screen or through-wall markers.
  const cues=[];for(const {h,v}of world.hides){if(mode||!v.group.visible||!world.visibility.cue(h)||Math.hypot(h.x-P.x,h.y-P.y)>240)continue;const p=project(new THREE.Vector3(h.x/48,(h.fl||0)*FLOOR+(h.type==='well'?.3:h.type==='bush'?.9:h.furn?2.08:1.35),h.y/48));if(p.y<165||p.y>height-150||p.x<12||p.x>width-12)continue;
   const selected=env.h===h,name=h.type==='bush'?'화단':h.type==='box'?'수거함':h.type==='well'?'맨홀':h.type==='locker'?'사물함':'옷장',full=!G.hideSpace(h,1),bodies=(h.bodies||0)+(h.type==='bush'?G.S.corpses.filter(c=>c.hidden&&!c.stashed&&!c.carried&&(c.fl||0)===(h.fl||0)&&Math.floor(c.x/48)===h.tx&&Math.floor(c.y/48)===h.ty).length:0),occupied=bodies>0;
   ctx.strokeStyle=selected?'#e3cc8e':'#b4b9a2';ctx.fillStyle='rgba(17,27,28,.88)';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeRect(p.x-4,p.y-2,8,6);ctx.beginPath();ctx.moveTo(p.x-5,p.y-5);ctx.lineTo(p.x+5,p.y-5);ctx.stroke();
   if((P.carrying||P.captive||occupied)&&!selected)badge(ctx,{...p,y:p.y-12},name+' · '+(full?'가득 참':(Number.isFinite(h.cap)&&h.type!=='well'?bodies+'/'+h.cap:bodies+'명')),full?'#ce9c87':'#c9cbb5');cues.push({type:h.type,x:h.x,y:h.y,bodies,full});
  }world.hideCues=cues;
  for(const o of world.passages.fixtures){if(mode){if((mode==='duct')&&env.v!==o.obj&&Math.hypot(o.h.x-P.x,o.h.y-P.y)<150)badge(ctx,project(new THREE.Vector3(o.h.x/48,DUCT_Y+1.4,o.h.y/48)),o.obj.street?'거리 출구':'실내 출구','#b9c8bd');}else if(o.v.group.visible&&Math.hypot(o.h.x-P.x,o.h.y-P.y)<160&&env.v!==o.obj){const q=project(new THREE.Vector3(o.h.x/48,o.obj.street?1.05:.38,o.h.y/48));if(q.y>170&&q.y<height-150){ctx.strokeStyle='#b2c2b4';ctx.lineWidth=1.2;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(q.x-5,q.y+i*3);ctx.lineTo(q.x+5,q.y+i*3);ctx.stroke();}}}}
  if(mode==='sewer')for(const h of G.S.hides.filter(h=>h.type==='well'&&env.w!==h&&Math.hypot(h.x-P.x,h.y-P.y)<150))badge(ctx,project(new THREE.Vector3(h.x/48,SEWER_Y+1.8,h.y/48)),'지상 출구','#d2c18f');
  const spoken=G.S.guards.filter(g=>world.visibility.visible(g)&&g.say&&(g.fl||0)===(P.fl||0)&&Math.hypot(g.x-P.x,g.y-P.y)<240).slice(0,2);
  for(const g of spoken){const p=project(new THREE.Vector3(g.x/48,people.height(g)+1.9,g.y/48));if(p.y<160||p.y>height-180||p.x<5||p.x>width-5)continue;const text=String(g.say),lines=[];for(let i=0;i<text.length;i+=18)lines.push(text.slice(i,i+18));ctx.font='13px "IBM Plex Sans KR",sans-serif';const w=Math.min(245,Math.max(90,...lines.map(l=>ctx.measureText(l).width))+22),h=lines.length*20+16,x=Math.max(10,Math.min(width-w-10,p.x-w/2)),y=Math.max(160,p.y-h-13);ctx.fillStyle='#f7f6f1';ctx.strokeStyle='#343b37';ctx.lineWidth=1;rounded(ctx,x,y,w,h,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-5,y+h);ctx.lineTo(p.x,y+h+8);ctx.lineTo(p.x+5,y+h);ctx.fill();ctx.fillStyle='#242a28';ctx.textAlign='center';lines.forEach((l,i)=>ctx.fillText(l,x+w/2,y+22+i*20));ctx.textAlign='left';G.SPEECH_R.push({x,y,w,h,speaker:g,text});}
  drawFeedback(G,view,ctx,world,people,project,width,height);
  if(G.S.exitOpen&&!mode){const e=G.S.exit,p=project(new THREE.Vector3(e.x/48,.2,e.y/48));ctx.strokeStyle='#ddc38d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,15,8,0,0,Math.PI*2);ctx.stroke();}
 }
 function draw(ctx,canvas){
  if(state!==G.S){if(!pending)pending=rebuild().finally(()=>pending=null);return;}if(!ready)return;const started=performance.now();size();const P=G.S.player,dt=Math.max(0,Math.min(.1,G.S.t-lastT));lastT=G.S.t;
  world.update();G.S.openB=world.visibility.inside;people.render(dt);sight.update();effects.update();const y=people.height(P);rig.follow(P.x/48,y,P.y/48,dt);
  const currentEnv=G.envAction(),I=P.interact,F=P.trav?.hideFlow,A=accessMotion(P,G),mode=passageMode(P);let contact=null,progress=0,closing=false;
  if(I?.a?.l){const o=world.lamps.find(o=>o.l===I.a.l);if(o){contact=o.controlAt.clone();progress=I.t/I.dur;}}
  else if(I?.a?.d&&!I.a.d.r){const o=world.doors.find(o=>o.d===I.a.d);if(o){contact=o.pivot.localToWorld(new THREE.Vector3(.75,.99,-.09));progress=I.t/I.dur;}}
  else if(I?.a?.n){const o=world.notes.find(o=>o.n===I.a.n);if(o){contact=o.at.clone();progress=I.t/I.dur;}}
  else if(P.pick?.it){const o=world.items.find(o=>o.it===P.pick.it);if(o){contact=o.at.clone();contact.y-=.23;const toward=new THREE.Vector3(P.x/48-contact.x,0,P.y/48-contact.z).normalize();contact.addScaledVector(toward,.1);progress=P.pick.t/P.pick.dur;}}
  else if(I){contact=world.systems.anchor(I.a);progress=I.t/I.dur;}
  else if(P.trav?.signFlow){contact=world.systems.anchor({k:'trap',tp:{t:P.trav.signFlow.t}});progress=P.trav.t/P.trav.dur;}
  else if(F){const q=P.trav.t-F.walk,begin=F.handPre||0,finish=begin+F.duration;const o=world.hides.find(o=>o.h===F.h);if(o&&(q>=0&&q<begin||q>=finish&&q<finish+(F.handPost||0))){contact=o.v.grip();closing=q>=finish;progress=q<begin?q/Math.max(.01,begin):(q-finish)/Math.max(.01,F.handPost);}}
  else if(A?.work){const o=A.F.h.type==='well'?world.hides.find(o=>o.h===A.F.obj):world.passages.fixtures.find(o=>o.obj===A.F.obj);if(o){contact=o.v.grip();progress=A.work.p;closing=A.work.closing;}}
  if(contact){const weight=I?.a?.d||I?.a?.l?Math.min(1,Math.max(0,progress/.18),Math.max(0,(.62-progress)/.25)):F||A?.work?Math.min(1,Math.max(0,closing?(progress-.3)/.2:progress/.18),Math.max(0,closing?(1-progress)/.18:(.58-progress)/.22)):Math.min(1,Math.max(0,progress/.25),Math.max(0,(1-progress)/.22)),distance=people.player.driver.reach('Right',contact,weight);if(weight>.9){contactTrace.push({t:G.S.t,kind:I?.a?.k||P.pick?.kind||F?.kind||A?.F.kind||(P.trav?.signFlow?'sign':null),distance});if(contactTrace.length>400)contactTrace.shift();}}
  ring.position.set(P.x/48,y+(P.hidden?.075:.035),P.y/48);ring.visible=!P.hide||P.hide.type==='bush'||!!P.trav?.hideFlow||!!G.S.amb;
  const a=G.attackAction(),enemy=a.g||(a.list||[])[0];targetRing.visible=(!mode||a.k==='ventKill')&&!!enemy&&Math.hypot(enemy.x-P.x,enemy.y-P.y)<100;if(enemy){targetRing.position.set(enemy.x/48,people.height(enemy)+.075,enemy.y/48);const phase=G.guardAwareness(enemy).phase;targetRing.material.color.set(phase==='seen'?'#c96d57':['suspect','search'].includes(phase)?'#d2b87c':'#c5c6a1');}
  for(const a of people.actors.values()){const W=a.o.doorWork;if(!W)continue;const d=world.doors.find(o=>o.d===W.d);if(d)a.driver.reach('Right',d.pivot.localToWorld(new THREE.Vector3(.75,.99,-.09)),Math.sin(Math.PI*Math.min(1,W.t/W.dur)));}
  world.systems.held(people);renderer.render(scene,camera);overlay(ctx,canvas,currentEnv);frameCosts.push(performance.now()-started);if(frameCosts.length>120)frameCosts.shift();
  if(!degraded&&frameCosts.length===120&&frameCosts.reduce((a,b)=>a+b,0)/120>35){renderer.setPixelRatio(.85);renderer.setSize(width,height,false);degraded=true;}
  lastFrame=performance.now();
 }
 const view={setTactical(v){const value=v?'hidden':'visible';if(renderer.domElement.style.visibility!==value)renderer.domElement.style.visibility=value;},get ready(){return ready},drawPassageMap(cv){return world?.passages.drawMini(cv)||false;},draw,direction,pace,groundToScreen:rig.groundToScreen,screenToWorld,project,get framing(){return rig.framing;},actorPick(o){return project(new THREE.Vector3(o.x/48,people.height(o)+1,o.y/48));},actorScreen(o){return project(new THREE.Vector3(o.x/48,people.height(o),o.y/48));},get occlusion(){return world?.cutaway},get effects(){return effects},get sight(){return sight},get world(){return world},get people(){return people},get scene(){return scene},get camera(){return camera},get renderer(){return renderer},get contactTrace(){return contactTrace;},get metrics(){const a=frameCosts.slice().sort((a,b)=>a-b);return{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),medianMs:a[Math.floor(a.length*.5)]||0,p95Ms:a[Math.floor(a.length*.95)]||0};},async readyForScene(){while(pending||!ready||state!==G.S)await sleep(20);}};
 window.__clubView=view;prepareEpisode();G.start(G.STAGES.findIndex(s=>window.__EPISODE_ONE__?s.episode:window.__VIEW3D__?s.id===window.__VIEW3D__:s.artSlice),!!window.__EPISODE_ONE__||!!window.__VIEW3D__);while(G.DLG.modal)G.advanceDialog();if(!pending)pending=rebuild().finally(()=>pending=null);await pending;
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(G.STAGE.artSlice||G.STAGE.view3d){loading.textContent='화면 복구 중';loading.style.display='grid';}});renderer.domElement.addEventListener('webglcontextrestored',()=>{loading.style.display='none';moon.shadow.needsUpdate=true;});
}catch(error){console.error(error);loading.textContent='새 화면을 열지 못했습니다. ';const link=document.createElement('a');link.href='../tone-study/game.html';link.textContent='기존 게임 열기';link.style.color='#e2c58b';loading.append(link);window.__clubError=String(error);}
