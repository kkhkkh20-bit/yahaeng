"""Staged title artwork rendered by the game's own 2D engine. No generated illustration.
Actors/camera are posed only for artwork capture; these are not gameplay evidence.
"""
import asyncio,base64,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1];O=R/'build/front-end-v210';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for name,w,h,cx,cy,zoom in [('wide',1600,960,720,1530,1.4),('portrait',720,1280,880,1960,1.2)]:
   q=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   await q.add_init_script('requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&(!window.__boot||window.__boot.state.ready)')
   await q.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'),true);while(G.DLG.modal)G.advanceDialog()}")
   await q.wait_for_timeout(1000)
   await q.evaluate('''({cx,cy,zoom})=>{const G=__game,S=G.S,P=S.player;window.__skip.ui=true;S.fade=0;S.over=true;S.peek=null;S.opps=[];S.marked=null;S.visionCamera=null;
    Object.assign(P,{x:888,y:1640,fl:0,z:0,a:-Math.PI/2,hidden:false,moving:false});
    S.facOn=false;S.poles.push({x:968,y:1624,z:2,top:64,tx:20,ty:33,wires:[]});S.lamps.push({x:968,y:1624,r:210,outdoor:true,pole:true,fl:0,col:'255,190,116',poly:null,off:false,broken:false,control:{x:980,y:1630,fl:0,z:0}});
    const lamp=S.lamps.at(-1);lamp.poly=[];for(let i=0;i<180;i++){const a=i/180*Math.PI*2,d=Math.min(lamp.r,G.castRay(lamp.x,lamp.y,a,lamp.r));lamp.poly.push(lamp.x+Math.cos(a)*d,lamp.y+Math.sin(a)*d);}
    S.guards=S.guards.filter(g=>g.civ&&!g.target).slice(0,3);S.cams=[];S.items=[];S.speeches=[];
    G.setZoom(zoom);G.moveCamera(1);G.cam.x=cx;G.cam.y=cy;
    G.ctx.fillText=new Proxy(G.ctx.fillText,{apply(fn,self,args){if(/m$|통행|옥상|금지|구역|여기|기회|목표|CCTV|직원|복도/.test(String(args[0])))return;return Reflect.apply(fn,self,args)}});
    G.benchDraw(4);G.cam.x=cx;G.cam.y=cy;G.benchDraw(1);
   }''',{'cx':cx,'cy':cy,'zoom':zoom})
   for _ in range(12):
    await q.evaluate('__game.benchDraw(1)');await q.wait_for_timeout(90)
   data=await q.locator('#game').evaluate("c=>c.toDataURL('image/webp',.94).split(',')[1]")
   (O/f'alley-{name}.webp').write_bytes(base64.b64decode(data));await q.close()
  await b.close()
 print('Rendered staged game scenes to',O)
asyncio.run(main())
