import asyncio, json
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = """window.T = {
  G: () => window.__game, S: () => window.__game.S,
  at(x, y, fl = 0, z = 0) { const G = this.G(), P = G.S.player; P.fl = fl; G.setLayer(fl); P.z = z; P.under = false; P.vent = false; P.hide = null; P.x = x * 48 + 24; P.y = y * 48 + 24; },
  act() { const a = this.G().primaryAction(); return a.label + '|' + a.k; },
  calm() { for (const g of this.S().guards) { g.meter = 0; } this.S().alevel = 0; },
  freeze() { for (const g of this.S().guards) if (!g.target) { g.x = -5000; g.y = -5000; g.route = [{ x: -5000, y: -5000, pause: 999 }]; g.path = null; } }
};"""
async def run(pg, st, steps):
    if isinstance(st, str): st = await pg.evaluate(f"() => window.__game.STAGES.findIndex(s => s.id === '{st}')")
    await pg.evaluate(f'() => window.__game.start({st})'); await pg.wait_for_timeout(250); await pg.evaluate(SKIP); await pg.evaluate(H)
    out = []
    for s in steps:
        r = await pg.evaluate('() => { ' + s + ' }'); out.append(r); await pg.wait_for_timeout(60)
    return out
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1200)
        # M1-a: 뒷골목 → 뒷문(잠기지 않음) → 창고 → 사무실 장부 → 서쪽 출구
        print('M1a', await run(pg, 'm1', [
          "T.freeze(); T.at(30, 5); return [T.G().tileG(30, 6), T.act()];",
          "T.G().actPrimary(); return 1;",
          "T.at(30, 7); return T.G().astar(30, 7, 36, 9).length > 0;",
          "T.at(36, 9); return 1;"]))
        await pg.wait_for_timeout(400)
        await pg.evaluate('() => { const S = T.S(), P = S.player, it = S.items[0]; P.x = it.x; P.y = it.y; P.fl = it.fl || 0; P.z = 0; T.G().actPrimary(); }')
        await pg.wait_for_timeout(3000)
        print('M1a item', await pg.evaluate('() => [T.S().items[0].got, T.S().alevel]'))
        # M1-c: 옥상 계단실 → 계단으로 내려가기 (도전 '옥상 계단실로 들어가기')
        print('M1c', await pg.evaluate('''async () => { const g = T.G(), S = T.S(), P = S.player; T.freeze(); const l = S.ladders.find(l => l.kind === 'stair' && l.tz === 2 && l.rx != null);
          P.z = 2; P.fl = 0; P.x = l.rx; P.y = l.ry; const a = g.primaryAction().label; g.actPrimary(); await new Promise(r => setTimeout(r, 1500));
          return [a, P.z, P.fl, S.stats.roofStair]; }'''))
        # (M2 카드 경로는 미션 2를 다시 짤 때 새로 쓴다 — 예전 카드 배치는 없어졌다)
        # (M3 카드 경로도 미션 3을 다시 짤 때 새로 쓴다)
        print(errs[:3]); await b.close()
asyncio.run(main())
