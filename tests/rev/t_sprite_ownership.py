"""Mission-owned decoded sprites, lazy disguises and sealed decorative windows."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/refactor-v141';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;requestIdleCallback=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.wait_for_timeout(300)
   menu=await q.evaluate('__game.spriteSources.snapshot()');assert set(menu['loaded'])=={'heroAgent','heroAgentMotion'},menu
   await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'))");await q.wait_for_timeout(500)
   windows=await q.evaluate('''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();G.update(.01);const list=G.S.windows.filter(w=>w.sealed);if(list.length!==2||!list.every(w=>w.st==='bar'))throw Error('obsolete blocked windows remain active');for(const w of list)for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1]])if(G.windowPassage(w,{x:w.x+x*48,y:w.y+y*48,z:0,fl:0}))throw Error('sealed glass offers traversal');return list.map(w=>[w.tx,w.ty]);}''')
   await q.evaluate("__game.prLoadBody('oldMotion')");await q.wait_for_function("__game.motionBodies.includes('oldMotion')")
   await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='tB'))");await q.wait_for_timeout(300)
   small=await q.evaluate('__game.spriteSources.snapshot()')
   allowed=await q.evaluate('''()=>{const G=__game,a=new Set(['heroAgent','heroAgentMotion','heroAgentGaitMotion','heroAgentLid']);for(const g of G.S.guards){const k=G.characterLook(g),bn=k.includes('@')?k.split('@')[1]:G.PR.looks[k];if(!bn)continue;a.add(bn);for(const n of Object.values(G.PR.fluidBodies[bn]||{}))a.add(n);if(G.PR.bodies[bn+'Motion'])a.add(bn+'Motion');}return [...a]}''')
   assert {'heroAgent','heroAgentMotion'}<=set(small['loaded']) and set(small['loaded'])<=set(allowed) and 'oldMotion'not in small['loaded'],small
   await q.evaluate("__game.takeProp({outfit:'staff'});__game.benchDraw(2)");await q.wait_for_function("__game.spriteSources.snapshot().loaded.includes('heroAgentWorker')")
   await q.evaluate('__game.benchDraw(2)');assert not errors,errors
   result={'touch':touch,'menu':menu,'afterTutorialTransition':small,'unneededMotionReleased':True,'lazyUniformVisible':True,'sealedWindows':windows,'errors':errors};(O/f'sprite-{"touch"if touch else"pc"}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS sprite ownership',result,flush=True);await q.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
