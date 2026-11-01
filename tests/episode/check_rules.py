"""Controlled fixtures: floor-safe doors, independent desk clue, authored window,
mission invariants and search. Does not substitute for the live-AI route tests.
"""
import asyncio,importlib.util,json,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).resolve().parents[1]/'rev'/'t_club_study.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':960,'height':740});errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear()');await pg.goto(f'http://127.0.0.1:{server.server_port}/build/episode-one/');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100);await pg.click('#btnBrGo');await pg.evaluate(m.DRIVER)
  result=await pg.evaluate('''()=>{const {G,S,P,tick,idle,act,check}=play;
   G.setLayer(1);const g=S.guards.find(g=>g.tag==='officeGuard'),upper=JSON.stringify(G.GF[1]),doors=S.doors.map(d=>d.locked);g.state='SEARCH';G.pathTo(g,24,24);check(JSON.stringify(G.GF[1])===upper,'upper search rewrites lower-floor door cell');check(S.doors.every((d,i)=>d.locked===doors[i]),'upper search breaks lower door');g.state='PATROL';G.setLayer(0);
   const n=S.notes[0];check(!P.keys.code,'code known at start');Object.assign(P,{x:n.x,y:n.y,fl:0,outfit:'crew'});act(G.envChoices().find(a=>a.k==='read'&&a.n===n));check(n.read&&P.keys.code&&S.learned.some(s=>s.includes('4816')),'desk clue fails independently');while(G.DLG.modal)G.advanceDialog();
   check(S.fwindows.find(w=>w.tx===13&&w.ty===4).st==='open','authored window randomizes');const target=S.guards.find(g=>g.target);check(G.targetName(target)==='송대건'&&G.targetKnowledge(target).fl===1,'target briefing wrong floor');
   G.checkObjective();check(!S.exitOpen,'premature extraction');const c={g:target,guardId:target.id,ko:true,target:true,fl:1,x:target.x,y:target.y};S.corpses.push(c);target.state='DEAD';target.unconscious=true;G.checkObjective();check(!G.targetEliminated(target)&&!S.exitOpen,'KO treated as kill');S.items[0].got=true;G.checkObjective();check(!S.exitOpen,'KO plus ledger completes');c.ko=false;target.unconscious=false;G.checkObjective();check(G.targetEliminated(target)&&S.exitOpen,'complete requirements do not unlock exit');return{floorSafeSearch:true,deskCodeIndependent:true,authoredWindow:true,targetFloor:1,KOIsNotKill:true,bothGoalsRequired:true};}''')
  assert not errors,errors;print('PASS episode edge fixtures',json.dumps(result),flush=True);out=m.R/'build/episode-validation';out.mkdir(exist_ok=True);(out/'edges.json').write_text(json.dumps({'result':result,'errors':errors},ensure_ascii=False,indent=2));await b.close()
 server.shutdown()
if __name__=='__main__':asyncio.run(main())
