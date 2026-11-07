"""Story progression and contextual radio. Controlled states; native runs are separate."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 reports=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h in [(1440,900),(390,844),(320,568),(844,390)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=w!=1440,is_mobile=w!=1440);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.click('#btnQuick')
   checks=await q.evaluate('''()=>{
    const G=__game;let S=G.S,P=S.player;const ok=(v,m)=>{if(!v)throw Error(m)},out=[];
    ok(G.STAGE.storyEpisode&&G.STAGE.floors&&S.items[0].fl===1,'opening has no physical upstairs objective');ok(G.speakerOf('master').name==='까마귀'&&G.speakerOf('hero').name==='올빼미','guide/player identities');
    for(let n=0;n<G.STAGE.steps.length;n++){S.tutI=n;G.updateHUD(true);const m=G.episodeRadioMessage();ok(m&&m.text&&m.action&&!/튜토리얼|훈련|연습|undefined/.test(m.text+' '+m.action),'meta drill text '+n);ok(!document.getElementById('objective').textContent.includes('/10'),'visible drill counter');}
    S.tutI=0;const old=G.episodeRadioMessage();G.say([['master','끼어든 무전']],false);ok(G.episodeRadioMessage().action===old.action,'ambient interruption loses objective');G.saveCheckpoint();ok(G.loadCheckpoint()&&G.episodeRadioMessage().action===old.action,'restore loses current story instruction');
    S=G.S;P=S.player;P.fl=1;G.setLayer(1);G.update(.4);ok(S.tutI===7,'alternative upstairs route forced through knockout checklist');S.items[0].got=true;G.update(.4);G.checkObjective();ok(S.exitOpen,'actual heist complete still gated on body hiding');out.push('Crow persists across ambient messages and checkpoint; alternate route can finish actual objective');
    localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(['tB','p0','p1','p2','e1','e2','e3'].map(id=>[id,{_clear:true}]))));ok(G.STAGES[G.recommendedStage()].id==='e4','VIP cliff remains');
    for(const[id,next]of[['e4','e5'],['e5','m2']]){G.start(G.STAGES.findIndex(s=>s.id===id));const T=G.S;ok(G.STAGES[G.learningNext()].id===next,'bridge order '+id);ok(G.STAGE.storyEpisode&&!G.STAGE.tutorial&&G.STAGE.floors,'not a real story contract '+id);ok(T.guards.length===3&&T.cams.length===1,'bridge complexity '+id);ok(T.guards.some(g=>g.tag==='uniformDonor')&&!T.props.some(p=>p.outfit),'no real outfit source '+id);ok(!G.skillOn('electric')&&!G.skillOn('dart'),'bridge silently loans skills');const c=T.cams[0],point=G.cameraServicePoint(c);Object.assign(T.player,{x:point.x,y:point.y,fl:c.fl,z:0,outfit:'crew',disguise:'sam'});G.setLayer(c.fl);ok(G.cameraCableReachable(c),'camera guide points into wall '+id);for(const a of[c.base-c.sweep,c.base,c.base+c.sweep]){c.a=a;ok(!G.cameraAssessment(c,true).visible,'guide stands in full camera sweep '+id);}}
    G.S.player.captive=G.S.guards.find(g=>g.target);ok(G.episodeRadioMessage().action.includes('1초 길게'),'captured target receives a nonlethal guard instruction');G.S.player.captive=null;G.S.player.hidden=true;G.S.alevel=2;G.S.searchCause={kind:'player',t:G.S.t};ok(G.episodeRadioMessage().action.includes('대기'),'hidden pursued player told to leave cover');G.S.player.hidden=false;
    localStorage.setItem('yahaeng.ch',JSON.stringify(Object.fromEntries(['tB','p0','p1','p2','e1','e2','e3'].map(id=>[id,{_clear:true}]))));G.start(G.STAGES.findIndex(s=>s.id==='m2'));G.saveCheckpoint();const checkpoint=localStorage.getItem('yahaeng.cp'),budget=G.skillBudget();ok(G.STAGES[G.recommendedStage()].id==='m2','new bridges replace an in-progress VIP save');ok(localStorage.getItem('yahaeng.cp')===checkpoint&&G.skillBudget()===budget,'migration alters checkpoint or awards points');
    localStorage.setItem('yahaeng.ch',JSON.stringify({m2:{_clear:true}}));ok(G.STAGES[G.recommendedStage()].id==='m4','returning player replay imposed');ok(!JSON.parse(localStorage.getItem('yahaeng.ch')).e4,'grandfather migration invents rewards');
    localStorage.clear();G.start(G.STAGES.findIndex(s=>s.id==='tB'));G.moveCamera(1);G.updateHUD(true);G.syncEpisodeRadio();return out;
   }''')
   await q.wait_for_timeout(130);await q.evaluate('__game.syncEpisodeRadio()')
   probe='''()=>{const G=__game,P=G.S.player,e=document.getElementById('episodeRadio'),r=e.getBoundingClientRect(),px=(P.x-G.cam.x)*G.SCALE+innerWidth/2,py=(P.y-G.cam.y)*G.SCALE+innerHeight/2,over=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;const avatar={left:px-22,right:px+22,top:py-48,bottom:py+10};return{visible:!e.hidden,w:r.width,h:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,avatar:over(r,avatar),buttons:[...document.querySelectorAll('.pad>button:not([hidden]),.sysbtns button')].filter(b=>getComputedStyle(b).display!=='none').filter(b=>over(r,b.getBoundingClientRect())).map(b=>b.id),text:e.innerText,detail:document.getElementById('objective').getBoundingClientRect().height}}'''
   layout=await q.evaluate(probe)
   assert layout['visible']==(h>480) and layout['inside'] and not layout['avatar'] and not layout['buttons'],(w,layout)
   assert layout['detail']==0 and '제비가 사라졌습니다' in layout['text'],layout
   for step in range(10):
    await q.evaluate('n=>{__game.S.tutI=n;__game.updateHUD(true)}',step);await q.wait_for_timeout(130);await q.evaluate('__game.syncEpisodeRadio()')
    frame=await q.evaluate(probe);assert frame['inside'] and not frame['avatar'] and not frame['buttons'],(w,step,frame)
   await q.keyboard.press('Escape');await q.evaluate('__game.syncEpisodeRadio()');assert await q.locator('#episodeRadio').is_hidden()
   await q.keyboard.press('Escape');await q.click('#hud .obj');await q.wait_for_timeout(130);await q.evaluate('__game.syncEpisodeRadio()');assert await q.locator('#episodeRadio').is_visible();assert '올빼미' in await q.locator('#episodeRadio').inner_text() and '혼잣말' in await q.locator('#episodeRadio').inner_text()
   assert not errors,errors;reports.append({'viewport':[w,h],'checks':checks,'layout':layout,'errors':errors});await q.close();print('PASS story episodes',w,flush=True)
  await b.close()
 out=R/'build/story-v204';out.mkdir(exist_ok=True);(out/'rules.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
asyncio.run(main())
