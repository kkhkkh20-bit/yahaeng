"""Controlled live-rule scenarios, not complete missions: appearance knowledge, interruption and HUD."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/design-v251';O.mkdir(exist_ok=True)
FIXTURE=r'''() => {
 const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
 const S=G.S,P=S.player,base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite)};
 window.check=(v,m)=>{if(!v)throw Error(m)};
 window.guard=(id,dx=0)=>({...base,id,x:1800+dx,y:504,fl:0,z:0,a:Math.PI,want:Math.PI,state:'PATROL',seen:false,meter:0,route:[{x:1800+dx,y:504,pause:999}],ri:0,wait:999,post:Math.PI,glance:0,glanceT:999,radio:false,torch:false,path:null,poi:null,chat:null,act:null,follow:null,homeFl:0,securityBuddy:null,suspectMemory:null,suspectLook:null});
 window.reset=()=>{S.t=10;S.guards=[];S.facOn=false;S.corpses=[];S.decals=[];S.lamps=[];S.cams=[];S.alevel=0;S.chaseSeen=false;S.knownLooks={};S.lookReports={};S.radioCall=null;S.searchIncidents=[];S.toasts=[];Object.assign(P,{x:1848,y:504,fl:0,z:0,a:0,mode:'walk',outfit:'crew',disguise:'sam',disguiseBlown:false,blown:{},under:false,hide:null,vent:null,hidden:false,light:1,carrying:null,captive:null,trav:null,strikeT:0});G.setLayer(0)};
 window.silence=(g,lethal=false)=>{g.takedownIntent={lethal,assailantLook:'crew'};G.killGuard(g,null,null,true);G.updateRadioCall(.05)};
 window.G=G;window.P=P;window.S=S;
}'''
# Detailed screen text (설정 · 화면 글: 자세히): this test checks the guidance text the minimal default hides.
async def main():
 rows=[]
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for w,h in [(1280,800),(390,844)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=w<1000,is_mobile=w<1000);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();localStorage.setItem(`yahaeng.guide`,`full`);requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.officeReady()',polling=100);await q.evaluate(FIXTURE)
   result=await q.evaluate(r'''()=>{
    const out=[];
    for(const lethal of [false,true]){
     reset();const a=guard(910),far=guard(911,450);a.radio=true;S.guards=[a,far];a.seen=true;G.goAlert(a);
     check(G.knownFace(a)&&!G.knownFace(far)&&!P.disguiseBlown&&!P.blown.crew,'one witness invalidates uniform globally');
     check(G.disguiseKnowledge().reporting&&G.searchCauseReadout().text.includes('보고 중'),'pending transmission is not distinguished');
     G.updateRadioCall(.4);silence(a,lethal);G.updateHUD(true);
     check((lethal?!a.unconscious:a.unconscious)&&!S.radioCall&&!S.knownLooks.crew&&!P.disguiseBlown&&!G.knownFace(far),'silenced witness leaves globally blown uniform');
     check(!G.disguiseKnowledge().witnesses.length&&G.searchCauseReadout().text.includes('미전달'),'HUD still claims a silenced witness transmitted');
     check(!document.querySelector('#objective').textContent.includes('다른 옷 필요')&&!document.querySelector('#expoLbl').textContent.includes('공유됨'),'HUD contradicts interrupted report');
     check(S.toasts.some(t=>t.text.includes('인상착의가 전달되지 않았다')),'interruption has no correct receipt');
     if(!lethal){const c=S.corpses.at(-1);G.wakeKO(c,null);check(G.knownFace(a)&&!G.knownFace(far)&&G.disguiseKnowledge().witnesses.length===1,'waking victim forgets local memory or broadcasts magically');}
     out.push(lethal?'lethal interruption retains uninformed guard permission':'KO interruption; waking victim retains only local memory');
    }
    reset();let a=guard(920),near=guard(921,120),far=guard(922,450);a.radio=true;S.guards=[a,near,far];a.seen=true;G.goAlert(a);silence(a);
    check(G.knownFace(near)&&!G.knownFace(far)&&!P.disguiseBlown,'actual nearby recipient is erased or remote guard learns');
    check(S.toasts.some(t=>t.text.includes('목격자가 남아'))&&G.searchCauseReadout().text.includes('목격자만'),'nearby communication is mislabeled global');
    silence(near,true);check(!G.disguiseKnowledge().witnesses.length&&!G.knownFace(far),'all local witnesses silenced still compromises uniform');out.push('nearby shout recipient knows; silencing all local witnesses leaves far guard uninformed');
    reset();a=guard(930);far=guard(931,450);a.radio=true;S.guards=[a,far];a.seen=true;G.goAlert(a);G.updateRadioCall(4);
    check(S.knownLooks.crew&&P.disguiseBlown&&P.blown.crew&&G.knownFace(far),'completed report fails to inform uninformed guards');silence(a,true);
    check(G.knownFace(far)&&G.searchCauseReadout().text.includes('전체 공유'),'killing reporter erases a delivered report');
    far.a=far.want=0;check(!G.canSee(far,P.x,P.y,1,false,false,0),'unseen-change fixture is actually visible');G.takeProp({outfit:'staff'});check(!P.disguiseBlown&&!G.knownFace(far),'unseen new outfit inherits reported old outfit');
    G.takeProp({outfit:'crew'});check(P.disguiseBlown&&G.knownFace(far),'reusing reported outfit bypasses actual shared memory');out.push('completed report survives reporter death; changing/reusing clothing uses exact reported look');
    reset();a=guard(940);far=guard(941,450);a.radio=true;S.guards=[a,far];a.seen=true;G.goAlert(a);P.outfit='staff';P.disguise='staff';G.syncDisguiseKnowledge();G.updateRadioCall(4);
    check(S.knownLooks.crew&&!S.knownLooks.staff&&!P.disguiseBlown&&!G.knownFace(far),'late report publishes current rather than observed clothing');out.push('delayed report describes old look only');
    reset();a=guard(950);far=guard(951,450);a.radio=true;S.guards=[a,far];a.seen=true;G.goAlert(a);silence(a);G.rememberSuspect(null,'crew','camera');
    check(P.disguiseBlown&&G.knownFace(far)&&G.disguiseKnowledge().source==='camera','independent CCTV report is erased by human interruption');out.push('independent completed CCTV report remains valid');
    reset();a=guard(955);a.civ=true;const recipient=guard(956,40);recipient.radio=true;far=guard(957,450);S.guards=[a,recipient,far];G.rememberSuspect(a,'crew');a.rep={to:recipient,x:P.x,y:P.y,saw:'crew',kind:'disguise'};G.deliverReport(a);
    check(S.radioCall?.g===recipient&&G.knownFace(recipient)&&!G.knownFace(far)&&!P.disguiseBlown,'civilian report prematurely invalidates current clothing for uninformed guards');silence(recipient);silence(a);check(!S.knownLooks.crew&&!P.disguiseBlown&&!G.knownFace(far)&&!G.disguiseKnowledge().witnesses.length,'silenced civilian/recipient retain global exposure');out.push('civilian report informs its actual recipient; interrupted relay stays local');
    reset();a=guard(960);far=guard(961,450);a.radio=true;S.guards=[a,far];a.seen=true;G.goAlert(a);silence(a);P.disguiseBlown=true;P.blown={crew:true};P.hp=2;G.saveCheckpoint();check(G.loadCheckpoint(),'legacy checkpoint restore failed');
    check(!G.S.player.disguiseBlown&&!G.S.player.blown.crew&&!G.knownFace(G.S.guards[1])&&G.S.player.hp===2,'legacy local flag survives migration or health changes');
    G.rememberSuspect(null,'crew');G.saveCheckpoint();G.loadCheckpoint();check(G.S.player.disguiseBlown&&G.knownFace(G.S.guards[1]),'checkpoint migration erases legitimate report');out.push('legacy false flag repaired; actual reports and health preserved');
    G.updateAlert(100);G.updateAlert(31);check(!G.S.player.disguiseBlown&&!G.S.player.blown.crew&&!G.knownFace(G.S.guards[1]),'expired shared report leaves stale permission/HUD flags');out.push('search expiry clears shared flags without retaining legacy outfit invalidation');
    G.updateHUD(true);G.moveCamera(1);G.benchDraw(1);return out;
   }''')
   await q.screenshot(path=str(O/f'disguise-search-ended-{w}.png'));assert not errors,errors;rows.append({'viewport':[w,h],'scenarios':result,'pageErrors':errors,'method':__doc__});print('PASS disguise reports',w,len(result),'scenarios',flush=True);await q.close()
  await b.close()
 (O/'disguise-reports.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
