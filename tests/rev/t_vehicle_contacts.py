"""Real vehicle solver fixtures: contacts, swept turns, braking and junction liveness.
The clock and vehicle placements are explicit simulation fixtures, not native-play claims.
"""
import asyncio,json,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0');await q.goto(f'http://127.0.0.1:{server.server_port}/build/preview_city.html?study=agent-city&nostats');await q.wait_for_function('!!window.__game')
  row=await q.evaluate('''()=>{const G=__game,T=G.traffic,check=(v,m)=>{if(!v)throw Error(m)};
   const reset=()=>{let seed=17;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};G.start(G.STAGES.findIndex(s=>s.agentStudy));while(G.DLG.modal)G.advanceDialog();G.S.guards=[];G.S.trafficJunctions={};G.S.carImpact=null;};
   reset();const S=G.S;
   let a=T.makeVehicle({x:700,y:1152,a:0,d:0,v:260,ai:true}),c=T.makeVehicle({x:960,y:1152,a:Math.PI,d:2,v:260,ai:true});S.vehicles=[a,c];
   for(let i=0;i<120;i++){S.t+=1/60;T.carMove(a,1/60);T.carMove(c,1/60);check(!T.carOverlap(a)&&!T.carOverlap(c),'head-on cars overlap');}
   check(a.x<c.x&&a.hp===5&&c.hp===5&&S.carImpact?.hit>400,'head-on lacks a single physical impact');const head={a:a.hp,b:c.hp,speed:S.carImpact.hit,gap:c.x-a.x};
   a=T.makeVehicle({x:850,y:1056,a:0,d:0,v:430,ai:true});c=T.makeVehicle({x:980,y:1056,a:Math.PI/2,d:1,v:0,parked:true});S.vehicles=[a,c];S.t+=2;T.carMove(a,.3);check(!T.carOverlap(a)&&a.x<940,'fast perpendicular impact tunnels through');const crossing={x:a.x,damage:a.hp<6&&c.hp<6};check(crossing.damage,'side impact has no damage');
   a=T.makeVehicle({x:1010,y:504,a:0,d:0,v:430,ai:true});S.vehicles=[a];S.t+=2;T.carMove(a,.5);check(!T.carOverlap(a)&&a.x<=1059,'vehicle enters a building');const wall={x:a.x,hp:a.hp};
   a=T.makeVehicle({x:700,y:1152,a:0,d:0,v:0,ai:true});c=T.makeVehicle({x:700,y:1214,a:0,d:0,v:0,parked:true});S.vehicles=[a,c];check(!T.carOverlap(a),'turn fixture initially overlaps');T.carMove(a,0,Math.PI/2);check(!T.carOverlap(a),'steering sweeps a parked car into another');
   const turn={angle:a.a};reset();const initial=G.S.vehicles.map(v=>({id:v.id,x:v.x,y:v.y})),moved={},idle={},longest={};let maxStopped=0,checks=0;
   for(let i=0;i<3600;i++){const before=G.S.vehicles.map(v=>[v.x,v.y]);G.S.t+=1/60;T.updateVehicles(1/60);let stopped=0;G.S.vehicles.forEach((v,n)=>{check(!T.carOverlap(v),'normal traffic overlaps at frame '+i+' vehicle '+v.id);if(Math.hypot(v.x-before[n][0],v.y-before[n][1])>.1){moved[v.id]=(moved[v.id]||0)+1;idle[v.id]=0;}else{stopped++;idle[v.id]=(idle[v.id]||0)+1;longest[v.id]=Math.max(longest[v.id]||0,idle[v.id]);}checks++;});maxStopped=Math.max(maxStopped,stopped);}
   check(initial.length===8,'missing traffic cars');for(const v of initial)check((moved[v.id]||0)>240,'junction permanently blocks vehicle '+v.id);
   for(const v of initial)check((longest[v.id]||0)<2100,'junction starves vehicle '+v.id);check(!G.S.carImpact,'ordinary junction priority causes crashes');return{head,crossing,wall,turn,trafficCars:initial.length,movingFrames:moved,longestStoppedFrames:longest,contactChecks:checks,maxStopped,seconds:60};}''')
  assert not errors,errors;await b.close()
 server.shutdown();server.server_close();out=R/'build/agent-city-v236';out.mkdir(exist_ok=True);(out/'traffic.json').write_text(json.dumps(row,indent=2));print('PASS real traffic contacts',json.dumps(row))
if __name__=='__main__':asyncio.run(main())
