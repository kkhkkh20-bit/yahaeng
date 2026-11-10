"""Contact/KO/landing timing, safe follow-ups, pause and checkpoint recovery.

Controlled actors isolate combat rules. Touch cases use Chrome's touch events;
this is not a physical-phone latency or subjective audio-quality measurement.
"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=Path('/tmp/game-feel-v120')
SCENE='''()=>{
 const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
 const S=G.S,P=S.player,base=S.guards.find(g=>!g.civ&&!g.dog&&!g.child&&!g.target);
 S.cams=[];S.facOn=false;S.t=10;S.fade=0;S.alevel=0;S.hitStop=0;S.shakeT=0;S.koHold=null;S.qBuf=0;S.keys={};G.input.pressIds={};
 Object.assign(P,{x:1584,y:1008,fl:0,z:0,a:0,vx:0,vy:0,captive:null,carrying:null,hide:null,cover:null,snap:null,strikeT:0,killAnim:null,trav:null,jump:null,lunge:null,grabIn:null,interact:null,lethalHold:null,attackQueue:null,hp:3,outfit:null,disguise:null});
 const g={...base,id:111,x:P.x+30,y:P.y,fl:0,z:0,a:0,want:0,target:false,civ:false,dog:false,child:false,elite:false,hasKey:null,seen:false,state:'PATROL',meter:0,path:null,act:null,say:null,sayT:0,route:[{x:P.x+30,y:P.y,pause:999}],ri:0,wait:999};S.guards=[g];
 G.setLayer(0);G.cam.x=P.x;G.cam.y=P.y-90;G.updateHUD(true);window.__sounds=[];
 window.sim=(seconds)=>{const n=Math.round(seconds*100);for(let i=0;i<n;i++){const S=G.S;S.t+=.01;G.updatePlayer(.01);G.updateKoHold();G.runTimers();}};
 window.check=(v,m)=>{if(!v)throw Error(m)};
 return {attack:G.attackAction().k,grab:G.grabAction().k};
}'''

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  html=(ROOT/'build/preview_city.html').read_text().replace('function play(name, vol = 0.6, rate = 1) {',"function play(name, vol = 0.6, rate = 1) { if(window.__sounds)window.__sounds.push({name,t:S.t});")
  html=html.replace('function drawEmote(txt, x, y) {',"function drawEmote(txt, x, y) { if(window.__emotes)window.__emotes.push(txt);")
  results=[]
  for mobile in [False,True]:
   pg=await browser.new_page(viewport={'width':390 if mobile else 1280,'height':844},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.route('**/build/preview_city.html*',lambda route:route.fulfill(status=200,content_type='text/html',body=html))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()')
   await pg.goto('http://127.0.0.1:8001/build/preview_city.html?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   cdp=await pg.context.new_cdp_session(pg)
   async def down(key,button):
    if mobile:
     box=await pg.locator('#'+button).bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}]})
    else:await pg.keyboard.down(key)
   async def up(key,button):
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await pg.keyboard.up(key)
   async def fresh():
    r=await pg.evaluate(SCENE);assert r['attack']=='kill' and r['grab']=='grab',r
   # No outcome at button-down; one contact, then KO, then one landing.
   await fresh();await down('KeyZ','btnAct')
   await pg.evaluate("check(!__game.S.corpses.length&&!__game.S.guards[0].unconscious&&__game.S.player.killAnim,'outcome precedes contact')")
   await up('KeyZ','btnAct');await pg.evaluate("sim(.08);check(!__sounds.some(e=>e.name==='thud')&&!__game.S.contact,'early impact')")
   await pg.evaluate("sim(.03);check(__game.S.contact?.kind==='takedown'&&__sounds.some(e=>e.name==='cloth'),'missing hand contact')")
   await pg.evaluate("sim(.30);check(!__game.S.corpses.length,'KO precedes the pose')")
   await pg.evaluate("sim(.02);check(__game.S.corpses[0]?.ko&&__game.S.stats.kills===0&&!__sounds.some(e=>e.name==='thud'),'KO missing or hits floor early')")
   await pg.evaluate("()=>{window.__emotes=[];const G=__game,t=G.S.t;G.benchDraw(1);G.S.t=t;check(!__emotes.includes('zz'),'KO icon covers an unfinished paired pose');}")
   await pg.evaluate("sim(.34);check(!__sounds.some(e=>e.name==='thud'),'landing early');sim(.03);check(__sounds.filter(e=>e.name==='thud').length===1,'landing missing or repeated');sim(.3);check(!__game.S.player.killAnim&&!__game.actionBusy(),'recovery stays locked')")
   events=await pg.evaluate('__sounds');results.append({'mobile':mobile,'events':events})
   # Same uninterrupted press still requires at least a second. No re-press inherits it.
   await fresh();await down('KeyZ','btnAct');await pg.evaluate("sim(.99);check(!__game.S.stats.kills,'early lethal intent');sim(.03);check(__game.S.stats.kills===1,'hold timer restarted at delayed KO');sim(.3);check(__game.S.stats.kills===1,'duplicate lethal result')");await up('KeyZ','btnAct')
   await fresh();await down('KeyZ','btnAct');await pg.evaluate('sim(.2)');await up('KeyZ','btnAct');await down('KeyZ','btnAct');await pg.evaluate("sim(1.2);check(__game.S.stats.kills===0&&__game.S.corpses[0].ko,'new press inherits prior lethal intent')");await up('KeyZ','btnAct')
   # The queued tap follows the original grapple exactly once.
   await fresh();await down('KeyC','btnGrab');await up('KeyC','btnGrab');await pg.evaluate('sim(.2);__game.updateHUD(true)')
   await down('KeyZ','btnAct');await pg.evaluate("check(!!__game.S.player.attackQueue,'follow-up not accepted')");await up('KeyZ','btnAct')
   await pg.evaluate("sim(.6);check(__game.S.corpses.length===1&&__game.S.corpses[0].ko&&!__game.S.player.captive,'follow-up lost');sim(1.2);check(!__game.S.stats.kills&&__game.S.corpses.length===1&&!__game.S.player.attackQueue,'tap repeats or becomes lethal')")
   # Hold during the queue also cannot shorten the lethal confirmation after execution.
   await fresh();await down('KeyC','btnGrab');await up('KeyC','btnGrab');await pg.evaluate('sim(.2);__game.updateHUD(true)');await down('KeyZ','btnAct')
   await pg.evaluate("sim(1);check(!__game.S.stats.kills,'queue skips lethal confirmation');sim(.25);check(__game.S.stats.kills===1,'held follow-up never completes')");await up('KeyZ','btnAct')
   # Pausing clears pending input and freezes all newly scheduled pair sounds.
   await fresh();await down('KeyC','btnGrab');await up('KeyC','btnGrab');await pg.evaluate('sim(.2);__game.updateHUD(true)');await down('KeyZ','btnAct');await up('KeyZ','btnAct');await pg.locator('#btnPause').click()
   await pg.evaluate("check(!__game.S.player.attackQueue,'pause retains follow-up')");await pg.locator('#btnResume').click();await pg.evaluate("sim(1);check(__game.S.player.captive&&!__game.S.corpses.length,'paused input executes later')")
   await fresh();await down('KeyZ','btnAct');await up('KeyZ','btnAct');await pg.evaluate('sim(.2)');await pg.locator('#btnPause').click();before=await pg.evaluate('({t:__game.S.t,n:__sounds.length})');await pg.wait_for_timeout(1150)
   assert await pg.evaluate('({t:__game.S.t,n:__sounds.length})')==before
   await pg.locator('#btnResume').click();await pg.evaluate("sim(1);check(__sounds.filter(e=>e.name==='thud').length===1,'resumed landing not synchronized')")
   # A missing victim must cancel the queued attack rather than select a replacement.
   await fresh();await down('KeyC','btnGrab');await up('KeyC','btnGrab');await pg.evaluate('sim(.2);__game.updateHUD(true)');await down('KeyZ','btnAct');await up('KeyZ','btnAct')
   await pg.evaluate("()=>{const S=__game.S,g=S.guards[0];S.guards.push({...g,id:112,x:g.x+6});g.state='DEAD';sim(1);check(!S.stats.kills&&!S.corpses.length&&!S.player.attackQueue,'follow-up switches victims');}")
   await fresh();await down('KeyZ','btnAct');await up('KeyZ','btnAct');await pg.evaluate("sim(.2);__game.S.guards[0].fl=1;sim(.02);check(!__game.S.player.killAnim&&!__game.S.guards[0].doomed&&!__game.S.corpses.length,'interrupted pair crosses floors or leaves a frozen victim')")
   # Checkpoint graph preserves phase/victim; released input cannot revive a hold.
   await fresh();await down('KeyZ','btnAct');await pg.evaluate('sim(.2);__game.saveCheckpoint();check(__game.loadCheckpoint(),"save restore");sim(1.2);check(__game.S.corpses.length===1&&__game.S.corpses[0].ko&&!__game.S.stats.kills&&!__game.S.guards[0].doomed,"restored flow loses victim or held state")');await up('KeyZ','btnAct')
   # Actual mobile view: thinner paired outline, with the blue player locator retained.
   await fresh();await down('KeyZ','btnAct');await up('KeyZ','btnAct')
   for t,delta in [('contact',.16),('down',.44),('landing',.36)]:
    await pg.evaluate('(d)=>{sim(d);const G=__game,t=G.S.t;G.updateHUD(true);G.benchDraw(1);G.S.t=t;}',delta)
    await pg.screenshot(path=str(OUT/(('mobile'if mobile else'pc')+'-'+t+'.png')))
   assert not errors,errors;print('PASS combat feel','mobile touch'if mobile else'keyboard',json.dumps(results[-1]),flush=True);await pg.close()
  (OUT/'timing.json').write_text(json.dumps(results,indent=2));await browser.close()

OUT.mkdir(exist_ok=True)
asyncio.run(main())
