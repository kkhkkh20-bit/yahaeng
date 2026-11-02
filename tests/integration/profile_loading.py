"""Cold local HTTP bodies and real menu lifecycle, with the native frame loop."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/refactor-v141'
async def main():
 results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for name,path in [('before','build/refactor-v141/before-web/'),('after','public/')]:
   for touch in [False,True]:
    q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
    await q.add_init_script('localStorage.clear();window.__pf={u:[],d:[]};let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
    await q.goto('http://127.0.0.1:8001/'+path+'?nostats',wait_until='load');await q.wait_for_function('__boot.state.ready');await q.wait_for_timeout(800)
    first=await q.evaluate('''()=>({time:__game.S.t,draws:__pf.d.length,files:performance.getEntriesByType('resource').filter(r=>r.name.startsWith(location.origin)).map(r=>({name:r.name.split('/').pop(),body:r.encodedBodySize})),sources:__game.spriteSources?.snapshot()})''')
    await q.wait_for_timeout(250);second=await q.evaluate('({time:__game.S.t,draws:__pf.d.length})')
    if name=='after':
     assert first['time']==second['time']==0,(first,second)
     assert first['draws']==second['draws']==0,(first,second)
     assert set(first['sources']['loaded'])=={'hero','heroMotion'},first
     await q.click('#btnQuick');assert await q.evaluate('__game.STAGE.id')=='tB'
     before=await q.evaluate('__game.S.player.x');await q.keyboard.down('ArrowRight');await q.wait_for_timeout(200);await q.keyboard.up('ArrowRight');assert await q.evaluate('__game.S.player.x')>before+3
     await q.click('#btnPause');await q.click('#btnMenu2');await q.wait_for_timeout(150);idle=await q.evaluate('__game.S.t');await q.wait_for_timeout(150);assert await q.evaluate('__game.S.t')==idle
    assert not errors,errors
    results.append({'release':name,'touch':touch,'bodyBytes':sum(f['body'] for f in first['files']),'requests':len(first['files']),'idleTimeAdvanced':second['time']-first['time'],'idleDraws':second['draws']-first['draws'],'sources':first.get('sources'),'errors':errors});await q.close()
  await b.close()
 (O/'loading.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS cold loading and native menu lifecycle',results)
if __name__=='__main__':asyncio.run(main())
