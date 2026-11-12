"""Free-mode bounty hunters.
- Not before three finished contracts. After that a hunter (dressed as a civilian) spawns off screen and walks at me.
- Within 170 px with line of sight he aims for 1 s (red line) and fires; downing him pays 200 and ends the hunt.
- Losing him (> 2600 px for 8 s) ends the hunt without pay."""
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
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.stand={};S.wanted=0;
          const P=S.player,ST=G.STAGE;P.car=null;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;}''')
        r = await q.evaluate('''()=>{const S=__game.S;S.hitN=0;S.huntNext=0;tick(1);const early=!!S.hunter;S.hitN=3;S.huntNext=0;tick(.2);return {early,spawn:!!S.hunter,civ:S.hunter&&S.hunter.g.civ}}''')
        print('spawn', r); ok(not r['early'] and r['spawn'] and r['civ'], 'hunter spawn: %s' % r)
        r = await q.evaluate('''()=>{const S=__game.S,P=S.player,g=S.hunter.g;const d0=Math.hypot(g.x-P.x,g.y-P.y);tick(4);const d1=Math.hypot(g.x-P.x,g.y-P.y);
          g.x=P.x+120;g.y=P.y;g.path=null;P.hp=P.hpMax;P.hurtT=0;P.armor=0;tick(.5);const aiming=g.aimH>0;tick(1.2);return {closer:d1<d0-40,aiming,shots:S.tracers.length>=0,hp:P.hp,max:P.hpMax}}''')
        print('attack', r); ok(r['closer'] and r['aiming'], 'hunter approaches and aims: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,g=S.hunter.g,c0=S.cash||0;G.npcDown(g,null,true);tick(.2);return {ended:!S.hunter,paid:(S.cash||0)-c0}}''')
        print('down', r); ok(r['ended'] and r['paid'] == 200, 'hunter down pays: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player;S.huntNext=0;S.wanted=0;tick(.2);if(!S.hunter)return {spawn:false};const g=S.hunter.g;g.x=P.x+3000;g.y=P.y;g.path=null;g.route=[{x:g.x,y:g.y,pause:999}];
          const c0=S.cash;for(let k=0;k<12&&S.hunter;k++){g.x=P.x+3000;g.y=P.y;g.path=null;tick(1);}return {spawn:true,ended:!S.hunter,paid:S.cash-c0}}''')
        print('lost', r); ok(r.get('spawn') and r['ended'] and r['paid'] == 0, 'losing the hunter: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
