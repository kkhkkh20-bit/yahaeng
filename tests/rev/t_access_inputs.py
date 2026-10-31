"""Actual keyboard/touch sources: a tap cannot release a lethal sign; vents finish both ways."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script("localStorage.clear();(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()")
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   await pg.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.facOn=false;G.update(.001);S.fade=0;window.__trap=S.traps.find(t=>t.k==='drop');const g=G.signGeometry(__trap);Object.assign(P,{x:g.x,y:g.y-12,z:g.z,fl:0});G.setLayer(0);const a=G.envChoices().find(a=>a.k==='trap'&&a.tp.t===__trap);if(!a)throw Error('missing fixing prompt');G.selectEnvTarget(G.envToken(a));for(let i=0;i<180;i++)G.moveCamera(1/60);__step(2)}''')
   assert '고정 풀기' in await pg.locator('#btnCarry').inner_text()
   if touch:
    box=await pg.locator('#btnCarry').bounding_box();await pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);await pg.mouse.down()
   else:await pg.keyboard.down('KeyX')
   await pg.evaluate('__step(20)')
   if touch:await pg.mouse.up()
   else:await pg.keyboard.up('KeyX')
   await pg.evaluate('__step(70)');assert await pg.evaluate('!__trap.used&&!__trap.fall&&!__game.S.player.trav&&!__game.S.player.lethalHold')
   if touch:await pg.mouse.down()
   else:await pg.keyboard.down('KeyX')
   await pg.evaluate('__step(66)');assert await pg.evaluate('!!__game.S.player.trav?.signFlow&&!__trap.used')
   if touch:await pg.mouse.up()
   else:await pg.keyboard.up('KeyX')
   await pg.evaluate('__step(90)');assert await pg.evaluate('__trap.used&&!!__trap.wreck&&!__game.S.player.trav')
   await pg.evaluate('''()=>{const G=__game,P=G.S.player;window.__vent=G.S.vents.find(v=>v.roof);Object.assign(P,{x:__vent.x,y:__vent.y+20,z:__vent.z,fl:0,trav:null});G.setLayer(0);const a=G.envChoices().find(a=>a.k==='ventIn'&&a.v===__vent);if(!a)throw Error('missing roof vent prompt');G.selectEnvTarget(G.envToken(a));__step(2)}''')
   assert '옥상 환기함' in await pg.locator('#btnCarry').get_attribute('aria-label')
   assert await pg.locator('#btnCarry').inner_text()=='들어가기'
   if touch:await pg.locator('#btnCarry').tap()
   else:await pg.keyboard.press('KeyX')
   await pg.evaluate('__step(15)');assert await pg.evaluate('!!__game.S.player.trav?.accessFlow&&!__game.S.player.vent')
   await pg.evaluate('__step(120)');assert await pg.evaluate('__game.S.player.vent&&!__game.S.player.trav')
   if touch:await pg.locator('#btnCarry').tap()
   else:await pg.keyboard.press('KeyX')
   await pg.evaluate('__step(10)');assert await pg.evaluate('!!__game.S.player.trav?.accessFlow')
   await pg.evaluate('__step(100)');assert await pg.evaluate('!__game.S.player.vent&&!__game.S.player.trav&&__game.S.player.z===__vent.z&&!__vent.open')
   assert not errors,errors;print('PASS','mobile pointer/touch'if touch else'keyboard','short tap cancellation, continuous hold, hand release, delayed impact, vent roundtrip',flush=True);await pg.close()
  await b.close()
asyncio.run(main())
