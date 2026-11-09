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
    const ids=G.LEARNING_ROUTE;ok(ids.at(-1)==='n1'&&new Set(ids).size===ids.length,'finale route');
    ok(G.mainContracts().map(G.contractNumber).join()==='01,02,03,04,05,06','legacy contract numbers changed');
    localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(ids.filter(id=>id!=='m5'&&id!=='n1').map(id=>[id,{_clear:true}]))));
    const budget=G.skillBudget();ok(G.STAGES[G.recommendedStage()].id==='m5','finished old campaign cannot continue to finale');ok(!JSON.parse(localStorage.getItem('yahaeng.ch')).m5&&G.skillBudget()===budget,'route mints a clear or points');
    const indoor=G.S.cams.filter(c=>c.b===0);ok(indoor.length===2,'headquarters camera fixtures disappeared');for(const c of indoor){const p=G.cameraServicePoint(c);G.setLayer(c.fl);ok([-13,13].every(dx=>[-13,13].every(dy=>!G.solidAt(Math.floor((p.x+dx)/48),Math.floor((p.y+dy)/48)))),'camera rear is inside a wall or furniture');}G.setLayer(0);
    const g=G.S.guards.find(g=>g.target),before=JSON.stringify([g.x,g.y,g.state,g.meter,G.S.player.hp,G.S.stats.detected,G.S.stats.kills]);
    const look=G.characterLook(g),sp=G.speakerOf('master');ok(look===sp.key+'@old','crow does not match familiar handler');
    G.saveCheckpoint();G.CP.grids[0][7][23]='E';G.CP.grids[0][8][13]='w';const locker=G.CP.S.hides.find(h=>h.furn&&h.type==='locker'&&h.tx===13&&h.ty===8);Object.assign(locker,{tx:23,ty:7,x:1128,y:360});ok(G.loadCheckpoint(),'checkpoint failed');ok(G.G0[7][23]==='w'&&G.G0[8][13]==='E'&&G.S.hides.find(h=>h.furn&&h.type==='locker'&&h.tx===13&&h.ty===8),'old camera furniture and hiding space were not migrated');const restored=G.S.guards.find(g=>g.target);
    ok(G.characterLook(restored)===look&&JSON.stringify([restored.x,restored.y,restored.state,restored.meter,G.S.player.hp,G.S.stats.detected,G.S.stats.kills])===before,'cast migration changes gameplay state');
    G.saveCheckpoint();const oldHide=G.CP.S.hides.find(h=>h.furn&&h.type==='locker'&&h.tx===13&&h.ty===8);Object.assign(oldHide,{tx:23,ty:7,x:1128,y:360,bodies:1});const hiddenBody={x:1128,y:360,fl:0,stashed:true,container:oldHide,ko:true};G.CP.S.corpses.push(hiddenBody);G.CP.S.player.hide=oldHide;Object.assign(G.CP.S.player,{x:1128,y:360,hidden:true});ok(G.loadCheckpoint()&&G.S.player.x===648&&G.S.player.y===408&&G.S.player.hide.bodies===1&&G.S.corpses.at(-1).x===648&&G.S.corpses.at(-1).ko,'hidden player or stored body lost on furniture migration');G.S.player.hide=null;G.S.player.hidden=false;
    const S=G.S;S.koNext=true;G.killGuard(S.guards.find(g=>g.target));G.saveCheckpoint();G.CP.S.corpses.find(c=>c.target).ch='noble';ok(G.loadCheckpoint(),'old KO checkpoint failed');
    ok(G.S.corpses.find(c=>c.target).ch===look&&G.S.guards.find(g=>g.target).unconscious,'old body has wrong identity or is killed by migration');
    return ['old campaign continues at finale without a reward','numbering and checkpoint state preserved','familiar handler and boss share appearance','old unconscious target keeps identity and life'];
   }''')
   assert not errors,errors
   (O/f'cast-{width}.json').write_text(json.dumps({'cast':portraits,'checks':checks},ensure_ascii=False,indent=2));print('PASS boss story',width,checks,flush=True)
   await q.close()
  await b.close()
asyncio.run(main())
