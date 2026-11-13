"""Free-mode heat and records.
- ★5 held for 20 s: a police helicopter flies in (the last card); while its searchlight is on me the wanted level cannot drain; below ★4 it leaves.
- ★3 while driving: a roadblock of police cars across the road ahead (out of view).
- Records: stealing a car counts, the first-car achievement pays 20 and both are saved; the pause menu shows
  '자유 모드 기록 · 업적' only in free mode and opens the records panel."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]

async def main():
    bad = []
    def ok(v, m):
        if not v: bad.append(m)
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
          for(const g of S.guards)if(g.police&&!g.contact){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];}}''')
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.wanted=5;S.w5T=21;S.copT=1e9;tick(.1);const spawned=!!G.events.heli;tick(5);const H=G.events.heli;
          const d=H?Math.round(Math.hypot(H.x-P.x,H.y-P.y)):-1;S.wantLost=5;tick(.5);const held=S.wantLost<0.5;
          S.wanted=2;tick(8);return {spawned,d,lit:H&&H.lit,held,gone:!G.events.heli}}''')
        print('heli', r); ok(r['spawned'] and r['d'] < 300 and r['held'] and r['gone'], 'helicopter: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.wanted=3;S.heli=null;const v=G.traffic.makeVehicle({type:'sedan',x:P.x,y:P.y,parked:true});v.unlocked=true;S.vehicles.push(v);P.car=v;v.ai=false;
          const n0=S.vehicles.filter(c=>c.roadblock).length;for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){v.a=a;S.blockT=0;tick(.05);if(S.vehicles.some(c=>c.roadblock))break;}
          return {blocks:S.vehicles.filter(c=>c.roadblock).length-n0}}''')
        print('roadblock', r); ok(r['blocks'] >= 2, 'no roadblock: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.wanted=0;S.cuffs=null;P.cuffed=false;P.car=null;S.cash=0;S.cashSeen=0;const v=G.traffic.makeVehicle({type:'sedan',x:P.x+30,y:P.y,parked:true});v.unlocked=true;S.vehicles.push(v);
          G.traffic.carEnter(v);tick(2);const saved=JSON.parse(localStorage.getItem('yahaeng.free1')||'{}');
          return {stolen:G.events.fst.carsStolen,ach:!!G.events.fach.firstCar,cash:S.cash,saved:{st:saved.st&&saved.st.carsStolen,ach:saved.ach&&saved.ach.firstCar}}}''')
        print('records', r); ok(r['stolen'] == 1 and r['ach'] and r['cash'] >= 20 and r['saved']['st'] == 1 and r['saved']['ach'], 'records/achievement: %s' % r)
        r = await q.evaluate('''()=>{document.getElementById('btnPause').click();const b=document.getElementById('btnFreeStats');const vis=!!b.offsetWidth;b.click();
          const p=document.getElementById('shopPanel');return {vis,panel:!!p&&p.textContent.includes('자유 모드 기록')}}''')
        print('panel', r); ok(r['vis'] and r['panel'], 'records panel: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
