"""Storage geometry, delayed results, tap/hold intent and safe container exits."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   result=await pg.evaluate('''()=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let entries=0,stores=0,drags=0,ambushes=0;const sides=new Set();
    const fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S;window.template=S.guards.find(g=>!g.civ&&!g.dog&&!g.child&&!g.target);S.guards=[];S.cams=[];S.facOn=false;G.update(.001);S.fade=0;G.setLayer(0);return S;};
    const step=dt=>{G.S.t+=dt;G.setLayer(G.S.player.fl||0);G.updatePlayer(dt);G.updateKoHold();G.runTimers();};
    const finish=()=>{let i=0,max=0;while(G.S.player.trav&&i++<1000){const P=G.S.player,x=P.x,y=P.y;step(.01);max=Math.max(max,Math.hypot(P.x-x,P.y-y));}check(i<1000,'container motion never finishes');check(max<9,'container motion teleports '+max);};
    const place=(P,x,y)=>{Object.assign(P,{x,y,fl:0,z:0,hide:null,trav:null,jump:null,cover:null,snap:null,captive:null,carrying:null,strikeT:0,bodyAnim:null,pick:null,interact:null,a:-Math.PI/2});G.setLayer(0);};
    for(const id of ['m1','m2','m3','m4','m5','m6']){
     const S=fresh(id),P=S.player;
     for(const h of S.hides.filter(h=>['box','well'].includes(h.type))){
      const approaches=[[0,1],[-1,0],[1,0],[0,-1]].filter(([nx,ny])=>!G.solidAt(h.tx+nx,h.ty+ny));
      for(const [nx,ny]of approaches){
       place(P,h.x+nx*48,h.y+ny*48);h.bodies=0;const x=P.x,y=P.y;G.doAct({k:'hide',h});const T=P.trav;
       check(T?.hideFlow?.h===h&&!P.hide&&P.x===x&&P.y===y,id+' skips entry approach');step(.04);
       G.actEnv();G.actGrab();G.actAttack();check(P.trav===T,id+' repeat input replaces entry');
       let opened=false,peak=0;while(P.trav){opened=opened||G.hideFlowOpen(P.trav)>.9;const a=P.x,b=P.y;step(.01);peak=Math.max(peak,Math.hypot(P.x-a,P.y-b));}
       check(opened&&peak<9&&P.hide===h,id+' entry skips lid or body transfer');check(G.hideSpace(h,0),id+' storage overflows');
       G.leaveHide({x:nx,y:ny});check(P.trav?.hideFlow?.kind==='exit'&&P.hide===h,id+' exit skips emergence');finish();
       check(!P.hide&&!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48)),id+' exit lands inside obstacle');entries++;sides.add(nx+','+ny);
      }
     }
    }
    for(const type of ['box','well']){
     const S=fresh('m2'),P=S.player,h=S.hides.find(h=>h.type===type&&!G.solidAt(h.tx,h.ty+1));place(P,h.x,h.y+48);h.bodies=0;
     const c={x:P.x+12,y:P.y,fl:0,z:0,ch:'sam',ko:true,carried:true,stashed:false};S.corpses=[c];P.carrying=c;
     G.actCarry({k:'carry',c,h});const T=P.trav;check(T?.hideFlow?.kind==='stash'&&P.carrying===c&&!c.stashed&&h.bodies===0,'body storage commits on input');
     for(let i=0;i<20;i++)step(.01);G.actEnv();G.actAttack();check(P.trav===T&&!c.stashed,'body storage skips contact');finish();
     check(c.stashed&&!c.carried&&!P.carrying&&c.container===h&&c.x===h.x&&c.y===h.y&&h.bodies===1&&S.stats.stashed===1,'body transfer loses position or commits twice');stores++;
     G.doAct({k:'hide',h});finish();check(P.hide===h,'cannot share container with one stored body');G.leaveHide({x:0,y:1});finish();
     if(type==='box'){
      h.bodies=h.cap;const x=P.x,y=P.y;G.doAct({k:'hide',h});check(!P.trav&&!P.hide&&P.x===x&&P.y===y,'full container accepts another person');
      c.carried=true;c.stashed=false;P.carrying=c;G.actCarry({k:'carry',c,h});check(!P.trav&&P.carrying===c&&c.carried,'full container unexpectedly drops carried person');P.carrying=null;
     }
     const ctx=G.ctx,state=()=>JSON.stringify([ctx.globalAlpha,ctx.getTransform(),ctx.lineWidth,ctx.strokeStyle,ctx.fillStyle]);const before=state();G.drawContainer(h);check(state()===before,'container leaks canvas state');
    }
    for(const held of [false,true,'different']){
     const S=fresh('m2'),P=S.player,h=S.hides.find(h=>h.type==='box'&&!G.solidAt(h.tx,h.ty+1));place(P,h.x,h.y+48);h.bodies=0;
     const g={...template,x:P.x,y:P.y-10,a:-Math.PI/2,fl:0,z:0,state:'CAPTIVE',target:true,hasKey:null,captT:1};S.guards=[g];P.captive=g;
     S.keys.KeyX=true;G.combatPress('KeyX');G.actEnv();const T=P.trav;check(T?.hideFlow?.kind==='drag'&&g.state==='CAPTIVE'&&!P.hide&&h.bodies===0,'drag commits before enemy enters');
     for(let i=0;i<8;i++)step(.01);if(held!==true){S.keys.KeyX=false;G.combatRelease('KeyX');if(held==='different'){S.keys.KeyZ=true;G.combatPress('KeyZ');}}
     G.actAttack();G.actEnv();check(P.trav===T,'another input replaces paired entry');finish();S.keys.KeyX=false;G.combatRelease('KeyX');S.keys.KeyZ=false;G.combatRelease('KeyZ');
     const c=S.corpses.at(-1);check(c&&!!c.ko===(held!==true)&&S.stats.kills===(held===true?1:0),'container violates tap/hold source intent');
     check(P.hide===h&&c.container===h&&c.x===h.x&&c.y===h.y&&h.bodies===1&&!g.containerMoving&&!g.doomed,'paired entry loses actor or storage identity');drags++;
    }
    for(const type of ['box','well'])for(const held of [false,true]){
     const S=fresh('m2'),P=S.player,h=S.hides.find(h=>h.type===type&&!G.solidAt(h.tx,h.ty+1));place(P,h.x,h.y+48);G.doAct({k:'hide',h});finish();
     const g={...template,x:h.x,y:h.y+40,a:-Math.PI/2,fl:0,z:0,state:'PATROL',seen:false,target:true,hasKey:null};S.guards=[g];S.keys.KeyZ=true;G.combatPress('KeyZ');G.doAct({k:'ambush',g});check(S.amb&&g.yank&&S.corpses.length===0,'ambush skips pull');
     for(let i=0;i<8;i++)G.update(.01);if(!held){S.keys.KeyZ=false;G.combatRelease('KeyZ');}
     const ctx=G.ctx,scale=ctx.scale;let shrinking=0;ctx.scale=(...a)=>{shrinking++;return scale.apply(ctx,a);};try{G.drawHideFlowVisual();}finally{ctx.scale=scale;}check(shrinking===0,'victim shrinks into container');
     for(let i=0;i<150;i++)G.update(.01);S.keys.KeyZ=false;G.combatRelease('KeyZ');const c=S.corpses.at(-1);
     check(!S.amb&&!g.yank&&c&&!!c.ko===!held&&S.stats.kills===(held?1:0)&&c.container===h&&c.x===h.x&&c.y===h.y,'ambush loses source intent or body location');ambushes++;
    }
    // A witness who saw the approach must not be forgotten by the time the lid closes.
    {const S=fresh('m2'),P=S.player,h=S.hides.find(h=>h.type==='box'&&!G.solidAt(h.tx,h.ty+1));place(P,h.x,h.y+48);const watcher={...template,seen:true,state:'PATROL',x:P.x+150,y:P.y,fl:0,z:0};S.guards=[watcher];G.doAct({k:'hide',h});step(.05);watcher.seen=false;finish();check(h.spotted,'entry forgets a witness before final commit');}
    {const S=fresh('m2'),P=S.player,h=S.hides.find(h=>h.type==='box'&&!G.solidAt(h.tx,h.ty+1));place(P,h.x,h.y+48);G.doAct({k:'hide',h});finish();
     const cells=[];for(let y=h.ty-1;y<=h.ty+1;y++)for(let x=h.tx-1;x<=h.tx+1;x++)if(x!==h.tx||y!==h.ty){cells.push([x,y,G.G0[y][x]]);G.G0[y][x]='#';}
     try{G.leaveHide({x:0,y:1});check(P.hide===h&&!P.trav,'blocked exit erases hiding state');}finally{for(const[x,y,c]of cells)G.G0[y][x]=c;}
    }
    {fresh('m2');G.drawHideFixtures();const create=document.createElement;let canvases=0;document.createElement=function(tag,...a){if(tag==='canvas')canvases++;return create.call(this,tag,...a);};try{for(let i=0;i<100;i++)G.drawHideFixtures();}finally{document.createElement=create;}check(canvases===0,'static containers allocate a new image every frame');}
    check(entries>60&&sides.size===4,'insufficient mission approach coverage');return{entries,stores,drags,ambushes,sides:[...sides]};
   }''')
   assert not errors,errors;print('PASS','touch'if touch else'PC',result,flush=True);await pg.close()
  for touch in [False,True]:
   ui=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];ui.on('pageerror',lambda e:errors.append(str(e)))
   await ui.add_init_script("localStorage.clear();(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()")
   await ui.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await ui.wait_for_function('!!__game',polling=100)
   await ui.evaluate("""()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.facOn=false;G.update(.001);window.__bin=S.hides.find(h=>h.type==='box'&&h.ty>5&&!G.solidAt(h.tx,h.ty+1));Object.assign(P,{x:__bin.x,y:__bin.y+48,fl:0,z:0,a:-Math.PI/2});G.setZoom(1);for(let i=0;i<180;i++)G.moveCamera(1/60);__step(2)}""")
   assert '숨기' in await ui.locator('#btnCarry').inner_text()
   if touch:await ui.locator('#btnCarry').tap()
   else:await ui.keyboard.press('KeyX')
   await ui.evaluate('__step(20)');assert await ui.evaluate("__game.S.player.trav?.hideFlow?.kind==='enter'&&!__game.S.player.hide")
   await ui.evaluate('__step(100)');assert await ui.evaluate('__game.S.player.hide===__bin')
   await ui.keyboard.down('ArrowDown');await ui.evaluate('__step(2)');await ui.keyboard.up('ArrowDown');assert await ui.evaluate("__game.S.player.trav?.hideFlow?.kind==='exit'")
   await ui.evaluate('__step(120)');assert await ui.evaluate('!__game.S.player.hide&&!__game.S.player.trav')
   await ui.evaluate("""()=>{const G=__game,P=G.S.player;Object.assign(P,{x:__bin.x,y:__bin.y+48,a:-Math.PI/2});const c={x:P.x,y:P.y,fl:0,z:0,ch:'sam',ko:true,carried:true,stashed:false};G.S.corpses=[c];P.carrying=c;window.__body=c;__step(2)}""")
   assert '기절자 넣기' in await ui.locator('#btnCarry').inner_text()
   if touch:await ui.locator('#btnCarry').tap()
   else:await ui.keyboard.press('KeyX')
   await ui.evaluate('__step(20)');assert await ui.evaluate('!__body.stashed&&__game.S.player.carrying===__body')
   await ui.evaluate('__step(100)');assert await ui.evaluate('__body.stashed&&__body.container===__bin&&!__game.S.player.carrying')
   assert not errors,errors;print('PASS actual', 'touch'if touch else'keyboard','entry, directional exit, subject-specific storage label and delayed storage',flush=True);await ui.close()
  await b.close()
asyncio.run(main())
