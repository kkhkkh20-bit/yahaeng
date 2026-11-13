// ---------------------------------------------------------------- 자유 모드 간판 사고 의뢰 ('sign')
// 표적이 도는 길 위, 건물 정면에 낡은 간판이 매달려 있다(스토리 판의 매달린 간판 장치 58_sign_flow 를 그대로 쓴다).
// 그 건물 정면의 가스 배관을 타고 옥상에 올라가, 표적이 간판 밑을 지날 때 [간판 고정 풀기]. 깔리면 '사고'(fall) — ×1.7.
// 다른 방법으로 끝내면 ×0.6. 간판 자리는 미니맵에 주황 점, 오르는 배관은 노란 점으로 보인다.
function signStart(h) {
  S.traps = (S.traps || []).filter(t => !t.cityHit || t.cityHit === h);  // 지난 의뢰의 간판은 치운다
  const cands = signCands(h.g.route || []);
  if (!cands.length) return false;
  cands.sort((p, q) => p.d - q.d || p.x - q.x);
  const c = cands[(cands.length / 3) | 0];
  const t = { k: 'drop', at: [c.x, c.y], hit: [c.x - 1, c.ay, c.x + 1, c.ay], text: '낡은 간판', i: 7, cityHit: h };
  S.traps.push(t); h.sign = t; h.signPipe = c.pipe;
  return true;
}
/* 길(경유점 목록, {x,y} 또는 [tx,ty,pause])에서 간판을 걸 수 있는 자리들 */
function signCands(route0) {
  const route = route0.map(p => Array.isArray(p) ? { x: tc(p[0]), y: tc(p[1]) } : p);
  const pipes = (S.ladders || []).filter(l => l.kind === 'pipe' && !l.bz);
  const cands = [];
  for (let i = 0; i < route.length; i++) {
    const a = route[i], b = route[(i + 1) % route.length], ax = Math.floor(a.x / TILE), ay = Math.floor(a.y / TILE), bx = Math.floor(b.x / TILE), by = Math.floor(b.y / TILE);
    if (ay !== by) continue;  // 가로로 걷는 보도 구간만: 그 위(북쪽)가 건물 정면이다
    for (let x = Math.min(ax, bx) + 2; x <= Math.max(ax, bx) - 2; x++) {
      const bi = bldAt(x, ay - 1); if (bi < 0) continue; const B = BLD[bi]; if (!B || B.y1 !== ay - 1) continue; const ey = B.y1 - (B.fh || 0); if (ey < B.y0 || !(rLv(x, ey) > 0)) continue;  /* 매다는 곳은 정면 벽 위, 옥상 끝 줄 */
      const pipe = pipes.find(l => l.bx >= B.x0 && l.bx <= B.x1 && l.by === B.y1 + 1 && Math.abs(l.bx - x) <= 8);
      if (pipe) cands.push({ x, y: ey, ay, pipe, d: Math.abs(pipe.bx - x) });
    }
  }
  return cands;
}
// 미니맵: 간판 자리(주황) · 오르는 배관(노랑)
function drawMiniSign(x, T) {
  const h = S.hit; if (!h || !h.sign || h.sign.used || !(h.ctr === 'sign' || h.ctr === 'stage' && h.opp && h.opp.sign.known)) return;
  const g = signGeometry(h.sign); x.fillStyle = '#ffa040'; x.fillRect(T(g.x) - 3, T(g.y) - 3, 6, 6);
  if (h.signPipe) { x.fillStyle = '#ffd76a'; x.fillRect(T(tc(h.signPipe.bx)) - 2, T(tc(h.signPipe.by)) - 2, 4, 4); }
}
