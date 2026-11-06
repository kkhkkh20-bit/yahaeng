"""Standalone stage fixture. Known-map native input review: rear approach/handoff and a real pursuit.
Normal RAF, unseeded active AI, standalone selected-stage fixtures. No actor/progress/health overrides.
--legacy permits a second environment press after v191 ignores the early one.
"""
import argparse,asyncio,json,time
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
from episode_training import standalone_stage, continue_episode, spend_episode_points

class Controls:
 def __init__(self,page,cdp,mobile):self.q=page;self.cdp=cdp;self.mobile=mobile;self.points={};self.keys=[];self.axis=None;self.events=[]
 async def record(self,label):
  s=await self.q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;return{version:__BUILD_VERSION__,t:S.t,x:P.x,y:P.y,hp:P.hp,mode:P.mode,hidden:P.hidden,moving:P.moving,carry:!!P.carrying,body:P.bodyAnim?.k,approach:!!P.approachAttack,recovery:!!P.recoveryQueue,kill:!!P.killAnim,stats:{...S.stats},guards:S.guards.map(g=>({id:g.id,state:g.state,seen:g.seen,x:g.x,y:g.y})),over:S.over};}''')
  self.events.append({'label':label,**s});print(label,json.dumps(s,ensure_ascii=False),flush=True);return s
 async def touch(self,kind,id,x=0,y=0):
  if kind=='touchEnd':
   ended=self.points.pop(id,None)
   if not ended:return
   payload=[ended]
  else:self.points[id]={'id':id,'x':x,'y':y};payload=list(self.points.values())
  await self.cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':payload})
 async def steer(self,axis=None,sign=1,run=False):
  wanted=(axis,sign,run)if axis else None
  if wanted==self.axis:return
  if self.mobile:
   if 1 in self.points:await self.touch('touchEnd',1)
   if axis:
    await self.touch('touchStart',1,55,520);d=(55 if run else 24)*sign
    await self.touch('touchMove',1,55+(d if axis=='x'else 0),520+(d if axis=='y'else 0))
  else:
   for key in self.keys:await self.q.keyboard.up(key)
   self.keys=[]
   if axis:
    self.keys=(['Shift']if run else[])+[('ArrowRight'if sign>0 else'ArrowLeft')if axis=='x'else('ArrowDown'if sign>0 else'ArrowUp')]
    for key in self.keys:await self.q.keyboard.down(key)
  self.axis=wanted
 async def press(self,key,selector):
  await self.record('press-'+key)
  if self.mobile:
   r=await self.q.locator(selector).bounding_box();assert r,selector
   await self.touch('touchStart',2,r['x']+r['width']/2,r['y']+r['height']/2)
   state=await self.q.evaluate('({approach:!!__game.S.player.approachAttack,recovery:!!__game.S.player.recoveryQueue})')
   await self.touch('touchEnd',2)
  else:
   await self.q.keyboard.down(key);state=await self.q.evaluate('({approach:!!__game.S.player.approachAttack,recovery:!!__game.S.player.recoveryQueue})');await self.q.keyboard.up(key)
  return state
 async def move(self,x=None,y=None,run=False):
  for axis,target in [('x',x),('y',y)]:
   if target is None:continue
   start=time.monotonic()
   try:
    while True:
     s=await self.q.evaluate('a=>({v:__game.S.player[a],over:__game.S.over})',axis);delta=target-s['v']
     if abs(delta)<5 or s['over']:break
     assert time.monotonic()-start<20,('blocked',axis,target,s)
     await self.steer(axis,1 if delta>0 else-1,run);await self.q.wait_for_timeout(16)
   finally:await self.steer()
   await self.q.wait_for_timeout(60)

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in ([args.device=='mobile']if args.device else[False,True]):
   for scenario in (['handoff']if args.handoff_only else['escape']if args.escape_only else['handoff','escape']):
    name=('mobile'if mobile else'pc')+'-'+scenario
    q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile,record_video_dir=str(out/'video'));errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('localStorage.clear()');await open_game(q,args.url+'?nostats&review=action-flow');c=Controls(q,await q.context.new_cdp_session(q),mobile)
    try:
     if scenario=='handoff':
      await standalone_stage(q,'t0')
      if await q.locator('#brief').is_visible():await q.click('#btnBrGo')
      await c.press('Control','#btnCrouch');await c.move(360,504);await c.move(x=438)
      await c.steer('x');await q.wait_for_function('__game.S.guards[0].x-__game.S.player.x<=63',timeout=3000,polling=10)
      anticipated=await c.press('z','#btnAct')
      if not args.legacy:assert anticipated['approach'],'native early press was not anticipated'
      await q.wait_for_function('!!__game.S.player.killAnim',timeout=2000,polling=10);attack=await c.record('takedown-start')
      await q.wait_for_function('(()=>{const A=__game.S.player.killAnim;return A?.committed&&A.dur-(__game.S.t-A.t0)<=.42})()',timeout=3000,polling=10)
      queued=await c.press('x','#btnCarry')
      if not args.legacy:assert queued['recovery'],'early handoff input was lost'
      if args.legacy and not queued['recovery']:
       await q.wait_for_function('!__game.actionBusy()',timeout=3000);await c.press('x','#btnCarry')
      await q.wait_for_function('!!__game.S.player.carrying',timeout=3000,polling=10);lift=await c.record('lift');await c.steer('x',-1)
      await q.wait_for_function('x=>__game.S.player.x<x-1',arg=lift['x'],timeout=3000,polling=10);stride=await c.record('first-carried-step');assert stride['carry']
      await c.move(360,504);await c.press('x','#btnCarry');await q.wait_for_function('__game.S.stats.stashed===1',timeout=4000);result=await c.record('hidden');assert result['hp']==3 and result['stats'].get('ko')==1 and not result['stats']['kills'] and not result['stats']['detected'],result
      result['takedownToStride']=round(stride['t']-attack['t'],3);result['liftToStride']=round(stride['t']-lift['t'],3);result['earlyInputAccepted']=queued['recovery']
     else:
      await standalone_stage(q,'p0');await q.click('#btnBrGo');await c.move(984,432,True);await c.move(760,408,True)
      await q.wait_for_function('__game.S.guards.some(g=>g.state==="ALERT"&&g.seen)',timeout=45000,polling=30);await c.record('actually-seen');assert await q.evaluate('__game.searchCauseReadout().kind')=='player'
      # Run around both corners before crouching behind the screen. Crouching
      # out in the open lets the pursuer catch up; column 2 avoids the tree.
      await c.move(y=400,run=True);await c.move(x=360,run=True);await c.move(y=576,run=True);await c.move(x=120,run=True);await c.move(y=408,run=True);await c.press('Control','#btnCrouch');await q.wait_for_function('__game.S.player.hidden',timeout=2000,polling=20);pocket=await c.record('second-corner-pocket');assert pocket['hidden'] and pocket['stats']['detected']>0 and pocket['hp']>0,pocket
      assert '내 모습 목격'in await q.locator('#lightLbl').inner_text();await q.screenshot(path=str(out/(name+'-pocket.png')))
      for delay,label in [(3000,'search-after-3s'),(7000,'search-after-10s')]:await q.wait_for_timeout(delay);await c.record(label)
      result=c.events[-1];assert result['hp']==pocket['hp'] and result['hidden'] and not any(g['seen']and g['state']=='ALERT'for g in result['guards']),result
     assert not errors,errors
     await q.screenshot(path=str(out/(name+'.png')));reports.append({'name':name,'passed':True,'result':result,'events':c.events,'errors':errors,'method':__doc__});print('PASS NATIVE',name,json.dumps(result,ensure_ascii=False),flush=True)
    except Exception:
     await c.record('failed');await q.screenshot(path=str(out/(name+'-failed.png')));raise
    finally:
     (out/(name+'.json')).write_text(json.dumps({'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close();await q.video.save_as(str(out/(name+'.webm')))
  await b.close()
 (out/'summary.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:8002/public/');parser.add_argument('--out',default='build/action-flow-v192/live');parser.add_argument('--device',choices=['pc','mobile']);parser.add_argument('--legacy',action='store_true');parser.add_argument('--handoff-only',action='store_true');parser.add_argument('--escape-only',action='store_true');asyncio.run(main(parser.parse_args()))
