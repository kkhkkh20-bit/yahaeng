"""Free-mode districts and shops.

- Seven named districts; entering one shows its name.
- Shops (pharmacy, convenience store, hardware) sell items for cash; the pharmacy heals.
- Used-car dealer: buy a car on the lot from the office, taking one without paying is theft (two stars),
  driving a car onto the lot and stopping sells it for 30%.
- Respray bay: stopping there with stars and 50 cash repaints the car and clears the stars.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;document.getElementById('btnFree').click();while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,ST=G.STAGE,out={};
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.2);
  out.districts=ST.districts.length;out.shops=[...new Set(S.shops.map(s=>s.name))].sort();
  // district name shows on entering another district
  const far=S.shops.find(s=>ST.districtAt(Math.floor(s.x/48),Math.floor(s.y/48))!==S.districtName);Object.assign(P,{x:far.x,y:far.y});tick(.1);
  out.districtShown=document.getElementById('districtName')?.textContent||'';
  // pharmacy heals for 40
  const ph=S.shops.find(s=>s.name==='약국');Object.assign(P,{x:ph.x,y:ph.y});P.hp=1;S.cash=100;tick(.05);out.shopAction=G.envAction()?.k;
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats'); await q.wait_for_function('!!window.__game')
        s = await q.evaluate(CHECK)
        await q.keyboard.press('x'); await q.wait_for_timeout(200)
        s['panel'] = await q.evaluate("document.getElementById('shopPanel')?.querySelector('b')?.textContent")
        await q.click('#shopPanel button:not(:disabled)'); await q.wait_for_timeout(100)
        s['healed'] = await q.evaluate("({hp:__game.S.player.hp,max:__game.S.player.hpMax,cash:__game.S.cash})")
        await q.keyboard.press('Escape'); await q.wait_for_timeout(100)
        s.update(await q.evaluate('''()=>{const G=__game,S=G.S,P=S.player,out={};const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};
          out.panelClosed=!document.getElementById('shopPanel');
          const lot=S.vehicles.filter(v=>v.forSale);out.forSale=lot.length;
          // steal one: two stars
          S.wanted=0;const v=lot[0];G.start&&0;P.x=v.x+40;P.y=v.y;P.car=v;v.parked=false;tick(.1);out.stolen={wanted:S.wanted,forSale:v.forSale};
          // respray clears stars for 50
          S.cash=60;Object.assign(v,{x:(S.respray.x0+S.respray.x1)/2,y:(S.respray.y0+S.respray.y1)/2,v:0});P.x=v.x;P.y=v.y;tick(1.6);out.respray={wanted:S.wanted,cash:S.cash,hue:!!v.hue};
          // sell on the lot
          Object.assign(v,{x:(S.dealer.lot[0]+S.dealer.lot[2])/2,y:S.dealer.lot[3]-40,v:0});P.x=v.x;P.y=v.y;tick(.05);out.sellAction=G.envAction()?.k;const c0=S.cash;
          return out}'''))
        await q.keyboard.press('x'); await q.wait_for_timeout(100)
        s['sold'] = await q.evaluate("({inCar:!!__game.S.player.car,cash:__game.S.cash})")
        print(json.dumps(s, ensure_ascii=False)); await b.close()
    def ok(v, m):
        if not v: bad.append(m)
    ok(s['districts'] == 7, 'districts: %s' % s['districts'])
    ok(s['districtShown'] != '', 'district name not shown')
    ok({'약국', '편의점'} <= set(s['shops']) and ('철물' in s['shops'] or '공구' in s['shops']), 'shops missing: %s' % s['shops'])
    ok(s['shopAction'] == 'shop' and s['panel'] == '약국', 'pharmacy did not open: %s %s' % (s['shopAction'], s['panel']))
    ok(s['healed']['hp'] == s['healed']['max'] and s['healed']['cash'] == 60, 'pharmacy did not heal for 40: %s' % s['healed'])
    ok(s['panelClosed'], 'shop panel did not close')
    ok(s['forSale'] >= 4, 'dealer lot has too few cars: %s' % s['forSale'])
    ok(s['stolen']['wanted'] >= 2 and s['stolen']['forSale'] is None, 'taking a lot car was not theft: %s' % s['stolen'])
    ok(s['respray']['wanted'] == 0 and s['respray']['cash'] == 10 and s['respray']['hue'], 'respray: %s' % s['respray'])
    ok(s['sellAction'] == 'carSell' and not s['sold']['inCar'] and s['sold']['cash'] > 10, 'selling on the lot failed: %s %s' % (s['sellAction'], s['sold']))
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
