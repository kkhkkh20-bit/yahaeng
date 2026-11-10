"""Responsive title/settings fixtures. Saved returning state is controlled, not earned gameplay."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/front-ui-v256';O.mkdir(parents=True,exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for name,w,h in [('desktop',1440,900),('mobile',390,844),('small',320,568),('landscape',844,390),('short',390,640)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=name!='desktop',is_mobile=name!='desktop');errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&(!window.__boot||window.__boot.state.ready)');await q.evaluate('document.fonts.ready');await q.locator('.title-bg img').evaluate('(i)=>i.decode()')
   await q.screenshot(path=str(O/f'{name}-title.png'),full_page=True)
   bounds=await q.evaluate('''()=>({page:document.getElementById('intro').scrollWidth,h1:(()=>{const r=document.querySelector('#intro h1').getBoundingClientRect();return[r.x,r.y,r.right,r.bottom]})(),buttons:[...document.querySelectorAll('#intro button:not([hidden])')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id,rect:[r.x,r.y,r.right,r.bottom],hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})})''')
   assert bounds['page']<=w+1,bounds
   assert bounds['h1'][1]>=0 and bounds['h1'][2]<=w,bounds
   assert bounds['buttons'][0]['hit'] and bounds['buttons'][0]['rect'][3]<h,bounds
   await q.click('#btnHelp');await q.screenshot(path=str(O/f'{name}-settings.png'),full_page=True);await q.click('#btnHelpBack')
   await q.evaluate("localStorage.setItem('yahaeng.ch',JSON.stringify({tB:{_clear:true},p0:{_clear:true}}))");await q.reload();await q.wait_for_function('!!__game');await q.screenshot(path=str(O/f'{name}-returning.png'),full_page=True)
   assert await q.locator('#btnNewCampaign').is_visible();assert not errors,errors
   returning=await q.locator('#intro').evaluate('''s=>[...s.querySelectorAll('button:not([hidden])')].map(e=>{const r=e.getBoundingClientRect();return{id:e.id||e.textContent.trim(),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})''')
   assert all(r['x']>=0 and r['y']>=0 and r['right']<=w+1 and r['bottom']<=h+1 and r['height']>=44 and r['hit'] for r in returning),(name,returning)
   assert await q.locator('#btnQuick .title-start-copy small').inner_text(),'Continue action loses episode context'
   rows.append({'name':name,'bounds':bounds,'errors':errors});print('PASS front layout',name,flush=True);await q.close()
  await b.close()
 (O/'layout.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
