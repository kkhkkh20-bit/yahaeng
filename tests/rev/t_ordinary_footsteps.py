"""Ordinary movement is ambient, not evidence of an unseen intruder.
Controlled hearing/vision fixtures on the actual VIP office map; native inputs
with the authored actors also run separately in ordinary_footsteps_walk.py.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch();q=await browser.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game',polling=100)
  result=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},checks=[];
   const fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,g=S.guards[7],P=S.player;S.guards=[g];S.facOn=false;Object.assign(P,{x:g.x,y:g.y+96,fl:1,z:0,light:1,a:0,mode:'walk',moving:true,outfit:'crew',disguise:'sam'});G.setLayer(1);return{S,g,P};};
   for(const outfit of [null,'crew','waiter'])for(const mode of ['walk','sneak']){
    const {S,g,P}=fresh();P.outfit=outfit;P.mode=mode;
    ok(G.accessReadout().zi.secure&&!G.accessReadout().allowed,'need the screenshot secure floor');
    ok(!G.canSee(g,P.x,P.y,1,false,false,0,1),'hearing fixture starts in sight');
    for(let i=0;i<24;i++){G.noise(P.x,P.y,mode==='walk'?137.5:27.5,'step',1,0);S.t+=.05;G.updateGuard(g,.05);}
    ok(g.state==='PATROL'&&!g.hearT&&!g.seen&&!g.eyeT&&!g.startle,'ordinary footsteps attracted guard '+JSON.stringify({outfit,mode,state:g.state}));
    ok(!S.alevel&&!S.stats.detected&&!Object.keys(S.knownLooks||{}).length,'ordinary sound identifies intruder');
   }checks.push('walking/crouching stays ambient on secure floor, independent of unseen outfit');
   let f=fresh();G.goSuspicious(f.g,f.P.x+120,f.P.y,6);f.g.why='heard';const poi={...f.g.poi};G.noise(f.P.x,f.P.y,137.5,'step',1,0);
   ok(f.g.poi.x===poi.x&&f.g.poi.y===poi.y,'walking retargets an existing investigator');checks.push('ordinary footsteps do not retarget sound investigations');
   f=fresh();Object.assign(f.g,{hearT:.4,hearP:{x:f.P.x,y:f.P.y},hearKind:null});G.saveCheckpoint();ok(G.loadCheckpoint(),'checkpoint failed');const old=G.S.guards[0];G.S.t+=.1;G.updateGuard(old,.1);ok(!old.hearT&&!old.hearP&&old.state==='PATROL','legacy queued walking response survives resume');checks.push('saved ordinary-footstep queue is discarded');
   f=fresh();f.P.mode='run';G.noise(f.P.x,f.P.y,250,'step',1,0);ok(f.g.hearT>0&&f.g.hearKind==='run'&&!G.S.knownLooks?.crew&&!G.S.stats.detected,'running does not draw attention or sound directly identifies player');checks.push('running still attracts attention without identifying player from sound');
   f=fresh();const ty=Math.floor(f.P.y/48),tx=Math.floor(f.P.x/48),tile=G.GF[1][ty][tx];
   // Explicit material fixture: ordinary wooden boards are not broken glass.
   G.GF[1][ty][tx]='x';G.noise(f.P.x,f.P.y,253,'step',1,0);ok(f.g.hearT>0&&f.g.hearKind==='surface','broken glass no longer produces distinctive sound');G.GF[1][ty][tx]=tile;checks.push('distinctive glass clatter retains hearing');
   f=fresh();G.whistle();ok(f.g.state==='SUSPICIOUS'&&f.g.why==='heard','basic whistle stopped working');checks.push('deliberate whistle still investigates');
   f=fresh();f.P.x=f.g.x+70;f.P.y=f.g.y;f.P.moving=false;G.updateGuard(f.g,1);G.updateHUD(true);
   ok(f.g.state==='WARN'&&document.querySelector('#expoLbl').textContent.includes('퇴거 경고')&&document.querySelector('#lightLbl').textContent.includes('보안구역'),'visible trespass warning is confused with footsteps');
   ok(!f.S.stats.detected,'first visible trespass instantly alarms');checks.push('visible secure entry warns with explicit cause and countdown');
   const warning=document.querySelector('#expoLbl').textContent;
   for(let i=0;i<22;i++){f.S.t+=.05;G.updateGuard(f.g,.05);}G.updateHUD(true);
   ok(f.g.state==='WARN'&&document.querySelector('#expoLbl').textContent!==warning,'warning countdown label is cached');
   return checks;
  }''')
  assert not errors,errors
  out=R/'build/footsteps-v183';out.mkdir(exist_ok=True);(out/'rules.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('PASS',result);await browser.close()
asyncio.run(main())
