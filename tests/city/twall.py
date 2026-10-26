import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]; pg = await b.new_page(); pg.on('pageerror', lambda e: errs.append(str(e.stack)[:600])); ev = pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(200); await ev(SKIP)
        # 빌라 1(20..37, 1..9) 남쪽 벽(y=9)을 사이에 두고: 나는 바깥 골목 (25,10), 경비는 안 (25,8)
        r = await ev('''() => { const G = window.__game, S = G.S, P = S.player; const g = S.guards.find(g => !g.civ && !g.dog && !g.target);
          S.guards.forEach(o => { if (o !== g) { o.x = -3000; o.route = [{ x: -3000, y: -3000, pause: 999 }]; } });
          const set = (gx, gy) => { g.fl = 0; g.x = gx * 48 + 24; g.y = gy * 48 + 24; g.state = 'PATROL'; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 99; g.path = null; };
          G.setLayer(0); const out = [];
          set(26, 8); G.noise(26 * 48 + 24, 10 * 48 + 24, 250, 'step', 0); out.push(['벽 너머 2칸, 달리기', G.tileG(26, 9), g.state]);
          set(29, 10); G.noise(26 * 48 + 24, 10 * 48 + 24, 250, 'step', 0); out.push(['열린 골목 3칸, 달리기', g.state]);
          set(26, 8); G.noise(26 * 48 + 24, 10 * 48 + 24, 110, 'step', 0); out.push(['벽 너머 2칸, 걷기', g.state]);
          return out; }''')
        for x in r: print(x)
        # 걷기 고정
        await pg.keyboard.press('KeyR')
        await pg.keyboard.down('ShiftLeft'); await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(400)
        print('walk lock mode', await ev('() => window.__game.S.player.mode'))
        await pg.keyboard.up('ArrowRight'); await pg.keyboard.up('ShiftLeft')
        await pg.keyboard.press('KeyR')
        await pg.keyboard.down('ShiftLeft'); await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(400)
        print('unlocked mode', await ev('() => window.__game.S.player.mode'))
        print(errs[:3]); await b.close()
asyncio.run(main())
