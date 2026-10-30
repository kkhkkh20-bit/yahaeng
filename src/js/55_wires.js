// ---------------------------------------------------------------- 전깃줄
function wirePt(w, s) { const cx = (w.a.dx + w.b.dx) / 2, cy = (w.a.dy + w.b.dy) / 2 + w.sag * 2, u = 1 - s; return { x: u * u * w.a.dx + 2 * u * s * cx + s * s * w.b.dx, y: u * u * w.a.dy + 2 * u * s * cy + s * s * w.b.dy }; }
function wireGround(w, s) { return { x: w.a.x + (w.b.x - w.a.x) * s, y: w.a.y + (w.b.y - w.a.y) * s }; }
// 옥상 가장자리의 줄 끝에 서 있으면 [전깃줄 타기]
function nearWireMount() {
  const P = S.player; if (!S.wires.length || !P.z || P.wire || P.jump || P.carrying || P.captive) return null;
  let best = null, bd = 46;
  for (const w of S.wires) for (const [n, s] of [[w.a, 0], [w.b, 1]]) { if (ACT_SKIP.has(w) || !n.roof || n.z !== P.z) continue; const d = dist(P.x, P.y, n.x, n.y); if (d < bd) { bd = d; best = { w, s, at: { x: n.dx, y: n.dy } }; } }
  if (best) return best;
  // 줄 중간: 옥상 가장자리 바로 옆을 지나는 줄(높이 차 한 층 이내)은 손을 뻗어 잡는다
  bd = 40;
  for (const w of S.wires) for (let i = 2; i <= 38; i++) {
    if (ACT_SKIP.has(w)) continue;
    const s = i / 40, h = wirePt(w, s), z = w.a.z + (w.b.z - w.a.z) * s; if (Math.abs(z - P.z) > 1.01) continue;
    const d = dist(P.x, P.y, h.x, h.y); if (d < bd) { bd = d; best = { w, s, at: { x: h.x, y: h.y }, mid: true }; }
  }
  return best;
}
// 전봇대 밑에 서 있으면 [전봇대 오르기] — 바라보는 방향의 줄로
function nearPole() {
  const P = S.player; if (!S.poles.length || P.z || P.fl || P.wire || P.jump || P.carrying || P.captive || P.hide) return null;
  let best = null, bd = 56;
  for (const o of S.poles) { if (ACT_SKIP.has(o) || !objectReachable({ x: o.x, y: o.y, fl: 0 }, 56)) continue;
    if (!o.wires.length) continue; const d = dist(P.x, P.y, o.x, o.y); if (d >= bd) continue;
    let bw = null, bs = -9;
    for (const w of o.wires) { const far = w.a.pole === o ? w.b : w.a; const sc = Math.cos(angDiff(P.a, Math.atan2(far.y - o.y, far.x - o.x))); if (sc > bs) { bs = sc; bw = w; } }
    bd = d; best = { w: bw, s: bw.a.pole === o ? 0 : 1, pole: o, at: { x: o.x, y: o.y - 30 } };
  }
  return best;
}
// 줄 위(그려진 위치) 바로 옆에 같은 높이쯤의 옥상이 있으면 그리로 내려선다
function wireNearRoof(h, z) {
  const tx0 = Math.floor(h.x / TILE), ty0 = Math.floor(h.y / TILE); let best = null, bd = 34;
  for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) {
    const lv = rLv(tx, ty); if (!lv || lv < z - 1 || lv > z + 1) continue;
    const cx = clamp(h.x, tx * TILE + 14, tx * TILE + TILE - 14), cy = clamp(h.y, ty * TILE + 14, ty * TILE + TILE - 14), d = dist(h.x, h.y, cx, cy);
    if (d < bd) { bd = d; best = { x: cx, y: cy, lv }; }
  }
  return best;
}
function wireEnd() { const P = S.player, W_ = P.wire; if (!W_) return null; const tol = 44 / W_.w.L; return W_.s <= tol ? W_.w.a : W_.s >= 1 - tol ? W_.w.b : null; }
// 줄에서 벗어나는 환경 행동은 아래 적을 공격할 수 있는지와 따로 계산한다.
function wireExitAction() {
  const P = S.player; if (!P.wire || P.jump || P.trav) return null;
  const h = wirePt(P.wire.w, P.wire.s), at = { x: h.x, y: h.y - 6 }, e = wireEnd();
  if (e) return { k: 'wireOff', n: e, at, label: e.roof ? '옥상에 올라가기' : e.win ? `${e.fl + 1}층 창문으로 들어가기` : '전봇대 내려가기' };
  const lv = rLv(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  if (lv > 0 && lv <= P.z + 1) return { k: 'wireRoof', lv, at, label: '옥상에 올라가기' };
  const nr = wireNearRoof(h, P.z);
  return nr ? { k: 'wireRoof', lv: nr.lv, to: nr, at, label: '옆 옥상에 올라가기' } : null;
}
// 줄 아래(실외, 맨땅)를 지나는 자경대원 위로 떨어진다
function wireDropTarget() {
  const P = S.player; if (!P.wire || P.strikeT > 0) return null;
  let best = null, bd = 74;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || (g.state === 'ALERT' && !g.target) || flOf(g)) continue;
    const gx = Math.floor(g.x / TILE), gy = Math.floor(g.y / TILE); if (roofAt(gx, gy) || bldAt(gx, gy) >= 0) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d < bd) { bd = d; best = g; }
  }
  return best;
}
function wireFallOk() { const P = S.player, tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE); return !groundSolidP(tx, ty) && !roofAt(tx, ty) && bldAt(tx, ty) < 0; }
// 전깃줄에서 내리기: 옥상 끝 → 옥상 / 창문 끝 → 그 층 실내 / 전봇대 → 땅
function wireDismount(n) {
  const P = S.player, h = wirePt(P.wire.w, P.wire.s), hx = h.x, hy = h.y + 36; P.wire = null; play('cloth', 0.35);
  if (n.roof) { startTrav({ pts: [{ x: hx, y: hy, f: 0 }, { x: n.x, y: n.y, f: 1 }], dur: 0.45, phases: [{ to: 1, pose: 'vault' }], end: () => { P.z = n.z; P.x = n.x; P.y = n.y; setLayer(0); } }); return; }
  if (n.win) { const wx = tc(n.tx), wy = tc(n.ty - 1);
    startTrav({ pts: [{ x: hx, y: hy, f: 0 }, { x: wx, y: wy, f: 1 }], dur: 0.55, phases: [{ to: 1, pose: 'vault' }], face: -Math.PI / 2,
      end: () => { P.z = 0; P.fl = n.fl; setLayer(P.fl); P.x = wx; P.y = wy; P.a = -Math.PI / 2; noise(P.x, P.y, 35, 'window'); S.fade = 0.2; toast(`${n.fl + 1}층 창문으로 들어왔다`, 1.8); } }); return; }
  setLayer(0); const o = n.pole; let best = null, bs = 1e9;
  for (const d of N8) { const tx = o.tx + d[0], ty = o.ty + d[1]; if (groundSolidP(tx, ty) || roofAt(tx, ty) || bldAt(tx, ty) >= 0) continue; const sc = Math.abs(d[0]) + Math.abs(d[1]) + (d[1] > 0 ? -0.5 : 0); if (sc < bs) { bs = sc; best = [tx, ty]; } }
  const gx = best ? tc(best[0]) : o.x, gy = best ? tc(best[1]) : o.y + 20;
  startTrav({ pts: [{ x: hx, y: hy, f: 0 }, { x: o.x, y: o.y + 4, f: 0.85 }, { x: gx, y: gy, f: 1 }], dur: 1.0, phases: [{ to: 0.85, pose: 'climb' }, { to: 1, pose: 'walk' }], face: -Math.PI / 2, down: true, base: { x: o.x, y: o.y }, step: 'metal', loud: 40,
    end: () => { P.z = 0; P.x = gx; P.y = gy; noise(P.x, P.y, 40, 'climb'); } });
}
function updateWire(P, mx, my, mag, mode, dt) {
  const W_ = P.wire; let w = W_.w;
  P.moving = false; P.mode = mode;
  if (mag > 0.15) {
    const ux = (w.b.dx - w.a.dx) / w.L, uy = (w.b.dy - w.a.dy) / w.L, d = (mx * ux + my * uy) / mag;
    if (Math.abs(d) > 0.2) {
      let s = W_.s + Math.sign(d) * ({ sneak: 46, walk: 72, run: 104 }[mode]) * (STAGE.pspd || 1) / w.L * dt;
      if (s < 0 || s > 1) {
        const end = s < 0 ? w.a : w.b; s = clamp(s, 0, 1);
        if (end.roof || end.win) { wireDismount(end); return; }  // 옥상·창문 끝에 닿으면 바로 내려선다
        if (end.pole) {  // 전봇대에서 미는 방향의 다른 줄로 갈아탄다
          let best = null, bs = 0.35;
          for (const o of end.pole.wires) { if (o === w) continue; const far = o.a.pole === end.pole ? o.b : o.a; const fx = far.dx - end.dx, fy = far.dy - end.dy, fl = Math.hypot(fx, fy) || 1; const sc = (mx * fx + my * fy) / (fl * mag); if (sc > bs) { bs = sc; best = o; } }
          if (best) { W_.w = w = best; s = best.a.pole === end.pole ? 0 : 1; play('metal', 0.15); }
        }
      }
      W_.s = s; P.moving = true; W_.fa = Math.atan2(uy * Math.sign(d), ux * Math.sign(d));
      P.stepT -= dt; if (P.stepT <= 0) { P.stepT = mode === 'run' ? 0.3 : 0.5; play('cloth', mode === 'run' ? 0.22 : 0.08, 1.2); if (mode === 'run') noise(P.x, P.y, 90, 'wire'); }
    }
  }
  const g = wireGround(W_.w, W_.s); P.x = g.x; P.y = g.y;
  P.z = Math.max(1, Math.round(W_.w.a.z + (W_.w.b.z - W_.w.a.z) * W_.s));
  P.light = lightAt(P.x, P.y, true); P.hidden = false; P.a = -Math.PI / 2;
  hint('wire', '전깃줄: 줄을 따라 이동. 아래 자경대원 위에서 [낙하 암살]. 뛰면 줄이 울린다');
  checkObjective();
}

