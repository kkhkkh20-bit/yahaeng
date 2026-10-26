import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def run(pg, st, setup, waits, check):
    ev = pg.evaluate
    await ev(f'() => window.__game.start({st})'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
    r0 = await ev('() => { ' + setup + ' }')
    out = [r0]
    for w in waits: await pg.wait_for_timeout(w); out.append(await ev('() => { ' + check + ' }'))
    return out
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        # 휘파람: 근처 경비가 다가온다
        print('whistle', await run(pg, 0, """const S = T.S(); T.freeze(); const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); window.__w = g; g.x = 18 * 48; g.y = 13 * 48 + 24; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 999; T.at(22, 13); window.__game.S.whistleT = 0; window.__game.whistle(); return 1;""",
            [100, 2500], "const g = window.__w; return [g.state, Math.round(Math.hypot(g.x - T.S().player.x, g.y - T.S().player.y)), g.say];"))
        # 핏자국
        print('blood', await run(pg, 0, """const S = T.S(); T.freeze(); const g = S.guards.find(g => !g.civ && !g.dog && !g.target && !g.fl); window.__w = g; g.x = 18 * 48; g.y = 13 * 48 + 24; g.a = 0; g.want = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 999; S.decals.push({ x: 20 * 48, y: 13 * 48 + 24, r: 16, rot: 0, fl: 0 }); T.at(2, 26); return 1;""",
            [800], "const g = window.__w; return [g.state, g.say, T.S().alevel];"))
        # 무전기 없음: 근처만
        print('radio', await run(pg, 0, """const S = T.S(); const gs = S.guards.filter(g => !g.civ && !g.dog); return gs.map(g => [g.id, g.radio ? 1 : 0, g.elite ? 1 : 0]);""", [], ""))
        print(errs[:3]); await b.close()
asyncio.run(main())
