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
        print('M1a', await run(pg, 0, [
          "T.freeze(); T.at(30, 5); return [T.G().tileG(30, 6), T.act()];",
          "T.G().actPrimary(); return 1;",
          "T.at(30, 7); return T.G().astar(30, 7, 36, 9).length > 0;",
          "T.at(36, 9); return 1;"]))
        await pg.wait_for_timeout(400)
        print('M1a item', await pg.evaluate('() => [T.S().items[0].got, T.S().alevel]'))
        # M1-c: 옥상 계단실 → 계단으로 내려가기 (도전 '옥상 계단실로 들어가기')
        print('M1c', await pg.evaluate('''async () => { const g = T.G(), S = T.S(), P = S.player; T.freeze(); const l = S.ladders.find(l => l.kind === 'stair' && l.tz === 2 && l.rx != null);
          P.z = 2; P.fl = 0; P.x = l.rx; P.y = l.ry; const a = g.primaryAction().label; g.actPrimary(); await new Promise(r => setTimeout(r, 1500));
          return [a, P.z, P.fl, S.stats.roofStair]; }'''))
        # M2: 빨강(2층 경비) → 금고 → 파랑 카드 → VIP 뒷문 → 표적
        print('M2', await run(pg, 1, [
          "const S = T.S(), g = S.guards.find(g => g.hasKey === 'red'); return [g.fl, Math.floor(g.x/48), Math.floor(g.y/48)];",
          "const S = T.S(); S.player.keys.red = true; T.freeze(); T.at(5, 7); return T.act();",
          "T.G().actPrimary(); T.at(3, 5); return 1;",
          "return [Object.keys(T.S().player.keys), T.S().keyItems[0].got];",
          "T.at(5, 4); return 1;",
          "return T.S().items[0].got;",
          "T.at(36, 4); return T.act();",
          "T.G().actPrimary(); T.at(32, 4); T.S().player.a = Math.PI; return T.act();"]))
        # M3: 전깃줄로 본채 옥상
        print('M3', await run(pg, 2, [
          "const S = T.S(); return S.wires.filter(w => w.b.roof || w.a.roof).map(w => [w.a.tx, w.a.ty, w.b.tx, w.b.ty, w.b.z]);",
          "const S = T.S(), g = S.guards.find(g => g.hasKey === 'green'); return [Math.floor(g.x/48), Math.floor(g.y/48)];",
          "T.S().player.keys.green = true; T.freeze(); T.at(21, 14); return T.act();",
          "const it = T.S().items[0]; return [it.fl, Math.floor(it.x/48), Math.floor(it.y/48)];"]))
        print(errs[:3]); await b.close()
asyncio.run(main())
