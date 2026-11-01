"""Fresh title-to-contract path with real keyboard / CDP touch input and all NPCs active.
Only time is stepped; player position, inventory, AI and lesson completion are never assigned.
This is a developer first-use review, not a study with new human players.
"""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ['FIRST_SESSION_SHOTS']) if os.environ.get('FIRST_SESSION_SHOTS') else None
TICK='''n=>{const G=__game;for(let i=0;i<n;i++){if(G.DLG.modal)G.updateDialog(1/60);else if(!G.S.over){G.update(1/60);G.updateDialog(1/60);}}G.updateHUD(true);}'''
STATE='''()=>{const G=__game,S=G.S,P=S.player,g=S.guards.find(g=>g.tag==='yard');return{x:P.x,y:P.y,stage:G.STAGE.id,step:S.tutI||0,over:S.over,hp:P.hp,detected:S.stats.detected,exit:S.exitOpen,modal:G.DLG.modal,busy:G.actionBusy(),outfit:P.outfit,captive:!!P.captive,carrying:!!P.carrying,warning:g?.state==='WARN',goal:G.nextGoal(),text:document.querySelector('#objective').textContent,kills:S.stats.kills};}'''
async def exercise(b,mobile,bypass=False):
 pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=117;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
 await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100);await pg.locator('#btnQuick').click();cdp=await pg.context.new_cdp_session(pg)
 async def tick(n):await pg.evaluate(TICK,n)
 async def state():return await pg.evaluate(STATE)
 async def shot(name):
  if OUT and not bypass:
   OUT.mkdir(parents=True,exist_ok=True);await pg.evaluate('__game.benchDraw(1)');await pg.screenshot(path=str(OUT/(('mobile-'if mobile else'pc-')+name+'.png')))
 async def drive(dx,dy,n):
  if mobile:
   await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':80,'y':650,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':80+dx*27,'y':650+dy*27,'id':1}]})
  else:await pg.keyboard.down('ArrowRight'if dx>0 else'ArrowLeft'if dx<0 else'ArrowDown'if dy>0 else'ArrowUp')
  await tick(n)
  if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:await pg.keyboard.up('ArrowRight'if dx>0 else'ArrowLeft'if dx<0 else'ArrowDown'if dy>0 else'ArrowUp')
 async def walk(x,y):
  for i in range(150):
   s=await state();dx=(x+.5)*48-s['x'];dy=(y+.5)*48-s['y']
   if s['over']or abs(dx)<3 and abs(dy)<3:return
   dist=abs(dx)if abs(dx)>3 else abs(dy);n=max(1,min(16,int(dist/2.7)));await drive((1 if dx>0 else-1)if abs(dx)>3 else 0,0 if abs(dx)>3 else(1 if dy>0 else-1),n)
  raise AssertionError(('blocked real movement',x,y,await state()))
 async def press(name):
  if mobile:await pg.locator({'grab':'#btnGrab','attack':'#btnAct','env':'#btnCarry'}[name]).tap();await tick(4)
  else:
   key={'grab':'KeyC','attack':'KeyZ','env':'KeyX'}[name];await pg.keyboard.down(key);await tick(4);await pg.keyboard.up(key)
  await tick(120)
 await tick(50);assert(await state())['stage']=='tI';assert not(await state())['exit'];await shot('start')
 if mobile:await pg.locator('#btnSneak').tap()
 else:await pg.keyboard.press('KeyR')
 if bypass:
  await walk(43,10);s=await state();assert not s['over']and not s['exit']and s['step']==2,s
  await pg.evaluate('''()=>{const G=__game;G.saveCheckpoint();G.CP.S.exitOpen=true;if(!G.loadCheckpoint()||G.S.exitOpen||(G.S.tutI||0)!==2)throw Error('legacy training checkpoint reopens exit')}''');assert not errors,errors;await pg.close();return{'mobile':mobile,'earlyExitBlocked':True,'legacyCheckpointRepaired':True}
 await walk(5,10);await walk(10,10);assert(await state())['step']==2
 await walk(14,10);await walk(14,7)
 for i in range(80):
  if(await state())['warning']:break
  await tick(3)
 s=await state();assert s['warning'],s;assert'아래쪽'in s['text']and s['goal']['y']==9.5*48,s;await shot('warning');await walk(14,9);s=await state();assert s['step']==3 and s['detected']==0 and s['hp']==3,s
 await walk(20,9)
 for i in range(100):
  if(await state())['step']>=4:break
  await tick(15)
 assert(await state())['step']==4,await state()
 await walk(24,9);await walk(24,13);await walk(25,13);await press('grab');s=await state();assert s['captive']and'짧게'in s['text'],s
 marker=await pg.evaluate('''()=>{const G=__game,c=G.ctx,fill=c.fill;let n=0;c.fill=function(...a){n++;return fill.apply(this,a)};try{G.drawGoal(G.S.player)}finally{c.fill=fill}return n}''');assert marker==0,'nearby tutorial arrow covers captive / hero'
 await shot('grabbed');await press('attack');s=await state();assert s['step']==5 and s['kills']==0,s
 await press('env');assert(await state())['outfit']=='crew';await press('env');s=await state();assert s['carrying']and'수거함에 넣기'in s['text'],s;await shot('carry');await walk(25,14);await press('env');await tick(60);s=await state();assert s['step']==7 and not s['carrying']and not s['exit'],s
 await walk(25,10);await walk(36,10);await walk(36,7);await walk(36,4);s=await state();assert s['step']==8 and s['exit'],s;await walk(36,10);await walk(43,10);await pg.wait_for_timeout(650);s=await state();assert s['over']and s['kills']==0 and s['detected']==0,s;await shot('result')
 assert await pg.locator('#btnNext').inner_text()=='의뢰 01 시작';await pg.locator('#btnNext').click();assert await pg.locator('#brief').is_visible();assert'VIP'in await pg.locator('#brName').inner_text();await pg.locator('#btnBrGo').click()
 for i in range(6):
  if not(await state())['modal']:break
  if mobile:await pg.locator('#dlg').tap()
  else:await pg.keyboard.press('Space')
 await tick(60);s=await state();assert s['stage']=='m2'and not s['modal']and not s['over'],s;await shot('contract');assert not errors,errors;await pg.close();return{'mobile':mobile,'trainingToContract':True,'detected':s['detected'],'kills':s['kills'],'warningsGuideToExit':True,'earlyExitBlocked':True}
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   for bypass in [False,True]:print('PASS first session',json.dumps(await exercise(b,mobile,bypass)),flush=True)
  await b.close()
asyncio.run(main())
