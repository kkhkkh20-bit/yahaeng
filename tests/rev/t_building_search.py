"""Actual floor traversal, reserved search jobs, camera mounts and lawful disguise cues."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b = await p.chromium.launch(); pg = await b.new_page(); errors = []
  pg.on('pageerror', lambda e: errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0')
  await pg.goto((ROOT/'build/preview_city.html').as_uri()); await pg.wait_for_function('!!__game')
  result = await pg.evaluate('''() => {
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();return G.S};
   let indoor=0,exterior=0,corners=0;const searches=[];
   for(const id of ['m1','m2','m3','m4','m5','m6']){
    const S=fresh(id),P=S.player;Object.assign(P,{carrying:null,captive:null,trav:null,jump:null,hide:null,wire:null,ledge:null,under:null,vent:null,z:0});
    for(const B of G.BLD.filter(b=>!b.vacant))for(let f=0;f<B.h;f++){
     G.setLayer(f);P.fl=f;
     for(let y=B.y0+1;y<B.y1;y++)for(let x=B.x0+1;x<B.x1;x++)if(!G.solidAt(x,y))for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){
      P.x=x*48+24;P.y=y*48+24;P.a=a;check(!G.wallUpSpot(),'indoor wall climb '+id+' '+f+' '+x+','+y);indoor++;
     }
    }
    P.fl=0;G.setLayer(0);let valid=null;
    for(let y=1;y<G.MH-1&&!valid;y++)for(let x=1;x<G.MW-1&&!valid;x++)if(G.bldAt(x,y)<0&&!G.solidAt(x,y))for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){
     P.x=x*48+24;P.y=y*48+24;P.a=a;valid=G.wallUpSpot();if(valid)break;
    }
    if(valid){exterior++;const B=G.BLD.find(b=>!b.vacant),q=G.planPt(G.BLD.indexOf(B),0,'S')||[B.x0+2,B.y0+2];P.x=q[0]*48+24;P.y=q[1]*48+24;G.doAct({k:'wallUp',s:valid});check(!P.trav&&!P.z,'stale exterior climb teleports from indoors '+id)}
    for(const c of S.cams.filter(c=>!c.search&&c.b>=0&&!G.BLD[c.b].vacant)){
     check(c.wallMount,'indoor camera has no architectural corner '+id+' '+JSON.stringify(c));corners++;
     G.setLayer(c.fl);check(!G.solidAt(c.tx,c.ty),'camera inside wall');const m=c.wallMount;
     check('#NSXV'.includes(G.tileCh(c.tx+m.sx,c.ty))&&'#NSXV'.includes(G.tileCh(c.tx,c.ty+m.sy)),'mount not at two walls');
    }
   }
   check(exterior===6&&indoor>10000&&corners>=6,'insufficient map fixtures '+JSON.stringify({exterior,indoor,corners}));
   for(const [id,bi] of [['m2',0],['m4',2],['m6',0]]){
    const S=fresh(id),P=S.player;P.x=P.y=-9000;S.facOn=false;S.corpses=[];S.decals=[];S.t=10;
    const at=G.planPt(bi,0,'S')||G.planPt(bi,0,'L');check(at,'missing search room '+id);
    const origin={x:at[0]*48+24,y:at[1]*48+24,fl:0,z:0};
    check(G.startBuildingSearch(origin,'A','body'),'search not assigned '+id);
    const assigned=S.guards.filter(g=>g.searchJob),jobs=assigned.map(g=>g.searchJob.job);
    check(assigned.length>=2&&new Set(jobs).size===jobs.length,'guards converge on the same reserved job '+id);
    const memory=JSON.stringify(S.searchIncidents[0].at);P.x=-8000;P.y=-7000;P.fl=1;
    for(let n=0;n<1200;n++){S.t+=.05;for(const g of S.guards){G.setLayer(g.fl||0);G.updateGuard(g,.05)}}
    check(JSON.stringify(S.searchIncidents[0].at)===memory,'search tracks unseen player '+id);
    const log=S.searchLog||[];check(log.some(q=>q.status==='checked'&&q.fl===1),'no real second-floor search '+id+' '+JSON.stringify(log));
    check(log.some(q=>q.status==='checked'&&q.kind==='room'),'rooms never physically checked '+id);
    check(!P.disguiseBlown&&S.stats.detected===0,'body-only report invents culprit '+id);
    check(G.camWatcher()&&!S.guards.find(g=>g.tag==='camop').searchJob,'camera operator abandons the monitor '+id);
    searches.push({id,assigned:assigned.length,checked:log.filter(q=>q.status==='checked').length,upstairs:log.filter(q=>q.status==='checked'&&q.fl===1).length});
    G.saveCheckpoint();check(G.loadCheckpoint(),'search save failed');
    for(let n=0;n<800;n++){G.S.t+=.05;for(const g of G.S.guards){G.setLayer(g.fl||0);G.updateGuard(g,.05)}}
    check(!G.S.guards.some(g=>g.searchJob),'search does not expire and return to routine '+id+' '+JSON.stringify(G.S.guards.filter(g=>g.searchJob).map(g=>({id:g.id,state:g.state,ref:g.searchJob,climb:!!g.climb,t:G.S.t}))));
   }
   {
    const S=fresh('m4'),P=S.player;S.facOn=false;S.corpses=[];S.decals=[];S.t=10;
    const h=S.hides.find(h=>h.fl===1&&G.bldAt(h.tx,h.ty)===2);check(h,'upstairs hiding fixture');
    Object.assign(P,{x:h.x,y:h.y,fl:1,z:0,hide:h,light:0,hidden:true});
    const at=G.planPt(2,0,'S');G.startBuildingSearch({x:at[0]*48+24,y:at[1]*48+24,fl:0,z:0},'A','body');
    for(let n=0;n<1500&&P.hide;n++){S.t+=.05;for(const g of S.guards){G.setLayer(g.fl||0);G.updateGuard(g,.05)}}
    check(!P.hide&&S.guards.some(g=>g.state==='ALERT'&&g.fl===1)&&S.knownLooks?.face,'upstairs hiding place is never physically inspected '+JSON.stringify({hide:{x:h.x,y:h.y,tx:h.tx,ty:h.ty,fl:h.fl},jobs:S.searchIncidents[0].jobs.filter(j=>j.kind==='hide'),log:S.searchLog,guards:S.guards.filter(g=>g.searchJob).map(g=>({id:g.id,ref:g.searchJob,x:g.x,y:g.y,fl:g.fl}))}));
   }
   // Enter through the real witness -> chase -> lost sight -> squad-search state machine.
   {
    const S=fresh('m4'),P=S.player,B=G.BLD[2],g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&g.fac==='A');S.facOn=false;S.corpses=[];S.decals=[];G.setLayer(0);let pair;
    for(let y=B.y0+1;y<B.y1&&!pair;y++)for(let x=B.x0+2;x<B.x1&&!pair;x++)if(!G.solidAt(x,y)&&!G.solidAt(x-1,y))pair=[x,y];check(pair,'witness corridor');
    Object.assign(g,{x:(pair[0]-.5)*48,y:(pair[1]+.5)*48,fl:0,z:0,a:0,want:0,state:'PATROL',brawl:null,hunt:null,climb:null,radio:false,post:0,wait:999});
    Object.assign(P,{x:(pair[0]+.5)*48,y:g.y,fl:0,z:0,light:1,hidden:false,mode:'walk',strikeT:.3,hide:null,under:null,vent:null,outfit:null});
    G.updateGuard(g,.05);check(g.state==='ALERT'&&g.seen,'visible attack does not start pursuit');const last={...g.lastSeen};
    P.x=-8000;P.y=-7000;P.fl=1;P.strikeT=0;
    for(let n=0;n<1200;n++){S.t+=.05;for(const q of S.guards){G.setLayer(q.fl||0);G.updateGuard(q,.05)}G.runTimers()}
    check(S.searchIncidents?.some(i=>i.source==='sighting'&&i.at.fl===0&&Math.hypot(i.at.x-last.x,i.at.y-last.y)<1),'lost pursuit is not based on the actual last sighting');
    check(S.searchLog?.some(l=>l.status==='checked'&&l.fl===1),'lost pursuit never searches the building upstairs');
   }
   // An actual monitored camera report retains the floor of the visible offence.
   {
    const S=fresh('m6'),P=S.player,c=S.cams.find(c=>c.wallMount&&c.fl===1);G.setLayer(1);S.facOn=false;S.corpses=[];S.knownLooks={};S.alevel=0;S.chaseSeen=false;let at;
    const B=G.BLD[c.b];for(let y=B.y0+1;y<B.y1&&!at;y++)for(let x=B.x0+1;x<B.x1&&!at;x++){
     const px=x*48+24,py=y*48+24,d=Math.hypot(px-c.x,py-c.y),a=Math.atan2(py-c.y,px-c.x),diff=Math.atan2(Math.sin(a-c.base),Math.cos(a-c.base));
     if(!G.solidAt(x,y)&&d<200&&Math.abs(diff)<.4&&G.los(c.x,c.y,px,py))at={x:px,y:py};
    }check(at,'camera sight fixture');Object.assign(P,{...at,fl:1,z:0,light:1,hidden:false,hide:null,under:null,vent:null,strikeT:.3,outfit:'crew',disguise:'sam',disguiseBlown:false});
    c.a=c.base;c.sweep=0;c.meter=.99;c.cool=0;G.updateCams(.1);
    check(S.searchIncidents?.some(i=>i.source==='camera'&&i.at.fl===1&&i.at.x===P.x&&i.at.y===P.y)&&S.knownLooks.crew,'camera report loses the actual crime floor or identity');
   }
   {
    const S=fresh('m1'),P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.guards=[g];S.facOn=false;S.corpses=[];S.decals=[];S.alevel=0;S.knownLooks={};
    Object.assign(g,{x:30.5*48,y:3.5*48,fl:0,z:0,a:0,want:0,state:'PATROL',wait:999,post:0,still:true,idleT:999,enforcer:false,radio:false,meter:0});
    Object.assign(P,{x:g.x+96,y:g.y,fl:0,z:0,a:0,outfit:'crew',disguise:'sam',disguiseBlown:false,light:1,hidden:false,mode:'walk',moving:false,hide:null,under:null,vent:null,captive:null,carrying:null,strikeT:0});G.setLayer(0);
    for(let n=0;n<240;n++){S.t+=.05;G.updateGuard(g,.05)}
    check(!P.disguiseBlown&&g.state==='PATROL'&&G.exposure()===0,'valid uniform turns red when watched');
    g.enforcer=true;for(let n=0;n<100;n++)G.updateGuard(g,.05);check(!P.disguiseBlown&&!g.eyeT,'enforcer recognizes back of head');
    P.a=Math.PI;for(let n=0;n<30;n++)G.updateGuard(g,.05);G.updateStealth(1);check(g.eyeT>0&&!P.disguiseBlown&&document.querySelector('#expoLbl').textContent==='신원 확인 중','missing fair identity warning');
    for(let n=0;n<40;n++)G.updateGuard(g,.05);check(P.disguiseBlown&&g.state==='ALERT'&&G.exposure()===2,'confirmed face check does not become real detection');
    P.hide={};check(G.exposure()===0,'stale sight remains red after hiding');
   }
   {
    const S=fresh('m6'),P=S.player;P.x=22.5*48;P.y=13.5*48;G.setLayer(0);const goal=G.nextGoal();check(goal.fl===1&&goal.where.includes('2층'),'radio goal absolute location');
    const lines=G.objectiveLines().map(l=>l[1]).join(' ');check(lines.includes('감금동 2층')&&!/층 위|층 아래/.test(lines),'relative floor label remains');
    const op=S.guards.find(g=>g.tag==='camop');check(G.camWatcher(),'operator not at monitor');op.x+=200;check(!G.camWatcher(),'operator watches monitor remotely');op.x-=200;
    const c=S.cams.find(c=>c.wallMount);check(c,'camera save fixture');c.broken=true;c.cool=4;S.camsOff=true;delete c.wallMount;G.saveCheckpoint();G.loadCheckpoint();
    const restored=G.S.cams.find(q=>q.tx===c.tx&&q.ty===c.ty&&q.fl===c.fl);check(restored?.wallMount&&restored.broken&&restored.cool===4&&G.S.camsOff,'camera migration resets progress');
   }
   return {indoorPositions:indoor,exteriorClimbs:exterior,cornerCameras:corners,searches,identityCues:true,absoluteFloors:true};
  }''')
  assert not errors, errors
  print('PASS', result); await b.close()

asyncio.run(main())
