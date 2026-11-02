"""Moving perimeter review: props persist, whole sections stay stable, sight agrees.
Controlled position sweeps complement live-input playthroughs; not an FPS test.
"""
import asyncio, importlib.util, threading, json
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('m',R/'tests/rev/t_club_study.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
O=R/'build/stability-validation';O.mkdir(exist_ok=True)
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(m.H,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(args=['--enable-unsafe-swiftshader'])
  for touch in [True,False]:
   pg=await b.new_page(viewport={'width':390 if touch else 1000,'height':844 if touch else 740},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('localStorage.clear()');await pg.goto(f'http://127.0.0.1:{server.server_port}/build/episode-one/?nostats');await pg.wait_for_function('__clubView?.ready',polling=100,timeout=120000);await pg.evaluate('requestAnimationFrame=()=>0');await pg.wait_for_timeout(100);await pg.click('#btnBrGo')
   result=await pg.evaluate('''()=>{const G=__game,V=__clubView,S=G.S,P=S.player,W=V.world,check=(v,m)=>{if(!v)throw Error(m)};let frames=0;const sweep=[];Object.assign(P,{x:2*48,y:10*48,fl:0,z:0});W.update();check(!V.occlusion.focused,'distant building never restores');let approaches=0,prior=false;for(let x=2;x<=7;x+=.1){P.x=x*48;W.update();const focus=V.occlusion.focused;if(focus!==prior)approaches++;prior=focus;}check(approaches===1,'approach repeatedly switches building');
    for(let i=0;i<=80;i++){Object.assign(P,{x:(6.5+Math.sin(i*.21)*.25)*48,y:(18-i*.185)*48,fl:0,z:0,under:false,vent:false,hide:null,trav:null});S.t+=1/60;W.update();V.sight.update();for(const {h,v}of W.hides)if(!(h.fl||0))check(v.group.visible,'same-floor prop disappeared at '+i);sweep.push({...V.occlusion});frames++;}
    check(sweep.filter((v,i)=>i&&v.focused!==sweep[i-1].focused).length<=1,'perimeter mode flickers');
    for(let i=0;i<80;i++){P.x=(8-2.8+Math.sin(i)*.025)*48;P.y=10*48;S.t+=1/60;W.update();check(V.occlusion.focused,'cutaway chatters on approach boundary');frames++;}
    Object.assign(P,{x:13.5*48,y:16.5*48,fl:0});W.update();check(!W.floorGroups[1].visible,'upstairs covers street');
    Object.assign(P,{x:14.5*48,y:8.5*48,fl:1});W.update();check(W.floorGroups[1].visible,'upstairs missing');for(const {h,v}of W.hides)check(v.group.visible===((h.fl||0)===1),'fixture on wrong floor');
    const g=S.guards.find(g=>g.tag==='officeGuard');Object.assign(g,{x:14*48,y:9*48,a:Math.PI/2,state:'PATROL',fl:1,doomed:false,climb:null});Object.assign(P,{x:g.x,y:g.y-20,mode:'walk',moving:false});S.t+=1;W.update();G.setLayer(1);V.sight.update();check(G.layer===1,'sight corrupted floor state');const e=V.sight.entries.get(g);check(e.mesh.visible,'visible guard has no sight field');check(G.canSee(g,P.x,P.y,G.lightAtG(P.x,P.y,1),false,false,0)>0,'near rear awareness absent');check(e.cells.some(c=>c.near&&c.to>=20),'close rear awareness missing from field');
    Object.assign(P,{y:g.y-50,mode:'run',moving:true});V.sight.update();check(G.canSee(g,P.x,P.y,G.lightAtG(P.x,P.y,1),false,false,0)>0,'running rear detection absent');check(e.cells.some(c=>c.near&&c.running&&c.to>=50),'running awareness missing from display');return{approaches,frames,transitions:sweep.filter((v,i)=>i&&v.focused!==sweep[i-1].focused).length,props:W.hides.length,closeAwareness:true,layerPreserved:true};}''')
   assert not errors,errors;results.append({'touch':touch,**result});await pg.screenshot(path=str(O/f'moving-{"mobile" if touch else "pc"}.png'));print('PASS moving',touch,result,flush=True);await pg.close()
  await b.close()
 (O/'moving.json').write_text(json.dumps(results,indent=2));server.shutdown()
if __name__=='__main__':asyncio.run(main())
