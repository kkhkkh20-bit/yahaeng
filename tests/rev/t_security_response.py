"""Confirmed reports, finite security response and physical VIP/patrol behaviour.

Scene fixtures place actors to isolate observations; live contract routes are
covered by t_vip_showcase.py. No unseen incident may identify a disguise.
"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=Path('/tmp/security-v122');OUT.mkdir(exist_ok=True)

async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},passed=[];
    const fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.setLayer(0);const S=G.S;S.player.hide=S.hides.find(h=>h.type==='box');S.player.hidden=true;return S;};
    const crew=S=>S.guards.filter(g=>!g.civ&&!g.target&&!g.dog&&!g.police&&(!g.fac||g.fac==='A'));
    const safe=S=>!S.player.disguiseBlown&&!Object.keys(S.knownLooks||{}).length&&!S.guards.some(g=>g.suspectLook)&&!G.evidencePending();
    let S=fresh(),gs=crew(S),a=gs[0],b=gs[1];
    a.state='DEAD';b.state='DEAD';G.updateSecurityResponse(.3);check(G.securityLevel()===0&&safe(S),'unseen kill grants information');
    S.rcT=0;G.updateRadioCheck(.01);G.updateSecurityResponse(.3);check(G.securityLevel()===2&&safe(S),'rollcall lacks response or identifies unseen killer');
    check(Object.keys(S.security.reports).length===2,'distinct missing not recorded');
    const vip=S.guards.find(g=>g.tag==='vip'),oldRoute=vip.route.filter(w=>!w.once).map(w=>[w.x,w.y]);
    check(vip.route.filter(w=>w.securityRetreat).length===1&&S.security.pending===false,'VIP did not physically detour');
    const oldAt=S.security.reports['guard:'+a.id].at;S.t+=4;G.securityRadioReports([a,b]);G.updateSecurityResponse(.3);check(S.security.reports['guard:'+a.id].at===oldAt,'radio renews same incident');
    let pairs=S.guards.filter(g=>g.securityBuddy!=null);check(pairs.length>0&&pairs.length<=2,'pair cap or retry failed');
    for(const g of pairs){const leader=S.guards.find(o=>o.id===g.securityBuddy);check(g.fl===leader.fl&&(g.z||0)===(leader.z||0),'cross-floor pair');}
    const routes=S.guards.map(g=>JSON.stringify(g.route));G.saveCheckpoint();check(G.loadCheckpoint(),'save reload');S=G.S;check(G.securityLevel()===2&&S.guards.some(g=>g.securityBuddy!=null),'save loses response');
    check(S.guards.every((g,i)=>JSON.stringify(g.route)===routes[i]),'save mutates routes');passed.push('unseen incidents wait for real rollcall; distinct finite response, VIP detour, pairs and save');
    S.t=105;G.updateSecurityResponse(.3);check(G.securityLevel()===0&&!S.guards.some(g=>g.securityBuddy!=null),'response does not expire');
    const body={guardId:a.id,x:a.x,y:a.y,fl:a.fl,z:a.z};G.securityBodyFound(body,null);G.securityBodyFound(body,null);G.updateSecurityResponse(.3);
    check(G.securityLevel()===1&&Object.keys(S.security.reports).length===2,'radio/body double counts same person');
    const foundAt=S.security.reports['guard:'+a.id].at;S.t+=101;G.securityBodyFound(body,null);G.updateSecurityResponse(.3);check(G.securityLevel()===0&&S.security.reports['guard:'+a.id].at===foundAt,'same body renews forever');
    body.accident='shock';G.securityBodyFound(body,null);G.securityRadioReports(S.guards.filter(g=>g.state==='DEAD'));G.updateSecurityResponse(.3);check(S.security.reports['guard:'+a.id].resolved,'known accident gets reported missing again');
    b=S.guards.find(g=>g.id===b.id);b.state='PATROL';G.securityRadioReports(S.guards.filter(g=>g.state==='DEAD'));G.updateSecurityResponse(.3);check(G.securityLevel()===0,'recovered guard still missing');passed.push('report deduplication, cooling, confirmed accidents and replies');
    // Actual guard inspection sees a body, never the hidden player.
    S=fresh();gs=crew(S);a=gs[0];b=gs[1];a.state='DEAD';Object.assign(b,{x:20.5*48,y:21.5*48+24,fl:0,z:0,a:-Math.PI/2,state:'BODY',path:null});
    const c={guardId:a.id,x:20.5*48,y:21.5*48,fl:0,z:0,light:1,hidden:false,discovered:false,carried:false,stashed:false,ko:false,fac:a.fac};S.corpses=[c];b.body=c;G.updateGuard(b,.01);check(!c.discovered&&b.bodyWork,'body must first be assessed');for(let i=0;i<22;i++){S.t+=.05;G.updateGuard(b,.05)}G.updateSecurityResponse(.3);check(c.discovered&&G.securityLevel()===1&&safe(S),'actual inspection does not report body safely');
    // CCTV sees only the body, with an active operator.
    S=fresh();a=crew(S)[0];a.state='DEAD';const k={...c,guardId:a.id,discovered:false};S.corpses=[k];S.camRoom=null;S.cams=[{x:k.x-80,y:k.y,tx:18,ty:21,fl:0,z:0,a:0,base:0,sweep:0,period:10,ph:0,meter:0,cool:0,outdoor:true}];G.updateCams(.1);G.updateSecurityResponse(.3);check(k.discovered&&G.securityLevel()===1&&safe(S),'CCTV body grants identity or misses response');passed.push('actual guard and CCTV observations report location without killer identity');
    // An unattended camera cannot classify an accident for the guards. Returning operator can.
    S.camRoom={x:0,y:0,fl:0};k.discovered=false;k.camSeen=false;k.accident='shock';G.updateCams(.1);check(!k.camSeen&&S.security.reports['guard:'+a.id].kind==='body','unattended feed resolves casualty');
    S.camRoom=null;G.updateCams(.1);G.updateSecurityResponse(.3);check(k.camSeen&&S.security.reports['guard:'+a.id].kind==='accident'&&G.securityLevel()===0,'returning operator misses accident');
    S.alevel=0;S.rcT=0;G.updateRadioCheck(.01);G.updateSecurityResponse(.3);check(S.alevel===0&&G.securityLevel()===0,'confirmed accident still causes missing-person alarm');
    passed.push('unattended CCTV defers accident assessment until operator returns; known accident answers rollcall');
    // Shorter routine window; prepared privacy remains valid in high security.
    S=fresh();a=S.guards.find(g=>g.tag==='vip');b=S.guards.find(g=>g.tag==='vipEscort');const smoke=a.route.find(w=>Math.hypot(w.x-27.5*48,w.y-15.5*48)<30);check(smoke&&G.securityPatrolPause(a,smoke)===10,'normal smoking window');
    const dead=crew(S).filter(g=>g!==b).slice(0,2);dead.forEach(g=>g.state='DEAD');S.rendezvous={phase:'waiting'};G.securityRadioReports(dead);G.updateSecurityResponse(.3);check(!a.route.some(w=>w.securityRetreat)&&S.security.pending,'phone appointment interrupted');check(G.securityPatrolPause(a,smoke)===7,'elevated smoking window');
    S.rendezvous=null;S.vipPlan={phase:'sick'};G.updateSecurityResponse(.3);check(!a.route.some(w=>w.securityRetreat),'poison WC route interrupted');S.vipPlan=null;G.updateSecurityResponse(.3);check(a.route.filter(w=>w.securityRetreat).length===1,'deferred retreat never occurs');
    Object.assign(a,{x:27.5*48,y:15.5*48,a:Math.PI/2,fl:0,z:0,state:'PATROL'});Object.assign(b,{x:31.5*48,y:15.5*48,fl:0,z:0,state:'PATROL',path:null});
    const start={x:b.x,y:b.y};for(let i=0;i<100;i++){S.t+=.05;G.followLeader(b,.05,48);}
    check(!b.waitingPrivacy&&Math.hypot(b.x-a.x,b.y-a.y)<100&&Math.hypot(b.x-start.x,b.y-start.y)>60,'high security escort did not physically follow');
    Object.assign(a,{x:40.5*48,y:6.5*48});G.followLeader(b,.05,48);check(b.waitingPrivacy,'prepared WC privacy lost');passed.push('shorter solo window; escort tightens physically; phone and WC opportunities retained');
    // Lost partner remembers last visible location, not hidden corpse coordinates.
    S=fresh();gs=crew(S);const dead2=gs.slice(0,2);dead2.forEach(g=>g.state='DEAD');G.securityRadioReports(dead2);G.updateSecurityResponse(.3);pairs=S.guards.filter(g=>g.securityBuddy!=null);b=pairs[0];a=S.guards.find(g=>g.id===b.securityBuddy);const known={...b.securityLast};a.state='DEAD';a.x=100;a.y=100;S.t=known.at+8;G.updateGuard(b,.05);check(b.securityBuddy==null&&b.why==='radio'&&Math.hypot(b.poi.x-known.x,b.poi.y-known.y)<1,'partner tracks hidden body');check(safe(S),'partner identifies killer');passed.push('missing partner investigates last seen position');
    S=fresh();gs=crew(S);gs.slice(0,2).forEach(g=>g.state='DEAD');G.securityRadioReports(gs.slice(0,2));G.updateSecurityResponse(.3);b=S.guards.find(g=>g.securityBuddy!=null);Object.assign(b,{x:20.5*48,y:21.5*48,fl:0,z:0,a:0,want:0,state:'PATROL',path:null,lureScan:0});
    const lure={x:b.x+40,y:b.y,fl:0,landed:true,claim:null};S.lures=[lure];G.updateGuard(b,.05);check(b.state==='LURE'&&lure.claim===b,'paired guard ignores prepared lure');passed.push('paired patrol still responds to a visible lure');
    for(const st of G.STAGES.filter(s=>s.tutorial)){G.start(G.STAGES.indexOf(st));while(G.DLG.modal)G.advanceDialog();G.updateSecurityResponse(1);check(G.securityLevel()===0&&!G.S.security,'tutorial gains security response');}passed.push('tutorials unchanged');
    return passed;
   }''')
   print('PASS security', 'mobile' if mobile else 'PC',json.dumps(r,ensure_ascii=False),flush=True)
   assert not errors, errors;await pg.close()
  await b.close()
asyncio.run(main())
