"""Free-mode contract types from the pay phone.
- The first contract is plain; later ones vary (accident / blade / photo / timed), and the phone briefing explains the rule.
- accident: a run-over (or fire / blast) pays x1.5; a knife kill pays half.
- blade: a hand kill pays x1.4; a shot target pays half.
- photo: until I see the target's face, the goal points only at the block; once spotted it points at the target.
- timed: after the deadline the target leaves and the contract fails."""
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
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.cash=0;S.stand={};
          window.START=(k)=>{const E=G.events;S.wanted=0;const plan=E.planHit();plan.ctr=k;E.startHit(plan);const h=S.hit;for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}tick(.1);return h};
          window.KILL=(how)=>{const h=S.hit,g=h.g;S.fst.ghost=-99;S.fst.ctrDone=-99;S.wanted=0;h.maxWanted=0;const c0=S.cash;if(how==='gun')g.shotT=S.t;G.npcDown(g,null,true);const c=S.corpses[S.corpses.length-1];if(how==='car'){c.byNpc=false;c.byCar=true;}const w=S.wanted;tick(.2);
            return {paid:S.cash-c0,done:!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}};}''')
        r = await q.evaluate('''()=>{const S=__game.S,E=__game.events;S.hitN=0;const a=E.planHit().ctr;S.hitN=3;const ks=new Set();for(let i=0;i<40;i++)ks.add(E.planHit().ctr);
          const p=E.planHit();p.ctr='accident';const lines=E.phoneLines(p).map(l=>l[1]).join(' ');return {first:a,kinds:[...ks].sort(),brief:lines.includes('사고')}}''')
        print('pick', r); ok(r['first'] == 'plain' and len(r['kinds']) >= 4 and r['brief'], 'contract pick / briefing: %s' % r)
        r = await q.evaluate("()=>{START('accident');return KILL('car')}"); print('accident car', r)
        ok(r['done'] and r['paid'] in (1200, 450, 560) and '사고 위장 성공 ×1.5' in r['banner'], 'accident by car: %s' % r)  # 1200 = (300+200)x1.6(S)x1.5; 450/560 when wanted rose (B/A)
        r = await q.evaluate("()=>{START('accident');return KILL('blade')}"); print('accident knife', r)
        ok(r['done'] and r['paid'] == 400 and '실패' in r['banner'], 'accident by knife: %s' % r)
        r = await q.evaluate("()=>{START('blade');return KILL('blade')}"); print('blade', r)
        ok(r['done'] and r['paid'] == 1120, 'blade by hand: %s' % r)
        r = await q.evaluate("()=>{START('blade');return KILL('gun')}"); print('blade gun', r)
        ok(r['done'] and r['paid'] == 400, 'blade by gun: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,h=START('photo');P.x=h.g.x+3000;P.y=h.g.y;tick(.1);const g0=G.hitGoal?G.hitGoal():G.events.hitGoal();
          P.x=h.g.x-120;P.y=h.g.y;tick(.2);const g1=G.hitGoal?G.hitGoal():G.events.hitGoal();const r={hidden:g0.x===h.cx&&g0.y===h.cy,spotted:!!h.spotted,shown:g1.x===h.g.x};KILL('blade');return r}''')
        print('photo', r); ok(r['hidden'] and r['spotted'] and r['shown'], 'photo contract: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,h=START('timed');const txt=(G.hitGoal?G.hitGoal():G.events.hitGoal()).text;h.deadline=S.t+.05;const n=S.hitN;tick(.3);
          return {txt,failed:!S.hit,n:S.hitN-n,fail:S.fst.hitFail||0}}''')
        print('timed', r); ok('남은' in r['txt'] and r['failed'] and r['n'] == 0 and r['fail'] == 1, 'timed contract: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
