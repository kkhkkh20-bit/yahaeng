"""Native keyboard/touch switch test in a positioned, actor-free office fixture.
Normal RAF and interaction animation. This isolates input/art/perception, not mission difficulty.
"""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage

async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True);report=[]
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   name='mobile'if mobile else 'pc';q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear()');await open_game(q,a.url+'?nostats&review=room-switch');await standalone_stage(q,'m2');await q.click('#btnBrGo')
   at=await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,l=G.roomFinishLamps()[0],at=l.control;S.guards=[];S.cams=[];Object.assign(P,{x:at.tx*48+24,y:at.ty*48+24,fl:1,z:0});G.setLayer(1);G.moveCamera(1);return at;}''')
   await q.wait_for_timeout(300)
   async def act():
    if await q.evaluate('__game.envAction().k')!='lamp':
     if mobile:await q.tap('#btnCycle')
     else:await q.keyboard.press('Shift+Tab')
     await q.locator('[data-env-token^="lamp:"]').first.click()
    if mobile:await q.tap('#btnCarry')
    else:await q.keyboard.press('x')
   assert not await q.evaluate('__game.skillOn("electric")')
   before=await q.evaluate('__game.S.player.light');await act();await q.wait_for_function('__game.roomFinishLamps().every(l=>l.off)&&!__game.actionBusy()',timeout=6000)
   await q.wait_for_timeout(200);dark=await q.evaluate('__game.S.player.light');assert dark<.1,(name,dark)
   assert await q.evaluate('__game.S.fwindows.filter(w=>w.roomFinish).every(w=>!__game.roomFinishWindowLit(w))')
   await q.screenshot(path=str(out/(name+'-off.png')));await act();await q.wait_for_function('__game.roomFinishLamps().every(l=>!l.off)&&!__game.actionBusy()',timeout=6000)
   await q.wait_for_timeout(200);lit=await q.evaluate('__game.S.player.light');assert lit>.8,(name,lit);await q.screenshot(path=str(out/(name+'-on.png')))
   assert not errors,errors;report.append({'device':name,'control':at,'before':before,'dark':dark,'lit':lit,'errors':errors,'method':__doc__});print('PASS native office switch',name,'brightness',lit,'→',dark,'→',lit,flush=True);await q.close()
  await b.close()
 (out/'summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8011/public/');p.add_argument('--out',default='build/light-room-v201/native');asyncio.run(main(p.parse_args()))
