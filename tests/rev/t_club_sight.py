"""Quiet guards expose a depth-tested, wall-clipped field before alerting."""
import asyncio,importlib.util,threading,json
from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).with_name('t_club_study.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=s.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear()');await pg.goto(f'http://127.0.0.1:{s.server_port}/build/club-study/index.html?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100);await pg.add_style_tag(content='*{animation:none!important;transition:none!important}')
   result=await pg.evaluate('''()=>{const G=__game,S=G.S,P=S.player,V=__clubView,g=S.guards.find(g=>g.tag==='doorGuard'),check=(v,m)=>{if(!v)throw Error(m)};S.alevel=0;Object.assign(P,{x:7.5*48,y:15*48,fl:0,z:0,cover:null,mode:'walk'});Object.assign(g,{x:7.5*48,y:13*48,fl:0,z:0,a:Math.PI/2,state:'PATROL',meter:0,seen:false,doomed:false,climb:null});g._cone=null;S.t+=1;V.world.update();V.sight.update();const e=V.sight.entries.get(g);check(e.mesh.visible&&e.cells.length>0,'quiet field absent');check(e.mesh.material.depthTest&&!e.mesh.material.depthWrite,'field overlays roofs');check(e.phase!=='seen'&&e.mesh.material.color.getHexString()!=='cb7864','quiet guard shown red');P.fl=1;V.world.update();V.sight.update();check(!e.mesh.visible,'other-floor cone visible');P.fl=0;
   Object.assign(P,{x:10.5*48,y:5.5*48});Object.assign(g,{x:10.5*48,y:6.5*48,a:-Math.PI/2});g._cone=null;S.t+=1;G.setLayer(0);V.world.update();V.sight.update();const straight=()=>e.cells.filter(c=>Math.abs(c.angle)<.04).map(c=>c.to),closed=Math.max(...straight()),door=S.doors.find(d=>d.tx===10&&d.ty===4);check(door.locked,'door fixture not closed');check(closed<100,'field crosses closed wall/door '+JSON.stringify({closed,angle:g.a,cells:e.cells.filter(c=>Math.abs(c.angle)<.04),restore:G.layer}));G.doAct({k:'door',d:door});for(let i=0;i<40;i++){S.t+=1/60;G.updatePlayer(1/60)}check(!door.locked,'door did not open');g._cone=null;V.world.update();V.sight.update();const open=Math.max(...straight());check(open>closed+30,'opening door does not expose sight');
   P.mode='sneak';g._cone=null;V.world.update();V.sight.update();let samples=0;G.setLayer(0);for(const c of e.cells){const d=(c.from+c.to)/2,a=g.a+c.angle,x=g.x+Math.cos(a)*d,y=g.y+Math.sin(a)*d;check(G.canSee(g,x,y,G.lightAtG(x,y,0),false,true,0)>0,'crouch display disagrees with detection');samples++;}check(samples>0,'empty crouch field');
   Object.assign(P,{x:5.5*48,y:18.5*48,mode:'walk'});Object.assign(g,{x:7.5*48,y:17.5*48,a:Math.PI,state:'PATROL',meter:0,seen:false});g._cone=null;for(let i=0;i<25;i++){S.t+=.1;V.world.update()}S.t=-100;G.benchDraw(1);return{closed,open,crouchSamples:samples,quietField:true,depthTest:true,wrongFloorHidden:true};}''');assert not errors,errors;results.append({'touch':touch,**result});await pg.screenshot(animations='disabled',timeout=90000,path=str(m.O/f'sight-v129-{"mobile"if touch else"pc"}.png'));print('PASS',touch,result,flush=True);await pg.close()
  await b.close()
 (m.O/'sight-v129.json').write_text(json.dumps(results,indent=2));s.shutdown()
if __name__=='__main__':asyncio.run(main())
