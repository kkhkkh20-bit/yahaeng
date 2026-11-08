"""Native KO -> cancelled finishing hold -> explicit kill -> disguise -> stash.
Known-map route with normal RAF/AI and keyboard/CDP touch. No state/clock/HP overrides.
"""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from action_flow_live import Controls
from compound_live import CompoundControls
from episode_training import standalone_stage
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in ([a.device=='mobile']if a.device else[False,True]):
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile,record_video_dir=str(out/'video'));errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()');await open_game(q,a.url)
   c=Controls(q,await q.context.new_cdp_session(q),mobile);cc=CompoundControls(q,c,out,'mobile'if mobile else'pc')
   async def attack(down):
    if mobile:
     r=await q.locator('#btnAct').bounding_box()
     if down:await c.touch('touchStart',2,r['x']+r['width']/2,r['y']+r['height']/2)
     else:await c.touch('touchEnd',2)
    elif down:await q.keyboard.down('z')
    else:await q.keyboard.up('z')
   try:
    await standalone_stage(q,'p0');await q.click('#btnBrGo');await c.press('Control','#btnCrouch');await cc.neutralize('uniformDonor');await cc.shot('ko')
    await attack(True);await q.wait_for_timeout(120);await attack(False);await q.wait_for_timeout(1150)
    assert await q.evaluate('__game.S.corpses.some(c=>c.tag==="uniformDonor"&&c.ko)&&!__game.S.player.finishPose')
    await cc.shot('hold-cancelled')
    await attack(True);await cc.shot('deliberate-hold');await q.wait_for_function('()=>{const g=__game.S.guards.find(g=>g.tag==="uniformDonor");return __game.targetEliminated(g)}',timeout=5000);await attack(False);await cc.shot('dead')
    assert await q.evaluate('!(__game.S.flash>0)&&__game.feedbackState().events.some(e=>e.kind==="kill")')
    # Contact confirms death before the paired animation/recovery releases the
    # body for clothing. Fast CI screenshots must not act as the recovery wait.
    await q.wait_for_function('!__game.actionBusy()',timeout=5000)
    await cc.dress();await cc.shot('disguise');await cc.hide('uniformDonor');await cc.shot('stash')
    assert await q.evaluate('__game.feedbackState().events.some(e=>e.kind==="stash")&&__game.S.stats.stashed===1&&__game.S.stats.detected===0&&__game.S.player.hp===3')
    assert not errors,errors;rows.append({'device':'mobile'if mobile else'pc','events':c.events,'errors':errors})
   finally:await c.steer();await q.close()
  await b.close()
 (out/'native-feedback.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('PASS native feedback',[(r['device'],len(r['events']))for r in rows],flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8006/build/preview_city.html');p.add_argument('--out',default='build/polish-v213/feedback-live');p.add_argument('--device',choices=['pc','mobile']);asyncio.run(main(p.parse_args()))
