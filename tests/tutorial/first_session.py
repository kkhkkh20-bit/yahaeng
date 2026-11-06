"""Standalone optional-lesson fixtures with real controls and active AI.
The fixed clock verifies gameplay and input; it is not a device FPS benchmark.
"""
import asyncio,json,sys,threading,os
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage, continue_episode, spend_episode_points
R=Path(__file__).resolve().parents[2];O=R/os.environ.get('YH_LESSON_DIR','build/tutorial-validation');O.mkdir(parents=True,exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else None;PREFIX=(sys.argv[2]+'-')if len(sys.argv)>2 else''
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
DRIVER='''()=>{
 const G=__game;window.lessonTrace=[];const check=(v,m)=>{if(!v)throw Error(m+' '+JSON.stringify({stage:G.STAGE.id,step:G.S.tutI,at:[G.S.player.x/48,G.S.player.y/48],choices:G.envChoices().map(a=>[a.k,a.label,a.c?.outfit]),selected:G.envAction()?.k,outfit:G.S.player.outfit,noise:G.S.noises,mode:G.S.player.mode,stepT:G.S.player.stepT,guard:G.S.guards.map(g=>[g.state,g.x/48,g.y/48,g.a,g.seen]),trace:lessonTrace}));};
 const tick=(n=1)=>{for(let i=0;i<n;i++){if(G.S.over)break;G.update(1/60);G.updateDialog(1/60);}check(!G.S.over||G.S.exitOpen&&!G.S.guards.some(g=>g.state==='ALERT'),'unexpected failure');};
 const render=()=>{const t=G.S.t;G.benchDraw(1);G.S.t=t;};
 const key=(code,on)=>window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}));
 const idle=()=>{for(let i=0;G.actionBusy()&&i<600;i++)tick();check(!G.actionBusy(),'action stuck');tick(5);render();};
 window.lesson={G,check,tick,render,key,idle};
}'''
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  browser=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE and BASE.startswith('https:')else None)
  for mobile in [False,True]:
   page=await browser.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await open_game(page,BASE or f'http://127.0.0.1:{server.server_port}/build/preview_city.html?nostats&tone=ink');await page.evaluate(DRIVER)
   await standalone_stage(page,'tB');assert await page.evaluate('__game.STAGE.id')=='tB'
   await page.evaluate('lesson.tick(30);lesson.render()')
   movement_cdp=await page.context.new_cdp_session(page)
   async def walk(x,y):
    for attempt in range(900):
     state=await page.evaluate('({x:__game.S.player.x,y:__game.S.player.y,over:__game.S.over})')
     dx=x-state['x'];dy=y-state['y']
     if state['over']or abs(dx)<4 and abs(dy)<4:break
     vx=(1 if dx>0 else -1)if abs(dx)>4 else 0;vy=0 if vx else(1 if dy>0 else -1)
     distance=abs(dx)if vx else abs(dy);frames=max(1,min(12,int(distance/3)))
     if mobile:
      await movement_cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':520}]})
      await movement_cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':65+vx*28,'y':520+vy*28}]})
     else:await page.keyboard.down('ArrowRight'if vx>0 else'ArrowLeft'if vx<0 else'ArrowDown'if vy>0 else'ArrowUp')
     await page.evaluate('(n)=>lesson.tick(n)',frames)
     if mobile:await movement_cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
     else:await page.keyboard.up('ArrowRight'if vx>0 else'ArrowLeft'if vx<0 else'ArrowDown'if vy>0 else'ArrowUp')
    else:raise AssertionError(('walk blocked',x,y,state))
    await page.evaluate('lesson.tick(3);lesson.render()')

   async def step(name,code):
    try:await page.evaluate('()=>{const {G,check,tick,render,key,idle}=lesson;'+code+';render();}')
    except Exception:
     await page.screenshot(path=str(O/f'failure-{mobile}.png'));raise
    info=await page.evaluate('({name:'+json.dumps(name)+',stage:__game.STAGE.id,step:__game.S.tutI,t:__game.S.t,hp:__game.S.player.hp,hidden:__game.S.player.hidden,at:[__game.S.player.x/48,__game.S.player.y/48],guard:__game.S.guards[0]?.state})');await page.evaluate('(o)=>lessonTrace.push(o)',info)
    assert await page.evaluate('(()=>{const e=document.querySelector("#objective");return e.clientHeight>=e.scrollHeight-1})()'),'tutorial text is clipped'
    await page.screenshot(path=str(O/f'{PREFIX}{"touch"if mobile else"pc"}-{name}.png'));print('PASS',mobile,name,info,flush=True)
   async def press(code,button,n=4):
    if mobile:
     box=await page.locator('#'+button).bounding_box();await page.touchscreen.tap(box['x']+box['width']/2,box['y']+box['height']/2)
    else:await page.keyboard.down(code)
    await page.evaluate('(n)=>lesson.tick(n)',n)
    if not mobile:await page.keyboard.up(code)
    await page.evaluate('lesson.idle()')
   await press('Control','btnCrouch')
   await walk(4.5*48,10.5*48)
   await step('skill-reminder','check(!G.S.exitOpen&&document.getElementById("btnPause").classList.contains("lesson-cue"),"no skill lesson cue")')
   if mobile:await page.tap('#btnPause')
   else:await page.keyboard.press('k')
   if mobile:await page.tap('#btnSkillsPause')
   assert await page.locator('#skillDetail').is_hidden()
   await page.click('[data-select="quietStep"]');await page.click('[data-learn="quietStep"]');await page.click('.skill-detail-close');await page.click('#btnSkillsBack')
   if mobile:await page.tap('#btnResume')
   await step('skill-learned','tick(30);check(G.S.tutI===2&&G.skillSpent(G.loadSkillTree())===1,"skill purchase did not advance lesson")')
   await step('move','check(G.S.tutI===2&&G.nextGoal().text.includes("일어서기")&&document.getElementById("btnCrouch").classList.contains("lesson-cue"),"early crouch has no recovery instruction")')
   await press('Control','btnCrouch');await step('stand-recovery','check(G.S.player.mode!=="sneak"&&G.S.tutI===2,"standing recovery")')
   # PC keyboard; mobile uses the actual left touch joystick to produce run footsteps.
   if mobile:
    cdp=await page.context.new_cdp_session(page)
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':530}]})
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':110,'y':530}]})
    await page.evaluate('for(let n=0;n<90&&__game.S.tutI===2;n++)lesson.tick()');await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:await page.evaluate('lesson.key("ShiftLeft",true);lesson.key("ArrowRight",true);for(let n=0;n<90&&__game.S.tutI===2;n++)lesson.tick();lesson.key("ArrowRight",false);lesson.key("ShiftLeft",false)')
   await step('sound-run','check(G.S.tutI===3,"run was not a real noisy step")')
   if mobile:await page.tap('#btnCrouch')
   else:await page.keyboard.press('Control')
   await walk(4.5*48,10.5*48)
   await step('sound-quiet','check(G.S.tutI===4,"quiet movement")')
   await walk(6.5*48,10.5*48)
   await step('observe','tick(75);check(G.S.tutI===5,"observe the vision field")')
   # Verify that the bush is in a real sight field, rather than a safe decorative corner.
   await walk(9.5*48,10.5*48)
   await step('bush','check(G.S.tutI===6&&G.S.player.hidden,"bush concealment");const S=G.S,P=S.player,g=S.guards[0];check(G.canSee(g,P.x,P.y,G.lightAt(P.x,P.y),false,1,0)>0,"bush is not in vision");check(G.canSee(g,P.x,P.y,G.lightAt(P.x,P.y),true,1,0)===0,"concealment not applied")')
   if mobile:await page.tap('#btnTool')
   else:await page.keyboard.press('g')
   await step('heard','tick(5);check(G.S.tutI===7&&G.S.lessonWhistle.heard,"whistle not heard");check(G.S.guards[0].why==="heard"&&!G.S.guards[0].seen,"hearing became visual detection")')
   await walk(6*48,10.5*48)
   await step('escape-vision','check(G.S.tutI===8,"quiet escape")')
   await walk(3.5*48,14.5*48)
   await step('escape','tick(5);check(G.S.over&&G.S.exitOpen,"first lesson did not complete")')
   # Standalone lesson coverage; the separate fresh journey checks canonical continuation.
   await page.wait_for_timeout(650);assert await page.locator('#skillScreen').is_visible();await standalone_stage(page,'t0',False);await page.evaluate('lesson.tick(10);lesson.render()');assert await page.evaluate('__game.STAGE.id')=='t0'
   if not await page.evaluate('__game.input.sneakToggle'):
    if mobile:await page.tap('#btnCrouch')
    else:await page.keyboard.press('Control')
   await walk(7.5*48,10.5*48)
   await step('conceal','check(G.S.tutI===1&&G.S.player.hidden,"second lesson foliage")')
   await walk(10.5*48-28,10.5*48)
   await step('rear','check(G.S.tutI===2&&!G.S.player.hidden&&G.attackAction().k!=="none","close rear contact")')
   await press('z','btnAct');await page.evaluate('lesson.tick(30)')
   await step('ko','check(G.S.tutI===3&&G.S.corpses[0].ko&&G.S.stats.kills===0,"short press did not KO");check(!G.S.player.disguise,"basic lesson forces disguise")')
   await press('x','btnCarry');await step('carry','check(G.S.tutI===4&&G.S.player.carrying,"carry lesson")')
   await press('x','btnCarry');await step('drop-recovery','check(!G.S.player.carrying&&G.S.tutI===4&&G.nextGoal().x===G.S.corpses[0].x,"dropped body loses guidance")')
   await press('x','btnCarry');await step('carry-again','check(!!G.S.player.carrying&&G.S.tutI===4,"cannot recover dropped body")')
   await walk(7.5*48,10.5*48)
   await press('x','btnCarry');await step('stash','check(G.S.tutI===5&&G.S.corpses[0].hidden,"foliage storage lesson")')
   await walk(20.5*48,10.5*48)
   await step('complete','tick(5);check(G.S.over&&G.S.exitOpen,"interaction lesson incomplete")')
   await page.wait_for_timeout(650);await standalone_stage(page,'tC',False);assert await page.evaluate('__game.STAGE.id')=='tC';assert not await page.locator('#brief').is_visible()
   await step('security-next','tick(5);check(G.STAGE.securityLesson&&!G.S.over,"security rehearsal does not follow basic takedown")')
   # The standalone security journey completes the new lesson. Direct contract
   # fixtures still verify that lesson-only controls do not leak into a contract.
   await page.click('#btnPause');await page.click('#btnMenu2');assert await page.locator('#intro').is_visible();await standalone_stage(page,'m2');assert await page.locator('#brief').is_visible();await page.click('#btnBrGo')
   for _ in range(12):
    if not await page.evaluate('__game.DLG.modal'):break
    if mobile:await page.tap('#dlg')
    else:await page.keyboard.press('Space')
   await step('contract','tick(5);check(!G.DLG.modal&&!document.body.classList.contains("perception-lesson")&&!document.body.classList.contains("tutorial-lesson")&&!document.body.hasAttribute("data-lesson")&&getComputedStyle(document.getElementById("btnGrab")).visibility==="visible","lesson controls leaked into contract")')
   assert not errors,errors
   (O/f'{PREFIX}{"touch"if mobile else"pc"}.json').write_text(json.dumps(await page.evaluate('lessonTrace'),ensure_ascii=False,indent=2));await page.close()
  await browser.close()
 server.shutdown()
if __name__=='__main__':asyncio.run(main())
