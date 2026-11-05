"""Dense real sprites, loop continuity, cold-cache fallback and planted gait transitions."""
import asyncio,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hero-motion-v191';O.mkdir(exist_ok=True)
def atlases():
 m=json.loads((R/'build/pr/pr_meta.json').read_text());count=0;distinct={}
 for body,bm in m['bodies'].items():
  if not bm.get('fluid'):continue
  im=Image.open(R/'build/pr'/f'body_{body}.webp').convert('RGBA')
  for anim,(col,n)in bm['anims'].items():
   unique=set()
   for d in range(8):
    for i in range(n):
     tile=im.crop(((col+i)*64,d*64,(col+i+1)*64,(d+1)*64));box=tile.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
     assert box and min(box[:2])>0 and max(box[2:])<64,(body,anim,d,i,box)
     if d==0:unique.add(tile.tobytes())
     count+=1
   if body=='heroGaitMotion' and anim in ['walk','run','sneak']:assert n>=16 and len(unique)>=12,(anim,n,len(unique))
   if body in ['heroCombatMotion','keyReactMotion']and anim in ['stab','choke','stabbed','choked']:assert n>=25 and len(unique)>=18,(body,anim,n,len(unique))
   distinct[body+':'+anim]=len(unique)
 print('PASS',count,'nonempty uncropped dense frames; independent actor and victim silhouettes',flush=True)
 return count,distinct
async def main():
 count,distinct=atlases();rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;requestIdleCallback=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.wait_for_timeout(150)
   menu=await q.evaluate('__game.spriteSources.snapshot()');assert set(menu['loaded'])=={'hero','heroMotion'},menu
   await q.evaluate('''async()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;await G.prLoadBody('heroCrew');window.coldCalls=[];const C=G.ctx,draw=C.drawImage;C.drawImage=(...a)=>{coldCalls.push(a);return draw.apply(C,a)};try{window.coldVisible=G.drawPR('sam@heroCrew',100,100,0,'walk',.3);}finally{C.drawImage=draw;}}''')
   assert await q.evaluate('coldVisible&&coldCalls.length===1'),'cold motion source removes or ghosts the heroine'
   await q.evaluate('async()=>{const G=__game;await Promise.all([...Object.values(G.PR.fluidBodies.hero),...Object.values(G.PR.fluidBodies.key)].map(n=>G.prLoadBody(n)));}')
   result=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,check=(v,m)=>{if(!v)throw Error(m)};
    Object.assign(P,{moving:true,mode:'walk',travelSpeed:82,gaitTime:0,strikeT:0});G.updateHeroVisual(P);S.t+=.1;P.gaitTime=.24;G.updateHeroVisual(P);const before=G.heroMotionClock(P,'walk');check(before>0,'walking clock frozen');
    P.mode='run';G.updateHeroVisual(P);const run=G.heroMotionClock(P,'run');check(Math.abs(before-run/.64)<1e-8,'run resets the planted-foot phase');
    P.mode='sneak';G.updateHeroVisual(P);check(Math.abs(before-G.heroMotionClock(P,'sneak')/1.24)<1e-8,'crouch walking resets gait');
    const frozen=G.heroMotionClock(P,'sneak');for(let i=0;i<20;i++)G.updateHeroVisual(P);check(G.heroMotionClock(P,'sneak')===frozen,'redraw advances gait without movement');
    P.mode='walk';G.updateHeroVisual(P);S.t+=.01;P.moving=false;P.travelSpeed=20;G.updateHeroVisual(P);S.t+=.08;P.gaitTime+=.01;G.updateHeroVisual(P);P.travelSpeed=0;G.updateHeroVisual(P);const settle=G.heroTransitionPose(P,false);check(settle?.frame===0,'stop transition was consumed while feet were still coasting');check(settle?.anim.startsWith('settle'),'walking snaps directly to idle');
    S.t+=.2;G.updateHeroVisual(P);P.mode='sneak';S.t+=.02;G.updateHeroVisual(P);const duck=G.heroTransitionPose(P,false);check(duck?.anim==='duck'&&duck.frame>0&&duck.frame<8,'stance toggle skips intermediate poses');
    const key=G.characterLook(P),samples=new Set(),victims=new Set();for(let i=0;i<=400;i++){const kt=G.killKT('choke',i/400,0),raw=G.ktFrame('choke',kt);samples.add(G.fluidSprite(key,'choke',0,raw).frame);victims.add(G.fluidSprite('sam','choked',0,raw).frame);}check(samples.size===25&&victims.size===25,'paired actions skip dense intermediate frames');
    for(let i=0;i<=16;i++){const at={x:300,y:250},s=G.climbContact(key,0,i/4,at);check(s&&Math.abs((s.hands[0].x+s.hands[1].x)/2-at.x)<.001&&Math.abs((s.hands[0].y+s.hands[1].y)/2-at.y)<.001,'dense climbing loses the pipe contact');}
    let calls=0;const C=G.ctx,draw=C.drawImage;C.drawImage=(...a)=>{calls++;return draw.apply(C,a)};try{G.drawPR(key,100,100,0,'walk',.3);}finally{C.drawImage=draw;}check(calls===1,'smooth motion draws translucent duplicate actors');
    const idle=G.fluidSprite(key,'walk',1, -1),start=G.fluidSprite(key,'walk',0,-1);check(idle.frame===start.frame,'walk loop does not join at exactly one cycle');
    return{pairedActorFrames:samples.size,pairedVictimFrames:victims.size,stanceFrames:true,distanceGait:true,pausedGait:true,loopSeam:true,coldFallback:true,oneActorDraw:true,climbContacts:17,sources:G.spriteSources.snapshot()};}''')
   assert not errors,errors;rows.append({'mobile':mobile,**result,'errors':errors});print('PASS hero flow',mobile,json.dumps(result),flush=True);await q.close()
  await b.close()
 (O/'motion-checks.json').write_text(json.dumps({'uncroppedFrames':count,'distinct':distinct,'browsers':rows},indent=2))
if __name__=='__main__':asyncio.run(main())
