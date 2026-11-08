"""Known-map native play of cumulative missions. Only fixture selection/read-only route planning;
normal RAF/AI, earned inventory and native keyboard/CDP touch. No actor/clock/health overrides."""
import argparse,asyncio,json,math,time
from pathlib import Path
from playwright.async_api import async_playwright,TimeoutError as BrowserTimeout
from browser_support import open_game
from action_flow_live import Controls
from episode_training import standalone_stage,continue_episode

class CompoundControls:
 def __init__(self,q,c,out,name):self.q=q;self.c=c;self.out=out;self.name=name
 async def shot(self,label):await self.c.record(label);await self.q.screenshot(path=str(self.out/f'{self.name}-{label}.png'))
 async def walk(self,x,y):
  # A four-neighbour path avoids the controller cutting across a diagonal furniture corner.
  path=await self.q.evaluate('''({x,y})=>{
   const G=__game,P=G.S.player,base=G.solidFor(P.z),blocked=new Set(),key=(x,y)=>y*G.MW+x;
   // Stair flights are directed level transitions, not ordinary corridor cells.
   // Approach their landings normally and use the actual action to change floor.
   if(!P.z)for(const l of G.S.ladders){
    if(!['fstair','stair'].includes(l.kind))continue;
    if((l.bfl||0)===(P.fl||0))blocked.add(key(l.tx,l.ty));
    if(l.kind==='fstair'&&l.tfl===(P.fl||0)){
     const w=G.stairUpper(l).well;
     if(w)for(const p of [w.c1,w.c2])blocked.add(key(Math.floor(p.x/48),Math.floor(p.y/48)));
    }
   }
   const start=[Math.floor(P.x/48),Math.floor(P.y/48)],end=[Math.floor(x/48),Math.floor(y/48)],q=[start],prev=new Map([[start.join(','),null]]);
   for(let i=0;i<q.length;i++){
    const p=q[i];if(p[0]===end[0]&&p[1]===end[1])break;
    for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
     const a=[p[0]+dx,p[1]+dy],k=a.join(',');
     if(a[0]<0||a[1]<0||a[0]>=G.MW||a[1]>=G.MH||prev.has(k)||base(...a)||blocked.has(key(...a))&&key(...a)!==key(...end))continue;
     prev.set(k,p);q.push(a);
    }
   }
   let p=end,out=[];if(!prev.has(p.join(',')))throw Error('No walking route '+start+' -> '+end+' floor '+P.fl+' z'+P.z);
   while(p){out.push({x:p[0]*48+24,y:p[1]*48+24});p=prev.get(p.join(','))}return out.reverse();
  }''',{'x':x,'y':y})
  # Straight portions can be walked in one gesture; stop at every turn.
  turns=[]
  for i,p in enumerate(path):
   if i==0 or i==len(path)-1 or (path[i+1]['x']-p['x'],path[i+1]['y']-p['y'])!=(p['x']-path[i-1]['x'],p['y']-path[i-1]['y']):turns.append(p)
  for p in turns:await self.c.move(p['x'],p['y'])
  await self.c.move(x,y)
  assert not await self.q.evaluate('__game.S.over&&!__game.S.exitOpen'),'mission failed while moving'
 async def env(self,kind,tag=None):
  token=await self.q.evaluate('''({kind,tag})=>{const G=__game,a=G.envChoices().find(a=>(kind==='stash'?(a.k==='stash'||a.k==='carry'&&a.h):a.k===kind)&&(!tag||(a.c?.tag||a.c?.g?.tag||a.g?.tag)===tag));return a&&G.envToken(a)}''',{'kind':kind,'tag':tag})
  assert token,(kind,tag,await self.q.evaluate('__game.envChoices().map(a=>[a.k,a.label])'))
  current=await self.q.evaluate('__game.envToken(__game.envAction())')
  if current!=token:
   if self.c.mobile:await self.q.tap('#btnCycle')
   else:await self.q.keyboard.press('Shift+Tab')
   await self.q.locator('[data-env-token="'+token+'"]').click()
  if kind=='trap':
   if self.c.mobile:
    r=await self.q.locator('#btnCarry').bounding_box();await self.c.touch('touchStart',2,r['x']+r['width']/2,r['y']+r['height']/2)
   else:await self.q.keyboard.down('x')
   await self.q.wait_for_function('__game.S.traps.some(t=>t.used)',timeout=7000)
   if self.c.mobile:await self.c.touch('touchEnd',2)
   else:await self.q.keyboard.up('x')
  else:await self.c.press('x','#btnCarry')
  await self.q.wait_for_function('!__game.actionBusy()&&!__game.S.player.pick&&!__game.S.player.trav&&!__game.S.player.jump',timeout=12000)
 async def neutralize(self,tag,lethal=False):
  # Moving repair/return patrols can leave the edge of melee reach between the
  # read-only ready check and native input. Re-approach visibly; never freeze AI.
  waiting=await self.q.evaluate('({x:__game.S.player.x,y:__game.S.player.y})')
  for attempt,distance in enumerate([40,40,36,32,30,28]):
   if attempt:
    if await self.q.evaluate('tag=>__game.S.guards.find(g=>g.tag===tag).state==="DEAD"',tag):return
    # A missed moving contact can leave our body in the patrol's path. Walk
    # back to the previous waiting spot so the real actor can reach its station.
    await self.walk(waiting['x'],waiting['y']);await self.c.record('yield-patrol-space')
   # Observe the real work/return cycle. A guard can legitimately investigate
   # the previous takedown and turn while returning; do not chase a stale angle.
   await self.q.wait_for_function("tag=>{const g=__game.S.guards.find(g=>g.tag===tag);return g.state==='DEAD'||g.state==='ALERT'||g.state==='PATROL'&&!g.moving&&g.wait>4}",arg=tag,timeout=45000)
   g=await self.q.evaluate('tag=>{const g=__game.S.guards.find(g=>g.tag===tag);return{x:g.x,y:g.y,a:g.a,state:g.state}}',tag)
   if g['state']=='DEAD':return
   await self.walk(g['x']-math.cos(g['a'])*distance,g['y']-math.sin(g['a'])*distance)
   ready=await self.q.evaluate('tag=>{const G=__game,a=G.attackAction();return (a.list||[a.g]).some(g=>g?.tag===tag)&&a.k!=="none"}',tag)
   if not ready:continue
   try:await self.c.press('z','#btnAct',lethal=lethal)
   except BrowserTimeout:
    # The patrol can leave reach between the read-only check and the gesture.
    # Release the real input and approach again; never move/freeze the actor.
    if self.c.mobile:await self.c.touch('touchEnd',2)
    else:await self.q.keyboard.up('z')
    failed=await self.c.record('missed-moving-contact')
    if failed['hp']<3 or failed['over'] or any(g['state']=='ALERT'for g in failed['guards']):raise
    continue
   await self.q.wait_for_timeout(180)
   if await self.q.evaluate('tag=>__game.S.guards.find(g=>g.tag===tag).state!=="DEAD"&&!__game.actionBusy()&&!__game.S.player.approachAttack',tag):continue
   await self.q.wait_for_function('tag=>__game.S.guards.find(g=>g.tag===tag).state==="DEAD"&&!__game.actionBusy()',arg=tag,timeout=8000)
   return
  raise AssertionError((tag,g,await self.q.evaluate('({p:{x:__game.S.player.x,y:__game.S.player.y,fl:__game.S.player.fl,cover:!!__game.S.player.cover,hidden:__game.S.player.hidden,carrying:!!__game.S.player.carrying},attack:__game.attackAction().k})')))
 async def dress(self,tag='uniformDonor'):await self.env('dress',tag);assert await self.q.evaluate('__game.S.player.outfit==="crew"')
 async def hide(self,tag):
  await self.env('carry',tag)
  # Ask the same physical approach geometry as the game; the input still walks there.
  h=await self.q.evaluate('''()=>{const G=__game,P=G.S.player,hs=[...G.S.hides,...G.S.bushes].filter(h=>!h.z&&(h.fl||0)===(P.fl||0)&&(h.bodies||0)<(h.cap||1));hs.sort((a,b)=>Math.hypot(P.x-a.x,P.y-a.y)-Math.hypot(P.x-b.x,P.y-b.y));return hs.map(h=>({x:h.x,y:h.y,type:h.type||'bush',fl:h.fl||0}))}''')
  assert h
  for target in h:
   try:await self.walk(target['x'],target['y']+(48 if target['type']!='bush' else 0))
   except Exception:
    continue
   choices=await self.q.evaluate('__game.envChoices().map(a=>a.k)')
   if await self.q.evaluate("__game.envChoices().some(a=>a.k==='stash'||a.k==='carry'&&a.h)"):await self.env('stash');break
  else:raise AssertionError(('No usable hiding place',tag,h,await self.q.evaluate('__game.envChoices().map(a=>[a.k,a.label])')))
  assert await self.q.evaluate('tag=>__game.S.corpses.some(c=>(c.tag||c.g?.tag)===tag&&(c.hidden||c.stashed))',tag)
 async def stairs(self,floor,b=0):
  while await self.q.evaluate('__game.S.player.fl||0')!=floor:
   f=await self.q.evaluate('__game.S.player.fl||0');up=f<floor
   at=await self.q.evaluate('''({f,up,b})=>{const G=__game,l=G.S.ladders.find(l=>l.kind==='fstair'&&G.bldAt(l.tx,l.ty)===b&&(up?l.bfl===f:l.tfl===f));if(!l)throw Error('Missing stair');return up?G.stairLower(l).up.entry:G.stairUpper(l).down.entry}''',{'f':f,'up':up,'b':b})
   await self.walk(at['x'],at['y']);await self.q.wait_for_function('!__game.actionBusy()',timeout=10000)
   if await self.q.evaluate('__game.S.player.fl||0')==f:await self.env('up'if up else'fdown')
   assert await self.q.evaluate('__game.S.player.fl||0')==(f+1 if up else f-1)
 async def light(self):
  at=await self.q.evaluate('''()=>{const G=__game,P=G.S.player,l=G.S.lamps.find(l=>!l.outdoor&&!l.off&&(l.fl||0)===(P.fl||0)&&l.control);return l&&l.control}''')
  await self.walk(at['x']+24,at['y']);await self.env('lamp')
  assert await self.q.evaluate('__game.S.lamps.some(l=>!l.outdoor&&l.off)')
  await self.shot('lights-out')
 async def camera_cable(self):
  # Thumb movement eases to a stop. Correct residual drift with native input
  # before requiring the strict physical 46px wall-cable reach.
  at=await self.q.evaluate('__game.cameraServicePoint(__game.S.cams[0])')
  await self.walk(at['x'],at['y'])
  for _ in range(3):
   if await self.q.evaluate('__game.cameraCableReachable(__game.S.cams[0])'):break
   await self.c.move(at['x'],at['y']);await self.q.wait_for_timeout(120)
  await self.env('camCable')
 async def finish(self):
  await self.stairs(0,1 if await self.q.evaluate('!!__game.STAGE.compoundVertical')else 0)
  at=await self.q.evaluate('__game.S.exit');await self.walk(at['x'],at['y'])
  await self.q.locator('#end').wait_for(state='visible');assert await self.q.locator('#end').get_attribute('data-win')=='1'
  await self.shot('complete')

