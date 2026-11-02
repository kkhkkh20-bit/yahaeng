"""Repeatable browser measurements; decoded image bytes are an estimate, not phone RAM/FPS."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/refactor-v141';O.mkdir(exist_ok=True)
async def main():
 name=sys.argv[1] if len(sys.argv)>1 else 'after';file=O/'before.html' if name=='before' else R/'build/preview_city.html'
 async with async_playwright()as p:
  b=await p.chromium.launch();results=[]
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch)
   errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('''localStorage.clear();window.requestAnimationFrame=()=>0;window.requestIdleCallback=()=>0;let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const NativeImage=Image;window.__profileImages=[];window.Image=function(...args){const i=new NativeImage(...args);__profileImages.push(new WeakRef(i));return i};window.Image.prototype=NativeImage.prototype;''')
   await q.goto(file.as_uri()+'?nostats&tone=ink');await q.wait_for_function('!!window.__game');await q.wait_for_timeout(800)
   images='''()=>{const all=__profileImages.map(r=>r.deref()).filter(Boolean),loaded=all.filter(i=>i.complete&&i.naturalWidth);return {loadedImages:loaded.length,decodedRgbaEstimate:loaded.reduce((n,i)=>n+i.naturalWidth*i.naturalHeight*4,0),spriteSources:__game.spriteSources?.snapshot()||null}}'''
   cdp=await q.context.new_cdp_session(q);await cdp.send('HeapProfiler.collectGarbage');menu=await q.evaluate(images)
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();Object.assign(G.S.player,{x:21.5*48,y:16.5*48,fl:0,z:0,outfit:'crew',disguise:'sam'});G.S.fade=0;G.moveCamera(1);G.updateHUD(true)}''');await q.wait_for_timeout(800)
   await q.evaluate('__game.benchDraw(2)');await q.wait_for_timeout(350);await q.evaluate('__game.benchDraw(20)')
   timings=await q.evaluate('''()=>{const values=[];for(let i=0;i<60;i++){const t=performance.now();__game.benchDraw(1);values.push(performance.now()-t)}values.sort((a,b)=>a-b);return{drawMedianMs:values[30],drawP95Ms:values[57]}}''')
   await q.screenshot(path=str(O/f'{name}-{"touch"if touch else"pc"}.png'));active=await q.evaluate(images)
   # Deterministic stage transitions also expose decoded source retention.
   for stage in ['tB','m6','tB']:
    await q.evaluate('(id)=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();}',stage);await q.wait_for_timeout(250)
   await cdp.send('HeapProfiler.collectGarbage');after_transitions=await q.evaluate(images)
   assert not errors,errors;results.append({'touch':touch,'menu':menu,'activeM2':active,'afterTransitions':after_transitions,**timings,'errors':errors});await q.close()
  await b.close();(O/f'{name}.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())
