import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        print(await ev('''() => { const G = window.__game, S = G.S; const st = [45, 20], L = (a, b) => G.astar(a[0], a[1], b[0], b[1]).length;
          const pts = { plaza: [22, 13], vaultBack: [25, 2], yard: [6, 28], exit: [0, 12], deadEnd: [18, 30], garden: [42, 5], houseYard: [33, 12] };
          const out = {}; for (const k in pts) out[k] = L(st, pts[k]);
          // 빗장 풀면
          S.doors.filter(d => d.gate).forEach(d => { d.group.forEach(t => { t.locked = false; }); });
          for (const d of S.doors.filter(d => d.gate)) G.tileG && 0;
          return out; }'''))
        await b.close()
asyncio.run(main())
