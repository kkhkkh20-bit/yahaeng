"""Clear the authored episode with live AI and real input handlers.

staff: PC, read/code/stairs, kill then ledger.
window: touch buttons, manhole transfer/window, KO/finish target then ledger.
duct: PC, vent bypass, kill/ledger, window extraction.
Accelerated fixed simulation steps validate rules, not real-device frame rate.
"""
import asyncio,importlib.util,json,threading,sys
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('route',str(HERE.parent/'rev'/'t_club_study.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
spec2=importlib.util.spec_from_file_location('passages',str(HERE.parent/'rev'/'t_club_passages.py'));pmod=importlib.util.module_from_spec(spec2);spec2.loader.exec_module(pmod)
O=m.R/'build/episode-validation';O.mkdir(exist_ok=True)
MODE=sys.argv[1]if len(sys.argv)>1 else 'staff';MOBILE=MODE=='window'
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  browser=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);page=await browser.new_page(viewport={'width':390 if MOBILE else 1280,'height':844 if MOBILE else 800},has_touch=MOBILE);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script('localStorage.clear();let seed=128;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await page.goto(f'http://127.0.0.1:{server.server_port}/build/episode-one/index.html?nostats');await page.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await page.evaluate('window.__clubError');assert await page.locator('#brief').is_visible();assert await page.locator('#brName').inner_text()=='마지막 정산'
  await page.evaluate('window.requestAnimationFrame=()=>0');await page.wait_for_timeout(100);await page.add_style_tag(content='*{animation:none!important;transition:none!important}');await page.screenshot(path=str(O/f'{MODE}-brief.png'),timeout=90000)
  if MOBILE:await page.tap('#btnBrGo')
  else:await page.click('#btnBrGo')
  await page.evaluate('window.__MOBILE_TEST__='+str(MOBILE).lower());await page.evaluate(m.DRIVER);await page.evaluate(pmod.EXTRA)
  async def step(label,code,shot=True):
   print('STEP',MODE,label,flush=True)
   try:
    result=await page.evaluate('()=>{const {G,S,P,V,walk,key,tick,idle,render,check,act,tunnel,stop}=play;'+code+';G.updateHUD();render();return{t:S.t,hp:P.hp,alarm:S.alevel,at:[P.x/48,P.y/48,P.fl||0],kills:S.stats.kills,ko:S.stats.ko,items:S.items.map(it=>it.got),exit:S.exitOpen};}')
   except Exception:
    print('STATE',await page.evaluate('({trace,at:[play.P.x/48,play.P.y/48,play.P.fl],hp:play.P.hp,guards:play.S.guards.map(g=>[g.tag,g.state,g.x/48,g.y/48,g.fl]),actions:play.G.envChoices().map(a=>[a.k,a.label])})'),flush=True);await page.screenshot(path=str(O/f'{MODE}-failure.png'),timeout=90000);raise
   results.append({'case':label,**result});print('PASS',label,result,flush=True)
   if shot:await page.screenshot(path=str(O/f'{MODE}-{label}.png'),timeout=90000)
  await step('entry',"check(G.STAGE.episode&&G.STAGE.id==='lastSettlement','wrong stage');check(S.guards.find(g=>g.target).fl===1,'target floor');check(V.people.actors.get(S.guards.find(g=>g.target)).name==='suit','target not in suit');const n=S.notes[0],o=V.world.notes[0];check(n.surface?.t==='desk'&&o.at.y>.8&&o.at.y<1,'note is on floor');check(!o.mesh.visible,'note leaks through building');check(!S.exitOpen,'exit open before goals');tick(2)")
  await step('interrogation',"walk(7,12);check(G.grabAction().k==='grab','grab absent');key('KeyC');idle();check(P.captive,'grab failed');tick(230);check(P.keys.code&&S.learned.some(s=>s.includes('4816')),'interrogation code absent');check(P.captive.say||S.stats.interro,'no interrogation response');key('KeyZ',4);idle();check(S.stats.ko===1&&S.stats.kills===0,'tap should KO');act(G.envChoices().find(a=>a.k==='dress'));check(P.outfit==='crew','disguise failed')")
  await step('stash',"act(G.envChoices().find(a=>a.k==='carry'));walk(6,8);act(G.envChoices().find(a=>a.k==='carry'&&a.h));check(!P.carrying&&S.corpses[0].stashed,'stash failed')",False)
  if MODE=='staff':
   await step('desk-note',"walk(13,16);walk(13,14);const n=S.notes[0];walk(Math.floor(n.x/48),Math.floor(n.y/48));act(G.envChoices().find(a=>a.k==='read'));check(G.DLG.modal,'note dialog absent');while(G.DLG.modal)G.advanceDialog();check(n.read,'note unread');check(V.world.notes[0].mesh.visible,'desk note not visible')")
   await step('keypad-open',"walk(14,9);check(G.envAction().k==='keypad','keypad prompt obstructed');act(G.envChoices().find(a=>a.k==='keypad'));check(S.keypad,'keypad not open')",False)
   # The actual keyboard handler and HTML keypad buttons, not setting keys/door state.
   await page.keyboard.type('0000');await step('wrong-code',"check(S.keypad.bad===1&&S.keypad.d.locked,'wrong code opened door')",False)
   for digit in '4816':await page.locator('#keypad [data-k="'+digit+'"]').click()
   await step('code-accepted',"tick(30);check(!S.keypad&&!S.doors.find(d=>d.tx===14&&d.ty===8).locked,'correct code failed')",False)
   await step('stairs',"const l=S.ladders.find(l=>l.kind==='fstair'),e=G.stairFloor(l.tx,l.ty,0).up.entry;walk(Math.floor(e.x/48),Math.floor(e.y/48));if(!P.fl){G.doAct({k:'up',l});idle();}check(P.fl===1,'stairs failed');walk(13,6,1)")
  elif MODE=='window':
   await step('sewer',"walk(6,19);act(G.envChoices().find(a=>a.k==='hide'&&a.h.type==='well'));act(G.envChoices().find(a=>a.k==='tunnel'));check(P.under,'sewer entry failed');tunnel('sewer',6,3);act(G.envChoices().find(a=>a.k==='surface'));check(!P.under,'sewer exit failed')")
   await step('window-entry',"const w=S.fwindows.find(w=>w.tx===13&&w.ty===4);check(w.st==='open'&&w.out&&w.inn,'authored window unavailable');walk(Math.floor(w.out.x/48),Math.floor(w.out.y/48));act(G.envChoices().find(a=>a.k==='winClimb'&&a.w===w));check(P.fl===1,'window does not reach 2F');walk(13,6,1)")
  else:
   await step('duct-bypass',"walk(7,5);act(G.envChoices().find(a=>a.k==='ventIn'&&a.v.street));check(P.vent,'duct entry failed');tunnel('duct',9,5);act(G.envChoices().find(a=>a.k==='ventOut'));check(!P.vent&&S.doors.find(d=>d.tx===14&&d.ty===8).locked,'bypass depends on keypad');const l=S.ladders.find(l=>l.kind==='fstair'),e=G.stairFloor(l.tx,l.ty,0).up.entry;walk(Math.floor(e.x/48),Math.floor(e.y/48));if(!P.fl){G.doAct({k:'up',l});idle();}check(P.fl===1,'bypass cannot reach office');walk(13,6,1)")
  await step('target',"const t=S.guards.find(g=>g.target);let n=0;while(G.attackAction().g!==t&&!(G.attackAction().list||[]).includes(t)&&n++<2400)tick();check(n<2400,'routine never permits attack');key('KeyZ',"+('4'if MOBILE else'85')+");idle();check("+('!G.targetEliminated(t)&&!S.exitOpen'if MOBILE else'G.targetEliminated(t)&&!S.exitOpen')+",'KO/kill objective wrong')")
  if MOBILE:await step('finish-target',"const t=S.guards.find(g=>g.target);check(S.corpses.some(c=>c.target&&c.ko),'KO target body absent');key('KeyZ',85);idle();check(G.targetEliminated(t)&&!S.exitOpen,'held finish failed')")
  await step('ledger',"const it=S.items[0];walk(Math.floor(it.x/48),Math.floor(it.y/48),1);act(G.envChoices().find(a=>a.k==='loot'));check(it.got&&S.exitOpen,'ledger or objectives failed')")
  if MODE=='staff':
   await step('descent',"const l=S.ladders.find(l=>l.kind==='fstair'),e=G.stairFloor(l.tx,l.ty,1).down.entry;walk(Math.floor(e.x/48),Math.floor(e.y/48),1);if(P.fl){G.doAct({k:'fdown',l});idle();}check(!P.fl,'descent failed');walk(14,9);check(!P.fl&&!P.trav,'forced back upstairs');walk(13,16)")
  else:
   await step('window-exit',"const w=S.fwindows.find(w=>w.tx===13&&w.ty===4);walk(Math.floor(w.inn.x/48),Math.floor(w.inn.y/48),1);act(G.envChoices().find(a=>a.k==='winDrop'&&a.w===w));check(!P.fl&&!P.trav,'window descent failed')")
  await step('extraction',"walk(3,19);tick(40);check(S.over&&S.exitOpen&&P.hp>0,'did not finish')")
  await page.wait_for_function('!document.getElementById("end").hidden',polling=100);assert await page.locator('#endTitle').inner_text()=='임무 완료';await page.screenshot(path=str(O/f'{MODE}-complete.png'),timeout=90000)
  # A failed run retries this same episode; the menu returns to this briefing.
  await page.click('#btnRetry');await page.evaluate('__game.benchDraw(1)');await page.evaluate('__clubView.readyForScene()');assert await page.evaluate('__game.STAGE.episode&&!__game.S.over&&!__game.S.items[0].got');await page.evaluate('__game.endGame(false,"검수용 실패")');await page.wait_for_function('!document.getElementById("end").hidden',polling=100);await page.click('#btnMenu');await page.evaluate('__game.benchDraw(1)');await page.evaluate('__clubView.readyForScene()');assert await page.locator('#brief').is_visible();assert await page.evaluate('__game.STAGE.id')=='lastSettlement';assert not errors,errors
  (O/f'{MODE}.json').write_text(json.dumps({'route':MODE,'touch':MOBILE,'cases':results,'errors':errors,'note':'Live AI with fixed simulation steps; not a device FPS benchmark.'},ensure_ascii=False,indent=2));await browser.close()
 server.shutdown()
if __name__=='__main__':asyncio.run(main())
