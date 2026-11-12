"""Free-mode driving feel.
- A car wedged into a wall (overlapping a building at its current spot) is pushed to the nearest free spot, so it can drive
  forward and back again instead of being stuck.
- Free-mode cars have double durability; a 200 px/s bump into a wall no longer costs durability.
- In a car the radio plays the upbeat 'n_drive' track (118 BPM synth, generated without NaNs and with real level).
- Crashes play the synthesized crunch (built once into the sound bank)."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,T=G.traffic,out={};
  // wedge a car into the nearest building's wall
  const b=G.BLD.find(b=>Math.hypot((b.x0+b.x1)*24-P.x,(b.y1+1)*48-P.y)<2000&&b.x1-b.x0>=4);const wx=(b.x0+b.x1+1)*24,wy=(b.y1+1)*48-10;
  const v=T.makeVehicle({type:'sedan',x:wx,y:wy,a:0,parked:true});v.unlocked=true;S.vehicles.push(v);P.car=v;v.ai=false;
  out.wedged=T.carOverlap(v)===true;const x0=v.x,y0=v.y;
  for(let i=0;i<60;i++)T.updateDriving(P,0,-1,1,1/60);const fwd=Math.hypot(v.x-x0,v.y-y0);const x1=v.x,y1=v.y;
  for(let i=0;i<60;i++)T.updateDriving(P,0,1,1,1/60);out.moved={fwd:Math.round(fwd),back:Math.round(Math.hypot(v.x-x1,v.y-y1))};out.freeNow=T.carOverlap(v)!==true;
  out.hp={sedan:v.hpMax};
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(r)
        snd = await q.evaluate('''()=>{const G=__game;const n=G.neonTest('n_drive');return {n}}''')
        print('drive track', snd)
        await b.close()
    def ok(v, m):
        if not v: bad.append(m)
    ok(r['wedged'] and r['freeNow'] and r['moved']['fwd'] > 20 and r['moved']['back'] > 5, 'wedged car stays stuck: %s' % r)
    ok(r['hp']['sedan'] == 12, 'free-mode durability not doubled: %s' % r['hp'])
    n = snd['n']; ok(n[2] == 0 and float(n[3]) > 0.05 and float(n[1]) > 10, 'n_drive track bad: %s' % n)
    if errs: bad.append('page errors %s' % errs[:3])
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
