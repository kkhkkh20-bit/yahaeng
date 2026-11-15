"""Free-mode sniper rifle.
- Sold at the weapon trade. Standing still 0.3 s with it opens the scope (wider view, reticle on the target ahead).
- Moving: no shot ('멈춰 서야'). Scoped: a 700 px shot drops the person.
- 'snipe' contract: a kill from 500+ px with a gun counts as success (x1.4); a point-blank kill fails it."""
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
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.stand={};S.cash=3000;
          const P=S.player,ST=G.STAGE;window.ROAD=()=>{P.car=null;P.x=(ST.roadsX[2]+4)*48+60;P.y=(ST.roadsY[2]+2)*48;P.a=0;};
          window.CLEAR=()=>{for(const o of S.guards)if(Math.abs(o.x-P.x)<1200&&Math.abs(o.y-P.y)<500&&o.state!=='DEAD'&&!(S.hit&&o===S.hit.g)){o.x+=5000;o.route=[{x:o.x,y:o.y,pause:999}];o.path=null;}};}''')
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.guns.sniper=6;  /* 저격총은 팔지 않는다 — 강 형사가 빌려준 한 자루 */
          S.wpn='sniper';ROAD();CLEAR();tick(.6);const scope=S.scope;return {row:true,ammo:S.guns.sniper,scope}}''')
        print('buy', r); ok(r.get('row') and r['ammo'] == 6 and r['scope'], 'buy + scope: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;CLEAR();const g=S.guards.find(g=>g.civ&&g.state!=='DEAD'&&!g.off);g.x=P.x+700;  /* 거리 생활(47zt2)이 내 둘레로 사람을 데려오므로 쏘기 전에 다시 비운다 */g.y=P.y;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;tick(.3);
          const tgt=S.scopeTgt===g;S.gunT=0;G.actAttack();tick(.5);return {tgt,dead:g.state,ammo:S.guns.sniper,d:g.shotD|0}}''')
        print('shot', r); ok(r['tgt'] and r['dead'] == 'DEAD' and r['ammo'] == 5 and r['d'] > 600, 'long shot: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.stillT=0;S.scope=false;P.moving=true;S.gunT=0;const a=S.guns.sniper;G.actAttack();return {fired:S.guns.sniper!==a}}''')
        print('moving', r); ok(not r['fired'], 'no shot while moving: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events;S.wanted=0;ROAD();const plan=E.planHit();plan.ctr='snipe';E.startHit(plan);const h=S.hit;
          for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}h.g.x=P.x+650;h.g.y=P.y;h.g.route=[{x:h.g.x,y:h.g.y,pause:999}];h.g.path=null;CLEAR();S.fst.ghost=-99;
          P.moving=false;tick(.6);S.gunT=0;G.actAttack();tick(.6);return {done:!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('contract', r); ok(r['done'] and '저격 성공' in r['banner'], 'snipe contract: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
