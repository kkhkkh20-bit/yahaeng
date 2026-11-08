"""Visible light stays at real sources and behind walls, without altering perception."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1000,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game');await q.click('#btnQuick');await q.wait_for_timeout(350)
  result=await q.evaluate('''()=>{const G=__game,S=G.S,c=G.ctx,ok=(v,m)=>{if(!v)throw Error(m)};
   const lamp={x:120,y:120,r:200,fl:0,col:'235,218,183',poly:[100,100,140,100,140,140,100,140]},base=()=>{c.setTransform(1,0,0,1,0,0);c.fillStyle='#203040';c.fillRect(0,0,c.canvas.width,c.canvas.height)},px=(x,y)=>[...c.getImageData(x,y,1,1).data],same=(a,b)=>a.every((v,i)=>v===b[i]);
   base();const initial=px(120,120),outside=px(80,120);G.drawLampTint(lamp);ok(!same(px(120,120),initial),'room tint missing');ok(same(px(80,120),outside),'tint leaks past occluder');
   base();lamp.off=true;G.drawLampTint(lamp);ok(same(px(120,120),initial),'off lamp retains reflection');
   base();lamp.off=false;lamp.outdoor=true;G.drawLampTint(lamp);ok(same(px(120,120),initial),'dry pavement gets a second circular reflection');
   let rays=0;for(const id of ['tB','p1','m2']){G.start(G.STAGES.findIndex(s=>s.id===id));for(const l of G.S.lamps){if(!l.poly?.length)continue;G.setLayer(l.fl||0);for(let i=0;i<l.poly.length;i+=12){const a=i/l.poly.length*Math.PI*2,d=Math.hypot(l.poly[i]-l.x,l.poly[i+1]-l.y),hit=G.castRay(l.x,l.y,a,l.r);ok(d<=hit+.1,'light mask goes behind wall '+id+' '+JSON.stringify({d,hit,x:l.x,y:l.y}));rays++;}}G.setLayer(0);}
   G.start(G.STAGES.findIndex(s=>s.id==='tB'));let old=G.S;old.lamps[0].off=true;old.lamps[1].broken=true;
   const state=()=>JSON.stringify(G.S.lamps.map(l=>[l.x,l.y,l.r,l.fl,l.col,l.off,l.broken]));
   const saved=state();for(const l of old.lamps)for(let i=0;i<l.poly.length;i+=2){const a=i/l.poly.length*Math.PI*2;l.poly[i]+=Math.cos(a)*20;l.poly[i+1]+=Math.sin(a)*20;}
   G.saveCheckpoint();ok(G.loadCheckpoint(),'old-light checkpoint not restored');ok(state()===saved,'repair moves a source or loses a switch/bulb state');
   for(const l of G.S.lamps){G.setLayer(l.fl||0);for(let i=0;i<l.poly.length;i+=12){const a=i/l.poly.length*Math.PI*2;ok(Math.hypot(l.poly[i]-l.x,l.poly[i+1]-l.y)<=G.castRay(l.x,l.y,a,l.r)+.1,'legacy light halo restored behind wall');}}G.setLayer(0);
   G.start(G.STAGES.findIndex(s=>s.id==='tB'));const T=G.S;T.fade=0;T.guards=[];T.cams=[];for(const l of T.lamps)l.off=true;G.cam.x=700;G.cam.y=800;
   const sample=()=>{const k=c.canvas.width/innerWidth,x=Math.round(innerWidth/2*k),y=Math.round(innerHeight/2*k);return [...c.getImageData(x,y,3,3).data]};
   Object.assign(T.player,{x:650,y:800});G.benchDraw(2);const near=sample();const light=G.lightAtG(700,800,0);
   Object.assign(T.player,{x:950,y:800});G.benchDraw(2);const far=sample();ok(same(near,far),'a light bubble follows the player');ok(light===G.lightAtG(700,800,0),'presentation changes perception');
   return{occludedTint:true,offTintAbsent:true,dryPavementNoHalo:true,rays,playerCreatesNoLight:true,legacyMaskRepaired:true,perception:light};}''')
  assert not errors,errors;print('PASS light presentation',json.dumps(result),flush=True);await b.close()
asyncio.run(main())
