"""Verify the packaged 2D release and native browser-frame input at a public URL."""
import asyncio,hashlib,json,os,re,sys
from pathlib import Path
import httpx
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-validation';O.mkdir(exist_ok=True)
BASE=sys.argv[1].rstrip('/')+'/'
NAME=sys.argv[2]if len(sys.argv)>2 else 'live'
PLAIN='--plain' in sys.argv
async def main():
 result={'base':BASE,'files':{},'browsers':[]};release=(R/'VERSION').read_text().strip()
 async with httpx.AsyncClient(timeout=90,follow_redirects=True)as client:
  for name in ['index.html','version.json',*re.findall(r'<script defer src="\./([^\"]+)"',(R/'public/index.html').read_text())]:
   data=(await client.get(BASE+(''if PLAIN and name=='index.html'else name)+(''if PLAIN else '?verify='+release))).raise_for_status().content;digest=hashlib.sha256(data).hexdigest();assert digest==hashlib.sha256((R/'public'/name).read_bytes()).hexdigest(),name;result['files'][name]=digest
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for mobile in [False,True]:
   page=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda q:requests.append(q.url));await page.add_init_script('localStorage.clear()');await page.goto(BASE+(''if PLAIN else '?v='+release+'&nostats'),timeout=120000);await page.wait_for_function('window.__boot?.state.ready',timeout=120000);assert await page.evaluate('window.__BUILD_VERSION__')==release
   assert not await page.evaluate('!!window.__CLUB_STUDY__||!!window.__EPISODE_ONE__||!!window.__clubView');assert not any('.glb' in q or '/three.'in q or '/view.js'in q for q in requests)
   if mobile:await page.tap('#btnQuick')
   else:await page.click('#btnQuick')
   assert await page.evaluate('__game.STAGE.id')=='tB';before=await page.evaluate('[__game.S.player.x,__game.S.player.y]')
   if mobile:
    cdp=await page.context.new_cdp_session(page);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':520}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':110,'y':520}]});await page.wait_for_timeout(650);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await page.keyboard.down('ArrowRight');await page.wait_for_timeout(650);await page.keyboard.up('ArrowRight')
   after=await page.evaluate('[__game.S.player.x,__game.S.player.y]');assert after[0]>before[0]+10,(before,after)
   if mobile:await page.tap('#btnCrouch')
   else:await page.keyboard.press('Control')
   assert await page.evaluate('__game.input.sneakToggle')
   await page.locator('#hud .obj').click();assert await page.evaluate('__game.hudInspecting()');inspect_time=await page.evaluate('__game.S.t');await page.wait_for_timeout(350);assert await page.evaluate('__game.S.t')==inspect_time,'live objective panel does not pause game time';await page.locator('#hud .obj').click();await page.wait_for_timeout(150);assert await page.evaluate('__game.S.t')>inspect_time,'live objective panel does not resume game time'
   await page.click('#btnPause');assert await page.locator('#pause').is_visible();await page.click('#btnMenu2');assert await page.locator('#ledger').is_visible();await page.locator('.ledger-tabs [data-filter="training"]').click();i=await page.evaluate('__game.STAGES.findIndex(s=>s.id==="tB")');await page.locator('[data-i="'+str(i)+'"]').click();assert await page.evaluate('__game.STAGE.id')=='tB'
   await page.wait_for_timeout(300);await page.screenshot(path=str(O/f'{NAME}-{"touch"if mobile else"pc"}.png'));assert not errors,errors
   info={'mobile':mobile,'before':before,'after':after,'version':release,'stage':'tB','errors':errors,'threeDRequests':False,'objectivePauseAndResume':True};result['browsers'].append(info);print('PASS native 2D',info,flush=True);await page.close()
  await b.close()
 (O/f'{NAME}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS packaged hashes',len(result['files']),BASE,flush=True)
if __name__=='__main__':asyncio.run(main())
