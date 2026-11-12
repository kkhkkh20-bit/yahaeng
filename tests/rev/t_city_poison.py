"""Free-mode poison darts: bought at the pharmacy; from behind a person '독침 찌르기' appears; 8 s later the person drops;
an 'accident' contract counts poison as success."""
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
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;S.stand={};}''')
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,ST=G.STAGE;P.car=null;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;P.poison=2;S.wanted=0;
          const plan=E.planHit();plan.ctr='accident';E.startHit(plan);const h=S.hit,g=h.g;for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}
          g.x=P.x+30;g.y=P.y;g.a=0;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;g.state='PATROL';S.fst.ghost=-99;tick(.05);g.a=0;
          const a=E.poisonAction();if(!a)return {act:false};a.fn();const at=S.t;tick(4);const alive=g.state!=='DEAD';P.x+=500;tick(5);
          return {act:true,label:a.label,left:P.poison,alive4:alive,dead:g.state,done:!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}}''')
        print('poison', r); ok(r.get('act') and r['left'] == 1 and r['alive4'] and r['dead'] == 'DEAD' and r['done'] and '사고 위장 성공' in r['banner'], 'poison: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
asyncio.run(main())
