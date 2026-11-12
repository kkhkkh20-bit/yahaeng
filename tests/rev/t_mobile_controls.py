"""Context controls stay separate; mouse PCs retain every action through keys."""
import asyncio,json,math
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/review-v166';O.mkdir(exist_ok=True)
SETUP='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;window.baseGuard={...S.guards.find(g=>!g.civ&&!g.dog&&!g.child)};S.guards=[];S.corpses=[];S.cams=[];for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];S.vehicles=null;S.camRoom=null;S.facOn=false;Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,a:0});G.setLayer(0);S.fade=0;window.scene=kind=>{P.captive=null;S.guards=[];S.corpses=[];if(kind==='grab'){const g={...baseGuard,id:991,x:P.x+30,y:P.y,fl:0,z:0,a:0,want:0,state:'PATROL',seen:false,meter:0,target:false,doomed:false};S.guards=[g]}if(kind==='clothes')S.corpses=[{x:P.x+24,y:P.y,fl:0,z:0,ch:'sam',outfit:'crew',ko:true,carried:false,stashed:false,hidden:false}];S.t+=1;G.updateHUD(true);G.moveCamera(1);G.benchDraw(1)};scene('empty');}'''
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(320,480,True),(320,568,True),(390,844,True),(430,932,True),(568,320,True),(667,375,True),(740,360,True),(844,390,True),(1024,600,True),(1280,800,False),(390,844,False)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   # Having the API present must not turn a mouse PC into a phone.
   await q.add_init_script("window.requestAnimationFrame=()=>0;localStorage.clear();if(!matchMedia('(pointer: coarse)').matches)Object.defineProperty(window,'ontouchstart',{value:null,configurable:true})")
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100);await q.evaluate(SETUP)
   for scene in ['empty','grab','clothes']:
    await q.evaluate('scene',scene)
    controls=await q.locator('#hud button,#mini').evaluate_all('''es=>es.filter(e=>!e.hidden&&e.getBoundingClientRect().width&&getComputedStyle(e).visibility==='visible').map(e=>{const r=e.getBoundingClientRect(),br=getComputedStyle(e).borderRadius;return{id:e.id,x:r.x,y:r.y,w:r.width,h:r.height,round:Math.abs(r.width-r.height)<.5&&(br.includes('%')?parseFloat(br)>=50:parseFloat(br)>=r.width/2)}})''')
    assert all(a['w']>=44 and a['h']>=44 and a['x']>=0 and a['y']>=0 and a['x']+a['w']<=w+.5 and a['y']+a['h']<=h+.5 for a in controls),(w,h,scene,controls)
    for i,a in enumerate(controls):
     for c in controls[i+1:]:
      # v239 radial arc: circular satellites sit diagonally around the main button, so measure circles by their real outline.
      if a['round'] and c['round']:assert math.dist((a['x']+a['w']/2,a['y']+a['h']/2),(c['x']+c['w']/2,c['y']+c['h']/2))>=a['w']/2+c['w']/2+6,(w,h,scene,a,c)
      else:assert not(a['x']<c['x']+c['w']+6 and a['x']+a['w']+6>c['x'] and a['y']<c['y']+c['h']+6 and a['y']+a['h']+6>c['y']),(w,h,scene,a,c)
    if touch:
     if scene=='clothes':
      assert 'btnCycle' in [a['id']for a in controls],controls
      primary=await q.evaluate('__game.envAction().k')=='dress'
      assert ('btnCarry' if primary else 'btnDress') in [a['id']for a in controls],controls
      if primary:assert await q.locator('#btnDress').is_hidden() and '옷 입기' in await q.locator('#btnCarry').inner_text()
     if scene=='grab':assert 'btnGrab'in [a['id']for a in controls],controls
    else:assert all(a['id']in ['btnPause','mini']for a in controls),controls
   await q.screenshot(path=str(O/(f'controls-{w}x{h}-'+('mobile'if touch else'pc')+'.png')))
   if not touch:
    await q.keyboard.press('i');assert await q.locator('#loadout').is_visible();await q.click('#tools [data-t=coin]');assert await q.evaluate('__game.input.tool==="coin"&&document.activeElement.id==="game"')
    await q.keyboard.press('Shift+Tab');assert await q.locator('#envPicker').is_visible();await q.locator('[data-env-token^="dress:"]').click();await q.keyboard.press('x');assert await q.evaluate('__game.S.player.interact?.pose==="dress"')
   assert not errors,errors;rows.append({'viewport':[w,h],'touch':touch,'contexts':['empty','grab','clothes'],'gap':6,'errors':errors});print('PASS mobile-only separated controls',w,h,touch,flush=True);await q.close()
  await b.close();(O/'controls-checks.json').write_text(json.dumps(rows,indent=2))
asyncio.run(main())
