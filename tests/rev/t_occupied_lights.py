"""Awake rooms are lit, switches remain physical, and old/new saves retain blackouts."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.officeReady()')
  result=await q.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)},rows=[];let fixtureCount=0;
   const start=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S;};
   for(const id of ['tB','p0','e2','m2','m4','m6','m7','m5','n1']){const S=start(id);let awake=0;
    for(const g of S.guards){if(g.z||g.dog||['DEAD','SLEEP','CAPTIVE'].includes(g.state))continue;const bi=G.bldAt(g.x/48|0,g.y/48|0),b=G.BLD[bi];if(!b||b.vacant)continue;awake++;check(G.lightAtG(g.x,g.y,g.fl)>=.2,id+' awake person in unlit room '+g.id);}
    const added=S.lamps.filter(l=>l.occupiedLight);for(const l of added){const f=l.fixture;G.setLayer(l.fl||0);check(l.control&&l.roomSwitch&&f,id+' unmounted fixture');check(Number.isFinite(f.x)&&Math.hypot(l.x-f.x,l.y-f.y)<100,id+' emitter separated from fixture');const wx=(f.x-f.nx*24)/48|0,wy=(f.y-f.ny*24)/48|0;check(G.tileG(wx,wy)==='#',id+' fixture has no wall');fixtureCount++;}
    const coords=JSON.stringify(S.lamps.map(l=>[l.x,l.y,l.off,l.broken]));G.syncOccupiedLights();check(coords===JSON.stringify(S.lamps.map(l=>[l.x,l.y,l.off,l.broken])),'non-idempotent occupied lighting '+id);rows.push({id,awake,added:added.length});
   }
   let S=start('m4'),l=S.lamps.find(l=>l.occupiedLight);check(l,'no residential fixture');const circuit=l.circuit;G.setLampCircuit(l,true);S.player.hp=2;S.items[0].got=true;G.saveCheckpoint();check(G.loadCheckpoint(),'new checkpoint rejected');S=G.S;check(S.player.hp===2&&S.items[0].got,'progress lost');check(S.lamps.filter(l=>l.circuit===circuit).every(l=>l.off),'blackout relit on restore');
   // Simulate a pre-v249 checkpoint, preserving the actual saved state and grid.
   G.saveCheckpoint();delete G.CP.S.occupiedLightVersion;G.CP.S.lamps=G.CP.S.lamps.filter(l=>!l.occupiedLight);const old=G.CP.S.lamps.find(l=>!l.outdoor&&!l.hearth);old.off=true;old.broken=true;const at={x:old.x,y:old.y,fl:old.fl||0};check(G.loadCheckpoint(),'legacy checkpoint rejected');S=G.S;const restored=S.lamps.find(l=>l.x===at.x&&l.y===at.y&&(l.fl||0)===at.fl);check(restored.off&&restored.broken,'migration undoes broken/off lamp');check(S.player.hp===2&&S.items[0].got,'legacy progress lost');
   const bi=G.bldAt(at.x/48|0,at.y/48|0);check(!S.lamps.some(l=>l.occupiedLight&&(l.fl||0)===at.fl&&G.bldAt(l.x/48|0,l.y/48|0)===bi),'legacy blackout bypassed by new lamps');
   return{rows,fixtureCount,savedBlackouts:true,legacyProgress:true};}''')
  assert not errors,errors;print('PASS occupied lighting',json.dumps(result),flush=True);await b.close()
asyncio.run(main())
