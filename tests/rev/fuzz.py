import asyncio, random, sys, json
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
ACT = ['Space', 'z', 'x', 'c', 'v', 'ControlLeft', 'Digit1', 'Digit2', 'Digit3', 'AltLeft', 'm', 'Escape']
CHK = '''() => { const S = window.__game.S, P = S.player; const bad = [];
  if (!isFinite(P.x) || !isFinite(P.y)) bad.push('player NaN');
  for (const g of S.guards) if (!isFinite(g.x) || !isFinite(g.y)) { bad.push('guard NaN ' + g.state); break; }
  if (P.x < -100 || P.y < -100) bad.push('player off map ' + Math.round(P.x) + ',' + Math.round(P.y));
  return { bad, over: S.over, t: Math.round(S.t), trav: P.trav ? Math.round(P.trav.t * 10) / 10 : 0, pick: !!P.pick, keypad: !!S.keypad, dlg: window.__game.DLG.modal, alevel: S.alevel, kills: S.stats.kills, x: Math.round(P.x), y: Math.round(P.y), fl: P.fl || 0, z: P.z || 0, mode: [P.cover ? 'cover' : '', P.hide ? 'hide' : '', P.wire ? 'wire' : '', P.vent ? 'vent' : '', P.under ? 'under' : '', P.ledge ? 'ledge' : '', P.carrying ? 'carry' : '', P.captive ? 'captive' : ''].join('') }; }'''
async def run(seed, si, secs, b):
    rnd = random.Random(seed)
    pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []
    pg.on('pageerror', lambda e: errs.append('PE ' + str(e)[:300]))
    pg.on('console', lambda m: m.type == 'error' and errs.append('CE ' + m.text[:300]))
    await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1200)
    await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
    t = 0; held = None; last = None; stuck = 0; issues = []; restarts = 0
    while t < secs * 1000:
        if held: await pg.keyboard.up(held); held = None
        if rnd.random() < 0.7:
            held = rnd.choice(KEYS); await pg.keyboard.down(held)
            if rnd.random() < 0.25: await pg.keyboard.down('ShiftLeft')
        if rnd.random() < 0.45:
            k = rnd.choice(ACT)
            if k == 'x' and rnd.random() < 0.5: await pg.keyboard.down('x'); await pg.wait_for_timeout(rnd.randint(100, 600)); await pg.keyboard.up('x')
            else: await pg.keyboard.press(k)
        dt = rnd.randint(120, 700); await pg.wait_for_timeout(dt); t += dt
        await pg.keyboard.up('ShiftLeft')
        st = await pg.evaluate(CHK)
        if st['bad']: issues.append((t, st['bad'], st))
        if st['keypad']:
            for _ in range(4): await pg.keyboard.press('Digit' + str(rnd.randint(0, 9)))
            await pg.keyboard.press('Escape')
        if st['dlg']: await pg.evaluate(SKIP)
        if st['trav'] and st['trav'] > 6: issues.append((t, 'trav stuck', st))
        key = (st['x'], st['y'], st['mode'], st['fl'], st['z'])
        if held and key == last and not st['over'] and st['mode'] not in ('hide', 'cover'): stuck += 1
        else: stuck = 0
        if stuck > 25: issues.append((t, 'no movement 25 steps', st)); stuck = 0
        last = key
        if st['over']:
            restarts += 1; await pg.wait_for_timeout(1200)
            vis = await pg.evaluate('() => !document.getElementById("btnCP").hidden')
            shown = False
            for _ in range(25):  # 끝 화면이 뜰 때까지 (최대 5초)
                shown = await pg.evaluate('() => { const e = document.getElementById("btnRetry"); return !!(e && e.offsetParent); }')
                if shown or not (await pg.evaluate('() => window.__game.S.over')): break
                await pg.wait_for_timeout(200)
            if not shown:
                if await pg.evaluate('() => window.__game.S.over'):
                    issues.append((t, 'end screen not shown', await pg.evaluate('() => { const S = window.__game.S; return { win: S.win, why: S.endWhy || null, ov: [...document.querySelectorAll("#end,#pause,#dlg,#keypad")].map(e => e.id + ":" + !e.hidden) }; }')))
                    await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
            elif vis and rnd.random() < 0.6: await pg.click('#btnCP')
            else: await pg.click('#btnRetry'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
            await pg.wait_for_timeout(300)
        # 일시정지·지도 화면이 떠 있으면 닫기
        if await pg.evaluate('() => !document.getElementById("pause").hidden'): await pg.click('#btnResume')
    await pg.close()
    return {'seed': seed, 'si': si, 'errs': sorted(set(errs))[:8], 'issues': issues[:6], 'restarts': restarts}
async def main():
    secs = int(sys.argv[1]) if len(sys.argv) > 1 else 60; seeds = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    async with async_playwright() as p:
        b = await p.chromium.launch()
        jobs = [run(1000 * s + si, si, secs, b) for s in range(seeds) for si in range(6)]
        for i in range(0, len(jobs), 3):
            for r in await asyncio.gather(*jobs[i:i + 3]): print(json.dumps(r, ensure_ascii=False)[:1500], flush=True)
        await b.close()
asyncio.run(main())
