"""Controlled fixtures for the unskilled CCTV option; native inputs, real work timer.
Separate native campaign journeys establish playable routes, without these fixtures.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/level-v168';O.mkdir(exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   await q.evaluate('''()=>{
    const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;
    Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,mode:'walk',cover:null,strikeT:0});G.setLayer(0);
    for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
    S.guards=[];S.vehicles=null;S.facOn=false;S.t=10;S.cams=[{x:P.x+24,y:P.y,fl:0,z:0,tx:33,ty:21,base:0,a:0,sweep:0,period:12,ph:0,cool:0,meter:0}];
    S.cameraEvidence=true;S.stats.camRec=2;window.fixture={G,S,P,c:S.cams[0],tick:s=>{for(let t=0;t<s-1e-6;t+=.01){S.t+=.01;G.updatePlayer(.01)}}};G.updateHUD(true);
    if(G.skillOn('dart')||G.skillOn('electric')||G.skillOn('hack')||P.kunai)throw Error('Fixture grants a skill');
    if(G.envAction().k!=='camCable')throw Error('Close camera has no base action');
   }''')
   if touch:await q.tap('#btnCarry')
   else:await q.keyboard.press('x')
   await q.evaluate('''()=>{const{G,P,c,tick}=fixture;if(!P.interact?.illegal)throw Error('Sabotage is not witnessed as suspicious');tick(1.9);if(!G.camOn(c)||c.unplugged)throw Error('Camera disabled before2s');tick(.2);if(G.camOn(c)||!c.unplugged||fixture.S.stats.camUnplugged!==1)throw Error('Camera did not disable once');if(!G.evidencePending()||fixture.S.stats.camRec!==2)throw Error('Unplug erased evidence');if(G.envChoices().some(a=>a.k==='camCable'))throw Error('Disabled camera still offers cable action');}''')
   checks=await q.evaluate('''()=>{
    const{G,S,P,c,tick}=fixture,out=[],ok=(v,m)=>{if(!v)throw Error(m)};
    c.unplugged=false;c.x=P.x+41;ok(!G.cameraCableReachable(c),'reach beyond40px');c.x=P.x+24;c.fl=1;ok(!G.cameraCableReachable(c),'wrong floor');c.fl=0;c.z=1;ok(!G.cameraCableReachable(c),'wrong elevation');c.z=0;c.search=true;ok(!G.cameraCableReachable(c),'searchlight bypass');c.search=false;
    P.carrying={};ok(!G.cameraCableReachable(c),'carrying work');P.carrying=null;P.hide={};ok(!G.cameraCableReachable(c),'hidden work');P.hide=null;
    const x=Math.floor(P.x/48),y=Math.floor(P.y/48),old=G.G0[y][x+1];c.x=P.x+70;G.G0[y][x+1]='#';ok(!G.cameraCableReachable(c),'through wall');G.G0[y][x+1]=old;c.x=P.x+24;out.push('range, floor, elevation, searchlight and incompatible poses rejected');
    G.doAct({k:'camCable',targetObject:c,at:c,label:'CCTV 전선 분리'});ok(P.interact,'work did not begin');c.x=P.x+80;tick(2.1);ok(!c.unplugged&&!P.interact,'stale target committed');c.x=P.x+24;
    G.doAct({k:'camCable',targetObject:c,at:c,label:'CCTV 전선 분리'});S.cams=[];tick(2.1);ok(!c.unplugged,'vanished target committed');S.cams=[c];out.push('moving or removed target cancels without changing records');
    G.doAct({k:'camCable',targetObject:c,at:c,label:'CCTV 전선 분리'});tick(2.1);G.saveCheckpoint();ok(G.loadCheckpoint()&&G.S.cams[0].unplugged&&!G.camOn(G.S.cams[0]),'save forgets unplugged cable');out.push('physical cable state survives checkpoint');return out;
   }''')
   await q.evaluate('''()=>{const G=__game;localStorage.clear();G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();Object.assign(G.S.player,{x:235,y:445,fl:0,z:0});G.setLayer(0);const L=G.envChoices();if(G.envAction().k!=='keypad'||L.some(a=>a.k==='lamp'&&a.skillLocked))throw Error('Basic light controls hide vault keypad or remain skill locked');}''')
   assert not errors,errors;rows.append({'touch':touch,'checks':['native input,2s duration, illegal work, records preserved',*checks,'office keypad stays usable beside basic light controls']});await q.close()
  await b.close()
 (O/'camera-cable.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('PASS base CCTV cable PC/mobile:',rows)
asyncio.run(main())
