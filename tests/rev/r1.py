import asyncio, time
from playwright.async_api import async_playwright
URL='file:///root/game/build/yahaeng_city.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, ctx in [('pc', dict(viewport={'width':1280,'height':760})), ('mo', dict(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, device_scale_factor=2))]:
            c = await b.new_context(**ctx); pg = await c.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text))
            t0=time.time(); await pg.goto(URL); await pg.wait_for_load_state('load'); t1=time.time()
            await pg.wait_for_timeout(1500); await pg.screenshot(path=f'{name}_title.png')
            print(name, 'load', round(t1-t0,2), 'intro text:', (await pg.inner_text('#intro'))[:600].replace('\n',' | '))
            # 첫 미션 시작: 실제 버튼 클릭
            await pg.click('#btnLedger'); await pg.wait_for_timeout(300)  # 의뢰 장부 화면을 연다
            btns = await pg.query_selector_all('#stageList button, #stageList [data-i], #stageList li')
            print('stage items', len(btns))
            if btns: await btns[0].click()
            await pg.wait_for_timeout(800); await pg.screenshot(path=f'{name}_start.png')
            # 대사 넘기기: 실제 탭/스페이스
            for i in range(12):
                modal = await pg.evaluate('() => window.__game && window.__game.DLG && window.__game.DLG.modal')
                if not modal: break
                if name=='pc': await pg.keyboard.press('Space')
                else: await pg.tap('#dlg')
                await pg.wait_for_timeout(250)
                if i==0: await pg.screenshot(path=f'{name}_dlg.png')
            await pg.wait_for_timeout(500); await pg.screenshot(path=f'{name}_play.png')
            # FPS 측정 (모바일은 CPU 4배 감속)
            if name=='mo':
                cdp = await c.new_cdp_session(pg); await cdp.send('Emulation.setCPUThrottlingRate', {'rate':4})
            fps = await pg.evaluate('''() => new Promise(r => { let n=0, t0=performance.now(); const f=()=>{ n++; if (performance.now()-t0<3000) requestAnimationFrame(f); else r(n/3); }; requestAnimationFrame(f); })''')
            print(name, 'fps', round(fps,1))
            print(name, 'errs', errs[:3]); await c.close()
        await b.close()
asyncio.run(main())
