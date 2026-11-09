"""Permission, walking, facing and actual witnessed evidence stay separate.
Controlled detector matrix; normal-time authored office replay is separate.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game',polling=100)
  checks=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},results=[];
   function fresh(level=0,role='ordinary'){
    G.start(G.STAGES.findIndex(s=>s.id==='m1'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);
    S.guards=[g];S.facOn=false;S.corpses=[];S.decals=[];S.cams=[];S.alevel=level;S.knownLooks={};S.chaseSeen=false;
    Object.assign(g,{x:30.5*48,y:3.5*48,fl:0,z:0,a:0,want:0,state:'PATROL',wait:999,post:0,still:true,idleT:999,enforcer:role==='enforcer',elite:role==='elite',target:role==='target',radio:false,meter:0,chat:null,act:null});
    Object.assign(P,{x:g.x+80,y:g.y,fl:0,z:0,a:Math.PI,outfit:'crew',disguise:'sam',disguiseBlown:false,light:1,hidden:false,mode:'walk',moving:false,hide:null,under:null,vent:null,strikeT:0});G.setLayer(0);
    return{S,P,g,tick:t=>{for(let n=0;n<t/.05;n++){S.t+=.05;G.updateGuard(g,.05);}}};
   }
   for(const lv of [0,1,2])for(const moving of [false,true]){
    const f=fresh(lv);f.P.moving=moving;f.tick(12);
    ok(!f.g.eyeT&&!f.P.disguiseBlown&&f.g.state==='PATROL'&&!f.S.stats.detected,'ordinary guard invents identity '+JSON.stringify({lv,moving,state:f.g.state}));
   }results.push('ordinary guards accept an unreported uniform for 12 seconds at all alert levels');
   for(const role of ['enforcer','elite','target']){
    for(const mode of ['walk','run']){const f=fresh(2,role);f.P.mode=mode;f.P.moving=true;f.tick(12);ok(!f.g.eyeT&&!f.g.eyeWatching&&!f.P.disguiseBlown&&!f.S.stats.detected,'passing colleague is auto-identified '+role+' '+mode);}
    let f=fresh(0,role);f.P.a=0;f.tick(12);ok(!f.g.eyeT&&!f.P.disguiseBlown,'back of head reveals identity '+role);
    f=fresh(0,role);f.tick(1);ok(f.g.eyeT>0&&!f.P.disguiseBlown,'marked face check has no warning '+role);
    const remembered=f.g.eyeT;f.P.moving=true;f.tick(.1);ok(f.g.eyeT>0&&f.g.eyeT<remembered&&!f.g.eyeWatching&&!f.P.disguiseBlown,'walking must fade an existing check without building suspicion');
    f.P.moving=false;f.P.a=0;f.tick(4);ok(!f.P.disguiseBlown,'paused with back turned still identified');
    f.P.a=Math.PI;f.tick(3.2);ok(!f.P.disguiseBlown&&G.knownFace(f.g)&&!f.S.knownLooks.crew&&f.g.state==='ALERT','real stationary face check no longer works '+role);
   }results.push('marked roles ignore walking/running and back-facing passers; uninterrupted stationary face checks remain real');
   let f=fresh(2);G.rememberSuspect(f.g,'crew');f.tick(3);ok(f.g.state==='ALERT','an actual witness forgets the reported appearance');
   f=fresh();f.P.strikeT=.2;f.tick(.05);ok(f.g.state==='ALERT','uniform protects a witnessed attack');results.push('real suspect memories and witnessed crimes still detect');
   G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const P=G.S.player;
   for(const fl of [0,1,2]){Object.assign(P,{x:360,y:456,fl,z:0,outfit:'crew',disguiseBlown:false});G.setLayer(fl);ok(G.accessReadout().allowed,'guard cannot use normal office floor '+fl);}
   Object.assign(P,{x:264,y:312,fl:0});G.setLayer(0);ok(!G.accessReadout().allowed&&G.accessReadout().zi.secure,'vault clearance was removed');
   Object.assign(P,{x:1224,y:312,fl:1});G.setLayer(1);ok(!G.accessReadout().allowed&&G.accessReadout().zi.secure,'private club upper floor lost clearance');
   ok(document.querySelector('#pauseVersion').textContent.includes(window.__BUILD_VERSION__),'in-game version missing');results.push('office circulation accepts guard uniform; vault and private club keep clearance; menu shows runtime version');
   return results;
  }''');assert not errors,errors
  out=R/'build/disguise-v184';out.mkdir(exist_ok=True);(out/'rules.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));print('PASS',checks);await b.close()
asyncio.run(main())
