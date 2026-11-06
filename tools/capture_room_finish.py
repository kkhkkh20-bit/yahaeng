"""Deterministic, positioned visual comparison; not an unassisted playthrough."""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright

async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for baseline in [True,False]:
   q=await b.new_page(viewport={'width':1280,'height':900});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('''localStorage.clear();requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};window.__ROOM_FINISH_BASELINE__='''+str(baseline).lower())
   await q.goto(a.url+'?nostats&review=room-finish');await q.wait_for_function('!!window.__game',polling=100);await q.evaluate('window.__game.start(__game.STAGES.findIndex(s=>s.id==="m2"),true)');await q.click('#btnBrGo')
   await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();Object.assign(G.S.player,{x:312,y:456,fl:1,z:0});G.setLayer(1);G.S.fade=0;G.setZoom(1.15);G.update(.02);G.moveCamera(1);G.cam.x=210;G.cam.y=420;G.updateHUD(true);G.benchDraw(2);}''')
   await q.wait_for_function('__game.roomFinishArtReady',polling=100);await q.evaluate('document.fonts.ready');await q.wait_for_timeout(1500);await q.evaluate('__game.benchDraw(4)');prefix='before'if baseline else'after'
   await q.screenshot(path=str(out/(prefix+'-on.png')))
   if not baseline:
    await q.evaluate('__game.setLampCircuit(__game.roomFinishLamps()[0],true);__game.benchDraw(2)');await q.screenshot(path=str(out/'after-off.png'))
    for on in [False,True]:
     await q.evaluate('''on=>{const G=__game;G.setLampCircuit(G.roomFinishLamps()[0],!on);Object.assign(G.S.player,{x:648,y:744,fl:0,z:0});G.setLayer(0);G.cam.x=340;G.cam.y=600;G.updateHUD(true);G.benchDraw(2);}''',on)
     await q.evaluate('__game.benchDraw(40)');await q.screenshot(path=str(out/('facade-'+('on'if on else'off')+'.png')))
   assert not errors,errors;await q.close()
  await b.close()
 (out/'method.json').write_text(json.dumps({'method':__doc__,'actors':'seeded, active state; frozen RAF','position':'fixed office comparison','baseline':'same code with pilot disabled'},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8011/public/');p.add_argument('--out',default='build/light-room-v201/visual');asyncio.run(main(p.parse_args()))
