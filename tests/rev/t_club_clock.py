"""10/5 fps presentation must not slow the simulation or skip collision steps."""
import asyncio,importlib.util,json,threading
from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).with_name('t_club_study.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=s.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear()');await pg.goto(f'http://127.0.0.1:{s.server_port}/build/club-study/index.html?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100)
  result=await pg.evaluate('''()=>{const G=__game,S=G.S,P=S.player,check=(v,m)=>{if(!v)throw Error(m)},rows=[];S.guards=[];G.input.walkLock=false;G.input.sneakToggle=false;G.input.joy=null;
   const reset=()=>{Object.assign(P,{x:5.5*48,y:18.5*48,fl:0,z:0,vx:0,vy:0,a:0,trav:null,bodyAnim:null,jump:null,hide:null,cover:null,snap:null,interact:null,pick:null,strikeT:0,hurtT:0,captive:null,carrying:null,ledge:null,wire:null,mode:'walk'});S.t=0;S.hitStop=0;S.keys={ArrowRight:true};G.setLayer(0)};
   for(const fps of [60,30,10,5]){reset();for(let i=0;i<fps;i++)G.advanceGameFrame(1/fps);rows.push({fps,time:S.t,x:P.x,y:P.y});check(Math.abs(S.t-1)<.00001,'lost game time at '+fps);}
   const r=rows[0];for(const o of rows)check(Math.hypot(o.x-r.x,o.y-r.y)<.01,'low FPS changes movement');reset();G.advanceGameFrame(8);check(Math.abs(S.t-.25)<.00001,'long stall was replayed');const time=S.t;window.dispatchEvent(new Event('blur'));G.advanceGameFrame(.2);check(S.t===time,'blur pause advances game');window.dispatchEvent(new Event('focus'));G.toggleTactical();G.advanceGameFrame(.2);check(S.t===time,'tactical pause advances game');G.toggleTactical();return{rows,stallClamped:true,blurPaused:true,tacticalPaused:true};}''');assert not errors,errors;print('PASS',json.dumps(result),flush=True);(m.O/'clock-v129.json').write_text(json.dumps(result,indent=2));await b.close()
 s.shutdown()
if __name__=='__main__':asyncio.run(main())
