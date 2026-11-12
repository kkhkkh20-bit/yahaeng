"""Free-mode car-bomb contract.
- The contract parks the target's car on the block and gives me one bomb.
- Planting it (next to the car) and letting the target get in blows the car and the target: success x1.6.
- Without a bomb the target drives off; blowing the car up later still kills him (blast) and counts."""
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
        await q.add_init_script('window.__seed=11;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.stand={};
          window.START=()=>{const E=G.events;S.hit=null;S.wanted=0;S.player.bombs=0;const plan=E.planHit();plan.ctr='carbomb';E.startHit(plan);const h=S.hit;for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}S.fst.ghost=-99;S.fst.ctrDone=-99;tick(.1);return h};}''')
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,h=START();const v=h.car;if(!v)return {car:false};const bombs=P.bombs;P.car=null;P.x=v.x+40;P.y=v.y+30;tick(.1);
          const a=E.carbombAction();const label=a&&a.label;a.fn();tick(2.6);const planted=!!v.bombed;P.x=v.x+700;tick(.1);h.leaveAt=S.t;h.g.x=v.x+60;h.g.y=v.y;h.g.state='PATROL';h.g.path=null;
          const c0=S.cash;let k=0;while(S.hit&&k<600){tick(1/30);k++;}return {car:true,bombs,label,planted,done:!S.hit,dead:v.dead,paid:S.cash-c0,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('bomb', r); ok(r.get('car') and r['bombs'] == 1 and r['planted'] and r['done'] and r['dead'] and '차량 폭탄 성공' in r['banner'], 'car bomb: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,h=START();const v=h.car;P.x=v.x+900;P.y=v.y;tick(.1);h.leaveAt=S.t;h.g.x=v.x+60;h.g.y=v.y;h.g.state='PATROL';h.g.path=null;
          let k=0;while(!h.cbIn&&k<1500){tick(1/30);k++;}const drove=!!(h.cbIn&&v.ai);tick(1);G.traffic&&0;
          G.traffic.carExplode(v);let j=0;while(S.hit&&j<120){tick(1/30);j++;}return {drove,done:!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('chase', r); ok(r['drove'] and r['done'] and '차량 폭탄 성공' in r['banner'], 'blow the driving car: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
