"""Free mode guns are scarce: the gang contact only sells molotovs and armor; the police pistol comes from one back-alley
dealer (secret route) who is marked on the minimap once the detective tips you off; rampage challenges are off;
sniper rifles are only lent for story sniping jobs."""
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
        ok(not errs, errs); await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
