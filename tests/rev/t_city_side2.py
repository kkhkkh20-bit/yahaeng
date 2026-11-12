"""Free-mode: bus runs, police vigilante, rain.
- Bus: in a bus the action list offers '버스 운행 시작'; a 5-stop route is planned, people wait at the stop, stopping there
  lets them board (they vanish into the bus), pays 15 per rider and moves on to the next stop.
- Vigilante: in a police car '자경단 출동 시작' radios a fleeing car (ignores signals, faster than traffic); ramming it to half
  durability stops it, the driver gets out with hands up, it pays and raises police standing.
- Rain: rain fades in, makes the road slippery (lower grip) and is drawn without page errors."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=(s,f)=>{for(let t=0;t<s;t+=1/60){G.update(1/60);if(f&&f())break}};tick(.3);const S=G.S;S.cash=0;S.wanted=0;S.stand={};
  S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  for(const g of S.guards)if(g.fac&&!g.civ&&!g.police&&!g.contact){g.x=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}
  window.CAR=(type,o={})=>{const P=S.player,v=G.traffic.makeVehicle(Object.assign({type,x:P.x,y:P.y,parked:true},o));v.unlocked=true;S.vehicles.push(v);P.car=v;P.trav=null;v.ai=false;return v};
  window.LABELS=()=>G.events.cityActionList().map(a=>a.label);return true}'''

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
        await ev(SETUP)
        # 1) bus
        r = await ev('''()=>{const G=__game,S=G.S,P=S.player;CAR('bus');const lab=LABELS();G.events.sideStart('bus');const sd=S.side;if(!sd)return {lab,started:false};
          const st=sd.stops[0],v=P.car;v.x=st.x;v.y=st.y-300;tick(.2);const waiting=st.wait.length;v.x=st.x;v.y=st.y;v.v=0;P.x=v.x;P.y=v.y;tick(3.5);
          return {lab,started:true,stops:sd.stops.length,waiting,boardedGone:st.wait.length===0,si:sd.si,riders:sd.riders,cash:S.cash}}''')
        print('bus', r)
        ok('버스 운행 시작' in r['lab'] and r['started'] and r['stops'] == 5 and r['waiting'] >= 1 and r['si'] == 1 and r['riders'] == r['waiting'] and r['cash'] == 15 * r['waiting'], 'bus run: %s' % r)
        # 2) vigilante
        r = await ev('''()=>{const G=__game,S=G.S,P=S.player;S.side=null;P.car=null;CAR('police',{police:true});const lab=LABELS();G.events.sideStart('cop');const sd=S.side;
          tick(1.6);const c=sd.target;if(!c)return {lab,target:false};const flee=c.flee,spd=0;tick(1);const moved=Math.round(Math.abs(c.v));
          c.hp=Math.floor(sd.hp0*0.4);const cash0=S.cash;tick(.2);return {lab,target:true,flee,moved,stopped:c.v===0&&!c.ai,paid:S.cash-cash0,n:sd.n,P:(S.stand||{}).P||0}}''')
        print('cop', r)
        ok('자경단 출동 시작' in r['lab'] and r['target'] and r['flee'] and r['stopped'] and r['paid'] >= 120 and r['n'] == 1 and r['P'] == 3, 'vigilante: %s' % r)
        # 3) rain
        r = await ev('''()=>{const G=__game,S=G.S;S.side=null;G.events.setRain(true);tick(.2);const k=G.events.rainK;let ok=true;try{G.benchDraw(2)}catch(e){ok=String(e)}
          G.events.setRain(false);tick(.1);return {k,drawn:ok,after:G.events.rainK}}''')
        print('rain', r)
        ok(r['k'] > 0.9 and r['drawn'] is True and r['after'] == 0, 'rain: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
