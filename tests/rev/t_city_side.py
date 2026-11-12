"""Free-mode side work and the garage.
- Taxi: in a taxi the action list offers '택시 영업 시작' next to '차에서 내리기'; a waving fare appears, boards when I stop
  beside them (door opens, they vanish into the car) and pays at the shop they named.
- Ambulance: same with a bleeding patient for the hospital; arriving too late kills the patient and pays nothing.
- Garage: a shuttered garage near the start. A car parked in its bay is driven in and stored; it can be taken out again,
  and the stored cars survive a restart of free mode (saved with the free-mode progress)."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=(s,f)=>{for(let t=0;t<s;t+=1/60){G.update(1/60);if(f&&f())break}};tick(.3);const S=G.S;S.cash=0;S.wanted=0;
  S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  for(const g of S.guards)if(g.fac&&!g.civ&&!g.police&&!g.contact){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}
  window.CAR=type=>{const P=S.player,v=G.traffic.makeVehicle({type,x:P.x,y:P.y,parked:true});v.unlocked=true;S.vehicles.push(v);P.car=v;P.trav=null;v.ai=false;return v};
  window.LABELS=()=>G.events.cityActionList().map(a=>a.label);
  return !!S.garage}'''
RIDE = '''(late)=>{const G=__game,S=G.S,P=S.player,v=P.car,sd=S.side;tick(2.2);const f=sd.fare;if(!f)return {spawned:false};
  const g=f.g;v.x=g.x+50;v.y=g.y;v.v=0;P.x=v.x;P.y=v.y;tick(2);const aboard=f.aboard,gone=g.off;
  if(late)S.t+=f.limit+5;
  v.x=f.to.x+30;v.y=f.to.y;v.v=0;P.x=v.x;P.y=v.y;tick(1.2);
  return {spawned:true,aboard,gone,n:sd.n,cash:S.cash,dead:g.state==='DEAD',out:!g.off}}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        def ok(v, m):
            if not v: bad.append(m)
        ev = lambda js, *a: q.evaluate(js, *a)
        ok(await ev(SETUP), 'no garage placed')
        # 1) taxi
        lab = await ev("()=>{CAR('taxi');return LABELS()}"); print('taxi labels', lab)
        ok('택시 영업 시작' in lab and '차에서 내리기' in lab, 'taxi start / get out not both offered: %s' % lab)
        await ev("()=>__game.events.sideStart('taxi')")
        r = await ev(RIDE, False); print('taxi', r)
        ok(r.get('aboard') and r.get('gone') and r.get('n') == 1 and r.get('cash', 0) >= 40 and r.get('out'), 'taxi ride: %s' % r)
        # 2) ambulance, late -> patient dies, no pay
        c0 = r.get('cash', 0)
        await ev("()=>{const S=__game.S;S.side=null;S.player.car=null;CAR('ambulance');__game.events.sideStart('amb')}")
        r = await ev(RIDE, True); print('ambulance late', r)
        ok(r.get('aboard') and r.get('dead') and r.get('n') == 0 and r.get('cash') == c0, 'late patient: %s' % r)
        # 3) garage: store, survive restart, take out
        r = await ev('''()=>{const G=__game,S=G.S,P=S.player;S.side=null;P.car=null;const v=CAR('sport');const Gr=S.garage;
          v.x=(Gr.bay.x0+Gr.bay.x1)/2;v.y=Gr.bay.y0+60;v.v=0;P.x=v.x;P.y=v.y;const lab=LABELS();
          const a=G.events.cityActionList().find(a=>a.label==='차고에 넣기');a&&a.fn();tick(2.5);
          return {lab,cars:Gr.cars.length,inList:S.vehicles.includes(v),onFoot:!P.car,saved:JSON.parse(localStorage.getItem('yahaeng.free1')||'{}').garage}}''')
        print('store', r)
        ok('차고에 넣기' in r['lab'] and r['cars'] == 1 and not r['inList'] and r['onFoot'] and r['saved'] and r['saved'][0]['type'] == 'sport', 'garage store: %s' % r)
        r = await ev('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();tick(.3);const S=G.S,P=S.player,Gr=S.garage;
          const n0=Gr.cars.length;P.car=null;P.x=Gr.x;P.y=Gr.base+30;tick(.05);const lab=LABELS();G.events.garageTake(0);tick(2);
          const v=S.vehicles.find(v=>v.type==='sport'&&v.bought);return {n0,lab,after:Gr.cars.length,out:!!v,outY:v&&Math.round(v.y-Gr.base)}}''')
        print('take', r)
        ok(r['n0'] == 1 and any('꺼내기' in l for l in r['lab']) and r['after'] == 0 and r['out'] and r['outY'] > 40, 'garage take after restart: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
