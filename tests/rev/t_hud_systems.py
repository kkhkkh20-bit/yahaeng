"""Game-clock consistency, truthful HUD and input-safe inspection panels."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v139';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await q.wait_for_function('!!__game',polling=100)
   timing=await q.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)},samples=[];
    for(const fps of [60,30,15,10]){G.start(G.STAGES.findIndex(s=>s.id==='tB'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;S.guards=[];S.cams=[];G.input.walkLock=true;G.input.sneakToggle=false;S.keys.ArrowRight=true;const t=S.t,x=S.player.x;for(let i=0;i<fps;i++)G.advanceGameFrame(1/fps);samples.push({fps,time:S.t-t,travel:S.player.x-x});}
    let ticks=0,t=G.S.t;Object.defineProperty(G.S,'t',{configurable:true,get:()=>t,set:v=>{ticks++;t=v;}});G.advanceGameFrame(.0167);Object.defineProperty(G.S,'t',{configurable:true,writable:true,value:t});check(ticks===1,'nominal 60 fps doubles simulation work');check(samples.every(s=>Math.abs(s.time-1)<.001),'game clock slows below 20 fps');check(Math.max(...samples.map(s=>s.travel))-Math.min(...samples.map(s=>s.travel))<.1,'movement speed depends on rendering FPS');const before=G.S.t;G.advanceGameFrame(4);check(G.S.t-before<=.121,'long stall fast-forwards the mission');return samples;}''')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;S.cams=[];S.facOn=false;S.fade=0;G.updateHUD(true);__step(2);}''')
   if touch:await q.locator('#hud .obj').tap()
   else:await q.locator('#hud .obj').click()
   a=await q.evaluate('({t:__game.S.t,hp:__game.S.player.hp,guards:__game.S.guards.map(g=>[g.x,g.y])})');await q.evaluate('__step(120)');z=await q.evaluate('({t:__game.S.t,hp:__game.S.player.hp,guards:__game.S.guards.map(g=>[g.x,g.y])})');assert a==z,('expanded objectives continue the world',a,z);assert await q.evaluate('__game.hudInspecting()');await q.screenshot(path=str(O/f'objectives-{"touch"if touch else"pc"}.png'))
   x0=await q.evaluate('__game.S.player.x')
   if touch:
    cdp=await q.context.new_cdp_session(q);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':65,'y':520}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':110,'y':520}]});await q.evaluate('__step(20)');await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    await q.keyboard.down('ArrowRight');await q.evaluate('__step(20)');await q.keyboard.up('ArrowRight')
   assert not await q.evaluate('__game.hudInspecting()');assert await q.evaluate('__game.S.t')>a['t'];assert await q.evaluate('__game.S.player.x')>x0+5,'leaving objectives does not move the player';assert not await q.locator('#hud .obj').evaluate('e=>e.classList.contains("open")')
   await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.guards=[];const l=S.lamps.find(l=>l.mount?.kind==='pole');const at=G.lampControl(l);Object.assign(P,{x:at.x,y:at.y,fl:0,z:0,trav:null,jump:null,interact:null});G.updateHUD(true);__step(2);if(G.envChoices().length<2)throw Error('no actual overlapping pole and light');}''')
   if touch:await q.locator('#btnCycle').tap()
   else:await q.locator('#btnCycle').click()
   assert await q.locator('#envPicker').is_visible();await q.screenshot(path=str(O/f'picker-{"touch"if touch else"pc"}.png'));a=await q.evaluate('__game.S.t');await q.evaluate('__step(120)');assert await q.evaluate('__game.S.t')==a,'action picker continues world time'
   if not touch:
    first=await q.evaluate('document.activeElement.dataset.envToken');await q.keyboard.press('ArrowDown');assert await q.evaluate('document.activeElement.dataset.envToken')!=first;assert await q.locator('#envPicker').is_visible()
   option=q.locator('#envPicker [data-env-token]').first;label=await option.inner_text()
   if touch:await option.tap()
   else:await option.click()
   assert not await q.locator('#envPicker').is_visible();assert await q.evaluate('__game.S.t')==a,'selecting an action executes it';await q.evaluate('__step(10)');assert await q.evaluate('__game.S.t')>a
   # Seeing the actor must stop the escape countdown; hidden places remain searchable.
   await q.evaluate('''()=>{const G=__game,S=G.S;S.alevel=3;S.unseenT=7;const g={...S.guards[0],id:900,state:'ALERT',seen:true,x:S.player.x+100,y:S.player.y};S.guards=[g];G.updateHUD(true);}''');assert '시야 끊기'in await q.locator('#alertWord').inner_text()
   await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.guards=[];const h=S.hides.find(h=>h.type==='box');P.hide=h;P.x=h.x;P.y=h.y;G.input.tool='stone';P.stones=3;G.input.padWhistle=false;G.updateHUD(true);}''');assert not await q.locator('#btnTool').evaluate('e=>e.classList.contains("ready")'),'throwing tool appears usable inside container'
   await q.evaluate('__game.input.padWhistle=true;__game.S.whistleT=0;__game.updateHUD(true)');assert await q.locator('#btnTool').evaluate('e=>e.classList.contains("ready")'),'hiding incorrectly blocks whistle lure'
   assert not errors,errors;data={'touch':touch,'timing':timing,'objectivePause':True,'movementResumes':True,'pickerPause':True,'selectionDoesNotExecute':True,'selected':label,'keyboardNavigation':not touch,'chaseLabelTruthful':True,'toolContextMatches':True,'errors':errors};(O/f'systems-{"touch"if touch else"pc"}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));print('PASS HUD systems',data,flush=True);await q.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
