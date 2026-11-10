"""All public objectives reachable through floor/stair geometry with doors opened.
This is a structural access audit, not a live stealth playthrough or key-acquisition test.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/play-v255';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('window.__game?.officeReady()',polling=100)
  rows=await q.evaluate('''()=>{
   const G=__game,rows=[],ok=(v,m)=>{if(!v)throw Error(m)};
   for(const id of ['tB','p0','e2','m2','m4','m6','m7','m5','n1']){
    G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;
    for(const d of S.doors)G.setDoor(d,false);
    const key=(x,y,f)=>f+':'+x+','+y,blocked=[],edges=new Map(),node=(p,f)=>[Math.floor(p.x/48),Math.floor(p.y/48),f],link=(a,b)=>{const k=key(...a);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(b);};
    for(let f=0;f<G.GF.length;f++){if(f&&!G.GF[f])continue;G.setLayer(f);blocked[f]=Array.from({length:G.MH},(_,y)=>Array.from({length:G.MW},(_,x)=>G.solidAt(x,y)&&!(f===0&&G.tileG(x,y)==='S')));}
    for(const l of S.ladders.filter(l=>l.kind==='fstair')){const lo=G.stairLower(l),hi=G.stairUpper(l),a=node(lo.compact?lo.shaft:lo.up.entry,l.bfl||0),b=node(hi.down.entry,l.tfl);link(a,b);link(b,a);}
    const start=node(P,P.fl||0),queue=[start],seen=new Set([key(...start)]);
    for(let i=0;i<queue.length;i++){const[x,y,f]=queue[i],next=[[x-1,y,f],[x+1,y,f],[x,y-1,f],[x,y+1,f],...(edges.get(key(x,y,f))||[])];for(const a of next){const[x,y,f]=a,k=key(...a);if(seen.has(k)||x<0||y<0||x>=G.MW||y>=G.MH||!blocked[f]||blocked[f][y][x])continue;seen.add(k);queue.push(a);}}
    const items=[];
    for(const it of S.items){const f=it.fl||0;let reachable=false;
     for(let y=Math.floor(it.y/48)-2;y<=Math.floor(it.y/48)+2&&!reachable;y++)for(let x=Math.floor(it.x/48)-2;x<=Math.floor(it.x/48)+2&&!reachable;x++){
      if(!seen.has(key(x,y,f)))continue;Object.assign(P,{x:(x+.5)*48,y:(y+.5)*48,fl:f,z:0,hide:null,under:false,vent:null,carrying:null,captive:null});G.setLayer(f);if(G.nearLoot()===it)reachable=true;
     }ok(reachable,id+' objective inaccessible from the ground entrance: '+S.items.indexOf(it));items.push({index:S.items.indexOf(it),floor:f+1,furniture:it.furn});
    }
    for(const g of S.guards.filter(g=>g.target)){ok(queue.some(([x,y,f])=>f===(g.fl||0)&&Math.hypot((x+.5)*48-g.x,(y+.5)*48-g.y)<72),id+' target area unreachable');}
    rows.push({id,items,targets:S.guards.filter(g=>g.target).length,reachableCells:seen.size});
   }return rows;
  }''');assert not errors,errors;(O/'objective-access.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('PASS all 9 public objective access',json.dumps(rows),flush=True);await b.close()
asyncio.run(main())
