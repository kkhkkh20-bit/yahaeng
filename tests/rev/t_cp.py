import asyncio
from playwright.async_api import async_playwright
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); }'
H = open('../mis/troutes.py').read().split('H = """')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        await ev('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await ev(SKIP); await ev(H)
        info = await ev('() => { const S = T.S(); return [S.items.map(i => [Math.round(i.x/48), Math.round(i.y/48), i.fl||0]), (S.keyItems||[]).map(i => [i.key, Math.round(i.x/48), Math.round(i.y/48), i.fl]), S.doors.length]; }')
        print('items', info)
        # 경비를 치우고 장부 위치로
        await ev('() => { T.freeze(); const S = T.S(), it = S.items[0]; const P = S.player; P.fl = it.fl || 0; T.G().setLayer && 0; P.x = it.x; P.y = it.y; }')
        await pg.wait_for_timeout(1500)
        print('after pick', await ev('() => [T.S().items[0].got, !!T.G().CP, T.S().cpProg, T.S().cpWant]'))
        pos = await ev('() => [Math.round(T.S().player.x), Math.round(T.S().player.y)]')
        # 문 하나 상태 바꾸고, 다른 곳으로 이동, 시간 흐름, 사망
        d0 = await ev('() => { const d = T.S().doors.find(d => !d.keyLock); const was = d.locked; d.locked = !was; T.S().player.x += 300; T.S().stats.kills = 7; return [was, d.tx, d.ty]; }')
        await ev('() => T.G().endGame(false, "test")'); await pg.wait_for_timeout(1500)
        print('end btnCP visible', await ev('() => !document.getElementById("btnCP").hidden'))
        await pg.click('#btnCP'); await pg.wait_for_timeout(600)
        print('restored', await ev(f'''() => {{ const S = T.S(), d = S.doors.find(d => d.tx === {d0[1]} && d.ty === {d0[2]}); return [S.over, Math.round(S.player.x), Math.round(S.player.y), S.items[0].got, S.stats.kills, d.locked, S.stats.cpUsed, document.getElementById('end').hidden]; }}'''), 'expect pos', pos, 'door', d0[0])
        await pg.wait_for_timeout(1500); await pg.screenshot(path='cp_after.png')
        print('running', await ev('() => [T.S().t > 0, T.S().over]'))
        # 다시 죽고 또 불러오기 (재사용 가능)
        await ev('() => T.G().endGame(false, "test2")'); await pg.wait_for_timeout(1200); await pg.click('#btnCP'); await pg.wait_for_timeout(400)
        print('again', await ev('() => [T.S().over, T.S().stats.cpUsed]'))
        # 처음부터 누르면 체크포인트 삭제
        await ev('() => T.G().endGame(false, "t3")'); await pg.wait_for_timeout(1200); await pg.click('#btnRetry'); await pg.wait_for_timeout(400)
        print('retry clears', await ev('() => !!T.G().CP'))
        print(errs[:3]); await b.close()
asyncio.run(main())
