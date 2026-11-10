"""Native PC/emulated-touch opportunity encounters on original maps with all AI active.
Player position/uniform and m7's already-recovered manifest are progress fixtures.
No actor/camera/health/clock changes. Safe tools come from normal stage inventory.
This verifies encounters, not full mission clears or novice usability.
"""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from action_flow_live import Controls
from compound_live import CompoundControls
async def main(a):
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   name='touch'if mobile else'pc';q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear()');await q.goto(a.url);await q.wait_for_function('window.__game?.officeReady()',polling=100,timeout=90000)
   c=Controls(q,await q.context.new_cdp_session(q),mobile);cc=CompoundControls(q,c,out,name)
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m4'));while(G.DLG.modal)G.advanceDialog();const P=G.S.player,l=G.S.ladders.find(l=>l.kind==='fstair'&&!l.bfl&&G.bldAt(l.tx,l.ty)===4),at=G.stairLower(l).up.entry;Object.assign(P,{...at,fl:0,outfit:'crew',disguise:true,mode:'walk'});G.setLayer(0);G.moveCamera(1);G.updateHUD(true);}''')
   await cc.stairs(1,4);it=await q.evaluate('({x:__game.S.items[1].x,y:__game.S.items[1].y})');await cc.walk(it['x'],it['y'])
   tools=await q.evaluate('__game.S.player.picks');assert tools>=2
   await q.wait_for_function('(()=>{const g=__game.S.guards.find(g=>g.tag==="contractKeeper");return g.x<220&&!g.moving&&g.wait>6})()',timeout=60000)
   assert await q.evaluate('__game.envAction().k==="loot"&&!__game.S.player.keys.green');await c.press('x','#btnCarry');await q.wait_for_function('__game.S.player.pick?.lockpick?.cost===2',timeout=3000);await q.screenshot(path=str(out/f'{name}-safe-work.png'))
   await q.wait_for_function('__game.S.items[1].got&&!__game.actionBusy()',timeout=8000)
   safe=await q.evaluate('({picks:__game.S.player.picks,green:!!__game.S.player.keys.green,hp:__game.S.player.hp,detected:__game.S.stats.detected,actors:__game.S.guards.length})');assert safe['picks']==tools-2 and not safe['green']and safe['hp']==3 and not safe['detected'],safe
   rows.append({'device':name,'safe':safe,'initialPicks':tools});print('PASS native safe choice',name,safe,flush=True)
   if a.safe_only:
    assert not errors,errors;await q.close();continue
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m7'));while(G.DLG.modal)G.advanceDialog();const P=G.S.player,it=G.S.items[1];G.S.items[0].got=true;Object.assign(P,{x:it.x,y:it.y+48,fl:1,outfit:'courier',disguise:true,mode:'walk'});G.setLayer(1);G.moveCamera(1);G.updateHUD(true);}''')
   await q.wait_for_function('(()=>{const g=__game.S.guards.find(g=>g.tag==="camop");return g.x<28*48&&!g.moving&&g.wait>6&&Math.cos(g.a)<-.7})()',timeout=70000)
   it=await q.evaluate('({x:__game.S.items[1].x,y:__game.S.items[1].y})');await cc.walk(it['x'],it['y']);await cc.env('loot');assert not await q.evaluate('__game.S.exitOpen'),'living target bypassed by dispatch completion'
   await cc.walk(it['x'],it['y']+48);await q.wait_for_function('__game.S.dispatchFault?.phase==="delivered"',timeout=15000)
   await q.wait_for_function('(()=>{const S=__game.S,g=S.guards.find(g=>g.target),it=S.items[1];return g.fl===1&&g.reached&&Math.hypot(g.x-it.x,g.y-it.y)<44})()',timeout=50000)
   await q.screenshot(path=str(out/f'{name}-boss-arrives.png'));await cc.walk(it['x']-36,it['y']+48);await cc.walk(it['x']-36,it['y']);await q.wait_for_function('__game.attackAction().list?.some(g=>g.target)',timeout=4000);await c.press('z','#btnAct',lethal=True)
   await q.wait_for_function('__game.targetEliminated(__game.S.guards.find(g=>g.target))&&!__game.actionBusy()',timeout=8000)
   response=await q.evaluate('({phase:__game.S.dispatchFault.phase,floor:__game.S.guards.find(g=>g.target).fl,items:__game.S.items.map(i=>i.got),exit:__game.S.exitOpen,hp:__game.S.player.hp,detected:__game.S.stats.detected,actors:__game.S.guards.length})');assert response['floor']==1 and response['exit']and response['hp']==3 and not response['detected'],response
   assert not errors,errors;await q.screenshot(path=str(out/f'{name}-boss-ambushed.png'));rows.append({'device':name,'dispatch':response,'errors':errors});print('PASS native dispatch ambush',name,response,flush=True);await q.close()
  await b.close()
 (out/'report.json').write_text(json.dumps({'method':__doc__,'cases':rows},ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8055/build/preview_city.html');p.add_argument('--out',default='/workspace/work/play-v255/native');p.add_argument('--safe-only',action='store_true');asyncio.run(main(p.parse_args()))
