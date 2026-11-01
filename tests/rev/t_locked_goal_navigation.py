"""Same-floor navigation stops at a real blocking door and respects an open alternative."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();pg=await b.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));await pg.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!__game',polling=100)
  r=await pg.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},cases=[];
   for(const sid of ['m1','m2','m4','m5']){
    G.start(G.STAGES.findIndex(s=>s.id===sid));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];G.setLayer(0);
    for(const it of S.items.filter(i=>!i.fl)){
     const doors=S.doors.filter(d=>d.locked&&!d.fl&&G.bldAt(d.tx,d.ty)===it.b);if(!doors.length)continue;let tested=false;
     for(const d of doors){for(const [dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const x=d.tx+dx,y=d.ty+dy;if(G.solidAt(x,y))continue;Object.assign(P,{x:(x+.5)*48,y:(y+.5)*48,fl:0,z:0});delete S.goalNavCache;const goal={x:it.x,y:it.y,fl:0,text:'item'},nav=G.goalNavigation(goal);if(!nav.locked)continue;
      check(S.doors.some(v=>v.locked&&v.x===nav.x&&v.y===nav.y),'marker invents door');const before=[nav.x,nav.y];
      const reached=S.doors.find(v=>v.x===nav.x&&v.y===nav.y);reached.group.forEach(v=>{v.locked=false;G.G0[v.ty][v.tx]=v.orig});
      S.t+=.6;const after=G.goalNavigation(goal);check(!after.locked||after.x!==before[0]||after.y!==before[1],'opened door remains navigation target');cases.push({sid,door:before});tested=true;break;
     }if(tested)break;}
    }
   }
   check(cases.some(c=>c.sid==='m2')&&cases.some(c=>c.sid==='m4'),'missing real vaults');
   G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();G.setLayer(0);let alternate=false;
   for(let y=2;y<G.MH-2&&!alternate;y++)for(let x=2;x<G.MW-3&&!alternate;x++){
    if(G.bldAt(x,y)!==0||![[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]].every(([dx,dy])=>!G.solidAt(x+dx,y+dy)))continue;
    const d={tx:x+1,ty:y,x:(x+1.5)*48,y:(y+.5)*48,fl:0,locked:true,orig:G.G0[y][x+1]};d.group=[d];G.S.doors.push(d);G.G0[y][x+1]='X';Object.assign(G.S.player,{x:(x+.5)*48,y:(y+.5)*48,fl:0,z:0});delete G.S.goalNavCache;
    const nav=G.goalNavigation({x:(x+2.5)*48,y:(y+.5)*48,fl:0});check(!nav.locked,'locked door overrides an open nearby route');alternate=true;
   }
   check(alternate,'no open-alternative fixture');return{vaults:cases,openAlternative:true};
  }''')
  assert not errors,errors;print('PASS door navigation',json.dumps(r),flush=True);await b.close()
asyncio.run(main())
