"""Title screen: story mode (the campaign) and free mode (the big open city).

The title shows two main buttons. Story mode continues the campaign. Free mode builds the big city
only when pressed (the stage list and the campaign save stay as they were) and starts it without a
briefing, with action prompts hidden.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.add_init_script('try{localStorage.clear()}catch(e){}')
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats'); await q.wait_for_function('!!window.__game')
        s = await q.evaluate('''()=>({story:document.querySelector('#btnQuick b')?.textContent,free:document.querySelector('#btnFree b')?.textContent,
          freeShown:!document.getElementById('btnFree').hidden,n:__game.STAGES.length,hasCity:__game.STAGES.some(s=>s.id==='cityXL')})''')
        await q.click('#btnFree'); await q.wait_for_timeout(1500)
        s.update(await q.evaluate('''()=>({after:__game.STAGES.length,stage:__game.STAGE.id,isFree:!!__game.STAGE.freeMode,brief:!document.getElementById('brief').hidden,
          noPrompts:document.body.classList.contains('no-prompts'),hud:!document.getElementById('hud').hidden,save:localStorage.getItem('yahaeng.ch')})'''))
        print(json.dumps(s, ensure_ascii=False)); await b.close()
    def ok(v, m):
        if not v: bad.append(m)
    ok(s['story'] == '스토리 모드', 'story mode label: %s' % s['story'])
    ok(s['free'] == '자유 모드' and s['freeShown'], 'free mode button missing')
    ok(not s['hasCity'], 'big city is built before free mode is chosen')
    ok(s['after'] == s['n'] + 1 and s['stage'] == 'cityXL' and s['isFree'], 'free mode did not start the big city: %s' % s)
    ok(not s['brief'] and s['hud'] and s['noPrompts'], 'free mode should start straight in, prompts hidden')
    ok(s['save'] is None, 'free mode wrote campaign progress')
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
