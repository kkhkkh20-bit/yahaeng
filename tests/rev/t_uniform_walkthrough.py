"""Use meal preparation to obtain a uniform without killing, then walk into the office.
Guest-only checks isolate the input route; two further runs keep all NPCs and cameras active.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FLOW=Path(__file__).with_name('mission_flow.js').read_text().split(' // Prioritize obtainable cards')[0]
FLOW=FLOW.replace('const tick=()=>{S.t+=dt;G.updatePlayer(dt);G.updateKoHold();G.runTimers();};',"const guest=S.guards.find(g=>g.tag==='bouncer');const tick=()=>{S.t+=dt;G.updatePlayer(dt);G.setLayer(guest.fl||0);G.updateGuard(guest,dt);G.setLayer(P.fl||0);G.updateDining(dt);G.updateKoHold();G.runTimers();};")
FLOW=FLOW.replace('({sid,alt=0,mobile=false,targetsFirst=false})=>','({sid,alt=0,mobile=false,targetsFirst=false,live=false})=>')
FLOW=FLOW.replace('const tick=()=>{S.t+=dt;',"const tick=()=>{if(live){G.update(dt);check(!S.over,'live scene ended during '+trace.join(' / '));return;}S.t+=dt;")
FLOW+='''
 const med=S.props.find(p=>p.id==='laxative');walk(at(med),'pharmacy');let a=G.envChoices().find(a=>a.k==='pickup'&&a.p===med);check(a,'medicine unavailable');G.actCarry(a);idle();
 const table=G.usePoint(G.STAGE.uses[1]);walk(at(table),'seasoning');a=G.envChoices().find(a=>a.k==='use');check(a,'food preparation unavailable');G.selectEnvTarget(G.envToken(a));G.actEnv();idle();check(S.mealDosed&&!P.item,'food not prepared');check(G.diningGoal()?.text.includes('식사'),'preparation has no follow-up');
 walk([{x:3,y:28,f:0}],'wait off the aisle');let waited=0;while(!S.dining.arrived&&waited<160){tick();waited+=dt;}check(S.dining.arrived&&guest.state==='PATROL','guest never physically uses restaurant WC '+JSON.stringify({waited,phase:S.dining.phase,g:[guest.x/48,guest.y/48,guest.state]}));trace.push('guest arrived');
 walk([{x:7,y:29,f:0}],'WC entrance');check(G.grabAction().g===guest&&G.grabAction().k==='grab','WC layout gives no rear approach');G.actGrab();idle();check(P.captive===guest,'grapple failed');
 S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<3;i++)tick();S.keys.KeyZ=false;G.combatRelease('KeyZ');idle();const body=S.corpses.find(c=>c.g===guest&&c.ko);check(body&&S.stats.kills===0,'uniform route requires a kill');trace.push('nonlethal takedown');
 a=G.envChoices().find(a=>a.k==='dress'&&a.c===body);check(a,'uniform not selectable in WC');G.selectEnvTarget(G.envToken(a));G.actEnv();idle();check(P.outfit==='crew'&&!P.disguiseBlown&&!G.diningGoal(),'uniform benefit missing or stale guide');trace.push('uniform');
 walk([{x:7,y:12,f:0}],'office interior');G.updateHUD(true);check(document.querySelector('#layerLbl').textContent.includes('통과'),'uniform does not grant office access');check(S.stats.kills===0,'nonlethal route killed someone');stop();return{mobile,alt,seconds:Math.round(S.t),waited:+waited.toFixed(1),kills:S.stats.kills,outfit:P.outfit,trace};
}'''
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game',polling=100)
  for mobile in [False,True]:
   for alt in range(3):
    r=await pg.evaluate(FLOW,{'sid':'m2','alt':alt,'mobile':mobile});print('PASS uniform route',json.dumps(r,ensure_ascii=False),flush=True)
  for mobile in [False,True]:
   await pg.evaluate('let seed=116;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   r=await pg.evaluate(FLOW,{'sid':'m2','alt':0,'mobile':mobile,'live':True});print('PASS full live scene',json.dumps(r,ensure_ascii=False),flush=True)
  assert not errors,errors;await b.close()
asyncio.run(main())
