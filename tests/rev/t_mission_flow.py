"""Six mission routes: walk, open doors, take objectives, hold to kill and escape.

NPC simulation is frozen to isolate progression from stealth difficulty. Live AI,
disguises and opportunity schedules have separate regression tests.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
FLOW = Path(__file__).with_name('mission_flow.js').read_text()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        pg = await browser.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.add_init_script('window.requestAnimationFrame=()=>0')
        await pg.goto((ROOT / 'build/preview_city.html').as_uri())
        await pg.wait_for_function('!!window.__game')
        runs = 0
        for mobile in [False, True]:
            for alt in range(3):
                for sid in ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']:
                    try:
                        result = await pg.evaluate(FLOW, {'sid':sid, 'alt':alt, 'mobile':mobile})
                        await pg.wait_for_function("!document.getElementById('end').hidden && document.getElementById('endTitle').textContent==='임무 완료'", polling=100)
                    except Exception:
                        print('FAILED', sid, alt, mobile, await pg.evaluate('window.__flowTrace'))
                        raise
                    assert result['objectives'] > 0
                    runs += 1
                    print('PASS', sid, 'placement', alt, 'mobile' if mobile else 'keyboard', 'start → objectives → escape', flush=True)
        assert not errors, errors
        print('PASS', runs, 'mission playthroughs, no objective/door/key grants or player teleporting')
        await browser.close()

asyncio.run(main())
