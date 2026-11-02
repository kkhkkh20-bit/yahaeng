"""Actual PC/touch skill screens and attack phases, with no image editing."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v147';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();records=[]
  for width,height,mobile in [(1280,800,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.effectAtlas.ready');label='pc'if not mobile else f'touch-{width}'
   for scene in ['menu','dual-prepare','dual-hit','chain-move']:
    info=await q.evaluate('''scene=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tS'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;Object.assign(P,{x:420,y:432,mode:'sneak'});G.input.sneakToggle=true;G.update(.02);const tick=n=>{for(let t=0;t<n;t+=.01)G.update(.01)};
     if(scene==='menu'){G.openAssassinMenu();G.chooseAssassinSkill('chain');}
     else{if(scene==='chain-move'){S.keys.KeyB=true;G.combatPress('KeyB');G.beginAssassinSkill();tick(2.5);S.keys.KeyB=false;G.combatRelease('KeyB');G.openAssassinMenu();G.chooseAssassinSkill('chain');G.closeAssassinMenu();G.update(.02);P.x=888;P.y=456;G.update(.02);}S.keys.KeyB=true;G.combatPress('KeyB');G.beginAssassinSkill();tick(scene==='dual-prepare'?.55:scene==='dual-hit'?1.55:1.88);}
     S.fade=0;S.toasts=[];S.shakeT=0;G.cam.x=P.x;G.cam.y=P.y-20;G.updateHUD(true);G.benchDraw(1);return{phase:P.assassinAnim?.phase||'prepare',kills:S.stats.kills,position:[P.x,P.y],selected:S.selectedSkill};}''',scene)
    await q.wait_for_timeout(250);await q.evaluate('__game.benchDraw(1)');name=f'{scene}-{label}.png';await q.screenshot(path=str(O/name));records.append({'file':name,**info})
    if scene=='menu':await q.locator('#btnSkillsBack').click()
    if mobile and scene=='dual-prepare':
     assert await q.evaluate('''()=>{const b=document.querySelector('#btnSkill'),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&!!hit?.closest('#btnSkill')}'''),'Skill obscured or off screen'
   assert not errors,errors;await q.close()
  (O/'screens.json').write_text(json.dumps(records,ensure_ascii=False,indent=2));print('PASS actual skills screen captures, 4 viewports and touch hit targets');await b.close()
asyncio.run(main())
