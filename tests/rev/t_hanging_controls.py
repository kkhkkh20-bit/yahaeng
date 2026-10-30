"""Hanging buttons/keys and captive hide prompts must work before activation."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
SKIP='''()=>{const g=window.__game;for(let i=0;i<60&&g.DLG.modal;i++)g.advanceDialog();g.S.guards.forEach(q=>{q.x=q.y=-9999;q.path=q.sched=q.wander=null;q.route=[{x:-9999,y:-9999,pause:999}]})}'''
EDGE='''(blocked=false)=>{const g=window.__game,P=g.S.player;
 for(let y=1;y<g.MH-1;y++)for(let x=1;x<g.MW-1;x++){const z=g.rLv(x,y);if(!z||g.robAt(x,y))continue;
  for(const [nx,ny] of [[0,1],[1,0],[-1,0],[0,-1]]){if(g.rLv(x+nx,y+ny)>=z)continue;
   const px=x*48+24+nx*18,py=y*48+24+ny*18,land=g.landBelow(px,py,{x:nx,y:ny},z);
   if(blocked?land||z<3:!land)continue;
   P.trav=P.jump=P.hide=P.wire=P.cover=P.carrying=P.captive=null;P.grabIn=null;P.fl=0;P.z=z;P.x=px;P.y=py;P.a=0;P.ledge={x:nx,y:ny};P.ledgeLock=true;P.ledgeWarn=false;g.S.keys={};g.setLayer(0);
   return {x:px,y:py,z,nx,ny,land};
  }}throw Error('No ledge fixture');}'''
CAPTIVE='''(distance)=>{const g=window.__game,S=g.S,P=S.player;
 const h=S.hides.find(h=>h.type==='box'&&!h.fl&&!h.z&&h.cap>h.bodies);
 if(!h)throw Error('No hide fixture');
 const q=S.guards.find(q=>!q.civ&&!q.dog);P.x=h.x+distance;P.y=h.y;P.z=P.fl=0;P.a=0;P.trav=P.jump=P.hide=P.ledge=P.wire=P.cover=P.grabIn=null;P.captive=q;
 q.x=P.x+10;q.y=P.y;q.z=q.fl=0;q.captT=0;q.questioned=true;q.state='CAPTIVE';q.doomed=false;g.setLayer(0);
 window.__h=h;window.__q=q;return {x:h.x,y:h.y};}'''
RECORD='''()=>{const ctx=window.__game.ctx,fill=ctx.fillText.bind(ctx);window.__text=[];ctx.fillText=function(t,...args){window.__text.push(String(t));if(window.__text.length>3000)window.__text.splice(0,1000);return fill(t,...args)}}'''
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();errors=[]
  pg=await b.new_page(viewport={'width':1280,'height':800});pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!window.__game')
  async def fresh(stage='m1'):
   await pg.evaluate('(id)=>window.__game.start(window.__game.STAGES.findIndex(s=>s.id===id))',stage);await pg.evaluate(SKIP)
  await fresh();edge=await pg.evaluate(EDGE)
  # Enemy at the edge must not consume the environment/climb action.
  await pg.evaluate('''()=>{const g=window.__game,P=g.S.player,q=g.S.guards[0];q.x=P.x;q.y=P.y;q.z=P.z;q.fl=0;q.state='PATROL';q.doomed=false;q.climb=null;q.wait=999;}''')
  actions=await pg.evaluate('''()=>{const g=window.__game;return [g.attackAction().k,g.envAction().k,g.grabAction().k]}''')
  assert actions==['ledgeKill','ledgeUp','ledgeDrop'],actions
  await pg.wait_for_function("document.querySelector('#btnCarry').textContent.includes('올라가기')&&document.querySelector('#btnGrab').textContent.includes('떨어지기')")
  await pg.keyboard.press('KeyX');await pg.wait_for_function('!window.__game.S.player.ledge&&!window.__game.S.player.trav')
  assert await pg.evaluate('window.__game.S.player.z')==edge['z']
  await fresh();edge=await pg.evaluate(EDGE);await pg.keyboard.press('KeyC');await pg.wait_for_function('!window.__game.S.player.ledge&&!window.__game.S.player.jump')
  landed=await pg.evaluate('''()=>{const P=window.__game.S.player;return [Math.round(P.x),Math.round(P.y),P.z]}''')
  assert landed==[edge['land']['x'],edge['land']['y'],edge['land']['z']],landed
  # Both PC key sets work, and the key guide names the action before input.
  await fresh();await pg.evaluate(EDGE);await pg.keyboard.press('KeyW');await pg.wait_for_timeout(80)
  assert await pg.locator('#kkGrab').inner_text()=='Q'
  assert await pg.locator('#kmQ').inner_text()=='떨어지기'
  await pg.keyboard.press('KeyQ');await pg.wait_for_function('!window.__game.S.player.jump&&!window.__game.S.player.ledge')
  # The original outward movement input still shares the same safe drop.
  await fresh();edge=await pg.evaluate(EDGE);await pg.evaluate('window.__game.S.player.ledgeLock=false')
  direction='ArrowRight' if edge['nx']>0 else 'ArrowLeft' if edge['nx']<0 else 'ArrowDown' if edge['ny']>0 else 'ArrowUp'
  await pg.keyboard.down(direction);await pg.wait_for_function('!window.__game.S.player.ledge&&!window.__game.S.player.jump');await pg.keyboard.up(direction)
  assert await pg.evaluate('window.__game.S.player.z')==edge['land']['z']
  # Wire endpoints climb onto the roof; the separate drop button uses clear ground.
  await fresh()
  roof=await pg.evaluate("""()=>{const g=window.__game,P=g.S.player;for(const w of g.S.wires)for(const [n,s] of [[w.a,0],[w.b,1]])if(n.roof){P.x=n.x;P.y=n.y;P.z=n.z;P.wire={w,s};P.ledge=P.jump=P.trav=null;return n.z}throw Error('No roof wire')}""")
  assert await pg.evaluate('window.__game.envAction().k')=='wireOff'
  await pg.keyboard.press('KeyX');await pg.wait_for_function('!window.__game.S.player.wire&&!window.__game.S.player.trav')
  assert await pg.evaluate('window.__game.S.player.z')==roof
  await fresh()
  await pg.evaluate("""()=>{const g=window.__game,P=g.S.player;for(const w of g.S.wires)for(let s=.15;s<.9;s+=.05){P.x=w.a.x+(w.b.x-w.a.x)*s;P.y=w.a.y+(w.b.y-w.a.y)*s;P.z=w.a.z+(w.b.z-w.a.z)*s;P.wire={w,s};P.ledge=P.jump=P.trav=null;if(g.grabAction().k==='wireFall')return}throw Error('No clear wire landing')}""")
  await pg.keyboard.press('KeyC');await pg.wait_for_function('!window.__game.S.player.wire&&!window.__game.S.player.jump')
  assert await pg.evaluate('window.__game.S.player.z')==0
  # Unsafe height remains blocked, without detaching the player.
  await fresh('m2');await pg.evaluate(EDGE,True);assert await pg.evaluate('window.__game.grabAction().blocked')
  await pg.keyboard.press('KeyC');await pg.wait_for_timeout(120);assert await pg.evaluate('!!window.__game.S.player.ledge')
  # Captive: show the environment key before reaching interaction range.
  for mode,key,code in [('arrow','X','KeyX'),('wasd','E','KeyE')]:
   await fresh();await pg.evaluate(CAPTIVE,110);await pg.evaluate('(mode)=>window.__game.input.kset=mode',mode);await pg.evaluate(RECORD)
   await pg.wait_for_function("window.__text.some(t=>t.includes('가까이 가서 끌고 처치'))")
   assert await pg.evaluate('(key)=>window.__text.includes(key)',key)
   assert await pg.evaluate('window.__game.envAction().k')!='drag'
   await pg.keyboard.press(code);assert await pg.evaluate('!!window.__game.S.player.captive')
   await pg.evaluate('''()=>{const P=window.__game.S.player;P.x=window.__h.x+44;P.y=window.__h.y;window.__text=[];}''')
   await pg.wait_for_function("document.querySelector('#btnCarry').textContent==='끌고 처치'")
   await pg.wait_for_function("window.__text.some(t=>t.includes('수거함 · 끌고 처치'))")
   assert await pg.evaluate('(key)=>window.__text.includes(key)',key)
   await pg.keyboard.press(code);await pg.wait_for_function('!!window.__game.S.player.hide')
   result=await pg.evaluate('''()=>({held:!!window.__game.S.player.captive,state:window.__q.state,kills:window.__game.S.stats.kills,hidden:window.__game.S.player.hide===window.__h})''')
   assert result=={'held':False,'state':'DEAD','kills':1,'hidden':True},result
  # Mobile uses the existing two button positions, with working pointer input.
  mobile=await b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);mobile.on('pageerror',lambda e:errors.append(str(e)))
  await mobile.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await mobile.wait_for_function('!!window.__game')
  for button in ['#btnCarry','#btnGrab']:
   await mobile.evaluate('window.__game.start(0)');await mobile.evaluate(SKIP);await mobile.evaluate(EDGE)
   await mobile.wait_for_function("document.querySelector('#btnGrab').textContent.includes('떨어지기')")
   await mobile.tap(button);await mobile.wait_for_function('!window.__game.S.player.ledge&&!window.__game.S.player.trav&&!window.__game.S.player.jump')
  assert not errors,errors;await b.close()
 print('hanging controls: climb/drop, nearby enemy, both key sets, unsafe landing, captive pre-prompts and mobile touch passed')
asyncio.run(main())