async def main(args):
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True);reports=[]
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in ([args.device=='mobile'] if args.device else [False,True]):
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile,record_video_dir=str(out/'video'));errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()');await open_game(q,args.url)
   c=Controls(q,await q.context.new_cdp_session(q),mobile)
   try:
    for id in (args.stage.split(',') if args.stage else ['p0','e2']):
     direct=args.direct_infiltration or id=='e2' and not args.stage
     await standalone_stage(q,id);await q.click('#btnBrGo');cc=CompoundControls(q,c,out,('mobile'if mobile else'pc')+'-'+id);await cc.shot('start');await c.press('Control','#btnCrouch')
     if not(direct and id=='e2'):
      await cc.neutralize('uniformDonor');await cc.dress();await cc.hide('uniformDonor');await cc.shot('uniform-and-hidden')
     if id=='p0':
      await cc.walk(1176,816);await cc.shot('front-courtyard');await cc.walk(1176,744);await cc.shot('front-entry')
      await cc.neutralize('hallKeeper');await cc.hide('hallKeeper');await cc.stairs(1);await cc.neutralize('runner',True);await cc.hide('runner')
     elif id in ['p1','p2','e1']:
      await cc.walk(960,600);await cc.light()
      # Read-only observation of the real repair response, then use its rear contact.
      await q.wait_for_function('__game.S.guards.some(g=>g.relight)',timeout=3000)
      await cc.walk(1032,600)
      await q.wait_for_function('()=>{const g=__game.S.guards.find(g=>g.tag==="lightKeeper");return !g.moving&&!g.relight}',timeout=15000)
      await cc.neutralize('lightKeeper');await cc.hide('lightKeeper')
      await cc.neutralize('watchCaptain'if id=='p1'else'inspector',True);await cc.hide('watchCaptain'if id=='p1'else'inspector')
      await cc.stairs(1)
      if id!='p1':await cc.neutralize('upperKeeper');await cc.hide('upperKeeper')
      await cc.neutralize({'p1':'foreman','p2':'recordsLead','e1':'contact'}[id],True)
      if id!='p1':
       at=await q.evaluate('__game.S.items[0]');await cc.walk(at['x'],at['y']);await cc.env('loot')
      if id=='e1':
       assert await q.evaluate('__game.evidencePending()&&__game.S.stats.camRec>0'),'actual visible work was not recorded'
       await cc.shot('recorded-work')
       await cc.camera_cable()
       assert await q.evaluate('__game.evidencePending()'),'wire erased past evidence'
       at=await q.evaluate('__game.S.camRoom');await cc.walk(at['x'],at['y']);await cc.env('camroom')
       assert await q.evaluate('!__game.evidencePending()&&__game.S.camsOff');await cc.shot('security-recovered')
     else:
      await cc.walk(216,888);assert await q.evaluate('__game.S.player.picks>0')
      await cc.walk(216,600);await cc.env('pick');await cc.env('window');await cc.shot('window-entry')
      await cc.stairs(2,0)
      at=await q.evaluate("(()=>{const G=__game,l=G.S.ladders.find(l=>l.kind==='stair'&&G.bldAt(l.tx,l.ty)===0);return G.stairLower(l).up.entry})()")
      await cc.walk(at['x'],at['y']);await cc.env('up');assert await q.evaluate('__game.S.player.z===3')
      await cc.walk(792,408);await c.steer('x',1);await q.wait_for_timeout(90);await c.steer();await cc.env('leap');await cc.shot('rooftop-jump')
      assert await q.evaluate('__game.S.player.z===3&&__game.bldAt(Math.floor(__game.S.player.x/48),Math.floor(__game.S.player.y/48))===1')
      if not direct:
       await cc.walk(1224,576)
       await q.wait_for_function("()=>{const g=__game.S.guards.find(g=>g.tag==='handover');return g.x>24*48&&g.x<27*48&&g.y>16*48&&g.y<19*48&&g.wait>2}",timeout=45000)
       await cc.env('trap');await q.wait_for_function("__game.S.guards.find(g=>g.tag==='handover').state==='DEAD'",timeout=5000);await cc.shot('sign-assassination')
      at=await q.evaluate("(()=>{const G=__game,l=G.S.ladders.find(l=>l.kind==='stair'&&G.bldAt(l.tx,l.ty)===1);return {x:l.rx??l.ux,y:l.ry??l.uy}})()")
      await cc.walk(at['x'],at['y']);await cc.env('down');assert await q.evaluate('__game.S.player.fl===2&&!__game.S.player.z')
      if await q.evaluate("__game.S.guards.some(g=>g.tag==='upperKeeper')"):
       await cc.neutralize('upperKeeper');await cc.hide('upperKeeper')
      if direct:
       await cc.walk(1416,504);await cc.walk(1464,504);await cc.walk(1464,360)  # Authored right-wall approach, outside the camera cone.
      await cc.camera_cable()
      if direct:await cc.walk(1378,312)  # Stay north of the downward-facing broker.
      await cc.neutralize('broker',True);at=await q.evaluate('__game.S.items[0]');await cc.walk(at['x'],at['y']);await cc.env('loot')
      # Keep the remaining patrols alive: permitted passage and an ordinary
      # staircase escape are valid solutions, not an all-enemy-clear checklist.
     await cc.finish();reports.append({'device':'mobile'if mobile else'pc','id':id,'events':c.events[:],'errors':errors[:]})
     if id in await q.evaluate('__game.LEARNING_ROUTE'):await continue_episode(q)
    assert not errors,errors
   except Exception:
    await c.record('failed');print(await q.evaluate('({fl:__game.S.player.fl,z:__game.S.player.z,near:__game.envChoices().map(a=>[a.k,a.label]),stairs:__game.S.ladders.filter(l=>l.kind===\"fstair\").map(l=>({l,geo:__game.stairUpper(l)}))})'),flush=True);await q.screenshot(path=str(out/(('mobile'if mobile else'pc')+'-failed.png')));raise
   finally:
    (out/(('mobile'if mobile else'pc')+'.json')).write_text(json.dumps({'reports':reports,'events':c.events,'errors':errors},ensure_ascii=False,indent=2));await c.steer();await q.close()
  await b.close()
 print('PASS cumulative missions',[(r['device'],r['id'])for r in reports],flush=True)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--direct-infiltration',action='store_true');a.add_argument('--url',default='http://127.0.0.1:8005/build/preview_city.html');a.add_argument('--out',default='build/compound-v212/live');a.add_argument('--device',choices=['pc','mobile']);a.add_argument('--stage');asyncio.run(main(a.parse_args()))
