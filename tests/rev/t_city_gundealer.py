"""Free mode guns are scarce: the gang contact only sells molotovs and armor; the police pistol comes from one back-alley
dealer (secret route) who is marked on the minimap once the detective tips you off; rampage challenges are off;
sniper rifles are only lent for story sniping jobs. The dealer can be threatened (with any weapon drawn) or driven
around like anyone else, and walks back to his alley."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,E=G.events,out={};S.copT=1e9;
  const D=E.dealer2;out.dealer=!!(D&&D.g);out.alley=D?G.tileG(Math.floor(D.x/48),Math.floor(D.y/48)):null;
  E.weaponShop('A');out.contact=[...document.querySelectorAll('#shopPanel button')].map(b=>b.textContent).filter(t=>t!=='나가기');document.querySelector('#shopPanel button:last-child').click();
  S.cash=2000;S.guns={};S.wpn=null;P.x=D.x+30;P.y=D.y;P.car=null;tick(.05);const a=E.dealerAction();out.label=a&&a.label;a.fn();
  [...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.includes('경찰 권총')).click();out.pistol=S.guns.pistol;out.cash=S.cash;out.tip=!!S.gunTip;
  const c=[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent==='나가기');c&&c.click();
  out.ramps=(S.rampSpots||[]).length;
  return out}'''

FREE = '''()=>{const G=__game;const S = G.S, P = S.player, E = G.events; const tick = s => { for (let t = 0; t < s; t += 1/60) G.update(1/60); }; tick(.3); S.copT = 1e9;
    const D = E.dealer2, g = D.g, out = {}; S.guns = { pistol: 5 }; S.wpn = 'pistol'; P.x = D.x + 30; P.y = D.y; P.car = null; tick(.05);
    let a = E.dealerAction(); out.label = a && a.label; a.fn(); tick(1.6); out.pistol = S.guns.pistol; out.sulk = (E.dealerAction() || {}).label;
    // 칼만 들고 다시 협박: 박씨가 총을 뽑아 쏜다
    D.sulkUntil = 0; S.guns.knife = 1; S.wpn = 'knife'; P.hp = P.hpMax || 3; P.hurtT = 0; const hp0 = P.hp; a = E.dealerAction(); out.label2 = a && a.label; a.fn(); for (let k = 0; k < 60 * 6 && P.hp === hp0; k++) { P.x = D.x + 60; P.y = D.y; G.update(1/60); }
    out.drew = !!g.drew; out.shot = !!g.shotT; out.hurt = hp0 - P.hp; P.hp = hp0; g.fist = false; g.drew = false; D.sulkUntil = 0;
    // 태우기: 차를 옆에 두고
    D.sulkUntil = 0; const v = S.vehicles.find(v => !v.dead && !v.police && !v.ai); v.x = D.x + 60; v.y = D.y + 40; P.lastCar = v; S.wpn = null; P.x = D.x + 20; P.y = D.y + 10; tick(.05);
    a = E.rideAction(); out.ride = a && a.label; if (a) a.fn(); tick(3.5); out.riding = !!g.rideIn; out.shopWhileRiding = !!E.dealerAction();
    P.x = v.x; P.y = v.y + 30; tick(.05); const d2 = E.rideAction(); out.drop = d2 && d2.label; d2 && d2.fn(); const away = Math.round(Math.hypot(g.x - D.x, g.y - D.y)); tick(12); out.away = away; out.back = Math.round(Math.hypot(g.x - D.x, g.y - D.y)); return out;}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(json.dumps(r, ensure_ascii=False))
        ok = lambda c, m: c or bad.append(m)
        ok(r['dealer'] and r['alley'] != '.', 'dealer missing or standing on the road: %s' % r)
        ok(not any(k in ' '.join(r['contact']) for k in ['기관단총', '산탄총', '수류탄', '권총', '저격총']), 'contact still sells guns: %s' % r['contact'])
        ok(r['label'] == '박씨와 거래' and r['pistol'] == 12 and r['cash'] == 1400 and r['tip'], 'buying the pistol from the dealer: %s' % r)
        ok(r['ramps'] == 0, 'rampage challenges still placed: %s' % r['ramps'])
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        await q.evaluate("()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();}")
        f = await q.evaluate(FREE); print('free', json.dumps(f, ensure_ascii=False))
        # 박씨: 무기를 들면 협박(권총을 뺏고 10분 안 판다) · 차에 태워 가도 되고, 내려 주면 골목으로 돌아온다
        ok(f['label'].startswith('박씨 협박하기') and f['pistol'] == 17 and '눈도 안' in f['sulk'], 'threatening the dealer: %s' % f)
        ok(f['label2'].startswith('박씨 협박하기 (칼)') and f['drew'] and f['shot'], 'a knife against an armed dealer: %s' % f)
        ok(f['ride'] == '차에 태우기' and f['riding'] and not f['shopWhileRiding'] and f['drop'] and f['back'] <= 8, 'giving the dealer a ride: %s' % f)
        ok(not errs, errs); await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
