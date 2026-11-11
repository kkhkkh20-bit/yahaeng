"""Free-mode city streets: Korean signal phases, two-person crosswalks, solid cars and booths, gas pipes.

- Signals: east-west straight (green) -> yellow -> east-west left arrow (red + arrow) -> yellow, then the
  same for north-south. Walk signals turn green with the parallel straight phase and are red during
  the left-arrow phase. Cars waiting to turn left wait for the arrow; straight cars do not go on it.
- Crosswalks are 70px wide and cars stop with their nose behind the stop line, off the crosswalk.
- Walkers cannot stand on a car or walk through a phone booth.
- A building's yellow gas pipe climbs to the roof and back down.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,ST=G.STAGE,T=48,out={};
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);
  // signal phases over one cycle at one junction
  const rx=ST.roadsX[2],ry=ST.roadsY[1],t0=S.t,seen=new Set();let walkBad=0;
  for(let u=0;u<36;u+=.25){S.t=t0-G.traffic.signalTime(rx,ry)+u+.01;const s=G.traffic.signalState(rx,ry),wh=G.traffic.walkState(rx,ry,true),wv=G.traffic.walkState(rx,ry,false);seen.add(s.ew+s.ns);
    if(wh!=='R'&&s.ew!=='G')walkBad++;if(wv!=='R'&&s.ns!=='G')walkBad++;if(s.ew!=='R'&&s.ns!=='R')walkBad++;}
  S.t=t0;out.phases=[...seen].sort();out.walkBad=walkBad;
  // a car about to turn left at a green waits; a straight car at a left arrow waits
  const v=S.vehicles.find(v=>v.ai&&!v.parked&&!v.dead);const x0=rx*T,y0=ry*T,x1=x0+4*T,y1=y0+4*T;
  Object.assign(v,{d:0,a:0,x:x0-160,y:y0+3*T,v:120,chase:false});v.lane=v.y;
  S.t=t0;const base=t0-G.traffic.signalTime(rx,ry),setPhase=u=>{S.t=base+u+.01};
  const lets=(u,left)=>{setPhase(u);v.turn=left?{nd:3,at:x0+3*T}:null;return G.traffic.signalLets(G.traffic.signalState(rx,ry).ew,v,x0,y0,x1,y1)};
  const leftOnGreen=lets(2,true)?null:1,straightOnGreen=lets(2,false)?null:1,straightOnArrow=lets(14,false)?null:1,leftOnArrow=lets(14,true)?null:1,onRed=lets(20,false)||lets(20,true)?null:1;
  out.stops={leftOnGreen,straightOnGreen,straightOnArrow,leftOnArrow,onRed};
  // where a car stops: nose behind the crosswalk
  setPhase(20);v.turn=null;const stop=G.traffic.trafficStopDistance(v);out.noseGap=Math.round(x0-(v.x+stop-6+46));
  S.t=t0;
  // walker on a parked car is pushed out
  const pc=S.vehicles.find(o=>o.parked&&!o.dead);P.x=pc.x;P.y=pc.y;G.update(1/60);out.carGap=Math.round(Math.hypot(P.x-pc.x,P.y-pc.y));
  // walker in a booth is pushed out
  const b=S.phones[0];P.x=b.x;P.y=b.y;G.update(1/60);out.boothGap=Math.round(Math.hypot(P.x-b.x,P.y-b.y));
  // gas pipe up and down
  const l=S.ladders.find(l=>l.gas&&l.tz>=2);out.pipes=S.ladders.filter(l=>l.gas).length;P.x=l.x;P.y=l.y+4;tick(.05);out.upAction=G.envAction()?.k;
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats'); await q.wait_for_function('!!window.__game')
        await q.click('#btnFree'); await q.wait_for_timeout(500)
        s = await q.evaluate(CHECK)
        async def wait_z(cond):
            try: await q.wait_for_function('()=>{const P=__game.S.player;return !P.trav&&(%s)}' % cond, timeout=15000)
            except Exception: pass
            return await q.evaluate('__game.S.player.z')
        await q.keyboard.press('x'); s['onRoof'] = await wait_z('P.z>=2')
        await q.keyboard.press('x'); s['backDown'] = await wait_z('P.z===0')
        print(json.dumps(s, ensure_ascii=False)); await b.close()
    def ok(v, m):
        if not v: bad.append(m)
    ok(s['phases'] == ['GR', 'LR', 'RG', 'RL', 'RY', 'YR'], 'signal phases: %s' % s['phases'])
    ok(s['walkBad'] == 0, 'walk signals green against traffic or both axes moving: %s' % s['walkBad'])
    st = s['stops']
    ok(st['leftOnGreen'] is not None and st['straightOnGreen'] is None, 'green: left turners should wait, straight should go: %s' % st)
    ok(st['straightOnArrow'] is not None and st['leftOnArrow'] is None and st['onRed'] is not None, 'arrow: straight should wait, left turners go: %s' % st)
    ok(s['noseGap'] >= 70, 'a stopped car sits on the crosswalk: %s' % s['noseGap'])
    ok(s['carGap'] >= 30, 'walker stood on a car: %s' % s['carGap'])
    ok(s['boothGap'] >= 20, 'walker walked through a phone booth: %s' % s['boothGap'])
    ok(s['pipes'] > 100 and s['upAction'] == 'up', 'gas pipes are not climbable: %s' % s)
    ok(s['onRoof'] >= 2 and s['backDown'] == 0, 'pipe climb up/down failed: %s / %s' % (s['onRoof'], s['backDown']))
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
