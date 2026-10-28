import asyncio
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP='() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
ST='() => { const S = window.__game.S, R = S.radioCall; return [S.alevel, R ? [R.g.state, +R.t.toFixed(2), !!R.g.radio] : null, S.guards.filter(g=>g.state==="SEARCH").length]; }'
async def run(b, mode):
    pg = await b.new_page(viewport={'width':1280,'height':760}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    # 구역 규칙이 없는 옛 판(의뢰 4): 무전기 든 자경대원 앞 시야 안에 서서 들킨다 (발견 게이지 2~3초)
    si = await pg.evaluate("() => window.__game.STAGES.findIndex(s => s.id === 'm4')")
    await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP); await pg.wait_for_timeout(200)
    await pg.evaluate('() => { window.__game.STAGE.zones = null; }')  # 무전 규칙만 본다: 구역 없이(의뢰 4도 이제 구역 판이다)
    await pg.evaluate('''() => { const S = window.__game.S, P = S.player; const g = S.guards.find(g => g.radio && !g.civ && !g.dog && !g.elite && !(g.fl || 0) && !(g.z || 0) && g.state === 'PATROL');
      S.guards.forEach(o => { if (o !== g) { o.x = -9999; o.y = -9999; o.route = [{ x: -9999, y: -9999, pause: 999 }]; o.path = null; } });
      const G = window.__game, ok = (x, y) => !G.solidAt(Math.floor(x / 48), Math.floor(y / 48));
      const l = S.lamps.find(l => l.outdoor && !l.off && !l.broken && !(l.fl || 0) && ok(l.x, l.y) && ok(l.x - 110, l.y));  // 밝은 가로등 밑에 서서, 서쪽에서 보는 자경대원에게 들킨다
      g.x = l.x - 110; g.y = l.y; g.a = 0; g.want = 0; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.path = null; g.wait = 99; g.post = 0;
      P.x = l.x; P.y = l.y; P.fl = 0; P.z = 0; }''')
    for i in range(90):
        await pg.wait_for_timeout(100)
        if await pg.evaluate('() => !!window.__game.S.radioCall'): break
    print(mode, 'call', await pg.evaluate(ST))
    await pg.wait_for_timeout(700); await pg.screenshot(path=f'radio_{mode}.png', clip={'x':300,'y':200,'width':400,'height':260})
    if mode == 'wait':
        for i in range(6):
            await pg.wait_for_timeout(600); print(' ', await pg.evaluate(ST))
    elif mode == 'kill':
        print(' act', await pg.evaluate('''() => { const G = window.__game, S = G.S, g = S.radioCall.g, P = S.player; P.x = g.x + Math.cos(g.a) * 40; P.y = g.y + Math.sin(g.a) * 40; P.fl = g.fl || 0; P.z = 0; P.a = Math.atan2(g.y - P.y, g.x - P.x); return G.primaryAction().label + '|' + G.primaryAction().k; }'''))
        await pg.evaluate('() => window.__game.actPrimary()')
        for i in range(5):
            await pg.wait_for_timeout(700); print(' ', await pg.evaluate(ST), await pg.evaluate('() => window.__game.S.over'))
    elif mode == 'dart':
        print(' dart', await pg.evaluate('''() => { const G = window.__game, S = G.S, g = S.radioCall.g, P = S.player; P.x = g.x + Math.cos(g.a) * 150; P.y = g.y + Math.sin(g.a) * 150; P.a = Math.atan2(g.y - P.y, g.x - P.x); P.kunai = Math.max(1, P.kunai || 0); return Object.keys(G).filter(k => /tool|throw|use/i.test(k)).join(','); }'''))
        await pg.keyboard.press('Digit3'); await pg.wait_for_timeout(100); print(' tool', await pg.inner_text('#btnTool')); await pg.keyboard.press('x'); await pg.wait_for_timeout(1500)
        print(' ', await pg.evaluate(ST), await pg.evaluate('() => window.__game.S.radioCall ? 0 : window.__game.S.stats.radioCut'))
    print(mode, 'errs', errs[:3]); await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for m in ['kill', 'dart']: await run(b, m)
        await b.close()
asyncio.run(main())
