"""Dialogue fits content, stays stable during typing, and supports scroll versus advance."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
SHORT='직원 복장이면 들어갈 수 있어.'
LONG='직원 얼굴을 아는 경호원이 있어. 오래 마주치지 말고 뒤쪽 통로로 들어가. 사무동 금고 비밀번호는 0417이야.'
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(320,568),(360,740),(390,844),(568,320),(844,390),(1280,800)]:
   for ink in [False,True]:
    pg=await b.new_page(viewport={'width':w,'height':h},has_touch=w!=1280);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats'+('&tone=ink'if ink else''));await pg.wait_for_function('!!window.__game',polling=100)
    await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&__game.DLG.modal;i++)__game.advanceDialog()")
    await pg.wait_for_function('(()=>{const c=document.createElement("canvas");return __game.drawFace(c,__game.speakerOf("aide"))})()',polling=100);await pg.evaluate('document.fonts.ready')
    for text in [SHORT,LONG,LONG*15]:
     await pg.evaluate("text=>__game.say([['aide',text]],true)",text);await pg.wait_for_timeout(200)
     before=await pg.locator('#dlg').bounding_box()
     await pg.evaluate('__game.updateDialog(.08)');during=await pg.locator('#dlg').bounding_box()
     await pg.evaluate('__game.advanceDialog()');after=await pg.locator('#dlg').bounding_box()
     assert max(abs(before[k]-during[k])for k in before)<1 and max(abs(before[k]-after[k])for k in before)<1,'typing resizes panel'
     assert after['x']>=0 and after['y']>=0 and after['x']+after['width']<=w and after['y']+after['height']<=h,after
     if text==SHORT:
      short_height=after['height']
      assert after['height']<=116 if w<640 or h<480 else after['height']<=124,after
     assert await pg.locator('#dlgMeasure').get_attribute('aria-hidden')=='true'
     assert await pg.evaluate('''()=>{const d=document.querySelector('#dlg').getBoundingClientRect(),f=document.querySelector('#dlgFaceBox').getBoundingClientRect(),t=document.querySelector('#dlgText').getBoundingClientRect(),n=document.querySelector('#dlgHint').getBoundingClientRect();return f.top>=d.top&&f.bottom<=d.bottom&&f.right<t.left&&t.bottom<=n.top&&n.bottom<=d.bottom}'''),'portrait, text or footer overlap'
     assert await pg.locator('#dlgText').inner_text()==text,'dialogue content truncated'
    # Overflow can actually scroll; swiping does not consume the line.
    await pg.evaluate("()=>{const G=__game;G.say([['aide','비밀번호 0417. '.repeat(150)],['master','다음 대사']],true);G.advanceDialog()}")
    assert await pg.locator('#dlgText').evaluate('e=>e.scrollHeight>e.clientHeight+30')
    box=await pg.locator('#dlgText').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']*.8
    if w==1280:
     await pg.mouse.move(x,y);await pg.mouse.wheel(0,180)
    else:
     cdp=await pg.context.new_cdp_session(pg)
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
     for n in range(1,8):await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-n*6}]})
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    await pg.wait_for_timeout(200)
    assert await pg.locator('#dlgText').evaluate('e=>e.scrollTop>0'),'overflow does not scroll'
    assert await pg.evaluate('__game.DLG.cur.text.startsWith("비밀번호")'),'scroll advances dialogue'
    # A deliberate tap advances once; keyboard still reveals first, advances second.
    await pg.evaluate("__game.say([['aide','확인.'],['master','이동해.']],true);__game.advanceDialog()")
    if w!=1280:await pg.touchscreen.tap(x, (await pg.locator('#dlg').bounding_box())['y']+20)
    else:await pg.locator('#dlgName').click()
    assert await pg.evaluate('__game.DLG.cur.text==="이동해."&&__game.DLG.cur.shown===0'),'tap did not advance exactly once'
    await pg.keyboard.press('Space');assert await pg.evaluate('__game.DLG.cur.shown===__game.DLG.cur.text.length')
    await pg.keyboard.press('Space');assert await pg.locator('#dlg').is_hidden()
    await pg.evaluate("__game.say([[{note:'메모'},'사무동 출입번호 0417']],true);__game.advanceDialog()")
    assert await pg.locator('#dlgFaceBox').is_hidden();assert (await pg.locator('#dlg').bounding_box())['height']<short_height-8,'faceless note keeps blank portrait space'
    assert not errors,errors;print('PASS',w,h,'ink'if ink else'normal','stable content height, portrait alignment, long text scroll, touch/keyboard, note',flush=True);await pg.close()
  await b.close()
asyncio.run(main())
