"""Controlled mission, attribution and persistence fixtures; native retries and DOM.
Full walking routes live separately in tutorial/vip_choices_walk.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from episode_training import continue_episode
R=Path(__file__).resolve().parents[2];O=R/'build/physical-v190/vip-rules';O.mkdir(parents=True,exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.evaluate('localStorage.clear()')
   checks=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();return G.S};window.vipFresh=fresh;
    let S=fresh(),P=S.player,g=S.guards[0];ok(G.STAGE.start.join()==='18,21'&&G.zoneInfo(P.x,P.y,0,0).k===G.Z_PUB,'public club entry missing');ok(G.nextGoal().text.includes('관찰')&&!G.nextGoal().text.includes('금고'),'mandatory vault still comes first');ok(g.hasKey==='code'&&g.wait>20,'physical memo or opening observation window missing');Object.assign(P,{x:1272,y:762});G.update(.1);ok(S.vipObserved&&G.nextGoal().g===g,'broad front approach still blocks observation');G.selectMissionGoal('item:0');ok(G.nextGoal().id==='item:0','manual ledger choice overridden');G.selectAutoGoal();ok(G.nextGoal().g===g,'auto cannot return to target');out.push('public observation first, real opening window and free objective order');
    S=fresh();P=S.player;g=S.guards[0];S.guards=[g];Object.assign(P,{x:1152,y:768,light:1,mode:'sneak'});Object.assign(g,{x:1180,y:768});G.input.sneakToggle=true;G.update(.05);G.updateHUD(true);ok(G.workRiskReadout(G.attackAction())?.kind==='camera','close attack has no camera preview');ok(document.querySelector('#actionRiskLbl').textContent.includes('CCTV')&&document.querySelector('#actionRiskLbl').textContent.includes('제압'),'HUD hides witnessed attack');out.push('actual available attack previews existing camera rules before action');
    S.cams=[];Object.assign(g,{x:1320,y:744});Object.assign(P,{x:1292,y:744});S.lethalNext=true;G.killGuard(g);ok(S.keyDrop?.key==='code'&&!P.keys.code,'target memo granted remotely or missing');ok(G.nextGoal().text.includes('메모'),'target-first route loses physical memo');Object.assign(P,{x:S.keyDrop.x,y:S.keyDrop.y});G.update(.02);ok(P.keys.code&&G.nextGoal().text.includes('장부'),'actual memo pickup does not lead to ledger');ok(S.missionApproach==='흡연 동선 매복','actual smoking contact not attributed');S.items.forEach(it=>it.got=true);G.checkObjective();S.over=true;G.showEnd(true);let record=JSON.parse(localStorage.getItem('yahaeng.ch')),budget=G.skillBudget();ok(record.m2._approaches.smoke.clears===1&&Object.keys(record.m2._approaches).length===1,'wrong special approach receipt');S.over=true;G.showEnd(true);ok(JSON.parse(localStorage.getItem('yahaeng.ch')).m2._approaches.smoke.clears===1&&G.skillBudget()===budget,'same result counts twice or mints points');out.push('real physical memo, completed-run receipt and idempotent replay currency');
    return out;
   }''')
   await q.screenshot(path=str(O/f'result-{w}.png'));assert await q.locator('.vip-passport').is_visible();assert await q.locator('#btnRetry').is_hidden() and await q.locator('#skillScreen').is_visible()
   await continue_episode(q);assert await q.evaluate('__game.STAGE.id==="m4"'), 'VIP must continue linearly after training'
   checks+=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)};let S=vipFresh(),P=S.player,g=S.guards[0];S.guards=[g];S.cams=[];S.vipPlan={phase:'sick',drinking:0};Object.assign(g,{x:40.5*48,y:7.5*48,moving:false});Object.assign(P,{x:g.x,y:g.y+28});S.lethalNext=true;G.killGuard(g);ok(S.missionApproach==='화장실 유인','poison contact attribution follows wrong route');S.items.forEach(it=>it.got=true);G.checkObjective();S.over=true;G.showEnd(true);let r=JSON.parse(localStorage.getItem('yahaeng.ch'));ok(r.m2._approaches.emetic.clears===1&&r.m2._approaches.smoke.clears===1,'second method replaces first');const points=G.missionSkillPoints(r);r.m2._approaches.sign={clears:999,best:1,clean:true};ok(G.missionSkillPoints(r)===points,'collection changes earned skill credit');out.push('different actual setups accumulate without changing skill rewards');
    S=vipFresh();P=S.player;g=S.guards[0];S.guards=[g];S.cams=[];const meet=G.rendezvousState();meet.calls=1;meet.phase='travelling';Object.assign(g,{x:meet.room.x,y:meet.room.y,state:'PATROL',moving:true,wait:0});Object.assign(P,{x:g.x-28,y:g.y});S.lethalNext=true;G.killGuard(g);ok(S.missionApproach==='장부로 불러낸 매복','arrival ambush incorrectly requires completed waiting');S.items.forEach(it=>it.got=true);G.checkObjective();S.over=true;G.showEnd(true);ok(JSON.parse(localStorage.getItem('yahaeng.ch')).m2._approaches.meeting.clears===1,'arrival route receipt missing');out.push('physically summoned arrival counts as the planned ambush before the target stops');
    S=vipFresh();G.showEnd(false);ok(!S.vipReceipt&&!document.querySelector('.vip-passport'),'failure awards or displays a successful approach');S=vipFresh();S.over=true;G.showEnd(true);ok(!S.vipReceipt,'incomplete controlled win creates route receipt');out.push('failure, incomplete state and historical clear flags cannot mint an approach');
    S=vipFresh();P=S.player;g=S.guards[0];S.guards=[g];S.cams=[];Object.assign(g,{x:27.5*48,y:15.5*48,state:'ALERT',wait:0});Object.assign(P,{x:g.x-28,y:g.y});S.vipSmokingSeen=true;S.lethalNext=true;G.killGuard(g);ok(S.missionApproach==='직접 접근','remembered smoking scene labels a later fight as ambush');S.items.forEach(it=>it.got=true);G.checkObjective();S.over=true;G.showEnd(true);ok(!S.vipReceipt.id&&Object.keys(JSON.parse(localStorage.getItem('yahaeng.ch')).m2._approaches).length===3,'free approach fabricates a special route');out.push('later fights do not inherit an earlier smoking stamp; free approach still gets next-method suggestion');return out;
   }''')
   await q.reload();await q.wait_for_function('!!__game');assert await q.evaluate('JSON.parse(localStorage.getItem("yahaeng.ch")).m2._approaches.emetic.clears===1'),'collection lost on reload'
   assert await q.locator('#btnLedger').is_hidden();assert await q.evaluate('Object.keys(JSON.parse(localStorage.getItem("yahaeng.ch")).m2._approaches).length===3')
   assert await q.evaluate('document.documentElement.scrollWidth<=innerWidth'),'page overflows';assert not errors,errors;rows.append({'viewport':[w,h],'touch':touch,'checks':checks,'errors':errors});print('PASS VIP choice',w,len(checks),'groups',flush=True);await q.close()
  await b.close()
 (O/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
