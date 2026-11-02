"""Play the dedicated art slice with live AI; inputs do not grant progress or remove NPCs.
Requires build.py --club, Chromium WebGL, and Playwright. Pass mobile for touch buttons.
The accelerated clock validates rules and paths, not device frame rate.
"""
import asyncio,json,threading,sys
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/club-validation';O.mkdir(exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.html':'text/html; charset=utf-8'}
DRIVER='''()=>{
const G=__game,S=G.S,P=S.player,V=__clubView;let frames=0;window.trace=[];
const check=(v,m)=>{if(!v)throw Error(m+' '+JSON.stringify({t:S.t,hp:P.hp,at:[P.x/48,P.y/48,P.fl],alarm:S.alevel,busy:G.actionBusy(),choices:G.envChoices().map(a=>a.k),trace}))};
const render=()=>{const t=S.t;G.benchDraw(1);S.t=t;};const tick=(n=1)=>{for(let i=0;i<n;i++){if(S.over)break;G.update(1/60);G.updateDialog(1/60);++frames;check(!S.over||S.exitOpen&&document.getElementById('endTitle').textContent==='임무 완료','player died');}};
const idle=()=>{for(let i=0;G.actionBusy()&&i<600;i++)tick();check(!G.actionBusy(),'action never finishes');tick(8);render();};
const key=(code,n=3)=>{const b=window.__MOBILE_TEST__&&document.getElementById(({KeyC:'btnGrab',KeyZ:'btnAct',KeyX:'btnCarry'})[code]);if(b)b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:11,pointerType:'touch',bubbles:true}));else window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));tick(n);if(b)b.dispatchEvent(new PointerEvent('pointerup',{pointerId:11,pointerType:'touch',bubbles:true}));else window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
const drive=(dx,dy)=>{const n=Math.hypot(dx,dy)||1,v=V.groundToScreen?V.groundToScreen(dx,dy):{x:(dx-dy)/Math.SQRT2,y:(dx+dy)/Math.sqrt(6)},x=v.x,y=v.y,m=Math.hypot(x,y)||1;G.input.joy={x:x/m*.55,y:y/m*.55,mag:.55};};
const stop=()=>{G.input.joy=null;};
const act=(a)=>{check(a,'action absent');G.selectEnvTarget(G.envToken(a));key('KeyX');idle();};
const walk=(tx,ty,f=P.fl||0)=>{
 check((P.fl||0)===f,'wrong floor requested');G.setLayer(f);const doors=new Map(S.doors.filter(d=>(d.fl||0)===f).map(d=>[d.tx+','+d.ty,d]));const sol=(x,y)=>G.solidAt(x,y)&&!doors.has(x+','+y);let path=G.astar(Math.floor(P.x/48),Math.floor(P.y/48),tx,ty,sol);check(path.length||Math.floor(P.x/48)===tx&&Math.floor(P.y/48)===ty,'unreachable '+tx+','+ty);
 for(const p of path){if(S.over&&S.exitOpen)break;let attempts=0;while(Math.hypot(P.x-p.x,P.y-p.y)>3&&!S.over&&attempts++<300){
  const d=doors.get(Math.floor(p.x/48)+','+Math.floor(p.y/48));if(d&&d.locked&&Math.hypot(P.x-d.x,P.y-d.y)<59){stop();const a=G.envChoices().find(a=>a.d===d);if(a)act(a);}
  drive(p.x-P.x,p.y-P.y);tick();}check(attempts<300,'blocked walking '+tx+','+ty);
 }stop();tick(2);render();trace.push(['walk',tx,ty,f,+S.t.toFixed(2)]);};
window.play={G,S,P,V,walk,tick,idle,act,key,render,check,stop};}'''
async def main():
 s=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(R)));threading.Thread(target=s.serve_forever,daemon=True).start();mobile=len(sys.argv)>1
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('response',lambda r:print('HTTP',r.status,r.url,flush=True)if r.status>=400 else None);await pg.add_init_script('localStorage.clear();let seed=128;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await pg.goto(f'http://127.0.0.1:{s.server_port}/build/club-study/index.html?nostats');await pg.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await pg.evaluate('window.__clubError');await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(150);await pg.add_style_tag(content='*{animation:none!important;transition:none!important}');await pg.evaluate("window.__MOBILE_TEST__="+str(mobile).lower());await pg.evaluate(DRIVER)
  async def step(label,code):
   print('STEP',label,flush=True)
   try:await pg.evaluate('()=>{const {G,S,P,V,walk,tick,idle,act,key,render,check,stop}=play;'+code+';render();}')
   except Exception:
    await pg.screenshot(animations='disabled',timeout=90000,path=str(O/'failure.png'));print('FAILED',label,await pg.evaluate('({trace,errors:window.__clubError,keys:__game.S.keys,at:[__game.S.player.x/48,__game.S.player.y/48,__game.S.player.fl],interact:__game.S.player.interact})'),flush=True);raise
   await pg.screenshot(animations='disabled',timeout=90000,path=str(O/f'{"mobile"if mobile else"pc"}-{label}.png'));print('PASS',label,await pg.evaluate('({t:__game.S.t,hp:__game.S.player.hp,at:[__game.S.player.x/48,__game.S.player.y/48,__game.S.player.fl],alarm:__game.S.alevel,occlusion:__clubView.occlusion})'),flush=True)
  await step('entry','tick(2)')
  await step('grab',"walk(7,12);check(G.grabAction().k==='grab','rear grapple absent');key('KeyC');idle();check(P.captive,'grapple failed');tick(90);check(P.captive.say,'interrogation silent')")
  await step('ko',"key('KeyZ',4);idle();check(S.corpses.some(c=>c.ko)&&S.stats.kills===0,'tap does not KO')")
  await step('uniform',"act(G.envChoices().find(a=>a.k==='dress'));check(P.outfit==='crew','uniform absent')")
  await step('carry',"act(G.envChoices().find(a=>a.k==='carry'));check(P.carrying,'carry absent');walk(6,8)")
  await step('stash',"act(G.envChoices().find(a=>a.k==='carry'&&a.h));check(!P.carrying&&S.corpses[0].stashed,'stash fails')")
  await step('retrieve',"const h=S.corpses[0].container,c=S.corpses[0];check(G.beginHideFlow('retrieve',h,c),'retrieve rejected');idle();check(!c.stashed&&!c.carried&&!P.carrying&&h.bodies===0,'retrieve occupancy fails');act(G.envChoices().find(a=>a.k==='carry'&&!a.h));act(G.envChoices().find(a=>a.k==='carry'&&a.h));check(c.stashed&&h.bodies===1,'restash fails')")
  await step('bin',"act(G.envChoices().find(a=>a.k==='hide'));check(P.hide,'hide fails');G.leaveHide({x:0,y:1});idle();check(!P.hide,'exit fails')")
  await step('interior',"walk(10,3);walk(10,6);check(G.bldAt(Math.floor(P.x/48),Math.floor(P.y/48))===0,'did not enter')")
  await step('locker',"walk(10,8);act(G.envChoices().find(a=>a.k==='hide'&&a.h.type==='locker'));check(P.hide?.type==='locker','locker entry fails');G.leaveHide({x:0,y:1});idle();check(!P.hide,'locker exit fails')")
  await step('stairs',"const l=S.ladders.find(l=>l.kind==='fstair');const lo=G.stairFloor(l.tx,l.ty,0);walk(Math.floor(lo.up.entry.x/48),Math.floor(lo.up.entry.y/48));G.doAct({k:'up',l});idle();check(P.fl===1,'stair climb fails')")
  await step('office',"walk(13,8,1);check(G.grabAction().k==='grab','office rear grab absent');key('KeyC');idle();key('KeyZ',4);idle();check(S.stats.ko===2&&S.stats.kills===0,'office KO fails')")
  await step('ledger',"const it=S.items[0];walk(Math.floor(it.x/48),Math.floor(it.y/48),1);act(G.envChoices().find(a=>a.k==='loot'&&a.it===it));check(it.got&&S.exitOpen,'ledger/exit fails')")
  await step('return',"const l=S.ladders.find(l=>l.kind==='fstair'),up=G.stairFloor(l.tx,l.ty,1);walk(Math.floor(up.down.entry.x/48),Math.floor(up.down.entry.y/48),1);if(P.fl===1){G.doAct({k:'fdown',l});idle();}check(!P.fl,'stairs down fails');walk(10,3);walk(3,19);tick(40);check(S.over&&S.exitOpen&&P.hp>0&&document.getElementById('endTitle').textContent==='임무 완료','extraction fails')")
  result=await pg.evaluate('({seconds:__game.S.t,hp:__game.S.player.hp,stats:__game.S.stats,metrics:__clubView.metrics,contacts:__clubView.contactTrace,trace})');assert not errors,errors;(O/f'{"mobile"if mobile else"pc"}-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('CLEAR',result['seconds'],result['metrics'],flush=True);await b.close()
 s.shutdown()
if __name__=='__main__':asyncio.run(main())
