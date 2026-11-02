import * as THREE from 'three';
import {loadModular,colorModular} from './lib/modular_models.js?v=v134-ca9e5888bbeb';
import {createPoseDriver} from './pose_driver.js?v=v134-ca9e5888bbeb';
import {FLOOR} from './world.js?v=v134-ca9e5888bbeb';
import {SEWER_Y,DUCT_Y,WELL_HIDE_Y,accessMotion} from './passages.js?v=v134-ca9e5888bbeb';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
function pbr(rig){const mats=[];rig.model.traverse(o=>{if(!o.isMesh)return;const cv=m=>{const n=new THREE.MeshStandardMaterial({color:m.color,roughness:.83,metalness:0});n.userData={...m.userData};mats.push(n);return n};o.material=Array.isArray(o.material)?o.material.map(cv):cv(o.material);o.castShadow=o.receiveShadow=true;});rig.mats=mats;return rig;}
export async function createActors(G,scene,visibility){
 const player=G.S.player,actors=new Map(),spawning=new Set(),dummy=pbr(await loadModular('guard'));
 let disposed=false;
 const corpseOf=o=>G.S.corpses.find(c=>c.g===o||o.id!=null&&c.guardId===o.id),guardOf=c=>c&&(c.g||G.S.guards.find(g=>g.id===c.guardId));
 const authoredModel=o=>G.STAGE.guards.find(d=>d.tag&&d.tag===o.tag)?.model||(o.civ?'male':'guard');
 async function make(o){const name=o===player?'hero':authoredModel(o),a=pbr(await loadModular(name)),b=pbr(await loadModular('guard')),driver=createPoseDriver(a,b);driver.root.visible=false;if(!disposed)scene.add(driver.root);const actor={o,rig:a,driver,look:null,phase:0,last:[o.x,o.y],previous:null,name};actors.set(o,actor);return actor;}
 await make(player);for(const g of G.S.guards)await make(g);
 function ensureOutfit(a){const corpse=corpseOf(a.o),name=a.o===player?(({crew:'heroCrew',staff:'heroWorker',courier:'heroWorker',waiter:'heroSuit',cater:'heroWorker'})[player.outfit]||'hero'):(corpse?.stripped?'male':authoredModel(a.o));if(name===a.name||a.loading)return;a.loading=true;loadModular(name).then(r=>{a.rig=pbr(r);a.driver.setPrimary(a.rig);if(a.o===paired)actors.get(player).driver.setPartner(a.rig);a.name=name;a.look=null;a.previous=null;colour(a);}).finally(()=>a.loading=false);}

 function colour(a){const look=G.characterLook(a.o);if(a.look===look)return;a.look=look;const pal=G.characterPalette(a.o);if(pal)colorModular(a.rig.mats,Object.fromEntries(['skin','hair','shirt','pants','shoes'].map((k,i)=>[k,pal[i]||pal[4]])));const c=corpseOf(a.o);if(c?.stripped)for(const m of a.rig.mats){if(m.userData.role==='shirt')m.color.set('#989b91');if(m.userData.role==='pants')m.color.set('#545e59');}if(a.o===player)for(const m of a.rig.mats){m.emissive.copy(m.color);m.emissiveIntensity=['shirt','pants'].includes(m.userData.role)?.08:.015;}}
 function height(o){if(o===player){const a=accessMotion(o,G);if(a)return a.y;if(o.under)return SEWER_Y;if(o.vent)return DUCT_Y;}const T=o.trav||o.climb;if(T?.stairs&&!T.stairs.roof){const dest=T.stairs.dest.fl||0,from=T.stairs.up?dest-1:dest+1;return(from+(dest-from)*clamp(T.t/T.dur))*FLOOR;}if(T?.room&&T.crossing){const f=clamp(T.t/T.dur),edge=T.down?.4:(T.phases.find(p=>p.pose==='climb')?.to||.72),rise=T.down?1-ease((f-.4)/.45):ease((f-.1)/Math.max(.01,edge-.1));return(T.room.fl||1)*FLOOR*rise;}if(o.jump){const j=o.jump,f=clamp(j.t/j.dur);return((o.fl||0)*FLOOR+(o.z||0)*FLOOR)+Math.sin(f*Math.PI)*.4;}return(o.z||o.fl||0)*FLOOR;}
 let paired=null;
 function render(dt){
  for(const g of G.S.guards)if(!actors.has(g)&&!spawning.has(g)){spawning.add(g);make(g).finally(()=>spawning.delete(g));}
  const P=G.S.player;if(P.bodyAnim&&G.S.t-P.bodyAnim.t0>=P.bodyAnim.dur)P.bodyAnim=null;const partner=P.trav?.ventPull?.g||G.S.amb?.g||P.killAnim?.g||P.trav?.hideFlow?.g||P.captive||P.grabIn?.g||guardOf(P.bodyAnim?.c||P.carrying||P.trav?.hideFlow?.c)||null,hero=actors.get(P);
  if(partner!==paired){if(paired){const a=actors.get(paired);if(a){a.driver.root.add(a.rig.model);a.previous=null;}}const a=actors.get(partner);hero.driver.setPartner(a?.rig||dummy);hero.previous=null;paired=partner;}
  for(const a of actors.values()){
   const o=a.o;ensureOutfit(a);colour(a);if(o===partner)continue;const d=a.driver;d.reset();o===P&&(d.partner.visible=false);a.phase+=Math.hypot(o.x-a.last[0],o.y-a.last[1])/82;a.last=[o.x,o.y];
   let x=o.x/48,z=o.y/48,y=height(o),floor=o.fl||0,visible=true,angle=o.a||0;
   if(o!==P&&o.state==='DEAD'){
    const c=corpseOf(o);visible=!!c&&!c.stashed&&!c.carried&&(!c.hidden||G.S.player.hide===c.container);if(c){x=c.x/48;z=c.y/48;floor=c.fl||0;y=(c.z||floor)*FLOOR;angle=c.a||angle;}
    d.renderFrame('Death',c?.f0!=null?Math.min(3.43,1.5+Math.max(0,G.S.t-c.t0)*2):Math.min(3.43,Math.max(0,G.S.t-(c?.t0||0))*3.43),angle,0);
   }else if(o===P&&G.S.amb){const A=G.S.amb,f=clamp(A.t/1.2);angle=Math.atan2(A.y0-A.ty,A.x0-A.tx);d.pair('grab','Idle',0,angle);d.offsetPartner(new THREE.Vector3((A.g.x-P.x)/48*250*(1-ease(f)),0,(A.g.y-P.y)/48*250*(1-ease(f))));if(f>.68){d.renderHidePose('duck',ease((f-.68)/.32),angle);d.partner.visible=false;}visible=f<.94;
   }else if(o===P&&P.killAnim){const A=P.killAnim;d.pair(A.kind==='stab'?'stab':'choke','Idle',clamp((G.S.t-A.t0)/A.dur)*3,angle);}
   else if(o===P&&(P.captive||P.grabIn)&&!P.trav?.hideFlow){d.pair('grab',P.moving?'Walk':'Idle',P.moving?a.phase%1:0,angle);}
   else if(o===P&&P.bodyAnim){const h=G.handlingSample(P,P.bodyAnim);d.handling(h.p,angle);d.offsetPartner(new THREE.Vector3((h.x-P.x)/48*250,0,(h.y-P.y)/48*250));}
   else if(o===P&&P.carrying&&!P.trav?.hideFlow){d.pair('carry',P.moving?'Walk':'Idle',P.moving?a.phase%1:0,angle);}
   else if(o===P&&P.trav?.hideFlow){
    const T=P.trav,F=T.hideFlow,h=F.h,at=F.route.stand,core=G.hideFlowProgress(T),start=F.walk+(F.handPre||0),end=start+F.duration,work=T.t<F.walk?null:T.t<start?{p:(T.t-F.walk)/(F.handPre||1),closing:false}:T.t>=end&&F.handPost?{p:(T.t-end)/F.handPost,closing:true}:null;
    if(T.t<F.walk){if(F.c&&F.kind!=='retrieve')d.pair('carry','Walk',a.phase%1,angle);else d.renderFrame('Walk',a.phase%1,angle,0);}
    else if(work){x=at.x/48;z=at.y/48;if(F.c&&(F.kind==='stash'&&!F.committed||F.kind==='retrieve'&&F.committed))d.pair('carry','Idle',0,angle);else d.renderAccessPose(h.type==='well'?'low':h.furn?'high':'bin',clamp(work.p),angle);}
    else if(F.kind==='stash'||F.kind==='retrieve'){
     x=at.x/48;z=at.y/48;const t=F.kind==='retrieve'?core:1-core;d.handling(clamp(t),angle);const move=F.kind==='retrieve'?1-core:core;d.offsetPartner(new THREE.Vector3((h.x-at.x)/48*250*ease(move),h.type==='well'?-1.3*250*ease(move):0,(h.y-at.y)/48*250*ease(move)));d.partner.visible=F.kind==='retrieve'||core<.77;
    }else if(F.kind==='drag'){
     x=at.x/48;z=at.y/48;d.pair('grab','Idle',Math.min(3,core*3),angle);d.offsetPartner(new THREE.Vector3((h.x-at.x)/48*250*ease(core),h.type==='well'?-1.3*250*ease(core):0,(h.y-at.y)/48*250*ease(core)));d.partner.visible=core<.78;if(core>.78){const u=ease((core-.78)/.22);x+=(h.x/48-x)*u;z+=(h.y/48-z)*u;d.renderHidePose('duck',u*.95,angle);d.partner.visible=false;}
    }else{
     const exit=F.kind==='exit',q=exit?1-core:core,u=ease((q-.12)/.73),cab=!!h.furn;x=(at.x+(h.x-at.x)*u)/48;z=(at.y+(h.y-at.y)*u)/48;
     if(h.type==='well'){x=P.x/48;z=P.y/48;y=WELL_HIDE_Y*(exit?1-ease((core-.38)/.46):ease((core-.16)/.78));d.renderPose('climb',Math.floor(core*7)%2,angle);}
     else if(cab)d.renderFrame(u>.02&&u<.98?'Walk':'Idle',((exit?1-u:u)*Math.hypot(h.x-at.x,h.y-at.y)/82)%1,angle,0,undefined,false,u>.02&&u<.98?{walk:true}:{sway:0});
     else{d.renderHidePose('duck',clamp(u*.95),angle);if(h.type!=='bush')y+=Math.sin(u*Math.PI)*.35;}
     visible=exit||q<.98||cab;
    }
   }else if(o===P&&P.trav?.ventPull){const A=P.trav.ventPull,f=clamp(A.t/A.dur);angle=Math.atan2(A.y0-P.y,A.x0-P.x);d.pair('grab','Idle',0,angle);d.offsetPartner(new THREE.Vector3((A.g.x-P.x)/48*250,(0-DUCT_Y)*(1-ease((f-.25)/.7))*250,(A.g.y-P.y)/48*250));d.partner.visible=f<.96;
   }else if(o===P&&P.trav?.accessFlow){const a=accessMotion(P,G);if(a.walking)d.renderFrame('Walk',(P.gaitTime||0)%1,angle,0);else if(a.work)d.renderAccessPose('low',clamp(a.work.p),angle);else if(a.pose==='climb'){d.renderPose('climb',Math.floor(a.p*7)%2,angle);}else d.renderHidePose('duck',a.F.exit?1-a.p:a.p,angle);
   }else if(o===P&&(P.vent||P.under)){d.renderFrame(P.moving?'Walk':'Idle',P.moving?a.phase%1:0,angle,P.vent?.95:P.mode==='sneak'?.65:0,undefined,false,P.moving?undefined:{sway:0});}
   else if(o===P&&(P.pick||P.interact)){const I=P.pick||P.interact,f=clamp((I.t||0)/(I.dur||.6)),p=f<.2?f/.2*.4:f>.82?.72+(f-.82)/.18*.28:.45+Math.sin(f*8)*.025;d.renderAccessPose(P.pick?.kind==='clean'?'low':'high',clamp(p),angle);}
   else if(o===P&&P.trav?.room&&!P.trav.stairs){const T=P.trav,phase=G.travPose(T),f=clamp(T.t/T.dur);if(T.crossing){const up=!T.down,edge=T.down?.4:(T.phases.find(p=>p.pose==='climb')?.to||.72),rise=up?ease((f-.1)/Math.max(.01,edge-.1)):1-ease((f-.4)/.45);y=(T.room.fl||1)*FLOOR*rise;const pts=T.pts.map(p=>({...p,y:p.y+(!T.studyPhysical&&(p.f===edge||T.down&&p.f===.4)?44:0)}));let k=0;while(k<pts.length-2&&f>pts[k+1].f)k++;const a=pts[k],b=pts[k+1],u=clamp((f-a.f)/(b.f-a.f));z=(a.y+(b.y-a.y)*u)/48;}
    if(phase.pose==='walk')d.renderFrame('Walk',a.phase%1,angle,0);else if(phase.pose==='climb'){d.renderPose('climb',Math.floor(phase.g*7)%2,angle);}else if(phase.pose==='vault')d.renderHidePose('pass',phase.g,angle);else d.renderHidePose('duck',phase.g*.75,angle);
   }
   else if(o===P&&P.hide){visible=false;d.renderFrame('Idle',0,angle,0);}
   else if((o===P?P.strikeT>0:o.swingT>0)){d.renderFrame('Punch',(G.S.t*.7)% .68,angle,0);}
   else if(o.moving){const run=o===P?P.mode==='run':['ALERT','PANIC'].includes(o.state);d.renderFrame(run?'Run':'Walk',a.phase%(run?.63:1),angle,o===P&&P.mode==='sneak'?.65:0);}
   else d.renderFrame('Idle',0,angle,o===P&&P.mode==='sneak'?.65:0,undefined,false,o===P&&P.mode==='sneak'?undefined:{sway:Math.sin(G.S.t)*.15});
   if(a.previous&&dt>0&&dt<.15){const target=d.snapshot();d.mix(a.previous,target,1-Math.exp(-dt*20));}a.previous=d.snapshot();d.root.scale.setScalar(1/250);d.root.position.set(x,y,z);d.root.visible=visible&&(o===P||floor===(P.fl||0)&&visibility.visible({x:x*48,y:z*48,fl:floor,z:o.z||0}));d.root.updateMatrixWorld(true);
  }
 }
 return{actors,render,height,player:actors.get(player),dispose(){disposed=true;for(const a of actors.values())a.driver.root.removeFromParent();}};
}
