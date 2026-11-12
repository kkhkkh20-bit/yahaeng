"""Free-mode contract grade and silenced pistol.
- A contract finished with no wanted, no alerted escort and no other body grades S (x1.6 pay, '유령').
- Finished with wanted >= 3 it grades C (x0.8).
- The silenced pistol is sold at the weapon trade; its shot is only heard close by: no wanted when nobody is near."""
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
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.cash=0;S.stand={};}''')
        HIT = '''(w)=>{const G=__game,S=G.S,E=G.events;S.wanted=0;const plan=E.planHit();if(!plan)return {plan:false};E.startHit(plan);const h=S.hit;
          for(const e of h.escorts){e.x=-9000;e.route=[{x:-9000,y:-9000,pause:999}];}tick(.1);if(w)S.wanted=w;tick(.1);const c0=S.cash;G.npcDown(h.g,null,true);tick(.2);
          return {plan:true,paid:S.cash-c0,done:!S.hit,banner:(document.getElementById('evBanner')||{}).textContent||''}}'''
        r = await q.evaluate(HIT, 0); print('S', r); ok(r['plan'] and r['done'] and r['paid'] == 800 and '등급 S' in r['banner'], 'grade S: %s' % r)
        r = await q.evaluate('()=>{__game.S.wanted=0;tick(1)}')
        r = await q.evaluate(HIT, 3); print('C', r); ok(r['plan'] and r['done'] and r['paid'] == 240 and '등급 C' in r['banner'], 'grade C: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,ST=G.STAGE;S.wanted=0;S.cash=2000;P.car=null;P.x=(ST.roadsX[2]+4)*48+300;P.y=(ST.roadsY[2]+2)*48;tick(.1);
          const c=S.contacts.D;const px=P.x,py=P.y;P.x=c.g.x+30;P.y=c.g.y+10;tick(.05);G.events.openContact('D');
          [...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes('무기 거래')).click();
          const sb=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes('소음 권총'));if(!sb)return {row:false};sb.click();document.querySelector('#shopPanel button:last-child').click();
          P.x=px;P.y=py;for(const g of S.guards)if(Math.abs(g.x-P.x)<700&&Math.abs(g.y-P.y)<700&&g.state!=='DEAD'){g.x+=3000;g.route=[{x:g.x,y:g.y,pause:999}];g.path=null;}
          tick(.2);S.wpn='silenced';P.a=0;S.gunT=0;G.actAttack();tick(.5);return {row:true,ammo:S.guns.silenced,wanted:S.wanted}}''')
        print('silenced', r); ok(r.get('row') and r['ammo'] == 11 and r['wanted'] == 0, 'silenced pistol: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
