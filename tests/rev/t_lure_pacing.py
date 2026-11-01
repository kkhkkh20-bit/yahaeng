"""Lures run promptly in the live crowd without forcing a wait objective.
Scenario placement isolates timing. Full walking/KO/outfit routes are separate.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();errors=[]
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   for prepared in [0,30,150]:
    result=await pg.evaluate('''prepared=>{
     const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let seed=127;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
     G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>g.tag===G.STAGE.dining.guest),gate=S.guards.find(g=>g.tag==='bouncer');
     Object.assign(P,{x:-9000,y:-9000});for(let i=0;i<prepared/.025;i++)G.update(.025);
     const start=S.t;S.mealDosed=true;S.usesDone[1]=true;G.updateDining(.001);check(!G.diningGoal(),'preparation overrides the mission with a wait');let last='',phases=[],maxStep=0,previous={x:g.x,y:g.y};
     for(let i=0;i<30/.025&&!S.dining.arrived;i++){G.update(.025);maxStep=Math.max(maxStep,Math.hypot(g.x-previous.x,g.y-previous.y));previous={x:g.x,y:g.y};if(S.dining.phase!==last){last=S.dining.phase;phases.push([+(S.t-start).toFixed(2),last]);}}
     const elapsed=S.t-start;check(S.dining.arrived&&S.dining.sick&&elapsed<16,'lure still stalls '+JSON.stringify({elapsed,phases,at:[g.x/48,g.y/48]}));check(maxStep<4,'guest teleports');check(Math.hypot(gate.x-24.5*48,gate.y-16.5*48)<1,'entrance guard vacates his post');
     check(g.state==='PATROL'&&g.wait>20&&!g.moving,'private KO window missing');return{prepared,seconds:+elapsed.toFixed(2),maxStep:+maxStep.toFixed(2),phases,guards:S.guards.length,cameras:S.cams.length};
    }''',prepared);print('PASS lure','mobile'if mobile else'PC',json.dumps(result),flush=True)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m4'));while(G.DLG.modal)G.advanceDialog();let S=G.S;
    for(const[x,y]of [[18,21],[19,21],[20,21]])check(!['U','L'].includes(G.G0[y][x])&&!G.solidAt(x,y),'deleted platform blocks yard');
    check(!S.ladders.some(l=>l.tx===20&&l.ty===21),'invisible ladder remains');
    Object.assign(S.player,{x:19.5*48,y:21.5*48,z:1,fl:0});S.items[0].got=true;G.saveCheckpoint();const C=G.CP;C.S.layoutVersion=1;C.grids[0][21][18]=C.grids[0][21][19]='U';C.grids[0][21][20]='L';C.S.ladders.push({tx:20,ty:21,x:20.5*48,y:21.5*48,bz:0,tz:1,ux:19.5*48,uy:21.5*48});
    check(G.loadCheckpoint(),'legacy checkpoint restore');S=G.S;check(S.player.z===0&&!S.player.trav&&S.items[0].got,'old platform restore strands player or loses progress');check(!S.ladders.some(l=>l.tx===20&&l.ty===21)&&!['U','L'].includes(G.G0[21][19]),'legacy ladder returns');
    G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();S=G.S;G.saveCheckpoint();G.CP.S.layoutVersion=1;G.CP.S.guards=G.CP.S.guards.filter(g=>g.tag!=='mealGuest');delete G.CP.S.dining;check(G.loadCheckpoint(),'legacy dining restore');check(G.S.guards.filter(g=>g.tag==='mealGuest').length===1,'legacy save lacks nearby diner');G.saveCheckpoint();G.loadCheckpoint();check(G.S.guards.filter(g=>g.tag==='mealGuest').length===1,'duplicate diner on restore');
    return{openYard:true,noInvisibleLadder:true,legacyPlatformSafe:true,mealGuestRestoredOnce:true};
   }''');print('PASS layout/save','mobile'if mobile else'PC',result,flush=True)
   await pg.close()
  assert not errors,errors;await b.close()
asyncio.run(main())
