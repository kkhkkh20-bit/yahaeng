"""Briefing information hierarchy, contained portraits and discoverable grab input.
Actual key/touch input and full grab transitions; controlled actor placement.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

SCENE='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player,base=S.guards.find(g=>!g.civ&&!g.target&&!g.elite&&!g.dog);
for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
S.vehicles=null;S.camRoom=null;S.facOn=false;S.cams=[];S.toasts=[];S.fade=0;S.t=10;S.keys={};S.koHold=null;
Object.assign(P,{x:28.5*48,y:21.5*48,fl:0,z:0,a:0,captive:null,carrying:null,hide:null,cover:null,snap:null,strikeT:0,killAnim:null,mode:'walk',moving:false});
const g={...base,id:777,x:P.x+140,y:P.y,fl:0,z:0,a:0,elite:false,target:false,dog:false,civ:false,child:false,state:'PATROL',meter:0,icon:null,path:null,route:[{x:P.x+140,y:P.y,pause:999}],wait:999,hasKey:'red'};S.guards=[g];G.setLayer(0);G.setZoom(1.3);for(let i=0;i<160;i++)G.moveCamera(1/60);
window.__texts=[];if(!window.__fillText){window.__fillText=G.ctx.fillText.bind(G.ctx);G.ctx.fillText=function(t,x,y,...args){const m=this.getTransform(),cv=document.querySelector('canvas'),r=cv.getBoundingClientRect();window.__texts.push({text:t,x:(m.a*x+m.c*y+m.e)*r.width/cv.width,y:(m.b*x+m.d*y+m.f)*r.height/cv.height});return window.__fillText(t,x,y,...args)}}
window.__step=n=>{for(let i=0;i<n;i++){S.t+=1/60;G.updatePlayer(1/60);G.updateKoHold();G.runTimers()}};
G.benchDraw(2);G.updateHUD(true);return G.grabAction().reason}'''
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game')
   for id in ['m2','m4','m6']:
    await pg.evaluate("id=>__game.start(__game.STAGES.findIndex(s=>s.id===id),true)",id)
    assert await pg.locator('#brief').is_visible()
    assert not await pg.locator('#brRadio').is_visible()
    assert not await pg.locator('#brCh').is_visible()
    assert await pg.locator('#brTodo li').count() >= 1
    assert not await pg.locator('#brTodo').inner_text() == ''
    assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'briefing horizontal overflow'
    await pg.locator('#brDetails summary').click()
    assert await pg.locator('#brRadio').is_visible(), 'detailed field intel lost'
    assert await pg.locator('#brLine').inner_text()
    await pg.locator('#btnBrGo').click()
    await pg.wait_for_timeout(150)
    for text in ['직원 복장이 필요하다.','직원 얼굴을 아는 경호원은 가까이서 변장을 확인한다. 다른 통로를 찾아라. '*4]:
     await pg.evaluate("t=>{__game.say([['master',t]],true);__game.advanceDialog()}",text)
     await pg.wait_for_timeout(200)
     assert await pg.evaluate('''()=>{const d=document.querySelector('#dlg').getBoundingClientRect(),f=document.querySelector('#dlgFaceBox').getBoundingClientRect(),t=document.querySelector('#dlgText').getBoundingClientRect();return f.top>=d.top&&f.bottom<=d.bottom&&f.left>=d.left&&f.right<t.left&&d.left>=0&&d.right<=innerWidth&&d.top>=0&&d.bottom<=innerHeight}'''), 'portrait detached or dialogue outside viewport'
    await pg.evaluate("__game.say([[{note:'메모'},'사무동 출입번호 0417']],true);__game.advanceDialog()")
    assert not await pg.locator('#dlgFaceBox').is_visible()
   # Resume keeps the actual checkpoint despite the shorter button caption.
   await pg.evaluate(SCENE)
   await pg.evaluate("__game.S.player.hp=2;__game.saveCheckpoint();__game.start(__game.STAGES.findIndex(s=>s.id==='m2'),true)")
   assert await pg.locator('#btnBrCP').is_visible()
   assert (await pg.locator('#btnBrCP').inner_text()).startswith('이어 하기')
   await pg.locator('#btnBrCP').click()
   assert await pg.evaluate('__game.S.player.hp===2&&!__game.DLG.modal'), 'resume button restarts the mission'
   assert await pg.evaluate(SCENE)=='더 가까이'
   assert await pg.locator('#btnGrab').get_attribute('aria-label')=='붙잡기 · 더 가까이'
   assert not await pg.locator('#btnGrab').evaluate("e=>e.classList.contains('ready')")
   await pg.evaluate("()=>{const G=__game,g=G.S.guards[0];g.x=G.S.player.x+60;window.__texts=[];G.benchDraw(3);G.updateHUD(true)}")
   assert await pg.evaluate("__game.grabAction().k==='grab'")
   assert await pg.locator('#btnGrab').evaluate("e=>e.classList.contains('ready')")
   assert await pg.evaluate("__texts.some(t=>t.text==='붙잡기'&&t.x>0&&t.x<innerWidth&&t.y>0&&t.y<innerHeight)"), 'ready grab prompt not drawn onscreen'
   if mobile:
    await pg.locator('#btnGrab').dispatch_event('pointerdown',{'pointerId':77,'pointerType':'touch','button':0,'isPrimary':True})
    await pg.locator('#btnGrab').dispatch_event('pointerup',{'pointerId':77,'pointerType':'touch','button':0,'isPrimary':True})
   else:
    await pg.keyboard.down('c');await pg.keyboard.up('c')
   assert await pg.evaluate('!!__game.S.player.grabIn'), 'real grab input did not start'
   await pg.evaluate('__step(90)')
   assert await pg.evaluate("__game.S.player.captive===__game.S.guards[0]&&__game.S.stats.kills===0&&__game.S.guards[0].state==='CAPTIVE'"), 'grab skipped/treated as kill'
   await pg.evaluate(SCENE)
   for change,reason in [("g.x=P.x+50;g.a=Math.PI",'등 뒤로'),("g.elite=true",'정예 불가'),("g.elite=false;g.state='ALERT';g.seen=true",'교전 중')]:
    await pg.evaluate("()=>{const G=__game,g=G.S.guards[0],P=G.S.player;"+change+";G.updateHUD(true)}")
    assert await pg.evaluate('__game.grabAction().reason')==reason
    assert not await pg.locator('#btnGrab').evaluate("e=>e.classList.contains('ready')")
   await pg.evaluate("__game.S.guards[0].fl=1;__game.updateHUD(true)")
   assert await pg.evaluate('!__game.grabAction().near'), 'other-floor grab hint'
   assert '정예' not in await pg.locator('#btnGrab').inner_text(), 'stale grab reason'
   if not mobile:
    await pg.evaluate(SCENE);await pg.evaluate('__game.S.guards[0].x=__game.S.player.x+50')
    await pg.keyboard.down('w');await pg.keyboard.up('w');await pg.keyboard.down('q');await pg.keyboard.up('q');await pg.evaluate('__step(90)')
    assert await pg.evaluate('!!__game.S.player.captive'), 'WASD grab binding failed'
   assert not errors,errors
   print('PASS presentation and actual grab', 'touch' if mobile else 'keyboard',flush=True)
   await pg.close()
  await b.close()
asyncio.run(main())
