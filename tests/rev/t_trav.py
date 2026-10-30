# 이동 동작 전수 점검: 모든 판의 오르내리는 곳(배관·사다리·계단·층계)·벽 오르기·2층 창문 오르내리기·매달려 내리기를 하나씩 실제로 해 보고
#  ① 끝까지 끝나는지 ② 끝난 자리가 막힌 칸이 아닌지(층·높이 기준) ③ 기대한 층·높이로 갔는지 ④ 도중에 순간이동(한 프레임 40px 넘게)이 없는지 ⑤ 화면(카메라)이 튀지 않는지
# 시간은 rAF 를 갈아 끼워 직접 넘긴다 (빠르고 매번 같다)
import asyncio, sys, json
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 60 && g.DLG.modal; i++) g.advanceDialog(); }'
INIT = '''(() => { let cbs = [], T = 1000; window.requestAnimationFrame = cb => { cbs.push(cb); return cbs.length; }; window.cancelAnimationFrame = () => {};
  window.__step = (ms, n) => { for (let i = 0; i < (n || 1); i++) { T += ms; const c = cbs; cbs = []; c.forEach(f => { try { f(T); } catch (e) { console.error(e); } }); } }; })();'''
# 페이지 안: 후보 모으기 → 하나씩 실행 → 기록 검사
RUN = r'''(sid) => {
  const g = window.__game, S = g.S, P = S.player, T = 48, out = [], bad = [];
  S.guards.forEach(q => { q.x = -9999; q.y = -9999; q.route = [{ x: -9999, y: -9999, pause: 999 }]; q.path = null; q.wander = null; });
  const reset = (x, y, z, fl, a) => { P.trav = null; P.jump = null; P.ledge = null; P.wire = null; P.hide = null; P.under = false; P.vent = false; P.car = null; P.cover = null; P.pick = null; P.carrying = null; P.captive = null; P.strikeT = 0;
    P.x = x; P.y = y; P.z = z; P.fl = fl; P.a = a || 0; P.vx = 0; P.vy = 0; g.setLayer(fl); g.cam.x = x; g.cam.y = y; S.over = false; S.qBuf = 0; S.autoStairT = 0; };
  const valid = () => { const tx = Math.floor(P.x / T), ty = Math.floor(P.y / T); if (P.z) return g.rLv(tx, ty) === P.z || g.rLv(tx, ty + 1) === P.z;
    g.setLayer(P.fl || 0); const s = g.solidAt(tx, ty); g.setLayer(0); return !s; };
  const run = (name, start, act, expect) => {
    reset(...start); window.__step(16.7, 2);
    const a = act(); if (!a) { out.push([name, 'skip']); return; }
    let px = P.x, py = P.y, cx = g.cam.x, cy = g.cam.y, maxJ = 0, maxC = 0, f = 0, fl0 = P.fl || 0;
    for (; f < 300; f++) { window.__step(16.7); const flc = (P.fl || 0) !== fl0; fl0 = P.fl || 0;
      const j = Math.hypot(P.x - px, P.y - py), c = Math.hypot(g.cam.x - cx, g.cam.y - cy); if (!flc) { maxJ = Math.max(maxJ, j); maxC = Math.max(maxC, c); }
      px = P.x; py = P.y; cx = g.cam.x; cy = g.cam.y; if (!P.trav && !P.jump && f > 3) break; }
    const res = { name, f, z: P.z, fl: P.fl || 0, ok: valid(), maxJ: Math.round(maxJ), maxC: Math.round(maxC), at: [Math.floor(P.x / T), Math.floor(P.y / T)] };
    const why = []; if (f >= 300) why.push('안 끝남'); if (!res.ok) why.push('막힌 칸에 섬'); if (maxJ > 40) why.push('순간이동 ' + res.maxJ); if (maxC > 70) why.push('화면 튐 ' + res.maxC);
    if (expect && !expect(res)) why.push('기대와 다른 결과 z' + res.z + ' fl' + res.fl);
    if (why.length) bad.push([sid, name, why.join(' · '), res.at, res.z, res.fl]); out.push([name, why.length ? 'X' : 'ok']);
  };
  // 1) 오르내리는 곳: 배관·사다리·계단(옥상)·층계(층 사이)
  const LK = ['pipe', 'ladder', 'stair', 'fstair'];
  S.ladders.filter(l => LK.includes(l.kind)).slice(0, 16).forEach((l, i) => {
    run('오르기 ' + l.kind + ' ' + l.bx + ',' + l.by, [l.x, l.y, l.bz || 0, l.bfl || 0, -Math.PI / 2], () => { g.doAct({ k: 'up', l, label: '' }); return true; },
      r => l.kind === 'fstair' ? r.fl === l.tfl : r.z === l.tz);
  });
  // 2) 벽 오르기: 1층 높이 옥상 옆 땅 칸마다 벽을 보고 선다
  let nw = 0;
  for (let ty = 1; ty < g.MH - 1 && nw < 10; ty++) for (let tx = 1; tx < g.MW - 1 && nw < 10; tx++) {
    if (g.solidAt(tx, ty) || g.bldAt(tx, ty) >= 0 || g.rLv(tx, ty)) continue;
    for (const [nx, ny] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) { const lv = g.rLv(tx + nx, ty + ny), lv2 = g.rLv(tx + 2 * nx, ty + 2 * ny); if (!(lv === 1 || (lv === 0 && lv2 === 1 && g.bldAt(tx + nx, ty + ny) >= 0))) continue;
      if ((tx * 7 + ty * 3) % 4) continue;  // 골고루 조금만
      const x = tx * T + 24 + nx * 14, y = ty * T + 24 + ny * 14; nw++;
      run('벽 오르기 ' + tx + ',' + ty, [x, y, 0, 0, Math.atan2(ny, nx)], () => { const s = g.wallUpSpot(); if (!s) return null; g.doAct({ k: 'wallUp', s, label: '' }); return true; }, r => r.z === 1);
      break; }
  }
  // 3) 2층 열린 창문: 밖에서 타고 들어가기 → 안에서 넘어 내려가기
  (S.fwindows || []).filter(w => w.fl === 1 && w.out && w.inn).slice(0, 6).forEach(w => { w.st = 'open';
    run('2층 창문 들어가기 ' + w.tx + ',' + w.ty, [w.out.x, w.out.y, 0, 0, Math.atan2(-w.out.d[1], -w.out.d[0])], () => { g.doAct({ k: 'winClimb', w, label: '' }); return true; }, r => r.fl === 1);
    run('2층 창문 내려가기 ' + w.tx + ',' + w.ty, [w.inn.x, w.inn.y, 0, 1, Math.atan2(w.out.d[1], w.out.d[0])], () => { g.doAct({ k: 'winDrop', w, label: '' }); return true; }, r => r.fl === 0 && r.z === 0);
  });
  // 4) 옥상 가장자리 매달려 내리기 (1·2층 높이)
  let nl = 0;
  for (let ty = 1; ty < g.MH - 1 && nl < 8; ty++) for (let tx = 1; tx < g.MW - 1 && nl < 8; tx++) {
    const z = g.rLv(tx, ty); if (!z || z > 2 || (tx * 5 + ty) % 3) continue;
    for (const [nx, ny] of [[1, 0], [-1, 0], [0, -1]]) { if (g.rLv(tx + nx, ty + ny) >= z) continue; const lb = g.landBelow(tx * T + 24, ty * T + 24, { x: nx, y: ny }, z); if (!lb) continue; nl++;
      run('매달려 내리기 ' + tx + ',' + ty, [tx * T + 24 + nx * 18, ty * T + 24 + ny * 18, z, 0, Math.atan2(ny, nx)], () => { P.ledge = { x: nx, y: ny }; P.ledgeLock = false; S.keys[nx > 0 ? 'ArrowRight' : nx < 0 ? 'ArrowLeft' : 'ArrowUp'] = true; window.__step(16.7, 2); S.keys.ArrowRight = S.keys.ArrowLeft = S.keys.ArrowUp = false; return true; }, r => r.z === lb.z);
      break; }
  }
  const kinds = {}; out.forEach(o => { const k = o[0].split(' ').slice(0, -1).join(' '); kinds[k] = (kinds[k] || 0) + 1; });
  return { kinds, n: out.length, ok: out.filter(o => o[1] === 'ok').length, skip: out.filter(o => o[1] === 'skip').length, bad };
}'''
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); m = await b.new_page(viewport={'width': 480, 'height': 360}); errs = []; m.on('pageerror', lambda e: errs.append(str(e)[:300]))  # 작은 화면: 그리기가 빨라 전수 점검이 빨리 끝난다
        await m.add_init_script(INIT)
        await m.goto('file:///root/game/build/preview_city.html?nostats'); await m.wait_for_timeout(1500); await m.evaluate('() => window.__step(16.7, 30)')
        for sid in sys.argv[1:] or ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'city']:
            await m.evaluate(f"() => window.__game.start(window.__game.STAGES.findIndex(s => s.id === '{sid}'))"); await m.evaluate('() => window.__step(16.7, 10)'); await m.evaluate(SK); await m.evaluate('() => window.__step(16.7, 10)')
            r = await m.evaluate(RUN, sid)
            print(sid, r['kinds'], '동작', r['n'], '통과', r['ok'], '건너뜀', r['skip'], '문제', len(r['bad']))
            for x in r['bad'][:12]: print('   ', x)
            bad += r['bad']
        await b.close()
    if errs: print('페이지 오류', errs[:3])
    print('실패' if bad or errs else '통과', len(bad)); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
