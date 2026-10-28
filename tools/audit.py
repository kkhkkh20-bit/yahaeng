# 배치 점검 (메탈기어·코만도스식 암살 판): 의뢰마다 조직원 한 명씩
#  홀로: 그 사람이 서는 자리 중 다른 조직원 눈(9칸 안·벽에 안 막힘)에 안 띄는 자리가 있나
#  숨김: 서는 자리에서 걸어서 6칸 안에 시체 숨길 곳(수거함·화단·맨홀·침대 등)이 있나
#  어둠: 등 뒤 1~2칸에 어두운 칸(밝기 0.35 미만)이 있나 — 다가갈 길
#  주민: 서는 자리를 보는 주민 수 (공개 구역에선 목격자가 된다)
#  간격: 가장 가까운 다른 조직원까지 칸 수 (연속 처치 리듬: 5~14칸이 좋다)
# 쓰기: python3 tools/audit.py [m1 m2 ...]  (build/preview_city.html 기준)
import asyncio, sys, json
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 40 && g.DLG.modal; i++) g.advanceDialog(); }'
JS = r'''() => { const G = window.__game, S = G.S, T = 48, tc = v => v * T + T / 2;
  const crew = S.guards.filter(g => !g.civ && !g.dog && !g.target && !g.dropped);
  const pts = g => { const r = (g.route && g.route.length ? g.route : [{ x: g.x, y: g.y }]).filter(p => p.x > -1000); return r.length ? r : [{ x: g.x, y: g.y }]; };
  const fl = o => o.fl || 0;
  // 보는 방향: 자리 지킴이는 지키는 방향, 순찰은 경로 앞뒤 방향 (서는 곳에서 두리번거리니 양쪽 다), 좌우 70도 안
  const faces = (o, i) => { const P = pts(o); if (o.post != null && P.length === 1) return [o.post * Math.PI / 180]; if (P.length < 2) return [o.a || 0]; const a = P[(i + 1) % P.length], b = P[(i - 1 + P.length) % P.length], q = P[i]; return [Math.atan2(a.y - q.y, a.x - q.x), Math.atan2(b.y - q.y, b.x - q.x)]; };
  const angd = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  const sees = (a, b, f, A) => Math.hypot(a.x - b.x, a.y - b.y) < 9 * T && (!A || A.some(t => angd(t, Math.atan2(b.y - a.y, b.x - a.x)) < 1.22)) && G.los(a.x, a.y, b.x, b.y);
  const watch = (o, p) => pts(o).some((q, i) => sees(q, p, 0, faces(o, i)));
  const hides = (S.hides || []).filter(h => (h.cap || 1) > 0);
  G.setLayer(0); const MWm = G.STAGES[0] ? window.__game.S && 200 : 200;
  for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) { let c; try { c = G.tileG(x, y); } catch (e) { c = undefined; } if (c === 'B') hides.push({ type: 'bush', x: x * T + T / 2, y: y * T + T / 2, fl: 0 }); }
  const out = [];
  for (const g of crew) {
    const P = pts(g), f = fl(g); G.setLayer(f);
    let alone = 0, hideMin = 99, dark = 0, civ = 0;
    for (const p of P) {
      const w = crew.filter(o => o !== g && fl(o) === f && watch(o, p)).length; if (!w) alone++;
      const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
      for (const h of hides) { if (fl(h) !== f || (h.z || 0)) continue; const hx = Math.floor(h.x / T), hy = Math.floor(h.y / T); if (Math.abs(hx - tx) + Math.abs(hy - ty) > 9) continue; let n = 99; for (const [ax, ay] of [[hx, hy], [hx + 1, hy], [hx - 1, hy], [hx, hy + 1], [hx, hy - 1]]) { if (G.solidAt(ax, ay)) continue; if (ax === tx && ay === ty) { n = 0; break; } const path = G.astar(tx, ty, ax, ay); if (path.length) n = Math.min(n, path.length); } if (n < hideMin) hideMin = n; }  // 수거함·화단은 막힌 칸 — 옆 칸까지 걸음
      const a = g.post != null ? g.post * Math.PI / 180 : (g.a || 0);
      for (const k of [1, 2]) { const bx = p.x - Math.cos(a) * k * T, by = p.y - Math.sin(a) * k * T; if (!G.solidAt(Math.floor(bx / T), Math.floor(by / T)) && G.lightAtG(bx, by, f) < 0.35) { dark++; break; } }
      civ = Math.max(civ, S.guards.filter(o => o.civ && !o.child && fl(o) === f && Math.hypot(o.x - p.x, o.y - p.y) < 9 * T && G.los(o.x, o.y, p.x, p.y)).length);
    }
    let near = 99; for (const o of crew) { if (o === g || fl(o) !== f) continue; for (const p of P) for (const q of pts(o)) near = Math.min(near, Math.round(Math.hypot(p.x - q.x, p.y - q.y) / T)); }
    const zi = G.zoneInfo(P[0].x, P[0].y, g.z || 0);
    out.push({ id: g.id, kind: g.kind + (g.elite ? '*' : ''), fl: f, at: [Math.floor(P[0].x / T), Math.floor(P[0].y / T)], pts: P.length, alone: alone + '/' + P.length, hide: hideMin, dark: dark + '/' + P.length, civ, near, zone: ['공개', '금지', '적진'][zi.k] });
  }
  G.setLayer(0); return out; }'''
async def main():
    want = sys.argv[1:] or ['m1', 'm2', 'm3']
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        for sid in want:
            si = await pg.evaluate(f"() => window.__game.STAGES.findIndex(s => s.id === '{sid}')")
            await pg.evaluate(f'() => window.__game.start({si})'); await pg.wait_for_timeout(400); await pg.evaluate(SK)
            rows = await pg.evaluate(JS)
            bad = {'홀로 못 됨': 0, '숨길 곳 멂': 0, '어둠 없음': 0, '주민 많음': 0, '너무 붙음': 0, '외톨이': 0}
            print(f'\n== {sid}  조직원 {len(rows)}명  (홀로 = 다른 조직원 시야 밖인 서는 곳 / 서는 곳, 숨김 = 시체 숨길 곳까지 걸음 수)')
            print(' 번호 종류 층  자리     서는곳 홀로   숨김 어둠  주민 간격 구역  문제')
            for r in rows:
                pr = []
                if r['alone'].startswith('0/'): pr.append('홀로 못 됨')
                if r['hide'] > 6: pr.append('숨길 곳 멂')
                if r['dark'].startswith('0/'): pr.append('어둠 없음')
                if r['civ'] >= 2: pr.append('주민 많음')
                if r['near'] < 4: pr.append('너무 붙음')
                if r['near'] > 16: pr.append('외톨이')
                for k in pr: bad[k] += 1
                print(f" {r['id']:>3} {r['kind']:<4} {r['fl']:>2}  {str(r['at']):<9} {r['pts']:>3}   {r['alone']:<5} {r['hide']:>3} {r['dark']:<5} {r['civ']:>3} {r['near']:>4} {r['zone']:<4} {', '.join(pr)}")
            print(' 요약', {k: v for k, v in bad.items() if v})
        await b.close()
asyncio.run(main())
