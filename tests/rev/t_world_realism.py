"""Grounded access, local circuits, useful security and projectile persistence."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/world-v144';O.mkdir(exist_ok=True)
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game')
  data=await q.evaluate('''()=>{
   const G=__game,check=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();G.setLayer(0);return G.S},result={worlds:[],projectiles:[],legacy:true};
   for(const id of ['m1','m2','m3','m4','m5','m6','city']){
    const S=fresh(id),P=S.player;G.update(.01); // includes the real window initialization
    check(!S.ladders.some(l=>l.gas||l.kind==='balc'||l.kind==='chimney'),'unsupported access '+id);
    check(!S.ladders.some(l=>l.kind==='ladder'&&G.G0[l.ty][l.tx]==='U'),'cargo ladder remains '+id);
    check(S.hides.filter(h=>!h.furn).every(h=>h.cap===1),'unbounded body storage '+id);
    check(!S.traps.some(t=>t.auto),'every sign is still an automatic assassination '+id);
    check(S.windows.every(w=>w.st!=='open'),'guaranteed free open window '+id);
    const poles=S.poles.filter(o=>o.wires.length);for(const o of poles){Object.assign(P,{x:o.x,y:o.y+20,fl:0,z:0,wire:null,trav:null,hide:null,under:null,vent:null});check(!G.nearPole(),'live utility cable offered as route '+id)}
    // Every building retains a deliberate staircase; removing shortcuts must not strand objectives.
    G.lvlInit();for(const B of G.BLD.filter(b=>b.plan&&!b.vacant&&b.h>0))check(S.ladders.some(l=>['stair','fstair'].includes(l.kind)&&l.tx>=B.x0&&l.tx<=B.x1&&l.ty>=B.y0&&l.ty<=B.y1),'no staircase after access cleanup '+id+' '+JSON.stringify(B));
    if(G.STAGE.powerArea&&G.STAGE.fuse){
     const lamps=S.lamps.filter(l=>l.outdoor&&!l.off&&!l.broken),inside=lamps.find(l=>{S.lightsOn=false;const v=G.mainPowerOff(l);S.lightsOn=true;return v}),outside=lamps.find(l=>{S.lightsOn=false;const v=!G.mainPowerOff(l);S.lightsOn=true;return v});
     check(inside,'no authored circuit lights '+id);S.lightsOn=false;check(!G.lampOn(inside),'circuit does not switch off its lights '+id);if(outside)check(!G.mainPowerOff(outside),'unrelated street blacks out '+id);S.lightsOn=true;
    }
    result.worlds.push({id,access:S.ladders.length,storage:S.hides.filter(h=>!h.furn).length,windows:S.windows.length});
   }
   // The displayed screenshot's loading areas: cargo cannot bridge the perimeter.
   fresh('m3');check(G.G0[23][8]==='#'&&G.G0[24][8]==='#','cargo still overwrites garden wall');
   fresh('m5');check(G.G0[2][36]==='#'&&G.G0[2][37]==='#','cargo still overwrites garage wall');
   fresh('m4');check(G.G0[12][14]!=='U'&&G.G0[20][17]==='U','cargo not moved off street into loading lot');
   // A real old checkpoint gets the new exterior while keeping health, objectives and stored bodies.
   {
    const S=fresh('m4'),P=S.player;P.hp=2;const h=S.hides.find(h=>h.type==='well');h.bodies=3;G.saveCheckpoint();const at={...G.CP.S.items[0]};
    G.CP.grids[0][12][14]='U';G.CP.grids[0][12][17]='L';G.CP.grids[0][20][17]=',';G.CP.S.hides.find(x=>x.tx===h.tx&&x.ty===h.ty).cap=99;
    check(G.loadCheckpoint(),'checkpoint rejected');check(G.G0[12][14]!=='U'&&G.G0[12][17]!=='L'&&G.G0[20][17]==='U','old cargo layout returns');
    const restored=G.S.hides.find(x=>x.tx===h.tx&&x.ty===h.ty);check(restored.cap===1&&restored.bodies===3&&G.S.player.hp===2&&G.S.items[0].got===at.got,'migration loses bodies, health or objective progress');
   }
   // Actual firing and impact: facilities are not dart targets, moving/floor-changing people can be missed.
   for(const outcome of ['hit','moved','floor']){
    const S=fresh('m2'),P=S.player,g=S.guards.find(g=>!g.civ&&!g.dog&&!g.target);S.guards=[g];S.facOn=false;S.corpses=[];S.t=10;
    Object.assign(P,{x:1800,y:504,fl:0,z:0,under:false,hide:null,vent:null,trav:null,pick:null,interact:null,strikeT:0,a:0,kunai:2,bodyAnim:null});Object.assign(g,{x:P.x+96,y:P.y,fl:0,z:0,state:'PATROL'});G.setLayer(0);
    const lamp={x:P.x+64,y:P.y,fl:0,z:0,r:150,outdoor:false,off:false,broken:false},cam={x:P.x+70,y:P.y,fl:0,z:0,broken:false};S.lamps=[lamp];S.cams=[cam];
    check(G.kunaiTarget()?.ref===g,'facility steals dart aim');const count=P.kunai;G.actKunai({type:'lamp',ref:lamp,x:lamp.x,y:lamp.y});check(P.kunai===count&&!S.kunais.length&&!lamp.broken,'forced facility target consumes dart or breaks lamp');
    G.actKunai();check(S.kunais.length===1&&P.kunai===count-1,'real dart did not launch');if(outcome==='moved')g.x+=80;if(outcome==='floor')g.fl=1;G.kunaiHit(S.kunais[0]);
    check(outcome==='hit'?S.corpses.length===1&&S.corpses[0].ko:g.state!=='DEAD'&&S.corpses.length===0,'dart does not respect impact position/floor '+outcome);result.projectiles.push(outcome);
   }
   // Duty and alarm priorities cannot be bypassed with a cigarette pack.
   {
    const S=fresh('m2'),P=S.player,base=S.guards.find(g=>!g.civ&&!g.dog&&!g.target&&!g.elite);S.facOn=false;S.corpses=[];S.decals=[];P.under=true;P.hide=null;P.vent=null;
    const make=(n,extra)=>({...base,id:n,x:1800,y:504,fl:0,z:0,a:0,want:0,state:'PATROL',wait:999,post:null,path:null,chat:null,act:null,smoker:true,lureScan:0,lureTaken:false,...extra});
    for(const mode of ['non-smoker','posted','alarm','smoker']){const g=make(900,{smoker:mode!=='non-smoker',post:mode==='posted'?0:null});S.guards=[g];S.alevel=mode==='alarm'?1:0;S.lures=[{x:1860,y:504,fl:0,landed:true,claim:null}];G.setLayer(0);G.updateGuard(g,.01);check(mode==='smoker'?g.state==='LURE':g.state!=='LURE','inappropriate cigarette distraction '+mode);}
   }
   // Cutting party lights does not make the VIP investigate an obvious trap alone.
   {const S=fresh('m3'),boss=S.guards.find(g=>g.tag==='boss');const route=boss.route;G.STAGE.onLightsOut(S,{say:()=>{},detour:()=>{throw Error('VIP still sent to generator')}});check(boss.route===route,'VIP route replaced by power bait');}
   return result;
  }''')
  assert not errors,errors;(O/'mechanics.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));print('PASS grounded worlds',json.dumps(data,ensure_ascii=False),flush=True);await b.close()
if __name__=='__main__':asyncio.run(main())
