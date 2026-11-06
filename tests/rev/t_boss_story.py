"""Cast rendering, late-story disclosure and an actual save/route extension.
Controlled state fixtures; native assassination routes are tested separately.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
O=R/'build/boss-v205';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for width,height,touch in [(1280,800,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
   portraits=[]
   for id in ['p0','e1','e5','m2','m4','m7','m5']:
    await q.evaluate('id=>__game.start(__game.STAGES.findIndex(s=>s.id===id),true)',id)
    print('CHECK',width,id,flush=True)
    await q.wait_for_function('(__game.updateHUD(true),!__game.warmStatus.pending&&[...document.querySelectorAll("#brIdentity .target canvas")].every(c=>c.dataset.ready))',polling=100)
    rows=await q.evaluate('''()=>{const G=__game;return G.S.guards.filter(g=>g.target).map(g=>({name:G.targetName(g),key:G.characterLook(g),speaker:G.speakerOf(g),palette:G.characterPalette(g)}))}''')
    assert await q.locator('#brStory').is_visible()
    assert await q.locator('.target-profile').count()==len(rows)
    assert all(row['speaker']['role'] and row['speaker']['key']==row['key'] for row in rows),rows
    assert not await q.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,id,'overflow')
    assert await q.locator('#btnBrGo').evaluate('e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.y>=0&&r.bottom<=innerHeight+1&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),(width,id,'departure hidden')
    if id in ['m4','m5']:await q.screenshot(path=str(O/f'{id}-{width}.png'))
    if id in ['m7','m5']:
     assert await q.locator('.br-cast canvas[data-speaker="master"]').evaluate('e=>e.parentElement.hidden'),'betrayer is still presented as handler'
     assert await q.evaluate('__game.episodeRadioMessage()===null'),'betrayer guides the player during the finale'
    portraits+=rows
   assert len({r['key'] for r in portraits})==len(portraits),'major targets share the same look'
   assert len({tuple(r['palette'][2:]) for r in portraits})==len(portraits),'major targets share clothing colours'
   checks=await q.evaluate('''()=>{
    const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};
    const ids=G.LEARNING_ROUTE;ok(ids.at(-1)==='m5'&&new Set(ids).size===ids.length,'finale route');
    ok(G.mainContracts().map(G.contractNumber).join()==='01,02,03,04,05','legacy contract numbers changed');
    localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(ids.filter(id=>id!=='m5').map(id=>[id,{_clear:true}]))));
    const budget=G.skillBudget();ok(G.STAGES[G.recommendedStage()].id==='m5','finished old campaign cannot continue to finale');ok(!JSON.parse(localStorage.getItem('yahaeng.ch')).m5&&G.skillBudget()===budget,'route mints a clear or points');
    const g=G.S.guards.find(g=>g.target),before=JSON.stringify([g.x,g.y,g.state,g.meter,G.S.player.hp,G.S.stats.detected,G.S.stats.kills]);
    const look=G.characterLook(g),sp=G.speakerOf('master');ok(look===sp.key+'@old','crow does not match familiar handler');
    G.saveCheckpoint();ok(G.loadCheckpoint(),'checkpoint failed');const restored=G.S.guards.find(g=>g.target);
    ok(G.characterLook(restored)===look&&JSON.stringify([restored.x,restored.y,restored.state,restored.meter,G.S.player.hp,G.S.stats.detected,G.S.stats.kills])===before,'cast migration changes gameplay state');
    const S=G.S;S.koNext=true;G.killGuard(restored);G.saveCheckpoint();G.CP.S.corpses.find(c=>c.target).ch='noble';ok(G.loadCheckpoint(),'old KO checkpoint failed');
    ok(G.S.corpses.find(c=>c.target).ch===look&&G.S.guards.find(g=>g.target).unconscious,'old body has wrong identity or is killed by migration');
    return ['old campaign continues at finale without a reward','numbering and checkpoint state preserved','familiar handler and boss share appearance','old unconscious target keeps identity and life'];
   }''')
   assert not errors,errors
   (O/f'cast-{width}.json').write_text(json.dumps({'cast':portraits,'checks':checks},ensure_ascii=False,indent=2));print('PASS boss story',width,checks,flush=True)
   await q.close()
  await b.close()
asyncio.run(main())
