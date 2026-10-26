import asyncio, json
from playwright.async_api import async_playwright
URL='file:///root/game/build/preview_city.html'
SKIP = '() => { const g = window.__game; for (let i = 0; i < 20 && g.DLG.modal; i++) g.advanceDialog(); g.S.toasts.length = 0; }'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        pg = await b.new_page(viewport={'width': 1280, 'height': 800}); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SKIP)
        ev = lambda js: pg.evaluate(js)
        st = '() => { const G = window.__game, P = G.S.player; return {fl: P.fl||0, z: P.z, wire: !!P.wire, x: +(P.x/48).toFixed(1), y: +(P.y/48).toFixed(1), pa: G.primaryAction().label, sa: G.secondaryAction().label}; }'
        await ev('() => { const S = window.__game.S, P = S.player; P.x = 16*48+24; P.y = 12*48+24; P.z = 0; window.__game.setLayer(0); }')
        print('1 ground stair', await ev(st))
        await ev('() => window.__game.actPrimary()'); print('1 after up', await ev(st))
        await ev('() => window.__game.actPrimary()'); print('1 after up2', await ev(st))
        await ev('() => { const P = window.__game.S.player; P.x = 15*48+24; P.y = 13*48+24; }'); await pg.wait_for_timeout(200)
        print('2 item 3F', await ev('() => window.__game.S.items.map(i => [i.fl, i.got])'))
        # 3층 경비가 보는지 / 1층 경비는 안 보는지
        r = await ev('''() => { const S = window.__game.S, P = S.player; P.x = 14*48+24; P.y = 15*48+24; const g3 = S.guards.find(g => g.fl === 2); g3.x = 16*48+24; g3.y = 15*48+24; g3.a = Math.PI; g3.want = Math.PI; g3.state='PATROL'; g3.meter = 0; g3.wait = 99;
            const g0 = S.guards[5]; g0.x = 16*48+24; g0.y = 15*48+24; g0.a = Math.PI; g0.want = Math.PI; g0.meter = 0; g0.wait = 99; return [g3.id, g0.id, g0.fl||0]; }''')
        await pg.wait_for_timeout(500)
        print('3 meters (3F guard, 1F guard)', await ev(f'() => {{ const S = window.__game.S; return [S.guards[{r[0]}].meter.toFixed(2), S.guards[{r[1]}].meter.toFixed(2), S.guards[{r[0]}].state]; }}'))
        await ev(f'() => {{ const S = window.__game.S; S.guards[{r[0]}].x = 11*48; S.guards[{r[0]}].y = 13*48; S.guards[{r[0]}].state = "PATROL"; S.guards[{r[0]}].meter = 0; S.alevel = 0; }}')
        # 3층 → 옥상 → 다시 3층
        await ev('() => { const P = window.__game.S.player; P.x = 16*48+24; P.y = 12*48+24; P.hurtT = 0; }')
        print('4 3F stair', await ev(st)); await ev('() => window.__game.actPrimary()'); print('4 roof', await ev(st))
        await ev('() => window.__game.actPrimary()'); print('4 back down', await ev(st))
        await ev('() => window.__game.actCarry()'); print('4 W down', await ev(st))
        await ev('() => window.__game.actPrimary()'); print('4 up again', await ev(st))
        # 3층 창문 → 전깃줄
        await ev('() => { const P = window.__game.S.player; P.x = 15*48+24; P.y = 16*48+24; P.a = Math.PI/2; }')
        print('5 at window', await ev(st)); await ev('() => window.__game.actPrimary()'); print('5 on wire', await ev(st))
        # 줄을 따라 전봇대 쪽으로 갔다가 다시 창문으로 밀면 바로 들어감
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(1500); await pg.keyboard.up('ArrowRight'); print('6 moved', await ev(st))
        await pg.keyboard.down('ArrowLeft'); await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(2500); await pg.keyboard.up('ArrowLeft'); await pg.keyboard.up('ArrowUp'); print('6 back into window', await ev(st))
        # 옥상 끝 자동
        await ev('''() => { const S = window.__game.S, P = S.player; const w = S.wires.find(w => w.b.roof && w.b.tx === 7 && w.b.ty === 3); P.fl = 0; window.__game.setLayer(0); P.wire = {w, s: 0.6}; P.z = 3; }''')
        await pg.keyboard.down('ArrowUp'); await pg.keyboard.down('ArrowLeft'); await pg.wait_for_timeout(2500); await pg.keyboard.up('ArrowUp'); await pg.keyboard.up('ArrowLeft')
        print('7 auto roof', await ev(st))
        print('errs', errs[:5]); await b.close()
asyncio.run(main())
