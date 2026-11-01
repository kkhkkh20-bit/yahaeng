"""Projection, real touch input, actor selection, tactical map and comparison fixtures."""
import asyncio,importlib.util,json,threading
from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).with_name('t_club_study.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=s.serve_forever,daemon=True).start();out=m.O;results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear()');await pg.goto(f'http://127.0.0.1:{s.server_port}/build/club-study/index.html?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100);await pg.add_style_tag(content='*{animation:none!important;transition:none!important}')
   if touch:
    c=await pg.context.new_cdp_session(pg);at=await pg.evaluate('[__game.S.player.x,__game.S.player.y]');await c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':520}]});await c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':115,'y':520}]});await pg.evaluate('()=>{if(!__game.input.joy)throw Error("touch joystick absent");for(let i=0;i<18;i++)__game.update(1/60)}');after=await pg.evaluate('[__game.S.player.x,__game.S.player.y]');await c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert after[0]>at[0] and after[1]<at[1],[at,after];print('PASS native CDP touch joystick',at,after,flush=True)
   for fixture in ['entry','interior','office']:
    await pg.evaluate('''f=>{const G=__game,P=G.S.player;if(f==='entry')Object.assign(P,{x:5.5*48,y:18.5*48,fl:0,a:-Math.PI/2});if(f==='interior')Object.assign(P,{x:13.5*48,y:12.5*48,fl:0,a:Math.PI});if(f==='office')Object.assign(P,{x:13.5*48,y:7.5*48,fl:1,a:Math.PI});G.setLayer(P.fl);G.moveCamera(1);G.updateHUD();const now=G.S.t;for(let i=0;i<22;i++){G.S.t+=.1;__clubView.world.update()}G.S.t=-100*(1+['entry','interior','office'].indexOf(f));G.benchDraw(1);G.S.t=now}''',fixture)
    tag='mobile'if touch else'pc';await pg.screenshot(animations='disabled',timeout=90000,path=str(out/f'after-{tag}-{fixture}.png'))
    result=await pg.evaluate('''()=>{const G=__game,V=__clubView,P=G.S.player,s=V.actorScreen(P),w=V.screenToWorld(s.x,s.y);if(Math.hypot(w.x-P.x,w.y-P.y)>.001)throw Error('projection does not invert');if(Math.abs(s.x-innerWidth/2)>1||s.y<innerHeight*.57||s.y>innerHeight*.68)throw Error('hero is outside framing');return{touch:document.body.classList.contains('touch'),frame:[s.x,s.y,innerWidth,innerHeight],metrics:V.metrics}}''');results.append(result)
    if fixture=='entry':
     await pg.evaluate('__game.STAGE.artSlice=false;__game.moveCamera(1);__game.benchDraw(1)');await pg.screenshot(animations='disabled',timeout=90000,path=str(out/f'before-{tag}-{fixture}.png'));await pg.evaluate('__game.STAGE.artSlice=true')
   # Marking must select projected actor, not the former top-down coordinate.
   await pg.evaluate('''()=>{const G=__game,g=G.S.guards.find(g=>g.tag==='officeGuard'),p=__clubView.actorPick(g);document.getElementById('game').dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:p.x,clientY:p.y,bubbles:true}));if(!document.body.classList.contains('touch')&&G.S.marked!==g)throw Error('projected enemy pick fails');G.toggleTactical();if(!G.tactical)throw Error('map does not open');G.benchDraw(1);G.toggleTactical();if(G.tactical)throw Error('map does not close');}''');assert not errors,errors;await pg.close();print('PASS fixtures',touch,flush=True)
  await b.close()
 (out/'fixtures-result.json').write_text(json.dumps(results,indent=2));s.shutdown()
if __name__=='__main__':asyncio.run(main())
