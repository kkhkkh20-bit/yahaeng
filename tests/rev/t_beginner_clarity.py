"""Controlled fixtures for guidance/readiness, physical contact and truthful causes.
Native keyboard/touch first-entry play is checked separately in beginner_live.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/beginner-v197';O.mkdir(exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for width,height,touch in [(1280,800,False),(390,844,True),(320,720,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   checks=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.update(.02);return G.S},tick=t=>{for(let n=0;n<t;n+=.01)G.update(.01)};
    let S=fresh('p0'),P=S.player;ok(S.beginnerEntry?.step===0&&G.nextGoal().moveCue,'fresh entry skips movement');
    G.start(G.STAGES.findIndex(s=>s.id==='p0'),true);ok(document.getElementById('brSkills').hidden,'tree competes with first action');document.getElementById('btnBrGo').click();S=G.S;P=S.player;
    G.input.joy={x:.5,y:0,mag:.5};tick(.7);G.input.joy=null;ok(S.beginnerEntry.step===1&&G.nextGoal().text.includes('몸을 낮춰'),'real movement not taught');
    G.input.sneakToggle=true;tick(.1);ok(S.beginnerEntry.step===2&&G.nextGoal().text.includes('운반책'),'crouch does not hand off to real target');ok(!G.loadSkillTree().learned.length,'guide bought a skill');G.input.sneakToggle=false;
    G.saveCheckpoint();ok(G.loadCheckpoint()&&G.S.beginnerEntry.step===2,'checkpoint repeats onboarding');out.push('fresh move/crouch inside real mission, no skill purchase, checkpoint continuation');
    S=fresh('p0');P=S.player;delete S.beginnerEntry;S.t=10;G.initBeginnerEntry();ok(S.beginnerEntry.step===2,'legacy checkpoint sent back to start');
    localStorage.setItem('yahaeng.ch',JSON.stringify({p0:{_clear:true}}));S=fresh('p0');ok(!S.beginnerEntry,'returning player forced to repeat');localStorage.removeItem('yahaeng.ch');out.push('legacy and completed saves bypass introductory controls');
    S=fresh('p0');P=S.player;let early=S.guards[0];Object.assign(P,{x:early.x-28,y:early.y,mode:'sneak'});S.koNext=true;G.killGuard(early);G.checkObjective();ok(!S.exitOpen&&!G.beginnerEntryGoal()&&G.nextGoal().where.includes('기절: 살아 있음'),'early nonlethal action trapped in movement guide');G.updateBeginnerEntry();ok(S.beginnerEntry.step===2,'early takedown repeats controls');out.push('an early knockout yields to real unfinished-target recovery without granting victory');
    S=fresh('p0');P=S.player;const g=S.guards.find(g=>g.target);S.guards=[g];Object.assign(P,{x:g.x-80,y:g.y,a:0,hidden:false,cover:null,mode:'sneak'});g.a=0;
    let a=G.attackAction();ok(a.k==='none'&&a.stalk,'out-of-reach scene missing');G.updateHUD(true);ok(G.actVerb(a)==='더 가까이'&&!document.getElementById('btnAct').classList.contains('ready'),'inactive attack promises a kill');
    G.actAttack();ok(S.toasts.some(t=>t.text.includes('아직 손이 닿지'))&&g.state!=='DEAD','invalid attack silently ignored or killed remotely');
    P.x=g.x-28;G.updateHUD(true);a=G.attackAction();ok(a.k!=='none'&&a.label==='표적 기절'&&a.hold==='살해'&&document.getElementById('btnAct').classList.contains('ready'),'actual contact never becomes ready');out.push('out-of-reach attack explains approach; real contact alone enables assassination');
    S=fresh('p2');P=S.player;S.cams.forEach(c=>c.unplugged=true);const it=S.items[0];let inactive=false,active=false;
    for(const dx of [-90,-60,-30,0,30,60,90]){Object.assign(P,{x:it.x+dx,y:it.y,hidden:false,cover:null});S.t+=.01;const goal=G.nextGoal(),a=G.envAction(),ready=a.k==='loot'&&a.it===it;ok(goal.actionReady===ready,'goal and selected action disagree');if(!ready){inactive=true;ok(!goal.where.includes('X ')&&!goal.where.includes('행동 '),'unreachable paper advertises action');}else{active=true;ok(goal.where.includes(G.actVerb(a)),'ready paper does not name actual action');}}
    ok(inactive&&active,'fixture did not cross real reach boundary');Object.assign(P,{x:it.x,y:it.y,fl:1});G.setLayer(1);S.t+=.01;ok(!G.nextGoal().actionReady,'goal promises downstairs pickup');G.setLayer(0);out.push('paper guidance and selected physical action agree across range and floor boundaries');
    S=fresh('p0');P=S.player;const victim=S.guards.find(g=>g.target);Object.assign(P,{x:victim.x-28,y:victim.y,a:0,hidden:false,cover:null,mode:'sneak'});victim.a=0;S.guards=[victim];
    const lamp={x:P.x,y:P.y+20,fl:0,z:0,outdoor:true,off:false};S.lamps=[lamp];S.t+=.01;const light=G.envChoices().find(a=>a.k==='lamp');ok(light,'lamp scene missing');G.selectEnvTarget(G.envToken(light));
    G.prepareCombat({k:'kill',list:[victim],viaZ:true,combatSource:{id:'keyz'}});G.killGuard(victim);const body=S.corpses[0];ok(body.playerHandled,'real kill loses personal interaction');
    S.envExplicit=null;S.t+=.01;const first=G.envAction();ok(['dress','carry','quickStash'].includes(first.k)&&first.c===body,'implicit lamp wins over recent body');
    const lampChoice=G.envChoices().find(a=>a.k==='lamp');G.selectEnvTarget(G.envToken(lampChoice));ok(G.envAction().k==='lamp','body overrides deliberate selection');out.push('recent personal takedown beats implicit lamp, deliberate selection stays authoritative');
    S=fresh('e1');P=S.player;S.alevel=2;G.recordSearchCause('body');let cause=G.searchCauseReadout();ok(cause.kind==='body'&&cause.text.includes('내 신원 미확인'),'body discovery accuses player');G.updateHUD(true);ok(document.getElementById('lightLbl').textContent.includes('쓰러진 사람 발견'),'search reason disappears from HUD');
    G.recordSearchCause('player');G.recordSearchCause('body');ok(G.searchCauseReadout().kind==='player','later body report hides real sighting');S.knownLooks={face:true};ok(G.searchCauseReadout().text.includes('알려짐'),'known identity called unknown');P.outfit='crew';ok(!G.searchCauseReadout().text.includes('알려짐'),'new unseen clothes called known');
    S.alevel=1;ok(!G.searchCauseReadout(),'inactive search remains displayed');G.recordSearchCause('camera');S.alevel=2;ok(G.searchCauseReadout().kind==='camera','new incident keeps stale body reason');out.push('persistent body vs player vs CCTV causes, known identity, new outfit and ended search');
    const risk=G.workRiskReadout({k:'carry'});ok(risk&&!risk.text.includes('수상한 행동'),'preview looks like current guilt');out.push('optional work preview is conditional, not an accusation');
    S=fresh('p0');G.updateHUD(true);G.moveCamera(1);G.benchDraw(1);return out;
   }''')
   layout=await q.evaluate('''()=>['objective','lightLbl','btnAct','btnCarry'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return{id,visible:!!r.width,left:r.left,right:r.right,width:r.width,scroll:e.scrollWidth}})''')
   assert all(not r['visible'] or r['left']>=-1 and r['right']<=width+1 and r['scroll']<=r['width']+2 for r in layout),(width,layout)
   await q.screenshot(path=str(O/f'first-input-{width}.png'));assert not errors,errors
   rows.append({'viewport':[width,height],'checks':checks,'layout':layout,'errors':errors});print('PASS beginner clarity',width,len(checks),'groups',flush=True);await q.close()
  await b.close()
 (O/'rules.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
