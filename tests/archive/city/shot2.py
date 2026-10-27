import asyncio, json
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/64cb97c3-9376-55b4-828f-fb2b40e7e7a0/scratchpad/city/p_'
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); g.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'1_title.png')
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(700); await pg.screenshot(path=OUT+'2_brief.png')
        await pg.evaluate(SKIP); await pg.wait_for_timeout(6000)
        # 전경: 가운데 사무실 빌라 옥상 위
        await pg.evaluate('() => { const S = window.__game.S, P = S.player; P.z = 3; P.x = 18*48; P.y = 12*48+20; window.__game.setZoom(0.62); S.toasts.length = 0; }')
        await pg.wait_for_timeout(450); await pg.evaluate('() => { window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'3_overview.png')
        # 전깃줄 위 + 아래 순찰
        await pg.evaluate('''() => { const S = window.__game.S, P = S.player; const w = S.wires.find(w => w.a.pole && w.b.pole && w.a.y === w.b.y && w.a.tx === undefined && w.a.x < 600); P.wire = {w, s: 0.45}; P.z = 3; P.x = w.a.x + (w.b.x-w.a.x)*0.45; P.y = w.a.y;
          const g = S.guards[0]; g.x = P.x + 50; g.y = P.y + 46; g.a = 0; g.state = 'PATROL'; g.meter = 0; window.__game.setZoom(1.0); S.toasts.length = 0; }''')
        await pg.wait_for_timeout(250); await pg.evaluate('() => { window.__game.S.toasts.length = 0; }'); await pg.screenshot(path=OUT+'4_wire.png')
        print(await pg.evaluate('() => window.__game.primaryAction().label'))
        await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(120); await pg.screenshot(path=OUT+'5_drop.png')
        # 살피기 모드
        await pg.evaluate('() => { const S = window.__game.S, P = S.player; P.x = 19*48; P.y = 10*48+30; P.z = 0; window.__game.setZoom(0.7); window.__game.input.scan = true; S.toasts.length = 0; }')
        await pg.wait_for_timeout(500); await pg.screenshot(path=OUT+'6_scan.png')
        mp = await b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2); mp.on('pageerror', lambda e: errs.append('M '+str(e)))
        await mp.goto(URL); await mp.wait_for_timeout(1200); await mp.screenshot(path=OUT+'7_m_title.png')
        await mp.evaluate('() => window.__game.start(0)'); await mp.wait_for_timeout(400); await mp.evaluate(SKIP)
        await mp.evaluate('''() => { const S = window.__game.S, P = S.player; const w = S.wires.find(w => w.a.pole && w.b.pole && w.a.y === w.b.y); P.wire = {w, s: 0.3}; P.z = 3; P.x = w.a.x + (w.b.x-w.a.x)*0.3; P.y = w.a.y; S.toasts.length = 0; }''')
        await mp.wait_for_timeout(1200); await mp.evaluate('() => { window.__game.S.toasts.length = 0; }'); await mp.screenshot(path=OUT+'8_m_wire.png')
        print(errs[:5]); await b.close()
asyncio.run(main())
