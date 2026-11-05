"""Read-only route planning with native keyboard/CDP touch in normal browser time.
No scene, actor, health, inventory, skill, objective or alert overrides.
"""
import asyncio,json,math
from pathlib import Path
class NativeDriver:
 def __init__(self,page,mobile,out,label):self.q=page;self.mobile=mobile;self.out=Path(out);self.out.mkdir(parents=True,exist_ok=True);self.label=label;self.cdp=None
 async def setup(self):self.cdp=await self.q.context.new_cdp_session(self.q)
 async def state(self):return await self.q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{stage:G.STAGE.id,t:S.t,p:{x:P.x,y:P.y,fl:P.fl||0,hp:P.hp,mode:P.mode,outfit:P.outfit,carrying:!!P.carrying,hide:!!P.hide},over:S.over,exit:S.exitOpen,goal:G.nextGoal()?.text,keys:P.keys,items:S.items.map(i=>i.got),stats:S.stats,env:G.envChoices().map(a=>({k:a.k,label:a.label})),seen:S.guards.filter(g=>g.seen).map(g=>({id:g.id,tag:g.tag,state:g.state,why:g.why}))}}''')
 async def snap(self,label):
  s=await self.state();print(self.label,label,json.dumps(s,ensure_ascii=False),flush=True);await self.q.screenshot(path=str(self.out/f'{self.label}-{label}.png'));return s
 async def press(self,key,button,seconds=.06):
  if self.mobile:
   r=await self.q.locator(button).bounding_box();assert r,button
   await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':2,'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}]})
  else:await self.q.keyboard.down(key)
  await self.q.wait_for_timeout(seconds*1000)
  if self.mobile:await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:await self.q.keyboard.up(key)
 async def crouch(self,value):
  if bool(await self.q.evaluate('__game.input.sneakToggle'))!=value:await self.press('Control','#btnCrouch')
 async def straight(self,x,y):
  for _ in range(220):
   s=await self.state();p=s['p']
   if s['over'] and p['hp']>0 and s['exit']:return
   assert not s['over'],s;dx=x-p['x'];dy=y-p['y'];d=math.hypot(dx,dy)
   if d<5:return
   ks=[]
   if self.mobile:
    await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':55,'y':520}]});await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':55+dx/d*35,'y':520+dy/d*35}]})
   else:
    if abs(dx)>3:ks.append('ArrowRight'if dx>0 else'ArrowLeft')
    if abs(dy)>3:ks.append('ArrowDown'if dy>0 else'ArrowUp')
    for k in ks:await self.q.keyboard.down(k)
   await self.q.wait_for_timeout(min(70,max(17,d/140*1000)))
   if self.mobile:await self.cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    for k in ks:await self.q.keyboard.up(k)
  raise AssertionError(('blocked',x,y,await self.state()))
 async def move(self,x,y):
  s=await self.state();await self.straight(x,s['p']['y']);await self.straight(x,y)
 async def env(self,kind,wait=True):
  await self.q.wait_for_function('!__game.actionBusy()',timeout=12000)
  choices=await self.q.evaluate('k=>__game.envChoices().filter(a=>k==="stash"?a.k==="carry"&&a.h:a.k===k).map(a=>__game.envToken(a))',kind);assert choices,(kind,await self.state())
  if await self.q.evaluate('(()=>{const a=__game.envAction();return a?__game.envToken(a):""})()')!=choices[0]:
   if self.mobile:await self.q.click('#btnCycle')
   else:await self.q.keyboard.press('Shift+Tab')
   await self.q.locator('[data-env-token='+json.dumps(choices[0])+']').click()
  await self.press('x','#btnCarry');await self.q.wait_for_timeout(100)
  if wait and kind!='keypad':await self.q.wait_for_function('!__game.actionBusy()',timeout=12000)
 async def door(self,x,y):
  for _ in range(50):
   a=await self.q.evaluate('at=>__game.envChoices().filter(a=>a.d&&Math.abs(a.d.x-at.x)<2&&Math.abs(a.d.y-at.y)<2).map(a=>({k:a.k,blocked:a.blocked}))',{'x':x,'y':y})
   choices=[v['k']for v in a]
   if 'keypad'in choices:
    assert await self.q.evaluate('__game.S.player.keys.code'),'character does not know the code'
    await self.env('keypad',False);code=await self.q.evaluate('__game.STAGE.code')
    for k in code:await self.q.locator(f'#keypad [data-k="{k}"]').click()
    await self.q.wait_for_timeout(350)
    if await self.q.locator('#keypad').is_visible():await self.q.locator('#keypad [data-k="ok"]').click()
   elif 'door'in choices:await self.env('door')
   elif 'pick'in choices:await self.env('pick')
   else:raise AssertionError(('door action missing',x,y,choices,await self.state()))
   if not await self.q.evaluate('at=>__game.S.doors.some(d=>d.locked&&Math.abs(d.x-at.x)<2&&Math.abs(d.y-at.y)<2&&(d.fl||0)===(__game.S.player.fl||0))',{'x':x,'y':y}):return
   await self.q.wait_for_timeout(250)
  raise AssertionError(('door remains blocked',x,y,await self.state()))
 async def route(self,x,y,allow_floor=False):
  assert math.isfinite(x)and math.isfinite(y)
  print(self.label,'route',x,y,flush=True)
  pts=await self.q.evaluate('''({x,y})=>{const G=__game,P=G.S.player;G.setLayer(P.fl||0);const ds=new Map(G.S.doors.filter(d=>(d.fl||0)===(P.fl||0)&&(!d.keyLock||P.keys?.[d.keyLock]||P.picks>0)).map(d=>[d.ty*G.MW+d.tx,d]));const shafts=new Set(G.S.ladders.filter(l=>(l.bfl||0)===(P.fl||0)).map(l=>l.ty*G.MW+l.tx)),end=Math.floor(y/48)*G.MW+Math.floor(x/48);return G.astar(Math.floor(P.x/48),Math.floor(P.y/48),Math.floor(x/48),Math.floor(y/48),(tx,ty)=>(G.solidAt(tx,ty)&&!ds.has(ty*G.MW+tx))||(shafts.has(ty*G.MW+tx)&&ty*G.MW+tx!==end)).map(p=>({x:p.x,y:p.y}));}''',{'x':x,'y':y})
  s=await self.state();assert pts or math.hypot(s['p']['x']-x,s['p']['y']-y)<65,('no path',x,y,s)
  fl=s['p']['fl']
  for p in pts:
   closed=await self.q.evaluate('p=>__game.S.doors.some(d=>d.locked&&(d.fl||0)===(__game.S.player.fl||0)&&Math.abs(d.x-p.x)<2&&Math.abs(d.y-p.y)<2)',p)
   if closed:await self.door(p['x'],p['y'])
   await self.straight(p['x'],p['y'])
   if (await self.state())['p']['fl']!=fl:
    if allow_floor:return
    raise AssertionError(('unexpected floor transition',await self.state()))
  await self.straight(x,y)
 async def floor(self,b,fl):
  for _ in range(4):
   cur=(await self.state())['p']['fl']
   if cur==fl:return
   up=cur<fl
   at=await self.q.evaluate('''({b,cur,up})=>{const G=__game,l=G.S.ladders.find(l=>l.kind==='fstair'&&G.bldAt(l.tx,l.ty)===b&&(up?(l.bfl||0)===cur:l.tfl===cur));if(!l)return null;return up?G.stairLower(l).up.entry:G.stairUpper(l).down.entry}''',{'b':b,'cur':cur,'up':up});assert at,(b,cur,fl)
   await self.route(at['x'],at['y'],True);await self.q.wait_for_function('!__game.actionBusy()',timeout=12000)
   if (await self.state())['p']['fl']==cur:await self.env('up'if up else'fdown')
   await self.q.wait_for_function('f=>(__game.S.player.fl||0)!==f&&!__game.actionBusy()',arg=cur,timeout=12000)
  assert (await self.state())['p']['fl']==fl
 async def learn(self,names):
  await self.q.click('#btnPause');await self.q.click('#btnSkillsPause')
  for name in names:
   await self.q.locator(f'[data-select="{name}"]').click();await self.q.locator(f'[data-learn="{name}"]').click()
   if self.mobile and await self.q.locator('.skill-detail-close').is_visible():await self.q.locator('.skill-detail-close').click()
  await self.q.click('#btnSkillsBack')
  if await self.q.locator('#pause').is_visible():await self.q.click('#btnResume')
 async def tool(self,name):
  if self.mobile:await self.q.click('#btnToolNext')
  else:await self.q.keyboard.press('i')
  await self.q.locator(f'#tools [data-t="{name}"]').click()
 async def dart(self,id,lethal=False,weapon='kunai'):
  await self.tool(weapon);at=await self.q.evaluate('id=>{const G=__game,g=G.S.guards[id];return{x:(g.x-G.cam.x)*G.SCALE+innerWidth/2,y:(g.y-14-G.cam.y)*G.SCALE+innerHeight/2}}',id)
  if self.mobile:await self.q.touchscreen.tap(at['x'],at['y'])
  else:await self.q.mouse.click(at['x'],at['y'])
  await self.press('v','#btnTool',1.15 if lethal else .08);await self.q.wait_for_timeout(700)
 async def finish(self):
  await self.q.wait_for_function('!document.querySelector("#end").hidden&&document.querySelector("#end").dataset.win==="1"',timeout=7000);s=await self.snap('clear');assert s['over']and s['p']['hp']>0 and all(s['items']),s
  trail=await self.q.evaluate('__game.S.trail');(self.out/f'{self.label}-trail.json').write_text(json.dumps(trail));return s
