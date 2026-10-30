"""Faction boundaries are traversable; unreachable pursuits stop without walking in place."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!__game')
  result=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m5'));for(let n=0;n<60&&G.DLG.modal;n++)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>g.rival),other=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.rival);P.x=P.y=-9999;G.setLayer(0);
   Object.assign(g,{x:34*48+24,y:24*48+24,z:0,fl:0,state:'PATROL',path:null,moving:false});
   const x=37*48+24,y=g.y;check(G.inTurf('B',g.x,g.y)&&!G.inTurf('B',x,y),'missing territory boundary fixture');G.pathTo(g,x,y);check(g.path.length,'territory boundary blocks path');for(let i=0;i<180&&g.path.length;i++)G.moveAlong(g,100,1/60);check(Math.hypot(g.x-x,g.y-y)<1,'cannot leave faction territory');
   g.path=[{x:g.x,y:g.y}];g.moving=true;G.moveAlong(g,100,1/60);check(!g.moving,'completed path still walks');g.path=[];g.moving=true;G.moveAlong(g,100,1/60);check(!g.moving,'empty path still walks');
   // A vault door closes during a fight: the target is now unreachable, not a point to walk at forever.
   const d=S.doors.find(d=>d.keyLock==='code'),it=S.items[0];check(d.locked,'fixture vault is open');Object.assign(g,{x:d.x,y:d.y+48,state:'PATROL',z:0,fl:0,path:null,brawl:{o:other,cd:1},facBlocked:0,moving:true,route:[{x:d.x,y:d.y+48,pause:999}],ri:0,wait:0});Object.assign(other,{x:it.x,y:it.y,z:0,fl:0,state:'PATROL',brawl:null});S.guards=[g,other];check(!G.astar(Math.floor(g.x/48),Math.floor(g.y/48),Math.floor(other.x/48),Math.floor(other.y/48)).length,'fixture target must be unreachable');
   let falseSteps=0;for(let n=0;n<180;n++){const x=g.x,y=g.y;S.t+=1/60;G.updateGuard(g,1/60);if(g.moving&&Math.hypot(g.x-x,g.y-y)<.01)falseSteps++}
   check(falseSteps===0,'unreachable faction target triggers walking in place');check(!g.brawl&&['RETURN','PATROL'].includes(g.state),'blocked faction NPC does not resume routine');check(g.facAvoid?.id===other.id,'blocked enemy immediately reacquired');
   return {territoryCrossing:true,emptyPathIdle:true,blockedPursuitReturns:true};
  }''')
  assert not errors,errors;print('PASS',result);await b.close()

asyncio.run(main())
