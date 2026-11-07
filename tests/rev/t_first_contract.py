"""Opening invariants and truthful sight/cover feedback; controlled rule fixtures.
Playable completions are separately tested with first_contract_walk.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for width,height,touch in [(1280,800,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':width,'height':height},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   await q.evaluate('__game.start(__game.STAGES.findIndex(s=>s.id==="p0"),true)');await q.click('#btnBrGo')
   checks=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};
    let S=G.S,P=S.player;ok(G.STAGE.id==='p0'&&!G.STAGE.tutorial&&!G.STAGE.steps,'start is still a drill');ok(S.guards.filter(g=>g.target).length===1&&S.guards.length===3&&S.guards.find(g=>g.target).fl===1&&!S.items.length&&!S.cams.length,'opening overload');ok(G.skillBudget()===1&&!G.loadSkillTree().learned.length&&!P.kunai&&!G.skillOn('ambush'),'free skill/gear');G.checkObjective();ok(!S.exitOpen,'empty item list permits skipping target');G.update(.1);G.updateHUD(true);ok(document.querySelector('#missionIdentity').textContent.includes('운반책'),'target identity omitted');ok(G.nextGoal().text.includes('움직여 보기'),'fresh controls omitted');S.keys.ArrowRight=true;for(let n=0;n<70;n++)G.update(.01);S.keys={};G.input.sneakToggle=true;G.update(.02);G.input.sneakToggle=false;ok(G.nextGoal().text.includes('옷'),'no actionable target after move and crouch');out.push('fresh menu starts actual one-target contract with existing skill budget and no rehearsal gate');
    const target=S.guards.find(g=>g.target);Object.assign(P,{fl:target.fl,x:target.x-28,y:target.y,mode:'sneak'});S.guards=[target];S.koNext=true;G.killGuard(target);G.checkObjective();ok(S.corpses[0].ko&&!S.exitOpen,'KO completes assassination');ok(G.nextGoal().where.includes('기절: 살아 있음'),'KO recovery missing');out.push('incapacitation is not assassination, and finishing is explained');
    localStorage.setItem('yahaeng.ch',JSON.stringify({m2:{_clear:true}}));ok(G.STAGES[G.recommendedStage()].id==='m4','returning player forced into prologue');localStorage.setItem('yahaeng.ch',JSON.stringify({p0:{_clear:true}}));ok(G.STAGES[G.recommendedStage()].id==='p1','first clear skips disguise contract');out.push('returning progress preserved and opening leads to the disguise contract');localStorage.clear();
    S=fresh('p0');Object.assign(S.player,{x:596,y:408,light:1,mode:'walk'});G.update(.1);G.updateHUD(true);ok(G.exposure()===1&&!S.guards[0].rawSeen,'outside-cone fixture invalid');ok(document.querySelector('#expoLbl').textContent==='시야 밖'&&!document.querySelector('#lightLbl').textContent.includes('시야 안'),'hypothetical turn claims current sight');Object.assign(S.player,{x:744,y:408,mode:'walk',light:1});G.update(.1);G.updateHUD(true);ok(S.guards[0].rawSeen&&!document.querySelector('#expoLbl').textContent.includes('시야 밖'),'actual observation suppressed');out.push('hypothetical exposure and real observation produce distinct truthful feedback');
    S=fresh('tB');P=S.player;S.guards=[];Object.assign(P,{x:10.5*48,y:7.3*48,mode:'sneak'});G.input.sneakToggle=true;const x=P.x;S.keys.ArrowUp=S.keys.ArrowLeft=true;for(let i=0;i<70;i++)G.update(.01);ok(!P.cover&&P.x<x-15,'diagonal avoidance sticks to wall');S.keys={};Object.assign(P,{x:10.5*48,y:7.3*48,cover:null,snap:null,vx:0,vy:0});S.keys.ArrowUp=true;for(let i=0;i<90;i++)G.update(.01);ok(P.cover,'intentional straight push no longer enters cover');S.keys={};out.push('diagonal avoidance stays mobile; deliberate wall push still enters cover');
    S=fresh('p0');G.update(.1);G.updateHUD(true);G.moveCamera(1);G.benchDraw(1);return out;
   }''')
   geometry=await q.evaluate('''()=>{const e=document.querySelector('#objective'),o=document.querySelector('#hud .obj').getBoundingClientRect(),buttons=[...document.querySelectorAll('.pad>button:not([hidden]),#btnPause')].filter(e=>getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return{id:e.id,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}});return{clipped:e.scrollHeight>e.clientHeight+1,overflow:o.right>innerWidth+1||o.left<0,buttons}}''')
   assert not geometry['clipped']and not geometry['overflow'],geometry
   controls=geometry['buttons'];assert all(r['left']>=0 and r['right']<=width+1 and r['top']>=0 and r['bottom']<=height+1 for r in controls),geometry
   assert touch or len(controls)==1,geometry
   for i,a in enumerate(controls):
    for z in controls[i+1:]:assert min(a['right'],z['right'])<=max(a['left'],z['left'])or min(a['bottom'],z['bottom'])<=max(a['top'],z['top']),(a,z)
   if touch:
    await q.evaluate("__game.say([['master','운반책 제거 확인. 들어온 골목으로 빠져나오세요.']],false);__game.updateHUD(true)")
    assert await q.locator('#dlg').is_visible()
    area=await q.locator('#dlg').bounding_box();x=area['x']+12;y=area['y']+20
    assert await q.evaluate('p=>!document.elementFromPoint(p.x,p.y).closest("#dlg")',{'x':x,'y':y}),'field radio intercepts movement'
    before=await q.evaluate('__game.S.player.x');cdp=await q.context.new_cdp_session(q)
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+28,'y':y}]})
    await q.evaluate('for(let i=0;i<25;i++)__game.update(.01)');await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert await q.evaluate('__game.S.player.x')>before+5,'native movement through radio failed'
    checks.append('native joystick moves through nonmodal field radio')
   assert not errors,errors;print('PASS opening',width,len(checks),'groups',flush=True);await q.close()
  await b.close()
asyncio.run(main())
