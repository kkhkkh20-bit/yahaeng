"""Free mode town: every shop has a sign and no two shops share a name; villas/houses carry name plates; the biggest
shops become an elementary school (students outside) and a hospital where [치료받기] restores health for money."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('window.__seed=5;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats&study=city-xl'); await q.wait_for_function('!!window.__game')
        ok = lambda c, m: c or bad.append(m)
        r = await q.evaluate('''()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='cityXL'));while(G.DLG.modal)G.advanceDialog();for(let i=0;i<20;i++)G.update(1/60);const S=G.S,E=G.events,P=S.player;
          const kinds=E.bldAll();const L=E.signsOf().filter(Boolean);const dup=L.length-new Set(L).size;
          const sc=E.school,ho=E.hospital,kids=S.guards.filter(g=>g.student).length;
          const hp=P.hpMax||3;P.hp=1;S.cash=100;const front=(b)=>({x:(b.x0+b.x1+1)*24,y:(b.y1+1.5)*48});const f=front(ho);P.x=f.x;P.y=f.y+10;P.car=null;for(let i=0;i<3;i++)G.update(1/60);
          const a=E.hospitalAction();const label=a&&a.label;if(a)a.fn();for(let i=0;i<120;i++)G.update(1/60);
          return{kinds,dup,school:sc&&sc.signs[0],hospital:ho&&ho.signs[0],kids,label,hp:P.hp,hpMax:hp,cash:S.cash,plate:E.villa&&E.villa.plate}}''')
        print(json.dumps(r, ensure_ascii=False))
        ok(not any(k.endswith(':blank') for k in r['kinds']) and r['dup'] == 0, 'blank or duplicate shop names: %s' % r)
        ok(r['school'] and '학교' in r['school'] and r['hospital'] and '병원' in r['hospital'] and r['kids'] >= 3, 'school/hospital: %s' % r)
        ok(r['label'] and '치료' in r['label'] and r['hp'] == r['hpMax'] and r['cash'] < 100, 'hospital heal: %s' % r)
        ok(r['plate'], 'villa plate missing')
        ok(not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad)
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
