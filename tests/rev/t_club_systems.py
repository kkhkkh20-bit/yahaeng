"""Parity checks: real hide flows, window sight vs solid walls, and traversal poses."""
import asyncio,importlib.util,json,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).with_name('t_club_study.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda msg:errors.append(msg.text)if msg.type=='error'and 'Failed to load resource'not in msg.text else None);await pg.add_init_script('localStorage.clear();let seed=128;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await pg.goto(f'http://127.0.0.1:{server.server_port}/build/club-study/index.html');await pg.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await pg.evaluate('window.__clubError');await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(150);await pg.evaluate(m.DRIVER)
   async def check(name,js):
    r=await pg.evaluate('()=>{const {G,S,P,V,walk,tick,idle,act,key,render,check,stop}=play;'+js+';const now=S.t;for(let i=0;i<20;i++){S.t+=.1;V.world.update();}S.t=-now-100;render();S.t=now;return {cells:V.world.visibility.cells,at:[P.x/48,P.y/48],cues:V.world.hideCues};}');results.append({'mobile':mobile,'case':name,**r});await pg.screenshot(path=str(m.O/f'systems-{"mobile"if mobile else"pc"}-{name}.png'),timeout=90000);print('PASS',mobile,name,r,flush=True)
   # Isolated presentation fixtures leave AI frozen; the full live-AI route is tested separately.
   await check('window',"Object.assign(P,{x:11.5*48,y:16.5*48,fl:0,z:0,a:-Math.PI/2});G.setLayer(0);render();const vis=V.world.visibility;check(vis.cells>20,'window reveals nothing');check(vis.at(11.5*48,14.5*48),'glass blocks sight');check(!vis.at(9.5*48,5.5*48),'solid wall leaks');check(!vis.visible(S.guards.find(g=>g.tag==='officeGuard')),'upper floor leaks through ground window');const g=S.guards.find(g=>g.tag==='patrol');Object.assign(g,{x:11.5*48,y:14.5*48});render();check(V.people.actors.get(g).driver.root.visible,'guard behind glass is invisible');")
   await check('wall',"Object.assign(P,{x:18.5*48,y:16.5*48});render();check(!V.world.visibility.at(18.5*48,14.5*48),'wall transmits sight');const g=S.guards.find(g=>g.tag==='patrol');Object.assign(g,{x:18.5*48,y:14.5*48});render();check(!V.people.actors.get(g).driver.root.visible,'guard leaks through wall');")
   await check('closed-door',"Object.assign(P,{x:13.5*48,y:16.5*48});render();check(!V.world.visibility.at(13.5*48,14.5*48),'closed door transmits sight');")
   await check('open-door',"const door=S.doors.find(d=>d.tx===13&&d.ty===15);act(G.envChoices().find(a=>a.d===door));check(!door.locked,'door did not open');check(V.world.visibility.at(13.5*48,14.5*48),'open doorway blocks sight');")
   await check('hide-discovery',"Object.assign(P,{x:6.5*48,y:13.5*48});render();check(V.world.hides.length===S.hides.length+S.bushes.length,'authored hide absent');check(V.world.hideCues.some(h=>h.type==='bush')&&V.world.hideCues.some(h=>h.type==='box'),'nearby hide cues missing');")
   await check('bush',"const h=S.bushes.find(h=>h.tx===6);Object.assign(P,{x:h.x,y:h.y,trav:null,hide:null});check(G.beginHideFlow('enter',h),'bush entry rejected');idle();check(P.hide===h,'bush entry failed');G.leaveHide({x:0,y:1});idle();check(!P.hide,'bush exit failed');")
   await check('window-pass',"const w=S.windows.find(w=>w.tx===11&&w.ty===15);w.st='open';Object.assign(P,{x:w.x,y:w.y+48,a:-Math.PI/2,hide:null,trav:null});const passage=G.windowPassage(w);check(passage,'window passage absent');G.doAct({k:'window',wv:passage});check(P.trav,'window traversal absent');tick(20);render();check(P.trav&&G.travPose(P.trav).pose==='vault','window skips vault');check(V.world.visibility.inside===0,'traversal does not reveal room');idle();check(Math.floor(P.y/48)===14,'window exit mismatch');")
   await check('feedback',"Object.assign(P,{x:5.5*48,y:18.5*48,fl:0,z:0,hide:null,trav:null});G.setLayer(0);G.actThrow({x:P.x+130,y:P.y});render();check(S.stones.length&&V.effects.entries.has(S.stones[0]),'can flight invisible');G.whistle();render();check(S.noises.some(n=>V.effects.entries.has(n)),'whistle feedback absent');")
   await check('blood-clean',"const d={x:P.x,y:P.y,r:15,rot:.5,fl:0};S.decals.push(d);render();check(V.effects.entries.get(d)?.mesh.visible,'blood stain invisible');act(G.envChoices().find(a=>a.k==='clean'));check(!S.decals.includes(d)&&!V.effects.entries.has(d),'cleaned stain remains visible');")
   await check('capacity',"const h=S.hides.find(h=>h.type==='box');h.bodies=h.cap;Object.assign(P,{x:h.x,y:h.y+30});render();check(!G.hideSpace(h,0,true),'full bin admits player');check(!G.hideSpace(h,1),'full bin admits body');const before=P.trav;G.beginHideFlow('enter',h);check(P.trav===before,'full bin starts entry');h.bodies=0;")
   assert not errors,errors;await pg.close()
  await b.close()
 (m.O/'systems-result.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));server.shutdown()
if __name__=='__main__':asyncio.run(main())
