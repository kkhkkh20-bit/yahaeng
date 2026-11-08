"""Distinct public episodes, retired-save compatibility, real brief/radio/persona data."""
import asyncio,json,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 out=R/'build/campaign-v225';out.mkdir(exist_ok=True);rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':900});errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  route=await q.evaluate('__game.LEARNING_ROUTE');assert route==['tB','p0','e2','m2','m4','m6','m7','m5','n1'],route
  for id in route:
   row=await q.evaluate('''id=>{let n=42;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};const G=__game;G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;const geometry={grid:G.GF.map(g=>g?.map(r=>r.join('')).join('\\n')),buildings:G.BLD.map(b=>[b.x0,b.y0,b.x1,b.y1,b.h,b.fh])};G.updateHUD(true);G.toggleTactical();G.moveCamera(2);G.benchDraw(3);return{id,name:G.STAGE.name,width:G.MW,height:G.MH,geometry,guards:G.S.guards.length,targets:G.S.guards.filter(g=>g.target).length,items:G.S.items.length};}''',id)
   row['layoutSha256']=hashlib.sha256(json.dumps(row.pop('geometry'),sort_keys=True).encode()).hexdigest();rows.append(row);await q.screenshot(path=str(out/(id+'-layout.png')))
  assert len({r['layoutSha256']for r in rows})==len(route),'public campaign repeats a map'
  result=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};
   for(const id of ['p1','p2','e1'])ok(G.STAGES.find(s=>s.id===id).retiredCampaign&&!G.LEARNING_ROUTE.includes(id),'retired episode still public');
   const records={tB:{_clear:true},p0:{_clear:true},p1:{_clear:true},p2:{_clear:true},e1:{_clear:true}};localStorage.setItem('yahaeng.ch',JSON.stringify(records));const budget=G.skillBudget(),before=localStorage.getItem('yahaeng.ch');ok(G.STAGES[G.recommendedStage()].id==='e2','old progress resumes a repeated map');ok(G.skillBudget()===budget&&localStorage.getItem('yahaeng.ch')===before,'migration erases/rewards old clears');
   G.start(G.STAGES.findIndex(s=>s.id==='e2'));while(G.DLG.modal)G.advanceDialog();ok(G.S.guards.length===4&&G.S.guards.filter(g=>g.target).length===1,'rooftop job still requires two targets/six guards');ok(G.nextGoal().compoundCue==='window'&&!G.S.player.outfit,'rooftop repeats the uniform chore');
   const camera=G.S.cams[0],item=G.S.items[0];G.setLayer(2);const service=G.cameraServicePoint(camera);ok(G.cameraSees(camera,item.x,item.y,1)>0,'camera no longer protects the ledger');ok(G.cameraSees(camera,service.x,service.y,1)===0,'service point is in camera view');for(const at of Object.values(G.STAGE.cameraApproach)){const x=at[0]*48+24,y=at[1]*48+24;ok(!G.solidFor(0)(...at)&&G.cameraSees(camera,x,y,1)===0,'authored camera waypoint blocked or watched');}G.setLayer(0);
   ok(!G.CASE_NODES.some(n=>['foreman','records','contact'].includes(n.id))&&G.CASE_LINKS.some(([a,b])=>a==='runner'&&b==='broker'),'evidence still sends players to removed bosses');
   const runner=G.STAGES.find(s=>s.id==='p0').targetCast.runner.personality;ok(runner.cues.some(([act,text])=>act==='phone'&&text.includes('문서윤')),'runner speech does not name the next person');
   const lines=Object.values(G.dialogueLines).flatMap(v=>v.map(l=>l[1])),opening=G.openingRadioLines;ok(opening.every(s=>typeof s==='string'&&s.length)&&lines.every(s=>typeof s==='string'),'spoken line schema broke');
   return{route:G.LEARNING_ROUTE,legacyBudget:budget,recordsKept:true,rooftopTargets:1,rooftopGuards:4,runner:runner.cues,opening,entry:Object.fromEntries(G.LEARNING_ROUTE.map(id=>[id,G.dialogueLines[id]||[]])),barks:G.barkLines};}''')
  await q.evaluate('document.getElementById("btnLedger").click()');menu=await q.locator('#stageList .stage[data-i]').evaluate_all('(els)=>els.map(e=>e.querySelector(".st-name").textContent)');assert len(menu)==9 and not await q.locator('#stageList details').count(),menu
  assert not errors,errors;await b.close()
 (out/'layouts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));(out/'dialogue-and-route.json').write_text(json.dumps({**result,'menu':menu},ensure_ascii=False,indent=2));print('PASS distinct campaign',len(rows),'maps; retired records and public menu; natural voice data',flush=True)
if __name__=='__main__':asyncio.run(main())
