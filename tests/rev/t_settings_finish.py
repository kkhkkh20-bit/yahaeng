"""Native settings input, persistence, shared Korean font and clipped-panel access."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/settings-v257';O.mkdir(parents=True,exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if os.environ.get('YH_SETTINGS_URL')else None)
  for w,h in [(320,568),(390,844),(844,390),(1024,768),(1440,900)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=w<1000,is_mobile=w<1000);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;if(!sessionStorage.getItem("settingsTestSeeded")){localStorage.clear();sessionStorage.setItem("settingsTestSeeded","1")}');await q.goto(os.environ.get('YH_SETTINGS_URL')or(R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.officeReady()',polling=100);await q.evaluate('document.fonts.ready')
   await q.locator('.title-bg img').evaluate('i=>i.decode()');await q.screenshot(path=str(O/f'title-{w}.png'));await q.click('#btnHelp')
   assert await q.locator('#advancedSettings').evaluate('e=>!e.open')
   for sel in ['#volR','#briR','#btnMute','#btnHelpBack']:
    await q.locator(sel).scroll_into_view_if_needed();box=await q.locator(sel).bounding_box();assert box and box['height']>=44 and box['width']>=44,(w,sel,box)
   await q.locator('#btnHelpBack').scroll_into_view_if_needed();await q.screenshot(path=str(O/f'options-{w}.png'))
   await q.click('#btnMute');assert await q.locator('#btnMute').get_attribute('aria-pressed')=='true';assert await q.locator('#volLabel').inner_text()=='음소거'
   await q.locator('#volR').focus();await q.keyboard.press('ArrowLeft');assert await q.locator('#volValue').inner_text()=='85%';assert await q.locator('#btnMute').get_attribute('aria-pressed')=='false'
   await q.locator('#briR').focus();await q.keyboard.press('ArrowRight');assert await q.locator('#briValue').inner_text()=='105%'
   assert await q.locator('#volR').get_attribute('aria-valuetext')=='85%'
   await q.click('#advancedSettings summary');await q.click('#btnFps');assert await q.evaluate('__game.FPS_CAP===30');await q.click('#btnRoutes');routes=await q.locator('#btnRoutes').get_attribute('aria-pressed')
   await q.click('#controlGuide summary');assert await q.locator('#controlGuide .touch-controls').is_visible()==(w<1000)
   cdp=await q.context.new_cdp_session(q);await cdp.send('DOM.enable');await cdp.send('CSS.enable');root=await cdp.send('DOM.getDocument');faces={}
   for sel in ['#help h2','#settingsAudioTitle','#volLabel','#btnMute','#controlGuide dd']:
    node=await cdp.send('DOM.querySelector',{'nodeId':root['root']['nodeId'],'selector':sel});face=await cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']})
    # The PC and touch guides coexist; inspect the visible guide's actual text.
    if sel.endswith('dd')and not face['fonts']:
     node=await cdp.send('DOM.querySelector',{'nodeId':root['root']['nodeId'],'selector':'#controlGuide .touch-controls dd'});face=await cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']})
    assert face['fonts']and all(f['isCustomFont']and f['familyName']=='IBM Plex Sans KR'for f in face['fonts']),(w,sel,face);faces[sel]=face['fonts']
   assert await q.evaluate('document.documentElement.scrollWidth<=innerWidth&&document.querySelector("#help .panel").scrollWidth<=document.querySelector("#help .panel").clientWidth+1'),'options overflow horizontally'
   await q.reload();await q.wait_for_function('__game?.officeReady()',polling=100);await q.click('#btnHelp');assert await q.locator('#volR').input_value()=='85'and await q.locator('#briR').input_value()=='105';assert await q.evaluate('__game.FPS_CAP===30');await q.click('#advancedSettings summary');assert await q.locator('#btnRoutes').get_attribute('aria-pressed')==routes
   await q.keyboard.press('Escape');assert await q.locator('#intro').is_visible();await q.click('#btnSkillsIntro');await q.click('[data-select="quietStep"]');assert 'Yahaeng UI'in await q.locator('#skillDetail h3').evaluate('e=>getComputedStyle(e).fontFamily');await q.keyboard.press('Escape');await q.keyboard.press('Escape');assert await q.locator('#intro').is_visible()
   await q.click('#btnQuick');await q.click('#btnPause');await q.click('#btnSet2');await q.keyboard.press('Escape');assert await q.locator('#pause').is_visible(),'in-game settings loses paused mission'
   assert not errors,errors;rows.append({'width':w,'height':h,'volume':85,'brightness':105,'fps':30,'routesPersisted':True,'sharedUIFont':faces,'errors':errors});print('PASS settings',w,h,'native range/mute, persistence, fonts, guide, scroll, skill/menu/pause return',flush=True);await q.close()
  await b.close()
 (O/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
