"""Normal-time native input: compact HUD, recoverable instructions and safe reading."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright

R=Path(__file__).resolve().parents[2];O=R/'build/play-space-v209';O.mkdir(exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  browser=await p.chromium.launch()
  for width,height,touch in [(390,640,True),(390,844,True),(844,390,True),(1280,800,False)]:
   q=await browser.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch);errors=[]
   q.on('pageerror',lambda e:errors.append(str(e)))
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game&&(!window.__boot||window.__boot.state.ready)')
   await q.click('#btnQuick');await q.locator('#objectiveSummary').wait_for(state='visible')
   await q.screenshot(path=str(O/f'{width}-{height}-entry.png'))
   # The existing header opens the full explanation and stops simulation.
   await q.click('#hud .obj');await q.locator('#episodeRadio').wait_for(state='visible')
   assert await q.locator('#objective').is_visible()
   assert '제비가 사라졌습니다' in await q.inner_text('#episodeRadioText')
   t=await q.evaluate('__game.S.t');await q.wait_for_timeout(400)
   assert abs(await q.evaluate('__game.S.t')-t)<.001,'reading leaves enemies running'
   await q.screenshot(path=str(O/f'{width}-{height}-reading.png'))
   await q.click('#hud .obj');await q.locator('#episodeRadio').wait_for(state='hidden')
   before=await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y})')
   if touch:
    cdp=await q.context.new_cdp_session(q);x=65;y=height-100
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+30,'y':y,'id':1}]})
    await q.wait_for_timeout(1250)
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    await q.keyboard.down('ArrowRight');await q.wait_for_timeout(1250);await q.keyboard.up('ArrowRight')
   await q.wait_for_timeout(250)
   after=await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y,step:__game.S.tutI})')
   assert after['x']>before['x']+40,(before,after)
   assert after['step']>=1,after
   assert (await q.locator('#episodeRadio').is_visible())==(height>480),'new action beat is missing or crowds a short viewport'
   if height>480:
    assert await q.locator('#episodeRadio').evaluate('e=>e.closest(".obj").contains(e)'), 'radio floats over the world'
    assert '올빼미' in await q.locator('#episodeRadio').inner_text(), 'self-talk has wrong speaker'
   layout=await q.evaluate('''()=>{const b=document.querySelector('#hud .obj').getBoundingClientRect(),s=document.getElementById('stealth').getBoundingClientRect();return{header:[b.x,b.y,b.width,b.height],statusBottom:s.bottom,summary:document.getElementById('objectiveSummary').textContent}}''')
   if touch:
    assert layout['header'][3]<112,layout
    assert layout['statusBottom']<height*.30,layout
    assert not await q.locator('.hud-portrait').is_visible()
   assert '풀숲' in layout['summary'],layout
   await q.screenshot(path=str(O/f'{width}-{height}-moving.png'))
   # The short beat expires while idle, and remains readable on demand.
   await q.wait_for_timeout(4800);assert not await q.locator('#episodeRadio').is_visible()
   await q.click('#hud .obj');assert '몸을 낮추면' in await q.inner_text('#episodeRadioText')
   await q.click('#hud .obj')
   # Separate stage-entry fixture for the previously reproduced wrong CCTV radio.
   await q.evaluate("()=>{__game.start(__game.STAGES.findIndex(s=>s.id==='e1'));while(__game.DLG.modal)__game.advanceDialog();Object.assign(__game.S.player,{x:1296,y:360,fl:1,outfit:'crew'});__game.S.compoundDarkUsed=true;__game.setLayer(1);__game.syncEpisodeRadio()}")
   await q.wait_for_timeout(300)
   assert (await q.locator('#episodeRadio').is_visible())==(height>480),'entry message crowds short viewport'
   await q.wait_for_timeout(4700)
   assert not await q.locator('#episodeRadio').is_visible(),'entry message has no timeout'
   await q.click('#hud .obj')
   assert '카메라 뒤에서 전선을 끊으세요' in await q.inner_text('#episodeRadioText')
   assert '기절시킨 다음' not in await q.inner_text('#episodeRadioText')
   await q.screenshot(path=str(O/f'{width}-{height}-camera-instructions.png'))
   await q.click('#hud .obj')
   assert not errors,errors
   rows.append({'viewport':[width,height],'touch':touch,'movement':after['x']-before['x'],'layout':layout,'errors':errors})
   print('PASS play space',width,height,layout,flush=True);await q.close()
  await browser.close()
 (O/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
