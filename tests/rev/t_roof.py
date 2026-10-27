# 옥상 살림 막힘: 판마다 막힘 칸 수, 지도 검증, 지붕 경비 경로, 지붕 연결, 옥탑방에 막히는지, 옥탑방 뒤 시선 가림
import asyncio, json
from playwright.async_api import async_playwright
CHECK = '''() => {
  const g = window.__game, S = g.S, out = { id: g.kitSpec().id, rob: 0, guards: [], split: [] };
  const R = []; for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) { try { if (g.robAt(x, y)) R.push([x, y]); } catch (e) {} }
  out.rob = R.length;
  S.guards.forEach(q => { if (!q.z || !q.route || q.route.length < 2) return; const sol = g.solidFor(q.z); for (let i = 0; i < q.route.length; i++) { const a = q.route[i], b = q.route[(i + 1) % q.route.length]; const p = g.astar(Math.floor(a.x / 48), Math.floor(a.y / 48), Math.floor(b.x / 48), Math.floor(b.y / 48), sol); if (!p.length && (Math.floor(a.x/48) !== Math.floor(b.x/48) || Math.floor(a.y/48) !== Math.floor(b.y/48))) out.guards.push(q.id + ':' + i); } });
  g.BLD.forEach((b, bi) => { const L = g.lvAt(b.x0, b.y0); if (!L) return; const cells = []; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (g.rLv(x, y) === L && !g.robAt(x, y)) cells.push(x + ',' + y);
    if (!cells.length) return; const set = new Set(cells), seen = new Set([cells[0]]), q = [cells[0]]; while (q.length) { const [x, y] = q.pop().split(',').map(Number); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const k = (x+dx) + ',' + (y+dy); if (set.has(k) && !seen.has(k)) { seen.add(k); q.push(k); } } } if (seen.size !== set.size) out.split.push(bi); });
  out.first = R[0] || null; return out; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        print('validate', json.dumps(await pg.evaluate('() => window.__game.validate()'), ensure_ascii=False)[:600])
        for si in range(6):
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300)
            await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }')
            print(si, json.dumps(await pg.evaluate(CHECK)))
        # 옥탑방에 막히는가: 01에서 첫 막힘 칸 아래(남쪽) 칸에 서서 북쪽으로 1.5초 걷는다
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300)
        await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); g.S.guards.length = 0; }')
        r = await pg.evaluate('''() => { const g = window.__game, S = g.S, P = S.player; let c = null; for (let y = 0; y < 60 && !c; y++) for (let x = 0; x < 60 && !c; x++) if (g.robAt(x, y) && !g.robAt(x, y + 1) && g.rLv(x, y + 1) > 0) c = [x, y];
          if (!c) return null; P.z = g.rLv(c[0], c[1] + 1); P.x = c[0] * 48 + 24; P.y = (c[1] + 1) * 48 + 30; window.__c = c; return [c, P.z]; }''')
        print('start', r)
        await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(1500); await pg.keyboard.up('ArrowUp')
        print('after walk', await pg.evaluate('() => { const P = window.__game.S.player; return [Math.round(P.x), Math.round(P.y), P.z, Math.floor(P.y / 48), window.__c[1]]; }'))
        await pg.screenshot(path='/root/game/tests/rev/roof_block.png')
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
