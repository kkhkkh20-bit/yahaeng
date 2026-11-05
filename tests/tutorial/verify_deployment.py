"""Verify the packaged 2D release and native browser-frame input at a public URL."""
import asyncio,hashlib,json,os,re,sys
from pathlib import Path
import httpx
from playwright.async_api import async_playwright
from browser_support import open_game,get_checked
R=Path(__file__).resolve().parents[2];O=R/'build/tutorial-validation';O.mkdir(exist_ok=True)
BASE=sys.argv[1].rstrip('/')+'/'
NAME=sys.argv[2]if len(sys.argv)>2 else 'live'
PLAIN='--plain' in sys.argv
BROWSER_HASHES='--browser-hashes' in sys.argv
async def main():
 result={'base':BASE,'files':{},'browsers':[]};release=(R/'VERSION').read_text().strip()
 async with httpx.AsyncClient(timeout=90,follow_redirects=True)as client:
  local_html=(R/'public/index.html').read_text();font_files=re.findall(r'\./(assets/[a-f0-9]+\.(?:woff2|woff|ttf))',local_html)
  scripts=re.findall(r'<script defer src="\./([^"]+)"',local_html)
  paths=['index.html','version.json',*scripts,*dict.fromkeys(font_files)]
  for name in ([]if BROWSER_HASHES else paths):
   data=(await get_checked(client,BASE+(''if PLAIN and name=='index.html'else name)+(''if PLAIN else '?verify='+release))).content;digest=hashlib.sha256(data).hexdigest();assert digest==hashlib.sha256((R/'public'/name).read_bytes()).hexdigest(),name;result['files'][name]=digest
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')and os.environ.get('HTTPS_PROXY')else None)
  for mobile in [False,True]:
   page=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda q:requests.append(q.url));await page.add_init_script('localStorage.clear()');await open_game(page,BASE+(''if PLAIN else '?v='+release+'&nostats'));assert await page.evaluate('window.__BUILD_VERSION__')==release
   assert await page.evaluate('document.compatMode==="CSS1Compat"&&document.head.querySelectorAll("meta[name=viewport]").length===1'), 'Release document lacks standards/mobile viewport'
   assert await page.evaluate('Math.abs(innerWidth-'+str(390 if mobile else 1280)+')<2'), 'Mobile layout viewport expanded beyond the device width'
   if BROWSER_HASHES and not result['files']:
    result['hashMethod']='Same-origin browser fetch and WebCrypto SHA256; identical expected local bytes'
    for name in paths:
     digest=await page.evaluate("""async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(r.status+' '+url);const d=await crypto.subtle.digest('SHA-256',await r.arrayBuffer());return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,'0')).join('')}""",BASE+(''if PLAIN and name=='index.html'else name))
     assert digest==hashlib.sha256((R/'public'/name).read_bytes()).hexdigest(),name;result['files'][name]=digest

   assert await page.evaluate('document.fonts.check(\'400 14px "Yahaeng UI"\')'), 'Shared UI face not ready'
   font_cdp=await page.context.new_cdp_session(page);await font_cdp.send('DOM.enable');await font_cdp.send('CSS.enable');root=await font_cdp.send('DOM.getDocument');node=await font_cdp.send('DOM.querySelector',{'nodeId':root['root']['nodeId'],'selector':'#btnLedger'});face=await font_cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']});assert face['fonts']and all(f['isCustomFont']and f['familyName']=='IBM Plex Sans KR'for f in face['fonts']),face
   assert not await page.evaluate('!!window.__CLUB_STUDY__||!!window.__EPISODE_ONE__||!!window.__clubView');assert not any('.glb' in q or '/three.'in q or '/view.js'in q for q in requests)
   if mobile:await page.tap('#btnQuick')
   else:await page.click('#btnQuick')
   assert await page.evaluate('__game.STAGE.id')=='p0';await page.click('#btnBrGo');before=await page.evaluate('[__game.S.player.x,__game.S.player.y]')
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
   info={'mobile':mobile,'before':before,'after':after,'version':release,'stage':'tB','errors':errors,'threeDRequests':False,'objectivePauseAndResume':True,'customUIFont':face};result['browsers'].append(info);print('PASS native 2D',info,flush=True);await page.close()
  await b.close()
 (O/f'{NAME}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS packaged hashes',len(result['files']),BASE,flush=True)
if __name__=='__main__':asyncio.run(main())
