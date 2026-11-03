"""Use the actual ledger, crouched keyboard movement, both skills and exit."""
import asyncio,json,sys,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
BASE=sys.argv[1]if len(sys.argv)>1 else (R/'build/preview_city.html').as_uri()
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None);q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE);await q.wait_for_function('!!window.__game');await q.click('#btnLedger');await q.click('[data-filter="training"]');idx=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="tS")');await q.click('[data-i="'+str(idx)+'"]');await q.wait_for_function('__game.STAGE.id==="tS"');await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();window.__tick=t=>{for(let n=0;n<t-1e-6;n+=.01)G.update(.01)}}''')
  async def move_to(x,y):
   for target,axis,lo,hi in [(y,'y','ArrowUp','ArrowDown'),(x,'x','ArrowLeft','ArrowRight')]:
    for _ in range(80):
     if await q.evaluate('__game.S.over'):return
     value=await q.evaluate('(axis)=>__game.S.player[axis]',axis);delta=target-value
     if abs(delta)<3:break
     key=lo if delta<0 else hi;await q.keyboard.down(key);await q.evaluate('t=>__tick(t)',min(.15,abs(delta)/68.75));await q.keyboard.up(key)
    else:raise AssertionError(('movement blocked',x,y,await q.evaluate('[__game.S.player.x,__game.S.player.y]')))
  await q.keyboard.press('Control');await q.evaluate('__tick(.02)');await move_to(440,432);assert await q.evaluate('__game.S.tutI===1')
  await q.keyboard.down('b');await q.evaluate('__tick(2.5)');await q.keyboard.up('b');assert await q.evaluate('__game.S.tutI===2')
  await q.keyboard.press('k');await q.click('[data-skill="chain"]');await q.keyboard.press('Escape');await q.evaluate('__tick(.02)')
  await move_to(906,456);assert await q.evaluate('__game.S.tutI===4'),await q.evaluate('[__game.S.tutI,__game.S.player.x,__game.S.player.y]')
  await q.keyboard.down('b');await q.evaluate('__tick(3.6)');await q.keyboard.up('b');assert await q.evaluate('__game.S.tutI===5&&!__game.S.over'),await q.evaluate('({step:__game.S.tutI,over:__game.S.over,stats:__game.S.stats,anim:__game.S.player.assassinAnim,choice:__game.assassinOpportunity(),guards:__game.S.guards.map(g=>({id:g.id,state:g.state,x:g.x,y:g.y,a:g.a,seen:g.seen,meter:g.meter}))})')
  exit=await q.evaluate('({x:__game.S.exit.x,y:__game.S.exit.y})');await move_to(exit['x'],exit['y'])
  await q.wait_for_timeout(600);assert await q.locator('#endTitle').text_content()=='연습 끝'
  result=await q.evaluate('({over:__game.S.over,kills:__game.S.stats.kills,dual:__game.S.stats.dualAssassinations,chain:__game.S.stats.chainAssassinations,exitOpen:__game.S.exitOpen,stage:__game.STAGE.id,stars:__game.totalStars(),position:[__game.S.player.x,__game.S.player.y]})');assert result['over'] and result['kills']==4 and result['stars']==0,result;assert not errors,errors
  (R/'build/skills-v147/native-practice.json').write_text(json.dumps({'result':result,'errors':errors,'input':'Actual keyboard movement from ledger through both abilities to exit; packaged build; no position changes'},ensure_ascii=False,indent=2));print('PASS',result);await b.close()
asyncio.run(main())
