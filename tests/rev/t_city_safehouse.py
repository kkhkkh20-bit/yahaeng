"""Free-mode safehouses.
- Three safehouses, far apart; the first (next to my garage) is mine from the start, the others are bought at the door.
- Hiding in one while wanted (nobody watching) clears wanted, heals, saves; a watching cop blocks it.
- Bought safehouses survive a reload."""
import asyncio, sys, json
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
        START = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
          window.tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S;S.evNext={};for(const e of G.events.list)S.evNext[e.d]=1e9;S.copT=1e9;S.warNext=1e9;S.stand={};
          window.COPS=(x)=>{for(const g of S.guards)if(g.police&&!g.contact&&g.state!=='DEAD'){g.x=x;g.y=-9000;g.route=[{x,y:-9000,pause:999}];g.path=null;}};COPS(-9000);}'''
        await q.evaluate(START)
        r = await q.evaluate('''()=>{const S=__game.S,sf=S.safes;let md=1e9;for(let i=0;i<sf.length;i++)for(let j=i+1;j<sf.length;j++)md=Math.min(md,Math.hypot(sf[i].x-sf[j].x,sf[i].y-sf[j].y));return {n:sf.length,md:md|0,own:sf.map(s=>s.owned)}}''')
        print('spots', r); ok(r['n'] == 3 and r['md'] > 1500 and r['own'] == [True, False, False], 'safehouse spots: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,s=S.safes[0];P.car=null;P.x=s.x;P.y=s.y;tick(.1);S.wanted=3;P.hp=1;COPS(-9000);
          const a=E.safehouseAction();if(!a)return {act:false};a.fn();tick(3.6);return {act:true,label:a.label,wanted:S.wanted,hp:P.hp,max:P.hpMax,out:!S.safeIn}}''')
        print('hide', r); ok(r.get('act') and r['wanted'] == 0 and r['hp'] == r['max'] and r['out'], 'hide clears wanted: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,s=S.safes[0];P.x=s.x;P.y=s.y;S.wanted=2;tick(.1);const c=S.guards.find(g=>g.police&&!g.contact&&g.state!=='DEAD');
          c.x=P.x+150;c.y=P.y;c.route=[{x:c.x,y:c.y,pause:999}];const a=E.safehouseAction();a.fn();tick(3.6);const w=S.wanted;S.wanted=0;COPS(-9000);return {wanted:w,inside:!!S.safeIn}}''')
        print('watched', r); ok(r['wanted'] >= 2 and not r['inside'], 'watched cop blocks: %s' % r)
        r = await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,E=G.events,s=S.safes[1];S.cash=1000;P.x=s.x;P.y=s.y;tick(.1);const a=E.safehouseAction();const l=a.label;a.fn();
          E.saveFreeProgress(true);const d=JSON.parse(localStorage.getItem('yahaeng.free1'));return {label:l,owned:s.owned,cash:S.cash,saved:d.safes}}''')
        print('buy', r); ok('사기' in r['label'] and r['owned'] and r['cash'] == 200 and r['saved'].get('1') == 1, 'buy safehouse: %s' % r)
        await q.evaluate(START)
        r = await q.evaluate('()=>__game.S.safes.map(s=>s.owned)'); print('reload', r); ok(r == [True, True, False], 'saved safehouse: %s' % r)
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    sys.exit(1 if bad else 0)
asyncio.run(main())
