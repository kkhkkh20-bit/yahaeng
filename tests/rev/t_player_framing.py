"""Mobile framing and player-only pose outlines keep the controlled actor readable."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for width,height,touch in [(360,740,True),(390,844,True),(844,390,True),(1280,800,False)]:
   pg=await b.new_page(viewport={'width':width,'height':height},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   await pg.wait_for_timeout(300)
   result=await pg.evaluate('''touch=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},start=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();};start();let S=G.S,P=S.player;
    Object.assign(P,{x:28.5*48,y:20.5*48,fl:0,z:0,a:0,moving:false,hidden:false,mode:'walk'});G.setLayer(0);S.guards=[];S.cams=[];S.facOn=false;
    for(const zoom of [.75,1,1.6]){G.setZoom(zoom);for(let n=0;n<360;n++)G.moveCamera(1/60);const y=(P.y-G.cam.y)*G.SCALE+innerHeight/2;if(touch)check(Math.abs(y/innerHeight-(innerHeight>innerWidth*1.3?.6:.56))<.002,'mobile anchor not below centre');else check(Math.abs(y-innerHeight/2)<1,'desktop camera moved');}
    G.setZoom(1);for(let n=0;n<360;n++)G.moveCamera(1/60);
    if(touch){const expected=Math.min(1.25,Math.max(.5,Math.min(innerWidth,innerHeight*1.45)/((innerHeight>innerWidth*1.3?10:16)*48)));check(Math.abs(G.SCALE-expected)<.001,'mobile actor scale regressed');}
    if(touch){
     for(const px of [24,G.MW*48-24]){P.x=px;P.y=24;for(let n=0;n<360;n++)G.moveCamera(1/60);const sx=(P.x-G.cam.x)*G.SCALE+innerWidth/2,sy=(P.y-G.cam.y)*G.SCALE+innerHeight/2,r=[sx-12,sy-40*G.SCALE,sx+12,sy+14];
      for(const selector of ['#hud .top','#stealth','#mini']){const e=document.querySelector(selector),b=e.getBoundingClientRect();check(!(r[0]<b.right&&r[2]>b.left&&r[1]<b.bottom&&r[3]>b.top),'player hidden by HUD at top corner');}
     }P.x=28.5*48;P.y=20.5*48;for(let n=0;n<360;n++)G.moveCamera(1/60);
    }
    const record=()=>{const ctx=G.ctx,draw=ctx.drawImage,calls=[];ctx.drawImage=function(...args){calls.push({args,alpha:this.globalAlpha});return draw.apply(this,args)};try{G.drawPlayer(P)}finally{ctx.drawImage=draw}return calls};
    S.expo=1;P.light=.8;record();let key=G.characterLook(P),body=new Set(G.prVar[key].parts.filter(Boolean)),outline=new Set((G.prVar[key+'_ol']?.parts||[]).filter(Boolean));let calls=record(),own=calls.filter(c=>body.has(c.args[0])),edge=calls.filter(c=>outline.has(c.args[0]));
    check(own.length>0&&own.every(c=>c.alpha>.94),'player body is too transparent');if(touch){check(edge.length>0,'public player outline absent');check(own[0].args.slice(1).every((v,i)=>v===edge[0].args[i+1]),'outline uses a different pose/placement');}
    P.hidden=true;S.expo=0;calls=record();own=calls.filter(c=>body.has(c.args[0]));if(touch)check(own.every(c=>c.alpha>.94),'hidden player loses readable body detail');
    // Genuine grapple must outline the player, not its captive or an idle pose.
    start();S=G.S;P=S.player;Object.assign(P,{x:28.5*48,y:20.5*48,fl:0,z:0,a:0});const g=S.guards.find(g=>!g.civ&&!g.dog&&!g.elite&&!g.target);Object.assign(g,{x:P.x+52,y:P.y,fl:0,z:0,a:0,state:'PATROL',seen:false,meter:0,hasKey:null});S.guards=[g];G.setLayer(0);G.grab(g);for(let i=0;i<90;i++){S.t+=1/60;G.updatePlayer(1/60);G.runTimers()}check(P.captive===g,'grapple fixture failed');S.expo=1;record();
    key=G.characterLook(P);body=new Set(G.prVar[key].parts.filter(Boolean));outline=new Set((G.prVar[key+'_ol']?.parts||[]).filter(Boolean));calls=record();own=calls.filter(c=>body.has(c.args[0]));edge=calls.filter(c=>outline.has(c.args[0]));if(touch)check(own.length&&edge.length&&own[0].args.slice(1).every((v,i)=>v===edge[0].args[i+1]),'grapple outline freezes or drifts');
    // Last-seen feedback retains the location without drawing another hero.
    P.captive=null;P.grabIn=null;P.strikeT=0;S.t+=1;Object.assign(g,{state:'SEARCH',why:'saw',seen:false,eyeWatching:false,poi:{x:P.x-160,y:P.y-80,fl:0,z:0},fl:0,z:0});
    const ctx=G.ctx,draw=ctx.drawImage,images=[];ctx.drawImage=(...a)=>images.push(a);try{G.drawLastSeen()}finally{ctx.drawImage=draw}check(images.length===0,'search feedback duplicates the player model');
    return{lowerAnchor:touch,poseMatches:true,bodyReadable:true,noHeroGhost:true};
   }''',touch)
   assert not errors,errors;print('PASS',width,height,result,flush=True);await pg.close()
  await b.close()
asyncio.run(main())
