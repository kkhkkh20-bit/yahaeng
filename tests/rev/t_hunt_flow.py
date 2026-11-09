"""All public-map exit geometry and controlled pursuit/search-memory regressions."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hunt-v253';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('window.__game?.officeReady()',polling=100)
  r=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},rows=[],fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.setLayer(0);return G.S;};
   for(const id of ['tB','p0','e2','m2','m4','m6','m7','m5','n1']){const S=fresh(id),P=S.player,doors=new Set(S.doors.filter(d=>!d.fl).map(d=>d.ty*G.MW+d.tx)),sol=(x,y)=>G.solidAt(x,y)&&!doors.has(y*G.MW+x);ok(S.exits.length===(id==='tB'?1:2),'public escape choice missing '+id);
    for(const e of S.exits){let reached=false;const tx=Math.floor(e.x/48),ty=Math.floor(e.y/48);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=tx+dx,y=ty+dy;if(x<0||y<0||x>=G.MW||y>=G.MH||sol(x,y)||Math.hypot((x+.5)*48-e.x,(y+.5)*48-e.y)>=e.r-4)continue;const path=G.astar(Math.floor(P.x/48),Math.floor(P.y/48),x,y,sol);if(path.length&&Math.floor(path.at(-1).x/48)===x&&Math.floor(path.at(-1).y/48)===y)reached=true;}
     ok(reached,'unreachable escape circle '+id+' '+e.name);ok(e.name,'unnamed escape '+id);}
    rows.push({id,exits:S.exits.map(e=>e.name),guards:S.guards.filter(g=>!g.civ&&!g.dog).length,searchSeconds:G.STAGE.flowDesign.search});
   }
   let S=fresh('p0');G.saveCheckpoint();G.CP.S.flowVersion=undefined;G.CP.S.exits=G.CP.S.exits.slice(0,1);G.CP.grids[0][12][3]='#';G.CP.grids[0][13][3]='#';G.CP.S.player.hp=2;ok(G.loadCheckpoint(),'legacy checkpoint load');ok(G.S.exits.length===2&&G.G0[12][3]==='='&&G.G0[13][3]==='='&&G.S.player.hp===2,'flow migration loses gate/exit or progress');
   S=fresh('m2');let P=S.player;S.guards=[];S.doors=[];
   for(let y=1;y<=17;y++)for(let x=1;x<=18;x++)G.G0[y][x]=(x===1||x===18||y===1||y===17||x===7&&y<=13)?'#':'.';Object.assign(P,{x:5.5*48,y:5.5*48,fl:0,z:0});S.exits=[{x:8.5*48,y:5.5*48,r:46,name:'near blocked'},{x:5.5*48,y:12.5*48,r:46,name:'longer direct'}];S.exit=S.exits[0];const began=performance.now();ok(G.chooseEscape()===S.exits[1],'straight distance wins over real escape route');const navMs=performance.now()-began;
   G.G0[5][7]='S';S.escapeChoice=null;ok(G.chooseEscape()===S.exits[0],'player-only gap excluded from escape guidance');
   S=fresh('m2');P=S.player;const g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.guards=[g];S.cams=[];S.facOn=false;S.corpses=[];S.decals=[];S.knownLooks={};S.searchIncidents=[];S.alevel=0;S.t=10;let strip;
   for(let y=12;y<G.MH-2&&!strip;y++)for(let x=2;x<G.MW-12&&!strip;x++)if(Array.from({length:10},(_,i)=>!G.solidAt(x+i,y)&&G.bldAt(x+i,y)<0).every(Boolean))strip={x:(x+.5)*48,y:(y+.5)*48};ok(strip,'missing exterior chase strip');
   Object.assign(g,{...strip,fl:0,z:0,a:0,want:0,state:'PATROL',seen:false,radio:false,torch:false,path:null,post:0,wait:999,chat:null,act:null,follow:null});Object.assign(P,{x:strip.x+96,y:strip.y,fl:0,z:0,hide:null,under:null,vent:null,hidden:false,light:1,outfit:null,strikeT:.2,mode:'run',moving:true});G.updateGuard(g,.05);ok(g.state==='ALERT','crime fixture is not witnessed');
   for(let i=0;i<4;i++){P.x+=20;S.t+=.2;G.updateGuard(g,.2);}const at={...g.lastSeen};ok(Number.isFinite(at.heading)&&Math.abs(at.heading)<.1,'observed escape direction missing');P.under=true;P.x=-9000;P.y=-8000;P.strikeT=0;
   for(let i=0;i<150&&!S.searchIncidents.length;i++){S.t+=.05;G.updateGuard(g,.05);}const first=S.searchIncidents[0];ok(first&&first.jobs.some(j=>j.kind==='trail'),'loss of sight does not search the observed escape direction');ok(first.jobs.filter(j=>j.kind==='perimeter').length>=4,'street search remains only a tiny scene');ok(!JSON.stringify(first).includes('-9000'),'search reads hidden player coordinates');
   for(const j of first.jobs)j.done=true;const newer={...at,x:at.x+48,observedAt:S.t+2};S.t+=2;G.startBuildingSearch(newer,'A','sighting',g);ok(S.searchIncidents.length>=2&&S.searchIncidents.at(-1).jobs.some(j=>!j.done),'fresh sighting reuses exhausted search');
   const active=S.searchIncidents.at(-1);g.state='SEARCH';g.searchJob={incident:active.id,job:0};S.alevel=2;S.alevelT=.5;G.updateAlert(1);ok(S.alevel===2&&S.alevelT>=2,'alarm expires during an active physical search');g.state='DEAD';G.updateAlert(3);ok(S.alevel===1,'search alert never releases after responders are gone');
   return{maps:rows,legacyGateAndHealth:true,realRouteChoice:true,navMs,observedHeading:true,streetSweep:true,refreshedSight:true,noHiddenTracking:true,activeSearchClock:true};
  }''');assert not errors,errors;(O/'flow-hunt.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print('PASS hunt flow',json.dumps(r,ensure_ascii=False),flush=True);await b.close()
asyncio.run(main())
