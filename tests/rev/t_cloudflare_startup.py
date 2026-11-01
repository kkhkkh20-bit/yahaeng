"""Cold-start menu, deferred download failures and actual play entry on static 2D build."""
import asyncio,json,os,sys,time
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/boot-validation';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
async def main():
 results=[]
 async with async_playwright()as p:
  engines=[('chromium',False),('chromium',True)]+([]if os.environ.get('STARTUP_CHROMIUM_ONLY')else[('firefox',False)])
  if os.environ.get('TEST_WEBKIT'):engines.append(('webkit',True))
  for engine,mobile in engines:
   args={'proxy':{'server':os.environ['HTTPS_PROXY']}}if BASE.startswith('https')else{}
   b=await getattr(p,engine).launch(**args);ctx=await b.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);pg=await ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script("localStorage.clear();if(location.search.includes('nodecode'))HTMLImageElement.prototype.decode=undefined");await pg.goto(BASE+'?nodecode',wait_until='domcontentloaded',timeout=90000);await pg.wait_for_function('window.__game&&window.__boot.state.ready',timeout=30000);await pg.locator('#btnHelp').click();assert await pg.locator('#help').is_visible();await pg.locator('#btnHelpBack').click();await pg.locator('#btnLedger').click();assert await pg.locator('#ledger').is_visible();assert await pg.locator('#stageList button').count()>=6;await pg.locator('#btnLedgerBack').click();await pg.locator('#btnQuick').click();await pg.wait_for_function('!document.getElementById("hud").hidden&&!document.getElementById("game").hidden');await pg.evaluate('()=>{while(__game.DLG.modal)__game.advanceDialog()}');before=await pg.evaluate('[__game.S.player.x,__game.S.player.y]');await pg.keyboard.down('ArrowRight');await pg.wait_for_timeout(700);await pg.keyboard.up('ArrowRight');after=await pg.evaluate('[__game.S.player.x,__game.S.player.y]');assert after[0]>before[0]+5,[before,after];await pg.screenshot(path=str(O/f'{engine}-{mobile}-play.png'),timeout=60000);assert not errors,errors;results.append({'engine':engine,'mobile':mobile,'ready':True,'settings':True,'contracts':True,'start':True});print('PASS',results[-1],flush=True);await ctx.close();await b.close()
  # Keep the engine download pending: settings works now, and a start click queues once.
  b=await p.chromium.launch(**({'proxy':{'server':os.environ['HTTPS_PROXY']}}if BASE.startswith('https')else{}));ctx=await b.new_context();pg=await ctx.new_page();gate=asyncio.Event()
  async def delay(route):
   if route.request.url.endswith('.js'):await gate.wait()
   await route.continue_()
  await pg.route('**/assets/*.js',delay);await pg.goto(BASE,wait_until='commit');await pg.locator('#btnHelp').click();assert await pg.locator('#help').is_visible();await pg.locator('#btnHelpBack').click();await pg.locator('#btnQuick').click();assert await pg.evaluate('__boot.state.queued==="btnQuick"&&!__boot.state.ready');gate.set();await pg.wait_for_function('window.__game&&__boot.state.ready&&!document.getElementById("hud").hidden',timeout=30000);results.append({'delayedDownload':'settings responsive, start queued and opened'});print('PASS delayed download',flush=True);await ctx.close()
  ctx=await b.new_context();pg=await ctx.new_page();await pg.route('**/assets/*.js',lambda route:route.abort());await pg.goto(BASE,wait_until='domcontentloaded');await pg.wait_for_function('__boot.state.failed');assert await pg.locator('#bootStatus a').is_visible();await pg.locator('#btnHelp').click();assert await pg.locator('#help').is_visible();results.append({'failedDownload':'retry link and settings available'});print('PASS failed download',flush=True);await b.close()
 (O/'result.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
if __name__=='__main__':asyncio.run(main())
