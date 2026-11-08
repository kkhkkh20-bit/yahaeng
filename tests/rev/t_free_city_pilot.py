"""Official free art renders in the pilot, leaves gameplay state intact, and stays out of later stages."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('''localStorage.clear();requestAnimationFrame=()=>0;window.__gkDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...a){if(im?.src&&im.src===window.__ASSETS__?.freeCity?.src)window.__gkDraws.push(a.slice(0,4));return draw.call(this,im,...a)};''')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.wait_for_timeout(500)
   result=await q.evaluate('''()=>{const G=__game,S=G.S,art=window.__ASSETS__.freeCity,ok=(v,m)=>{if(!v)throw Error(m)};
    ok(G.STAGE.freeCityPilot&&G.STAGE.id==='tB','wrong pilot stage');ok(G.STAGES.filter(s=>s.freeCityPilot).length===1,'pilot silently replaces later environments');
    const logical=()=>JSON.stringify({p:[S.player.x,S.player.y,S.player.hp,S.player.fl,S.player.outfit],guards:S.guards.map(g=>[g.x,g.y,g.fl,g.state,g.target]),doors:S.doors.map(d=>[d.x,d.y,d.locked,d.open]),lamps:S.lamps.map(l=>[l.x,l.y,l.fl,l.off]),stats:S.stats,items:S.items.map(i=>i.got),solid:G.G0.map((r,y)=>r.map((v,x)=>G.solidAt(x,y)))});
    const before=logical();S.fade=0;G.moveCamera(1);G.updateHUD(true);G.benchDraw(3);ok(before===logical(),'drawing changes collision, actors, light switches or progress');
    const used=new Set(window.__gkDraws.map(a=>a.join(',')));for(const f of Object.values(art.frames))ok(used.has(f.rect.join(',')),'selected sprite never reaches canvas '+f.rect);
    ok(Object.values(art.frames).length===5&&art.source.includes('free-japanese-city-game-assets'),'unexpected source/unused subset');ok(!/undefined/.test(document.getElementById('episodeRadioText').textContent),'art boot broke guidance');
    // The new canopy is ordinary lit world art, not a permanently bright overlay.
    G.cam.x=336;G.cam.y=360;G.benchDraw(1);
    const sample=()=>{const c=G.ctx.canvas,k=c.width/innerWidth,x=Math.round(((288-G.cam.x)*G.SCALE+innerWidth/2)*k),y=Math.round(((262-G.cam.y)*G.SCALE+innerHeight/2)*k),d=G.ctx.getImageData(x,y,4,4).data;return [...d].reduce((n,v,i)=>n+(i%4<3?v:0),0)/48;};
    const lit=sample();for(const l of S.lamps)if(l.outdoor)G.setLampCircuit(l,true);for(const b of G.BLD)b.fl=null;S.t+=.4;G.benchDraw(2);const dark=sample();ok(dark<lit*.85,'pilot art ignores actual switched lights '+JSON.stringify({lit,dark}));
    window.__gkDraws=[];G.start(G.STAGES.findIndex(s=>s.id==='p0'));while(G.DLG.modal)G.advanceDialog();G.moveCamera(1);G.benchDraw(3);ok(!window.__gkDraws.length,'pilot textures leak into the next mission');
    return{used:used.size,gameplayUnchanged:true,pilotOnly:true,lighting:{lit,dark},source:art.source};}''')
   assert not errors,errors;print('PASS free-city pilot',w,h,json.dumps(result),flush=True);await q.close()
  await b.close()
asyncio.run(main())
