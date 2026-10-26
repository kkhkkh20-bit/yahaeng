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
        # M1-a: 순찰 경비 카드 훔치기
        print('M1a', await run(pg, 0, [
          "const S = T.S(), g = S.guards.find(g => g.hasKey === 'red'); T.freeze(); g.x = 20*48+24; g.y = 14*48+24; g.a = 0; g.want = 0; g.route = [{x: g.x, y: g.y, pause: 999}]; g.wait = 99; T.at(19, 14); S.player.x = g.x - 34; S.player.a = 0; return T.act();",
          "T.G().actPrimary(); return Object.keys(T.S().player.keys);",
          "T.at(17, 7); return T.act();",
          "T.G().actPrimary(); return T.act();",
          "T.at(17, 5); return [T.act(), T.S().items[0].got];",
          "T.at(17, 4); return T.S().items[0].got;"]))
        await pg.wait_for_timeout(300)
        print('M1a item', await pg.evaluate('() => T.S().items[0].got'))
        # M1-b: 숙소 2층 카드
        print('M1b', await run(pg, 0, ["const k = T.S().keyItems[0]; T.freeze(); T.at(Math.floor(k.x/48), Math.floor(k.y/48), k.fl); return [k.fl, Math.floor(k.x/48), Math.floor(k.y/48)];"]))
        await pg.wait_for_timeout(300); print('M1b got', await pg.evaluate('() => [T.S().keyItems[0].got, Object.keys(T.S().player.keys)]'))
        # M1-c: 옥상 환풍구 → 금고방
        print('M1c', await run(pg, 0, [
          "T.freeze(); const v = T.S().vents.find(v => v.roof); T.at(v.tx, v.ty, 0, v.z); return [v.tx, v.ty, v.z, T.act()];",
          "T.G().actPrimary(); return [T.S().player.vent, T.act()];",
          "const g = T.S().vents.find(v => !v.roof && v.tx === 17 || (!v.roof && v.ty === 4)); const P = T.S().player; P.x = g.x; P.y = g.y; return [g.tx, g.ty, T.act()];",
          "T.G().actPrimary(); const P = T.S().player; return [P.vent, Math.floor(P.x/48), Math.floor(P.y/48)];"]))
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
