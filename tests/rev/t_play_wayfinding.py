"""Named destinations, clear circulation and legacy-save repair after room re-layout.
These are controlled fixtures, not live-AI campaign completion claims.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('localStorage.clear();requestAnimationFrame=()=>0');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.officeReady()',polling=100)
  result=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S;};
   let S=fresh('tB'),P=S.player;
   for(const step of [0,1,2,3,4,5,6,8,9]){S.tutI=step;const g=G.nextGoal();ok(g.marker&&g.marker!=='여기','unnamed tutorial step '+step);ok(!G.goalMarkerCaption(g,9).includes('여기'),'generic tutorial caption');}
   S.tutI=7;Object.assign(P,{x:1080,y:312,fl:1,z:0});G.setLayer(1);ok(G.nextGoal().marker==='복도 끝 문','corridor marker does not identify its door');
   const guard=S.guards.find(g=>g.tag==='archiveKeeper');guard.unconscious=true;guard.state='DEAD';ok(G.nextGoal().marker==='연락 서류','marker does not switch after the observer is subdued');
   S=fresh('p0');ok(G.goalMarkerCaption({marker:'1층 경비',x:1272,y:552,fl:0},9)==='1층 · 경비 · 9m','floor repeated');ok(G.goalMarkerCaption({marker:'1층 · 경비',x:1272,y:552,fl:0},9)==='1층 · 경비 · 9m','delimited floor repeated');
   ok(G.goalMarkerCaption({marker:'3층 경비',x:1272,y:552,fl:2},9).includes('3층 · 경비'),'upper floor missing');
   const reachable=(a,z,fl)=>{G.setLayer(fl);const seen=new Set([a.join(',')]),queue=[a];for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===z[0]&&y===z[1])return true;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(nx<0||ny<0||nx>=G.MW||ny>=G.MH||seen.has(k)||G.solidAt(nx,ny))continue;seen.add(k);queue.push([nx,ny]);}}return false;};
   let stations=0,aisles=0;
   for(const id of ['m4','m7','m6']){S=fresh(id);const roomKeys=new Set(Object.keys(G.STAGE.roomNames));
    for(const g of S.guards)for(const at of [g,...(g.route||[]),...(g.sched||[]).map(a=>a.at&&({x:a.at[0]*48+24,y:a.at[1]*48+24})).filter(Boolean)]){const fl=g.fl||0,tx=Math.floor(at.x/48),ty=Math.floor(at.y/48);if(!roomKeys.has(G.bldAt(tx,ty)+':'+fl))continue;G.setLayer(fl);ok(!G.solidAt(tx,ty),'blocked patrol/work station '+id+' '+tx+','+ty);stations++;}
    if(G.STAGE.camRoom?.surface){const c=S.camRoom;ok(c.surface,'terminal detached from its workstation '+id);G.setLayer(c.fl||0);ok(!G.solidAt(Math.floor(c.x/48),Math.floor(c.y/48)),'terminal has no standing point '+id);Object.assign(S.player,{x:c.x,y:c.y,fl:c.fl,z:0});const action=G.envChoices().find(a=>a.k==='camroom');ok(action,'terminal interaction missing '+id);G.actPrimary({...action,viaZ:true});for(let n=0;S.player.interact&&n<160;n++){S.t+=.03;G.updatePlayer(.03);}ok(S.camsOff,'terminal action does not commit '+id);}
    for(const it of S.items){G.setLayer(it.fl||0);ok(!G.solidAt(Math.floor(it.x/48),Math.floor(it.y/48)),'blocked objective '+id);}
    const routes=id==='m4'?[[[35,8],[42,8],1],[[23,8],[28,6],1]]:id==='m7'?[[[26,18],[31,16],1],[[26,18],[31,17],0]]:[[[4,10],[15,10],0]];
    for(const[a,z,fl]of routes){ok(reachable(a,z,fl),'circulation disconnected '+id+' '+a+' '+z);aisles++;}
    for(const d of S.doors){G.setLayer(d.fl||0);ok([[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>!G.solidAt(d.tx+x,d.ty+y)),'door has no approach '+id+' '+d.tx+','+d.ty);}
   }
   let repaired=0;
   for(const [id,fl,x,y,legacy]of [['m4',1,36,4,[[36,5],[37,5],[36,6],[39,7],[40,7],[39,8]]],['m7',0,27,16,[[27,17],[28,17],[27,18]]],['m7',1,29,15,[[27,17],[28,17],[27,18]]],['m6',0,12,9,[[10,9],[13,9]]]]){
    S=fresh(id);P=S.player;G.setLayer(fl);const grid=fl?G.GF[fl]:G.G0;grid[y][x]='w';for(const[tx,ty]of legacy)grid[ty][tx]='K';Object.assign(P,{x:x*48+24,y:y*48+24,fl,z:0});const before=JSON.stringify({hp:P.hp,items:S.items.map(i=>i.got),keys:P.keys});G.saveCheckpoint();ok(G.loadCheckpoint(),'checkpoint rejected '+id);S=G.S;P=S.player;G.setLayer(fl);ok(G.solidAt(x,y),'new fixture absent after restore');ok(!G.solidAt(Math.floor(P.x/48),Math.floor(P.y/48))&&P.fl===fl,'restored player trapped in furniture');ok(before===JSON.stringify({hp:P.hp,items:S.items.map(i=>i.got),keys:P.keys}),'migration grants/loses progress');if(id==='m7')ok(!G.solidAt(28,17),'legacy desk ghost remains');repaired++;
   }
   return{namedTutorial:true,floorDeduplication:true,clearStations:stations,connectedAisles:aisles,repairedCheckpoints:repaired};}''')
  assert not errors,errors;print('PASS wayfinding and authored work rooms',json.dumps(result),flush=True);await b.close()
asyncio.run(main())
