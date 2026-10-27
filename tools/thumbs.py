# 의뢰 카드용 지도 미리보기를 구워 build/thumbs.json 에 저장한다 (지도가 바뀌면 다시 돌리고 build.py 다시 실행)
import asyncio, json, os
from playwright.async_api import async_playwright
OUT = os.path.join(os.path.dirname(__file__), '..', 'build', 'thumbs.json')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto('file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'build', 'preview_city.html'))); await pg.wait_for_timeout(1500)
        ids = await pg.evaluate('() => window.__game.STAGES.map((s, i) => [s.id, i, !!s.tutorial])')
        out = {}
        for sid, i, tut in ids:
            if tut: continue
            await pg.evaluate(f'() => window.__game.start({i})'); await pg.wait_for_timeout(300)
            out[sid] = await pg.evaluate("() => window.__game.stageMap(220, false).toDataURL('image/webp', 0.8)")
        json.dump(out, open(OUT, 'w')); print('지도 미리보기', len(out), '개', sum(len(v) for v in out.values()) // 1024, 'KB')
        await b.close()
asyncio.run(main())
