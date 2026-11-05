"""Real door contacts, stance lifecycle, pole/wall movement and evidence labels.
Controlled fixtures; full native campaign replay is recorded separately.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
O=R/'build/physical-v190/clarity';O.mkdir(parents=True,exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True),(844,390,True),(320,568,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   checks=await q.evaluate('''()=>{
    const G=__game,out=[],ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};
    let S=fresh('m2'),P=S.player;const base={...S.guards.find(g=>!g.civ&&!g.dog&&!g.target)};
    const d=S.doors.find(d=>!(d.fl||0)&&d.keyLock==='code'),actor={...base,x:d.x,y:d.y,fl:1,z:0,state:'PATROL',off:false};
    S.guards=[actor];S.corpses=[];S.cams=[];S.facOn=false;Object.assign(P,{x:d.x,y:d.y-34,fl:0,z:0});G.setLayer(0);G.setDoor(d,false);
    const tick=t=>{for(let n=0;n<t;n+=.01){S.t+=.01;G.updatePlayer(.01)}};
    const close=()=>{G.doAct({k:'door',d,label:'문 닫기'});ok(P.interact,'door contact never starts '+JSON.stringify({door:[d.x,d.y,d.fl,d.locked],p:[P.x,P.y,P.fl,P.z],valid:G.objectActionValid({k:'door',d},P.item),busy:G.actionBusy?.(),dlg:G.DLG.modal,tactical:G.tactical}));tick(.8);};
    close();ok(d.locked&&G.G0[d.ty][d.tx]==='X','upstairs guard blocks actual downstairs close');G.setDoor(d,false);actor.fl=0;actor.z=2;close();ok(d.locked,'roof guard blocks ground door');
    G.setDoor(d,false);actor.z=0;close();ok(!d.locked&&S.toasts.some(t=>t.text.includes('경비가 문을')),'real doorway actor ignored or unexplained');actor.fl=1;S.corpses=[{x:d.x,y:d.y,fl:1,z:0,ko:true}];close();ok(d.locked,'other-floor body blocks close');
    G.setDoor(d,false);S.corpses[0].fl=0;close();ok(!d.locked&&S.toasts.some(t=>t.text.includes('기절자가 문을')),'actual body obstruction is not distinguished');
    S.corpses[0].carried=true;close();ok(d.locked,'carried body still blocks door');G.saveCheckpoint();ok(G.loadCheckpoint(),'door checkpoint fails');S=G.S;P=S.player;ok(S.doors.find(v=>v.tx===d.tx&&v.ty===d.ty&&!(v.fl||0)).locked,'closed door lost on restore');
    out.push('actual delayed door contact ignores other floors/heights, respects real actor/body and persists on restore');
    S=fresh('p0');G.input.sneakToggle=true;G.syncSneakBtn();G.input.walkLock=true;S=fresh('m2');P=S.player;ok(!G.input.sneakToggle&&G.input.walkLock&&document.querySelector('#btnCrouch').getAttribute('aria-pressed')==='false','new mission carries crouch or erases walking preference');
    G.input.sneakToggle=true;P.mode='sneak';G.syncSneakBtn();G.saveCheckpoint();G.input.sneakToggle=false;ok(G.loadCheckpoint()&&G.input.sneakToggle,'checkpoint discards saved stance');G.softPause(true);G.softPause(false);ok(G.input.sneakToggle,'pause discards stance');
    out.push('fresh mission stands; walking preference, checkpoint and pause semantics preserved');
    S=fresh('m2');P=S.player;S.guards=[];S.cams=[];S.facOn=false;Object.assign(P,{x:6.5*48,y:20*48+14,fl:0,z:0,cover:null,snap:null,vx:0,vy:0});G.input.sneakToggle=true;G.input.walkLock=false;G.setLayer(0);ok(G.G0[19][6]==='P','real lamp fixture missing');S.keys.ArrowUp=true;for(let i=0;i<120;i++)G.update(.01);ok(!P.cover&&!P.snap,'narrow pole captures crouched movement');S.keys={};
    S=fresh('tB');P=S.player;S.guards=[];Object.assign(P,{x:7.5*48,y:10.3*48,fl:0,z:0,cover:null,snap:null,vx:0,vy:0});G.input.sneakToggle=true;S.keys.ArrowUp=true;for(let i=0;i<100;i++)G.update(.01);ok(P.cover,'deliberate wall cover lost');S.keys={ArrowDown:true};for(let i=0;i<40;i++)G.update(.01);ok(!P.cover,'away input cannot release cover');
    out.push('real utility pole has no magnetic cover; intentional wall cover and release remain');
    S=fresh('m2');P=S.player;S.cams=[];S.facOn=false;S.guards=[];Object.assign(P,{x:888,y:1032,fl:0,z:0});
    const ctx=document.querySelector('canvas').getContext('2d'),original=ctx.fillText,labels=[];ctx.fillText=function(s,...rest){labels.push(s);return original.call(this,s,...rest)};
    S.corpses=[{x:P.x+20,y:P.y,fl:0,z:0,ko:true,risk:true}];G.drawCorpseRisk();ok(labels.includes('눈에 띄는 기절자')&&!labels.includes('눈에 띄는 시체'),'render calls KO a corpse');S.corpses[0].ko=false;G.drawCorpseRisk();ok(labels.includes('눈에 띄는 시체'),'dead body loses true label');ctx.fillText=original;
    out.push('actual canvas distinguishes exposed unconscious and dead people');
    const g={...base,id:701,x:1800,y:1032,fl:0,z:0,a:0,want:0,state:'BODY',seen:false,meter:0,radio:false,chat:null,follow:null,why:'saw',path:null,bodyWork:null,off:false,route:[{x:1800,y:1032,pause:999}]},other={...g,id:702,x:1870,state:'PATROL',why:null,body:null};
    const c={x:1818,y:1032,fl:0,z:0,ko:false,light:1,hidden:false,stashed:false,carried:false,discovered:false};g.body=c;S.guards=[g,other];S.corpses=[c];P.under=true;S.knownLooks={};
    for(let i=0;i<130;i++){S.t+=.01;G.updateGuard(g,.01);}ok(c.discovered&&S.stats.bodies===1,'actual body inspection did not finish');ok(G.investigationReadout(g).kind==='body'&&G.investigationReadout(other).kind==='body','body report inherits prior player sighting');ok(!S.stats.detected&&!Object.keys(S.knownLooks).length,'body report invents identification');ok(!g.searchJob||G.investigationReadout(g).tag==='수색 중인 지점','assigned room implies a second body was found there');
    g.state='NOTICE';g.why='saw';g.poi={x:1800,y:1032,fl:0,z:0};ok(G.investigationReadout(g).kind==='person','new person sighting still labelled as old body search');g.state='ALERT';ok(G.investigationReadout(g).kind==='player','real pursuit hidden by body clue');g.state='SEARCH';g.searchJob=null;g.poi={x:1800,y:1032,fl:0,z:0};g.why='saw';ok(G.investigationReadout(g).kind==='person','unidentified person called identified player');G.goSuspicious(g,1800,1032,3);ok(G.investigationReadout(g).kind==='trace','unrelated new trace inherits old sighting');
    g.why='heard';ok(G.investigationReadout(g).kind==='sound','heard cue called sight');S.guards=[];P.under=false;Object.assign(P,{x:888,y:1032,hidden:false,hide:null,vent:null,cover:null,mode:'walk'});S.alevel=2;S.expo=0;G.updateHUD(true);ok(document.querySelector('#expoLbl').textContent==='현재 시야 밖'&&document.querySelector('#lightLbl').textContent.includes('수색'),'local search presented as no suspicion');
    out.push('actual body inspection/report, real pursuit, person sight, new trace and sound have truthful labels');
    return out;
   }''')
   await q.evaluate("""()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p0'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards[0];S.guards=[g];Object.assign(P,{x:g.x-28,y:g.y,mode:'sneak'});g.takedownIntent={source:'key',lethal:false};S.koNext=true;G.killGuard(g);S.corpses[0].risk=true;S.fade=0;G.updateHUD(true);G.moveCamera(1);G.benchDraw(1)}""")
   await q.screenshot(path=str(O/f'ko-label-{w}.png'))
   assert not errors,errors;rows.append({'viewport':[w,h],'touch':touch,'checks':checks,'errors':errors});print('PASS clarity',w,len(checks),'groups',flush=True);await q.close()
  await b.close()
 (O/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(main())
