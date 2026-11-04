"""Native UI/input smoke in positioned room/vent fixtures, normal browser time.

Actors/cameras are removed and the player positioned to isolate each interaction;
this is not a full mission clear or an unassisted novice playthrough. Room actor
reactions and cross-floor isolation are covered separately by t_room_switches.
"""
import argparse,asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']} if args.url.startswith('https:') else None)
  for mobile in [False,True]:
   label='mobile' if mobile else 'pc'
   q=await browser.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile)
   errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()')
   await q.goto(args.url+'?nostats&review=lights-vents');await q.wait_for_function('!!window.__game',timeout=60000)
   await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   for _ in range(15):
    if not await q.evaluate('__game.DLG.modal'):break
    await q.click('#dlg');await q.wait_for_timeout(50)
   fixture=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.guards=[];S.cams=[];
    const l=S.lamps.find(l=>l.roomSwitch&&!l.fl&&G.lampCircuit(l).length>=3),at=l.control;
    Object.assign(P,{x:at.tx*48+24,y:at.ty*48+24,fl:0,z:0});G.setLayer(0);G.moveCamera(1);
    window.__roomLamp=l;return{circuit:l.circuit,fixtures:G.lampCircuit(l).length,position:at};}''')
   await q.wait_for_timeout(200)
   async def select(kind):
    if await q.evaluate('k=>__game.envAction().k===k',kind):return
    await q.click('#btnCycle');buttons=q.locator('#envPicker [data-env-token]');wanted=await q.evaluate('k=>__game.envChoices().find(a=>a.k===k)?.label',kind)
    assert wanted,(kind,await buttons.all_text_contents())
    await buttons.filter(has_text=wanted).first.click()
   async def act():
    if mobile:await q.tap('#btnCarry')
    else:await q.keyboard.press('x')
   assert not await q.evaluate('__game.skillOn("electric")')
   await select('lamp');await act();await q.wait_for_function('__roomLamp.off&&!__game.actionBusy()',timeout=6000)
   assert await q.evaluate('__game.lampCircuit(__roomLamp).every(l=>l.off)')
   await q.screenshot(path=str(out/f'{label}-room-off.png'))
   await select('lamp');await act();await q.wait_for_function('!__roomLamp.off&&!__game.actionBusy()',timeout=6000)
   await q.screenshot(path=str(out/f'{label}-room-on.png'))
   vent=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;G.setLayer(0);
    for(const v of S.vents.filter(v=>!v.roof&&!v.z)){
     const tx=Math.floor(v.x/48),ty=Math.floor(v.y/48),step=[[1,0],[-1,0],[0,1],[0,-1]].find(([x,y])=>G.ventAt(tx+x,ty+y));if(!step)continue;
     for(const [dx,dy]of [[0,24],[24,0],[-24,0],[0,-24],[0,0]]){
      Object.assign(P,{x:v.x+dx,y:v.y+dy,fl:0,z:0});
      if(G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48))||G.nearVent()!==v||!G.envChoices().some(a=>a.k==='ventIn'))continue;
      G.moveCamera(1);return{at:{x:v.x,y:v.y},step};
     }
    }throw Error('No physical vent entry fixture');}''')
   await q.wait_for_timeout(150);await select('ventIn');await act()
   await q.wait_for_function('__game.S.player.vent&&!__game.actionBusy()',timeout=8000)
   before=await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y})')
   cdp=await q.context.new_cdp_session(q)
   async def move(sign):
    dx,dy=vent['step'];dx*=sign;dy*=sign
    if mobile:
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]})
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55+dx*28,'y':520+dy*28}]})
    else:
     key='ArrowRight' if dx>0 else 'ArrowLeft' if dx<0 else 'ArrowDown' if dy>0 else 'ArrowUp';await q.keyboard.down(key)
    await q.wait_for_timeout(650)
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.up(key)
   await move(1)
   after=await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y})')
   assert abs(after['x']-before['x'])+abs(after['y']-before['y'])>20,(before,after)
   assert await q.evaluate('__game.S.player.vent&&!__game.S.player.under&&__game.ventAt(Math.floor(__game.S.player.x/48),Math.floor(__game.S.player.y/48))')
   await q.screenshot(path=str(out/f'{label}-duct-crawl.png'))
   await move(-1);await select('ventOut');await act();await q.wait_for_function('!__game.S.player.vent&&!__game.actionBusy()',timeout=8000)
   await q.screenshot(path=str(out/f'{label}-duct-exit.png'))
   assert not errors,errors
   rows.append({'mobile':mobile,'fixture':fixture,'vent':vent,'before':before,'after':after,'errors':errors,'method':__doc__});print('PASS',label,fixture['fixtures'],'lights on one basic switch; native duct entry/crawl/exit',flush=True)
   await q.close()
  await browser.close()
 (out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8032/public/');parser.add_argument('--out',default='build/lights-v181/live');asyncio.run(main(parser.parse_args()))
