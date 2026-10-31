"""No scan entry points; menu access; action-first speech; deferred radio; actual grab."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for width,height,touch in [(1280,800,False),(390,844,True),(360,740,True),(844,390,True)]:
   for ink in [False,True]:
    pg=await b.new_page(viewport={'width':width,'height':height},has_touch=touch)
    errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
    await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats'+('&tone=ink'if ink else''));await pg.wait_for_function('!!__game')
    await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&__game.DLG.modal;i++)__game.advanceDialog();__game.updateHUD(true)")
    assert await pg.locator('#btnScan').count()==0
    assert '살피기' not in await pg.locator('#help').inner_text()
    for key in ['AltLeft','AltRight','Digit4']:
     await pg.keyboard.press(key);assert not await pg.evaluate('__game.input.scan')
    rect=await pg.locator('#btnPause').bounding_box();assert rect and rect['y']<=12 and rect['x']>width-70 and rect['height']>=44,rect
    obj=await pg.locator('#hud .obj').bounding_box();assert obj['x']+obj['width']<=rect['x'] or obj['y']>=rect['y']+rect['height'],(obj,rect)
    await pg.locator('#btnPause').click();assert await pg.locator('#pause').is_visible()
    await pg.locator('#btnResume').click();assert await pg.locator('#pause').is_hidden()
    result=await pg.evaluate('''()=>{
     const G=__game,S=G.S,P=S.player,check=(v,m)=>{if(!v)throw Error(m)};
     Object.assign(P,{x:28.5*48,y:21.5*48,fl:0,z:0,a:0,hide:null,carrying:null,captive:null,cover:null,snap:null,strikeT:0,mode:'walk',moving:false});G.setLayer(0);
     const base=S.guards.find(g=>!g.civ&&!g.dog&&!g.elite&&!g.target),g={...base,id:777,x:P.x+60,y:P.y,fl:0,z:0,a:0,elite:false,civ:false,dog:false,target:false,state:'PATROL',seen:false,meter:0,eyeT:0,icon:null,path:null,hasKey:null,say:'금고 비밀번호는 0417. 사무동으로 가.'};
     S.guards=[g,...[0,1,2].map(i=>({...g,id:778+i,x:P.x-70-i*55,y:P.y+60+i*30,civ:true,say:'잠깐 주변 좀 확인하고 갈게.'}))];
     for(const k of ['props','hides','notes','lamps','doors','ladders','wires','poles','corpses','items','windows','fwindows','bfuses','traps','bushes'])S[k]=[];
     S.vehicles=null;S.camRoom=null;S.facOn=false;S.cams=[];S.fade=0;S.t=10;S.toasts=[];S.alevel=0;G.setZoom(1);for(let i=0;i<160;i++)G.moveCamera(1/60);
     G.toast('반복 안내',3);G.updateHUD(true);check(document.body.classList.contains('actionfocus'),'action focus absent');check(getComputedStyle(document.querySelector('#toasts .toast')).visibility==='hidden','routine toast covers action');
     const ctx=G.ctx,fill=ctx.fillText,texts=[];ctx.fillText=function(t,...a){texts.push(t);return fill.call(this,t,...a)};try{G.benchDraw(1)}finally{ctx.fillText=fill}
     check(texts.includes('붙잡기')&&texts.includes('기절'),'chatter suppresses action labels');check(G.SPEECH_R.length<=1,'too many simultaneous bubbles during action');
     const blocks=G.ACTION_R.concat(G.actorTextBlocks(),G.hudTextBlocks());for(const r of G.SPEECH_R)check(!blocks.some(a=>r.x<a[2]&&r.x+r.w>a[0]&&r.y<a[3]&&r.y+r.h>a[1]),'speech covers action, body or controls');
     G.say([['aide','출입구를 확인해.']],false);G.updateDialog(.2);check(document.querySelector('#dlg').hidden&&G.DLG.cur.t===0,'nonmodal radio covers action or expires while hidden');
     S.guards=[];P.strikeT=0;S.t+=1;G.updateDialog(.2);check(!document.querySelector('#dlg').hidden&&G.DLG.cur.t>0,'deferred radio never resumes');
     G.say([['aide','확인.']],true);G.updateDialog(.2);G.benchDraw(1);check(!document.querySelector('#dlg').hidden&&G.SPEECH_R.length===0,'modal dialogue hides or background speech distracts');for(let i=0;i<60&&G.DLG.cur;i++)G.advanceDialog();
     S.guards=[g];g.say=null;S.toasts=[];G.renderToasts();G.updateHUD(true);check(G.grabAction().k==='grab','grab test fixture invalid');
     return{actionPriority:true,radioResumes:true};
    }''')
    if touch:await pg.locator('#btnGrab').click()
    else:await pg.keyboard.press('KeyC')
    await pg.evaluate('''()=>{const G=__game;for(let i=0;i<90;i++){G.S.t+=1/60;G.updatePlayer(1/60)}if(G.S.player.captive!==G.S.guards[0])throw Error('real grab input failed')}''')
    await pg.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='t0'));for(let i=0;i<60&&G.DLG.cur;i++)G.advanceDialog();const S=G.S,P=S.player,step=G.STAGE.steps[5];if(step[0].includes('살피기')||step[1](S,P,G.input))throw Error('tutorial still requires scan or auto-skips');Object.assign(P,step[2](S));if(!step[1](S,P,G.input))throw Error('approach cannot advance replacement tutorial')}''')
    await pg.wait_for_function('(()=>{const c=document.createElement("canvas");return __game.drawFace(c,__game.speakerOf("hero"))})()',polling=100)
    assert not await pg.evaluate("'__INK_PORTRAITS__' in window")
    assert not errors,errors;print('PASS',width,height,'ink'if ink else'normal',result,flush=True);await pg.close()
  await b.close()
asyncio.run(main())
