"""Real keyboard/touch hold confirmation for ledge kills, with no skipped fall."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
SETUP='''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target);S.guards=[];S.cams=[];S.facOn=false;G.update(.001);S.fade=0;G.setLayer(0);
 let edge=null;for(let y=2;y<G.MH-2&&!edge;y++)for(let x=2;x<G.MW-2&&!edge;x++){const z=G.rLv(x,y);if(!z||G.robAt(x,y)||G.rLv(x,y+1)>=z)continue;const px=x*48+24,py=y*48+42;if(G.landBelow(px,py,{x:0,y:1},z)){edge={x:px,y:py,z};break;}}
 if(!edge)throw Error('no ledge');Object.assign(P,edge,{fl:0,ledge:{x:0,y:1},ledgeLock:true,a:-Math.PI/2});Object.assign(g,{x:P.x,y:P.y-20,z:P.z,fl:0,a:-Math.PI/2,state:'PATROL',doomed:false,climb:null,child:false,civ:false,dog:false,still:true,sched:null,wander:null,path:null,task:null,wait:999,route:[{x:P.x,y:P.y-20,pause:999}],ri:0});S.guards=[g];window.__victim=g;window.__edge=edge;G.setZoom(1);for(let i=0;i<180;i++)G.moveCamera(1/60);G.updateHUD(true);__step(2);}'''
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mode in ['arrows','wasd','touch']:
   mobile=mode=='touch';pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script("localStorage.clear();(()=>{let q=[],t=1000;window.requestAnimationFrame=f=>q.push(f);window.__step=n=>{for(let i=0;i<n;i++){t+=16.7;const a=q;q=[];a.forEach(f=>f(t))}}})()")
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100);await pg.evaluate(SETUP)
   key='Space'if mode=='wasd'else'KeyZ';cdp=await pg.context.new_cdp_session(pg)
   async def down():
    if mobile:
     r=await pg.locator('#btnAct').bounding_box();await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':1}]})
    else:await pg.keyboard.down(key)
   async def up():
    if mobile:await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:await pg.keyboard.up(key)
   text=await pg.locator('#btnAct').inner_text();assert '끌어내리기' in text,text
   await down();await pg.evaluate('__step(20)');await up();await pg.evaluate('__step(25)');assert await pg.evaluate('__game.S.stats.kills===0&&!__game.S.ledgePull&&__game.S.player.ledge')
   await down();await pg.evaluate('__step(40)');assert await pg.evaluate("+document.querySelector('#btnAct').style.getPropertyValue('--hold')>0")
   await pg.evaluate('__step(35)');assert await pg.evaluate("!!__game.S.ledgePull&&__victim.state!=='DEAD'&&__game.S.corpses.length===0")
   await up();await pg.evaluate('__step(90)');assert await pg.evaluate("__game.S.stats.kills===1&&__game.S.corpses.length===1&&__victim.state==='DEAD'&&!__game.S.ledgePull&&__game.S.player.ledge&&__game.S.player.z===__edge.z")
   assert not errors,errors;print('PASS',mode,'tap cancels, hold progress, catch before death, one impact result, player remains hanging',flush=True);await pg.close()
  await b.close()
asyncio.run(main())
