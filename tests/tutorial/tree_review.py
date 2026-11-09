"""Actual browser captures of all branches and sticky navigation at small sizes."""
import asyncio,json
from pathlib import Path
from episode_training import select_skill_node
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/skills-v151';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();records=[]
  for width,height,mobile in [(1440,900,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.click('#btnLedger');await q.click('#btnSkillsLedger')
   label='pc'if not mobile else'touch-'+str(width)
   for branch in ['body','assassin','tools']:
    if width<=900:await q.locator('button[data-branch="'+branch+'"]').click()
    name=f'tree-{branch}-{label}.png';await q.screenshot(path=str(O/name));records.append({'file':name,'branch':branch,'width':width,'height':height})
    assert await q.evaluate('''()=>{const e=document.querySelector('#skillScreen');return e.scrollWidth<=innerWidth+1}'''),'Tree causes horizontal overflow'
    assert await q.evaluate('''()=>[...document.querySelectorAll('#skillCards button')].filter(b=>b.offsetWidth&&!b.disabled).every(b=>b.getBoundingClientRect().height>=44)'''),'Tree touch targets are too small'
    if not mobile:break
   if width<=900:
    await q.evaluate('''()=>{const G=__game,st=G.STAGES.find(s=>s.id==='m1'),record={_clear:true};st.challenges.slice(0,5).forEach(k=>record[k]=true);localStorage.setItem('yahaeng.ch',JSON.stringify({m1:record}));G.storeSkillTree({schema:1,learned:[]});}''')
    await q.locator('button[data-branch="tools"]').click()
    for skill in ['kit','radio','hack','signal']:
     await select_skill_node(q,skill);await q.locator('[data-learn="'+skill+'"]').click(timeout=5000)
    assert await q.evaluate('__game.loadSkillTree().learned.includes("signal")'),'Cannot learn deep tool nodes in small viewport'
   await q.evaluate('''()=>{const e=document.querySelector('#skillScreen');e.scrollTop=e.scrollHeight}''');await q.wait_for_timeout(50);r=await q.locator('#btnSkillsBack').bounding_box();assert r and r['y']>=0 and r['y']+r['height']<=height,'Back button disappears when scrolling';await q.click('#btnSkillsBack');assert await q.locator('#ledger').is_visible()
   # Preview the real skill button in the landscape action layout as well.
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tS'));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.update(.02);G.cam.x=G.S.player.x;G.cam.y=G.S.player.y;G.benchDraw(1)}''');r=await q.locator('#btnSkill').bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=width and r['y']+r['height']<=height
   assert await q.evaluate('''()=>{const r=document.querySelector('#btnSkill').getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#btnSkill')}'''),'Skill control is overlapped'
   assert not errors,errors;await q.close()
  (O/'screens.json').write_text(json.dumps(records,ensure_ascii=False,indent=2));print('PASS three visible branches, 4 viewports, costs, 44px targets, sticky back and action-button hit targets');await b.close()
asyncio.run(main())
