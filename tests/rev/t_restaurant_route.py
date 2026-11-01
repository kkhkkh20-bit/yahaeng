"""Restaurant WC connectivity, privacy, opportunity guidance and old-save migration."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.S.cams=[];G.S.facOn=false;G.update(.001);G.setLayer(0);return G.S;};
    let S=fresh(),P=S.player;const st=G.STAGE,patch=st.roomPatches,fixtures=st.fixedFurn;st.roomPatches=[];st.fixedFurn=fixtures.filter(f=>!(f.y===27&&f.x>=6&&f.x<=7));S=fresh();const before=G.G0.map(r=>r.slice());st.roomPatches=patch;st.fixedFurn=fixtures;S=fresh();P=S.player;
    let unchanged=0;for(let y=0;y<st.H;y++)for(let x=0;x<st.W;x++)if(x<3||x>7||y<27||y>31){check(G.G0[y][x]===before[y][x],'room changes unrelated cell '+x+','+y);unchanged++;}
    const entry=[6,32],reachable=[];for(let y=27;y<=31;y++)for(let x=3;x<=9;x++)if(!G.solidAt(x,y)){const path=G.astar(...entry,x,y);check(path.length,'isolated room/kitchen/stair cell '+x+','+y);reachable.push([x,y]);}
    const wc=st.dining.toilet,door=S.doors.find(d=>d.tx===7&&d.ty===29);check(door&&!door.locked&&G.G0[27][7]==='K'&&G.G0[28][7]!=='K','WC fixtures and stand disagree');
    const lamp=S.lamps.find(l=>l.x===(wc[0]+.5)*48&&l.y===(wc[1]+.5)*48);check(lamp?.control,'WC has no wall switch');Object.assign(P,{x:7.5*48,y:29.5*48});check(G.nearLamp()!==lamp,'WC light action overlaps the rear-grapple entrance');Object.assign(P,{x:6.5*48,y:28.5*48});check(G.nearLamp()===lamp,'wall switch is not reachable');
    S.mealDosed=true;G.setOppMode(1);check(G.diningGoal()?.where==='포차 화장실','prepared meal has no useful follow-up');S.goalManual=true;check(!G.diningGoal(),'automatic guide overrides manual choice');S.goalManual=false;G.setOppMode(0);check(!G.diningGoal(),'guide ignores hints-off');G.setOppMode(1);P.outfit='crew';P.disguiseBlown=false;check(!G.diningGoal(),'guide continues after uniform obtained');P.outfit=null;P.blown={crew:true};check(!G.diningGoal(),'guide recommends a compromised uniform');P.blown={};
    // The two toilets are independent; a VIP drink plan cannot reserve the restaurant WC.
    const g=S.guards.find(g=>g.tag==='bouncer');S.dining={phase:'queue',next:0,elapsed:0,eaten:true,sick:true,waypoint:{},layout:2};S.vipPlan={phase:'sick',reachedToilet:false};Object.assign(S.guards[0],{x:40.5*48,y:6.5*48,fl:0,z:0});G.updateDining(.1);check(S.dining.phase==='toilet'&&S.dining.waypoint.x===(wc[0]+.5)*48,'VIP blocks a different toilet');
    // Privacy and locked-door state survive a checkpoint, with an actual unlock action to leave.
    S=fresh();P=S.player;const d=S.doors.find(d=>d.tx===7&&d.ty===29);Object.assign(P,{x:7.5*48,y:28.75*48,fl:0,z:0});G.setLayer(0);let a=G.envChoices().find(a=>a.k==='door'&&a.d===d);check(a,'WC door not reachable from inside');G.selectEnvTarget(G.envToken(a));G.actEnv();for(let i=0;i<30;i++){S.t+=.02;G.updatePlayer(.02);}check(d.locked&&!G.los(7.5*48,31.5*48,7.5*48,28.5*48,0),'locked WC exposes its occupant');G.saveCheckpoint();check(G.loadCheckpoint(),'WC save');S=G.S;P=S.player;let restored=S.doors.find(d=>d.tx===7&&d.ty===29);check(restored.locked&&G.G0[29][7]==='X','load silently opens WC door');check(S.lamps.find(l=>l.x===7.5*48&&l.y===28.5*48)?.control?.x===6.1*48,'save loses WC wall switch');G.selectEnvTarget(G.envToken(G.envChoices().find(a=>a.k==='door'&&a.d===restored)));G.actEnv();for(let i=0;i<30;i++){S.t+=.02;G.updatePlayer(.02);}check(!restored.locked&&G.astar(7,28,6,32).length,'cannot leave WC');
    // Old table destination and an actor covered by a new wall migrate without losing the dose.
    S=fresh();P=S.player;let guest=S.guards.find(g=>g.tag==='bouncer'),old={x:5.5*48,y:30.5*48,pause:10,once:true,mealTrip:true};guest.route.unshift(old);guest.ri=0;guest.wait=0;S.dining={phase:'walking',next:24,eating:0,eaten:false,elapsed:4,waypoint:old};S.mealDosed=true;S.usePoints[1]={x:old.x,y:old.y,fl:0,surface:{x:4,y:29,w:2,h:1,t:'table',r:0,fl:0},surfaceU:.85};Object.assign(P,{x:5.5*48,y:28.5*48,fl:0,z:0});G.saveCheckpoint();for(let y=27;y<=31;y++)for(let x=3;x<=7;x++)G.CP.grids[0][y][x]=before[y][x];G.CP.S.doors=G.CP.S.doors.filter(d=>d.tx!==7||d.ty!==29);check(G.loadCheckpoint(),'legacy room restore');S=G.S;P=S.player;guest=S.guards.find(g=>g.tag==='bouncer');G.setLayer(0);const meal=G.usePoint(st.uses[1]);check(S.mealDosed&&!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48))&&meal.surface.y===30,'legacy room loses dose or traps actor');check(guest.route.includes(S.dining.waypoint)&&S.dining.waypoint.x===meal.x&&S.dining.waypoint.y===meal.y,'legacy meal path points at old furniture');
    // An already-arrived old public-WC visit must retain its destination and full remaining wait.
    S=fresh();guest=S.guards.find(g=>g.tag==='bouncer');old={x:40.5*48,y:6.5*48,pause:32,once:true,spent:true,mealTrip:true};guest.route.unshift(old);guest.ri=1;guest.wait=17.5;Object.assign(guest,{x:old.x,y:old.y,fl:0,z:0,moving:false});S.dining={phase:'toilet',arrived:true,waypoint:old,elapsed:9,eaten:true,sick:true};G.saveCheckpoint();check(G.loadCheckpoint(),'old active WC restore');S=G.S;guest=S.guards.find(g=>g.tag==='bouncer');check(S.dining.toilet[0]===40&&S.dining.toilet[1]===6&&guest.wait===17.5&&guest.x===old.x&&guest.y===old.y,'old WC visit reset or teleported');check(G.diningGoal()?.where==='골목 공중화장실','old visit points at new WC');
    return{reachableCells:reachable.length,unchangedOutsidePatch:unchanged,doorPrivacy:true,twoToilets:true,goalPriority:true,migration:true,oldVisitPreserved:true};
   }''')
   assert not errors,errors;print('PASS restaurant','mobile'if touch else'PC',json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
