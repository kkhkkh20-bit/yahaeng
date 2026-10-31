"""Real overlay controls, code-entry geometry, input isolation, and knowledge-correct minimap."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
START="""()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.fade=0;G.S.guards=[];G.S.cams=[];G.S.facOn=false;G.updateHUD(true)}"""
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(320,480),(390,480),(320,568),(390,844),(568,320),(844,390),(1280,800)]:
   for ink in [False,True]:
    pg=await b.new_page(viewport={'width':w,'height':h},has_touch=w!=1280);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats'+('&tone=ink'if ink else''));await pg.wait_for_function('!!window.__game',polling=100);await pg.evaluate(START)
    # Dialogue must consume every gameplay shortcut, including aim and map.
    await pg.evaluate("__game.say([['aide','확인.']],true)")
    count=await pg.evaluate('__game.S.player.kunai');sneak=await pg.evaluate('__game.input.sneakToggle')
    for key in ['KeyF','KeyM','KeyG','ControlLeft','ArrowRight']:await pg.keyboard.press(key)
    assert await pg.evaluate('!__game.input.aiming&&document.querySelector("#tacBanner").hidden&&Object.values(__game.S.keys).every(v=>!v)')
    assert await pg.evaluate('__game.S.player.kunai')==count and await pg.evaluate('__game.input.sneakToggle')==sneak
    await pg.keyboard.press('Escape')
    # Opening pause/map while aiming clears input without spending ammunition.
    await pg.keyboard.down('KeyF');assert await pg.evaluate('!!__game.input.aiming')
    await pg.locator('#btnPause').click();assert await pg.evaluate('!__game.input.aiming&&!__game.input.joy&&Object.keys(__game.S.keys).length===0')
    await pg.keyboard.up('KeyF');await pg.locator('#btnResume').click();assert await pg.evaluate('__game.S.player.kunai')==count
    await pg.evaluate("__game.S.keys.ArrowRight=true;__game.input.joy={x:1,y:0,mag:1};__game.startAim('key');__game.toggleTactical()")
    assert await pg.evaluate('!__game.input.aiming&&!__game.input.joy&&Object.keys(__game.S.keys).length===0')
    await pg.evaluate('__game.toggleEnvPicker()');assert await pg.locator('#envPicker').is_hidden()
    await pg.evaluate('__game.input.joy={x:1,y:0,mag:1};__game.S.keys.ArrowRight=true;__game.toggleTactical()')
    assert await pg.evaluate('!__game.input.joy&&Object.keys(__game.S.keys).length===0'),'map pan input survives return to play'
    if w==1280:
     # An in-progress takedown continues after pause; its old hold cannot become lethal.
     await pg.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.target&&!g.elite&&!g.dog);Object.assign(P,{x:28.5*48,y:21.5*48,fl:0,z:0,a:0});Object.assign(g,{x:P.x+60,y:P.y,fl:0,z:0,a:0,state:'PATROL',seen:false,meter:0});S.guards=[g];S.cams=[];S.facOn=false;G.setLayer(0);G.updateHUD(true)}")
     await pg.keyboard.down('KeyZ');assert await pg.evaluate('__game.actionBusy()'),'real takedown did not start'
     await pg.locator('#btnPause').click();await pg.keyboard.up('KeyZ');await pg.locator('#btnResume').click()
     await pg.evaluate("()=>{const G=__game,S=G.S;for(let i=0;i<180;i++){S.t+=1/60;G.updatePlayer(1/60);G.updateKoHold();G.runTimers()}if(S.stats.kills||!S.corpses.some(c=>c.g===S.guards[0]&&c.ko))throw Error('pause skips takedown or turns it lethal')}")
    # Actual code door, wrong input feedback, focus loop and correct unlock.
    await pg.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.code));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,d=S.doors.find(d=>d.keyLock==='code');S.guards=[];S.cams=[];S.fade=0;S.player.x=d.x;S.player.y=d.y;window.testDoor=d;G.actPrimary({k:'keypad',d,viaZ:true});G.updateHUD(true)}")
    assert await pg.locator('#keypad').is_visible()
    panel=await pg.locator('#keypad .kp').bounding_box();assert panel and panel['x']>=0 and panel['y']>=0 and panel['x']+panel['width']<=w and panel['y']+panel['height']<=h,panel
    for k in ['1','ok','x']:
     r=await pg.locator(f'#keypad [data-k="{k}"]').bounding_box();assert r['height']>=44 and r['y']>=0 and r['y']+r['height']<=h,(k,r)
    await pg.keyboard.press('Shift+Tab');assert await pg.locator('#keypad [data-k="x"]').evaluate('e=>e===document.activeElement')
    await pg.keyboard.press('Tab');assert await pg.locator('#keypad [data-k="1"]').evaluate('e=>e===document.activeElement')
    code=await pg.evaluate('__game.STAGE.code');bad=('0'if set(code)!={'0'}else'1')*len(code)
    for digit in bad:await pg.keyboard.press('Digit'+digit)
    assert '불일치' in await pg.locator('#kpStatus').inner_text();assert await pg.evaluate('testDoor.locked')
    for digit in code:await pg.locator(f'#keypad [data-k="{digit}"]').click()
    assert await pg.evaluate('__game.S.keypad.unlocking');await pg.evaluate('''()=>{for(let i=0;i<20;i++){__game.S.t+=.02;__game.runTimers()}}''')
    assert await pg.locator('#keypad').is_hidden() and await pg.evaluate('!testDoor.locked&&!document.body.classList.contains("keypadopen")')
    # A loss or a restart while code-entry is open cannot leave an invisible input blocker.
    await pg.evaluate('__game.openKeypad(testDoor);__game.endGame(false,"검사")');assert await pg.locator('#keypad').is_hidden();await pg.evaluate(START)
    await pg.evaluate('''()=>{const G=__game,S=G.S,P=S.player;Object.assign(P,{x:28.5*48,y:21.5*48,fl:0,z:0});G.setLayer(0);const g={x:P.x+60,y:P.y,fl:0,z:0,state:'ALERT',target:false};if(!G.miniGuardVisible(g))throw Error('visible enemy absent');g.z=1;if(G.miniGuardVisible(g))throw Error('roof enemy leaks');g.z=0;g.fl=1;if(G.miniGuardVisible(g))throw Error('other floor leaks');g.fl=0;let wall=null;for(let dy=-8;dy<8&&!wall;dy++)for(let dx=-8;dx<8;dx++){const x=P.x+dx*48,y=P.y+dy*48;if(Math.hypot(x-P.x,y-P.y)<500&&!G.los(P.x,P.y,x,y,false)){wall={x,y};break}}if(!wall)throw Error('no real occluded sample');Object.assign(g,wall);if(G.miniGuardVisible(g))throw Error('unseen alerted guard leaks through walls');g.target=true;if(!G.miniGuardVisible(g))throw Error('known target lost');}''')
    # Overlapping props: selection stays a choice and never opens under the tactical map.
    await pg.evaluate('''()=>{const G=__game,S=G.S,P=S.player;for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];S.vehicles=null;S.camRoom=null;S.lamps=[{x:P.x+20,y:P.y,fl:0,z:0,off:false,outdoor:false,r:100},{x:P.x-20,y:P.y,fl:0,z:0,off:false,outdoor:false,r:100}];S.t+=.02;for(let i=0;i<160;i++)G.moveCamera(1/60);G.updateHUD(true);G.toggleEnvPicker();}''')
    assert await pg.locator('#envPicker').is_visible()
    notes=await pg.locator('#envPicker button small').all_inner_texts();assert any('왼쪽' in t for t in notes) and any('오른쪽' in t for t in notes),'identical action targets cannot be distinguished'
    assert await pg.locator('#envPicker').evaluate('e=>[...e.querySelectorAll("button")].every(b=>b.getBoundingClientRect().right<=e.getBoundingClientRect().right)'),'picker button overflows panel'
    assert await pg.locator('#envPicker').evaluate('e=>{const a=e.getBoundingClientRect();return [...document.querySelectorAll("#stealth,.pad > button")].filter(b=>b.getBoundingClientRect().width&&getComputedStyle(b).visibility!=="hidden").every(b=>{const r=b.getBoundingClientRect();return !(a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top)})}'),'picker covers stealth or action buttons'
    await pg.evaluate('__game.toggleTactical()');assert await pg.locator('#envPicker').is_hidden();await pg.evaluate('__game.toggleTactical()')
    # The slider's actual keyboard change is visible immediately and persists on reload.
    await pg.locator('#btnPause').click();await pg.locator('#btnSet2').click()
    await pg.locator('#volR').focus();await pg.keyboard.press('ArrowLeft');await pg.locator('#briR').focus();await pg.keyboard.press('ArrowRight')
    assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),'settings horizontal overflow'
    if ink:
     contrast=await pg.locator('#help .ctrl').evaluate(r'e=>{const c=getComputedStyle(e),rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),lum=s=>rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),a=lum(c.color),b=lum(c.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}');assert contrast>=4.5,contrast
    assert await pg.locator('#volValue').inner_text()=='85%' and await pg.locator('#briValue').inner_text()=='105%'
    assert await pg.locator('#volR').get_attribute('aria-valuetext')=='85%'
    await pg.reload();await pg.wait_for_function('!!window.__game',polling=100)
    assert await pg.locator('#volValue').inner_text()=='85%' and await pg.locator('#briValue').inner_text()=='105%'
    await pg.evaluate("localStorage.setItem('yahaeng.best',JSON.stringify({m2:'S'}))");await pg.locator('#btnLedger').click()
    assert '최고 최고' not in await pg.locator('#stageList').inner_text();assert '최고 S' in await pg.locator('#stageList').inner_text()
    assert not errors,errors;print('PASS',w,h,'ink'if ink else'normal','code entry/unlock, input isolation, minimap knowledge, picker, settings, rank',flush=True);await pg.close()
  await b.close()
asyncio.run(main())
