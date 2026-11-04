"""Two native walking laps in the reported office, with the actual spare coat.

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
   await q.evaluate('Object.assign(__game.S.player,{x:408,y:552,fl:1,z:0,a:0});__game.setLayer(1);__game.moveCamera(1)')
   async def state():return await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,gs=[7,30].map(i=>S.guards[i]);return{version:__BUILD_VERSION__,p:{x:P.x,y:P.y,hp:P.hp,mode:P.mode,moving:P.moving,blown:!!P.disguiseBlown},t:S.t,detected:S.stats.detected,alarm:S.alevel,over:S.over,access:G.accessReadout().allowed,label:document.querySelector('#expoLbl').textContent,physical:gs.some(g=>g.rawSeen),meter:Math.max(...gs.map(g=>g.meter||0)),eye:Math.max(...gs.map(g=>g.eyeT||0)),guards:gs.map(g=>({id:g.id,state:g.state,why:g.why,seen:g.seen}))}}''')
   start=await state();trace=[];cdp=await q.context.new_cdp_session(q);suspected=False
   assert start['access']!=args.expect_attraction,start
   for lap in range(2):
    for x,y in [(408,456),(168,456),(168,312),(312,312),(312,552),(408,552)]:
     s=await state();axis='x' if abs(s['p']['x']-x)>6 else 'y';target=x if axis=='x' else y;d=target-s['p'][axis]
     if abs(d)<6:continue
     positive=d>0;key=('ArrowRight' if positive else 'ArrowLeft') if axis=='x' else ('ArrowDown' if positive else 'ArrowUp')
     if mobile:
      dx=(35 if positive else -35) if axis=='x' else 0;dy=(35 if positive else -35) if axis=='y' else 0
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]})
      await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55+dx,'y':520+dy}]})
     else:await q.keyboard.down(key)
     last=None;stuck=0
     for _ in range(220):
      await q.wait_for_timeout(30);s=await state();trace.append(s);d=target-s['p'][axis]
      suspected=s['meter']>=.35 or any(g['state'] in ['NOTICE','WARN','ALERT'] for g in s['guards'])
      if args.expect_attraction and suspected:break
      if not args.expect_attraction:
       assert not s['over'] and not s['detected'] and not s['p']['blown'] and s['meter']==0,('innocent office walk is suspicious',s)
       assert not s['p']['moving'] or not s['eye'],('passing fills identity meter',s)
      if abs(d)<6 or (d>0)!=positive:break
      stuck=stuck+1 if last is not None and abs(s['p'][axis]-last)<.1 else 0;last=s['p'][axis]
      assert stuck<12,('blocked',axis,target,s)
     else:raise AssertionError(('walking timed out',axis,target,s))
     if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
     else:await q.keyboard.up(key)
     if args.expect_attraction and suspected:break
    if args.expect_attraction and suspected:break
   after=await state()
   if args.expect_attraction:assert suspected,('baseline suspicion not reproduced',after)
   else:
    assert after['t']-start['t']>12 and sum(r['physical'] for r in trace)>5,(start,after)
    assert after['p']['hp']==start['p']['hp'] and not after['alarm'] and not after['detected'],after
   assert not errors,errors
   await q.screenshot(path=str(out/f'{name}-office-laps.png'));rows.append({'mobile':mobile,'baseline':args.expect_attraction,'start':start,'after':after,'samples':len(trace),'physicalSightSamples':sum(r['physical'] for r in trace),'peakMeter':max(r['meter'] for r in trace),'peakEye':max(r['eye'] for r in trace),'trace':trace,'method':__doc__});print('PASS',name,'baseline office suspicion reproduced' if args.expect_attraction else 'two office walking laps, actual guard sight, no suspicion, alarm, damage or blown disguise',flush=True)
   await q.close()
  await b.close()
 (out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8032/public/');p.add_argument('--out',default='build/disguise-v184/native');p.add_argument('--expect-attraction',action='store_true');asyncio.run(main(p.parse_args()))
