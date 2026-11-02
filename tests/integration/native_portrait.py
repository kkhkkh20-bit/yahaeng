"""Native portrait-frame review of the episode's bush/prop/meal route, with live AI.
Software WebGL capture at reduced DPR is not a phone performance measurement.
"""
import asyncio,importlib.util,threading,json
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];sp=importlib.util.spec_from_file_location('live',R/'tests/rev/t_club_study_live.py');live=importlib.util.module_from_spec(sp);sp.loader.exec_module(live);m=live.m
O=R/'build/integration-validation';(O/'video').mkdir(parents=True,exist_ok=True)
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(R)));threading.Thread(target=s.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);ctx=await b.new_context(viewport={'width':390,'height':844},has_touch=True,record_video_dir=str(O/'video'),record_video_size={'width':390,'height':844});pg=await ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear();let seed=128;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await pg.goto(f'http://127.0.0.1:{s.server_port}/build/episode-one/?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.tap('#btnBrGo');await pg.evaluate("()=>{window.__MOBILE_TEST__=true;const V=__clubView;V.renderer.setPixelRatio(.75);V.renderer.setSize(innerWidth,innerHeight,false);V.scene.traverse(o=>{if(o.isLight&&o.castShadow){o.shadow.mapSize.set(512,512);o.shadow.map?.dispose();o.shadow.map=null;}})}");await pg.evaluate(live.D)
  steps=[('bush',"await walk(7,12);await act(G.envChoices().find(a=>a.k==='hide'&&a.h.type==='bush'));check(P.hide?.type==='bush'&&P.hidden,'native bush entry fails')"),('bush-exit',"await key('ArrowRight');await idle();check(!P.hide,'native direction exit fails')"),('supplies',"await walk(5,10);await walk(3,6);check(G.envAction().p?.outfit==='waiter','default apron action absent');await act(G.envAction());check(G.envAction().p?.id==='laxative','default next prop absent');await act(G.envAction());check(P.item?.id==='laxative'&&P.outfit==='waiter','native supplies fail')"),('meal',"await walk(3,9);check(G.envAction().k==='use','native meal action absent');await act(G.envAction());await walk(5,9);check(S.usesDone[0],'native meal not dosed')"),('bathroom',"let n=0;while(!S.dining?.arrived&&n++<60)await tick(60);check(n<60,'native guest does not arrive');await walk(3,5);check(G.grabAction().g?.tag==='mealGuest','native rear grab absent')")]
  for name,code in steps:
   try:r=await pg.evaluate('async()=>{const {G,S,P,V,walk,tick,idle,act,key,check}=play;'+code+';return{t:S.t,hp:P.hp,alarm:S.alevel,at:[P.x/48,P.y/48,P.fl||0],dining:S.dining?.phase};}')
   except Exception:await pg.screenshot(path=str(O/'native-portrait-failure.png'));raise
   results.append({'case':name,**r});print('PASS native portrait',name,r,flush=True);await pg.screenshot(path=str(O/f'native-portrait-{name}.png'))
  assert not errors,errors;video=pg.video;await ctx.close();path=await video.path();(O/'native-portrait.json').write_text(json.dumps({'cases':results,'errors':errors,'video':str(path),'note':'Native browser frames, live AI, DPR .75 / shadow 512, software GPU; not real-device FPS.'},ensure_ascii=False,indent=2));await b.close()
 s.shutdown()
if __name__=='__main__':asyncio.run(main())
