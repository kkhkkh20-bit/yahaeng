"""Free-mode big map and GPS.
- Tapping the minimap in free mode opens the city map (not the stealth tactical view); the player freezes while it is open.
- Tapping the map sets a destination flag and closes it; a route along walkable tiles (roads when driving) is found and
  drawn; arriving within 120 px clears it with a banner.
- Leaving free mode for the title screen removes free-mode overlays and the body class."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
SP = R / 'build/test_logs'; SP.mkdir(parents=True, exist_ok=True)

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); q = await b.new_page(viewport={'width': 1280, 'height': 800}); errs = []
        q.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await q.goto((R / 'build/preview_city.html').as_uri() + '?nostats'); await q.wait_for_function('!!window.__game')
        await q.wait_for_timeout(800); await q.click('#btnFree'); await q.wait_for_function('__game.S && __game.S.t>0.5', timeout=120000)
        await q.evaluate("()=>{const G=__game;while(G.DLG.modal)G.advanceDialog();}")
        await q.click('#mini'); await q.wait_for_timeout(400)
        st = await q.evaluate("()=>({open:__game.events.mapOpen,tac:!document.getElementById('tacBanner').hidden,frozen:__game.S.shopOpen})"); print('open', st)
        ok(bad, st['open'] and not st['tac'] and st['frozen'], 'minimap does not open the city map: %s' % st)
        await q.screenshot(path=str(SP / 'citymap.png'))
        # tap somewhere ~1/3 across the map
        box = await q.evaluate("()=>{const r=document.querySelector('#cityMap canvas').getBoundingClientRect();return [r.left,r.top,r.width,r.height]}")
        await q.mouse.click(box[0] + box[2] * 0.62, box[1] + box[3] * 0.45); await q.wait_for_timeout(600)
        r = await q.evaluate("()=>{const G=__game,S=G.S;for(let i=0;i<60;i++)G.update(1/60);return {closed:!G.events.mapOpen,wp:!!S.wp,path:S.wpPath&&S.wpPath.length,frozen:S.shopOpen}}"); print('route', r)
        ok(bad, r['closed'] and r['wp'] and (r['path'] or 0) >= 2 and not r['frozen'], 'no destination/route: %s' % r)
        r = await q.evaluate("()=>{const G=__game,S=G.S,P=S.player;P.x=S.wp.x+40;P.y=S.wp.y;for(let i=0;i<10;i++)G.update(1/60);return {cleared:!S.wp}}"); print('arrive', r)
        ok(bad, r['cleared'], 'arriving does not clear the destination: %s' % r)
        # leave to title: no free-mode leftovers
        r = await q.evaluate("()=>{document.getElementById('btnPause').click();document.getElementById('btnMenu2').click();return {cls:document.body.classList.contains('free-city'),banner:!!document.getElementById('evBanner'),label:document.getElementById('btnMenu2').textContent}}")
        print('menu', r); ok(bad, not r['cls'] and not r['banner'] and r['label'] == '처음 화면', 'free-mode leftovers on the title: %s' % r)
        ok(bad, not errs, 'page errors: %s' % errs)
        await b.close()
    print('통과' if not bad else '문제', bad); sys.exit(1 if bad else 0)
def ok(bad, v, m):
    if not v: bad.append(m)
asyncio.run(main())
