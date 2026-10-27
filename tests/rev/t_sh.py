# 옥상 계단실: 판마다 건물 안 계단 위에 계단실이 서고, 문 앞 칸이 걸을 수 있는 지붕이며, 거기서 계단으로 오르내린다
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for si in range(6):
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(200)
            print(si, json.dumps(await pg.evaluate('''() => { const g = window.__game, S = g.S, out = { sh: 0, bad: [] };
              S.ladders.filter(l => l.kind === 'stair' && l.tz > 0).forEach(l => {
                const hasSh = g.robAt(l.tx, l.ty); if (!hasSh) { out.bad.push('계단실 없음 ' + l.tx + ',' + l.ty); return; } out.sh++;
                const dx = Math.floor(l.rx / 48), dy = Math.floor(l.ry / 48);
                if (g.rLv(dx, dy) !== l.tz || g.robAt(dx, dy)) out.bad.push('문 앞 못 걷는 칸 ' + dx + ',' + dy);
                if (Math.abs(dx - l.tx) + Math.abs(dy - l.ty) !== 1) out.bad.push('문 앞이 계단 옆이 아님 ' + dx + ',' + dy); });
              return out; }''')))
        # 01 창고 상회: 옥상 문 앞 → 계단 내려가기 → 2층 계단 칸, 다시 올라가면 문 앞
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(200)
        await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); g.S.guards.forEach(q => { q.x = -9999; }); }')
        r = await pg.evaluate('''async () => { const g = window.__game, S = g.S, P = S.player, l = S.ladders.find(l => l.kind === 'stair' && l.tz === 2 && l.rx != null && g.tileG(l.tx, l.ty + 1) !== '#');
          P.z = 2; P.x = l.rx; P.y = l.ry; const a1 = g.primaryAction().label; g.actPrimary(); await new Promise(r => setTimeout(r, 1800));
          const mid = [P.z, P.fl, Math.floor(P.x / 48), Math.floor(P.y / 48)]; const a2 = g.primaryAction().label; g.actPrimary(); await new Promise(r => setTimeout(r, 1800));
          return [a1, mid, a2, [P.z, P.fl, Math.round(P.x - l.rx), Math.round(P.y - l.ry)]]; }''')
        print('round trip', r)
        print('errs', errs[:3]); await b.close()
asyncio.run(main())
