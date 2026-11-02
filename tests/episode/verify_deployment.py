"""HTTPS deployment smoke: exact files, native PC/touch movement and menu flow.
Run after Pages deploys. It does not report software GPU timing as phone FPS.
"""
import asyncio,hashlib,json,os,sys
from pathlib import Path
import httpx
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/episode-validation';O.mkdir(exist_ok=True)
BASE=(sys.argv[1]if len(sys.argv)>1 else 'https://kkhkkh20-bit.github.io/yahaeng/episode-one/').rstrip('/')+'/'
RELEASE=(R/'VERSION').read_text().strip()
async def main():
 result={'base':BASE,'files':{},'browsers':[]}
 async with httpx.AsyncClient(timeout=90,follow_redirects=True)as client:
  for file in [R/'build/episode-one/index.html',*sorted((R/'build/episode-one').glob('*.js'))]:
   data=(await client.get(BASE+file.name+'?verify='+RELEASE)).raise_for_status().content
   digest=hashlib.sha256(data).hexdigest();assert digest==hashlib.sha256(file.read_bytes()).hexdigest(),file.name;result['files'][file.name]=digest
  result['cloudflareVersion']=(await client.get('https://yahaeng.kkhkkh-20.workers.dev/version.json')).raise_for_status().json()
 async with async_playwright()as p:
  browser=await p.chromium.launch(args=['--enable-unsafe-swiftshader'],proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for mobile in [False,True]:
   page=await browser.new_page(viewport={'width':390 if mobile else 1000,'height':844 if mobile else 740},has_touch=mobile);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.add_init_script('localStorage.clear()');await page.goto(BASE+'?v='+RELEASE+'&nostats',timeout=120000);await page.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await page.evaluate('window.__clubError');assert await page.evaluate('window.__BUILD_VERSION__')==RELEASE;assert await page.locator('#brief').is_visible();await page.keyboard.press('Escape');assert await page.locator('#brief').is_visible()
   if mobile:await page.tap('#btnBrGo')
   else:await page.click('#btnBrGo')
   assert not await page.locator('#brief').is_visible()
   before=await page.evaluate('[__game.S.player.x,__game.S.player.y]')
   if mobile:
    cdp=await page.context.new_cdp_session(page);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':520}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':115,'y':520}]});await page.wait_for_timeout(650);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    await page.keyboard.down('ArrowRight');await page.wait_for_timeout(650);await page.keyboard.up('ArrowRight')
   after=await page.evaluate('[__game.S.player.x,__game.S.player.y]');assert after[0]>before[0] and after[1]<before[1],(before,after)
   # Freeze only after verifying actual browser-frame input.
   await page.evaluate('window.requestAnimationFrame=()=>0');await page.wait_for_timeout(150)
   if mobile:await page.tap('#btnPause')
   else:await page.click('#btnPause')
   assert await page.locator('#pause').is_visible();assert '원본 장부' in await page.locator('#missionGoals').inner_text()
   await page.click('#btnMenu2');await page.evaluate('__game.benchDraw(1)');await page.evaluate('__clubView.readyForScene()');assert await page.locator('#brief').is_visible();assert await page.evaluate('__game.STAGE.id')=='lastSettlement'
   await page.add_style_tag(content='*{animation:none!important;transition:none!important}');await page.screenshot(path=str(O/f'live-{"mobile"if mobile else"pc"}.png'),timeout=90000);assert not errors,errors
   info=await page.evaluate('({stage:__game.STAGE.id,version:window.__BUILD_VERSION__,target:__game.targetName(__game.S.guards.find(g=>g.target)),notes:__clubView.world.notes.length,codeDoors:__clubView.world.doors.filter(o=>o.keypads?.length).length,framing:__clubView.framing,occlusion:__clubView.occlusion,metrics:__clubView.metrics})');result['browsers'].append({'mobile':mobile,'before':before,'after':after,**info,'errors':errors});print('PASS live','touch'if mobile else'PC',info,flush=True);await page.close()
  await browser.close()
 (O/'live.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS deployed file hashes',len(result['files']),result['cloudflareVersion'],flush=True)
if __name__=='__main__':asyncio.run(main())
