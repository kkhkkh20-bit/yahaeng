import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/u_'
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200); ev = pg.evaluate
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP)
        await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(2000)
        # 이동 가속: 0.05초 / 0.3초 후 속도
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(60)
        v1 = await ev('() => Math.hypot(window.__game.S.player.vx, window.__game.S.player.vy)')
        await pg.wait_for_timeout(300)
        v2 = await ev('() => Math.hypot(window.__game.S.player.vx, window.__game.S.player.vy)')
        await pg.keyboard.up('ArrowRight'); await pg.wait_for_timeout(250)
        v3 = await ev('() => Math.hypot(window.__game.S.player.vx, window.__game.S.player.vy)')
        print('speed', round(v1), round(v2), round(v3))
        # 경계 중인 자경대원 하나를 화면 밖에 두고 화살표 확인
        await ev('''() => { const G = window.__game, S = G.S, P = S.player; P.fl = 0; G.setLayer(0); P.z = 0; P.x = 23*48; P.y = 11*48+40; P.a = Math.PI/2; G.setZoom(0.85);
          const g = S.guards.find(g => !g.civ && !g.fl && !g.target); g.meter = 0.5; g.state = 'SUSPICIOUS'; }''')
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=OUT+'1c_hud.png')
        obj = await ev('() => document.getElementById("objective").innerText')
        print('OBJ', obj.replace('\n',' | '))
        # H 키로 조작 안내 접기
        await pg.keyboard.press('KeyH'); await pg.wait_for_timeout(200)
        print('keys mini', await ev('() => document.querySelector(".keys").classList.contains("mini")'))
        await pg.screenshot(path=OUT+'2_keysmini.png')
        # 미니맵 클릭 → 전술 지도
        await pg.click('#mini'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=OUT+'3_tac.png'); await pg.click('#mini'); await pg.wait_for_timeout(200)
        # 암시장: 목표 목록
        await ev('() => window.__game.start(2)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(1500)
        print('OBJ2', (await ev('() => document.getElementById("objective").innerText')).replace('\n',' | '))
        await pg.screenshot(path=OUT+'4_market.png')
        mp = await b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2); mp.on('pageerror', lambda e: errs.append('M '+str(e)))
        await mp.goto(URL); await mp.wait_for_timeout(1200); await mp.evaluate('() => window.__game.start(0)'); await mp.wait_for_timeout(300); await mp.evaluate(SKIP); await mp.wait_for_timeout(500)
        await mp.click('#entryBox button'); await mp.wait_for_timeout(1500)
        await mp.screenshot(path=OUT+'7_mobile.png')
        print(errs[:5]); await b.close()
asyncio.run(main())
