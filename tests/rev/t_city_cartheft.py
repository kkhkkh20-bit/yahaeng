"""Free-mode car theft and car fire: most parked cars are locked. With a lockpick the player crouches at the door and picks it
quietly (uses one pick, no alarm); without one the window is smashed (fast, glass on the ground, the alarm sounds). A car the player
has been in stays unlocked. Driving: no outline on my own car, and the heading settles onto the road grid when I let go of
the wheel. A car explosion sets the people around it on fire: they scream, run and then die charred."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SETUP = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  window.tick=(s,f)=>{for(let t=0;t<s;t+=1/60){G.update(1/60);if(f&&f())break}};tick(.3);const S=G.S;S.wanted=0;
  S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;
  for(const g of S.guards)if(g.civ||g.police||g.fac){g.x=-9000;g.y=-9000;g.route=[{x:-9000,y:-9000,pause:999}];g.path=null;}  // nobody watching
  window.LOCKED=S.vehicles.filter(v=>v.parked&&!v.police&&!v.forSale&&!v.dead&&((v.id*2654435761)>>>0)%100<80);
  {const far=(v,o)=>Math.hypot(v.x-o.x,v.y-o.y)>500;const a=LOCKED[0],b=LOCKED.find(v=>far(v,a)),c=LOCKED.find(v=>far(v,a)&&far(v,b));LOCKED[1]=b;LOCKED[2]=c;}
  window.AT=v=>{const P=S.player;P.car=null;P.trav=null;P.booth=null;const s=v.a-Math.PI/2;P.x=v.x+Math.cos(s)*48;P.y=v.y+Math.sin(s)*48;tick(.05);
    return G.envChoices().map(a=>a.label)};
  return LOCKED.length}'''

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
        n = await ev(SETUP); print('locked parked cars', n); ok(n >= 10, 'too few locked cars: %s' % n)
        # 1) lockpick: quiet, slow, uses a pick
        r = await ev('''()=>{const G=__game,S=G.S,P=S.player,v=LOCKED[0];P.picks=1;const labels=AT(v);G.actEnv();tick(1);const mid=!P.car;tick(2.4);
          return {labels,mid,inCar:P.car===v,picks:P.picks,alarm:v.alarmT>S.t,glass:!!v.glassBroken,wanted:S.wanted}}''')
        print('pick', r)
        ok(any('락픽' in l for l in r['labels']) and r['mid'] and r['inCar'] and r['picks'] == 0 and not r['alarm'] and not r['glass'] and r['wanted'] == 0, 'lockpicking a car failed: %s' % r)
        # 2) no picks: smash the window, alarm sounds
        r = await ev('''()=>{const G=__game,S=G.S,P=S.player,T=G.traffic;T.carExit('instant');tick(.2);const v=LOCKED[1];P.picks=0;const labels=AT(v);G.actEnv();tick(1.5);
          return {labels,inCar:P.car===v,alarm:v.alarmT>S.t,glass:!!v.glassBroken,bits:(S.glassBits||[]).length}}''')
        print('smash', r)
        ok(any('창문' in l for l in r['labels']) and r['inCar'] and r['alarm'] and r['glass'] and r['bits'] > 5, 'smashing into a car failed: %s' % r)
        # 3) a car I have been in stays open
        r = await ev('''()=>{const G=__game,T=G.traffic;T.carExit('instant');tick(.2);return AT(LOCKED[0])}''')
        print('reopen', r); ok(any(l.startswith('차 타기') for l in r), 'a car I already opened is locked again: %s' % r)
        # 4) driving: heading settles onto the road grid without steering
        r = await ev('''()=>{const G=__game,S=G.S,P=S.player,T=G.traffic,v=LOCKED[0];P.car=v;v.v=200;v.a=-Math.PI/2+0.25;const a0=v.a;
          for(let i=0;i<40;i++){T.updateDriving(P,0,-1,1,1/60);if(T.isTouch)break}return {off0:0.25,off1:Math.abs(v.a+Math.PI/2)}}''')
        print('assist', r); ok(r['off1'] < 0.12, 'heading does not settle onto the road grid: %s' % r)
        # 5) explosion: bystanders catch fire, scream and die charred
        r = await ev('''()=>{const G=__game,S=G.S,P=S.player,T=G.traffic;T.carExit('instant');const v=LOCKED[2];P.x=v.x+900;P.y=v.y;
          const civ=S.guards.filter(g=>g.civ&&g.state!=='DEAD').slice(0,4);civ.forEach((g,i)=>{g.x=v.x+150+i*8;g.y=v.y+40;g.route=[{x:g.x,y:g.y,pause:99}]});
          T.carExplode(v);tick(.6);const burning=civ.filter(g=>g.burnT&&g.state!=='DEAD').length,said=civ.some(g=>g.say);tick(5);
          return {burning,said,charred:civ.filter(g=>g.charred&&g.state==='DEAD').length,parts:(S.fireParts||[]).length}}''')
        print('burn', r); ok(r['burning'] >= 1 and r['charred'] >= r['burning'], 'people do not burn after an explosion: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
