"""Required goals/map/departure stay visible without scrolling; optional intel is a modal.
Native clicks/taps, Space, Escape and checkpoint resume. No mission-playthrough claim.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=Path(os.environ.get('YH_BRIEF_OUT','/workspace/work/brief-v259'));O.mkdir(parents=True,exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else(R/'build/preview_city.html').as_uri()
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for w,h,touch in [(1260,920,False),(1280,720,False),(390,844,True),(320,568,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE);await q.wait_for_function('__game?.officeReady()',polling=100)
   for id in ['p0','e2','m2','m4','m6','m7','m5','n1']:
    await q.evaluate("id=>__game.start(__game.STAGES.findIndex(s=>s.id===id),true)",id);await q.wait_for_function('document.querySelector("#brMap canvas")?.width>100',polling=100)
    boxes=await q.evaluate('''()=>{const root=document.querySelector('#brief'),frame=root.querySelector('.br-frame').getBoundingClientRect(),map=root.querySelector('#brMap canvas');const visible=[...root.querySelectorAll('.mission-id,.br-todo li,.br-tools button,#brMapTitle,.br-legend,.br-acts button')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden');const bad=visible.filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1||e.scrollWidth>e.clientWidth+1;}).map(e=>e.id||e.textContent);return{bad,map:[map.width,map.height],frame:[frame.width,frame.height],scroll:[...root.querySelectorAll('.br-scroll,.br-wrap,.br-info')].map(e=>[e.scrollHeight,e.clientHeight]),root:[root.scrollHeight,root.clientHeight]};}''')
    assert not boxes['bad'],(w,h,id,boxes);assert all(s<=c+1 for s,c in boxes['scroll']+[boxes['root']]),(w,h,id,boxes);assert min(boxes['map'])>100 and boxes['frame'][0]>140 and boxes['frame'][1]>90,(w,h,id,boxes)
    if id in ['m4','m7']and w in [1260,320,390]:await q.screenshot(path=str(O/f'brief-{id}-{w}.png'))
    rows.append({'size':[w,h],'id':id,**boxes})
   await q.locator('#btnBriefInfo').click();assert await q.locator('#briefInfo').evaluate('e=>e.open');assert await q.locator('#brLine').inner_text();await q.keyboard.press('Space');assert await q.locator('#brief').is_visible(),'Space launched through intel modal'
   if not await q.locator('#briefInfo').evaluate('e=>e.open'):await q.locator('#btnBriefInfo').click()
   await q.keyboard.press('Tab');assert await q.evaluate("document.activeElement.id==='btnBriefInfoClose'")
   if w==390:await q.screenshot(path=str(O/'brief-intel-390.png'))
   await q.keyboard.press('Escape');assert not await q.locator('#briefInfo').evaluate('e=>e.open');assert await q.evaluate("document.activeElement.id==='btnBriefInfo'")
   # The three-action checkpoint footer must also fit in the smallest viewport.
   await q.evaluate("()=>{__game.start(__game.STAGES.findIndex(s=>s.id==='m7'));while(__game.DLG.modal)__game.advanceDialog();__game.S.player.hp=2;__game.saveCheckpoint();__game.start(__game.STAGES.findIndex(s=>s.id==='m7'),true)}")
   assert await q.locator('#btnBrCP').is_visible();assert await q.locator('#btnBrCP').evaluate('e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight&&r.left>=0&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
   await q.locator('#btnBrCP').click();assert await q.evaluate('__game.S.player.hp===2')and not await q.locator('#brief').is_visible()
   await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m7'),true)")
   if touch:await q.locator('#btnBrGo').tap()
   else:await q.keyboard.press('Space')
   assert not await q.locator('#brief').is_visible(),'native departure failed';assert not errors,errors;print('PASS one-page briefing',w,h,'8 mission sheets, intel and resume/departure',flush=True);await q.close()
  await b.close()
 (O/'brief-checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
