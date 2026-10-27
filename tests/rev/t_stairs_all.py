# 모든 의뢰·연습의 모든 계단을 실제 행동으로 오르내려 본다
# 실내 계단(층 사이): 아래층 계단 칸에서 [오르기] → 위층 도착 칸이 막히지 않음 → 도착 자리에서 걸어갈 수 있는 '내려가는 자리'에 서면 [내리기] → 아래층 막히지 않은 칸
# 옥상 계단: 계단 칸에서 [오르기] → 옥상 → 계단실 앞에서 [내리기] → 땅
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
FREEZE = '''() => { const S = window.__game.S; S.guards.forEach(g => { g.x = -9999; g.y = -9999; g.route = [{ x: -9999, y: -9999, pause: 999 }]; g.wander = null; g.sched = null; g.path = null; }); }'''
PLACE = '''([fl, z, x, y]) => { const G = window.__game, P = G.S.player; P.fl = fl; P.z = z; P.x = x; P.y = y; P.trav = null; P.cover = null; P.snap = null; P.carrying = null; P.captive = null; P.item = null; P.vx = P.vy = 0; G.setLayer(fl); }'''
STATE = '''() => { const G = window.__game, P = G.S.player; G.setLayer(P.fl || 0); return { fl: P.fl || 0, z: P.z || 0, x: Math.round(P.x), y: Math.round(P.y), solid: !P.z && G.solidAt(Math.floor(P.x / 48), Math.floor(P.y / 48)), trav: !!P.trav }; }'''
# 위층에서 '내려가는 자리'(구멍 바닥 쪽 끝 c2) 가까이 설 수 있고, 도착 칸에서 걸어서 닿는 칸
SPOT = '''([i]) => { const G = window.__game, l = G.LADDERS[i], ho = G.stairHole(l), tc = v => v * 48 + 24; G.setLayer(l.tfl);
  const p = G.downPt(l), arr = ho ? [ho.top, ho.e].find(c => !G.solidAt(c.tx, c.ty)) : { tx: l.tx, ty: l.ty };  // 꺾인 계단실이 없으면 계단 칸 그 자리로 오르내린다 if (!arr) return { err: '위층 도착 칸이 모두 막힘' };
  let best = null, bd = 1e9; const px = Math.floor(p.x / 48), py = Math.floor(p.y / 48);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const cx = px + dx, cy = py + dy; if (G.solidAt(cx, cy)) continue; const d = Math.hypot(tc(cx) - p.x, tc(cy) - p.y); if (d >= 60 || d >= bd) continue;
    if (!(cx === arr.tx && cy === arr.ty) && !G.astar(arr.tx, arr.ty, cx, cy).length) continue; bd = d; best = [tc(cx), tc(cy)]; }
  return best ? { at: best, arr: [arr.tx, arr.ty] } : { err: '내려가는 자리(' + px + ',' + py + ') 근처에 걸어서 설 칸이 없음', arr: [arr.tx, arr.ty] }; }'''
