import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/q_'
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
CLR = '() => { window.__game.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200); ev = pg.evaluate
        await pg.screenshot(path=OUT+'0_title.png')
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.wait_for_timeout(1200); await ev(CLR)
        await pg.screenshot(path=OUT+'1_entry.png')
        await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(2500)
        async def at(js, name, wait=600):
            await ev('() => { const G = window.__game, S = G.S, P = S.player; ' + js + ' S.toasts.length = 0; }'); await pg.wait_for_timeout(wait); await ev(CLR); await pg.screenshot(path=OUT+name)
        # 창문 시야: 빌라 1(20..37, 1..9) 앞 골목
        await at('P.fl = 0; G.setLayer(0); P.z = 0; P.wire = null; P.x = 23*48; P.y = 11*48+40; P.a = Math.PI/2; G.setZoom(0.85);', '2_winsight.png')
        await at('G.input.scan = true;', '3_scanplan.png'); await ev('() => { window.__game.input.scan = false; }')
        # 주민이 자는 집 2층
        await at('const c = S.guards.find(g => g.civ && g.fl === 1); P.fl = 1; G.setLayer(1); P.x = c.x + 70; P.y = c.y + 20; P.mode = "sneak"; G.setZoom(0.85);', '4_residents.png')
        # 한 선생 집
        await ev('() => window.__game.start(1)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(1500)
        await at('P.fl = 0; G.setLayer(0); P.x = 22*48+24; P.y = 15*48+24; G.setZoom(0.85);', '5_doc1F.png')
        await at('P.fl = 1; G.setLayer(1); P.x = 22*48+24; P.y = 15*48+24;', '6_doc2F.png')
        # 암시장
        await ev('() => window.__game.start(2)'); await pg.wait_for_timeout(300); await ev(SKIP); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(1500)
        await at('P.fl = 0; G.setLayer(0); P.z = 0; P.x = 22*48; P.y = 21*48; P.a = -Math.PI/2; G.setZoom(0.62);', '7_market.png')
        mp = await b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2); mp.on('pageerror', lambda e: errs.append('M '+str(e)))
        await mp.goto(URL); await mp.wait_for_timeout(1200); await mp.evaluate('() => window.__game.start(1)'); await mp.wait_for_timeout(300); await mp.evaluate(SKIP); await mp.wait_for_timeout(800)
        await mp.screenshot(path=OUT+'8_m_entry.png')
        print(errs[:5]); await b.close()
asyncio.run(main())
