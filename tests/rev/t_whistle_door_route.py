"""Controlled two-room fixture using real door, noise and NPC navigation functions."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear();localStorage.setItem("yahaeng.ch",JSON.stringify({tB:{_clear:true},p0:{_clear:true}}));localStorage.setItem("yahaeng.skillTree.v1",JSON.stringify({schema:1,rewardVersion:152,legacyPoints:0,learned:["silentHands","ambush"]}))');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('window.__game?.officeReady()',polling=100)
  r=await q.evaluate('''()=>{
   const G=__game,ok=(v,m)=>{if(!v)throw Error(m)};G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.guards=[g];S.cams=[];S.lamps=[];S.facOn=false;S.corpses=[];G.setLayer(0);
   for(let y=3;y<=14;y++)for(let x=6;x<=17;x++)G.G0[y][x]=x===6||x===17||y===3||y===14||y===8?'#':'.';G.G0[7][10]='#';G.G0[8][12]='.';
   const d={tx:12,ty:8,x:12.5*48,y:8.5*48,fl:0,orig:'.',locked:false,keyLock:null};d.group=[d];S.doors=[d];G.setDoor(d,true);
   Object.assign(P,{x:10*48-12,y:8*48-36,fl:0,z:0,cover:{x:-1,y:0},mode:'sneak',hidden:false,hide:null,under:null,vent:null,trav:null,light:.05});Object.assign(g,{x:12.5*48,y:9.5*48,fl:0,z:0,a:0,want:0,state:'PATROL',seen:false,meter:0,radio:false,torch:false,chat:null,act:null,post:0,wait:999,route:[{x:12.5*48,y:9.5*48,pause:999}],ri:0});
   G.whistle();const n=S.noises.at(-1),at=g.soundApproach;ok(n.heard&&n.investigators?.includes(g.id),'guard does not hear the whistle through the door');ok(at&&at.y<d.y&&Math.hypot(at.x-g.x,at.y-g.y)>40,'cover lure selects standing still instead of reachable contact across door');ok(d.locked,'planning remotely opens door');let work=false,frames=0;
   for(;frames<300;frames++){S.t+=.05;G.updateNpcDoors(.05);G.updateGuard(g,.05);if(g.doorWork){ok(Math.hypot(g.x-d.x,g.y-d.y)<44,'guard opens from a distance');work=true;}if(!d.locked)break;}
   ok(work&&!d.locked,'guard never approaches and physically opens the permitted door');return{heard:true,contact:at,doorOpenedAtContact:true,seconds:frames*.05};
  }''');o=R/'build/perception-v252';o.mkdir(exist_ok=True);(o/'whistle-door.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print('PASS whistle through door',r);await b.close()
asyncio.run(main())
