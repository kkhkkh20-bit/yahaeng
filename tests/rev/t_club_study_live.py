"""Native browser-frame route recording; separate from accelerated rule validation."""
import asyncio,re,importlib.util,json,threading
from pathlib import Path
from http.server import ThreadingHTTPServer
from functools import partial
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).with_name('t_club_study.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
D=m.DRIVER
start=D.index('const render=');end=D.index('const idle=',start)
D=D[:start]+"const render=()=>{};const tick=async(n=1)=>{const end=S.t+n/60;while(S.t<end){if(S.over)break;await new Promise(r=>requestAnimationFrame(r));check(!S.over||S.exitOpen&&document.getElementById('endTitle').textContent==='임무 완료','player died');}};\n"+D[end:]
D=D.replace('()=>{','async()=>{',1)
# Native frames vary in duration; stop within a quarter tile instead of oscillating
# around a three-pixel target on software rendering.
D=D.replace(')>3&&',')>13&&')
for name in ['idle','key','act','walk']:
 D=D.replace('const '+name+'=', 'const '+name+'=async')
D=re.sub(r'=async([a-zA-Z_$][\w$]*)=>',r'=async \1=>',D)
D=re.sub(r'\b(tick|idle|key|act|walk)\(',r'await \1(',D)
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=server.serve_forever,daemon=True).start();out=m.O;(out/'video').mkdir(exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);ctx=await b.new_context(viewport={'width':960,'height':720},record_video_dir=str(out/'video'),record_video_size={'width':960,'height':720});pg=await ctx.new_page();errors=[];pg.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR',str(e),flush=True)));await pg.add_init_script('localStorage.clear();let seed=128;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await pg.goto(f'http://127.0.0.1:{server.server_port}/build/club-study/index.html?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000)
  # Native keyboard input: screen right must move right; camera follows smoothly.
  at=await pg.evaluate('({x:__game.S.player.x,y:__game.S.player.y})');await pg.keyboard.down('ArrowRight');await pg.wait_for_timeout(600);await pg.keyboard.up('ArrowRight');after=await pg.evaluate('({x:__game.S.player.x,y:__game.S.player.y})');assert after['x']>at['x'] and after['y']<at['y'],[at,after];print('PASS actual keyboard projection',flush=True)
  # Restart the same stage, then run the complete route on native requestAnimationFrame.
  await pg.evaluate('__game.start(__game.STAGES.findIndex(s=>s.artSlice));while(__game.DLG.modal)__game.advanceDialog()');print('restarted',flush=True);await pg.wait_for_function('__clubView.ready',polling=100,timeout=20000);await pg.wait_for_timeout(200);print('ready',flush=True);await pg.evaluate('()=>{const V=__clubView;V.renderer.setPixelRatio(.65);V.renderer.setSize(innerWidth,innerHeight,false);V.scene.traverse(o=>{if(o.isLight&&o.castShadow){o.shadow.mapSize.set(384,384);o.shadow.map?.dispose();o.shadow.map=null;}})}');await pg.evaluate(D);print('driver: cloud software GPU, DPR .65 / shadow 384',flush=True)
  steps=[('grab',"await walk(7,12);check(G.grabAction().k==='grab','rear grapple absent');await key('KeyC');await idle();check(P.captive,'grab fails');await tick(70)"),('ko',"await key('KeyZ',4);await idle();check(S.stats.ko===1,'KO fails')"),('uniform',"await act(G.envChoices().find(a=>a.k==='dress'));check(P.outfit==='crew','uniform fails');await tick(20)"),('carry',"await act(G.envChoices().find(a=>a.k==='carry'));await walk(6,8)"),('stash',"await act(G.envChoices().find(a=>a.k==='carry'&&a.h));check(S.corpses[0].stashed,'stash fails')"),('bin',"await act(G.envChoices().find(a=>a.k==='hide'));G.leaveHide({x:0,y:1});await idle()"),('interior',"await walk(10,3);await walk(10,6)"),('locker',"await walk(10,8);await act(G.envChoices().find(a=>a.k==='hide'&&a.h.type==='locker'));G.leaveHide({x:0,y:1});await idle()"),('stairs',"const l=S.ladders.find(l=>l.kind==='fstair'),lo=G.stairFloor(l.tx,l.ty,0);await walk(Math.floor(lo.up.entry.x/48),Math.floor(lo.up.entry.y/48));G.doAct({k:'up',l});await idle();check(P.fl===1,'stairs fails')"),('office',"await walk(13,8,1);await key('KeyC');await idle();await key('KeyZ',4);await idle();check(S.stats.ko===2,'office fails')"),('ledger',"const it=S.items[0];await walk(Math.floor(it.x/48),Math.floor(it.y/48),1);await act(G.envChoices().find(a=>a.k==='loot'&&a.it===it));check(S.exitOpen,'loot fails')"),('return',"const l=S.ladders.find(l=>l.kind==='fstair'),up=G.stairFloor(l.tx,l.ty,1);await walk(Math.floor(up.down.entry.x/48),Math.floor(up.down.entry.y/48),1);if(P.fl===1){G.doAct({k:'fdown',l});await idle();}await walk(10,3);await walk(3,19);check(S.over&&P.hp>0&&document.getElementById('endTitle').textContent==='임무 완료','extraction fails')")]
  async def monitor():
   while True:
    await asyncio.sleep(8)
    print('STATE',await pg.evaluate('({t:__game.S.t,at:[__game.S.player.x/48,__game.S.player.y/48],ready:__clubView.ready,dlg:__game.DLG.modal,joy:__game.input.joy,world:__game.STAGE.id,over:__game.S.over,ui:[...document.querySelectorAll("#intro,#brief,#pause,#dlg")].map(e=>[e.id,e.hidden])})'),flush=True)
  watching=asyncio.create_task(monitor())
  try:
   for name,code in steps:
    await pg.evaluate('async()=>{const {G,S,P,V,walk,tick,idle,act,key,check}=play;'+code+'}');print('PASS native',name,flush=True)
    if name in ['carry','interior','ledger']:await pg.screenshot(path=str(out/f'native-{name}.png'))
   result=await pg.evaluate('({t:__game.S.t,hp:__game.S.player.hp,title:document.getElementById("endTitle").textContent,contacts:__clubView.contactTrace,metrics:__clubView.metrics})');(out/'native-result.json').write_text(json.dumps({'result':result,'errors':errors},ensure_ascii=False,indent=2));assert not errors,errors
  except:await pg.screenshot(path=str(out/'native-failure.png'));raise
  finally:watching.cancel();await ctx.close();await b.close()
 server.shutdown()
if __name__=='__main__':asyncio.run(main())
