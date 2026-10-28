# 첫 화면 배경: 실제 게임 장면(의뢰 2 네온 골목)을 HUD 없이 찍어 build/title_bg.json 에 저장한다 (build.py 가 window.__TITLE_BG 로 넣는다)
import asyncio, json, os, base64, io
from playwright.async_api import async_playwright
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'build', 'title_bg.json')
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1100, 'height': 1100})
        await pg.goto('file://' + os.path.abspath(os.path.join(ROOT, 'build', 'preview_city.html'))); await pg.wait_for_timeout(1500)
        await pg.evaluate("() => { const G = window.__game; G.start(G.STAGES.findIndex(s => s.id === 'm2')); }"); await pg.wait_for_timeout(600); await pg.evaluate(SK)
        # 주인공은 네온 골목 어둑한 쪽에서 웅크린 채 클럽 쪽을 본다. 문지기·순찰은 제자리에
        await pg.evaluate('''() => { const G = window.__game, S = G.S, P = S.player; P.x = 36 * 48 + 30; P.y = 17 * 48 + 20; P.a = Math.PI * 1.1; P.z = 0; P.fl = 0; G.input.sneakToggle = true;
          S.guards.forEach(g => { if (g.civ && !['bartender'].includes(g.tag)) { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; } });
          window.__skip.ui = true; const st = document.createElement('style'); st.textContent = 'body > *:not(#game) { visibility: hidden !important; } #game { visibility: visible !important; }'; document.head.appendChild(st);
          G.cam.x = 29 * 48; G.cam.y = 15 * 48; }''')
        await pg.wait_for_timeout(2500)
        await pg.evaluate('() => { const G = window.__game; G.cam.x = 29 * 48; G.cam.y = 15 * 48; }'); await pg.wait_for_timeout(200)
        png = await pg.screenshot()
        await b.close()
    im = Image.open(io.BytesIO(png)).convert('RGB').resize((880, 880), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=62); url = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    json.dump(url, open(OUT, 'w')); im.save(os.path.join(ROOT, 'build', 'title_bg_check.png'))
    print('첫 화면 배경', len(buf.getvalue()) // 1024, 'KB')
asyncio.run(main())
