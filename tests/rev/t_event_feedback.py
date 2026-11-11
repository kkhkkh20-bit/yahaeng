"""Presentation regression fixtures, not native completion or device audio proof.
Assert contact/cancellation semantics and UI lifecycle using real existing actions.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/polish-v213';O.mkdir(exist_ok=True)
# Detailed screen text (설정 · 화면 글: 자세히): this test checks the guidance text the minimal default hides.
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch)
   errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('localStorage.clear();localStorage.setItem(`yahaeng.guide`,`full`);requestAnimationFrame=()=>0;window.vibrations=[];Object.defineProperty(navigator,"vibrate",{value:p=>{vibrations.push(p);return true}})')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
   result=await q.evaluate('''()=>{
    const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},out=[];
    const fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;
     Object.assign(P,{x:33*48,y:21*48,fl:0,z:0,mode:'walk',cover:null,strikeT:0,hurtT:0});G.setLayer(0);
     for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
     S.guards=[];S.vehicles=null;S.facOn=false;S.t=10;S.cams=[];G.updateHUD(true);return S;};
    let S=fresh(),P=S.player;
    const tick=t=>{for(let n=0;n<t-1e-6;n+=.01){S.t+=.01;G.updatePlayer(.01)}};
    const c={x:P.x+24,y:P.y,fl:0,z:0,tx:33,ty:21,base:0,a:0,sweep:0,period:12,ph:0,cool:0,meter:0};S.cams=[c];S.cameraEvidence=true;S.stats.camRec=2;
    const cable=()=>G.doAct({k:'camCable',targetObject:c,at:c,label:'전선 분리'});
    cable();tick(.8);S.keys.ArrowRight=true;tick(.01);S.keys.ArrowRight=false;
    ok(!P.interact&&!c.unplugged&&G.evidencePending(),'moving work changed camera/evidence');ok(S.toasts.filter(t=>t.channel==='work').length===1&&S.toasts.some(t=>t.text.includes('이동')),'missing one cancellation reason');ok(!G.feedbackReceipt('camCut'),'cancelled work emitted success');
    cable();tick(2.1);ok(c.unplugged&&S.stats.camRec===2&&G.evidencePending(),'cable erases past recording');ok(G.feedbackReceipt('camCut'),'no cable receipt');G.updateHUD(true);ok(document.querySelector('#actionRiskLbl').textContent.includes('이전 녹화'),'receipt does not explain retained evidence');out.push('movement cancels work without success; cable preserves recorded evidence');
    S.camRoom={x:P.x+24,y:P.y,fl:0,z:0};G.doAct({k:'camroom',at:S.camRoom,label:'감시 정지'});tick(1.5);ok(!S.camsOff&&G.evidencePending(),'terminal commits before advertised work');tick(1);ok(S.camsOff&&!G.evidencePending()&&S.stats.camRec===0&&G.feedbackReceipt('camClear'),'terminal contact does not clear evidence');out.push('terminal commits only at full duration; clears records once');
    S=fresh();P=S.player;P.light=1;S.camRoom={x:P.x+24,y:P.y,fl:0,z:0};const lens={x:P.x+24,y:P.y,fl:0,z:0,tx:33,ty:21,base:Math.PI,a:Math.PI,sweep:0,period:12,ph:0,cool:0,meter:.99};S.cams=[lens];G.doAct({k:'camCable',targetObject:lens,at:lens,label:'전선 분리'});G.updateCams(.02);ok(lens.recordUntil>S.t&&lens.recordReason==='수상한 작업'&&G.feedbackReceipt('record')&&S.stats.camRec===1&&G.evidencePending(),'real CCTV recording lacks synchronized REC/cause');G.cancelWork(P,'검사 중단');out.push('actual witnessed work produces REC and its exact recording cause');
    S=fresh();P=S.player;const hp=P.hp;G.hurt('회귀 검사',{x:P.x+80,y:P.y});G.updateHUD(true);ok(P.hp===hp-1&&S.flash>0&&P.damageFeedback?.angle===0,'hurt loses direction or red damage signal');ok(document.querySelectorAll('#hpPips .lost').length===1,'lost pip missing');G.hurt('중복');ok(P.hp===hp-1,'feedback changed invulnerability');S.t+=.5;G.updateHUD(true);ok(!document.querySelector('#hpPips .lost'),'lost pip persists');out.push('one lost pip, direction, unchanged two-second invulnerability');
    S=fresh();P=S.player;const guard={...G.STAGES.find(s=>s.id==='p0').guards[0],x:P.x+28,y:P.y,fl:0,z:0,id:501,ch:'g1',state:'PATROL',route:[],a:0,health:1};S.guards=[guard];S.flash=0;G.killGuard(guard,'regression');ok(S.flash===0&&G.feedbackReceipt('kill'),'kill shares damage flash or lacks contact');ok(vibrations.length===0,'haptics default on');out.push('kill has local contact and no player damage overlay; haptic default off');
    const calm={...guard,state:'SEARCH',seen:false,relight:{},known:false,tag:null,id:502};ok(G.guardTaskCue(calm)==='light','relight uses suspicion cue');calm.seen=true;ok(G.guardTaskCue(calm)===null,'light cue hides player detection');calm.seen=false;calm.state='ALERT';ok(G.guardTaskCue(calm)===null,'task cue hides alert');out.push('task cue yields to actual detection');
    const btn=document.querySelector('#btnCarry');G.padButton(btn,'carryH',{k:'none'},'행동');ok(btn.getAttribute('aria-disabled')==='true','unavailable control not announced');G.padButton(btn,'carryH',{k:'none',busy:true,label:'작업 중'},'행동');ok(btn.getAttribute('aria-busy')==='true'&&btn.getAttribute('aria-disabled')==='false'&&!btn.disabled,'buffered action disabled');out.push('unavailable and busy input remain distinguishable');
    S=fresh();P=S.player;P.hp=1;G.hurt('치명상');ok(S.over&&P.defeat&&G.drawDefeatFeedback(P),'death stays standing');out.push('lethal damage starts existing death pose');return out;
   }''')
   # A real UI result sequence with RAF held: completion is visible before training.
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p0'));window.resultBudget=G.skillBudget();G.S.over=true;G.showEnd(true);}''')
   assert await q.locator('#end').is_visible()
   assert await q.locator('#skillScreen').is_hidden()
   assert '+1P' in await q.locator('#endSkills').inner_text()
   await q.screenshot(path=str(O/f'completion-{touch}.png'))
   await q.locator('#skillScreen').wait_for(state='visible')
   assert await q.evaluate('__game.skillBudget()===resultBudget+1')
   # Starting another stage invalidates the captured result timer.
   await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='p1'));G.S.over=true;G.showEnd(true);G.start(G.STAGES.findIndex(s=>s.id==='p2'));}''')
   await q.wait_for_timeout(1000)
   assert await q.locator('#skillScreen').is_hidden()
   assert await q.evaluate('__game.STAGE.id==="p2"&&!__game.S.over')
   await q.emulate_media(reduced_motion='reduce')
   await q.evaluate('''()=>{const G=__game;G.S.player.hp=1;G.hurt('축소 모션');if(!G.drawDefeatFeedback(G.S.player))throw Error('reduced death pose missing');}''')
   await q.evaluate('''()=>{localStorage.setItem('yahaeng.haptic','1');vibrations.length=0;__game.hapticFeedback('kill');__game.hapticFeedback('hurt');}''')
   assert await q.evaluate('vibrations.length')==(1 if touch else 0)
   assert not errors,errors
   rows.append({'touch':touch,'checks':result+['completion visible before automatic training; +1P once; stale transition cancelled; reduced death fallback']})
   await q.close()
  await b.close()
 (O/'feedback-regression.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('PASS event feedback',rows)
asyncio.run(main())
