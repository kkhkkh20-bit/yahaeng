"""Native can throw, movement and rear KO against the authored market pair.

Only the player's initial location/facing is positioned. All authored actors,
cameras, skills, inventory and normal browser time remain active. This isolated
encounter is not a complete mission clear or an unassisted first-time playthrough.
"""
import argparse,asyncio,json,math,os
from pathlib import Path
from playwright.async_api import async_playwright

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',proxy={'server':os.environ['HTTPS_PROXY']} if args.url.startswith('https:') else None)
  for mobile in [False,True]:
   label='mobile' if mobile else 'pc';errors=[]
   q=await browser.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile)
   q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()')
   await q.goto(args.url+'?nostats&review=pair');await q.wait_for_function('!!window.__game',timeout=60000)
   await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo')
   for _ in range(20):
    if not await q.evaluate('__game.DLG.modal'):break
    await q.click('#dlg');await q.wait_for_timeout(50)
   await q.evaluate('Object.assign(__game.S.player,{x:648,y:456,fl:0,z:0,a:-Math.PI/2});__game.setLayer(0);__game.moveCamera(1)')
   async def state():
    return await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{p:{x:P.x,y:P.y,hp:P.hp,stones:P.stones},detected:S.stats.detected,over:S.over,skills:G.loadSkillTree().learned,guards:[9,10].map(i=>{const g=S.guards[i];return{id:i,x:g.x,y:g.y,a:g.a,state:g.state,ko:!!g.unconscious}})}}''')
   before=await state();assert not before['skills'],before
   if mobile:await q.tap('#btnTool')
   else:await q.keyboard.press('2');await q.keyboard.press('v')
   await q.wait_for_function('__game.S.noises.some(n=>n.src==="stone"&&n.heard)',timeout=6000)
   cue=await q.evaluate('(()=>{const n=__game.S.noises.filter(n=>n.src==="stone").at(-1);return{x:n.x,y:n.y,investigators:n.investigators,lookouts:n.lookouts}})()')
   assert cue['investigators']==[10] and cue['lookouts']==[9],cue
   cdp=await q.context.new_cdp_session(q)
   for _ in range(100):
    s=await state();d=704-s['p']['x']
    if abs(d)<3:break
    assert not s['over'],s
    if mobile:
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]})
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55+(40 if d>0 else -40),'y':520}]})
    else:await q.keyboard.down('ArrowRight' if d>0 else 'ArrowLeft')
    await q.wait_for_timeout(min(60,max(16,abs(d)/120*1000)))
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.up('ArrowRight' if d>0 else 'ArrowLeft')
   else:raise AssertionError(('movement blocked',await state()))
   for _ in range(160):
    s=await state();a,g=s['guards']
    if math.hypot(a['x']-g['x'],a['y']-g['y'])>110:break
    await q.wait_for_timeout(40)
   else:raise AssertionError(('pair did not split',s))
   assert s['guards'][0]['state']=='PATROL' and abs(s['guards'][0]['a'])<.05,s
   if mobile:await q.tap('#btnAct')
   else:await q.keyboard.press('z')
   await q.wait_for_timeout(1000);after=await state()
   assert after['guards'][0]['ko'] and not after['guards'][1]['ko'],after
   assert after['p']['hp']==before['p']['hp'] and after['detected']==0 and not after['over'],after
   assert after['p']['stones']==before['p']['stones']-1 and not after['skills'],after
   assert not errors,errors
   await q.screenshot(path=str(out/f'{label}-split-ko.png'))
   rows.append({'mobile':mobile,'cue':cue,'before':before,'after':after,'method':__doc__});print('PASS',label,'one can, one investigator, rear KO, no detection or damage',flush=True)
   await q.close()
  await browser.close()
 (out/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8032/public/');parser.add_argument('--out',default='build/pairs-v182/native');asyncio.run(main(parser.parse_args()))
