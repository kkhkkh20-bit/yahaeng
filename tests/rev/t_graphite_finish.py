"""The approved frame finish must remain legible, contained and visibly stateful."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/hud-v164';O.mkdir(exist_ok=True)
SETUP='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.corpses=[];Object.assign(P,{x:768,y:744,fl:0,z:0,interact:null,carrying:null,hide:null});G.setLayer(0);S.fade=0;G.update(.02);G.moveCamera(1);G.updateHUD(true);G.benchDraw(1)}'''
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();rows=[]
  for name,w,h,touch in [('mobile',390,844,True),('small',320,568,True),('landscape',844,390,True),('pc',1280,800,False)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.evaluate(SETUP)
   # Decode every embedded frame; do not ship broken image placeholders.
   frames=await q.evaluate('''async()=>{const s=getComputedStyle(document.documentElement),names=[...s].filter(k=>k.startsWith('--art-frame-'));return await Promise.all(names.map(async k=>{const i=new Image();i.src=s.getPropertyValue(k).trim().slice(4,-1).replace(/^['"]|['"]$/g,'');await i.decode();return[k,i.naturalWidth,i.naturalHeight]}))}''')
   assert len(frames)==9 and all(r[1]>0 and r[2]>0 for r in frames),frames
   controls=await q.locator('#hud button').evaluate_all('''es=>es.filter(e=>!e.hidden&&e.getBoundingClientRect().width&&getComputedStyle(e).visibility==='visible').map(e=>{const r=e.getBoundingClientRect();return{id:e.id,x:r.x,y:r.y,w:r.width,h:r.height}})''')
   assert all(e['w']>=44 and e['h']>=44 and 0<=e['x'] and 0<=e['y'] and e['x']+e['w']<=w+.5 and e['y']+e['h']<=h+.5 for e in controls),controls
   if touch:
    for i,a in enumerate(controls):
     for c in controls[i+1:]:assert not(a['x']<c['x']+c['w'] and a['x']+a['w']>c['x'] and a['y']<c['y']+c['h'] and a['y']+a['h']>c['y']),(a,c)
    carry=q.locator('#btnCarry');idle=await carry.evaluate('(e)=>getComputedStyle(e).borderImageSource')
    await q.evaluate('''()=>{const S=__game.S,P=S.player;S.corpses=[{x:P.x,y:P.y,fl:0,z:0,ch:'sam',outfit:'crew',ko:true,carried:false,hidden:false,stashed:false,g:{id:901,x:P.x,y:P.y,fl:0,z:0,state:'DEAD',child:false}}];S.t+=.1;__game.updateHUD(true)}''')
    ready=await carry.evaluate('(e)=>getComputedStyle(e).borderImageSource');assert ready!=idle,'Ready control frame did not change'
    rect=await carry.bounding_box();await carry.dispatch_event('pointerdown',{'button':0,'pointerId':31})
    pressed=await carry.evaluate('(e)=>getComputedStyle(e).borderImageSource');assert pressed!=ready,'Pressed control frame did not change';assert await carry.bounding_box()==rect,'Pressed finish shifted the hit box'
    await carry.dispatch_event('pointercancel',{'button':0,'pointerId':31})
    await q.evaluate(SETUP)
    attack=q.locator('#btnAct');normal=await attack.evaluate('(e)=>getComputedStyle(e).backgroundImage')
    await q.evaluate('''()=>{const S=__game.S,P=S.player;S.corpses=[{x:P.x,y:P.y,fl:0,z:0,ch:'sam',outfit:'crew',ko:true,carried:false,hidden:false,stashed:false,g:{id:901,x:P.x,y:P.y,fl:0,z:0,state:'DEAD',child:false}}];S.t+=.1;__game.updateHUD(true)}''')
    danger=await attack.evaluate('(e)=>getComputedStyle(e).backgroundImage');assert normal!=danger and await attack.evaluate('e=>e.classList.contains("kill")'),'Lethal finishing action has no distinct frame'
   await q.evaluate(SETUP);await q.screenshot(path=str(O/f'play-{name}.png'))
   await q.click('#btnToolNext');await q.screenshot(path=str(O/f'equipment-{name}.png'))
   # All visible text must stay inside the equipment surface, including the close control.
   assert await q.locator('#loadout').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
   await q.keyboard.press('Escape');assert not errors,errors;rows.append({'viewport':name,'frameImages':len(frames),'controls':controls,'nativeStates':touch,'pageErrors':errors});print('PASS graphite finish',name,flush=True);await q.close()
  await b.close();(O/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
