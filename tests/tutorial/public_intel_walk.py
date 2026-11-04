"""Native route from the fresh first contract to public intel, leaving every guard alone.
Stepped simulation clock with all actors/security active; no state or inventory overrides.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import open_game
R=Path(__file__).resolve().parents[2];O=R/'build/review-v172';O.mkdir(exist_ok=True)
BASE=sys.argv[1]if len(sys.argv)>1 else'http://127.0.0.1:8001/public/'
LABEL=sys.argv[2]if len(sys.argv)>2 else'local'
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None)
  for touch in [False,True]:
   name=LABEL+('-touch'if touch else'-pc');q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await open_game(q,BASE+'?nostats');await q.click('#btnLedger');i=await q.evaluate('__game.STAGES.findIndex(s=>s.id==="m2")');await q.click(f'[data-i="{i}"]');await q.click('#btnBrGo');await q.keyboard.press('Escape')
   await q.evaluate('window.tick=s=>{for(let t=0;t<s-1e-6;t+=.01)__game.advanceGameFrame(.01)};tick(.7)');cdp=await q.context.new_cdp_session(q)
   async def move(x,y):
    for target,axis,lo,hi in [(x,'x','ArrowLeft','ArrowRight'),(y,'y','ArrowUp','ArrowDown')]:
     last=None
     for n in range(300):
      at=await q.evaluate('a=>({v:__game.S.player[a],hp:__game.S.player.hp,over:__game.S.over})',axis);d=target-at['v']
      assert not at['over'],(name,'died',at)
      if abs(d)<2.5:break
      assert last is None or abs(last-at['v'])>.03,(name,'blocked',x,y,axis,at)
      last=at['v']
      if touch:
       dx=(1 if d>0 else-1)if axis=='x'else 0;dy=(1 if d>0 else-1)if axis=='y'else 0
       await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':55,'y':520,'id':1}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':55+dx*48,'y':520+dy*48,'id':1}]})
      else:await q.keyboard.down(lo if d<0 else hi)
      await q.evaluate('s=>tick(s)',min(.1,abs(d)/125))
      if touch:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:await q.keyboard.up(lo if d<0 else hi)
     else:raise AssertionError((name,'route timeout'))
   for at in [(408,1032),(408,840),(456,792),(504,744),(552,696),(648,696),(648,504)]:await move(*at)
   await q.evaluate('tick(27);__game.updateHUD(true);__game.moveCamera(1);__game.benchDraw(1)')
   result=await q.evaluate('''()=>{const G=__game,S=G.S;return{hp:S.player.hp,seconds:S.t,code:S.player.keys.code,corpses:S.corpses.length,disguise:S.player.disguise,goal:G.nextGoal().text,stats:S.stats,identities:document.querySelector('#missionIdentity').innerText}}''')
   assert result['code']and result['corpses']==0 and not result['disguise']and result['hp']==3 and not errors,(result,errors)
   await q.screenshot(path=str(O/(name+'-public-intel.png')));rows.append({'touch':touch,**result,'errors':errors,'method':__doc__.strip()});print('PASS untouched public route',name,json.dumps(result,ensure_ascii=False),flush=True);await q.close()
  await b.close()
 (O/(LABEL+'-public-intel.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
