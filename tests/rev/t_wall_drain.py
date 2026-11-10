"""Controlled wall contact and a real-map drain entry/travel/exit contract."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/wall-v254';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear();localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true}}));localStorage.setItem("yahaeng.skillTree.v1",JSON.stringify({schema:1,rewardVersion:152,learned:["silentHands","ambush"]}))')
  await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('window.__game?.officeReady()',polling=100)
  result=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.setLayer(0);G.S.cams=[];G.S.facOn=false;return G.S;};
   let S=fresh('m2'),P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.elite&&!g.target);S.guards=[g];
   // A real m2 wall contact, in the grass as well: the wall pull wins over generic bush ambush.
   Object.assign(P,{x:516,y:204,fl:0,z:0,cover:{x:-1,y:0},hidden:true,hide:null,under:null,vent:null,trav:null,strikeT:0});
   Object.assign(g,{x:576,y:168,fl:0,z:0,state:'SUSPICIOUS',meter:.8,seen:true,doomed:false,climb:null,yank:false});
   ok(G.coverPullRoute(g),'passing contact unavailable');ok(G.attackAction().k==='pull','wall pull loses to generic attack/recognition');g.state='ALERT';ok(!G.coverTarget(),'confirmed alert allows an unsuspected ambush');g.state='PATROL';g.meter=0;g.seen=false;
   G.combatPress('KeyZ');S.keys.KeyZ=true;G.actAttack();ok(S.pull?.g===g,'native attack dispatch does not start pull');
   const start=S.t;let untilKO;for(let i=0;i<112;i++){S.t+=.01;if(S.pull)G.updatePull(.01);if(g.unconscious&&!untilKO)untilKO=S.t-start;G.updateKoHold();}
   ok(G.targetEliminated(g)&&S.stats.kills===1&&!g.unconscious,'1.1-second hold restarts after pull contact');G.combatRelease('KeyZ');S.keys.KeyZ=false;
   S=fresh('m4');P=S.player;S.guards=[];S.items.forEach(i=>i.got=true);G.checkObjective();ok(S.exitOpen,'fixture objectives not complete');
   const entry=S.hides.find(h=>h.tx===17&&h.ty===23),outlet=S.hides.find(h=>h.tx===17&&h.ty===26),wells=S.hides.filter(h=>h.type==='well');
   for(const w of wells)ok(G.ugAt(w.tx,w.ty),'disconnected manhole');
   const seen=new Set(['17,23']),queue=[[17,23]];for(let i=0;i<queue.length;i++)for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=queue[i][0]+dx,y=queue[i][1]+dy,k=x+','+y;if(G.ugAt(x,y)&&!seen.has(k)){seen.add(k);queue.push([x,y]);}}
   for(const w of wells)ok(seen.has(w.tx+','+w.ty),'manhole network split');
   for(let y=0;y<G.MH;y++)for(let x=0;x<G.MW;x++)if(G.ugAt(x,y)){const b=G.BLD[G.bldAt(x,y)];ok(!b||b.vacant,'authored drain passes under an occupied foundation '+[x,y]);}
   Object.assign(P,{x:entry.x,y:entry.y,fl:0,z:0,under:false,hide:null,trav:null});G.updatePlayer(.01);ok(!S.over,'standing on lid completes escape');ok(G.envAction().k==='sewerIn','physical drain descent is not offered');
   ok(!G.beginAccessFlow('sewerDown',outlet),'remote drain descent accepted');P.y=entry.y+34;ok(G.beginAccessFlow('sewerDown',entry),'entry descent blocked');
   let n=0;while(P.trav&&n++<500){S.t+=.01;G.updateTrav(P,.01);}ok(P.under&&!S.over,'descent skips underground travel');ok(G.nextGoal().x===outlet.x&&G.nextGoal().y===outlet.y,'underground goal points back to entry');
   // At the outlet, entering the climb is still not victory; the closing beat must finish.
   P.x=outlet.x;P.y=outlet.y;ok(G.beginAccessFlow('surface',outlet),'outlet ascent blocked');ok(!S.over,'victory before ascent');n=0;while(P.trav&&n++<500){S.t+=.01;G.updateTrav(P,.01);}ok(S.over&&S.overWin&&!P.under,'outlet does not complete escape');
   // Without completed objectives, the same physical outlet returns to ordinary play.
   S=fresh('m4');P=S.player;const o=S.hides.find(h=>h.tx===17&&h.ty===26);Object.assign(P,{x:o.x,y:o.y,fl:0,z:0,under:true,hide:null,trav:null});ok(G.beginAccessFlow('surface',o),'ordinary ascent blocked');n=0;while(P.trav&&n++<500){S.t+=.01;G.updateTrav(P,.01);}ok(!S.over&&!P.under,'incomplete objectives bypassed');
   // Old saves can be in a tunnel the new authored route no longer uses.
   Object.assign(P,{x:1320,y:648,under:true,hp:2});G.saveCheckpoint();ok(G.loadCheckpoint(),'legacy underground load failed');ok(G.S.player.x===1320&&G.S.player.y===648&&G.S.player.hp===2&&G.ugAt(27,13),'legacy tunnel checkpoint stranded or displaced');
   return{wallPullPriority:true,suspicionWindow:true,confirmedAlertBlocked:true,holdIncludesPull:true,untilKO,connectedWells:wells.length,foundationAvoidance:true,noLidVictory:true,physicalDescent:true,undergroundGoal:true,victoryAfterAscent:true,objectivesRequired:true,legacyTunnelPreserved:true};
  }''');assert not errors,errors;(O/'wall-drain.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS wall drain',json.dumps(result),flush=True);await b.close()
asyncio.run(main())
