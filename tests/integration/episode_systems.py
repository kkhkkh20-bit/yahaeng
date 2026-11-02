"""Campaign systems in the episode, through discovered actions and input handlers.
Normal-route tests preserve live AI; controlled camera/sign fixtures are labelled.
"""
import asyncio,importlib.util,json,threading,sys
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];sp=importlib.util.spec_from_file_location('m',R/'tests/rev/t_club_study.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
O=R/'build/integration-validation';O.mkdir(exist_ok=True)
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for mobile in ([True] if 'mobile' in sys.argv else [False]):
   page=await browser.new_page(viewport={'width':390 if mobile else 1100,'height':844 if mobile else 800},has_touch=mobile);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.add_init_script('localStorage.clear();let seed=128;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}')
   await page.goto(f'http://127.0.0.1:{server.server_port}/build/episode-one/?nostats');await page.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await page.evaluate('window.__clubError');await page.evaluate('requestAnimationFrame=()=>0');await page.wait_for_timeout(100);await page.click('#btnBrGo');await page.evaluate('window.__MOBILE_TEST__='+str(mobile).lower());await page.evaluate(m.DRIVER)
   async def step(name,code):
    try:r=await page.evaluate('()=>{const {G,S,P,V,walk,tick,idle,act,key,render,check}=play;'+code+';render();return {t:S.t,hp:P.hp,at:[P.x/48,P.y/48,P.fl||0],alarm:S.alevel};}')
    except Exception:
     await page.screenshot(path=str(O/f'{"mobile"if mobile else"pc"}-{name}-failure.png'));raise
    print('PASS',name,r,flush=True);results.append({'mobile':mobile,'case':name,**r});await page.screenshot(path=str(O/f'{"mobile"if mobile else"pc"}-{name}.png'))
   async def restart():
    await page.evaluate('__game.start(__game.STAGES.findIndex(s=>s.episode));while(__game.DLG.modal)__game.advanceDialog();__game.benchDraw(1)');await page.evaluate('__clubView.readyForScene()');await page.evaluate(m.DRIVER)
   await step('bush-button',"walk(7,12);const h=S.bushes[0],a=G.envChoices().find(a=>a.k==='hide'&&a.h===h);check(a,'real action list lacks bush entry');act(a);check(P.hide===h&&P.hidden,'bush button does not hide');check(V.people.player.driver.root.visible,'hidden hero loses locator');const head=V.people.player.rig.bones.Head.getWorldPosition(V.people.player.driver.handPosition());check(Math.hypot(head.x-P.x/48,head.z-P.y/48)<.6,'hidden pose extends outside foliage');const o=V.world.hides.find(o=>o.h===h);check(o.v.leaves.every(m=>m.opacity<.6),'foliage obscures hidden hero');")
   await step('bush-direction-exit',"key('ArrowRight',3);idle();check(!P.hide&&!G.actionBusy(),'directional exit fails');check(Math.hypot(P.x-S.bushes[0].x,P.y-S.bushes[0].y)>30,'exit stays in planter');")
   await step('bush-crouch',"walk(6,12);key('ControlLeft');tick(2);check(!P.hide&&P.hidden&&P.mode==='sneak','legacy crouch in bush fails');key('ControlLeft');tick(2);check(!P.hidden,'standing remains concealed');")
   await restart()
   await step('diner-entry',"walk(5,10);walk(3,6);check(V.world.visibility.inside===1&&!V.world.roofs.find(o=>o.bi===1).group.visible,'diner remains roof-covered');check(G.FURN.some(f=>f.t==='toilet')&&G.FURN.some(f=>f.t==='bsink'),'bathroom missing');")
   await step('medicine-pickup',"act(G.envChoices().find(a=>a.k==='pickup'&&a.p.outfit==='waiter'));check(P.outfit==='waiter','legitimate apron pickup fails');check(G.envAction().k==='pickup'&&G.envAction().p?.id==='laxative','default button does not advance to medicine');const a=G.envChoices().find(a=>a.k==='pickup'&&a.p.id==='laxative');check(a?.p.surface,'medicine missing from shelf/action list');act(a);check(P.item?.id==='laxative','pickup has no inventory result');check(!V.world.systems.props.get(a.p).group.visible,'taken bottle remains on shelf');")
   await step('meal-use',"walk(3,9);act(G.envChoices().find(a=>a.k==='use'));check(S.mealDosed&&S.usesDone[0]&&!P.item,'use does not dose meal');walk(5,9);")
   await step('meal-to-toilet',"let n=0;while(!S.dining?.arrived&&n++<7200)tick();check(n<7200&&S.dining.sick&&S.dining.phase==='toilet','live guest never reaches toilet '+JSON.stringify({meal:S.dining,guest:S.guards.find(g=>g.tag===S.dining.guest)}));const g=S.guards.find(g=>g.tag===S.dining.guest);check(Math.hypot(g.x-(G.STAGE.dining.toilet[0]+.5)*48,g.y-(G.STAGE.dining.toilet[1]+.5)*48)<25,'guest teleports or wrong WC');walk(3,5);check(V.world.visibility.inside===1,'WC unreachable');")
   await restart()
   await step('card-steal-controlled',"const g=S.guards.find(g=>g.tag==='closingStaff');check(g.hasKey==='blue','authored card missing');P.x=g.x-Math.cos(g.a)*40;P.y=g.y-Math.sin(g.a)*40;G.setLayer(0);tick();act(G.envChoices().find(a=>a.k==='steal'&&a.g===g));check(P.keys.blue&&!g.hasKey,'actual pickpocket action fails');")
   await step('card-door-controlled',"Object.assign(P,{x:7.5*48,y:6.5*48});tick();const d=S.doors.find(d=>d.tx===8&&d.ty===6);check(d.keyLock==='blue'&&V.world.doors.find(o=>o.d===d).keypads.some(k=>k.kind==='blue'),'card door/reader missing');act(G.envChoices().find(a=>a.d===d));check(!d.locked,'card does not open its door');")
   await restart()
   await step('camera-record-controlled',"tick();render();const e=V.world.systems.cameras[0],c=e.c;check(c&&e.g.visible,'camera model absent');let point=null;G.setLayer(c.fl);for(let y=9;y<15&&!point;y++)for(let x=9;x<20&&!point;x++)if(!G.solidAt(x,y)&&G.cameraSees(c,(x+.5)*48,(y+.5)*48,G.lightAtG((x+.5)*48,(y+.5)*48,c.fl))>.5&&Math.abs(Math.atan2(Math.sin(Math.atan2((y+.5)*48-c.y,(x+.5)*48-c.x)-c.a),Math.cos(Math.atan2((y+.5)*48-c.y,(x+.5)*48-c.x)-c.a)))<.12)point={x:(x+.5)*48,y:(y+.5)*48};check(point,'no real camera field');Object.assign(P,{...point,fl:c.fl,mode:'walk'});tick(65);render();check((S.stats.camRec||0)>0,'intrusion not recorded '+JSON.stringify({c,light:P.light,zone:G.pZoneEff?.()}));check(e.cells.length>0,'camera field missing');for(const p of e.cells)check(G.cameraSees(c,p.x,p.y,G.lightAtG(p.x,p.y,c.fl))>0,'CCTV display disagrees with ray test');")
   await step('console-erase-controlled',"Object.assign(P,{x:S.camRoom.x,y:S.camRoom.y,fl:S.camRoom.fl});tick();act(G.envChoices().find(a=>a.k==='camroom'));check(S.camsOff&&!S.cameraEvidence&&S.stats.camRec===0,'console does not erase recording');check(V.world.systems.cameras.every(e=>!e.field.visible),'disabled camera still projects sight');")
   await restart()
   await step('npc-door-controlled',"const g=S.guards.find(g=>g.tag==='camop'),d=S.doors.find(d=>d.tx===10&&d.ty===4);check(d.locked,'fixture starts open');g.route=[{x:10.5*48,y:3.5*48,pause:999}];g.ri=0;g.wait=0;g.path=null;let n=0,worked=false,partial=false;while(Math.hypot(g.x-10.5*48,g.y-3.5*48)>20&&n++<900){tick();worked=worked||!!g.doorWork;partial=partial||!!d.npcWork&&G.doorVisualOpen(d)>0&&G.doorVisualOpen(d)<1;}check(n<900&&worked&&partial&&!d.locked,'NPC cannot physically open and cross its closed door');")
   await restart()
   await step('marked-patrol-controlled',"Object.assign(P,{x:17.5*48,y:9.5*48,fl:1,z:0});G.setLayer(1);tick();const g=S.guards.find(g=>g.tag==='officeGuard');S.marked=g;render();const line=V.world.systems.patrol;check(line.visible&&line.geometry.getAttribute('position').count>4&&line.material.depthTest,'moving guard patrol path is missing');")
   await restart()
   await step('building-power-controlled',"Object.assign(P,{x:7.5*48,y:13.5*48,fl:0,z:0});G.setLayer(0);tick();const fb=S.bfuses.find(f=>f.b===0);check(fb,'authored building fuse missing');act(G.envChoices().find(a=>a.k==='bfuse'&&a.fb===fb));check(fb.cut,'fuse not operated');check(S.lamps.filter(l=>!l.outdoor&&G.bldAt(Math.floor(l.x/48),Math.floor(l.y/48))===0).every(l=>!G.lampOn(l)),'indoor lights stay on');check(S.cams.every(c=>!G.camOn(c)),'CCTV stays powered');render();check(V.world.lamps.filter(o=>o.l.cut===0).every(o=>o.light.intensity===0),'powered-off lamps still illuminate');check(V.world.systems.cameras.every(e=>!e.field.visible),'powered-off sight remains');")
   await restart()
   await step('sign-release-controlled',"const t=S.traps.find(t=>t.k==='drop');Object.assign(P,{x:17.5*48,y:11.5*48,fl:1,z:0});G.setLayer(1);tick();const a=G.envChoices().find(a=>a.k==='trap'&&a.tp.t===t);check(a,'real action list lacks upper sign fixing');G.selectEnvTarget(G.envToken(a));key('KeyX',85);idle();check(t.used,'fixing does not release sign');tick(100);render();check(t.wreck&&!t.fall,'sign has no physical impact');const e=V.world.systems.signs.find(e=>e.t===t);check(e.board.position.y<.2&&!e.chains.visible,'sign model does not fall');")
   assert not errors,errors;await page.close()
  await browser.close()
 (O/f'{"mobile"if "mobile"in sys.argv else"pc"}-systems.json').write_text(json.dumps({'cases':results,'errors':errors,'note':'Position fixtures are explicitly labelled controlled. Movement/dining retain native AI with fixed simulation steps.'},ensure_ascii=False,indent=2));server.shutdown()
if __name__=='__main__':asyncio.run(main())
