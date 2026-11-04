"""UI-only opening -> VIP handoff in normal browser time, desktop and touch.
Known-map input route; no engine API, seed, RAF or gameplay-state overrides.
Menu pauses between observations; reported times are not novice benchmarks.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
LABEL=sys.argv[2]if len(sys.argv)>2 else'local'
O=Path(os.environ.get('YH_CLARITY_DIR','/workspace/work/clarity-v176/campaign'));O.mkdir(parents=True,exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for touch in [False,True]:
   name=LABEL+('-touch'if touch else'-pc');q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear()');await q.goto(BASE+'?review=clarity&nostats',timeout=120000);await q.locator('#btnQuick').wait_for(state='visible',timeout=60000);cdp=await q.context.new_cdp_session(q);paused=False
   async def resume():
    nonlocal paused
    if paused and await q.locator('#end').is_hidden()and await q.locator('#pause').is_visible():await q.click('#btnResume')
    paused=False
   async def snap(label):
    nonlocal paused
    await q.wait_for_timeout(100);await q.screenshot(path=str(O/(name+'-'+label+'.png')))
    if await q.locator('#hud').is_visible()and await q.locator('#end').is_hidden()and await q.locator('#brief').is_hidden()and not await q.evaluate('document.body.classList.contains("dlgmodal")'):
     try:await q.click('#btnPause',timeout=1000);paused=True
     except Exception:
      if await q.locator('#end').is_hidden():raise
   async def move(keys,delta,ms):
    await resume()
    if touch:
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+delta[0],'y':520+delta[1]}]})
    else:
     for k in keys:await q.keyboard.down(k)
    await q.wait_for_timeout(ms)
    if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
     for k in reversed(keys):await q.keyboard.up(k)
   async def action(key,selector,ms=70):
    await resume()
    if touch:
     r=await q.locator(selector).bounding_box();assert r,selector
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}]});await q.wait_for_timeout(ms);await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.down(key);await q.wait_for_timeout(ms);await q.keyboard.up(key)
   await q.click('#btnQuick');await q.click('#btnBrGo');await q.wait_for_timeout(650);await action('Control','#btnCrouch');await move(['ArrowUp'],[0,-48],3400);await snap('north')
   await move(['ArrowRight'],[48,0],4000)
   for n in range(16):
    text=await q.locator('#objective').inner_text()
    if ('Z 길게 처치'in text or'공격 길게 처치'in text):break
    await move(['ArrowRight'],[48,0],100)
   else:raise AssertionError((name,'no rear contact',text))
   await snap('contact');await action('z','#btnAct',1700);await q.wait_for_timeout(1200);assert '탈출'in await q.locator('#objective').inner_text();await snap('target-down')
   for keys,delta,ms in [(['ArrowLeft'],[-48,0],5000),(['ArrowDown'],[0,48],3400),(['ArrowLeft','ArrowDown'],[-48,48],1800),(['ArrowLeft'],[-48,0],1200)]:await move(keys,delta,ms)
   await q.locator('#end').wait_for(state='visible',timeout=5000);assert await q.locator('#end').get_attribute('data-win')=='1';opening=await q.locator('#endStats').inner_text();await snap('clear')
   await q.click('#btnNext');assert '실장'in await q.locator('#brPurpose').inner_text();assert await q.locator('#btnCrouch').get_attribute('aria-pressed')=='false','opening crouch leaked into VIP brief';await q.click('#btnBrGo')
   for _ in range(10):
    if not await q.evaluate('document.body.classList.contains("dlgmodal")'):break
    await q.click('#dlg');await q.wait_for_timeout(80)
   assert not await q.evaluate('document.body.classList.contains("dlgmodal")');assert await q.locator('#btnCrouch').get_attribute('aria-pressed')=='false';await snap('vip-entry')
   await move(['ArrowRight'],[48,0],3800);await move(['ArrowUp'],[0,-48],3000)
   for _ in range(4):
    goal=await q.locator('#objective').inner_text()
    if '클럽 실장 처치하기'in goal:break
    await move(['ArrowUp'],[0,-48],150)
   assert '클럽 실장 처치하기'in goal,(name,goal);assert await q.locator('#btnCrouch').get_attribute('aria-pressed')=='false';await snap('vip-observed');assert not errors,errors
   row={'touch':touch,'openingResult':opening,'vipGoal':goal,'freshMissionStands':True,'errors':errors,'method':__doc__.strip()};rows.append(row);print('PASS UI campaign',name,json.dumps(row,ensure_ascii=False),flush=True);await q.close()
  await b.close()
 (O/(LABEL+'-checks.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
