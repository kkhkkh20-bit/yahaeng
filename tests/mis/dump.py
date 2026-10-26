import asyncio, sys
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
st = int(sys.argv[1]); fl = int(sys.argv[2]) if len(sys.argv) > 2 else 0
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1200)
        await pg.evaluate(f'() => window.__game.start({st})'); await pg.wait_for_timeout(200); await pg.evaluate(SKIP)
        r = await pg.evaluate('''(fl) => { const G = window.__game, S = G.S; G.setLayer(fl); const W = S.player && G.BLD ? null : null;
          const rows = []; for (let y = 0; ; y++) { let r = ''; let ok = true; for (let x = 0; ; x++) { let c; try { c = G.tileG(x, y); } catch (e) { c = undefined; } if (c === undefined) break; r += c; } if (!r) break; rows.push(r.split('')); if (y > 80) break; }
          const mark = (x, y, c) => { if (rows[y] && rows[y][x] !== undefined) rows[y][x] = c; };
          for (const d of S.doors) if (!fl) mark(d.tx, d.ty, d.keyLock ? d.keyLock[0].toUpperCase() : d.locked ? 'x' : 'd');
          for (const g of S.guards) if ((g.fl || 0) === fl) mark(Math.floor(g.x / 48), Math.floor(g.y / 48), g.target ? '@' : g.civ ? 'c' : g.dog ? 'g' : g.elite ? 'E' : g.hasKey ? 'k' : 'G');
          for (const it of S.items) if (it.fl === fl) mark(Math.floor(it.x / 48), Math.floor(it.y / 48), '$');
          for (const it of S.keyItems || []) if (it.fl === fl) mark(Math.floor(it.x / 48), Math.floor(it.y / 48), '%');
          for (const v of S.vents) if (!fl) mark(v.tx, v.ty, v.roof ? '^' : 'v');
          if (!fl) { mark(Math.floor(S.player.x / 48), Math.floor(S.player.y / 48), 'S'); mark(Math.floor(S.exit.x / 48), Math.floor(S.exit.y / 48), 'Z'); }
          G.setLayer(0);
          return { rows: rows.map((r, i) => String(i).padStart(2) + ' ' + r.join('')), bld: G.BLD.map((b, i) => i + ':' + [b.x0, b.y0, b.x1, b.y1, b.h].join(',')), lad: S.ladders.filter(l => l.kind !== 'fstair').map(l => l.kind + '(' + l.bx + ',' + l.by + ')z' + l.tz) }; }''', fl)
        print('\n'.join(r['rows'])); print(r['bld']); print(r['lad'][:40]); print(errs[:3])
        await b.close()
asyncio.run(main())
