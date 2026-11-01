"""Full VIP route with all AI/cameras active. Ordinary keyboard/joystick movement and action handlers; no teleport, HP, outfit, key or objective grants. Authored map is known; not a blind human playthrough."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2];ns={'__file__':str(ROOT/'tests/rev/t_uniform_walkthrough.py')};exec((ROOT/'tests/rev/t_uniform_walkthrough.py').read_text().split('async def main():')[0],ns)
FLOW=ns['FLOW']
start=FLOW.index(" walk([{x:7,y:12,f:0}],'office interior');")
FLOW=FLOW[:start]+'''
 walk([{x:7,y:12,f:0}],'office interior');trace.push('crew office access');
 const note=S.notes[0];walk(at(note),'upstairs code note');a=G.envChoices().find(a=>a.k==='read'&&a.n===note);check(a,'code note action');G.selectEnvTarget(G.envToken(a));G.actEnv();idle();while(G.DLG.modal)G.advanceDialog();check(P.keys.code,'code never learned');
 const item=S.items[0];walk(at(item),'ledger');a=G.envChoices().find(a=>a.k==='loot'&&a.it===item);check(a,'ledger action');G.doAct(a);idle();check(item.got,'ledger not recovered');const camera=S.cams.find(c=>!c.fl&&G.bldAt(c.tx,c.ty)===0);check(camera,'office camera missing');walk([{x:4,y:12,f:0}],'camera approach');P.a=Math.atan2(camera.y-P.y,camera.x-P.x);const shot=G.kunaiTarget();check(shot?.type==='cam'&&shot.ref===camera,'office camera not aimable '+JSON.stringify({camera:[camera.x/48,camera.y/48],target:shot?.type,at:[P.x/48,P.y/48]}));G.actKunai(shot,false);for(let i=0;i<120&&!camera.broken;i++)tick();check(camera.broken,'camera shot failed');idle();trace.push('office camera disabled with dart');
 const meeting=G.rendezvousState(),vip=S.guards.find(g=>g.tag==='vip');walk(at(meeting.room),'phone');a=G.envChoices().find(a=>a.k==='callMeet');check(a,'phone action');G.selectEnvTarget(G.envToken(a));G.actEnv();idle();check(meeting.calls===1,'call not committed');
 const locker=S.hides.find(h=>h.type==='locker'&&!h.fl&&G.bldAt(h.tx,h.ty)===0);walk(G.hidePerimeter(locker).filter(c=>pass(c.tx,c.ty,0)).map(c=>({x:c.tx,y:c.ty,f:0})),'ambush locker');G.doAct({k:'hide',h:locker});idle();check(P.hide===locker,'hide failed');
 for(let frames=0;frames<7200&&meeting.phase==='travelling';frames++)tick();check(meeting.phase==='waiting','target never arrives');trace.push('VIP arrived while hidden');G.leaveHide({x:0,y:1});idle();
 const rear=approach(vip,70).filter(c=>Math.cos(Math.atan2(c.y*48+24-vip.y,c.x*48+24-vip.x)-vip.a)<-.2||Math.hypot(c.x*48+24-vip.x,c.y*48+24-vip.y)<34);walk(rear,'VIP rear');P.a=Math.atan2(vip.y-P.y,vip.x-P.x);a=G.attackAction();for(let i=0;i<120&&!(a.list||[a.g]).includes(vip);i++){drive(vip.x-P.x,vip.y-P.y);tick();a=G.attackAction();}stop();check((a.list||[a.g]).includes(vip),'VIP attack not available');S.keys.KeyZ=true;G.combatPress('KeyZ');G.actAttack();for(let i=0;i<150;i++)tick();S.keys.KeyZ=false;G.combatRelease('KeyZ');idle();check(G.targetEliminated(vip)&&S.exitOpen,'VIP or objectives incomplete');trace.push('VIP eliminated');
 const e=[];for(const exit of S.exits)for(let y=0;y<G.MH;y++)for(let x=0;x<G.MW;x++)if(Math.hypot(x*48+24-exit.x,y*48+24-exit.y)<exit.r-5&&pass(x,y,0))e.push({x,y,f:0});walk(e,'escape');settle();check(S.over&&S.exitOpen,'escape fails');stop();return{mobile,seconds:Math.round(S.t),hp:P.hp,detected:S.stats.detected,outfit:P.outfit,approach:S.missionApproach,exit:S.exit.name,trace};
}'''
FLOW=FLOW.replace("for(const v of G.STAGE.code)","check(P.keys.code,'password not learned');for(const v of G.STAGE.code)")
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   await pg.evaluate('()=>{let s=116;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}')
   try:
    r=await pg.evaluate(FLOW,{'sid':'m2','mobile':mobile,'live':True})
   except Exception:
    cleared=await pg.evaluate('!!__game.S.over&&__game.S.exitOpen&&document.getElementById("endTitle").textContent==="임무 완료"')
    if not cleared:
     print('FAILED',await pg.evaluate('({trace:__flowTrace,t:__game.S.t,hp:__game.S.player.hp,at:[__game.S.player.x/48,__game.S.player.y/48,__game.S.player.fl],blown:__game.S.player.disguiseBlown,alarm:__game.S.alevel,evidence:__game.evidencePending()})'),flush=True);raise
    # The route driver stops when extraction ends the mission; it must not keep walking after success.
    r=await pg.evaluate('({seconds:Math.round(__game.S.t),hp:__game.S.player.hp,detected:__game.S.stats.detected,approach:__game.S.missionApproach,exit:__game.S.exit.name,trace:__flowTrace})')
   assert await pg.locator('#endTitle').inner_text()=='임무 완료'
   assert not errors,errors
   print('PASS full AI showcase','mobile'if mobile else'PC',json.dumps(r,ensure_ascii=False),flush=True)
   await pg.screenshot(path='/tmp/vip-polish-v121/'+('mobile'if mobile else'pc')+'-phone-clear.png')
   await pg.close()
  await b.close()

Path('/tmp/vip-polish-v121').mkdir(exist_ok=True)
asyncio.run(main())
