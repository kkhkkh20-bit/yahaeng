"""VIP whistle acoustics, lit/dark sight, light cache parity and corpse selection."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch,device_scale_factor=2)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.__idleCallbacks=[];window.requestIdleCallback=cb=>{__idleCallbacks.push(cb);return __idleCallbacks.length};localStorage.clear();window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   await pg.wait_for_timeout(300)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},start=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();};start();
    const pending=G.warmStatus.pending,prepare=__idleCallbacks.shift();check(prepare&&pending>0,'prewarm fixture absent');prepare({didTimeout:true,timeRemaining:()=>0});check(G.warmStatus.pending===pending&&G.warmStatus.deferred>0,'background color work blocks an already busy frame');
    let S=G.S,P=S.player,g=S.guards.find(g=>g.tag==='vipEscort');
    Object.assign(P,{x:26.5*48,y:7.5*48,fl:0,z:0,outfit:'waiter',disguise:'waiter',mode:'walk',light:0});
    Object.assign(g,{x:P.x,y:P.y+80,fl:0,z:0,state:'PATROL',follow:null,a:Math.PI/2,wait:999,seen:false,meter:0});S.guards=[g];S.cams=[];S.facOn=false;G.setLayer(0);const before={x:g.x,y:g.y};
    G.whistle();check(g.state==='SUSPICIOUS'&&g.why==='heard'&&S.noises.at(-1).heard,'nearby VIP guard ignores whistle around open door');
    check(g.poi.x===P.x&&g.poi.y===P.y,'whistle points into random wall');const count=S.stats.whistles;G.whistle();check(S.stats.whistles===count,'cooldown lost');
    for(let i=0;i<120;i++){S.t+=1/60;G.updateGuard(g,1/60)}check(Math.hypot(g.x-before.x,g.y-before.y)>15,'guard hears but never investigates');
    start();S=G.S;P=S.player;g=S.guards.find(g=>!g.civ&&!g.dog&&!g.elite&&!g.target);
    Object.assign(g,{x:4.5*48,y:21.5*48,z:0,fl:0,a:0,torch:false,state:'PATROL',wait:999,seen:false,meter:0});S.guards=[g];S.cams=[];S.facOn=false;G.setLayer(0);S.alevel=0;const grid=G.G0;for(let x=4;x<=16;x++)grid[21][x]='.';
    Object.assign(P,{x:g.x+480,y:g.y,fl:0,z:0,hidden:false,mode:'walk',moving:false});
    check(G.canSee(g,P.x,P.y,1,false,false,0)>0,'lit target invisible at ten tiles');check(G.canSee(g,P.x,P.y,0,false,false,0)===0,'darkness no longer shortens sight');
    check(G.canSee(g,g.x+350,g.y,1,false,true,0)>0,'crouching is invisible in bright area');
    const old=grid[21][10];grid[21][10]='#';check(!G.canSee(g,P.x,P.y,1,false,false,0),'sight through solid wall');grid[21][10]=old;
    S.lamps=[{x:g.x+240,y:g.y,r:1200,fl:0,off:false}];S.t+=1;const lit=G.guardCone(g,G.guardFov(g),G.guardRanges(g));check(lit.rays.some(r=>r.lv[Math.floor(480/lit.STP)]>=1),'drawn cone omits long lit sight');
    S.lamps[0].off=true;S.t+=.2;const dark=G.guardCone(g,G.guardFov(g),G.guardRanges(g));check(dark.rays.every(r=>r.lv.slice(Math.ceil(180/dark.STP)).every(v=>!v)),'cone cache ignores switched light');
    // A wall with no opening blocks acoustic routes, including diagonal corners.
    const saved=[];for(let y=17;y<=25;y++){saved.push([y,grid[y][10]]);grid[y][10]='#';}
    const field=G.soundField(9.5*48,21.5*48,180);check(!field.has(21*G.MW+11),'whistle leaks through uninterrupted wall');saved.forEach(([y,c])=>grid[y][10]=c);
    // Fast torch lookup must retain the brute-force light value on every sample.
    S.lamps=[];S.guards=[g,...[0,1,2].map(i=>({...g,id:900+i,x:300+i*160,y:1000+(i%2)*40,a:0,torch:true}))];
    const brute=(x,y)=>{let value=G.ambientLightAt(x,y,false);for(const q of S.guards){if(!q.torch||['DEAD','CAPTIVE'].includes(q.state)||q.fl)continue;const d=Math.hypot(q.x-x,q.y-y);if(d>210||d<4)continue;const da=Math.atan2(Math.sin(q.a-Math.atan2(y-q.y,x-q.x)),Math.cos(q.a-Math.atan2(y-q.y,x-q.x)));if(Math.abs(da)>.32||!G.los(q.x,q.y,x,y))continue;value=Math.max(value,.85*(1-d/210)+.2)}return value};
    for(let x=310;x<900;x+=35)for(let y=990;y<=1050;y+=20)check(Math.abs(G.lightAt(x,y,false)-brute(x,y))<1e-8,'torch spatial lookup changes detection light');
    start();S=G.S;P=S.player;g=S.guards.find(g=>!g.civ&&!g.dog&&!g.elite&&!g.target);Object.assign(g,{x:28.5*48,y:21.5*48,fl:0,z:0});S.guards=[g];S.corpses=[];S.koNext=true;G.killGuard(g);const c=S.corpses[0];check(c?.ko,'KO fixture invalid');c.x+=120;c.y+=50;c.a=Math.PI/2;c.t0=S.t-2;
    Object.assign(P,{x:c.x-24,y:c.y,fl:0,z:0,carrying:null,captive:null,strikeT:0,killAnim:null,lunge:null});S.t+=1;G.setLayer(0);
    const action=G.attackAction();check(action.k==='finish'&&action.c===c,'finish picks wrong body');const bounds=G.corpseBounds(c),marker=G.actorMarker(action.g,action.c);check(marker.x>g.x+80&&marker.x>bounds[0]&&marker.x<bounds[2]&&marker.y>bounds[1]&&marker.y<bounds[3],'red ring follows old guard position');
    const ctx=G.ctx,ellipse=ctx.ellipse,calls=[];ctx.ellipse=(...a)=>calls.push(a);try{G.drawTargetRing(action.g,'#e8473c',action.c)}finally{ctx.ellipse=ellipse}check(calls.length===1&&calls[0][0]===marker.x&&calls[0][1]===marker.y,'actual corpse ring uses stale position');
    // Opaque roofs must avoid drawing hidden NPC sprites; opening/fading preserves them.
    start();S=G.S;P=S.player;g=S.guards.find(g=>g.tag==='vip');S.guards=[g];S.corpses=[];S.cams=[];S.facOn=false;S.peek=null;P.x=g.x-60;P.y=g.y;P.fl=P.z=0;G.cam.x=g.x;G.cam.y=g.y;G.setLayer(0);G.benchDraw(2);
    const bi=G.bldAt(Math.floor(g.x/48),Math.floor(g.y/48)),roof=G.BLD[bi],parts=new Set(G.prVar[G.characterLook(g)]?.parts.filter(Boolean));check(parts.size>0,'NPC sprite fixture not rendered');
    const drawImage=ctx.drawImage;let spriteDraws=0;ctx.drawImage=function(...args){if(parts.has(args[0]))spriteDraws++;return drawImage.apply(this,args)};
    try{P.x=g.x;P.y=21.5*48;roof.ra=1;check(!G.roofOccludes({...g,yank:true},-1)&&!G.roofOccludes({...g,fly:{}},-1),'active pull/flight animation is culled');G.benchDraw(1);check(spriteDraws===0,'invisible NPC is still painted behind opaque roof');roof.ra=.5;G.benchDraw(1);check(spriteDraws>0,'roof fade loses NPC');spriteDraws=0;P.x=g.x-60;P.y=g.y;G.benchDraw(1);check(spriteDraws>0,'entering building loses visible NPC');}finally{ctx.drawImage=drawImage}
    // Adaptive resolution responds to sustained low fps, not one slow frame.
    start();check(G.DPRinfo()[0]===2,'DPR fixture invalid');G.perfWatch(.15);for(let i=0;i<250;i++)G.perfWatch(1/60);check(G.DPRinfo()[0]===2,'single spike lowers resolution');
    for(let i=0;i<160;i++)G.perfWatch(1/35);check(G.DPRinfo()[0]<2,'sustained lag is ignored');
    return{whistle:true,brightTenTiles:true,darkness:true,wallOcclusion:true,torchParity:true,corpseRing:true,adaptive:true,idleBudget:true,roofCulling:true};
   }''')
   assert not errors,errors;print('PASS','touch'if touch else'desktop',result,flush=True);await pg.close()
  await b.close()
asyncio.run(main())
