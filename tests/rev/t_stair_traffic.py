"""Full-update stair traffic: occupied mouths, courtesy return and single-flight use."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/ai-v167';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  rows=await q.evaluate('''()=>{const G=__game,rows=[],check=(v,m)=>{if(!v)throw Error(m)};
   const fresh=()=>{G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();Object.assign(G.S.player,{under:true,x:100,y:100});G.lvlInit();return G.S};
   for(const kind of ['fstair','stair'])for(const reverse of [false,true])for(const civilian of [false,true]){
    const S=fresh(),edge=S.lvl.ends.find(e=>e.l.kind===kind),from=reverse?edge.B:edge.A,to=reverse?edge.A:edge.B,base=S.guards.find(g=>!g.civ&&!g.dog&&!g.target),tag=[kind,reverse,civilian].join(':');G.setLayer(from.fl);
    const sol=(from.z?G.solidFor(from.z):G.solidAt),d=[[2,0],[-2,0],[0,2],[0,-2]].find(([x,y])=>!sol(Math.floor(from.x/48)+x,Math.floor(from.y/48)+y)&&G.astar(Math.floor(from.x/48)+x,Math.floor(from.y/48)+y,Math.floor(from.x/48),Math.floor(from.y/48),sol).length);check(d,'No approach '+tag);
    const g={...base,id:990,...from,x:from.x+d[0]*48,y:from.y+d[1]*48,state:'SUSPICIOUS',poi:{...to},path:null,hop:null,climb:null,reached:false,wait:0,waitBase:8,chat:null,act:null,brawl:null,hunt:null,post:null,follow:null,securityBuddy:null,radio:false,homeFl:to.fl,route:[{...to,pause:999}]};
    const post={...base,id:991,...from,civ:civilian,club:civilian,still:true,post:0,state:'PATROL',path:null,hop:null,climb:null,wait:999,route:[{...from,pause:999}],follow:null,securityBuddy:null,radio:false,chat:null,act:null};S.guards=[g,post];let yielded=false,started=false,finished=false,moved=0,crosses=0;
    for(let n=0;n<900;n++){
     const before=S.guards.map(o=>({...G.gSpot(o)}));G.update(1/60);check(!S.over,'Unexpected game end '+tag);
     yielded=yielded||!!post.stairYield;started=started||!!g.climb;moved=Math.max(moved,Math.hypot(post.x-from.x,post.y-from.y));
     for(let i=0;i<2;i++){const o=S.guards[i],old=before[i];check(Math.hypot(o.x-old.x,o.y-old.y)<7,'Teleport '+tag);if(o.fl!==old.fl||o.z!==old.z){check(i===0&&o.climb,'Floor changes outside traversal '+tag);crosses++;}}
     if(!g.climb&&G.lvlKey(G.gSpot(g))===G.lvlKey(to)&&Math.hypot(g.x-to.x,g.y-to.y)<15){finished=true;break}
    }
    check(yielded&&moved>=24&&started&&finished&&crosses===1,'Blocked staircase '+JSON.stringify({tag,yielded,moved,started,finished,crosses,at:G.gSpot(g),post:G.gSpot(post)}));
    for(let n=0;n<600&&post.stairYield;n++)G.update(1/60);
    check(!post.stairYield&&Math.hypot(post.x-from.x,post.y-from.y)<2,'Post never restored '+tag);
    rows.push({kind,reverse,civilian,yielded,finished,postReturned:true,crosses});
   }
   // Two directions request the same flight; waiting is not a completed search.
   {
    const S=fresh(),e=S.lvl.ends.find(e=>e.l.kind==='fstair'),base=S.guards.find(g=>!g.civ&&!g.dog&&!g.target);
    const make=(id,from,to)=>({...base,...from,id,state:'SUSPICIOUS',poi:{...to},path:null,hop:null,climb:null,reached:false,wait:0,waitBase:999,follow:null,securityBuddy:null,post:null,radio:false,chat:null,act:null,brawl:null,hunt:null});
    const a=make(990,e.A,e.B),b=make(991,e.B,e.A);S.guards=[a,b];let waited=false;
    for(let n=0;n<900;n++){G.update(1/60);check(S.guards.filter(g=>g.climb?.stairs).length<=1,'Opposing actors share a flight');if(a.climb&&!b.climb){waited=true;check(!b.reached,'Waiting guard falsely completed its job')}if(!a.climb&&!b.climb&&a.fl===e.B.fl&&b.fl===e.A.fl)break;}
    check(waited&&a.fl===e.B.fl&&b.fl===e.A.fl&&!a.climb&&!b.climb,'Opposing traffic never passed');rows.push({opposingDirections:true,oneAtATime:true});
   }
   // Keep the authored NPC at the actual m2 roof stair; no guards/crowds disabled.
   {
    const S=fresh(),post=S.guards.find(g=>g.id===14),e=S.lvl.ends.find(e=>e.l.kind==='stair'&&Math.hypot(e.A.x-post.x,e.A.y-post.y)<1);check(e,'Actual posted stair fixture missing');
    const g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&g.id!==14&&Math.hypot(g.x-post.x,g.y-post.y)<500);check(g,'Missing nearby actual guard');
    Object.assign(g,{state:'SUSPICIOUS',poi:{...e.B},path:null,hop:null,climb:null,reached:false,wait:0,waitBase:8,chat:null,act:null,brawl:null,hunt:null,follow:null,securityBuddy:null,radio:false});let done=false;
    for(let n=0;n<1800&&!S.over;n++){G.update(1/60);if(!g.climb&&g.z===e.B.z&&Math.hypot(g.x-e.B.x,g.y-e.B.y)<28){done=true;break}}
    check(done,'Authored stair post still blocks the real guard');rows.push({authoredPost14:true,fullMissionUpdate:true,arrived:true});
   }
   return rows;}''')
  assert not errors,errors;(O/'traffic-checks.json').write_text(json.dumps(rows,indent=2));print('PASS stair traffic',len(rows),'scenarios',flush=True);await b.close()
asyncio.run(main())
