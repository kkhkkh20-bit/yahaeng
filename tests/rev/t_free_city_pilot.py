"""Official free art renders in the pilot, leaves gameplay state intact, and preserves opaque roofs as the exterior set extends to freight missions."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('''localStorage.clear();requestAnimationFrame=()=>0;window.__gkDraws=[];const derived=new WeakMap(),patterns=new WeakMap(),proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,pattern=proto.createPattern,fill=proto.fillRect;
    proto.drawImage=function(im,...a){const key=im?.src&&im.src===window.__ASSETS__?.freeCity?.src?a.slice(0,4):derived.get(im);if(key){window.__gkDraws.push(key);derived.set(this.canvas,key);}return draw.call(this,im,...a)};
    proto.createPattern=function(im,...a){const p=pattern.call(this,im,...a),key=derived.get(im);if(p&&key)patterns.set(p,key);return p};
    proto.fillRect=function(...a){const key=patterns.get(this.fillStyle);if(key)window.__gkDraws.push(key);return fill.apply(this,a)};''')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.wait_for_timeout(500)
   result=await q.evaluate('''()=>{const G=__game,S=G.S,art=window.__ASSETS__.freeCity,ok=(v,m)=>{if(!v)throw Error(m)};
    ok(G.STAGE.freeCityPilot&&G.STAGE.id==='tB','wrong pilot stage');ok(G.STAGES.filter(s=>s.freeCityPilot).length===1,'pilot silently replaces later environments');
    const logical=()=>JSON.stringify({p:[S.player.x,S.player.y,S.player.hp,S.player.fl,S.player.outfit],guards:S.guards.map(g=>[g.x,g.y,g.fl,g.state,g.target]),doors:S.doors.map(d=>[d.x,d.y,d.locked,d.open]),lamps:S.lamps.map(l=>[l.x,l.y,l.fl,l.off]),stats:S.stats,items:S.items.map(i=>i.got),solid:G.G0.map((r,y)=>r.map((v,x)=>G.solidAt(x,y)))});
    const before=logical();S.fade=0;G.moveCamera(1);G.updateHUD(true);G.benchDraw(3);ok(before===logical(),'drawing changes collision, actors, light switches or progress');
    const used=new Set(window.__gkDraws.map(a=>a.join(',')));for(const f of Object.values(art.frames))ok(used.has(f.rect.join(',')),'selected sprite never reaches canvas '+f.rect);
    ok(Object.values(art.frames).length===7&&art.source.includes('free-japanese-city-game-assets'),'unexpected source/unused subset');ok(!/undefined/.test(document.getElementById('episodeRadioText').textContent),'art boot broke guidance');
    // The new canopy is ordinary lit world art, not a permanently bright overlay.
    G.cam.x=336;G.cam.y=360;G.benchDraw(1);
    const sample=()=>{const c=G.ctx.canvas,k=c.width/innerWidth,x=Math.round(((304-G.cam.x)*G.SCALE+innerWidth/2)*k),y=Math.round(((280-G.cam.y)*G.SCALE+innerHeight/2)*k),d=G.ctx.getImageData(x,y,4,4).data;return [...d].reduce((n,v,i)=>n+(i%4<3?v:0),0)/48;};
    const lit=sample();for(const l of S.lamps)if(l.outdoor)G.setLampCircuit(l,true);for(const b of G.BLD)b.fl=null;S.t+=.4;G.benchDraw(2);const dark=sample();ok(dark<lit*.85,'pilot art ignores actual switched lights '+JSON.stringify({lit,dark}));
    const roof=G.BLD[0].roofC,alpha=roof.getContext('2d').getImageData(0,0,roof.width,roof.rh).data;ok(alpha.every((v,i)=>i%4!==3||v===255),'roof exposes rooms below');
    window.__gkDraws=[];G.start(G.STAGES.findIndex(s=>s.id==='p0'));while(G.DLG.modal)G.advanceDialog();G.moveCamera(1);G.benchDraw(3);
    const nextUsed=new Set(window.__gkDraws.map(a=>a.join(',')));ok(nextUsed.has(art.frames.wallPanel.rect.join(','))&&nextUsed.has(art.frames.roofTile.rect.join(',')),'continued freight mission keeps the old wall/roof');
    ok(!nextUsed.has(art.frames.asphalt.rect.join(','))&&!nextUsed.has(art.frames.pavers.rect.join(',')),'first courtyard paving leaks into another map');
    return{used:used.size,gameplayUnchanged:true,courtyardLocal:true,freightExteriors:true,opaqueRoof:true,lighting:{lit,dark},source:art.source};}''')
   assert not errors,errors;print('PASS free-city pilot',w,h,json.dumps(result),flush=True);await q.close()
  await b.close()
asyncio.run(main())
