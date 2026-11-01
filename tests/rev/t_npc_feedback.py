"""Interrogation must remain audible/visible during capture and chase, with an actual speech tail."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for width,height,touch in [(1280,800,False),(390,844,True),(360,740,True),(844,390,True)]:
   pg=await b.new_page(viewport={'width':width,'height':height},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!window.__game',polling=100)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let replies=0,automatic=0,tails=0;
    for(const id of ['m1','m2','m3','m4','m5','m6'])for(const auto of [false,true]){
     G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.setLayer(0);const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);
     let tile=null;for(let y=2;y<G.MH-2&&!tile;y++)for(let x=2;x<G.MW-2&&!tile;x++)if([-1,0,1].every(dy=>[-1,0,1].every(dx=>!G.solidAt(x+dx,y+dy))))tile={x:x*48+24,y:y*48+24};check(tile,'road fixture missing');
     Object.assign(P,{...tile,a:0,z:0,fl:0,strikeT:0,captive:null,carrying:null});Object.assign(g,{x:P.x+24,y:P.y,a:0,z:0,fl:0,state:'PATROL',questioned:false,seen:false,elite:false});S.guards=[g];S.cams=[];S.facOn=false;S.fade=0;
     G.grab(g);for(let i=0;P.grabIn&&i<200;i++){S.t+=.01;G.updatePlayer(.01);}check(P.captive===g,'real capture did not finish');
     if(auto){for(let i=0;i<120;i++){S.t+=.01;G.updatePlayer(.01);}automatic++;}else G.actGrab();
     check(g.questioned&&g.say&&S.stats.interro===1,'interrogation produced no reply');check(G.visibleSpeechCandidates(P,false,true).includes(g),'action focus hides captive reply');check(G.visibleSpeechCandidates(P,true,true).includes(g),'chase hides captive reply');
     P.say='알았어.';P.sayT=3;const alert={...g,id:987,state:'ALERT',x:P.x+110,y:P.y+40,say:'찾았다!',replyUntil:0,seen:true};S.guards.push(alert);
     G.setZoom(1);for(let i=0;i<100;i++)G.moveCamera(.016);G.updateHUD(true);G.benchDraw(1);
     // Inspect the rendered dialogue path as well as candidate eligibility.
     G.SPEECH_R.length=0;const ctx=G.ctx,round=ctx.roundRect,line=ctx.lineTo;let corners=0,segments=0;ctx.roundRect=function(...a){corners++;return round.apply(this,a)};ctx.lineTo=function(...a){segments++;return line.apply(this,a)};
     try{G.drawSpeech();}finally{ctx.roundRect=round;ctx.lineTo=line;}
     check(G.SPEECH_R.length===1&&G.SPEECH_R[0].speaker===g,'reply loses to chatter or cannot be placed '+JSON.stringify({id,auto,w:innerWidth,h:innerHeight,rects:G.SPEECH_R}));check(corners===1&&segments>=4,'dialogue has no rounded bubble/tail');tails++;
     const r=G.SPEECH_R[0],blocks=G.ACTION_R.concat(G.actorTextBlocks(),G.hudTextBlocks());check(!blocks.some(a=>r.x<a[2]&&r.x+r.w>a[0]&&r.y<a[3]&&r.y+r.h>a[1]),'reply covers actor or controls');
     G.actGrab();check(S.stats.interro===1,'repeated input duplicates interrogation');
     for(let i=0;i<160;i++){S.t+=.01;G.runTimers();}check(S.learned.length>0,'visible reply grants no intel');replies++;
    }return{replies,automatic,bubbleTails:tails};
   }''');assert not errors,errors;print('PASS NPC reply',width,height,json.dumps(result),flush=True);await pg.close()
  await b.close()
asyncio.run(main())
