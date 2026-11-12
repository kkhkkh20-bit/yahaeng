"""Free-mode lists do not grow without bound: extra cars (events, chases) are dropped from S.vehicles once they are far away
and unused, while the original traffic and the car I drive stay. A temporary person who has been removed hands their slot in
S.guards to the next temporary person (people point at each other by index, so the list is never spliced). Dead temporary
people far away are cleared together with their corpse record after a while."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.5);const S=G.S,P=S.player,E=G.events,T=G.traffic,out={};
  const base=S.vehicles.length;E.cityListsCleanup();
  // 30 extra cars far away, one extra car near me, and one I drive far away from the rest
  const far=[],near=T.makeVehicle({x:P.x+120,y:P.y,parked:true});S.vehicles.push(near);
  for(let i=0;i<30;i++){const v=T.makeVehicle({x:P.x+2600+i*10,y:P.y+2600,parked:true});v.evt='test';S.vehicles.push(v);far.push(v);}
  S.cleanAt=0;E.cityListsCleanup();out.cars={base,after:S.vehicles.length,nearKept:S.vehicles.includes(near),farGone:far.every(v=>!S.vehicles.includes(v))};
  // slot reuse: a removed temporary person gives their index to the next one
  const n0=S.guards.length,g=S.guards.find(g=>g.civ&&!g.off);g.evt='test';E.evGone(g);const i=S.guards.indexOf(g);
  out.slot={free:E.cityGuardSlot()===i,len:S.guards.length===n0};
  // a referenced (corpse) slot is not reused
  S.corpses.push({g,guardId:i,x:0,y:0});out.slot.keptForCorpse=E.cityGuardSlot()!==i;S.corpses.pop();
  // dead temporary person far away: cleared after 45 s
  const d=S.guards.find(o=>o.civ&&!o.off&&o!==g);d.evt='test';G.npcDown(d,null,true);d.x=P.x+3000;d.y=P.y+3000;const c0=S.corpses.filter(c=>c.g===d||c.guardId===d.id).length;
  S.cleanAt=0;E.cityListsCleanup();S.t+=50;S.cleanAt=0;E.cityListsCleanup();
  out.dead={had:c0,left:S.corpses.filter(c=>c.g===d||c.guardId===d.id).length,off:!!d.off};
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(r); await b.close()
    def ok(v, m):
        if not v: bad.append(m)
    c = r['cars']; ok(c['after'] == c['base'] + 1 and c['nearKept'] and c['farGone'], 'extra cars not cleaned: %s' % c)
    s = r['slot']; ok(s['free'] and s['len'] and s['keptForCorpse'], 'guard slot reuse: %s' % s)
    d = r['dead']; ok(d['had'] >= 1 and d['left'] == 0 and d['off'], 'far dead temp person not cleared: %s' % d)
    if errs: bad.append('page errors %s' % errs[:3])
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
