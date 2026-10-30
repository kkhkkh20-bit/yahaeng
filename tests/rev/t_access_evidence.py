"""Real alley exits, attack recovery, and witnessed versus unknown perpetrators."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!__game')
  result=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=(id='m4')=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let n=0;n<60&&G.DLG.modal;n++)G.advanceDialog();G.setLayer(0);G.S.player.x=G.S.player.y=-9999;G.input.joy=null;return G.S},tick=(g,n)=>{for(let i=0;i<n;i++){G.S.t+=1/60;G.updateGuard(g,1/60)}},place=(o,x,y,more={})=>Object.assign(o,{x:x*48,y:y*48,fl:0,z:0,state:'PATROL',path:null,climb:null,brawl:null,hunt:null,raid:null,act:null,chat:null,say:null,moving:false,meter:0,seen:false,post:null,follow:null,homeFl:0,wait:999,route:[{x:x*48,y:y*48,pause:999}],ri:0},more);
   let alleys=0;
   for(const x of [13.5,21.5])for(const mobile of [false,true]){
    const S=fresh(),P=S.player;S.guards=[];place(P,x,18.25,{cover:null,vx:0,vy:0});S.keys=mobile?{}:{ArrowUp:true};G.input.joy=mobile?{x:0,y:-1,mag:1}:null;
    for(let i=0;i<120;i++){S.t+=1/60;G.updatePlayer(1/60)}
    check(P.y<16*48,'cannot escape north side of gate '+x+' '+mobile);check(S.doors.find(d=>d.tx===Math.floor(x)&&d.ty===19).locked,'escape silently opens one-way gate');alleys++;
   }
   // An old checkpoint restores both fixture grids and the corresponding container identity.
   {const S=fresh(),P=S.player;S.guards=[];place(P,21.5,18.25);S.items[0].got=true;S.player.hp=2;G.saveCheckpoint();const cp=G.CP;cp.grids[0][16][21]='F';cp.grids[0][16][20]='=';cp.grids[0][17][13]='H';cp.grids[0][16][12]='=';const h=cp.S.hides.find(h=>h.tx===12&&h.ty===16);check(h,'relocated container missing');Object.assign(h,{tx:13,ty:17,x:13.5*48,y:17.5*48,bodies:1});check(G.loadCheckpoint(),'legacy checkpoint refused');check(G.tileG(21,16)==='='&&G.tileG(20,16)==='F'&&G.tileG(13,17)==='.'&&G.S.hides.some(h=>h.tx===12&&h.ty===16&&h.bodies===1),'legacy fixture geometry or stored body lost');check(G.S.items[0].got&&G.S.player.hp===2,'legacy repair lost progress');}
   // A completed fight must not leave a looping punch during the return walk.
   {const S=fresh(),g=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog);S.facOn=false;S.guards=[g];place(g,24.5,13.5,{state:'RETURN',swingT:.3,route:[{x:26.5*48,y:13.5*48,pause:999}],wait:0});tick(g,30);check(g.swingT===0&&G.guardAnim(g)!=='punch','punch persists after leaving fight');check(g.x>24.5*48,'recovery case does not walk');}
   // A faction finishing blow exercises the actual early return that previously froze swingT.
   {const S=fresh(),a=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog),o=S.guards.find(g=>g.fac==='B');S.guards=[a,o];place(a,23.5,13.5,{fac:'P'});place(o,24,13.5,{fhp:1});a.brawl={o,cd:0};const random=Math.random;try{Math.random=()=>0;tick(a,1)}finally{Math.random=random}check(o.state==='DEAD'&&!a.brawl&&a.swingT>0,'no finishing blow');tick(a,30);check(!a.swingT&&G.guardAnim(a)!=='punch','finishing punch never ends');}
   // Point distance alone cannot permit a hit through the locked alley door or across floors.
   {const S=fresh(),a=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog),o=S.guards.find(g=>g.fac==='B');S.guards=[a,o];place(a,21.5,18.98);place(o,21.5,19.52,{fhp:3});a.brawl={o,cd:0};tick(a,180);check(o.fhp===3&&!a.brawl&&!a.swingT,'wall target gets punched');place(a,24,13.5);place(o,24.2,13.5,{z:1,fhp:3});a.brawl={o,cd:0};tick(a,1);check(!a.brawl&&o.fhp===3,'NPC punches different height');}
   // Seeing a normal passerby after an unseen crime is not witnessing the old crime.
   {const S=fresh(),P=S.player,g=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog);S.facOn=false;S.guards=[g];place(P,24.5,13.5,{outfit:null,mode:'sneak',moving:true,light:1,strikeT:0});place(g,24,13.5,{a:0,want:0});S.crimeT=S.t;tick(g,1);check(g.state!=='ALERT'&&!S.chaseSeen&&!S.knownLooks?.face,'unseen crime identifies later passerby');P.strikeT=.3;tick(g,1);check(g.state==='ALERT'&&S.knownLooks?.face,'actual visible attack is ignored');}
   // A body alone causes a search at the body, without identifying or chasing the player.
   let unknown=0;
   for(const fac of ['A','B']){const S=fresh(),P=S.player,g=S.guards.find(g=>g.fac===fac&&!g.target&&!g.dog);S.guards=[g];place(P,30,13.5,{outfit:null,light:1,strikeT:0});place(g,24,13.5,{a:0,want:0});const c={x:24.5*48,y:13.5*48,fl:0,z:0,fac,ko:false,light:1,discovered:false};S.corpses=[c];tick(g,2);check(c.discovered&&g.state==='SEARCH'&&Math.hypot(g.poi.x-c.x,g.poi.y-c.y)<=60&&Math.hypot(g.searchOrigin.x-c.x,g.searchOrigin.y-c.y)<1,'unknown body does not cause local search '+fac+' '+JSON.stringify({state:g.state,poi:g.poi,job:g.searchJob,found:c.discovered,cx:c.x,cy:c.y}));check(!S.chaseSeen&&!S.knownLooks?.face&&!S.war&&g.state!=='ALERT','unknown body reveals player or rival '+fac);unknown++;}
   // Rival presence behind walls/on another floor is not attribution evidence.
   {const S=fresh(),g=S.guards.find(g=>g.fac==='B'),a=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog);place(g,24,13.5);place(a,24.5,13.5,{fl:1});S.guards=[g,a];const c={x:24.5*48,y:13.5*48,fl:0,z:0,fac:'B'};check(!G.facBody(g,c)&&!S.war,'invisible rival blamed for body');c.accident='shock';const r=S.turf.A[0];c.x=(r[0]+.5)*48;c.y=(r[1]+.5)*48;check(!G.facBody(g,c)&&!S.war,'accident is treated as faction murder');}
   // Deliberate faction framing remains: an allied corpse in enemy turf, or a witnessed rival outfit.
   {const S=fresh(),P=S.player,g=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog);const r=S.turf.B[0];check(G.facBody(g,{x:(r[0]+.5)*48,y:(r[1]+.5)*48,fac:'A',fl:0,z:0})&&S.war,'planted body loses faction framing');}
   {const S=fresh(),P=S.player,allies=S.guards.filter(g=>g.fac==='A'&&!g.target&&!g.dog),[v,w]=allies;S.guards=[v,w];place(P,24,13.5,{outfit:'rival',disguiseBlown:false,hidden:false,mode:'walk',light:1});place(v,24.3,13.5);place(w,23,13.5,{a:0,want:0});P.hidden=true;G.facWitness(v);check(!S.war,'hidden attacker reveals rival outfit');P.hidden=false;G.facWitness(v);check(S.war&&!S.chaseSeen,'witnessed rival outfit does not frame faction');}
   // Hidden NPC crimes cannot use the killer metadata as knowledge of the discoverer.
   {const S=fresh(),a=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog),bs=S.guards.filter(g=>g.fac==='B'),[v,w]=bs;place(a,24,13.5);place(v,24.5,13.5);place(w,30,13.5,{a:0});S.guards=[a,v,w];G.npcDown(v,a,true);const c=S.corpses.at(-1);check(!c.blamed&&G.facBody(w,c)&&w.state==='SUSPICIOUS'&&!S.war&&!S.stats.bodies&&!S.chaseSeen&&S.alevel===0,'unwitnessed NPC killer metadata causes war or penalizes player');}
   {const S=fresh(),a=S.guards.find(g=>g.fac==='A'&&!g.target&&!g.dog),[v,w]=S.guards.filter(g=>g.fac==='B');place(a,24,13.5);place(v,24.5,13.5);place(w,23,13.5,{a:0,want:0});S.guards=[a,v,w];G.npcDown(v,a,true);const c=S.corpses.at(-1);check(c.blamed==='A'&&G.facBody(w,c)&&S.war&&!S.chaseSeen&&S.alevel===0,'witnessed NPC crime loses faction attribution or blames player');}
   return {alleyEscapes:alleys,legacyCheckpoint:true,attackRecovery:true,wallAndHeight:true,unknownBodies:unknown,witnessedCrime:true,factionEvidence:true};
  }''')
  assert not errors,errors;print('PASS',result)
  # Real browser events, including the mobile joystick, leave each pocket through its north opening.
  for mobile in [False,True]:
   ui=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);ui.on('pageerror',lambda e:errors.append(str(e)))
   await ui.add_init_script('window.requestAnimationFrame=()=>0');await ui.goto((ROOT/'build/preview_city.html').as_uri());await ui.wait_for_function('!!__game')
   for x in [13.5,21.5]:
    await ui.evaluate('''x=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m4'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.S.guards=[];Object.assign(G.S.player,{x:x*48,y:18.25*48,z:0,fl:0,cover:null,vx:0,vy:0});G.setLayer(0);G.input.joy=null;G.S.keys={}}''',x)
    if mobile:
     cdp=await ui.context.new_cdp_session(ui);await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':75,'y':650}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':75,'y':625}]});assert await ui.evaluate('__game.input.joy?.y<-.1')
    else:await ui.keyboard.down('ArrowUp')
    assert await ui.evaluate('''()=>{const G=__game;for(let i=0;i<120;i++){G.S.t+=1/60;G.updatePlayer(1/60)}return G.S.player.y<16*48}'''),'browser input cannot leave alley'
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await cdp.detach()
    else:await ui.keyboard.up('ArrowUp')
   await ui.close()
  assert not errors,errors;await b.close();print('PASS actual keyboard and mobile touch escape from both alleys')
asyncio.run(main())
