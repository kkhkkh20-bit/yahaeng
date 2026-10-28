# itch 데모 묶음: 연습 3개와 의뢰 1~3만 고를 수 있고, 나머지는 잠긴 카드 하나 · 의뢰 3을 깨도 [다음 의뢰]가 없다
import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_demo.html'); await pg.wait_for_timeout(1500)
        r = await pg.evaluate("() => { const G = window.__game; return { ids: [...document.querySelectorAll('#stageList .stage[data-i]')].map(b => G.STAGES[+b.dataset.i].id), locked: document.querySelectorAll('#stageList .stage.locked').length, thumbs: document.querySelectorAll('#stageList img.st-map').length }; }")
        print('데모 목록', r)
        if sorted(r['ids']) != sorted(['tI', 't0', 't1', 'm1', 'm2', 'm3']) or r['locked'] != 1: bad.append(f'데모 목록이 다르다 {r}')
        if r['thumbs'] < 2: bad.append(f'의뢰 카드 지도 미리보기가 없다 {r}')
        si = await pg.evaluate("() => window.__game.STAGES.findIndex(s => s.id === 'm3')")
        await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(400)
        await pg.evaluate('() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }')
        await pg.evaluate('() => window.__game.endGame(true)'); await pg.wait_for_timeout(800)
        nx = await pg.evaluate("() => document.getElementById('btnNext').hidden"); print('의뢰 3 뒤 다음 버튼 숨김', nx)
        if not nx: bad.append('데모에서 의뢰 3 다음으로 잠긴 의뢰가 열린다')
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
