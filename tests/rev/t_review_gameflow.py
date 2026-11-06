"""Controlled game-flow scenes with native mouse/touch target and clue selection."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
   await q.evaluate('''()=>{const G=__game;window.fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};let S=fresh('m4');G.storeSkillTree({schema:1,rewardVersion:152,learned:['kit','dart']});S=fresh('m4');const P=S.player,g=S.guards[0],other=S.guards[1];Object.assign(P,{x:1584,y:792,a:0,fl:0,z:0});Object.assign(g,{x:1440,y:792,fl:0,z:0,state:'PATROL',doomed:false});Object.assign(other,{x:1690,y:792,fl:0,z:0,state:'PATROL',doomed:false});S.guards=[g,other];S.cams=[];S.facOn=false;G.updateHUD(true);G.moveCamera(1);G.benchDraw(1)}''')
   if touch:
    await q.tap('#btnToolNext');await q.tap('#tools [data-t="kunai"]')
   else:await q.keyboard.press('1')
   point=await q.evaluate('()=>{const G=__game,g=G.S.guards[0];return{x:(g.x-G.cam.x)*G.SCALE+innerWidth/2,y:(g.y-14-G.cam.y)*G.SCALE+innerHeight/2}}')
   if touch:await q.touchscreen.tap(point['x'],point['y'])
   else:await q.mouse.click(point['x'],point['y'])
   assert await q.evaluate('__game.S.marked===__game.S.guards[0]&&__game.kunaiTarget()?.ref===__game.S.marked'),'native marked target outside facing lost'
   await q.evaluate('__game.updateHUD(true)');assert '수금원'in await q.locator('#btnTool').get_attribute('aria-label')
   if touch:await q.tap('#btnTool')
   else:await q.keyboard.press('v')
   assert await q.evaluate('__game.S.kunais.length===1&&__game.S.kunais[0].tgt.ref===__game.S.marked')
   checks=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)};let S=G.S,P=S.player,g=S.guards[0],other=S.guards[1];
    g.x=P.x-700;P.a=0;const stock=P.kunai;ok(!G.kunaiTarget(),'unreachable marked target retargets another guard');G.actKunai();ok(P.kunai===stock&&S.kunais.length===1,'failed marked shot spends ammo');g.state='DEAD';ok(G.kunaiTarget()?.ref===other,'dead mark blocks new targets');out.push('native exact target outside facing; unreachable mark never silently retargets; dead mark releases');
    S=fresh('m4');P=S.player;g=S.guards[0];S.guards=[g];S.cams=[];S.facOn=false;Object.assign(P,{x:1008,y:792,a:0});Object.assign(g,{x:1108,y:792,fl:0,z:0,state:'PATROL',doomed:false});G.actKunai({type:'guard',ref:g,x:g.x,y:g.y,fl:0,z:0});G.kunaiHit(S.kunais[0]);let at=G.nextGoal();ok(at.unconscious&&at.text.includes('기절')&&at.where.includes('공격 길게')&&!S.exitOpen,'KO target has no finishing guidance or completes contract');const c=S.corpses.find(c=>c.g===g);c.stashed=true;c.container=S.hides[0];at=G.nextGoal();ok(at.stored&&at.where.includes('꺼낸'),'stored KO cannot be recovered');out.push('observed incapacitated target explains finishing and stored-body recovery without completing contract');
    S=fresh('m6');P=S.player;S.t=10;Object.assign(P,{x:456,y:408});G.updateStories(.4);const gear=S.stories.find(s=>s.d.id==='gear'),radio=S.stories.find(s=>s.d.id==='radio');ok(gear.found&&gear.d.steps[0].at&&radio.found&&radio.d.steps[0].at,'escaped prisoner cannot choose actual preparation routes');ok(G.nextGoal().text.includes('2층')&&!G.nextGoal().text.includes('압수품'),'optional equipment is mandatory');G.giveKey('gear');ok(!S.toasts.at(-1).text.includes('다트')===!G.abilityOn('dart'),'gear claims an unavailable dart');out.push('escaped prisoner has two selectable routes; equipment stays optional and capability text is truthful');
    G.setLayer(1);const post=S.guards[3],entry={x:792,y:504};ok(G.FURN.some(f=>f.t==='locker'&&f.fl===1&&f.x===15&&f.y===9),'no real landing cover');ok(!G.sightLine(post,entry.x,entry.y,0,false,1),'locker does not screen the landing');G.GF[1][9][15]='w';ok(G.sightLine(post,entry.x,entry.y,0,false,1),'cover fixture does not exercise actual sight');G.GF[1][9][15]='E';out.push('upper landing has a physical locker that blocks sight without changing guard perception');
    G.storeSkillTree({schema:1,learned:[]});S=fresh('m6');G.giveKey('gear');ok(!G.abilityOn('dart')&&!S.toasts.at(-1).text.includes('다트'),'unlearned equipment advertises a usable dart');
    S=fresh('m6');P=S.player;g=S.guards[0];S.guards=[g];S.cams=[];S.facOn=false;const it=S.items[0];Object.assign(P,{x:it.x,y:it.y,fl:1,z:0,hurtT:1,outfit:'crew',disguise:'sam',disguiseBlown:true,blown:{crew:true}});Object.assign(g,{x:it.x-20,y:it.y,fl:1,z:0});G.setLayer(1);S.koNext=true;G.killGuard(g);ok(G.envAction().k==='loot','exposed uniform or nearby body hides mission collection');const dress=G.envChoices().find(a=>a.k==='dress');ok(dress&&G.selectEnvTarget(G.envToken(dress))&&G.envAction().k==='dress','explicit clothing choice lost');G.selectEnvTarget(G.envToken(G.envChoices().find(a=>a.k==='loot')));G.actEnv();ok(!P.pick&&!it.got&&S.toasts.at(-1).text.includes('회복'),'blocked loot has no injury feedback');P.hurtT=0;G.actEnv();for(let i=0;i<60;i++){S.t+=.02;G.updatePlayer(.02);}ok(it.got,'stable player cannot resume collection');out.push('mission collection outranks unusable clothes; explicit selection survives; injury feedback and stable retry');
    const saveScene=(level,hidden)=>{const a=fresh('m4');a.guards=[];a.alevel=level;a.expo=0;a.player.hidden=hidden;a.player.mode='sneak';a.cpWant=true;return a};
    S=saveScene(2,false);for(let i=0;i<60;i++)G.updateCheckpoint(.1);ok(!G.cpReady(),'open search saves unsafely');S=saveScene(2,true);for(let i=0;i<20;i++)G.updateCheckpoint(.1);ok(!G.cpReady(),'instant shelter checkpoint');for(let i=0;i<30;i++)G.updateCheckpoint(.1);ok(G.cpReady(),'settled shelter loses earned progress');S=saveScene(3,true);for(let i=0;i<60;i++)G.updateCheckpoint(.1);ok(!G.cpReady(),'chase creates checkpoint');G.setDiff('hard');S=saveScene(2,true);for(let i=0;i<60;i++)G.updateCheckpoint(.1);ok(!G.cpReady(),'hard difficulty gains checkpoints');G.setDiff('normal');out.push('open search/chase/hard block saves; sustained unobserved shelter preserves earned progress');
    S=fresh('m4');ok(G.STAGE.start[0]===31&&G.zoneInfo(S.player.x,S.player.y,0,0).k===G.Z_PUB,'new opening is not a public observation point');return out;
   }''')
   await q.evaluate("const S=fresh('m6');S.t=10;S.player.x=456;S.player.y=408;__game.updateStories(.4);__game.updateHUD(true)")
   await q.click('#hud .obj');await q.locator('[data-story-route="gear"]').click();assert await q.evaluate("__game.S.storyTrack==='gear'&&__game.S.storyTrackManual&&!__game.hudInspecting()")
   assert not errors,errors;print('PASS overall flow',touch,json.dumps(checks,ensure_ascii=False),flush=True);await q.close()
  await b.close()
asyncio.run(main())
