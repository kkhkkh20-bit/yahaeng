"""Physical roof sight, remembered-floor pursuit, reachable stair chains and doors."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/ai-v143';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!window.__game')
  result=await q.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.facOn=false;G.S.corpses=[];G.S.decals=[];G.S.lures=[];return G.S};
   const S=fresh('m2'),P=S.player,base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite)};
   const guard=at=>({...base,...at,id:990,state:'PATROL',seen:false,meter:0,climb:null,hop:null,path:null,doorWork:null,post:0,wait:999,radio:false,torch:false,follow:null,securityBuddy:null,chat:null,act:null,glanceT:999});
   const g=guard({x:21.5*48,y:9.5*48,fl:0,z:0,lookout:true,a:0});S.guards=[g];S.alevel=3;Object.assign(P,{x:29.5*48,y:9.5*48,fl:0,z:2,hide:null,under:null,vent:null,hidden:false,mode:'walk',light:1,trav:null,strikeT:.2,outfit:null});
   check(!G.canSee(g,P.x,P.y,1,false,false,P.z),'street sees through the middle of the club roof');
   for(let i=0;i<60;i++){S.t+=.05;G.setLayer(0);G.updateGuard(g,.05)}
   check(!g.seen&&g.meter===0&&!g.lastSeen&&S.stats.detected===0,'blocked roof silhouette creates a sighting');
   Object.assign(g,{x:21.5*48,y:8.5*48,a:0,want:0});Object.assign(P,{x:22.2*48,y:g.y});
   check(G.canSee(g,P.x,P.y,1,false,false,2)>0,'exposed near roof edge is never visible');
   check(!G.canSee(g,P.x,P.y,1,false,true,2),'crouched silhouette is seen through roof edge');
   G.updateGuard(g,.05);check(g.seen,'visible edge does not enter real witness path');
   g.state='ALERT';check(G.exposure()===2&&G.guardAwareness(g).phase==='seen','cross-height witness HUD falsely says hidden');
   Object.assign(P,{x:g.x,y:g.y,fl:1,z:0});g.meter=0;g.state='PATROL';g.lastSeen=null;G.setLayer(0);G.updateGuard(g,.05);
   check(!g.seen&&g.meter===0&&!G.canSee(g,P.x,P.y,1,false,false,0,1),'ceiling does not separate floors');
   // Same-floor walls and global render-layer changes cannot change detection.
   let wall;
   G.setLayer(1);const B=G.BLD[1];for(let y=B.y0+1;y<B.y1&&!wall;y++)for(let x=B.x0+1;x<B.x1&&!wall;x++)if(!G.solidAt(x,y)&&!G.solidAt(x+2,y)&&!G.los((x+.5)*48,(y+.5)*48,(x+2.5)*48,(y+.5)*48))wall={x,y};
   check(wall,'missing actual upstairs wall fixture');Object.assign(g,{x:(wall.x+.5)*48,y:(wall.y+.5)*48,fl:1,z:0,a:0});Object.assign(P,{x:g.x+96,y:g.y,fl:1,z:0});
   G.setLayer(0);check(!G.canSee(g,P.x,P.y,1,false,false,0,1)&&G.layer===0,'upstairs wall uses the wrong floor grid');
   Object.assign(g,{x:P.x-10,y:P.y,fl:0,z:2});check(!G.canSee(g,P.x,P.y,1,false,false,0,1),'roof looks down through an indoor ceiling');
   // Rooftop cover blocks both the decision and the drawn cone.
   const tank=G.BLD[1].kitProps?.find(p=>p.t==='tank');check(tank,'missing real roof water tank');
   let covered=false;for(const [dx,dy]of [[1,0],[0,1]]){const ax=tank.x-dx,ay=tank.y-dy,bx=tank.x+dx,by=tank.y+dy;if(G.solidFor(2)(ax,ay)||G.solidFor(2)(bx,by))continue;
    Object.assign(g,{x:(ax+.5)*48,y:(ay+.5)*48,fl:0,z:2,a:Math.atan2(dy,dx),_cone:null});const tx=(bx+.5)*48,ty=(by+.5)*48;
    check(!G.canSee(g,tx,ty,1,false,false,2),'water tank no longer masks rooftop sight');const cn=G.guardCone(g,G.guardFov(g),G.guardRanges(g)),middle=cn.rays[Math.floor(cn.rays.length/2)];check(middle.w<=25,'drawn roof cone crosses water tank');covered=true;break;}
   check(covered,'water-tank cover fixture has no walkable sides');
   // A wall on the lower floor cannot block an attack between two roof actors.
   const roofCombat=[];
   for(const distance of [36,144]){
    const S=fresh('m2'),P=S.player,B=G.BLD[1],g=guard({fl:0,z:2,state:'ALERT',a:0});g.state='ALERT';S.guards=[g];S.alevel=3;G.setLayer(0);let pair;
    for(let y=B.y0+1;y<B.y1-2&&!pair;y++)for(let x=B.x0+1;x<B.x1-2&&!pair;x++){
     const ax=(x+1)*48-18,ay=(y+.5)*48,bx=ax+distance;
     if(G.solidFor(2)(Math.floor(ax/48),y)||G.solidFor(2)(Math.floor(bx/48),y))continue;
     Object.assign(g,{x:ax,y:ay});if(!G.los(ax,ay,bx,ay)&&G.sightLine(g,bx,ay,2,false,0))pair={ax,ay,bx};
    }check(pair,'missing roof-over-wall combat fixture '+distance);
    Object.assign(P,{x:pair.bx,y:pair.ay,fl:0,z:2,under:false,hide:null,vent:null,hidden:false,mode:'walk',light:1,trav:null,hp:3,hurtT:0,jump:null,wire:null});
    Object.assign(g,{x:pair.ax,y:pair.ay,a:0,want:0,lastSeen:G.gSpot(P),meter:1,repath:0,lostT:0,atkT:distance===36?.01:0,atkCd:0,elite:distance===144,gun:distance===144,aim:distance===144?.99:0,gunCd:0});
    G.rememberSuspect(g,'face');S.t+=.02;G.updateGuard(g,.02);check(P.hp===2,'lower-floor wall incorrectly blocks roof attack '+distance);roofCombat.push(distance===36?'knife':'gun');
   }
   const pursuit=[];
   for(const startFloor of [0,1]){
    const S=fresh('m2'),P=S.player;G.lvlInit();const edge=S.lvl.ends.find(e=>e.l.kind==='fstair'&&G.bldAt(e.l.tx,e.l.ty)===1),origin=startFloor?edge.B:edge.A;
    const g=guard({...origin,state:'ALERT',lastSeen:{x:29.5*48,y:9.5*48,fl:0,z:2},lostT:0,repath:0});g.state='ALERT';S.guards=[g];G.rememberSuspect(g,'face');Object.assign(P,{x:100,y:1500,fl:0,z:0,under:true,hide:null,vent:null,strikeT:0});
    const memory=JSON.stringify(g.lastSeen),kinds=new Set(),floors=new Set([startFloor]);let arrived=false,frames=0;
    for(;frames<1200;frames++){S.t+=.05;G.updateNpcDoors(.05);G.setLayer(g.fl||0);const x=g.x,y=g.y;G.updateGuard(g,.05);if(g.climb)kinds.add(g.climb.stairs?.roof?'roof-stair':g.climb.kind);floors.add(g.fl||0);
     check(Math.hypot(g.x-x,g.y-y)<18,'pursuer teleports between levels');check(JSON.stringify(g.lastSeen)===memory,'pursuer learns unseen player position');
     if(g.z===2&&Math.hypot(g.x-g.lastSeen.x,g.y-g.lastSeen.y)<28){arrived=true;break;}}
    check(arrived&&kinds.has('roof-stair')&&(startFloor===1||kinds.has('stair')&&floors.has(1)),'witness never follows stair chain to last-seen roof '+JSON.stringify({startFloor,at:G.gSpot(g),kinds:[...kinds],poi:g.poi,job:g.searchJob}));
    pursuit.push({startFloor,seconds:frames*.05,kinds:[...kinds],at:G.gSpot(g),memoryPreserved:true});
   }
   // A locked upper-floor door is opened only after physically approaching it.
   {
    const S=fresh('m2'),P=S.player;G.setLayer(1);const B=G.BLD[1];let doorway;
    for(let y=B.y0+1;y<B.y1&&!doorway;y++)for(let x=B.x0+1;x<B.x1&&!doorway;x++)if(!G.solidAt(x,y))for(const [dx,dy]of [[1,0],[0,1]])if(!G.solidAt(x-dx,y-dy)&&!G.solidAt(x+dx,y+dy)&&G.solidAt(x-dy,y+dx)&&G.solidAt(x+dy,y-dx))doorway={x,y,dx,dy};
    check(doorway,'no real upper-floor doorway');const {x:tx,y:ty,dx,dy}=doorway,d={tx,ty,x:(tx+.5)*48,y:(ty+.5)*48,fl:1,orig:G.GF[1][ty][tx],locked:false};d.group=[d];S.doors.push(d);const ends=[tx-dx,ty-dy,tx+dx,ty+dy];
    const [x,y,u,v]=ends,g=guard({x:(x+.5)*48,y:(y+.5)*48,fl:1,z:0,state:'ALERT'});g.state='ALERT';S.guards=[g];P.under=true;d.keyLock='test-key';G.setDoor(d,true);G.pathTo(g,(u+.5)*48,(v+.5)*48);check(d.locked,'planning breaks upper-floor door remotely');let started=false;
    for(let i=0;i<200;i++){S.t+=.05;G.updateNpcDoors(.05);G.setLayer(1);G.moveAlong(g,140,.05);if(g.doorWork){check(Math.hypot(g.x-d.x,g.y-d.y)<44,'opens door from a distance');started=true;}if(!d.locked&&Math.hypot(g.x-(u+.5)*48,g.y-(v+.5)*48)<10)break;}
    check(started&&!d.locked&&Math.hypot(g.x-(u+.5)*48,g.y-(v+.5)*48)<10,'guard cannot pass upper-floor locked door');
   }
   // Physical route matrix: every authored roof stair from its upper entry,
   // its lower flight and the mission's first guard. Uses actual collision/maps.
   const routes=[];let stairCases=0;const began=performance.now();
   for(const id of ['m1','m2','m3','m4','m5','m6']){
    const S=fresh(id),P=S.player;G.lvlInit();const base=S.guards.find(g=>!g.civ&&!g.dog&&!g.target),roofs=S.lvl.ends.filter(e=>e.l.kind==='stair');
    for(const e of roofs){const bi=G.bldAt(e.l.tx,e.l.ty),origins=[e.A,...S.lvl.ends.filter(q=>q.l.kind==='fstair'&&G.bldAt(q.l.tx,q.l.ty)===bi).map(q=>q.A),G.gSpot(base)];
     for(const origin of origins){const g={...base,...origin,id:991,state:'ALERT',path:null,climb:null,hop:null,doorWork:null};S.guards=[g];P.under=true;let frames=0;
      for(;frames<1200;frames++){S.t+=.05;G.updateNpcDoors(.05);G.setLayer(g.fl||0);if(g.climb)G.updateClimbG(g,.05);else{if(frames%8===0||!g.path)G.routeTo(g,e.B);G.hopClimb(g,G.moveAlong(g,140,.05));}if(G.lvlKey(G.gSpot(g))===G.lvlKey(e.B)&&Math.hypot(g.x-e.B.x,g.y-e.B.y)<28)break;}
      check(frames<1200,'roof route failed '+JSON.stringify({id,bi,origin,at:G.gSpot(g),target:e.B}));stairCases++;routes.push({id,bi,fromFloor:origin.fl,seconds:frames*.05});
     }
    }
   }
   return{middleRoofOccluded:true,exposedEdgeVisible:true,crouchedEdgeOccluded:true,floorsAndWallsOcclude:true,roofCoverMatchesCone:true,roofCombat,pursuit,upperDoorPhysical:true,stairCases,routes,matrixMs:performance.now()-began};
  }''')
  assert not errors,errors;(O/'multilevel-pursuit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS multilevel pursuit',json.dumps({k:v for k,v in result.items()if k!='routes'},ensure_ascii=False),flush=True);await b.close()
if __name__=='__main__':asyncio.run(main())
