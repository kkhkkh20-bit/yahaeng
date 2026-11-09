"""Fixture-level story delivery: saved completion → coda → earned training.
Actual keyboard/touch dialogue input; completion itself is deliberately injected.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},is_mobile=touch,has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.castArtReady')
   route=await q.evaluate('''()=>{const G=__game;return G.STAGES.filter(s=>s.storyCoda).map(s=>({id:s.id,before:s.story.before,after:s.story.after,context:s.storyCoda.context,lines:s.storyCoda.lines}));}''');assert len(route)==9
   assert all(x['before']and x['after']and 2<=len(x['lines'])<=3 for x in route)
   # Betrayal is specifically after success, not a player-failure condition.
   await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m4'));while(__game.DLG.modal)__game.advanceDialog();__game.endGame(true,'검증용 완료')")
   await q.wait_for_selector('#dlg[data-sequence="episode-coda"]',state='visible');assert await q.locator('#end').is_hidden()
   assert await q.evaluate("JSON.parse(localStorage.getItem('yahaeng.ch')).m4._clear&&__game.S.overWin&&__game.S.resultFresh")
   budget=await q.evaluate('__game.skillBudget()');assert budget>0
   assert '임무 완료 뒤' in await q.locator('#dlgContext').inner_text()
   lines=[]
   for _ in range(10):
    if not await q.evaluate('__game.DLG.modal'):break
    text=await q.evaluate('__game.DLG.cur.text');lines.append(text)
    if touch:await q.tap('#dlg')
    else:await q.keyboard.press('Space')
   assert any('문이 잠긴다' in s for s in lines),lines
   await q.wait_for_selector('#skillScreen',state='visible');assert await q.evaluate('__game.skillBudget()')==budget
   assert not await q.evaluate("document.body.classList.contains('episode-coda')")
   # A replay completes directly; a stale callback cannot reopen the scene.
   await q.evaluate("document.getElementById('skillScreen').hidden=true;__game.start(__game.STAGES.findIndex(s=>s.id==='m4'));while(__game.DLG.modal)__game.advanceDialog();__game.endGame(true,'재도전 완료')")
   await q.wait_for_function("!document.getElementById('end').hidden",polling=50);assert not await q.evaluate('__game.DLG.modal');assert await q.evaluate('__game.skillBudget()')==budget
   await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m6'));while(__game.DLG.modal)__game.advanceDialog();__game.S.items[0].got=true;__game.S.t=2")
   radio=await q.evaluate('''()=>{const G=__game,m=G.episodeRadioMessage();if(m?.storyBeat)G.acknowledgeEpisodeStory(m);const g=G.S.guards[0];Object.assign(g,{state:'ALERT',seen:true,fl:G.S.player.fl||0});return{m,danger:G.episodeRadioMessage(),recorded:G.speakerOf({recorded:'aide'})};}''')
   assert radio['m']['speaker']=='hero' and '제비' in radio['m']['text'],radio
   assert radio['danger']['priority']==2 and radio['danger']['speaker']=='hero',radio
   assert '녹음' in radio['recorded']['name']
   # Skipping the final scene still opens training, with exactly one reward.
   await q.evaluate("localStorage.clear();__game.start(__game.STAGES.findIndex(s=>s.id==='n1'));while(__game.DLG.modal)__game.advanceDialog();__game.endGame(true,'검증용 완료')")
   await q.wait_for_selector('#dlg[data-sequence="episode-coda"]',state='visible');assert '녹음' in await q.locator('#dlgName').inner_text()
   earned=await q.evaluate('__game.skillBudget()');await q.keyboard.press('Escape');await q.wait_for_selector('#skillScreen',state='visible');assert await q.evaluate('__game.skillBudget()')==earned
   assert not errors,errors;print('PASS continuity',touch,'nine leads; saved reward before car trap; recorded voice; danger priority; replay; skip → training',flush=True);await q.close()
  await b.close()
asyncio.run(main())
