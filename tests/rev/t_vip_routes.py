"""Twelve live-AI VIP scenes: poison/drink/escort, sign and blue-key back door.

Player starting placements and route equipment are fixtures; NPC simulation runs
normally. Full walking/progression is separately checked by t_mission_flow.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();errors=[]
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game')
   for repeat in range(2):
    for route in ['poison','sign','backdoor']:
     try:
      result=await pg.evaluate('''({route,mobile,repeat})=>{
       const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
       const S=G.S,P=S.player,g=S.guards.find(g=>g.tag==='vip'),escort=S.guards.find(g=>g.tag==='vipEscort'),dt=.025;window.__vipTrace={route,repeat};
       const tick=n=>{for(let i=0;i<n;i++){G.update(dt);if(S.over)throw Error('player died during '+route)}};
       const until=(condition,secs,label)=>{for(let n=0;n<secs/dt;n++){if(condition())return;tick(1)}throw Error(label+' '+JSON.stringify({t:S.t,phase:S.vipPlan,guard:{x:g.x/48,y:g.y/48,state:g.state,ri:g.ri,wait:g.wait,path:g.path?.length},P:{hp:P.hp,fl:P.fl,z:P.z},over:S.over}))};
       const place=(x,y,z=0)=>{Object.assign(P,{x:x*48+24,y:y*48+24,fl:0,z,mode:'walk',outfit:'waiter',disguise:'waiter',disguiseBlown:false});G.setLayer(0)};
       const select=k=>{const a=G.envChoices().find(a=>a.k===k);check(a,'missing '+k+' '+G.envChoices().map(a=>a.k));G.selectEnvTarget(G.envToken(a));G.actEnv();until(()=>!G.actionBusy(),4,k+' unfinished')};
       const hold=(group,secs)=>{if(mobile){const id=group==='env'?'btnCarry':'btnAct',el=document.getElementById(id);el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'touch'}));tick(Math.ceil(secs/dt));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch'}))}else{const key=group==='env'?'KeyX':'KeyZ';S.keys[key]=true;G.combatPress(key);group==='env'?G.actEnv():G.actAttack();tick(Math.ceil(secs/dt));S.keys[key]=false;G.combatRelease(key)}};
       if(route==='poison'){
        place(16,29);select('pickup');check(P.item?.id==='emetic','medicine not picked up');
        place(27,10);select('use');check(S.vipPlan?.phase==='prepared'&&!g.route.some(r=>r.once),'medicine acts before actual drinking');
        place(0,21);until(()=>S.vipPlan.phase==='sick',150,'VIP never drinks');const drankAt=S.t;
        until(()=>Math.floor(g.x/48)>=39&&Math.floor(g.x/48)<=41&&Math.floor(g.y/48)<=7&&g.wait>15,70,'bathroom unreachable');
        until(()=>escort.waitingPrivacy,5,'escort does not wait outside');check(escort.y>8*48,'escort enters private toilet');
        place(g.x/48-.5,g.y/48-.5+.63);P.a=-Math.PI/2;P.mode='sneak';hold('atk',2.4);until(()=>!G.actionBusy(),4,'toilet attack');
        check(G.targetEliminated(g),'toilet hold does not kill');check(S.stats.full===undefined||S.stats.full===0,'private toilet causes full alarm');
        return{drankAt:Math.round(drankAt),bathroom:true,escortWaits:true,killed:true};
       }
       if(route==='sign'){
        place(27,12,2);until(()=>g.x>=25*48&&g.x<30*48&&g.y>=15*48&&g.y<17*48,90,'VIP never reaches smoking spot');
        // Wait for the whole hold window to fit within the scheduled stop.
        until(()=>g.wait>3&&g.y>=15*48,6,'smoking stop too short');const a=G.envChoices().find(a=>a.k==='trap'&&a.tp?.t?.text==='CLUB');check(a,'missing sign action');
        G.selectEnvTarget(G.envToken(a));hold('env',1.25);tick(10);check(G.targetEliminated(g)&&S.corpses.some(c=>c.target&&c.accident),'sign misses the actual target');return{accident:true};
       }
       // Blue card is an equipment fixture; the real door action and NPC response are live.
       P.keys.blue=true;place(33,7);const door=S.doors.find(d=>d.keyLock==='blue');check(door?.locked,'back door not locked initially');
       const a=G.envChoices().find(a=>a.d===door);check(a,'back door has no reachable action');G.selectEnvTarget(G.envToken(a));G.actEnv();until(()=>!G.actionBusy(),4,'back door action');check(!door.locked,'matching card does not open back door');
       check(S.guards.filter(g=>g.state!=='DEAD').length>20,'NPCs were removed');return{blueDoor:true,actors:S.guards.length};
      }''',{'route':route,'mobile':mobile,'repeat':repeat})
     except Exception:
      print('FAILED',route,mobile,repeat,await pg.evaluate('window.__vipTrace'));raise
     print('PASS',route,'touch'if mobile else'keyboard',repeat,result,flush=True)
   await pg.close()
  assert not errors,errors;print('PASS twelve live scenes; no NPC freezing',flush=True);await b.close()
asyncio.run(main())
