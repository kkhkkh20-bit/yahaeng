// ---------------------------------------------------------------- 큰 도시 높낮이: 고가도로 · 높은 다리 (GTA식 가짜 3D)
// STAGE.decks: [{ axis: 'x'|'y', road, from, to, ramp, gaps: [{ side, from, to }] }] — 칸 단위.
//  axis 'x' = 가로 도로(road = 그 도로의 첫 줄 y), from~to = 고가가 걸친 x 칸 범위(양 끝 ramp 칸은 경사로), 폭은 도로 4칸.
//  gaps = 난간이 없는 구간(공사 중). 그쪽으로 벗어난 차는 떨어진다.
// 높이 단위 z: 1 = 고가 한 층. 차는 v.z를 가진다. 경사로 낮은 끝으로 들어온 차만 올라가고(옆이나 아래에서는 벽),
// 고가 위 차는 땅 차·사람과 따로 부딪힌다. 받쳐 줄 바닥이 없는 곳으로 나가면 떨어지고, 땅에 닿을 때 높이만큼 부서진다.
// 그리기: 높이 z인 점은 카메라 중심에서 (1 + DECK_K·z)배 바깥으로 밀어 그린다. 그래서 카메라가 비켜 갈수록 옆면이 드러나고 위에 있는 것이 조금 크게 보인다.
const DECK_K = 0.16, DECK_THICK = 0.22, DECK_G = 7;  // 원근 세기 · 바닥판 두께(층) · 떨어지는 가속(층/초²)
const deckS = z => 1 + DECK_K * z;
function decksInit() {
  S.decks = (STAGE.decks || []).map(d => {
    const T = TILE, h = d.axis === 'x';
    const a0 = d.from * T, a1 = (d.to + 1) * T, r = d.ramp * T, c0 = d.road * T, c1 = (d.road + 4) * T;
    const rect = (u0, u1) => h ? { x0: u0, x1: u1, y0: c0, y1: c1 } : { x0: c0, x1: c1, y0: u0, y1: u1 };
    return { axis: d.axis, top: rect(a0 + r, a1 - r), rampA: rect(a0, a0 + r), rampB: rect(a1 - r, a1), a0, a1, r, c0, c1, road: d.road,
      gaps: (d.gaps || []).map(g => ({ side: g.side, u0: g.from * T, u1: (g.to + 1) * T })) };
  });
}
const inR = (R, x, y, m = 0) => x >= R.x0 - m && x <= R.x1 + m && y >= R.y0 - m && y <= R.y1 + m;
// 이 점에서 받쳐 주는 높이 (고가 위 1 · 경사로 0~1 · 땅 0)
function deckSupport(x, y) {
  let z = 0;
  for (const d of S.decks || []) {
    if (inR(d.top, x, y)) return 1;
    const u = d.axis === 'x' ? x : y;
    if (inR(d.rampA, x, y)) z = Math.max(z, (u - d.a0) / d.r);
    if (inR(d.rampB, x, y)) z = Math.max(z, (d.a1 - u) / d.r);
  }
  return clamp(z, 0, 1);
}
// 이 점이 고가·경사로 옆 가장자리 밖이면, 그 가장자리에 난간이 있나 (끝 쪽은 경사로로 이어져 난간 없음)
function deckRailAt(d, x, y) {
  const u = d.axis === 'x' ? x : y, c = d.axis === 'x' ? y : x;
  if (u < d.a0 || u > d.a1) return false;
  const side = c < d.c0 ? (d.axis === 'x' ? 'n' : 'w') : c > d.c1 ? (d.axis === 'x' ? 's' : 'e') : null;
  if (!side) return false;
  return !d.gaps.some(g => g.side === side && u >= g.u0 && u <= g.u1);
}
// 차의 높이에서 막히나: 고가 위에서 난간에 닿거나, 땅 높이 차가 경사로 옆면·고가 끝에 닿을 때
function deckBlocked(v) {
  if (!S.decks?.length) return false;
  const z = v.z || 0, R = v.r || CAR_R;
  for (const [px, py] of carPts(v)) {
    const sup = deckSupport(px, py);
    if (sup > z + 0.3) return true;  // 경사로를 옆이나 아래에서 들이받음
    if (z > 0.5) for (const d of S.decks) if (inR(d.top, px, py, R) || inR(d.rampA, px, py, R) || inR(d.rampB, px, py, R)) {
      // 난간: 차 몸 원이 가장자리를 넘으면 막는다
      for (const [ox, oy] of [[px - R, py], [px + R, py], [px, py - R], [px, py + R]]) if (deckSupport(ox, oy) < z - 0.3 && deckRailAt(d, ox, oy)) return true;
    }
  }
  return false;
}
// 한 걸음: 받침을 따라 높이를 맞추고, 받침이 없으면 떨어진다
function deckStep(v, dt) {
  if (!S.decks?.length) return;
  const sup = deckSupport(v.x, v.y), z = v.z || 0;
  if (z > sup + 0.04) {  // 떠 있다: 떨어진다
    v.vz = (v.vz || 0) - DECK_G * dt; v.z = z + v.vz * dt;
    if (v.z <= sup) { const hit = -v.vz; v.z = sup; v.vz = 0; deckLand(v, hit); }
  } else { v.z = sup; v.vz = 0; }
}
function deckLand(v, hit) {
  if (hit < 2) return;
  const near = clamp(1 - dist(v.x, v.y, S.player.x, S.player.y) / 800, 0, 1);
  play('thud', 0.5 + 0.5 * near); play('metal', 0.6 * near, .7); S.shakeT = Math.max(S.shakeT || 0, 0.15 + 0.35 * near);
  if (typeof fireEmit === 'function') { fireEmit(v, 'spark', 20, v); fireEmit(v, 'debris', 6, v); }
  // 건물·벽 위로 떨어졌으면 가장 가까운 빈 자리로
  if (carOverlap(v) === true) { const x0 = v.x, y0 = v.y; let ok = false;
    for (let r = 24; r <= 240 && !ok; r += 24) for (let k = 0; k < 12 && !ok; k++) { const a = k / 12 * TAU; v.x = x0 + Math.cos(a) * r; v.y = y0 + Math.sin(a) * r; if (!carOverlap(v)) ok = true; }
    if (!ok) { v.x = x0; v.y = y0; } }
  const dmg = Math.round(hit * 0.9); v.hp -= dmg; v.smoke = 2; v.v *= 0.4;
  if (v.hp <= 0) (STAGE.cityLife ? carExplode : carWreck)(v);
  if (S.player.car === v && !v.dead) { S.flash = Math.max(S.flash || 0, 0.15); }
}
const onDeckLevel = v => (v.z || 0) > 0.3;
// 고가 아래 교차로에서 고가 도로로 꺾지 않는다 (가로 고가 = 그 도로 줄, 세로 고가 = 그 도로 열)
function deckBlocksTurn(roadIsRow, road, at) {
  for (const d of S.decks || []) {
    if ((d.axis === 'x') !== roadIsRow || d.road !== road) continue;
    if (at * TILE + 2 * TILE > d.a0 + d.r && at * TILE + 2 * TILE < d.a1 - d.r) return true;
  }
  return false;
}
// 생성 자리: 고가 아래(땅)면 고가 위에 놓고, 경사로 위면 쓰지 않는다
function deckSpawnZ(x, y) {
  for (const d of S.decks || []) { if (inR(d.top, x, y, 4)) return 1; if (inR(d.rampA, x, y, 8) || inR(d.rampB, x, y, 8)) return -1; }
  return 0;
}

