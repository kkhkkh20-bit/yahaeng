"""Native time/input: independent cinematic radio, stable mission and recoverable instructions."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright

R=Path(__file__).resolve().parents[2];O=R/'build/play-space-v215';O.mkdir(exist_ok=True)
# Detailed screen text (설정 · 화면 글: 자세히): this test checks guidance the minimal default hides.
async def main():
 rows=[]
 async with async_playwright()as p:
  browser=await p.chromium.launch()
  for width,height,touch in [(390,640,True),(390,844,True),(844,390,True),(1280,800,False)]:
   q=await browser.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch);errors=[]
   q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();localStorage.setItem(`yahaeng.guide`,`full`)')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game&&(!window.__boot||window.__boot.state.ready)')
   await q.click('#btnQuick');await q.locator('#episodeRadio').wait_for(state='visible')
   assert not await q.locator('#episodeRadio').evaluate('e=>!!e.closest(".obj")'),'radio is still folded into mission'
   assert '까마귀' in await q.inner_text('#episodeRadioSpeaker')
   assert '제비' in await q.inner_text('#episodeRadioText')
   mission=await q.inner_text('#objectiveSummary');assert '연락 서류' in mission and '탈출' in mission
   await q.screenshot(path=str(O/f'{width}-{height}-entry.png'))
   # Normal transmissions never pause the world or intercept movement.
   t=await q.evaluate('__game.S.t');before=await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y})')
   assert await q.locator('#episodeRadio').evaluate('e=>getComputedStyle(e).pointerEvents')=='none'
   if touch:
    cdp=await q.context.new_cdp_session(q);x=65;y=height-100
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+30,'y':y,'id':1}]})
    await q.wait_for_timeout(1250)
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    await q.keyboard.down('ArrowRight');await q.wait_for_timeout(1250);await q.keyboard.up('ArrowRight')
   await q.wait_for_timeout(850)
   after=await q.evaluate('({x:__game.S.player.x,y:__game.S.player.y,step:__game.S.tutI,t:__game.S.t})')
   assert after['x']>before['x']+40 and after['t']>t+.5,(before,after)
   assert after['step']>=1,after
   assert await q.locator('#episodeRadio').is_visible(),'new command missing in landscape/portrait'
   txt=await q.inner_text('#episodeRadioText');assert '웅크' in txt and '풀숲' in txt,txt  # crouch-to-grass step (v232 copy, touch says 웅크림을 누르고)
   assert await q.inner_text('#objectiveSummary')==mission,'immediate command replaced the mission'
   layout=await q.evaluate('''()=>{const b=document.querySelector('#hud .obj').getBoundingClientRect(),s=document.getElementById('stealth').getBoundingClientRect(),r=document.getElementById('episodeRadio').getBoundingClientRect(),G=__game,P=G.S.player,x=(P.x-G.cam.x)*G.SCALE+innerWidth/2,y=(P.y-G.cam.y)*G.SCALE+innerHeight/2,hit=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return{header:[b.x,b.y,b.width,b.height],statusBottom:s.bottom,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hero:hit(r,{left:x-22,right:x+22,top:y-48,bottom:y+10}),buttons:[...document.querySelectorAll('.pad>button,#btnPause,#quickItems>button')].filter(e=>!e.hidden&&e.getBoundingClientRect().width).filter(e=>hit(r,e.getBoundingClientRect())).map(e=>e.id)}}''')
   assert layout['inside'] and not layout['hero'] and not layout['buttons'],layout
   if touch:
    assert layout['header'][3]<112 and layout['statusBottom']<height*.30,layout
    assert not await q.locator('.hud-portrait').is_visible()
   await q.screenshot(path=str(O/f'{width}-{height}-moving.png'))
   # A command expires once, stays quiet when idle, and can be requested again.
   await q.locator('#episodeRadio').wait_for(state='hidden',timeout=8000)
   await q.wait_for_timeout(1000);assert not await q.locator('#episodeRadio').is_visible()
   await q.locator('#btnRadio').wait_for(state='visible')
   t=await q.evaluate('__game.S.t');await q.click('#btnRadio');await q.locator('#episodeRadio').wait_for(state='visible');await q.wait_for_timeout(150)
   txt=await q.inner_text('#episodeRadioText');assert '웅크' in txt and '풀숲' in txt,txt  # crouch-to-grass step (v232 copy, touch says 웅크림을 누르고)
   assert await q.evaluate('__game.S.t')>t,'radio replay pauses simulation'
   # The existing mission inspector provides deliberate paused reading.
   await q.click('#hud .obj');assert await q.locator('#objective').is_visible()
   t=await q.evaluate('__game.S.t');await q.wait_for_timeout(400)
   assert abs(await q.evaluate('__game.S.t')-t)<.001,'reading leaves enemies running'
   await q.screenshot(path=str(O/f'{width}-{height}-reading.png'))
   await q.click('#hud .obj');await q.locator('#episodeRadio').wait_for(state='hidden')
   # Separate controlled entry fixture: disguise permits walking, never CCTV work.
   await q.evaluate("()=>{__game.start(__game.STAGES.findIndex(s=>s.id==='e1'));while(__game.DLG.modal)__game.advanceDialog();Object.assign(__game.S.player,{x:1296,y:360,fl:1,outfit:'crew'});__game.S.compoundDarkUsed=true;__game.setLayer(1);__game.syncEpisodeRadio()}")
   # v225 copy: '카메라는 공격하거나 물건을 가져가는 걸 찍어. 뒤쪽 전선부터 끊자.'
   await q.locator('#episodeRadio').wait_for(state='visible');txt=await q.inner_text('#episodeRadioText')
   assert '뒤쪽 전선' in txt and '끊' in txt,txt
   assert '공격' in txt and '찍' in txt,txt
   assert '기절시킨 다음' not in await q.inner_text('#episodeRadioText')
   await q.screenshot(path=str(O/f'{width}-{height}-camera-instructions.png'))
   assert not errors,errors
   rows.append({'viewport':[width,height],'touch':touch,'movement':after['x']-before['x'],'layout':layout,'errors':errors})
   print('PASS independent radio and native play',width,height,layout,flush=True);await q.close()
  await browser.close()
 (O/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
