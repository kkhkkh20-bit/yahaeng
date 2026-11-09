"""Explicit-clock regressions: reverse gear, boundary semantics, hatch latch, floor labels."""
import asyncio,json,threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0')
  await q.goto(f'http://127.0.0.1:{server.server_port}/build/preview_city.html?study=agent-city&nostats');await q.wait_for_function('!!window.__game');await q.click('#btnQuick');await q.click('#btnBrGo');await q.evaluate('()=>{while(__game.DLG.modal)__game.advanceDialog()}');await q.wait_for_function('__game.S.ladders.some(l=>l.roofHatch)')
  row=await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,T=G.traffic,check=(v,m)=>{if(!v)throw Error(m)},tick=n=>{for(let i=0;i<n;i++)G.update(1/60)};
   S.guards=[];S.vehicles=[];
   const v=T.makeVehicle({x:700,y:1152,a:0,v:0});S.vehicles=[v];P.car=v;S.keys={ArrowLeft:true};tick(45);
   check(v.v< -80&&v.x<680&&Math.abs(v.a)<.01,'opposite input U-turns instead of reversing on open road');const reverse={x:v.x,v:v.v,a:v.a};
   S.keys={ArrowRight:true};tick(90);check(v.v>100&&Math.abs(v.a)<.01,'cannot drive forward after reverse');
   v.x=700;v.y=1152;v.v=240;S.keys={ArrowLeft:true};tick(12);check(v.v>0&&v.v<240,'reverse must brake before changing direction');tick(30);check(v.v<0,'braking never becomes reverse');
   v.x=65;v.y=1152;v.a=Math.PI;v.v=220;S.carImpact=null;S.boundaryHintAfter=0;T.carMove(v,.3);
   check(!S.carImpact&&v.hp===6&&v.v===0,'mission edge produces physical impact or damage');check(document.getElementById('toasts').textContent.includes('임무부터'),'mission boundary gives no mission instruction');
   const boundary={x:v.x,hp:v.hp,impact:!!S.carImpact};P.car=null;S.vehicles=[];S.keys={};
   const l=S.ladders.find(l=>l.roofHatch&&l.tz===5&&G.bldAt(l.tx,l.ty)===0),h=l.roofHatch;let accesses=0;
   for(let i=0;i<8;i++){const a=i*Math.PI/4;Object.assign(P,{x:h.x+Math.cos(a)*40,y:h.y+Math.sin(a)*40,z:l.tz,fl:0});check(G.roofStairAccess(l,P),'hatch inaccessible from direction '+i);accesses++;}
   P.z=0;check(!G.roofStairAccess(l,P),'hatch activates on floor beneath');P.z=l.tz;P.fl=1;check(!G.roofStairAccess(l,P),'hatch activates with incompatible floor');
   const descents=[];
   for(const [dx,dy,key]of [[1,0,'ArrowLeft'],[-1,0,'ArrowRight'],[0,1,'ArrowUp'],[0,-1,'ArrowDown']]){
    Object.assign(P,{x:h.x+dx*55,y:h.y+dy*55,z:l.tz,fl:0,vx:0,vy:0,trav:null,moving:false});S.roofHatchExit=null;S.stairArm=true;S.keys={[key]:true};
    let n=0;while(!P.trav&&n++<90)tick(1);check(!!P.trav,'no automatic descent '+key);S.keys={};n=0;while(P.trav&&n++<600)tick(1);check(P.z===0&&P.fl===l.bfl&&!P.trav,'descent failed '+key);descents.push(key);
   }
   Object.assign(P,{x:h.x,y:h.y-48,z:l.tz,fl:0,vx:0,vy:0,trav:null});S.keys={ArrowRight:true};S.roofHatchExit=null;tick(40);check(P.z===l.tz&&!P.trav,'passing the hatch toward the bridge triggers descent');S.keys={};
   const lower=G.stairLower(l);Object.assign(P,{x:lower.up.entry.x,y:lower.up.entry.y,z:0,fl:l.bfl,vx:0,vy:0});G.setLayer(l.bfl);S.keys={};G.beginStairTravel(l,true);let n=0;while(P.trav&&n++<600)tick(1);
   check(P.z===l.tz&&S.roofHatchExit,'ascent has no leave-and-return latch');tick(20);check(P.z===l.tz&&!P.trav,'idle bounces down hatch');S.keys={ArrowUp:true};tick(3);S.keys={};tick(4);check(P.z===l.tz&&!P.trav,'changing input immediately descends again');
   Object.assign(P,{x:h.x-100,y:h.y+48,vx:0,vy:0});tick(1);check(!S.roofHatchExit,'hatch latch never clears after leaving');
   P.fl=2;P.z=0;const area=G.goalMarkerCaption({x:600,y:648,fl:1,area:true,marker:'이도현 활동 구역'},5);check(area==='↓ 2층 · 이도현 활동 구역 · 5m','missing target floor '+area);
   const via=G.goalMarkerCaption({x:600,y:648,fl:2,via:true,viaTo:{fl:1,z:0},destinationFloor:{fl:1,z:0}},5);check(via.includes('↓ 2층')&&!via.includes('3층'),'route overwrites destination floor '+via);
   const close=G.goalMarkerCaption({x:600,y:648,fl:1,marker:'이도현'},1);check(close.includes('2층'),'vertically nearby target lacks floor');
   P.z=5;P.fl=0;const roof=G.goalMarkerCaption({x:600,y:648,fl:4,marker:'문서'},5);check(roof.startsWith('↓ 5층'),'roof to top storey lacks descending cue');
   return {reverse,boundary,accesses,descents,latch:true,passBy:true,captions:[area,via,close,roof]};}''')
  assert not errors,errors;out=ROOT/'build/world-polish-v240';out.mkdir(exist_ok=True);(out/'checks.json').write_text(json.dumps(row,ensure_ascii=False,indent=2));print('PASS world polish',json.dumps(row,ensure_ascii=False));await b.close()
 server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
