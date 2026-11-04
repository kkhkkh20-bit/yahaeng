"""Fast retry and discovered opportunities. Controlled fixtures, native UI inputs;
these are separate from the live, no-override campaign walkthroughs.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/fun-v169';O.mkdir(exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
   await q.evaluate('''()=>{const G=__game;window.fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};fresh('m2');}''')
   await q.click('#btnPause');assert await q.locator('#btnCheckpointPause').is_hidden();await q.click('#btnResume')
   await q.evaluate('''()=>{const G=__game,S=G.S;window.points=G.skillBudget();G.saveCheckpoint();S.player.hp=1;S.items[0].got=true;S.stats.detected=3;G.updateHUD(true);}''')
   if touch:
    await q.tap('#btnPause');assert await q.locator('#btnCheckpointPause').is_visible();await q.tap('#btnCheckpointPause')
   else:await q.keyboard.press('F9')
   result=await q.evaluate('''()=>{const G=__game,S=G.S;return{hp:S.player.hp,item:S.items[0].got,detected:S.stats.detected,used:S.stats.cpUsed,points:G.skillBudget()}}''');assert result['hp']==3 and not result['item']and result['detected']==0 and result['used']==1 and result['points']==await q.evaluate('points'),result
   assert await q.locator('#pause').is_hidden()
   await q.keyboard.press('Escape');await q.keyboard.press('F9');assert await q.locator('#pause').is_hidden()and await q.evaluate('__game.S.stats.cpUsed===2')
   checks=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)};let S=fresh('m2');S.t=10;S.actionEntry.phase='done';G.setOppMode(1);G.selectMissionGoal('item:0');S.learned=['간판 밑 담배'];S.storyT=0;G.updateStories(.4);G.updateStoryNotices();
    ok(S.stories.find(s=>s.d.id==='sign').found,'earned clue not discovered');ok(S.toasts.some(t=>t.text.includes('새로운 기회')&&t.text.includes('간판')),'default mode hides discovery');ok(S.goalManual&&S.goalPin==='item:0'&&!S.storyTrackManual,'notice hijacks route');const n=S.toasts.length;G.updateStoryNotices();ok(S.toasts.length===n,'notice spams');out.push('earned default-mode discovery once; manual objective preserved');
    S=fresh('m2');S.t=10;G.setOppMode(0);S.learned=['간판 밑 담배'];G.updateStories(.4);G.updateStoryNotices();ok(!S.toasts.some(t=>t.text.includes('새로운 기회')),'disabled guidance talks');G.setOppMode(1);G.updateStoryNotices();ok(!S.storyNotices?.length,'disabled discovery queued for later');out.push('guidance off stays quiet, including after re-enable');
    S=fresh('m2');S.t=10;S.alevel=2;S.learned=['간판 밑 담배'];G.updateStories(.4);G.updateStoryNotices();ok(S.storyNotices.length&&!S.toasts.some(t=>t.text.includes('새로운 기회')),'notice interrupts chase');S.alevel=0;G.updateStoryNotices();ok(S.toasts.some(t=>t.text.includes('새로운 기회')),'deferred discovery lost');out.push('discovery waits through combat');
    S=fresh('m6');S.guards=[];const budget=G.skillBudget();Object.assign(S.player,{x:456,y:408,fl:0,z:0});G.updateCheckpoint(.6);ok(G.cpReady()&&G.CP.S.player.y===408,'quiet cell exit not saved');Object.assign(S.player,{x:840,y:312,fl:1});G.setLayer(1);G.updateCheckpoint(.6);ok(G.CP.S.player.fl===1&&G.skillBudget()===budget,'floor progress not saved or grants points');out.push('safe escape and floor milestones save without rewards');
    S=fresh('m4');ok(G.STAGE.start[1]===16&&S.notes.filter(n=>n.gives==='code').length===2,'street entry or alternate code source missing');ok(G.G0[8][8]!=='C','m6 screen leaks into m4');S=fresh('m6');ok(G.G0[8][8]==='C'&&G.G0[9][8]==='C','cell exit has no physical screen');out.push('authored street entry, alternate information and real cell screen');return out;
   }''')
   await q.evaluate("fresh('m2');__game.S.t=10;__game.S.learned=['간판 밑 담배'];__game.updateStories(.4);__game.updateHUD(true)")
   await q.click('#hud .obj');choice=q.locator('#objective [data-story-route="sign"]')
   if touch:await choice.tap()
   else:await choice.focus();await q.keyboard.press('Space')
   assert await q.evaluate("__game.S.storyTrack==='sign'&&__game.S.storyTrackManual&&!__game.hudInspecting()&&!__game.S.stats.kills&&!__game.S.stats.ko"),'native clue choice failed or triggered attack'
   before=await q.evaluate('__game.S.player.x');await q.keyboard.down('ArrowRight');await q.evaluate('()=>{for(let i=0;i<20;i++)__game.advanceGameFrame(.01)}');await q.keyboard.up('ArrowRight');assert await q.evaluate('__game.S.player.x')>before+5,'closed clue panel traps movement focus'
   checks.append('expanded objective chooses an earned route with touch/keyboard, resumes without attack')
   assert not errors,errors;rows.append({'touch':touch,'retry':result,'checks':checks,'errors':errors});await q.close()
  await b.close()
 (O/'replay-loop.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('PASS replay loop PC/mobile',rows)
asyncio.run(main())
