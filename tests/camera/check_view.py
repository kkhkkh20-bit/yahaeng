"""Rendered-pixel contract: actor and walkable ground remain visible, not just
scene-graph flags. Also verify the new projection, zoom and native touch pinch.
"""
import asyncio,importlib.util,json,threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];spec=importlib.util.spec_from_file_location('m',str(R/'tests/rev/t_club_study.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
O=R/'build/camera-validation';O.mkdir(exist_ok=True)
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for touch in [False,True]:
   pg=await b.new_page(viewport={'width':390 if touch else 1280,'height':844 if touch else 800},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('console',lambda e:errors.append(e.text)if e.type=='error'and'Failed to load resource'not in e.text else None);await pg.add_init_script("localStorage.clear();localStorage.setItem('yahaeng.zoom3','1.6')");await pg.goto(f'http://127.0.0.1:{server.server_port}/build/episode-one/?nostats');await pg.wait_for_function('__clubView?.ready||window.__clubError',polling=100,timeout=120000);assert not await pg.evaluate('window.__clubError');await pg.evaluate('requestAnimationFrame=()=>0');await pg.wait_for_timeout(100);await pg.click('#btnBrGo');assert await pg.evaluate('__game.viewZoom')==1
   for name,x,z,f in [('start',5.5,18.5,0),('west',7.5,10.5,0),('bin',6.5,8.5,0),('north',13.5,3.5,0),('inside',13.5,12.5,0),('upper',14.5,8.5,1)]:
    result=await pg.evaluate('''async({x,z,f})=>{const T=await import('./lib/three.module.min.js'),G=__game,V=__clubView,S=G.S,P=S.player,check=(v,m)=>{if(!v)throw Error(m)};Object.assign(P,{x:x*48,y:z*48,fl:f,z:0,hide:null,trav:null,under:false,vent:false,outfit:null,a:-Math.PI/2});G.setLayer(f);S.fade=0;S.t+=3;const render=V.renderer.render;V.renderer.render=()=>{};G.benchDraw(40);V.renderer.render=render;G.benchDraw(1);
     const player=V.actorScreen(P),framing=V.framing;check(Math.abs(player.x/innerWidth-(innerWidth<700?.45:.5))<.003&&Math.abs(player.y/innerHeight-.60)<.003,'actor outside usable framing');check(innerWidth>700||framing.groundWidth>=7.99,'portrait ground coverage too narrow');const inv=V.screenToWorld(player.x,player.y);check(Math.hypot(inv.x-P.x,inv.y-P.y)<.001,'ground inverse misses player');
     const W=innerWidth,H=innerHeight,rt=new T.WebGLRenderTarget(W,H),pixels=()=>{V.renderer.setRenderTarget(rt);V.renderer.render(V.scene,V.camera);const data=new Uint8Array(W*H*4);V.renderer.readRenderTargetPixels(rt,0,0,W,H,data);V.renderer.setRenderTarget(null);return data},root=V.people.player.driver.root;
     root.visible=true;const on=pixels();root.visible=false;const off=pixels();let bodyPixels=0;for(let yy=Math.max(0,Math.floor(player.y)-95);yy<Math.min(H,Math.floor(player.y));yy++)for(let xx=Math.max(0,Math.floor(player.x)-28);xx<Math.min(W,Math.floor(player.x)+28);xx++){const i=((H-1-yy)*W+xx)*4;if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>24)bodyPixels++;}check(bodyPixels>60,'actor hidden by architecture: '+bodyPixels);
     const previous=[...V.people.actors.values()].map(a=>[a.driver.root,a.driver.root.visible]);previous.forEach(([r])=>r.visible=false);const mat=new T.MeshBasicMaterial({color:0x00ff00,toneMapped:false}),probe=new T.Mesh(new T.CircleGeometry(.09,12),mat);probe.rotation.x=-Math.PI/2;V.scene.add(probe);const probes=[];G.setLayer(f);
     for(const [dx,dz]of [[0,0],[-1.15,0],[1.15,0],[0,-1.15],[0,1.15]]){const px=x+dx,pz=z+dz,tx=Math.floor(px),tz=Math.floor(pz);if(S.hides.concat(S.bushes||[]).some(h=>h.tx===tx&&h.ty===tz)||G.solidAt(tx,tz)||G.bldAt(tx,tz)!==G.bldAt(Math.floor(x),Math.floor(z)))continue;probe.position.set(px,f*2.8+.08,pz);const screen=V.project(probe.position);if(screen.x<4||screen.x>W-4||screen.y<155||screen.y>H-140)continue;const a=pixels(),xx=Math.round(screen.x),yy=H-1-Math.round(screen.y);let green=0;for(let k=-2;k<=2;k++)for(let j=-2;j<=2;j++){const i=((yy+k)*W+xx+j)*4;if(a[i+1]>a[i]+60&&a[i+1]>a[i+2]+60)green++;}probes.push({dx,dz,green});check(green>=3,'walkable floor is covered '+JSON.stringify(probes));}
     probe.removeFromParent();mat.dispose();probe.geometry.dispose();previous.forEach(([r,v])=>r.visible=v);root.visible=true;rt.dispose();V.renderer.render(V.scene,V.camera);check(probes.length>=2,'insufficient ground samples');return{bodyPixels,probes,framing,player};}''',{'x':x,'z':z,'f':f});results.append({'touch':touch,'scene':name,**result});print('PASS visible',touch,name,result['bodyPixels'],result['probes'],flush=True)
   # Wheel/zoom changes the view while keeping the actor grounded and centred.
   zoom=await pg.evaluate('''()=>{const G=__game,V=__clubView,before=V.framing.span;G.setZoom(1.3);const render=V.renderer.render;V.renderer.render=()=>{};G.benchDraw(40);V.renderer.render=render;G.benchDraw(1);return{before,after:V.framing.span,position:V.actorScreen(G.S.player)}}''');assert zoom['after']<zoom['before']*.8,zoom;await pg.evaluate('__game.setZoom(1)')
   if touch:
    cdp=await pg.context.new_cdp_session(pg);before=await pg.evaluate('[__game.S.player.x,__game.S.player.y]');await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':70,'y':400},{'x':200,'y':400}]});await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':40,'y':400},{'x':230,'y':400}]});assert await pg.evaluate('__game.viewZoom')>1.3;await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});assert await pg.evaluate('!__game.input.joy');assert await pg.evaluate('[__game.S.player.x,__game.S.player.y]')==before;print('PASS native pinch, no movement leakage',flush=True)
   assert not errors,errors;await pg.close()
  await b.close()
 (O/'pixels.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));server.shutdown()
if __name__=='__main__':asyncio.run(main())
