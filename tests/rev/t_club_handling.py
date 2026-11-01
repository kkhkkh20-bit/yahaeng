"""Lethal bodies remain visible and lift/drop use continuous paired poses."""
import asyncio,importlib.util,threading,json
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).with_name('t_club_study.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=s.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);pg=await b.new_page();await pg.goto(f'http://127.0.0.1:{s.server_port}/build/club-study/index.html?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100)
  print(await pg.evaluate('''()=>{const G=__game,V=__clubView,S=G.S,P=S.player,check=(a,m)=>{if(!a)throw Error(m)},tick=n=>{for(let i=0;i<n;i++)G.update(1/60)};Object.assign(P,{x:7.5*48,y:12.5*48,a:-Math.PI/2});window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyZ'}));tick(110);window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyZ'}));tick(40);const c=S.corpses[0],g=S.guards.find(g=>g.id===c?.guardId);check(S.stats.kills===1&&!c.g,'lethal fixture');V.people.render(0);check(V.people.actors.get(g).driver.root.visible,'lethal corpse vanished');G.actCarry({k:'carry',c});for(let i=0;i<120&&!P.bodyAnim;i++)tick(1);check(P.bodyAnim?.k==='lift','lift missing');const A=P.bodyAnim,ys=[];for(const p of [0,.25,.5,.75,1]){S.t=A.t0+A.dur*p;V.people.render(0);const a=V.people.actors.get(g);ys.push(a.rig.bones.Hips.getWorldPosition(V.people.player.driver.root.position.clone()).y);check(a.rig.model.parent===V.people.player.driver.partner.parent,'body detached');}check(Math.max(...ys)-Math.min(...ys)>.5,'lift skipped');tick(40);V.people.render(0);check(P.carrying&&!P.bodyAnim,'lift not completed');Object.assign(P,{x:5.5*48,y:17.5*48});tick(2);G.actCarry({k:'carry',c});for(let i=0;i<120&&!P.bodyAnim;i++)tick(1);check(P.bodyAnim?.k==='drop','drop missing');tick(45);V.people.render(0);check(!P.carrying&&!P.bodyAnim&&V.people.actors.get(g).driver.root.visible,'drop missing body');return{lethalCorpse:true,liftHips:ys,drop:true};}'''));await b.close()
 s.shutdown()
asyncio.run(main())
