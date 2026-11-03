"""Buy electrical skill through the real UI, then use a real switch with PC/touch.
The character is placed at an authored switch to isolate the unlock interaction;
first_session.py separately verifies the complete light lesson with actual movement.
"""
import asyncio,json,os,sys
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];BASE=sys.argv[1]if len(sys.argv)>1 else(R/'build/preview_city.html').as_uri();O=R/'build/skills-v151';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(proxy={'server':os.environ['HTTPS_PROXY']}if BASE.startswith('https:')else None);results=[]
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(BASE,timeout=120000);await q.wait_for_function('!!window.__game',timeout=120000);label='touch'if mobile else'pc'
   await q.evaluate('''()=>{
    const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];
    for(const l of S.lamps){if(l.hearth||l.fl||l.z||l.off||l.broken)continue;const at=G.lampControl(l);Object.assign(P,{x:at.x,y:at.y+20,z:0,fl:0});G.setLayer(0);if(G.objectReachable(at,60)&&G.envChoices().some(a=>a.l===l)){window.lampFixture=l;break;}}
    if(!window.lampFixture)throw Error('No authored switch fixture');
    window.selectSwitch=()=>{const a=G.envChoices().find(a=>a.l===lampFixture);if(!a)throw Error('Switch action missing');G.selectEnvTarget(G.envToken(a));};
    window.tick=t=>{for(let n=0;n<t-1e-6;n+=.01)G.update(.01)};
    window.render=()=>{S.fade=0;G.cam.x=P.x;G.cam.y=P.y-20;G.updateHUD(true);G.benchDraw(1)};selectSwitch();render();
   }''')
   assert await q.evaluate('__game.envAction().skillLocked==="electric"&&!__game.skillOn("electric")&&!document.querySelector("#btnCarry").classList.contains("ready")')
   assert '전기 조작' in await q.locator('#btnCarry').text_content();await q.screenshot(path=str(O/f'electric-locked-{label}.png'))
   async def press():
    if mobile:await q.tap('#btnCarry')
    else:await q.keyboard.press('x')
    await q.evaluate('tick(.6);render()')
   await press();assert await q.evaluate('!lampFixture.off&&!__game.S.player.interact'),'Unlearned switch commits'
   await q.keyboard.press('k')
   if mobile:await q.locator('button[data-branch="tools"]').click()
   await q.locator('[data-select="kit"]').click();await q.locator('[data-learn="kit"]').click();await q.locator('[data-select="electric"]').click();await q.locator('[data-learn="electric"]').click();assert await q.evaluate('__game.skillOn("electric")&&__game.skillBudget()-__game.skillSpent(__game.loadSkillTree())===2')
   await q.screenshot(path=str(O/f'electric-learn-{label}.png'));await q.click('#btnSkillsBack');await q.evaluate('selectSwitch();render()')
   assert await q.evaluate('!__game.envAction().skillLocked');await press();assert await q.evaluate('lampFixture.off&&!__game.lampOn(lampFixture)'),'Learned switch cannot turn off'
   await q.screenshot(path=str(O/f'electric-off-{label}.png'));await press();assert await q.evaluate('!lampFixture.off'),'Learned switch cannot turn on';assert not errors,errors
   results.append({'mobile':mobile,'version':await q.evaluate('window.__BUILD_VERSION__'),'base':BASE,'fixture':'Authored mission switch; player placed at it; guards removed to isolate UI','input':'Native keyboard / touchscreen: locked action, K tree, kit and electric purchase, switch off and on','remainingPoints':2,'pageErrors':errors});print('PASS',label,flush=True);await q.close()
  (O/'electric-journey.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));await b.close()
asyncio.run(main())
