"""Main menu keyboard access, filters and embedded title font."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        root = Path(__file__).resolve().parents[2]
        await page.goto((root / 'build/preview_city.html').as_uri())
        await page.evaluate('document.fonts.ready')
        assert await page.locator('#intro h1').inner_text() == '야행'
        assert await page.evaluate('document.fonts.check(\'100px "Yahaeng Title"\')')
        assert await page.locator('#intro .brief, #intro .title-kicker, #intro .title-en').count() == 0
        await page.keyboard.press('ArrowDown')
        assert await page.locator('#btnQuick').evaluate('(e) => e === document.activeElement')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        assert await page.locator('#ledger').is_visible()
        assert await page.locator('#stageList .stage.tut:visible').count() == 0
        assert await page.locator('#stageList .stage:not(.tut):visible').count() > 0
        await page.click('.ledger-tabs [data-filter="training"]')
        assert await page.locator('#stageList .stage.tut:visible').count() == 3
        assert await page.locator('#stageList .stage:not(.tut):visible').count() == 0
        await page.keyboard.press('Escape')
        assert await page.locator('#intro').is_visible()
        assert await page.locator('#btnLedger').evaluate('(e) => e === document.activeElement')
        await page.keyboard.press('Enter')
        assert await page.locator('#stageList .stage.tut:visible').count() == 3
        await page.click('.ledger-tabs [data-filter="missions"]')
        await page.locator('#stageList .stage:not(.tut):not(.locked)').first.click()
        assert await page.locator('#brief').is_visible()
        await page.keyboard.press('Tab')
        assert await page.evaluate("['BUTTON','SUMMARY'].includes(document.activeElement.tagName) && !!document.activeElement.closest('#brief')")
        await page.keyboard.press('Escape')
        assert await page.locator('#ledger').is_visible()
        await page.keyboard.press('Escape')
        await page.click('#btnHelp')
        await page.keyboard.press('Escape')
        assert await page.locator('#btnHelp').evaluate('(e) => e === document.activeElement')
        assert not errors, errors
        await browser.close()
    print('menu: title font, keyboard navigation, focus return, filters and briefing back passed')

asyncio.run(main())