// ---------------- 그리기
// 난간: 구매 팩 운하 다리의 흰 난간 보(16px 마디)를 이어 붙이고, 5칸마다 등기둥. 가로 고가는 90도 돌린다
const deckArt = A.cityDeck, deckAtlas = deckArt ? Object.assign(new Image(), { src: deckArt.src }) : null;
function deckBeam(u0, u1, c, h) {
  const f = deckArt?.frames?.beam?.rect, L = deckArt?.frames?.lanternW?.rect;
  if (!f || !deckAtlas.complete || !deckAtlas.naturalWidth) { ctx.fillStyle = '#b9bec4'; if (h) ctx.fillRect(u0, c - 5, u1 - u0, 10); else ctx.fillRect(c - 5, u0, 10, u1 - u0); return; }
  const k = 1.5, bw = f[2] * k, seg = f[3] * k;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(h ? u0 : c, h ? c : u0); if (h) ctx.rotate(-Math.PI / 2);
  const len = u1 - u0, dir = h ? -1 : 1;  // 돌린 좌표에서 길이 방향은 h 면 -y
  for (let t = 0; t < len; t += seg) { const n = Math.min(seg, len - t), sh = n / k; ctx.drawImage(deckAtlas, f[0], f[1], f[2], sh, -bw / 2, h ? -t - n : t, bw, n); }
  if (L) for (let t = TILE * 2; t < len - TILE; t += TILE * 5) ctx.drawImage(deckAtlas, L[0], L[1], L[2], L[3], -L[2] * k / 2, (h ? -t : t) - L[3] * k / 2, L[2] * k, L[3] * k);
  ctx.restore();
}
// 땅에 지는 그림자: 차보다 먼저(drawVehicles 앞) 그린다. 빛은 북서쪽에서
function drawDeckShadows() {
  for (const d of S.decks || []) { const R = d.top, w = R.x1 - R.x0, h = R.y1 - R.y0; if (!inView(R.x0 + w / 2, R.y0 + h / 2, Math.max(w, h) / 2 + 200)) continue;
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(R.x0 + 26, R.y0 + 38, w, h);
    for (const [Rm, a] of [[d.rampA, 1], [d.rampB, -1]]) { const g = d.axis === 'x' ? ctx.createLinearGradient(Rm.x0, 0, Rm.x1, 0) : ctx.createLinearGradient(0, Rm.y0, 0, Rm.y1);
      g.addColorStop(a > 0 ? 0 : 1, 'rgba(0,0,0,0)'); g.addColorStop(a > 0 ? 1 : 0, 'rgba(0,0,0,.32)'); ctx.fillStyle = g; ctx.fillRect(Rm.x0 + 20, Rm.y0 + 30, Rm.x1 - Rm.x0, Rm.y1 - Rm.y0); } }
}
function deckPt(x, y, z) { const s = deckS(z); return [cam.x + (x - cam.x) * s, cam.y + (y - cam.y) * s]; }
function quad(p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); ctx.fill(); }
// 바닥판(직사각형, 네 꼭짓점 높이 따로): 옆면(카메라 쪽만) → 윗면
function deckSlab(R, zs, top, side) {
  // zs: 네 꼭짓점 [x0y0, x1y0, x1y1, x0y1] 의 윗면 높이. 아랫면은 그보다 DECK_THICK 아래(땅 밑으로는 안 감)
  const P = [[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]];
  const T = P.map(([x, y], i) => deckPt(x, y, zs[i])), B = P.map(([x, y], i) => deckPt(x, y, Math.max(0, zs[i] - DECK_THICK)));
  const faces = [[0, 1, R.y0 < cam.y], [1, 2, R.x1 > cam.x], [2, 3, R.y1 > cam.y], [3, 0, R.x0 < cam.x]];
  ctx.fillStyle = side;
  for (const [a, b, vis] of faces) if (vis) quad([B[a], B[b], T[b], T[a]]);
  ctx.fillStyle = top; quad(T);
  return T;
}
function drawDecks() {
  if (!S.decks?.length) return;
  const P = S.player, pz = P.car ? P.car.z || 0 : 0, under = S.decks.some(d => (inR(d.top, P.x, P.y) || inR(d.rampA, P.x, P.y) || inR(d.rampB, P.x, P.y)) && pz < 0.5);
  ctx.save(); if (under) ctx.globalAlpha = 0.45;  // 고가 밑에 있으면 비쳐 보이게
  for (const d of S.decks) {
    const all = { x0: Math.min(d.rampA.x0, d.rampB.x0), y0: Math.min(d.rampA.y0, d.rampB.y0), x1: Math.max(d.rampA.x1, d.rampB.x1), y1: Math.max(d.rampA.y1, d.rampB.y1) };
    if (!inView((all.x0 + all.x1) / 2, (all.y0 + all.y1) / 2, Math.max(all.x1 - all.x0, all.y1 - all.y0) / 2 + 300)) continue;
    const h = d.axis === 'x';
    // 기둥: 고가 밑, 6칸마다 두 개
    for (let u = d.a0 + d.r + 2 * TILE; u < d.a1 - d.r - TILE; u += 6 * TILE) for (const c of [d.c0 + TILE * 0.9, d.c1 - TILE * 0.9]) {
      const x = h ? u : c, y = h ? c : u, [tx, ty] = deckPt(x, y, 1 - DECK_THICK);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 6, 16, 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4c5159'; ctx.lineWidth = 26; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = '#6b717a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(tx - 6 * deckS(1), ty); ctx.stroke();
    }
    // 경사로 둘과 고가 윗면
    const ramp = (R, low) => { const zs = h ? (low === 'a' ? [0, 1, 1, 0] : [1, 0, 0, 1]) : (low === 'a' ? [0, 0, 1, 1] : [1, 1, 0, 0]);
      const T = deckSlab(R, zs, '#353a42', '#565c65');
      // 오를수록 밝게 (낮은 끝이 어둡다) · 양옆 방호벽
      const lo = low === 'a' ? [T[0], T[3]] : h ? [T[1], T[2]] : [T[2], T[3]], hi = low === 'a' ? (h ? [T[1], T[2]] : [T[2], T[3]]) : (h ? [T[0], T[3]] : [T[0], T[1]]);
      const g = ctx.createLinearGradient((lo[0][0] + lo[1][0]) / 2, (lo[0][1] + lo[1][1]) / 2, (hi[0][0] + hi[1][0]) / 2, (hi[0][1] + hi[1][1]) / 2);
      g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(255,255,255,.05)'); ctx.fillStyle = g; quad(T);
      ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 7; const side = h ? [[T[0], T[1]], [T[3], T[2]]] : [[T[0], T[3]], [T[1], T[2]]];
      for (const [a, b] of side) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      return T; };
    ramp(d.rampA, 'a'); ramp(d.rampB, 'b');
    const T = deckSlab(d.top, [1, 1, 1, 1], '#2c3037', '#5a6069');
    // 차선: 가운데 노란 겹선 · 흰 점선 · 가장자리 흰 선 (윗면 높이에서)
    ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(deckS(1), deckS(1)); ctx.translate(-cam.x, -cam.y);
    const L = h ? [d.top.x0, d.top.x1] : [d.top.y0, d.top.y1], mid = (d.c0 + d.c1) / 2;
    const line = (c, w, col, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); if (h) { ctx.moveTo(L[0], c); ctx.lineTo(L[1], c); } else { ctx.moveTo(c, L[0]); ctx.lineTo(c, L[1]); } ctx.stroke(); };
    line(mid - 4, 2, '#d8b440'); line(mid + 4, 2, '#d8b440'); line(mid - TILE, 2, 'rgba(230,232,236,.7)', [26, 22]); line(mid + TILE, 2, 'rgba(230,232,236,.7)', [26, 22]);
    line(d.c0 + 8, 3, 'rgba(230,232,236,.8)'); line(d.c1 - 8, 3, 'rgba(230,232,236,.8)'); ctx.setLineDash([]);
    // 난간 (공사 구간은 비우고 주황 방호벽 조각과 줄무늬)
    for (const [side, c] of h ? [['n', d.c0], ['s', d.c1]] : [['w', d.c0], ['e', d.c1]]) {
      let u = d.a0 + d.r; const end = d.a1 - d.r;
      while (u < end) { const g = d.gaps.find(g => g.side === side && u >= g.u0 && u < g.u1), nu = g ? Math.min(end, g.u1) : Math.min(end, ...d.gaps.filter(g => g.side === side && g.u0 > u).map(g => g.u0), end);
        if (!g) deckBeam(u, nu, c, h);
        else { ctx.fillStyle = '#e07a1f'; for (let k = u; k < nu; k += 40) { if (h) ctx.fillRect(k, c - 3, 16, 6); else ctx.fillRect(c - 3, k, 6, 16); } }
        u = nu; }
    }
    // 고가 가로등 불빛
    ctx.globalCompositeOperation = 'lighter';
    for (let u = d.a0 + d.r + TILE; u < d.a1 - d.r; u += 5 * TILE) { const x = h ? u : mid, y = h ? mid : u, g = ctx.createRadialGradient(x, y, 0, x, y, 110); g.addColorStop(0, 'rgba(255,214,150,.16)'); g.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = g; ctx.fillRect(x - 110, y - 110, 220, 220); }
    ctx.globalCompositeOperation = 'source-over'; ctx.restore();
    // 밤 어둠 (고가는 어둠 단계 뒤에 그려지므로 따로 어둡게)
    ctx.fillStyle = `rgba(4,8,22,${(STAGE.nightShade ?? 0.6) * 0.5})`; quad(T);
  }
  ctx.restore();
  // 고가·경사로 위 차 (높이만큼 크게)
  const ups = (S.vehicles || []).filter(v => (v.z || 0) > 0.01 && inView(v.x, v.y, 300)).sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const v of ups) { const s = deckS(v.z); ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(s, s); ctx.translate(-cam.x, -cam.y);
    // 떨어지는 중이면 땅에 그림자
    drawOneVehicle(v); ctx.restore(); }
}
