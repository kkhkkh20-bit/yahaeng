"""Single-route main menu, keyboard access and embedded title font."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.goto((Path(__file__).resolve().parents[2]/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.evaluate('document.fonts.ready')
  assert await q.locator('#intro h1').inner_text()=='야행'
  assert await q.evaluate('document.fonts.check(\'100px "Yahaeng Title"\')')
  assert await q.locator('#intro .brief,#intro .title-kicker,#intro .title-en').count()==0
  assert await q.locator('#btnLedger').is_hidden()
  for selector in ['#btnQuick','#intro [data-case-open]','#btnSkillsIntro','#btnHelp','#btnQuick','#intro [data-case-open]','#btnSkillsIntro']:
   await q.keyboard.press('ArrowDown');assert await q.locator(selector).evaluate('e=>e===document.activeElement'),selector
  await q.keyboard.press('Enter');assert await q.locator('#skillScreen').is_visible()
  await q.keyboard.press('Escape');assert await q.locator('#intro').is_visible() and await q.locator('#ledger').is_hidden()
  assert not errors,errors;await b.close();print('PASS linear title keyboard, skills and font')
asyncio.run(main())
