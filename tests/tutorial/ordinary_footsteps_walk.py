"""Native ordinary walking after actually equipping the authored office coat.

Only player location/facing/floor is positioned to isolate the reported office
encounter. The coat is taken through the real action UI; all authored NPCs,
cameras, health and inventory remain active under normal RAF and randomness.
This is not a complete mission clear or an unassisted novice playthrough.
"""
import argparse,asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']} if args.url.startswith('https:') else None)
  for mobile in [False,True]:
   name='mobile' if mobile else 'pc';errors=[]
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile)
   q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()')
   await q.goto(args.url+'?nostats&review=ordinary-walk');await q.wait_for_function('!!__game',timeout=60000)
   await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   for _ in range(20):
    if not await q.evaluate('__game.DLG.modal'):break
    await q.click('#dlg');await q.wait_for_timeout(30)
   await q.evaluate('Object.assign(__game.S.player,{x:456,y:816,fl:0,z:0});__game.moveCamera(1);__game.updateHUD(true)')
   if await q.evaluate('__game.envAction().k')!='pickup':
    await q.click('#btnCycle');await q.locator('[data-env-token^="pickup:"]').first.click()
   if mobile:await q.tap('#btnCarry')
   else:await q.keyboard.press('x')
   await q.wait_for_function('__game.S.player.outfit==="crew"');assert await q.evaluate('__game.S.props.find(p=>p.id==="officeCoat").taken')
   await q.evaluate('Object.assign(__game.S.player,{x:168,y:504,fl:1,z:0,a:0});__game.setLayer(1);__game.moveCamera(1)')
   async def state():return await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{version:__BUILD_VERSION__,p:{x:P.x,y:P.y,fl:P.fl,hp:P.hp,mode:P.mode,outfit:P.outfit,blown:!!P.disguiseBlown},t:S.t,detected:S.stats.detected,alarm:S.alevel,over:S.over,steps:S.noises.filter(n=>n.src==='step').map(n=>({mode:n.mode,kind:n.stepKind??null})),guards:[7,30].map(i=>{const g=S.guards[i];return{id:i,x:g.x,y:g.y,a:g.a,state:g.state,why:g.why,hearT:g.hearT||0,hearKind:g.hearKind||null,seen:g.seen,eye:g.eyeT||0}})}}''')
   before=await state();cdp=await q.context.new_cdp_session(q)
   if mobile:
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]})
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55,'y':555}]})
   else:await q.keyboard.down('ArrowDown')
   await q.wait_for_timeout(330)
   if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await q.keyboard.up('ArrowDown')
   motion=await state();await q.wait_for_timeout(850);after=await state()
   assert after['p']['y']-before['p']['y']>20 and after['p']['mode']=='walk',after
   assert any(n['mode']=='walk' for n in motion['steps']),after
   if args.expect_attraction:
    assert any(g['hearT']>0 or g.get('why')=='heard' or g['state'] in ['NOTICE','WARN','ALERT'] for g in after['guards']),('old bug not reproduced',before,after)
   else:
    assert all(g['state']=='PATROL' and not g['hearT'] and not g['eye'] for g in after['guards']),after
    assert after['detected']==0 and after['alarm']==0 and after['p']['hp']==before['p']['hp'] and not after['p']['blown'] and not after['over'],after
   assert not errors,errors
   await q.screenshot(path=str(out/f'{name}-walk.png'));rows.append({'mobile':mobile,'baseline':args.expect_attraction,'before':before,'motion':motion,'after':after,'method':__doc__});print('PASS',name,'baseline attraction reproduced' if args.expect_attraction else 'ordinary shoes ignored; uniform intact, no alarm or damage',flush=True)
   await q.close()
  await b.close()
 (out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8032/public/');p.add_argument('--out',default='build/footsteps-v183/native');p.add_argument('--expect-attraction',action='store_true');asyncio.run(main(p.parse_args()))
