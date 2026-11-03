"""Real detection -> native stair entry -> lost sight -> physical floor pursuit."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/ai-v167';O.mkdir(exist_ok=True)
async def main():
 rows=[]
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  for stage in ['m1','m2','m3','m4','m5','m6']:
   count=await q.evaluate('''id=>{__game.start(__game.STAGES.findIndex(s=>s.id===id));return __game.S.ladders.filter(l=>l.kind==='fstair').length}''',stage)
   for index in range(count):
    for reverse in [False,True]:
     setup=await q.evaluate('''([stage,index,reverse])=>{
      const G=__game;G.start(G.STAGES.findIndex(s=>s.id===stage));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;G.lvlInit();const e=S.lvl.ends.filter(e=>e.l.kind==='fstair')[index],entry=reverse?e.B:e.A,to=reverse?e.A:e.B,lo=G.stairFloor(e.l.tx,e.l.ty,e.l.bfl||0),from=!reverse&&lo.compact?{...entry,...lo.shaft}:entry,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);G.setLayer(from.fl);
      Object.assign(P,{...from,light:1,mode:'walk',hidden:false,hide:null,under:null,vent:null,cover:null,strikeT:.3});
      const side=[[2,0],[-2,0],[0,2],[0,-2],[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>!G.solidAt(Math.floor(from.x/48)+dx,Math.floor(from.y/48)+dy)&&G.los(from.x+dx*48,from.y+dy*48,from.x,from.y));if(!side)throw Error('No visible stair approach '+JSON.stringify({stage,index,reverse,from}));
      Object.assign(g,{...from,x:from.x+side[0]*48,y:from.y+side[1]*48,a:Math.atan2(-side[1],-side[0]),want:Math.atan2(-side[1],-side[0]),state:'PATROL',wait:999,post:0,follow:null,securityBuddy:null,radio:false,path:null,hop:null,climb:null,chat:null,brawl:null,hunt:null,still:true,meter:0});S.guards=[g];G.updateGuard(g,.01);if(g.state!=='ALERT'||!g.seen)throw Error('No real sighting '+JSON.stringify({stage,index,reverse}));P.strikeT=0;window.fixture={S,P,g,e,from,to};const d=G.stairFloor(e.l.tx,e.l.ty,from.fl).d;return{key:d[0]?(d[0]>0?'ArrowLeft':'ArrowRight'):(d[1]>0?'ArrowUp':'ArrowDown')};}''',[stage,index,reverse])
     await q.keyboard.down(setup['key'])
     await q.evaluate('''()=>{for(let i=0;i<200&&!__game.S.player.trav;i++)__game.update(1/60);if(!__game.S.player.trav?.stairs)throw Error('Keyboard stair entry failed')}''');await q.keyboard.up(setup['key'])
     result=await q.evaluate('''()=>{
      const G=__game,{S,P,g,e,from,to}=fixture;let witnessed=false,crossed=false,started=false,arrived=false,n=0;const began=S.t;
      for(;n<900&&!S.over;n++){
       const x=g.x,y=g.y;G.update(1/60);if(Math.hypot(g.x-x,g.y-y)>8)throw Error('Pursuer teleports');
       witnessed=witnessed||g.lastSeen?.viaStair===P.trav?.stairs?.key&&!!g.lastSeen?.viaStair;
       if(!P.trav){crossed=P.fl===to.fl;P.under=true;}
       started=started||!!g.climb?.stairs;
       if(!g.climb&&g.fl===to.fl&&Math.hypot(g.x-to.x,g.y-to.y)<28){arrived=true;break;}
      }
      if(!crossed||!witnessed||!started||!arrived)throw Error('Lost floor pursuit '+JSON.stringify({from,to,crossed,witnessed,started,arrived,guard:G.gSpot(g),lastSeen:g.lastSeen,state:g.state}));
      const memory=JSON.stringify(g.lastSeen);Object.assign(P,{x:100,y:100,fl:0,z:0,under:true});for(let i=0;i<30;i++)G.update(1/60);if(JSON.stringify(g.lastSeen)!==memory)throw Error('Learns unseen player location');
      return{from,to,witnessed,crossed,physicalPursuit:true,seconds:n/60,memoryPreserved:true};}''')
     rows.append({'stage':stage,'flight':index,'reverse':reverse,**result})
   print('PASS witnessed stairs',stage,count*2,'native floor changes',flush=True)
  assert not errors,errors;(O/'witness-checks.json').write_text(json.dumps(rows,indent=2));await b.close();print('PASS',len(rows),'witnessed up/down pursuits; unseen later movement never updates memory')
asyncio.run(main())
