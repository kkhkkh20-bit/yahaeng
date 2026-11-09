"""Placement, physical passage and saved hidden bodies; no AI or mission-completion claims."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.officeReady()',polling=100)
  r=await q.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)},rows=[];let cabinets=0,moves=0,fronts=0;
   const start=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S;};
   for(const stage of G.STAGES){if(stage.artSlice)continue;const S=start(stage.id);let n=0;
    for(const h of S.hides.filter(h=>h.furn&&h.type!=='bed')){G.setLayer(h.fl||0);check(G.cabinetFrontStand(h),'cabinet blocked '+stage.id+':'+h.tx+','+h.ty+','+(h.fl||0));cabinets++;}
    G.setLayer(0);for(const m of stage.walkwayFinish||[]){const[x,y]=m.from,[nx,ny]=m.to;check(!G.solidAt(x,y),'old obstruction remains '+stage.id+' '+m.from);check(G.tileG(nx,ny)===m.tile,'prop art/collision missing '+stage.id+' '+m.to);check(!G.solidAt(nx,ny+1),'new prop front blocked');check([[0,-1],[-1,0],[1,0]].some(([dx,dy])=>G.tileG(nx+dx,ny+dy)==='#'),'prop still floating in junction');
     if(m.tile==='H'){const h=S.hides.find(h=>h.tx===nx&&h.ty===ny&&!h.furn);check(h,'body container not moved with grid');Object.assign(S.player,{x:nx*48+24,y:(ny+1)*48+24,fl:0,z:0,hide:null});check(G.hideApproach(h),'new container cannot be approached');fronts++;}n++;moves++;}
    rows.push({id:stage.id,moves:n,floors:G.GF.filter(Boolean).length+1});
   }
   check(moves===17,'placement review incomplete');
   start('m2');G.setLayer(0);check([[25,15],[27,16],[5,16],[7,17]].every(([x,y])=>G.tileG(x,y)==='C'),'authored assassination/uniform cover removed');for(let y=17;y<=19;y++)for(let x=25;x<=30;x++)check(!G.solidAt(x,y),'front gate turning space blocked '+x+','+y);
   // Existing tutorial cover is intentional, and remains part of its lesson.
   start('tB');G.setLayer(0);check([6,7,8].every(x=>G.tileG(x,9)==='C'),'first approach loses authored cover');
   // The storage aisle is two cells wide; both visual modules and collision agree.
   for(const[id,x,y,w]of [['m2',15,29,2],['m6',25,19,3],['m6',25,21,3]]){start(id);G.setLayer(0);const f=G.FURN.find(f=>f.t==='shelf'&&f.x===x&&f.y===y&&!f.fl);check(f?.w===w,'shelf geometry not updated');check(!G.solidAt(x+w,y)&&!G.solidAt(x+w+1,y),'storage aisle still pinched');}
   start('m4');G.setLayer(0);check(!G.solidAt(26,20)&&!G.solidAt(27,20),'shared dining aisle blocked');
   // A v249 save may contain a hidden player and a KO body inside the moved bin.
   let S=start('m6'),m=G.STAGE.walkwayFinish.find(m=>m.tile==='H'),[x,y]=m.from,[nx,ny]=m.to,h=S.hides.find(h=>!h.furn&&h.tx===nx&&h.ty===ny);S.player.hp=2;S.items[0].got=true;h.bodies=1;S.player.hide=h;S.player.hidden=true;S.player.x=h.x;S.player.y=h.y;S.corpses.push({x:h.x,y:h.y,fl:0,z:0,stashed:true,container:h,ko:true});G.saveCheckpoint();let cp=G.CP;cp.grids[0][y][x]='H';cp.grids[0][ny][nx]=m.targetFloor;h=cp.S.hides.find(h=>!h.furn&&h.tx===nx&&h.ty===ny);Object.assign(h,{tx:x,ty:y,x:x*48+24,y:y*48+24});for(const o of[cp.S.player,...cp.S.corpses])if(o.hide===h||o.container===h){o.x=h.x;o.y=h.y;}
   check(G.loadCheckpoint(),'legacy save rejected');S=G.S;check(S.player.hp===2&&S.items[0].got&&S.player.hide.tx===nx&&S.player.hide.ty===ny,'save loses progress or hides player at old bin');check(S.corpses.at(-1).container===S.player.hide&&S.corpses.at(-1).x===S.player.x&&S.corpses.at(-1).y===S.player.y&&S.corpses.at(-1).ko&&S.player.hide.bodies===1,'hidden body did not migrate with its container');
   // An actor standing where the relocated prop now belongs is placed next to it.
   S=start('m6');G.saveCheckpoint();cp=G.CP;cp.grids[0][y][x]='H';cp.grids[0][ny][nx]=m.targetFloor;Object.assign(cp.S.player,{x:nx*48+24,y:ny*48+24,hp:2});check(G.loadCheckpoint(),'standing save rejected');G.setLayer(0);check(!G.solidAt(G.S.player.x/48|0,G.S.player.y/48|0)&&G.S.player.hp===2,'restored actor stuck in new prop');
   return{worlds:rows.length,moves,cabinets,usableMovedContainers:fronts,rows,oldSaveBodyAndProgress:true};}''')
  assert not errors,errors;print('PASS walkway clearance',json.dumps(r),flush=True);await b.close()
asyncio.run(main())
