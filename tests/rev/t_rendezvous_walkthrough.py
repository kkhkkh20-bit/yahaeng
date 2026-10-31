"""Walk to the vault, call, hide, ambush the arriving VIP and escape with real movement/hold input.
Unrelated NPCs are frozen, matching mission_flow.py; the called target and escort run live AI.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FLOW=Path(__file__).with_name('mission_flow.js').read_text()
ANCHOR=' for(const g of S.guards.filter(g=>g.target&&!G.targetEliminated(g)))attack(g,true);'
APPOINTMENT='''
 const meeting=G.rendezvousState(),vip=S.guards.find(g=>g.tag==='vip'),escort=S.guards.find(g=>g.tag==='vipEscort');
 walk(at(meeting.room),'office phone');const call=G.envChoices().find(a=>a.k==='callMeet');check(call,'no real phone action after vault');G.doAct(call);idle();check(meeting.calls===1,'phone call not committed');trace.push('call');
 const locker=S.hides.find(h=>h.type==='locker'&&!h.fl&&G.bldAt(h.tx,h.ty)===0);check(locker,'no office hiding place');
 walk(G.hidePerimeter(locker).filter(c=>pass(c.tx,c.ty,0)).map(c=>({x:c.tx,y:c.ty,f:0})),'ambush hiding place');G.doAct({k:'hide',h:locker});idle();check(P.hide===locker,'player skips hiding');
 for(let frames=0;frames<4200&&meeting.phase==='travelling';frames++){S.t+=dt;G.setLayer(vip.fl||0);G.updateGuard(vip,dt);G.setLayer(escort.fl||0);G.updateGuard(escort,dt);G.updateRendezvous(dt);}
 check(meeting.phase==='waiting'&&P.hide===locker,'VIP does not physically enter while the player hides');trace.push('VIP arrival');
 G.leaveHide({x:0,y:1});idle();check(!P.hide,'player cannot emerge for ambush');
'''+ANCHOR+'''
 check(S.missionApproach==='장부로 불러낸 매복','result forgets actual approach '+S.missionApproach);
'''
assert ANCHOR in FLOW
FLOW=FLOW.replace(ANCHOR,APPOINTMENT)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game',polling=100)
  for mobile in [False,True]:
   for alt in range(3):
    r=await pg.evaluate(FLOW,{'sid':'m2','alt':alt,'mobile':mobile});print('PASS','mobile movement'if mobile else'keyboard movement',alt,json.dumps(r['trace'],ensure_ascii=False),flush=True)
  assert not errors,errors;await b.close()
asyncio.run(main())
