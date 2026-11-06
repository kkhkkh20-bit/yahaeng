"""Positioned in-game asset comparisons; native gameplay is recorded separately."""
import argparse,asyncio
from pathlib import Path
from playwright.async_api import async_playwright
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for label,url in [('before',a.before),('after',a.after)]:
   for kind in ['coat','folder']:
    q=await b.new_page(viewport={'width':1280,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto(url+'?nostats&review=field-art');await q.wait_for_function('!!window.__game',polling=100);await q.evaluate('__game.start(__game.STAGES.findIndex(s=>s.id==="p1"),true)');await q.click('#btnBrGo')
    await q.evaluate('''kind=>{const G=__game,S=G.S,P=S.player;while(G.DLG.modal)G.advanceDialog();const at=kind==='coat'?S.props.find(p=>p.outfit):S.items[0],x=at.dx??at.x,y=at.dy??at.y;Object.assign(P,{x:at.x-65,y:at.y+40,fl:0,z:0});G.setLayer(0);S.fade=0;G.setZoom(1.8);G.update(.01);G.moveCamera(1);G.cam.x=x;G.cam.y=y-30;G.updateHUD(true);G.benchDraw(2);}''',kind)
    if label=='after':await q.wait_for_function('__game.fieldArtReady',polling=100)
    await q.evaluate('document.fonts.ready');await q.wait_for_timeout(1000);await q.evaluate('__game.benchDraw(2)');await q.screenshot(path=str(out/(label+'-'+kind+'.png')));assert not errors,errors;await q.close()
  await b.close()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--before',default='http://127.0.0.1:8011/public/');p.add_argument('--after',default='http://127.0.0.1:8012/public/');p.add_argument('--out',default='build/tutorial-v202/visual');asyncio.run(main(p.parse_args()))
