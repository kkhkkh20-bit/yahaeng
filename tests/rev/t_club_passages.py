"""Live-AI PC/touch route through wells, ducts, real switches and vent ambush."""
import asyncio,importlib.util,json,threading,sys
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
spec=importlib.util.spec_from_file_location('route',str(Path(__file__).with_name('t_club_study.py')));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
EXTRA='''()=>{const {G,S,P,V,tick,check,stop,render}=play;
const tunnel=(kind,tx,ty)=>{const test=kind==='sewer'?G.ugAt:G.ventAt,sol=(x,y)=>!test(x,y);const path=G.astar(Math.floor(P.x/48),Math.floor(P.y/48),tx,ty,sol);check(path.length,'passage disconnected '+tx+','+ty);for(const at of path){let n=0;while(Math.hypot(P.x-at.x,P.y-at.y)>3&&n++<400){const dx=at.x-P.x,dy=at.y-P.y,v=V.groundToScreen?V.groundToScreen(dx,dy):{x:(dx-dy)/Math.SQRT2,y:(dx+dy)/Math.sqrt(6)},x=v.x,y=v.y,len=Math.hypot(x,y)||1;G.input.joy={x:x/len*.5,y:y/len*.5,mag:.5};tick();}check(n<400,'passage movement blocked');}stop();tick(3);render();};play.tunnel=tunnel;}'''
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(m.R)));threading.Thread(target=server.serve_forever,daemon=True).start();mobile=len(sys.argv)>1;results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']);pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear();let seed=131;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}');await pg.goto(f'http://127.0.0.1:{server.server_port}/build/club-study/index.html?nostats');await pg.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await pg.evaluate('window.__clubError');await pg.evaluate('window.requestAnimationFrame=()=>0');await pg.wait_for_timeout(100);await pg.evaluate('window.__MOBILE_TEST__='+str(mobile).lower());await pg.evaluate(m.DRIVER);await pg.evaluate(EXTRA)
  async def step(name,code):
   print('STEP',name,flush=True)
   try:result=await pg.evaluate('()=>{const {G,S,P,V,tick,idle,check,key,act,walk,tunnel,render}=play;'+code+';G.updateHUD();render();return {time:S.t,hp:P.hp,at:[P.x/48,P.y/48],under:P.under,vent:P.vent,contacts:V.contactTrace};}')
   except Exception:
    await pg.screenshot(path=str(m.O/'passage-failure.png'),timeout=90000);print('FAIL',await pg.evaluate('({at:[__game.S.player.x/48,__game.S.player.y/48],env:__game.envChoices().map(a=>({k:a.k,label:a.label})),error:window.__clubError})'),flush=True);raise
   results.append({'case':name,**result});await pg.screenshot(path=str(m.O/f'passage-{"mobile"if mobile else"pc"}-{name}.png'),timeout=90000);print('PASS',name,{k:v for k,v in result.items()if k!='contacts'},flush=True)
  await step('well-entry',"walk(6,19);const w=S.hides.find(h=>h.type==='well'&&h.ty===18);act(G.envChoices().find(a=>a.k==='hide'&&a.h===w));check(P.hide===w,'well entry fails');")
  await step('sewer',"act(G.envChoices().find(a=>a.k==='tunnel'));check(P.under&&!P.hide,'sewer descent fails');G.updateHUD();check(document.getElementById('btnSneak').disabled&&document.getElementById('moveLbl').textContent==='걷기','sewer offers impossible running');check(!V.world.root.visible&&V.world.passages.sewer.visible,'surface masks sewer');check(V.people.height(P)<-2,'hero is not below street');const cv=document.createElement('canvas');cv.width=150;cv.height=140;check(V.drawPassageMap(cv),'sewer mini map absent');tunnel('sewer',6,3);")
  await step('surface',"act(G.envChoices().find(a=>a.k==='surface'));check(!P.under&&V.world.root.visible,'sewer exit fails');G.updateHUD();check(!document.getElementById('btnSneak').disabled,'running stays locked on street');check(Math.hypot(P.x-6.5*48,P.y-3.5*48)<65,'wrong sewer exit');walk(7,5);")
  await step('vent-entry',"const v=S.vents.find(v=>v.street);act(G.envChoices().find(a=>a.k==='ventIn'&&a.v===v));check(P.vent&&V.world.passages.duct.visible,'duct entry fails');G.updateHUD();check(document.getElementById('moveLbl').textContent==='낮게 이동','duct movement label is wrong');tunnel('duct',9,5);")
  await step('vent-exit',"act(G.envChoices().find(a=>a.k==='ventOut'));check(!P.vent&&G.bldAt(Math.floor(P.x/48),Math.floor(P.y/48))===0,'duct does not lead indoors');walk(12,5);")
  await step('switch',"const l=S.lamps[2],at=G.lampControl(l),model=V.world.lamps.find(o=>o.l===l);check(Math.hypot(model.controlAt.x*48-at.x,model.controlAt.z*48-at.y)<.001,'switch and action differ');check(G.envAction().k==='lamp','switch prompt is stolen by another object');const a=G.envChoices().find(a=>a.k==='lamp'&&a.l===l);check(a,'switch action absent');G.selectEnvTarget(G.envToken(a));key('KeyX',3);tick(1);render();const contact=V.contactTrace.filter(c=>c.kind==='lamp').at(-1);check(contact&&contact.distance<.22,'switch hand misses control');idle();check(l.off&&model.light.intensity===0,'switch off fails');act(G.envChoices().find(a=>a.k==='lamp'&&a.l===l));check(!l.off&&model.light.intensity>0,'switch on fails');")
  await step('duct-patrol',"walk(9,5);act(G.envChoices().find(a=>a.k==='ventIn'));tunnel('duct',18,10);let n=0;while(G.attackAction().k!=='ventKill'&&n++<1500)tick();check(n<1500,'patrol never passes the grille');")
  await step('vent-pull',"key('KeyZ',4);tick(20);render();check(P.trav?.ventPull,'vent pull skipped motion');check(V.people.player.driver.partner.visible,'vent victim is invisible');idle();check(P.vent&&S.stats.kills===0&&S.corpses.some(c=>c.ko&&c.stashed),'vent tap should hide a knocked-out guard');")
  await step('return-to-room',"act(G.envChoices().find(a=>a.k==='ventOut'));check(!P.vent&&P.hp>0,'exit after vent ambush fails');")
  assert not errors,errors;(m.O/f'passage-{"mobile"if mobile else"pc"}.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));await b.close()
 server.shutdown()
if __name__=='__main__':asyncio.run(main())
