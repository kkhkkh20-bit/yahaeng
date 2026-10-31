"""Notes, medicine and food share physical furniture; meals trigger an actual bathroom visit."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear();let seed=114;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   r=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=(id='m2')=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.S.cams=[];G.S.facOn=false;G.update(.001);return G.S;};
    let S=fresh(),P=S.player;const savedNotes=[];
    for(const id of ['m2','m4']){
     S=fresh(id);P=S.player;const n=S.notes[0],f=n.surface,v=G.surfacePoint(n);check(f&&G.FURN.some(a=>a.x===f.x&&a.y===f.y&&a.t===f.t&&a.fl===f.fl),'note has no supporting furniture '+id);
     check(v.x>=f.x*48&&v.x<=(f.x+f.w)*48&&v.y<f.y*48+24,'note not on tabletop '+id);
     Object.assign(P,{x:n.x,y:n.y,fl:n.fl,z:0});G.setLayer(P.fl);check(G.nearNote()===n,'note unreachable at desk '+id);P.fl=n.fl===0?1:0;G.setLayer(P.fl);check(!G.nearNote(),'read note through floor '+id);P.fl=n.fl;G.setLayer(P.fl);G.readNote(n);check(P.keys.code&&n.read,'reading loses code '+id);while(G.DLG.modal)G.advanceDialog();savedNotes.push({id,x:v.x,y:v.y});
    }
    S=fresh();P=S.player;G.updateHUD(true);const title=document.querySelector('#objTitle');check(title.textContent.includes('VIP')&&getComputedStyle(title).display!=='none'&&title.getBoundingClientRect().height>0,'stage hidden');
    for(const [x,y]of [[6,32],[17,32],[40,8]])check(G.zoneAt(x*48+24,y*48+24,0)===G.Z_PUB,'public service entrance requires disguise');
    const em=S.props.find(p=>p.id==='emetic'),med=S.props.find(p=>p.id==='laxative');check(em.surface?.t==='shelf'&&med.surface?.t==='shelf'&&G.surfacePoint(em).x<G.surfacePoint(med).x,'medicine not separated on pharmacy shelf');
    Object.assign(P,{x:med.x,y:med.y,fl:0,z:0});G.setLayer(0);check(G.objectReachable(med,58),'medicine unreachable');G.takeProp(med);check(P.item===med,'wrong prop picked up');G.dropItem();const drop={x:med.x,y:med.y};check(!med.surface&&med.dropped,'dropped medicine still floats');G.saveCheckpoint();check(G.loadCheckpoint(),'drop checkpoint');S=G.S;P=S.player;let dose=S.props.find(p=>p.id==='laxative');check(dose.dropped&&!dose.surface&&dose.x===drop.x&&dose.y===drop.y,'restore sends drop back to shelf');
    G.takeProp(dose);const u=G.STAGE.uses[1],table=G.usePoint(u);Object.assign(P,{x:table.x,y:table.y,fl:1,z:0});G.setLayer(1);check(!G.nearUse(),'dose through floor');P.fl=0;G.setLayer(0);P.item=em;check(G.nearUse()?.u!==u,'wrong medicine applied to meal');P.item=dose;
    Object.assign(P,{x:table.x,y:table.y});check(G.nearUse()?.u===u,'meal not usable beside table');const a=G.envChoices().find(a=>a.k==='use'&&a.n.u===u);check(a,'no matching meal action');G.actCarry(a);check(P.interact&&!S.mealDosed&&P.item===dose,'dose commits before hand contact');for(let i=0;i<40;i++){S.t+=.02;G.updatePlayer(.02);}check(S.mealDosed&&S.usesDone[1]&&!P.item&&dose.used,'dose not committed once '+JSON.stringify({dosed:S.mealDosed,done:S.usesDone,item:P.item?.id,used:dose.used,interact:P.interact,player:[P.x,P.y],table:[table.x,table.y]}));
    const g=S.guards.find(g=>g.tag==='bouncer');check(g.route.length===1,'dosing magically moves guest');Object.assign(P,{x:-9000,y:-9000,fl:0,z:0});S.alevel=0;S.t=24.1;G.updateDining(.01);check(S.dining.phase==='walking'&&g.route.some(w=>w.mealTrip),'scheduled lunch missing');
    const step=()=>{S.t+=.05;G.setLayer(0);G.updateGuard(g,.05);G.updateDining(.05);};
    let t=0,maxStep=0;while(!S.dining.eaten&&t<100){const old={x:g.x,y:g.y};step();maxStep=Math.max(maxStep,Math.hypot(g.x-old.x,g.y-old.y));t+=.05;}
    check(S.dining.eaten&&S.dining.sick&&maxStep<8,'guest never walks/eats or teleports '+JSON.stringify({t,phase:S.dining.phase,x:g.x/48,y:g.y/48,maxStep}));check(!S.mealDosed,'meal poison not consumed');
    // Save in transit; the one-shot waypoint must remain linked after restore.
    G.saveCheckpoint();check(G.loadCheckpoint(),'meal checkpoint');S=G.S;P=S.player;let guest=S.guards.find(g=>g.tag==='bouncer');check(guest.route.includes(S.dining.waypoint),'save loses meal route identity');
    let wc=0,arrived=false;while(wc<100){S.t+=.05;G.setLayer(0);G.updateGuard(guest,.05);G.updateDining(.05);wc+=.05;if(S.dining.arrived){arrived=true;break;}}
    check(arrived&&Math.hypot(guest.x-40.5*48,guest.y-6.5*48)<30,'guest fails to reach real WC '+JSON.stringify({wc,phase:S.dining.phase,x:guest.x/48,y:guest.y/48}));
    for(let i=0;i<100;i++){S.t+=.05;G.updateGuard(guest,.05);G.updateDining(.05);}check(S.dining.phase==='toilet'&&guest.wait>20,'toilet wait skipped');
    let ret=0;while(ret<120&&!(S.dining.phase==='idle'&&Math.hypot(guest.x-24.5*48,guest.y-16.5*48)<25)){S.t+=.05;G.updateGuard(guest,.05);G.updateDining(.05);ret+=.05;}
    check(S.dining.phase==='idle'&&!guest.route.some(w=>w.mealTrip)&&Math.hypot(guest.x-24.5*48,guest.y-16.5*48)<25,'guest does not return to post '+JSON.stringify({ret,phase:S.dining.phase,x:guest.x/48,y:guest.y/48}));
    check(G.FURN.some(f=>f.t==='toilet'&&f.x===41&&f.y===6)&&G.G0[6][41]==='K'&&G.G0[6][40]!=='K','WC art and collision disagree');
    // A fight interrupts eating, retaining the uneaten preparation and enemy memory.
    S=fresh();P=S.player;const guard=S.guards.find(g=>g.tag==='bouncer'),point=G.usePoint(G.STAGE.uses[1]);S.mealDosed=true;S.t=25;G.updateDining(.01);Object.assign(guard,{x:point.x,y:point.y,moving:false,wait:10});G.updateDining(.9);check(!S.dining.eaten,'meal instantly swallowed');guard.state='ALERT';guard.lastSeen={x:100,y:200,fl:0,z:0};G.updateDining(.1);check(S.mealDosed&&!guard.mealT&&!guard.route.some(w=>w.mealTrip)&&guard.lastSeen.x===100,'interrupt consumes dose or clears pursuit');
    // Clean food does not cause illness; an occupied WC queues a dosed diner outside.
    S=fresh();let diner=S.guards.find(g=>g.tag==='bouncer'),food=G.usePoint(G.STAGE.uses[1]);S.t=25;G.updateDining(.01);Object.assign(diner,{x:food.x,y:food.y,moving:false,wait:10});G.updateDining(3.1);check(S.dining.eaten&&!S.dining.sick&&S.dining.phase==='eating','clean meal causes illness');
    S=fresh();diner=S.guards.find(g=>g.tag==='bouncer');food=G.usePoint(G.STAGE.uses[1]);S.mealDosed=true;S.t=25;G.updateDining(.01);Object.assign(diner,{x:food.x,y:food.y,moving:false,wait:10});G.updateDining(3.1);const occupant=S.guards.find(g=>g.tag==='vip');Object.assign(occupant,{x:40.5*48,y:6.5*48,fl:0,z:0,state:'PATROL'});G.updateDining(.1);check(S.dining.phase==='queue'&&S.dining.waypoint.y===9.5*48,'occupied WC not respected');occupant.state='DEAD';S.vipPlan={phase:'sick'};G.updateDining(.1);check(S.dining.phase==='toilet','dead guest permanently reserves WC');
    // v113 saves had a floor note, one medicine and an unfurnished WC.
    S=fresh();P=S.player;Object.assign(P,{x:39.5*48,y:6.5*48,fl:0,z:0});S.notes[0].read=true;P.keys.code=true;G.saveCheckpoint();const old=G.CP;old.S.notes[0].surface=null;old.S.notes[0].title='책상 밑 메모';old.S.props=old.S.props.filter(p=>p.id==='emetic');Object.assign(old.S.props[0],{surface:null,x:16.5*48,y:30.5*48});old.S.lamps=old.S.lamps.filter(l=>l.x!==40.5*48||l.y!==6.5*48);delete old.S.dining;delete old.S.usePoints;for(const [x,y]of [[39,6],[41,6],[29,9],[30,9]])old.grids[0][y][x]=y===9?'h':'w';check(G.loadCheckpoint(),'legacy restore');S=G.S;P=S.player;G.setLayer(0);check(!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48))&&S.notes[0].surface&&S.notes[0].read&&P.keys.code,'legacy actor trapped or note progress erased');check(S.props.filter(p=>p.id==='laxative').length===1&&S.props[0].surface&&S.lamps.some(l=>l.x===40.5*48&&l.y===6.5*48),'legacy props/light missing');
    return{notes:savedNotes,stage:title.textContent,mealWalkSeconds:+t.toFixed(1),toiletWalkSeconds:+wc.toFixed(1),returnSeconds:+ret.toFixed(1),maxStep:+maxStep.toFixed(2),checkpoint:true};
   }''')
   assert not errors,errors;print('PASS','touch'if touch else'PC',json.dumps(r,ensure_ascii=False),flush=True)
   crowd=await pg.evaluate('''()=>{
    const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S;S.player.x=S.player.y=-9000;S.cams=[];S.facOn=false;S.mealDosed=true;let phases=[],last='',arrival=null,returned=false;
    for(let i=0;i<6500;i++){G.update(.05);if(S.dining?.phase!==last){last=S.dining?.phase;phases.push([+S.t.toFixed(1),last]);}if(S.dining?.arrived&&!arrival)arrival=S.t;const g=S.guards.find(g=>g.tag==='bouncer');if(S.over)throw Error('scenario over');if(arrival&&S.dining.phase==='idle'&&Math.hypot(g.x-24.5*48,g.y-16.5*48)<25){returned=true;break;}}
    if(!arrival||!returned)throw Error('crowd blocks meal/WC/return '+JSON.stringify(phases));return{phases,arrival:+arrival.toFixed(1),guards:S.guards.length};
   }''')
   assert not errors,errors;print('PASS full crowd','touch'if touch else'PC',json.dumps(crowd),flush=True);await pg.close()
  # Real bindings: select a shelf bottle, then apply it to the actual table.
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch)
   await pg.add_init_script("localStorage.clear();(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()")
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   await pg.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.S.guards=[];G.S.cams=[];G.S.facOn=false;G.update(.001);const med=G.S.props.find(p=>p.id==='laxative');Object.assign(G.S.player,{x:med.x,y:med.y,fl:0,z:0});G.setLayer(0);const a=G.envChoices().find(a=>a.k==='pickup'&&a.p===med);if(!a)throw Error('shelf action missing');G.selectEnvTarget(G.envToken(a));__step(2);}''')
   if touch:await pg.locator('#btnCarry').tap()
   else:await pg.keyboard.press('KeyX')
   await pg.evaluate('__step(40)');assert await pg.evaluate("__game.S.player.item?.id==='laxative'")
   await pg.evaluate('''()=>{const G=__game,p=G.usePoint(G.STAGE.uses[1]);Object.assign(G.S.player,{x:p.x,y:p.y});G.setLayer(0);const a=G.envChoices().find(a=>a.k==='use');G.selectEnvTarget(G.envToken(a));__step(2);}''')
   if touch:await pg.locator('#btnCarry').tap()
   else:await pg.keyboard.press('KeyX')
   await pg.evaluate('__step(10)');assert await pg.evaluate('!!__game.S.player.interact&&!__game.S.mealDosed')
   await pg.evaluate('__step(40)');assert await pg.evaluate('__game.S.mealDosed&&!__game.S.player.item&&__game.S.usesDone[1]')
   print('PASS actual','touch'if touch else'keyboard','shelf pickup and meal contact',flush=True);await pg.close()
  await b.close()
asyncio.run(main())
