import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('troutes.py').read().split('H = """')[1].split('"""')[0]
async def run(pg, st, steps, fresh=True):
    if fresh:
        await pg.evaluate(f'() => window.__game.start({st})'); await pg.wait_for_timeout(250); await pg.evaluate(SKIP); await pg.evaluate(H)
    out = []
    for s in steps:
        if s.startswith('WAIT'): await pg.wait_for_timeout(int(s[4:])); continue
        out.append(await pg.evaluate('() => { ' + s + ' }')); await pg.wait_for_timeout(60)
    return out
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1200)
        # M1: 순찰 경비 등 뒤에서 [특수]
        print('M1 steal', await run(pg, 0, [
          "const S = T.S(), g = S.guards.find(g => g.hasKey === 'red'); const P = S.player; P.x = g.x - Math.cos(g.a) * 36; P.y = g.y - Math.sin(g.a) * 36; P.a = g.a; return T.G().secondaryAction().label;",
          "T.G().actCarry(); return [Object.keys(T.S().player.keys), T.S().alevel];"]))
        # M4: 수금원 처치 → 빨강 떨어짐 → 줍기
        print('M4', await run(pg, 4, [
          "const S = T.S(), t = S.guards[0]; T.S().guards[1].x = -5000; T.S().guards[1].follow = null; const P = S.player; P.x = t.x - Math.cos(t.a) * 34; P.y = t.y - Math.sin(t.a) * 34; P.a = t.a; return T.act();",
          "T.G().actPrimary(); return 1;", "WAIT900",
          "const S = T.S(); return [S.guards[0].state, S.keyDrop && S.keyDrop.key];",
          "const S = T.S(); if (S.keyDrop) { S.player.x = S.keyDrop.x; S.player.y = S.keyDrop.y; } return 1;", "WAIT300",
          "return Object.keys(T.S().player.keys);",
          "T.freeze(); T.at(13, 7); return T.act();",
          "T.G().actPrimary(); T.at(12, 5); return 1;", "WAIT200", "T.at(13, 4); return 1;", "WAIT200",
          "return [Object.keys(T.S().player.keys), T.S().items.map(i => i.got)];",
          "const k = T.S().keyItems[1]; T.at(Math.floor(k.x/48), Math.floor(k.y/48), k.fl); return [k.fl, Math.floor(k.x/48), Math.floor(k.y/48)];", "WAIT200",
          "T.at(25, 7); return [Object.keys(T.S().player.keys), T.act()];",
          "T.G().actPrimary(); T.at(25, 4); return 1;", "WAIT200",
          "T.at(44, 4); return [T.S().items.map(i => i.got), T.act()];"]))
        print(errs[:3]); await b.close()
asyncio.run(main())
