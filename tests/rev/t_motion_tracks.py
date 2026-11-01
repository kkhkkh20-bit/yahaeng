"""Continuous manipulation/handling, planted roots, physical-distance gait, and white speech contrast."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!window.__game',polling=100)
   lazy=await pg.evaluate('__game.motionBodies');assert 'oldMotion' not in lazy and len(lazy)<=3,lazy
   await pg.evaluate("async()=>{const G=__game;await Promise.all(Object.keys(G.PR.bodies).filter(n=>n.endsWith('Motion')).map(n=>G.prLoadBody(n)));}")
   r=await pg.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,base=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.guards=[];S.cams=[];S.facOn=false;S.fade=0;G.setLayer(0);Object.assign(P,{x:28.5*48,y:21.5*48,z:0,fl:0,a:0});
    // The same animation has a complete reach/release for short work and sustained manipulation for longer work.
    let handTracks=0;for(const pose of ['ground','hands','dress'])for(const dur of [.42,.65,2.6]){const frames=[];for(let i=0;i<=100;i++){const q=G.actionHandPose({pose,dur,t:dur*i/100});check(q.anim===(pose==='hands'?'openHigh':'openLow'),'wrong working posture');frames.push(q.frame);}check(frames[0]===0&&frames.at(-1)===16&&new Set(frames).size>=10,'working pose snaps or never releases');handTracks++;}
    const ctx=G.ctx,draw=ctx.drawImage,ids=new Map(),vaultFrames=new Set();ctx.drawImage=function(...a){if(!ids.has(a[0]))ids.set(a[0],ids.size);vaultFrames.add(ids.get(a[0])+':'+a[1]);return draw.apply(this,a)};try{for(let i=0;i<=16;i++)G.drawVaultPR(G.characterLook(P),P.x,P.y,0,i/16);}finally{ctx.drawImage=draw;}check(vaultFrames.size===17,'window vault still has only three poses');
    const body={...base,id:987,x:P.x+28,y:P.y,a:0,z:0,fl:0,state:'DEAD',ch:G.characterLook(base),g:base,carried:false,stashed:false,ko:true};S.corpses=[body];G.actCarry({k:'carry',c:body});check(P.bodyAnim&&P.carrying===body,'actual lift not started');const A=P.bodyAnim,from={x:P.x,y:P.y};let last=null,samples=0;const frames=new Set();
    for(let n=0;n<=110;n++){const h=G.handlingSample(P,A);check(Number.isFinite(h.x)&&Number.isFinite(h.y),'nonfinite handling');if(last)check(Math.hypot(h.x-last.x,h.y-last.y)<2,'handled body teleports');check(P.x===from.x&&P.y===from.y,'lifting drags planted feet');frames.add(h.frame);last=h;G.drawHandling(P,A);S.t+=.005;G.updatePlayer(.005);samples++;}check(frames.size>=24,'handling skips intermediate frames');
    P.bodyAnim=null;P.strikeT=0;G.actCarry({k:'carry'});check(P.bodyAnim?.k==='drop'&&!P.carrying,'drop absent');const D=P.bodyAnim;check(G.handlingSample(P,D).frame===24,'lowering starts at wrong posture');for(let n=0;n<100;n++){S.t+=.005;G.updatePlayer(.005);}check(G.handlingSample(P,D).frame===0,'lowering does not finish at ground');P.bodyAnim=null;P.strikeT=0;
    // Approaching a grapple previously slid in idle because travelSpeed stayed zero.
    const g={...base,id:988,x:P.x+70,y:P.y,z:0,fl:0,a:0,state:'PATROL',seen:false,meter:0};S.guards=[g];P.travelSpeed=0;const gt=P.gaitTime||0;G.grab(g);S.t+=.02;G.updatePlayer(.02);check(P.travelSpeed>6&&P.gaitTime>gt&&P.moving,'approach slides without a stride');P.grabIn=null;P.captive=null;g.doomed=false;
    // Actual path travel shares gait time and holds it when the actor does not move.
    P.travelSpeed=0;const at=P.gaitTime;G.startTrav({pts:[{x:P.x,y:P.y,f:0},{x:P.x+30,y:P.y,f:1}],dur:.4,phases:[{to:1,pose:'walk'}]});S.t+=.02;G.updatePlayer(.02);check(P.gaitTime>at&&P.travelSpeed>6,'automatic travel has a separate frozen clock');P.trav=null;S.keys={};G.input.joy=null;G.updatePlayer(.02);const idle=P.gaitTime;G.updatePlayer(.02);check(P.gaitTime===idle,'idle feet keep walking');
    Object.assign(g,{x:P.x+24,y:P.y,fl:0,z:0,state:'CAPTIVE',say:'비밀번호는 2580이야.',sayT:3,replyUntil:S.t+3});P.captive=g;G.setZoom(1);for(let i=0;i<100;i++)G.moveCamera(.02);G.updateHUD(true);G.benchDraw(1);const r=G.SPEECH_R[0];check(r?.speaker===g,'interrogation speech hidden');const x=Math.round((r.x+15/G.SCALE-G.cam.x)*G.SCALE+innerWidth/2),y=Math.round((r.y+5/G.SCALE-G.cam.y)*G.SCALE+innerHeight/2),color=Array.from(G.ctx.getImageData(x,y,1,1).data);check(color.slice(0,3).every(v=>v>235),'speech background is not white '+color);return{handTracks,vaultFrames:vaultFrames.size,handlingSamples:samples,handlingFrames:frames.size,approachGait:true,traverseGait:true,whiteBubble:color};}''');assert not errors,errors;print('PASS motion tracks',touch,json.dumps(r),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
