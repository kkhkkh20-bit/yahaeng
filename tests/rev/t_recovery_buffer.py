"""Late mobile cleanup taps follow only the completed victim, with cancellation."""
import asyncio,json,sys,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/world-v158';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else (R/'build/preview_city.html').as_uri();NAME=sys.argv[2]if len(sys.argv)>2 else 'recovery-input'
SETUP='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.child&&!g.target);S.guards=[g];S.cams=[];S.facOn=false;S.t=10;S.fade=0;Object.assign(P,{x:1584,y:1008,fl:0,z:0,a:0,vx:0,vy:0,captive:null,carrying:null,hide:null,hidden:false,cover:null,snap:null,strikeT:0,killAnim:null,trav:null,jump:null,lunge:null,grabIn:null,interact:null,hp:3});G.input.sneakToggle=false;G.input.joy=null;Object.assign(g,{x:P.x+28,y:P.y,fl:0,z:0,a:0,target:false,elite:false,civ:false,dog:false,state:'PATROL',seen:false,meter:0});G.setLayer(0);window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01){S.t+=.01;G.updatePlayer(.01);G.updateKoHold();G.runTimers();}};}'''
async def main():
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(**({"proxy":{"server":os.environ["HTTPS_PROXY"]}}if BASE.startswith("https:")and os.environ.get("HTTPS_PROXY")else{}))
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE);await q.wait_for_function('!!__game');await q.wait_for_function('__game.prBench().n>0');cdp=await q.context.new_cdp_session(q)
   async def tap(key,button):
    if mobile:
     await q.evaluate('__game.updateHUD(true)');r=await q.locator('#'+button).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await q.keyboard.press(key)
   async def scene(at=1):
    await q.evaluate(SETUP);await q.evaluate("Object.assign(__game.S.player,{disguise:'sam',outfit:'crew'})");await tap('z','btnAct');await q.evaluate('s=>tick(s)',at)
   await scene();before=await q.evaluate('({remaining:__game.S.player.strikeT,busy:__game.actionBusy()})');assert .1<before['remaining']<.2,before;await tap('x','btnCarry');assert await q.evaluate('!!__game.S.player.recoveryQueue');await q.evaluate('__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(1)');await q.screenshot(path=str(O/f'{NAME}-{"mobile"if mobile else"pc"}-queued.png'));await q.evaluate('tick(.4)');assert await q.evaluate('__game.S.player.carrying===__game.S.corpses[0]&&!__game.S.player.recoveryQueue&&__game.S.corpses.length===1&&!__game.S.stats.kills');await q.evaluate('__game.updateHUD(true);__game.benchDraw(1)');await q.screenshot(path=str(O/f'{NAME}-{"mobile"if mobile else"pc"}-carried.png'));passed=['late tap carries exact KO victim once']
   await scene();await tap('x','btnCarry');await q.click('#btnPause');await q.click('#btnResume');await q.evaluate('tick(.4)');assert await q.evaluate('!__game.S.player.carrying&&!__game.S.player.recoveryQueue');passed.append('pause cancels intention')
   await scene();await tap('x','btnCarry');await q.keyboard.down('ArrowLeft');await q.evaluate('tick(.4)');await q.keyboard.up('ArrowLeft');assert await q.evaluate('!__game.S.player.carrying&&!__game.S.player.recoveryQueue');passed.append('movement cancels intention')
   await scene();await tap('x','btnCarry');await q.evaluate('__game.S.player.hurtT=2;tick(.4)');assert await q.evaluate('!__game.S.player.carrying&&!__game.S.player.recoveryQueue');passed.append('damage cancels intention')
   await scene();await tap('x','btnCarry');await q.evaluate('const S=__game.S;S.corpses[0].stashed=true;S.corpses.push({...S.corpses[0],stashed:false});tick(.4)');assert await q.evaluate('!__game.S.player.carrying&&!__game.S.player.recoveryQueue');passed.append('missing victim does not switch bodies')
   await scene(.6);await tap('x','btnCarry');assert not await q.evaluate('!!__game.S.player.recoveryQueue');await q.evaluate('tick(.8)');assert not await q.evaluate('!!__game.S.player.carrying');passed.append('earlier unrelated tap is not buffered')
   # The same late action must wear a useful uniform, never hide it first.
   for shortcut in [False,True]:
    await scene();await q.evaluate("Object.assign(__game.S.player,{disguise:null,outfit:null});__game.updateHUD(true)")
    await tap('y'if shortcut else'x','btnDress'if shortcut else'btnCarry')
    assert await q.evaluate("__game.S.player.recoveryQueue?.kind==='dress'&&!__game.S.player.outfit&&!__game.S.player.carrying")
    await q.evaluate('tick(.4)');assert await q.evaluate("__game.S.player.interact?.a.k==='dress'&&!__game.S.corpses[0].stripped&&!__game.S.player.carrying")
    await q.evaluate('tick(3.1)');assert await q.evaluate("__game.S.player.outfit==='crew'&&__game.S.corpses[0].stripped&&!__game.S.player.carrying&&__game.S.stats.dressed===1")
   passed.append('late action and clothing shortcut both dress the exact victim through a full action')
   await scene();await q.evaluate("Object.assign(__game.S.player,{disguise:null,outfit:null})");await tap('x','btnCarry');await q.evaluate('__game.S.corpses[0].stripped=true;tick(.4)')
   assert await q.evaluate('!__game.S.player.interact&&!__game.S.player.carrying&&!__game.S.player.recoveryQueue')
   passed.append('invalidated clothing never changes into carrying')
   assert not errors,errors;reports.append({'mobile':mobile,'checks':passed,'errors':errors,'method':'Actual keyboard/CDP touch in a controlled single-victim timing scene, not a campaign playthrough.'});print('PASS recovery buffer',mobile,passed,flush=True);await q.close()
  await b.close()
 (O/f'{NAME}.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
asyncio.run(main())
