import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
JS = '''() => { const G = window.__game, S = G.S; G.setLayer(0); let lit = 0, tot = 0;
  for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 46; tx++) { if (G.bldAt(tx, ty) >= 0 || G.lvAt(tx, ty)) continue; const ch = G.tileG(tx, ty); if ('#NHPMATW'.includes(ch)) continue; tot++; if (G.lightAt(tx*48+24, ty*48+24) > 0.3) lit++; }
  const L = S.lamps; return { lamps: L.length, outdoor: L.filter(l => l.outdoor).length, indoor0: L.filter(l => !l.outdoor && !l.fl).length, upper: L.filter(l => l.fl).length, litFrac: (lit/tot).toFixed(2), fuse: !!window.__game.S && true }; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        for url in [URL, 'file:///root/game/build/preview_joseon.html']:
            await pg.goto(url); await pg.wait_for_timeout(1000)
            for si in range(3):
                await ev(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200); await ev(SKIP)
                try:
                    a = await ev(JS); await ev('() => { window.__game.S.lightsOn = false; }'); c = await ev(JS)
                    print(url[-20:], si, a, 'after fuse lit', c['litFrac'])
                except Exception as e: print(si, e)
        await b.close()
asyncio.run(main())