async def main():
    bad = []; n = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        stages = await pg.evaluate('() => window.__game.STAGES.map(s => s.id)')
        async def walk(to):  # 길찾기로 칸 경로를 얻고 방향키로 따라간다
            path = await pg.evaluate(f'() => {{ const G = window.__game, P = G.S.player; G.setLayer(P.fl || 0); const p = G.astar(Math.floor(P.x / 48), Math.floor(P.y / 48), Math.floor({to[0]} / 48), Math.floor({to[1]} / 48)); return p.map(c => [c.x, c.y]); }}')
            pts = path + [list(to)]
            for tx, ty in pts:
                for k in range(60):
                    r = await pg.evaluate(f'''() => {{ const G = window.__game, P = G.S.player, K = G.S.keys, dx = {tx} - P.x, dy = {ty} - P.y, d = Math.hypot(dx, dy);
                        K.ArrowLeft = dx < -6; K.ArrowRight = dx > 6; K.ArrowUp = dy < -6; K.ArrowDown = dy > 6; if (d < 10) {{ K.ArrowLeft = K.ArrowRight = K.ArrowUp = K.ArrowDown = false; }} return d; }}''')
                    if r < 10: break
                    await pg.wait_for_timeout(40)
                else:
                    await pg.evaluate('() => { const K = window.__game.S.keys; K.ArrowLeft = K.ArrowRight = K.ArrowUp = K.ArrowDown = false; }'); return False
            await pg.evaluate('() => { const K = window.__game.S.keys; K.ArrowLeft = K.ArrowRight = K.ArrowUp = K.ArrowDown = false; }'); return True
        for si, sid in enumerate(stages):
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(250); await pg.evaluate(SK); await pg.evaluate(FREEZE)
            ls = await pg.evaluate('() => window.__game.LADDERS.map((l, i) => ({ i, kind: l.kind, tx: l.tx, ty: l.ty, bfl: l.bfl || 0, tfl: l.tfl, tz: l.tz || 0, x: l.x, y: l.y, rx: l.rx != null ? l.rx : l.ux, ry: l.ry != null ? l.ry : l.uy })).filter(l => l.kind === "fstair" || l.kind === "stair")')
            for l in ls:
                n += 1; tag = f"{sid} 계단({l['tx']},{l['ty']}) {l['bfl'] + 1}층→" + (f"{l['tfl'] + 1}층" if l['kind'] == 'fstair' else '옥상')
                await pg.evaluate(SK); await pg.evaluate(FREEZE)
                await pg.evaluate(PLACE, [l['bfl'], 0, l['x'], l['y']]); await pg.wait_for_timeout(60)
                a = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }')
                if a[0] != 'up': bad.append(f'{tag}: 계단 칸에서 [오르기]가 아니라 {a}'); continue
                await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(900)
                s = await pg.evaluate(STATE)
                if l['kind'] == 'fstair':
                    if s['fl'] != l['tfl'] or s['solid'] or s['trav']: bad.append(f'{tag}: 올라간 뒤 상태 이상 {s}'); continue
                    sp = await pg.evaluate(SPOT, [l['i']])
                    if 'err' in sp: bad.append(f"{tag}: {sp['err']}"); continue
                    # 도착한 자리에서 실제로 걸어가 본다 (키 입력으로, 몸 크기 충돌 포함)
                    if not await walk(sp['at']): bad.append(f"{tag}: 도착 자리에서 내려가는 자리까지 걸어서 못 감 {await pg.evaluate(STATE)}"); continue
                    await pg.wait_for_timeout(60)
                    a = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }')
                    if a[0] != 'fdown': bad.append(f'{tag}: 내려가는 자리에서 [내리기]가 아니라 {a}'); continue
                    await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1100)
                    s = await pg.evaluate(STATE)
                    if s['fl'] != l['bfl'] or s['solid'] or s['trav']: bad.append(f'{tag}: 내려온 뒤 상태 이상 {s}'); continue
                    # 내려온 자리에서 다시 계단 칸으로 걸어갈 수 있나
                    ok = await pg.evaluate(f"() => {{ const G = window.__game, P = G.S.player; G.setLayer({l['bfl']}); const sx = Math.floor(P.x / 48), sy = Math.floor(P.y / 48); return (sx === {l['tx']} && sy === {l['ty']}) || G.astar(sx, sy, {l['tx']}, {l['ty']}).length > 0; }}")
                    if not ok: bad.append(f'{tag}: 내려온 자리에서 계단 칸으로 다시 못 감 {s}')
                else:
                    if s['z'] != l['tz'] or s['trav']: bad.append(f'{tag}: 옥상에 못 올라감 {s}'); continue
                    await pg.evaluate(PLACE, [0, l['tz'], l['rx'], l['ry']]); await pg.wait_for_timeout(60)
                    a = await pg.evaluate('() => { const a = window.__game.primaryAction(); return [a.k, a.label]; }')
                    if a[0] != 'down': bad.append(f'{tag}: 옥상 계단실 앞에서 [내리기]가 아니라 {a}'); continue
                    await pg.evaluate('() => window.__game.actPrimary()'); await pg.wait_for_timeout(1100)
                    s = await pg.evaluate(STATE)
                    if s['z'] or s['trav'] or s['solid']: bad.append(f'{tag}: 옥상에서 내려온 뒤 상태 이상 {s}')
        print('계단', n, '개 검사'); print('errs', errs[:3]); await b.close()
    for x in bad: print(' -', x)
    print('문제', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
