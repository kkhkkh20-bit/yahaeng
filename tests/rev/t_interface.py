"""One real UI face/weight, straight skill rails, playable mission rows and native pause."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v153';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();results=[]
  for mode,w,h,touch in [('pc',1440,900,False),('mobile',390,844,True),('landscape',844,390,True),('small',320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');assert await q.evaluate('document.fonts.check(\'400 14px "Yahaeng UI"\')'),'Face did not load before boot'
   assert await q.locator('#btnLedger').is_hidden();rows=[]
   assert await q.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Page overflows'
   cdp=await q.context.new_cdp_session(q);await cdp.send('DOM.enable');await cdp.send('CSS.enable');root=await cdp.send('DOM.getDocument');node=await cdp.send('DOM.querySelector',{'nodeId':root['root']['nodeId'],'selector':'#btnQuick'});real=await cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']});assert real['fonts']and all(f['isCustomFont']and f['familyName']=='IBM Plex Sans KR'for f in real['fonts']),real
   await q.click('#btnSkillsIntro');await q.evaluate('__game.drawSkillLinks()');edges=await q.locator('.skill-links path').evaluate_all('(es)=>es.map(e=>e.getAttribute("d"))');assert len(edges)==24 and all(not any(c in x for c in 'CQSAcqsa')for x in edges),'Curved or false tree edges';assert await q.locator('.skill-tree:visible').count()==3;assert await q.locator('[data-node]').count()==27
   if mode in ['landscape','small']:await q.screenshot(path=str(O/f'after-skills-{mode}.png'))
   await q.click('[data-select="reach"]');assert await q.locator('[data-path]').count()==2;await q.keyboard.press('Escape');await q.keyboard.press('Escape');await q.evaluate('__game.start(__game.STAGES.findIndex(s=>s.id==="m2"),true)');await q.click('#btnBrGo');await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.update(.01);G.updateHUD(true);G.moveCamera(1);G.benchDraw(2)}''')
   geometry=await q.evaluate('''()=>[...document.querySelectorAll('#hud .pad > button,#hud .sysbtns button,#btnPause')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility==='visible').map(e=>{const r=e.getBoundingClientRect();return{id:e.id,w:r.width,h:r.height,x:r.left,y:r.top,weight:getComputedStyle(e).fontWeight,family:getComputedStyle(e).fontFamily}})''');assert all(e['w']>=44 and e['h']>=44 and e['x']>=0 and e['x']+e['w']<=w+.5 and e['y']>=0 and e['y']+e['h']<=h+.5 and e['weight']=='400'for e in geometry),geometry
   await q.click('#btnPause');assert await q.locator('#pause').is_visible();assert await q.locator('#hud').evaluate('(e)=>getComputedStyle(e).visibility==="hidden"');assert await q.locator('#btnResume').evaluate('(e)=>getComputedStyle(e).fontWeight==="400"');
   if mode in ['landscape','small']:await q.screenshot(path=str(O/f'after-pause-{mode}.png'))
   await q.click('#btnResume');assert await q.locator('#hud').evaluate('(e)=>getComputedStyle(e).visibility==="visible"');assert not errors,errors;results.append({'mode':mode,'viewport':[w,h],'missionRows':rows,'realFont':real,'straightEdges':24,'nodes':27,'controls':geometry,'pauseAndResume':True,'pageErrors':errors});print('PASS',mode,flush=True);await q.close()
  # A failed font fetch must keep the game bootable and the common fallback usable.
  q=await b.new_page();await q.route('**/*.woff2',lambda r:r.abort());await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'public/index.html').as_uri());await q.wait_for_function('!!__game');await q.click('#btnQuick');assert await q.evaluate('__game.STAGE.id==="tB"');results.append({'blockedFontBootAndStart':True});print('PASS font failure fallback',flush=True);await b.close();(O/'interface-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
asyncio.run(main())
