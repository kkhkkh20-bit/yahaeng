"""Shared exterior art preserves gameplay, physical windows, switched light and image-failure recovery."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for w,h,touch in [(1280,800,False),(390,844,True),(844,390,True)]:
   q=await b.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('''localStorage.clear();requestAnimationFrame=()=>0;window.__gkDraws=[];window.__upperFrames=[];const derived=new WeakMap(),patterns=new WeakMap(),proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,pattern=proto.createPattern,fill=proto.fillRect;
    proto.drawImage=function(im,...a){const key=im?.src&&im.src===(window.__ASSETS__?.dotonbori||window.__ASSETS__?.freeCity)?.src?a.slice(0,4):derived.get(im);if(key){window.__gkDraws.push(key);derived.set(this.canvas,key);if(im.cityWindowFrame&&this.canvas.id==='game')window.__upperFrames.push([a[0]+a[2]/2,a[1]+a[3]/2]);}return draw.call(this,im,...a)};
    proto.createPattern=function(im,...a){const p=pattern.call(this,im,...a),key=derived.get(im);if(p&&key)patterns.set(p,key);return p};
    proto.fillRect=function(...a){const key=patterns.get(this.fillStyle);if(key)window.__gkDraws.push(key);return fill.apply(this,a)};''')
   await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.wait_for_timeout(500)
   result=await q.evaluate('''()=>{const G=__game,S=G.S,art=window.__ASSETS__.dotonbori,ok=(v,m)=>{if(!v)throw Error(m)};
    ok(G.STAGE.freeCityPilot&&G.STAGE.id==='tB','wrong pilot stage');ok(G.STAGES.filter(s=>s.freeCityPilot).length===1,'the authored vending detail should remain local');
    const logical=()=>JSON.stringify({p:[S.player.x,S.player.y,S.player.hp,S.player.fl,S.player.outfit],guards:S.guards.map(g=>[g.x,g.y,g.fl,g.state,g.target]),doors:S.doors.map(d=>[d.x,d.y,d.locked,d.open]),lamps:S.lamps.map(l=>[l.x,l.y,l.fl,l.off]),stats:S.stats,items:S.items.map(i=>i.got),solid:G.G0.map((r,y)=>r.map((v,x)=>G.solidAt(x,y)))});
    const before=logical();S.fade=0;G.moveCamera(1);G.updateHUD(true);G.benchDraw(3);ok(before===logical(),'drawing changes collision, actors, light switches or progress');
    const used=new Set(window.__gkDraws.map(a=>a.join(','))),wasUsed=(f,list=window.__gkDraws)=>{const [x,y,w,h]=f.rect;return list.some(([sx,sy,sw,sh])=>sx>=x&&sy>=y&&sx+sw<=x+w&&sy+sh<=y+h)};
    for(const name of ['roofTile','metalStorey','pavers','lampOn','vending','asphalt'])ok(wasUsed(art.frames[name]),'required exterior sprite never reaches canvas '+name);ok(wasUsed(art.frames.bush0)||wasUsed(art.frames.bush1),'new cover is never painted');
    ok(Object.values(art.frames).length===43&&art.frames.roofVent&&art.source.includes('dotonbori-city-game-assets')&&art.sourceSha256==='a82beeeff1f3d77e24cf26e80a8dd221061aae4179c9cb3ec92c569bfd0d8235','unexpected purchased source/unused subset');ok(!/undefined/.test(document.getElementById('episodeRadioText').textContent),'art boot broke guidance');
    // Scenery beyond the playable boundary has decorative windows. Within
    // the map, every storey window still corresponds to a physical opening.
    for(const b of G.BLD){G.cam.x=(b.x0+b.x1+1)*24;G.cam.y=(b.y0+b.y1+1)*24;G.benchDraw(1);}/* off-screen facades are culled (v267) */
    const upper=new Set(window.__upperFrames.filter(([x,y])=>x>=0&&y>=0&&x<G.MW*48&&y<G.MH*48).map(a=>a.join(','))),expected=[...S.windows,...S.fwindows].filter(w=>G.BLD.some(b=>(w.fl||0)<b.fh&&w.ty===b.y1&&w.tx>=b.x0&&w.tx<=b.x1));
    ok(upper.size===expected.length,'missing or invented upper-floor window');for(const w of expected)ok(upper.has([w.x,(w.ty-(w.fl||0))*48+24].join(',')),'upper window on wrong facade row');
    // The new canopy is ordinary lit world art, not a permanently bright overlay.
    G.cam.x=336;G.cam.y=360;G.benchDraw(1);
    const sample=()=>{const c=G.ctx.canvas,k=c.width/innerWidth,x=Math.round(((304-G.cam.x)*G.SCALE+innerWidth/2)*k),y=Math.round(((280-G.cam.y)*G.SCALE+innerHeight/2)*k),d=G.ctx.getImageData(x,y,4,4).data;return [...d].reduce((n,v,i)=>n+(i%4<3?v:0),0)/48;};
    const lit=sample();for(const l of S.lamps)if(l.outdoor)G.setLampCircuit(l,true);for(const b of G.BLD)b.fl=null;S.t+=.4;G.benchDraw(2);const dark=sample();ok(wasUsed(art.frames.lampOff),'wall fixture never shows actual off state');ok(dark<lit*.85,'pilot art ignores actual switched lights '+JSON.stringify({lit,dark}));
    const roof=G.BLD[0].roofC,alpha=roof.getContext('2d').getImageData(0,0,roof.width,roof.rh).data;ok(alpha.every((v,i)=>i%4!==3||v===255),'roof exposes rooms below');
    window.__gkDraws=[];G.start(G.STAGES.findIndex(s=>s.id==='p0'));while(G.DLG.modal)G.advanceDialog();G.moveCamera(1);G.benchDraw(3);
    // Off-screen buildings are culled (v267): look at each freight building in turn.
    for(const b of G.BLD){G.cam.x=(b.x0+b.x1+1)*24;G.cam.y=(b.y0+b.y1+1)*24;G.benchDraw(1);}
    const nextUsed=new Set(window.__gkDraws.map(a=>a.join(',')));ok(wasUsed(art.frames.metalStorey)&&wasUsed(art.frames.roofTile),'continued freight mission keeps the old wall/roof');
    ok(wasUsed(art.frames.pavers),'shared paving is absent from the next map');
    return{used:used.size,gameplayUnchanged:true,sharedPaving:true,freightExteriors:true,opaqueRoof:true,lighting:{lit,dark},source:art.source};}''')
   assert not errors,errors;print('PASS purchased city exteriors',w,h,json.dumps(result),flush=True);await q.close()
  # A missing purchased image must recover to the already-shipped free city art.
  q=await b.new_page(viewport={'width':1280,'height':800})
  await q.add_init_script("""localStorage.clear();requestAnimationFrame=()=>0;window.__fallbackDraws=0;
   const desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
   Object.defineProperty(HTMLImageElement.prototype,'src',{...desc,set(v){desc.set.call(this,v===window.__ASSETS__?.dotonbori?.src?'data:image/png;base64,invalid':v)}});
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(im,...a){if(im?.src===window.__ASSETS__?.freeCity?.src)window.__fallbackDraws++;return draw.call(this,im,...a)};""")
  await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.wait_for_timeout(500)
  await q.evaluate('__game.benchDraw(3)');assert await q.evaluate('__fallbackDraws>0'),'missing paid image leaves an untextured scene'
  assert await q.evaluate('__game.S.player.hp===3&&!__game.S.over'),'fallback breaks startup'
  print('PASS purchased image failure recovers to free-city artwork',flush=True)
  await q.close();await b.close()
asyncio.run(main())
