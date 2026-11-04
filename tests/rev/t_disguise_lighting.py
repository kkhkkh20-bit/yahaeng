"""Uniforms grant limited access; work rooms have real, switchable lighting."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/balance-v145';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!__game')
  result=await q.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.facOn=false;return G.S},rooms=[];
   for(const id of ['m1','m2','m3','m4','m5','m6','city']){
    const S=fresh(id),P=S.player;S.guards=[];S.cams=[];let count=0,sum=0,min=1;
    G.PLANS.forEach((fs,bi)=>{const b=G.BLD[bi];if(b.vacant||(b.kind!=='shop'&&!(G.STAGE.workBuildings||[]).includes(bi)))return;
     fs.forEach((p,fl)=>{G.setLayer(fl);for(let y=b.y0+1;y<b.y1;y++)for(let x=b.x0+1;x<b.x1;x++){
      if(G.solidAt(x,y))continue;const r=p.store;if(r&&['club','vip'].includes(r.use)&&x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1)continue;
      const light=G.lightAt(x*48+24,y*48+24,false);count++;sum+=light;min=Math.min(min,light);
      check(light>=.6,'Unlit work tile '+JSON.stringify({id,bi,fl,x,y,light}));
     }});
    });
    const n=S.lamps.length;G.syncWorkLights();check(S.lamps.length===n,'Lighting migration duplicates fixtures');
    for(const [bi,fl] of G.STAGE.secureFloors||[]){const b=G.BLD[bi];G.setLayer(fl);let tested=false;
     for(let y=b.y0+1;y<b.y1&&!tested;y++)for(let x=b.x0+1;x<b.x1&&!tested;x++)if(!G.solidAt(x,y)){
      Object.assign(P,{x:x*48+24,y:y*48+24,fl,z:0,outfit:'crew',disguise:'sam',disguiseBlown:false,blown:{},hide:null,wire:null,jump:null,trav:null});
      const z=G.zoneInfo(P.x,P.y,0,fl);check(z.secure&&!z.allow.length,'Secure floor accepts clothing '+id);tested=true;
     }check(tested,'Secure floor missing');}
    rooms.push({id,tiles:count,min:+min.toFixed(3),mean:+(sum/count).toFixed(3),added:S.lamps.filter(l=>l.workLight).length});
   }
   let S=fresh('m1'),P=S.player,g=S.guards.find(g=>!g.civ&&!g.target&&!g.elite&&!g.dog);
   S.guards=[g];S.cams=[];S.corpses=[];S.decals=[];S.alevel=0;S.t=10;S.chaseSeen=false;S.knownLooks={};
   Object.assign(g,{x:30*48+24,y:3*48+24,fl:0,z:0,a:0,want:0,state:'PATROL',wait:999,post:0,still:true,radio:false,enforcer:false,elite:false,target:false,act:null,chat:null,sched:null,follow:null,glance:0,glanceT:999,idleT:999,meter:0});
   Object.assign(P,{x:g.x+90,y:g.y,fl:0,z:0,a:Math.PI,outfit:'crew',disguise:'sam',disguiseBlown:false,blown:{},light:1,hidden:false,mode:'walk',moving:false,hide:null,under:null,vent:null,wire:null,ledge:null,trav:null,jump:null,cover:null,captive:null,carrying:null,strikeT:0,useT:0,pick:null});G.setLayer(0);
   const tick=s=>{for(let t=0;t<s;t+=.05){S.t+=.05;G.updateGuard(g,.05)}};
   tick(7);check(!P.disguiseBlown&&!g.eyeT&&g.state==='PATROL','Calm ordinary guard rejects a valid uniform');
   S.alevel=1;tick(1);check(!P.disguiseBlown&&g.eyeT>0,'Heightened security check should give time to move away');
   P.x=g.x+180;tick(2);check(!P.disguiseBlown&&g.eyeT===0,'Distance must interrupt identity check');
   P.x=g.x+90;tick(6);check(P.disguiseBlown&&G.knownFace(g),'Ordinary close guard never verifies identity');
   // A wall and a different floor block identity checks as well as attacks.
   g.eyeT=0;P.disguiseBlown=false;P.outfit='staff';g.suspectMemory={};g.state='PATROL';g.seen=false;P.fl=1;tick(6);check(!P.disguiseBlown&&!g.eyeT,'Identity checks cross floors');
   S=fresh('m2');P=S.player;S.guards=[];S.cams=[];const l=S.lamps.find(l=>l.workLight&&l.fl===1),bi=G.bldAt(Math.floor(l.x/48),Math.floor(l.y/48));G.setLayer(1);
   const lit=G.lightAt(l.x,l.y,false);
   S.corpses=[{x:l.x,y:l.y,fl:1,z:0,light:.04}];G.setLayer(0);G.refreshBodyLighting();check(S.corpses[0].light>.8,'Body lighting sampled on wrong floor');G.setLayer(1);
   const B=G.BLD[bi],pts=[];for(let y=B.y0+1;y<B.y1;y++)for(let x=B.x0+1;x<B.x1;x++)if(!G.solidAt(x,y))pts.push({x:x*48+24,y:y*48+24});
   let pair;for(const a of pts)for(const b of pts)if(!pair&&Math.hypot(a.x-b.x,a.y-b.y)>160&&Math.hypot(a.x-b.x,a.y-b.y)<220&&G.sightLine({...a,fl:1,z:0},b.x,b.y,0,false,1))pair=[a,b];check(pair,'No lit office visibility fixture');
   const eye={...pair[0],fl:1,z:0,a:Math.atan2(pair[1].y-pair[0].y,pair[1].x-pair[0].x),state:'PATROL'};
   check(G.canSee(eye,pair[1].x,pair[1].y,G.lightAt(pair[1].x,pair[1].y),false,false,0,1)>0&&G.canSee(eye,pair[1].x,pair[1].y,.04,false,false,0,1)===0,'Work lights fail to extend actual sight');
   Object.assign(P,{...pair[1],fl:1,z:0,outfit:'crew',disguise:'sam',disguiseBlown:false,light:1,mode:'walk',hide:null,under:null,vent:null,wire:null,carrying:null,captive:null,interact:null});const body=S.corpses[0];S.corpses=[];S.camRoom=null;S.alevel=0;S.stats.camRec=0;S.cams=[{...eye,fl:1,b:bi,base:eye.a,sweep:0,ph:0,period:10,meter:0,cool:0}];G.updateCams(.7);check(S.stats.camRec===1,'Uniform slows CCTV in a secure room '+JSON.stringify({count:S.stats.camRec,c:S.cams[0],p:{x:P.x,y:P.y,fl:P.fl},zone:G.zoneInfo(P.x,P.y,0,1)}));S.cams=[];S.corpses=[body];for(const a of S.lamps)if(!a.outdoor&&G.bldAt(Math.floor(a.x/48),Math.floor(a.y/48))===bi)a.off=true;
   G.refreshBodyLighting();check(S.corpses[0].light<.1,'Body stays bright after blackout');const dark=G.lightAt(l.x,l.y,false);check(lit>.8&&dark<.1,'Lights do not affect actual detection brightness');
   P.hp=2;G.saveCheckpoint();G.CP.S.lamps=G.CP.S.lamps.filter(a=>!a.workLight);G.CP.S.bfuses.find(f=>f.b===bi).cut=true;
   check(G.loadCheckpoint(),'Legacy checkpoint rejected');S=G.S;check(S.player.hp===2,'Checkpoint health reset');const restored=S.lamps.filter(a=>a.workLight&&G.bldAt(Math.floor(a.x/48),Math.floor(a.y/48))===bi);check(restored.length&&restored.every(a=>a.off&&a.cut===bi),'Added fixtures ignore cut building circuit');
   return {rooms,calmUniformAccepted:true,heightenedIdentity:true,distanceEscape:true,floorSeparation:true,lighting:{lit,dark},cameraSecureRoom:true,bodyFloorLighting:true,legacyCircuit:true};
  }''')
  assert not errors,errors;(O/'mechanics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS',json.dumps(result,ensure_ascii=False),flush=True);await b.close()
asyncio.run(main())
