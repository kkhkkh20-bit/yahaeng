import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H); await ev('() => T.freeze()'); await pg.wait_for_timeout(400)
        st = '() => [T.S().expo, document.getElementById("expoLbl").textContent, Math.round(T.S().player.light * 100) / 100, !!T.S().player.cover]'
        print('start', await ev(st))
        # 나무 찾기: T 타일 아래쪽 빈칸
        tr = await ev('''() => { const G = T.G(), S = T.S(); for (let ty = 2; ty < 30; ty++) for (let tx = 2; tx < 44; tx++) { const tile = (x, y) => { const P = S.player, ox = P.x, oy = P.y; return null; }; } return null; }''')
        # 경비를 플레이어 앞(밝은 곳 가정) 150px, 등 돌림 → 1, 마주봄 → 2
        setup = '''(face) => { const S = T.S(), P = S.player, g = S.guards.find(g => !g.civ && !g.target && !g.dog); P.light = 1; g.fl = 0; g.z = 0; g.x = P.x - 75; g.y = P.y; g.a = face ? 0 : Math.PI; g.want = g.a; g.state = 'PATROL'; g.meter = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.wait = 99; g.path = null; window.__g = g; }'''
        await ev(setup, False); await pg.wait_for_timeout(300); print('guard back turned', await ev(st)); await pg.screenshot(path='expo1.png')
        await ev(setup, True); await pg.wait_for_timeout(250); print('guard facing', await ev(st)); await pg.screenshot(path='expo2.png')
        # 웅크리기(살금)로 바꾸고 멀리 → 숨음?
        await ev('() => { const g = window.__g, P = T.S().player; g.x = P.x - 260; g.a = Math.PI; g.meter = 0; g.seen = false; g.state = "PATROL"; }')
        await pg.keyboard.press('ControlLeft'); await pg.wait_for_timeout(400); print('sneak far, back', await ev(st))
        print(errs[:3]); await b.close()
asyncio.run(main())
