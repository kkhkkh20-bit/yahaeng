"""Free mode elevator: at a building's stair tile one [엘리베이터] action opens a floor panel (1층 … 옥상); picking a floor
puts you there in one go, the roof walks out through the stairhouse. The police helicopter is the last card: it only comes
after 20 s at five stars, and it stays drawn over a rooftop."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
CHECK = '''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();
  const tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};tick(.3);const S=G.S,P=S.player,E=G.events,out={};S.copT=1e9;
  const L=S.ladders.filter(l=>l.kind==='fstair'&&l.bfl===0);const tops=L.map(l=>({l,top:Math.max(...S.ladders.filter(k=>k.kind==='fstair'&&k.tx===l.tx&&k.ty===l.ty).map(k=>k.tfl))})).sort((a,b)=>b.top-a.top||a.l.tx-b.l.tx);
  const l=tops[0].l;out.top=tops[0].top;P.fl=0;P.z=0;G.setLayer?G.setLayer(0):0;P.x=l.x;P.y=l.y+20;P.car=null;tick(.05);
  const a=E.elevatorAction();out.label=a&&a.label;a.fn();out.rows=[...document.querySelectorAll('#shopPanel button')].map(b=>b.textContent);
  [...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.startsWith((out.top+1)+'층')).click();tick(1.5);out.fl=P.fl;out.z=P.z;
  const b=E.elevatorAction();b.fn();[...document.querySelectorAll('#shopPanel button')].find(b=>b.textContent.startsWith('옥상')).click();tick(4);out.roofZ=P.z;out.roofFl=P.fl;
  // 헬기: 별 넷이면 안 뜬다 · 별 다섯 20초 넘게 버티면 뜬다
  S.heli=null;S.wanted=4;tick(25);out.heli4=!!S.heli;S.wanted=5;tick(10);out.heli5early=!!S.heli;tick(15);out.heli5=!!S.heli;return out}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        r = await q.evaluate(CHECK); print(json.dumps(r, ensure_ascii=False))
        ok = lambda c, m: c or bad.append(m)
        ok(r['label'] and r['label'].startswith('엘리베이터') and any(x.startswith('옥상') for x in r['rows']) and r['fl'] == r['top'], 'elevator to the top floor: %s' % r)
        ok(r['roofZ'] > 0 and r['roofFl'] == 0, 'elevator to the roof: %s' % r)
        ok(not r['heli4'] and not r['heli5early'] and r['heli5'], 'helicopter only late at five stars: %s' % r)
        ok(not errs, errs); await b.close()
    print('통과' if not bad else '문제', bad)
    if bad: raise SystemExit(1)

if __name__ == '__main__': asyncio.run(main())
