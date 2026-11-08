"""Controlled perception fixtures: compact access, danger priority and real reading controls."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(390,844),(390,640),(320,568),(844,390),(568,320)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=True,is_mobile=True);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p1'));while(G.DLG.modal)G.advanceDialog();const S=G.S;Object.assign(S.player,{x:960,y:552,outfit:'crew',disguise:'sam',light:.5});S.starterPass=true;S.expo=0;S.alevel=0;for(const g of S.guards){g.seen=false;g.eyeT=0;g.meter=0;}G.updateHUD(true)}''')
   assert await q.locator('#accessLbl').is_visible(),'innocent disguise has no visible permission'
   assert '통행 허용' in await q.locator('#accessLbl').inner_text()
   assert await q.locator('#expoLbl').is_hidden(),'duplicate quiet-state text'
   mission=await q.locator('#objectiveSummary').inner_text();assert '처치' in mission and '탈출' in mission
   assert await q.locator('#btnAct [data-field-icon]').count()==1,'new control has no actual SVG icon'
   await q.evaluate('''()=>{const G=__game,S=G.S,g=S.guards[0];S.expo=2;Object.assign(g,{state:'ALERT',seen:true,sightAt:S.t,sightFl:0,sightZ:0});G.updateHUD(true)}''')
   await q.wait_for_timeout(130);await q.evaluate('__game.syncEpisodeRadio()')
   assert await q.locator('#objectiveSummary').inner_text()==mission,'chase replaced the overall mission'
   assert '시야 끊고 숨어' in await q.locator('#episodeRadioText').inner_text(),'radio leaves work as the instruction during chase'
   assert await q.locator('#expoLbl').is_visible() and '발각' in await q.locator('#expoLbl').inner_text()
   assert await q.locator('#accessLbl').is_hidden(),'permission competes with an actual detection'
   await q.evaluate("()=>{const G=__game,S=G.S;for(const g of S.guards){g.state='SEARCH';g.seen=false;}S.player.hidden=true;S.alevel=2;S.searchCause={kind:'player',t:S.t};}")
   await q.wait_for_timeout(800);await q.evaluate('__game.syncEpisodeRadio()')
   assert '지금은 움직이지 마' in await q.inner_text('#episodeRadioText'),'resolved chase keeps shouting to run'
   assert await q.locator('#episodeRadio').get_attribute('data-priority')=='1'

   await q.click('#hud .obj');assert await q.evaluate('__game.hudInspecting()')
   assert await q.locator('#objective').is_visible(),'full mission is lost in compact mode'
   await q.click('#hud .obj');assert not await q.evaluate('__game.hudInspecting()')
   await q.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p0'),false);while(G.DLG.modal)G.advanceDialog();Object.assign(G.S.player,{x:619,y:408,mode:'sneak'});G.updateHUD(true)}")
   assert '더 가까이' in await q.locator('#btnAct').get_attribute('aria-label'),'idle compact caption left a stale approach action label'
   overlay=await q.evaluate("""()=>{const G=__game,hit=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    G.start(G.STAGES.findIndex(s=>s.id==='p0'),false);while(G.DLG.modal)G.advanceDialog();Object.assign(G.S.player,{x:1236,y:360,fl:1,mode:'sneak'});G.S.fade=0;G.update(.02);const speaker=G.S.guards.find(g=>g.target);Object.assign(speaker,{say:'연락은 아직인가? 다음 차가 곧 도착한다.',sayT:4,actionSpeechUntil:G.S.t+4});G.moveCamera(1);G.updateHUD(true);G.benchDraw(2);
    const speeches=G.SPEECH_R.map(r=>({left:(r.x-G.cam.x)*G.SCALE+innerWidth/2,top:(r.y-G.cam.y)*G.SCALE+innerHeight/2,right:(r.x+r.w-G.cam.x)*G.SCALE+innerWidth/2,bottom:(r.y+r.h-G.cam.y)*G.SCALE+innerHeight/2}));
    if(!speeches.length)throw Error('NPC dialogue was hidden instead of relocated');
    const fixed=[...document.querySelectorAll('#saveState,#hud .joyhint,#quickItems>button')].filter(e=>!e.hidden&&!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width).map(e=>e.getBoundingClientRect());
    if(speeches.some(s=>fixed.some(r=>hit(s,r))))throw Error('NPC dialogue is obscured by fixed HUD feedback');
    G.start(G.STAGES.findIndex(s=>s.id==='p1'),false);while(G.DLG.modal)G.advanceDialog();const S=G.S,g=S.guards.find(g=>g.tag==='uniformDonor');S.koNext=true;G.killGuard(g,null,null,true);Object.assign(S.player,{x:g.x-32,y:g.y,mode:'sneak'});S.fade=0;G.moveCamera(1);G.updateHUD(true);G.benchDraw(2);
    const c=S.corpses[0],sx=(c.x-G.cam.x)*G.SCALE+innerWidth/2,sy=(c.y-G.cam.y)*G.SCALE+innerHeight/2,r=document.getElementById('btnCycle').getBoundingClientRect();
    if(hit({left:sx-24,top:sy-20,right:sx+24,bottom:sy+15},r))throw Error('Target cycle covers the selected guard');
    return{speechVisible:true,feedbackSeparated:true,selectedGuardVisible:true};
   }""")
   # After dismissing the reading view, the replay control also avoids contextual buttons.
   await q.click('#hud .obj');await q.wait_for_timeout(130);await q.evaluate('__game.syncEpisodeRadio()')
   await q.click('#hud .obj');await q.wait_for_timeout(250);await q.evaluate('__game.syncEpisodeRadio()')
   assert await q.locator('#btnRadio').is_visible()
   assert await q.locator('#btnRadio').evaluate('''e=>{const a=e.getBoundingClientRect(),hit=b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return ![...document.querySelectorAll('.pad>button,.sysbtns>button,#btnPause,#mini')].filter(b=>!b.closest('[hidden]')&&getComputedStyle(b).visibility!=='hidden'&&b.getBoundingClientRect().width).some(b=>hit(b.getBoundingClientRect()))}'''),'radio replay overlaps a game control'
   assert not errors,errors;print('PASS field HUD quiet/danger/reading and overlay collisions' ,w,h,flush=True);await q.close()
  await b.close()
asyncio.run(main())
