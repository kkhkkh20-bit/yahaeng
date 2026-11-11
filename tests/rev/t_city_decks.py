"""Free-mode heights: elevated expressways and a high bridge over the river (GTA-style pseudo 3D);
buildings lean away from the camera.

- Driving up a ramp lifts a car from z 0 to 1; on the deck the rails stop it from leaving sideways.
- Where the rail is missing (road works) a car that leaves the deck falls, takes damage on landing
  and survives a one-storey fall from full durability.
- Traffic uses the decks: cars go up and come down again, none get stuck against a ramp, and no
  ground car drives along the road under the deck.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;document.getElementById('btnFree').click();while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,d=S.decks[0],T=48,out={decks:S.decks.length};
  { const b=G.BLD.find(b=>b.facade&&b.h>=2&&Math.abs((b.x0+b.x1+1)*24-P.x)>600);out.lean=b?Math.round(G.buildingShift?G.buildingShift(b):-1):0; }
  const v=S.vehicles.find(v=>v.parked&&!v.dead);for(const o of S.vehicles)if(o!==v&&Math.abs(o.y-(d.c0+d.c1)/2)<300)o.x=-9000;
  Object.assign(v,{parked:false,ai:false,x:d.a0-60,y:d.c0+3*T,a:0,v:0,z:0,d:0});P.car=v;P.x=v.x;P.y=v.y;
  const step=(s,mx,my)=>{for(let t=0;t<s;t+=1/60){G.input.joy={x:mx,y:my,mag:Math.min(1,Math.hypot(mx,my))};G.update(1/60);}G.input.joy=null;};
  step(4,0,-1);out.up={z:+(v.z||0).toFixed(2),pastRamp:v.x>d.top.x0};
  step(1.2,1,-1);out.railed={z:+(v.z||0).toFixed(2),onDeck:v.y<d.c1};
  const g=d.gaps[0];Object.assign(v,{x:(g.u0+g.u1)/2-200,y:d.c0+T,a:0,v:250,va:0,z:1,hp:v.hpMax});const hp0=v.hp;
  step(.5,-1,-1);step(1.5,0,-1);out.fall={z:+(v.z||0).toFixed(2),lost:hp0-v.hp,alive:!v.dead};
  P.car=null;v.parked=true;
  // traffic for 80 s
  const went=new Set(),came=new Set();let stuck=0,underRoad=0,spd=0,ns=0;
  for(let k=0;k<80*30;k++){G.update(1/30);for(const o of S.vehicles){if(!o.ai||o.dead||o.parked)continue;const z=o.z||0;if(z>0.9)went.add(o.id);else if(went.has(o.id)&&z<0.01)came.add(o.id);
    if(k%30===0){if(z>0.9){spd+=Math.abs(o.v);ns++;}if(G.traffic.carPts(o).some(([x,y])=>{let s=0;for(const D of S.decks){const u=D.axis==='x'?x:y;if(x>=D.rampA.x0&&x<=D.rampA.x1&&y>=D.rampA.y0&&y<=D.rampA.y1)s=Math.max(s,(u-D.a0)/D.r);if(x>=D.rampB.x0&&x<=D.rampB.x1&&y>=D.rampB.y0&&y<=D.rampB.y1)s=Math.max(s,(D.a1-u)/D.r);}return s>z+0.3;}))stuck++;
      for(const D of S.decks){const t=D.top,along=D.axis==='x'?o.d%2===0:o.d%2===1;if(z<0.3&&along&&o.x>t.x0&&o.x<t.x1&&o.y>t.y0&&o.y<t.y1)underRoad++;}}}}
  out.traffic={went:went.size,came:came.size,stuck,underRoad,deckSpeed:Math.round(spd/Math.max(1,ns))};
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats'); await q.wait_for_function('!!window.__game')
        s = await q.evaluate(CHECK); print(json.dumps(s, ensure_ascii=False)); await b.close()
    def ok(v, m):
        if not v: bad.append(m)
    ok(s['decks'] == 3, 'expected three decks: %s' % s['decks'])
    ok(abs(s['lean']) > 10, 'buildings do not lean with the camera: %s' % s['lean'])
    ok(s['up']['z'] == 1 and s['up']['pastRamp'], 'car did not climb the ramp: %s' % s['up'])
    ok(s['railed']['z'] == 1 and s['railed']['onDeck'], 'rail did not hold the car: %s' % s['railed'])
    ok(s['fall']['z'] == 0 and s['fall']['lost'] >= 2 and s['fall']['alive'], 'fall through the gap: %s' % s['fall'])
    t = s['traffic']
    ok(t['went'] >= 2 and t['came'] >= 1 and t['stuck'] == 0 and t['underRoad'] == 0 and t['deckSpeed'] > 100, 'deck traffic: %s' % t)
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
