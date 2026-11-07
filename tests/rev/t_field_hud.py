"""Controlled perception fixtures: compact access, danger priority and real reading controls."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(390,844),(320,568),(844,390)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=True,is_mobile=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p1'));while(G.DLG.modal)G.advanceDialog();const S=G.S;Object.assign(S.player,{x:840,y:552,outfit:'crew',disguise:'sam',light:.5});S.starterPass=true;S.expo=0;S.alevel=0;for(const g of S.guards){g.seen=false;g.eyeT=0;g.meter=0;}G.updateHUD(true)}''')
   assert await q.locator('#accessLbl').is_visible(),'innocent disguise has no visible permission'
   assert '통행 허용' in await q.locator('#accessLbl').inner_text()
   assert await q.locator('#expoLbl').is_hidden(),'duplicate quiet-state text'
   assert '출고 서류' in await q.locator('#objectiveSummary').inner_text()
   assert await q.locator('#btnAct [data-field-icon]').count()==1,'new control has no actual SVG icon'
   await q.evaluate('''()=>{const G=__game,S=G.S,g=S.guards[0];S.expo=2;Object.assign(g,{state:'ALERT',seen:true,sightAt:S.t,sightFl:0,sightZ:0});G.updateHUD(true)}''')
   assert '시야를 끊고 숨기' in await q.locator('#objectiveSummary').inner_text(),'chase leaves mission work as the primary instruction'
   assert await q.locator('#expoLbl').is_visible() and '발각' in await q.locator('#expoLbl').inner_text()
   assert await q.locator('#accessLbl').is_hidden(),'permission competes with an actual detection'
   await q.click('#hud .obj');assert await q.evaluate('__game.hudInspecting()')
   assert await q.locator('#objective').is_visible(),'full mission is lost in compact mode'
   await q.click('#hud .obj');assert not await q.evaluate('__game.hudInspecting()')
   assert not errors,errors;print('PASS field HUD quiet/danger/reading',w,h,flush=True);await q.close()
  await b.close()
asyncio.run(main())
