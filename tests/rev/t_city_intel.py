"""Free-mode informant.
- During a contract, any pay phone reaches the informant. With 100 cash he takes the money, shows the route and escorts,
  and after 40 s the target stands alone at a corner for 25 s while the escorts walk away; then they regroup.
- Without the money he says nothing useful and takes nothing."""
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
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.stand={};
          const E=G.events;S.hitN=2;const plan=E.planHit();plan.ctr='plain';E.startHit(plan);tick(.5);
          window.CALL=()=>{const P=S.player,p=S.phones.reduce((a,b)=>Math.hypot(b.x-P.x,b.y-P.y)<Math.hypot(a.x-P.x,a.y-P.y)?b:a);P.x=p.x-40;P.y=p.y+4;P.car=null;tick(.05);E.enterBooth(p);tick(1.2);
            const lines=[];let k=0;while(G.DLG.modal&&k<20){lines.push(document.getElementById('dlgText')?.textContent||'');G.advanceDialog();tick(.05);k++;}tick(1);return lines.join(' / ')};}''')
        r = await q.evaluate('''()=>{const S=__game.S;S.cash=50;const t=CALL();return {cash:S.cash,intel:!!S.hit.intel,t}}''')
        print('broke', r); ok(r['cash'] == 50 and not r['intel'], 'no money, no intel: %s' % r)
        r = await q.evaluate('''()=>{const S=__game.S;S.cash=300;const t=CALL();const h=S.hit;return {cash:S.cash,intel:!!h.intel,brk:!!h.brk,inT:h.brk?h.brk.at-S.t:null,t}}''')
        print('buy', r); ok(r['cash'] == 200 and r['intel'] and r['brk'] and 30 < r['inT'] <= 40, 'buy intel: %s' % r)
        r = await q.evaluate('''()=>{const S=__game.S,h=S.hit,g=h.g,B=h.brk,P=S.player;P.x=g.x+2500;P.y=g.y;for(const o of [g,...h.escorts]){o.state='PATROL';o.meter=0;o.lastSeen=null;}tick(B.at-S.t+.2);const on=B.on;tick(14);
          const dT=Math.hypot(g.x-B.x,g.y-B.y),dE=Math.min(...h.escorts.filter(e=>e.state!=='DEAD').map(e=>Math.hypot(e.x-g.x,e.y-g.y)),9999);const mid={hit:!!S.hit,st:g.state,es:h.escorts.map(e=>e.state+':'+e.follow)};tick(B.dur);const back=B.done&&h.escorts.filter(e=>e.state!=='DEAD').every(e=>e.follow!=null);return {on,dT:dT|0,dE:dE|0,back,mid,hit2:!!S.hit,gr:JSON.stringify(g.route).slice(0,80),bx:[B.x|0,B.y|0],g:[g.x|0,g.y|0]}}''')
        print('break', r); ok(r['on'] and r['dT'] < 96 and r['dE'] > 250 and r['back'], 'smoke break: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
