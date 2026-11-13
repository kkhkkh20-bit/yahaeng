"""Free mode home: at my first safehouse door a [집 꾸미기] menu sells one-off upgrades that persist in the save —
pots/neon (looks), new bed (+1 max HP), weapon locker (rest refills ammo), CCTV (enter home while police watch),
wall safe (arrest takes half as much money)."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,E=G.events,out={};S.copT=1e9;S.warNext=1e9;S.huntNext=1e9;
  const s=S.safes[0];P.x=s.x;P.y=s.y+4;tick(.05);const a=E.homeAction();out.label=a&&a.label;
  S.cash=5000;const hp0=P.hpMax;a.fn();const rows=[...document.querySelectorAll('#shopPanel button')].filter(b=>!b.disabled&&b.textContent.includes('만'));out.rows=rows.length;
  for(const k of ['새 침대','무기 보관함','보안 카메라','벽 금고','화분'])[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes(k)).click();
  out.cash=S.cash;out.home=Object.keys(E.home).sort();out.hp=[hp0,P.hpMax];
  const close=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent==='나가기');close&&close.click();
  // 무기 보관함: 권총 탄 2발 → 쉬고 나면 가득
  S.guns.pistol=2;P.x=s.x;P.y=s.y+4;E.safeEnter(s);tick(4);out.ammo=S.guns.pistol;
  // 보안 카메라: 수배 중 경찰이 보고 있어도 들어간다
  S.wanted=2;const g=S.guards.find(g=>g.police&&!g.off)||null;out.copSeen=!!g;if(g){g.x=s.x+120;g.y=s.y+40;g.state='PATROL';}
  P.x=s.x;P.y=s.y+4;E.safeEnter(s);out.entered=!!S.safeIn;tick(4);out.wanted=S.wanted;
  // 저장
  E.saveFreeProgress(true);const key=Object.keys(localStorage).find(k=>/free/i.test(k));out.saved=JSON.parse(localStorage.getItem(key)||'{}').home;
  return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(json.dumps(r, ensure_ascii=False))
        ok = lambda c, m: c or bad.append(m)
        ok(r['label'] and r['label'].startswith('집 꾸미기'), 'no home menu at my door: %s' % r['label'])
        ok(r['rows'] == 6, 'home menu items: %s' % r['rows'])
        ok(r['home'] == ['bed', 'cctv', 'locker', 'pots', 'safe'] and r['cash'] == 5000 - 150 - 250 - 300 - 400 - 30, 'buying failed: %s' % r)
        ok(r['hp'][1] == r['hp'][0] + 1, 'bed does not add max hp: %s' % r['hp'])
        ok(r['ammo'] >= 24, 'locker does not refill ammo: %s' % r['ammo'])
        ok(r['entered'] and r['wanted'] == 0, 'cctv home entry while wanted: %s' % r)
        ok(r['saved'] and r['saved'].get('cctv') == 1, 'home not saved: %s' % r['saved'])
        ok(not errs, errs); await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
