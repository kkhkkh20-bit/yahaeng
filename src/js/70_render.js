const GLC = { t: -1, m: new Map() };  // 시야 원뿔용 밝기 기억 (12px 칸, 0.2초)
// 자경대원 시야 원뿔: 광선마다 6px 간격으로 그 자리 밝기를 보고 0(안 보임)·1(서 있으면 보임)·2(웅크려도 보임)를 매긴다
// 밝기는 12px 칸마다 0.2초 동안 기억해 같이 쓴다 (여러 자경대원이 같은 칸을 본다)
const lightC = (x, y) => { if (S.t - GLC.t > 0.2 || S.t < GLC.t) { GLC.m.clear(); GLC.t = S.t; } const cx = Math.floor(x / 12), cy = Math.floor(y / 12), k = CUR_F * 1e8 + cy * 1e4 + cx; let v = GLC.m.get(k); if (v === undefined) { v = lightAt(cx * 12 + 6, cy * 12 + 6, false); GLC.m.set(k, v); } return v; };
function guardCone(g, fov, rg) {
  const ck = (S.player.cover ? 1 : 0) + g.state + (g.z || 0) + fov.toFixed(2) + Math.round(rg.lit);
  if (g._cone && S.t - g._cone.t < 0.1 && S.t >= g._cone.t && g._cone.k === ck && Math.hypot(g.x - g._cone.x, g.y - g._cone.y) < 10 && Math.abs(angDiff(g._cone.a, g.a)) < 0.12) return g._cone.cn;
  const N = 34, STP = 6, rays = [], crouchK = (g.state === 'ALERT' ? 1 : 0.55) * (S.player.cover && flOf(g) === flOf(S.player) ? COVER_HIDE : 1), el = g.elite ? 1.1 : 1, L0 = CUR_F;
  setLayer(flOf(g));
  for (let i = 0; i <= N; i++) {
    const a = g.a - fov + (2 * fov) * i / N, w = castRay(g.x, g.y, a, rg.lit * el, g.z || 0), ca = Math.cos(a), sa = Math.sin(a), lv = [];
    for (let d = STP / 2; d < w; d += STP) { const L = lightC(g.x + ca * d, g.y + sa * d), eff = (rg.dark + (rg.lit - rg.dark) * L) * el; lv.push(d < 24 || d <= eff * crouchK ? 2 : d <= eff ? 1 : 0); }
    rays.push({ a, ra: a - g.a, w, lv });
  }
  setLayer(L0); const cn = { rays, STP }; g._cone = { t: S.t, k: ck, x: g.x, y: g.y, a: g.a, cn }; return cn;
}
// lo~hi 단계 영역을 '띠' 몇 개로 그린다: 광선마다 그 단계인 구간들을 구하고, 구간 개수가 같은 이웃 광선끼리 묶어
// 먼 끝을 따라 갔다가 가까운 끝으로 돌아오는 다각형 하나로 (칸마다 사각형을 만들던 것보다 경로가 수십 배 짧다 — 발열의 주범이었다)
function conePaths(g, cn, lo, hi) {
  const R = cn.rays, STP = cn.STP, h = R.length > 1 ? (R[1].ra - R[0].ra) / 2 : 0.02; ctx.beginPath();
  const ivs = R.map(r => { const out = [], n = r.lv.length; let k0 = -1; for (let k = 0; k <= n; k++) { const on = k < n && r.lv[k] >= lo && r.lv[k] <= hi; if (on && k0 < 0) k0 = k; if (!on && k0 >= 0) { out.push([k0 * STP, Math.min(k * STP, r.w)]); k0 = -1; } } return out; });
  const pt = (a, d, mv) => { const x = g.x + Math.cos(a) * d, y = g.y + Math.sin(a) * d; if (mv) ctx.moveTo(x, y); else ctx.lineTo(x, y); };
  for (let i = 0; i < R.length;) {
    const m = ivs[i].length; if (!m) { i++; continue; }
    let j = i; while (j + 1 < R.length && ivs[j + 1].length === m) j++;
    for (let q = 0; q < m; q++) {
      pt(g.a + R[i].ra - h, ivs[i][q][1], true); for (let r = i; r <= j; r++) pt(g.a + R[r].ra, ivs[r][q][1]); pt(g.a + R[j].ra + h, ivs[j][q][1]);
      pt(g.a + R[j].ra + h, ivs[j][q][0]); for (let r = j; r >= i; r--) pt(g.a + R[r].ra, ivs[r][q][0]); pt(g.a + R[i].ra - h, ivs[i][q][0]); ctx.closePath();
    }
    i = j + 1;
  }
}
// ---------------------------------------------------------------- 그리기
function drawSprite(c, x, y, a, s = 0.78, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
  ctx.drawImage(c, -c.width * s * 0.42, -c.height * s / 2, c.width * s, c.height * s);
  ctx.restore();
}
function worldTransform(c, scale) { let sx = 0, sy = 0; if (S && S.shakeT > 0) { const a = S.shakeT * 22 * DPR; sx = Math.sin(S.t * 91) * a; sy = Math.cos(S.t * 73) * a * 0.7; } c.setTransform(scale, 0, 0, scale, W / 2 * DPR - cam.x * scale + sx, H / 2 * DPR - cam.y * scale + sy); }
function drawKeyIcon(k, x, y, ring) {
  if (!k || k === 'gold') return drawItemIcon('it_key', x, y, S.t, ring);
  const bob = Math.sin(S.t * 3) * 2, c = keyCol(k);
  if (ring) { ctx.strokeStyle = c; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(S.t * 4) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 11, y - 7 + bob, 24, 17);
  ctx.fillStyle = c; ctx.fillRect(x - 12, y - 9 + bob, 24, 16); ctx.fillStyle = '#f4f2ea'; ctx.fillRect(x - 9, y - 6 + bob, 7, 5); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 12, y + 3 + bob, 24, 3);
}
function drawItemIcon(name, x, y, t, ring) {
  const bob = Math.sin(t * 3) * 2;
  if (ring) { ctx.strokeStyle = 'rgba(242,196,107,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(t * 4) * 2, 0, TAU); ctx.stroke(); }
  const f = F[name]; const k = 32 / Math.max(f[2], f[3]); blit(ctx, name, x - f[2] * k / 2, y - f[3] * k / 2 + bob, f[2] * k, f[3] * k);
}
function drawNote(n) {
  const x = n.x, y = n.y;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 9, y - 6, 22, 16);
  ctx.fillStyle = n.read ? '#c8c2b0' : '#f2ecd8'; ctx.fillRect(x - 11, y - 9, 22, 16); ctx.fillStyle = '#8a8070'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 8, y - 5 + k * 4, 16, 1.5);
  if (!n.read) { ctx.strokeStyle = `rgba(160,220,255,${0.5 + 0.3 * Math.sin(S.t * 4)})`; ctx.lineWidth = 2; ctx.strokeRect(x - 14, y - 12, 28, 22); }
}
function drawScroll(x, y, t) { drawItemIcon('it_scroll', x, y, t, true); }
function drawScrollOld(x, y, t) {
  const bob = Math.sin(t * 3) * 2;
  ctx.save(); ctx.translate(x, y + bob);
  ctx.strokeStyle = 'rgba(242,196,107,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18 + Math.sin(t * 4) * 2, 0, TAU); ctx.stroke();
  ctx.rotate(-0.25); ctx.fillStyle = '#e9dcc0'; ctx.fillRect(-10, -7, 20, 14);
  ctx.fillStyle = '#c9b48a'; ctx.fillRect(-12, -8, 4, 16); ctx.fillRect(8, -8, 4, 16);
  ctx.fillStyle = '#c2362b'; ctx.beginPath(); ctx.arc(2, 1, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawPlayer(P) {
  if (P.wire) {
    // 전깃줄에 두 손으로 매달린 모습 (땅에는 그림자)
    const h = wirePt(P.wire.w, P.wire.s), sw = P.moving ? Math.sin(S.t * 9) * 2 : 0, dim = P.light < 0.3;
    const blinkW = P.hurtT > 0 && Math.floor(P.hurtT * 12) % 2;
    { const gp = wireGround(P.wire.w, P.wire.s), sx = gp.x + (P.z || 1) * SHD.x, sy = gp.y + (P.z || 1) * SHD.y;  // 땅에 떨어진 내 그림자: 높이만큼 떨어져 있다
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.ellipse(sx, sy, 13, 6.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 19, 9.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,230,255,.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(h.x, h.y + 46); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]); }
    if (usePR('ninja') && PR.anims.hang && PR.hangHand) {  // 프리렌더 매달림: 두 손을 줄에 맞추고, 움직이면 다리를 흔들며 옮겨 간다
      const sh = prSheet('ninja'), [c0, nf] = PR.anims.hang, fi = P.moving ? Math.floor(S.t * 6) % nf : 0, fr = PR.fr;
      ctx.globalAlpha = blinkW ? 0.3 : dim ? 0.75 : 1;
      const row = prDir(P.wire.fa != null ? P.wire.fa : -Math.PI / 2);
      ctx.drawImage(sh, (c0 + fi) * fr, row * fr, fr, fr, h.x + sw - PR.hangHand[0], h.y + 2 - PR.hangHand[1], fr, fr);
      if (dim && prVar.ninja_ol) { ctx.globalAlpha = 0.85; ctx.drawImage(prVar.ninja_ol, (c0 + fi) * fr, row * fr, fr, fr, h.x + sw - PR.hangHand[0], h.y + 2 - PR.hangHand[1], fr, fr); }
      ctx.globalAlpha = 1; return;
    }
    ctx.strokeStyle = '#2c3040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(h.x - 8 + sw, h.y + 18); ctx.lineTo(h.x - 5, h.y + 1); ctx.moveTo(h.x + 8 + sw, h.y + 18); ctx.lineTo(h.x + 5, h.y + 1); ctx.stroke();
    drawChar('ninja', h.x + sw, h.y + 36, -Math.PI / 2, P.moving, blinkW ? 0.3 : dim ? 0.6 : 1, 3);
    if (F.ch_ninja_ol) drawChar('ninja_ol', h.x + sw, h.y + 36, -Math.PI / 2, P.moving, dim ? 0.95 : 0.6, 3);
    ctx.fillStyle = '#f1b089'; ctx.fillRect(h.x - 8, h.y - 3, 5, 5); ctx.fillRect(h.x + 3, h.y - 3, 5, 5);
    return;
  }
  let lift = P.z ? 1 + P.z * 0.05 : 1, yo = 0;
  if (P.jump) { const f = Math.min(1, P.jump.t / P.jump.dur); yo = -Math.sin(f * Math.PI) * P.jump.arc; lift += Math.sin(f * Math.PI) * 0.25; }
  if (P.z || P.jump) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(P.x + 4 + P.z * 2, P.y + 6 + P.z * 3, 15, 11, 0, 0, TAU); ctx.fill(); }
  // 숨은 상태(어둠·화단): 몸은 반투명, 밝은 외곽선과 발밑 고리로 내 위치는 늘 보이게
  const concealed = !P.jump && !P.under && (CITY && S.expo != null ? S.expo === 0 : (P.hidden || P.light < 0.3));
  if (CITY && !P.jump && !P.z && !P.under && S.expo > 0) {  // 드러남 고리: 노랑(돌아보면 보인다) · 빨강(보고 있다)
    const red = S.expo === 2, pu = red ? 0.6 + 0.35 * Math.sin(S.t * 10) : 0.75;
    ctx.strokeStyle = red ? `rgba(240,80,60,${pu})` : `rgba(242,196,107,${pu})`; ctx.lineWidth = red ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 21, 10, 0, 0, TAU); ctx.stroke();
  }
  const blink = P.hurtT > 0 && Math.floor(P.hurtT * 12) % 2;
  const sc = 3 * lift, mv = P.moving || !!P.jump;
  // 자세: 살금살금 = 몸을 낮춤(납작·넓게, 발밑 그림자 큼) / 달리기 = 뒤로 흩날리는 속도선
  const crouch = P.mode === 'sneak' && !P.jump && !P.carrying && !P.captive, runP = P.mode === 'run' && P.moving && !P.jump;
  if (runP) { const bx = -Math.cos(P.a), by = -Math.sin(P.a); ctx.lineWidth = 2.5; for (const o of [-8, 0, 8]) { const ph = (S.t * 5 + o * 0.05) % 1, px = P.x - by * o, py = P.y + 6 + bx * o; ctx.strokeStyle = `rgba(232,238,248,${0.5 * (1 - ph)})`; ctx.beginPath(); ctx.moveTo(px + bx * (18 + ph * 8), py + by * (18 + ph * 8)); ctx.lineTo(px + bx * (36 + ph * 14), py + by * (36 + ph * 14)); ctx.stroke(); } }
  if (P.ledge && usePR('ninja') && PR.anims.hang && PR.hangHand) {  // 옥상 끝에 두 손으로 매달림
    const n = P.ledge, hx = P.x + n.x * 14, hy = P.y + n.y * 14 + (n.y > 0 ? 6 : 0), sh = prSheet(P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja'), [c0, nf] = PR.anims.hang, fr = PR.fr, fi = P.moving ? Math.floor(S.t * 6) % nf : 0;
    ctx.save(); if (n.y < 0) { ctx.beginPath(); ctx.rect(hx - 60, hy - 200, 120, 206); ctx.clip(); }
    ctx.globalAlpha = n.y < 0 ? 0.75 : 1; ctx.drawImage(sh, (c0 + fi) * fr, 6 * fr, fr, fr, hx - PR.hangHand[0], hy + 2 - PR.hangHand[1], fr, fr); ctx.restore(); ctx.globalAlpha = 1;
    return;
  }
  if (usePR('ninja') && PR.anims.climb && (P.trav || (P.jump && P.jump.vault))) {
    // 오르기·넘기: 배관·벽을 붙잡고 팔다리를 번갈아 / 창턱을 짚고 몸을 접어 넘는다
    const PK = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s1 = sc / 3, al = blink ? 0.35 : 1;
    if (P.jump) { const f = Math.min(1, P.jump.t / P.jump.dur); drawPR(PK, P.x, P.y, P.a, 'vault', 0, al, s1, -yo, f < 0.28 ? 0 : f < 0.78 ? 1 : 2); return; }
    const T = P.trav, tp = travPose(T);
    if (tp.pose === 'sink' || tp.pose === 'sinkBush' || tp.pose === 'climbDown' || tp.pose === 'climbUp') {  // 숨는 곳 안으로 들어가고 나오는 몸: 테두리(rim) 아래는 잘라 낸다
      const bush = tp.pose === 'sinkBush', cl = tp.pose === 'climbDown' || tp.pose === 'climbUp', g = tp.pose === 'climbUp' ? 1 - tp.g : tp.g, rim = T.rim != null ? T.rim : P.y + 10;
      ctx.save(); ctx.beginPath(); ctx.rect(P.x - 80, rim - 240, 160, 240); ctx.clip();
      const drop = g * (bush ? 8 : cl ? 46 : 36), fr = cl ? ((Math.floor(T.t * 7) * (tp.pose === 'climbDown' ? -1 : 1)) % 4 + 4) % 4 : 0;
      drawPR(PK, P.x, P.y + drop, T.face != null ? T.face : P.a, cl ? 'climb' : 'crouch', 0, al * (bush ? 1 - g * 0.55 : 1), s1, cl ? 14 : 0, fr);
      ctx.restore(); return; }
    if (tp.pose === 'climb') { drawPR(PK, P.x, P.y, T.face != null ? T.face : P.a, 'climb', 0, al, s1, 14, ((Math.floor(T.t * 7) * (T.down ? -1 : 1)) % 4 + 4) % 4); return; }
    if (tp.pose === 'vault') { drawPR(PK, P.x, P.y, T.face != null ? T.face : P.a, 'vault', 0, al, s1, Math.sin(tp.g * Math.PI) * 10, tp.g < 0.3 ? 0 : tp.g < 0.75 ? 1 : 2); return; }
  }
  if (usePR('ninja')) {
    // 프리렌더: 자세가 애니메이션으로 구분된다 (서기·걷기·달리기·웅크려 걷기·웅크림·찌르기)
    const GI = P.grabIn;  // 붙잡기: 손이 닿은 뒤 목을 감아 끌어당기는 동작 (조르기 첫 단계를 그대로 쓴다)
    if (GI && GI.g.state === 'CAPTIVE' && PAIR() && PR.anims.choke && usePR(charOf(GI.g))) {
      const u = Math.min(1, (GI.t - GI.run) / Math.max(0.01, GI.dur - GI.run)), kt = 1 - (1 - u) * (1 - u), PK1 = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s1 = sc / 3, fi = ktFrame('choke', kt), j = u > 0.6 ? Math.sin(S.t * 40) * 1.2 : 0;
      drawPR(PK1, P.x, P.y, P.a, 'choke', 0, 1, s1, -yo, fi); drawPR(charOf(GI.g), P.x + j, P.y, P.a, 'choked', 0, 1, s1, -yo, fi); return;
    }
    if (P.killAnim && P.strikeT > 0 && PAIR() && usePR(P.killAnim.ch)) {  // 뒤에서 처치: 칼 / 목 조르기 (핵심 자세 4개 + 사이 프레임)
      const KA = P.killAnim, PK1 = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s1 = sc / 3;
      if (KA.kind && PR.anims[KA.kind]) { const f = Math.min(1, (S.t - KA.t0) / KA.dur), kt = killKT(KA.kind, f, KA.from), fi = ktFrame(KA.kind, kt), j = kt > 0.9 && kt < 1.5 ? Math.sin(S.t * 40) * (1.6 - (kt - 1) * 2) : 0;
        drawPR(PK1, P.x, P.y, P.a, KA.kind, 0, 1, s1, -yo, fi); drawPR(KA.ch, P.x + j, P.y, P.a, KA.kind === 'stab' ? 'stabbed' : 'choked', 0, 1, s1, -yo, fi); return; }
      const j = Math.sin(S.t * 40) * 1.5; drawPR(PK1, P.x, P.y, P.a, 'grabI', 0, 1, s1, -yo); drawPR(KA.ch, P.x + j, P.y, P.a, 'heldI', 0, 1, s1, -yo); return;
    }
    const BA = P.bodyAnim;  // 시체 들기(허리 숙임 → 안아 올림 → 어깨) · 내려놓기(거꾸로) · 넣기(어깨에서 내려 통에 넣음)
    if (BA && S.t - BA.t0 < BA.dur && PR.anims.lift && PR.anims.stoop) {
      const f = (S.t - BA.t0) / BA.dur, PKb = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s1 = sc / 3, ck = carryKey(BA.c);
      const ph = BA.k === 'lift' ? (f < 0.4 ? 'stoop' : f < 0.7 ? 0 : 1) : BA.k === 'drop' ? (f < 0.3 ? 1 : f < 0.6 ? 0 : 'stoop') : (f < 0.45 ? 1 : f < 0.8 ? 0 : 'stoop');
      if (ph === 'stoop') {
        const cx = BA.k === 'lift' ? BA.cx : BA.c.x, cy = BA.k === 'lift' ? BA.cy : BA.c.y, ca = BA.k === 'lift' ? BA.ca : BA.c.a, showC = BA.k !== 'stash' && ck && usePR(ck);
        if (showC && cy < P.y) drawPR(ck, cx, cy - 6, ca || 0, 'death', 0, 1, 1, 0, 5);
        drawPR(PKb, P.x, P.y, P.a, 'stoop', 0, 1, s1, -yo, 0);
        if (showC && cy >= P.y) drawPR(ck, cx, cy - 6, ca || 0, 'death', 0, 1, 1, 0, 5);
      } else { drawPR(PKb, P.x, P.y, P.a, 'lift', 0, 1, s1, -yo, ph); if (ck && usePR(ck)) drawPR(ck, P.x, P.y, P.a, 'lifted', 0, 1, s1, -yo, ph); }
      return;
    }
    if (BA && S.t - BA.t0 >= BA.dur) P.bodyAnim = null;
    if (P.killAnim && P.strikeT <= 0) P.killAnim = null;
    const pc = pairCarry(P), pg = !pc && pairGrab(P);
    if (P.cover && (PR.anims.hug || PR.anims.lean) && !P.strikeT) {  // 벽에 바짝 붙음: 웅크려 등을 붙인 자세, 옆걸음, 좌우 살피기. 붙는 순간은 몸을 돌려 벽에 '툭'
      const n = P.cover, PK0 = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', s0 = sc / 3, aw = Math.atan2(n.y, n.x), al0 = blink ? 0.35 : concealed ? 0.6 : 1;
      const wx = P.x - n.x * 14, wy = P.y - n.y * 14, glow = P.snap ? Math.min(1, P.snap.t / P.snap.dur) : 1;
      ctx.strokeStyle = `rgba(150,220,255,${0.75 * glow})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx - n.y * 18, wy + n.x * 18); ctx.lineTo(wx + n.y * 18, wy - n.x * 18); ctx.stroke();
      const drawC = (k, ang, an, fr, ox, oy) => { drawPR(k, P.x + (ox || 0), P.y + (oy || 0), ang, an, S.t, k === 'ninja_ol' ? 0.85 : al0, s0, -yo, fr); };
      let ang = aw, an, fr, ox = 0, oy = 0;
      if (!PR.anims.hug) { an = mv ? 'sneak' : 'lean'; fr = mv ? -1 : Math.floor(S.t * 0.4) % 2; ang = mv ? P.a : aw; }
      else if (P.snap) {  // 붙는 동작: 앞 절반은 웅크린 채 몸을 돌리고, 뒤 절반은 등이 벽에 닿으며 살짝 눌렸다 돌아온다
        const f = Math.min(1, P.snap.t / P.snap.dur);
        if (f < 0.5) { an = 'crouch'; fr = 0; ang = P.snap.a0 + angDiff(P.snap.a0, aw) * (f / 0.5); }
        else { an = 'hug'; fr = 0; const b = Math.sin((f - 0.5) / 0.5 * Math.PI) * 2.5; ox = -n.x * b; oy = -n.y * b; }
      } else if (mv) {  // 옆걸음: 몸 왼쪽(화면 기준 sin a, -cos a)으로 가면 앞으로, 오른쪽이면 거꾸로
        const lx = Math.sin(aw), ly = -Math.cos(aw), fw = (P.vx * lx + P.vy * ly) >= 0, i = Math.floor(S.t * 7) % 4;
        an = 'hugStep'; fr = fw ? i : (4 - i) % 4;
      } else {  // 멈춤: 방금 움직인 쪽을 살피고, 오래 있으면 가끔 좌우를 번갈아 본다
        an = 'hug'; const side = P.coverSide && S.t - (P.coverSideT || 0) < 1.6 ? P.coverSide : 0;
        if (side) { const lx = Math.sin(aw), ly = -Math.cos(aw), wsx = -n.y * side, wsy = n.x * side; fr = wsx * lx + wsy * ly > 0 ? 1 : 2; }
        else fr = [0, 0, 1, 0, 0, 2][Math.floor(S.t / 1.3) % 6];
      }
      drawC(PK0, ang, an, fr, ox, oy); if (concealed && prVar.ninja_ol) drawC('ninja_ol', ang, an, fr, ox, oy);
      return;
    }
    const hold = P.item && P.item.id === 'box' && !pc && !pg && PR.anims.hold;  // 택배 상자를 두 손으로 든다
    const rising = !mv && P.riseT && S.t < P.riseT && !pc && !pg;
    const anim = pc ? (mv ? 'carry' : 'carryI') : pg ? (mv ? 'grab' : 'grabI') : P.strikeT > 0 ? 'punch' : rising ? 'crouch' : hold ? (mv ? 'hold' : 'holdI') : crouch ? (mv ? 'sneak' : 'crouch') : !mv ? (PR.anims.idleC ? 'idleC' : 'idle') : (runP || P.jump) ? 'run' : 'walk';
    const t = S.t, s = sc / 3, PK = P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja';
    // 메고 있는 시체·붙잡은 사람: 같은 프레임으로 겹쳐 그린다 (서로 가린 채 렌더링돼 있다)
    const other = pc ? [carryKey(P.carrying), mv ? 'carried' : 'carriedI'] : pg ? [charOf(P.captive), mv ? 'held' : 'heldI'] : null;
    const shake = pg ? Math.sin(S.t * 31) * 1.2 : 0;
    if (concealed) {
      const pulse = 0.55 + 0.25 * Math.sin(S.t * 3);
      ctx.fillStyle = 'rgba(120,200,255,.10)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(160,230,255,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, false); drawPR(PK, P.x, P.y, P.a, anim, t, blink ? 0.25 : 0.55, s, -yo); if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, true);
      if (other) drawPR(other[0], P.x + shake, P.y, P.a, other[1], t, blink ? 0.3 : 0.92, s, -yo);
      if (prVar.ninja_ol) drawPR('ninja_ol', P.x, P.y, P.a, anim, t, blink ? 0.3 : 0.9, s, -yo);
    } else { if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, false); drawPR(PK, P.x, P.y, P.a, anim, t, blink ? 0.35 : 1, s, -yo); if (other) drawPR(other[0], P.x + shake, P.y, P.a, other[1], t, blink ? 0.35 : 1, s, -yo); if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, true); }
    if (P.disguise && !P.disguiseBlown) { ctx.fillStyle = 'rgba(127,174,134,.9)'; ctx.font = '700 12px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('변장', P.x, P.y - 44 * s); }
    return;
  }
  if (crouch) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 14, 19, 8, 0, 0, TAU); ctx.fill(); }
  ctx.save(); if (crouch) { ctx.translate(P.x, P.y + 16); ctx.scale(1.14, 0.72); ctx.translate(-P.x, -(P.y + 16)); }
  if (concealed) {
    const pulse = 0.55 + 0.25 * Math.sin(S.t * 3);
    ctx.fillStyle = 'rgba(120,200,255,.10)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(160,230,255,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    drawChar('ninja', P.x, P.y, P.a, mv, blink ? 0.25 : 0.5, sc, P.strikeT > 0, -yo);
    if (F.ch_ninja_ol) drawChar('ninja_ol', P.x, P.y, P.a, mv, blink ? 0.3 : 0.95, sc, P.strikeT > 0, -yo);
  } else drawChar('ninja', P.x, P.y, P.a, mv, blink ? 0.35 : 1, sc, P.strikeT > 0, -yo);
  ctx.restore();
}
// 도면 시야 (Monaco): 바깥 땅에 서 있으면, 창문·열린 문으로 시선이 닿는 방 안만 보인다
function drawWindowSight(P, openB) {
  if (P.z || P.wire || P.jump || P.trav || P.hide || P.vent || P.under || flOf(P)) return;
  const R = 430, poly = [];
  for (let i = 0; i < 180; i++) { const a = i / 180 * TAU, d = castRay(P.x, P.y, a, R); poly.push(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d); }
  const path = () => { ctx.beginPath(); for (let i = 0; i < poly.length; i += 2) i ? ctx.lineTo(poly[i], poly[i + 1]) : ctx.moveTo(poly[i], poly[i + 1]); ctx.closePath(); };
  BLD.forEach((b, bi) => {
    if (bi === openB || b.piloti) return;
    const bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    if (P.x < bx - R || P.x > bx + bw + R || P.y < by - R || P.y > by + bh + R) return;
    // 바깥벽 안쪽으로 시선이 들어가는지 (안쪽 칸 하나라도)
    let inside = false; for (let i = 0; i < poly.length && !inside; i += 2) { const tx = Math.floor((poly[i] - Math.cos(i / poly.length * TAU) * 2) / TILE), ty = Math.floor((poly[i + 1] - Math.sin(i / poly.length * TAU) * 2) / TILE); if (tx > b.x0 && tx < b.x1 && ty > b.y0 && ty < b.y1) inside = true; }
    if (!inside) return;
    b.wsT = S.t;  // 이번 프레임 창문 시선으로 들여다보는 중 (옥상 발광은 쉰다)
    // 도면: 건물 평면을 흐리게 (사람은 안 보임)
    ctx.save(); ctx.globalAlpha = 0.5; ctx.drawImage(mapC, bx, by, bw, bh, bx, by, bw, bh); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(20,34,52,.45)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(160,200,235,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); ctx.setLineDash([]); ctx.restore();
    // 시선이 닿는 곳: 또렷하게 + 사람까지
    ctx.save(); ctx.beginPath(); ctx.rect(bx + TILE, by + TILE, bw - 2 * TILE, bh - 2 * TILE); ctx.clip(); path(); ctx.clip();
    ctx.drawImage(mapC, bx, by, bw, bh, bx, by, bw, bh);
    for (const c of S.corpses) if (!c.stashed && !flOf(c) && bldAt(Math.floor(c.x / TILE), Math.floor(c.y / TILE)) === bi) drawBody(c);
    for (const g of S.guards) if (g.state !== 'DEAD' && !flOf(g) && !g.z && !g.climb && bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) === bi) { drawGuard(g); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); }
    for (const it of S.items) if (!it.got && !flOf(it) && bldAt(Math.floor(it.x / TILE), Math.floor(it.y / TILE)) === bi) drawScroll(it.x, it.y, S.t);
    ctx.fillStyle = 'rgba(255,230,170,.06)'; ctx.fillRect(bx, by, bw, bh);
    // 시선 경계는 선 대신 부드러운 그늘: 안쪽으로 번지는 흐린 띠 + 멀어질수록 서서히 어둡게 (도면 바탕과 자연스럽게 이어진다)
    ctx.filter = 'blur(9px)'; ctx.strokeStyle = 'rgba(16,28,44,.8)'; ctx.lineWidth = 30; path(); ctx.stroke(); ctx.filter = 'none';
    const rg = ctx.createRadialGradient(P.x, P.y, R * 0.3, P.x, P.y, R); rg.addColorStop(0, 'rgba(16,28,44,0)'); rg.addColorStop(1, 'rgba(16,28,44,.65)'); ctx.fillStyle = rg; ctx.fillRect(bx, by, bw, bh);
    ctx.restore();
    hint('winsight', '창문과 열린 문으로 시선이 닿는 방 안은 바깥에서도 보인다. 들어가기 전에 창가를 돌며 살펴라');
  });
}
// 살피기(Tab): 가까운 건물의 1층 평면(방 이름)을 흐리게 겹쳐 보인다
function drawPlansFaint(P, openB) {
  BLD.forEach((b, bi) => {
    if (bi === openB || !b.plan) return; const bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    if (Math.abs(P.x - (bx + bw / 2)) > bw / 2 + 520 || Math.abs(P.y - (by + bh / 2)) > bh / 2 + 420) return;
    ctx.globalAlpha = 0.42; ctx.drawImage(mapC, bx, by, bw, bh, bx, by, bw, bh); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(160,200,235,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); ctx.setLineDash([]);
    if (b.name) tag(bx + bw / 2, by - 12, b.name, '#a0c8eb');
  });
}
// 전봇대: 회색 콘크리트 기둥 + 노랑·검정 띠 + 완금(가로대)·애자 (+ 변압기)
function drawPole(o) {
  const x = o.x, y = o.y, top = y - o.top, lt = lightAt(x, y + 10);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 15, 10, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7d8088'; ctx.fillRect(x - 5, top, 10, y + 14 - top); ctx.fillStyle = '#a7aab2'; ctx.fillRect(x - 5, top, 3, y + 14 - top);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#1c1c20' : '#d8b636'; ctx.fillRect(x - 5, y + 8 - k * 6, 10, 6); }
  ctx.fillStyle = '#55585f'; ctx.fillRect(x - 20, top + 6, 40, 5); ctx.fillStyle = '#d9dde4'; for (const k of [-16, 0, 16]) ctx.fillRect(x + k - 2, top + 1, 4, 6);
  if ((o.tx + o.ty) % 2 === 0) { ctx.fillStyle = '#8e939c'; ctx.fillRect(x + 5, top + 15, 11, 17); ctx.fillStyle = '#62666e'; ctx.fillRect(x + 5, top + 15, 11, 3); }
  if (!tactical) { ctx.fillStyle = `rgba(4,8,22,${0.62 * (1 - clamp(lt * 1.3, 0, 1))})`; ctx.fillRect(x - 21, top, 42, y + 16 - top); }
}
function drawWires() {
  for (const w of S.wires) {
    const cx = (w.a.dx + w.b.dx) / 2, cy = (w.a.dy + w.b.dy) / 2 + w.sag * 2;
    for (const [off, col, lw] of [[6, '#101218', 2], [0, '#14161c', 3], [-1.5, 'rgba(176,186,206,.45)', 1]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(w.a.dx, w.a.dy + off); ctx.quadraticCurveTo(cx, cy + off * 1.4, w.b.dx, w.b.dy + off); ctx.stroke(); }
    for (const n of [w.a, w.b]) if (n.roof) { ctx.fillStyle = '#2e3138'; ctx.fillRect(n.dx - 5, n.dy - 5, 10, 10); ctx.fillStyle = '#9aa0aa'; ctx.fillRect(n.dx - 2, n.dy - 2, 4, 4); }
  }
}
// 건물 옥상 덮개 (안에 들어가 있는 건물만 열어 보인다)
// 판자 다리: 옥상과 옥상 사이에 걸친 널빤지 (위를 걸을 수 있고, 아래 골목은 그대로 지나다닌다)
function drawPlanks() {
  for (const [x0, y0, x1, y1] of STAGE.planks || []) {
    const ew = (x1 - x0) >= (y1 - y0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (BI[y * MW + x] >= 0) continue; const px = x * TILE, py = y * TILE;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px + 6, py + 14, TILE, TILE - 6);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#7a5a3a' : '#8a6744'; if (ew) ctx.fillRect(px + k * 8, py + 6, 7, TILE - 12); else ctx.fillRect(px + 6, py + k * 8, TILE - 12, 7); }
      ctx.fillStyle = '#3a2a1a'; if (ew) { ctx.fillRect(px, py + 4, TILE, 3); ctx.fillRect(px, py + TILE - 7, TILE, 3); } else { ctx.fillRect(px + 4, py, 3, TILE); ctx.fillRect(px + TILE - 7, py, 3, TILE); }
    }
  }
}
function drawRoofs(openB) {
  const roof = STAGE.roof || ['#444a55', '#545b68'];
  BLD.forEach((b, i) => {
    if (i === openB) {
      ctx.strokeStyle = 'rgba(242,196,107,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.strokeRect(b.x0 * TILE + 1, b.y0 * TILE + 1, (b.x1 - b.x0 + 1) * TILE - 2, (b.y1 - b.y0 + 1) * TILE - 2); ctx.setLineDash([]);
      if (CITY && !flOf(S.player)) drawFacadeExtras(b, true);
      return;
    }
    const x = b.x0 * TILE, y = b.y0 * TILE, w = (b.x1 - b.x0 + 1) * TILE, h = b.roofC.rh;
    if (b.kit && drawKitBuilding(b)) {
      drawFacadeExtras(b, false, true);
      ctx.fillStyle = 'rgba(232,227,214,.55)'; ctx.font = '700 12px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'left'; ctx.fillText(b.h + 'F', x + 6, y + 14);
      return;
    }
    const sh = b.h * 6;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + sh, y + sh, w, h);
    if (b.facade) { drawFacade(b); if (CITY) drawFacadeExtras(b); }
    ctx.drawImage(b.roofC, x, y);
    if (b.h >= 2 && !b.roofC.giwa && !b.roofC.flat) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); }
    ctx.fillStyle = NEONY() ? 'rgba(26,8,56,.4)' : 'rgba(4,8,22,.5)'; ctx.fillRect(x, y, w, h + (b.roofC.giwa && b.facade ? 20 : 0));
    if (NEONY()) { ctx.strokeStyle = 'rgba(255,46,136,.85)'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h + (b.facade ? b.fh * TILE : 0) - 3); if (b.facade) { ctx.strokeStyle = 'rgba(46,242,255,.8)'; ctx.beginPath(); ctx.moveTo(x, (b.y1 + 1) * TILE - 1); ctx.lineTo(x + w, (b.y1 + 1) * TILE - 1); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(232,227,214,.55)'; ctx.font = '700 12px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(b.h + 'F', x + 6, y + 14);
    if (b.h >= 3 && !b.roofC.giwa && !b.roofC.flat) { ctx.strokeStyle = 'rgba(232,227,214,.18)'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, w - 16, h - 16); }
  });
  const onFacade = (tx, ty) => { const b = bldAt(tx, ty); return b >= 0 && BLD[b].facade && ty >= BLD[b].y1 - BLD[b].fh + 1; };
  for (const w of S.windows) { const b = bldAt(w.tx, w.ty); if (b >= 0 && b !== openB && !onFacade(w.tx, w.ty)) { if (CITY && BLD[b].kit) drawWindowEdge(w, BLD[b]); else drawWindow(w, CITY ? 0.5 : 0.9); } }
  for (const d of S.doors) { const b = bldAt(d.tx, d.ty); if (b >= 0 && b !== openB && !onFacade(d.tx, d.ty) && !BLD[b].plan) drawDoor(d, true); }
  for (const l of S.ladders) if (l.kind === 'pipe' && !l.gas) drawPipe(l);
  for (const l of S.ladders) if (l.kind === 'chimney' && bldAt(l.tx, l.ty) !== openB) drawChimney(l);
  for (const v of S.vents) if (v.roof && bldAt(v.tx, v.ty) !== openB) drawGrate(v, 1);
  drawTrapsRoof();
}
// 가스관과 2층 베란다 (정면 벽 위에 그린다)
function drawFacadeExtras(b, flat, kit) {
  if (b.fuse != null) { const fb = (S.bfuses || []).find(f => f.b === BLD.indexOf(b)); const fx = b.fuse * TILE + 12, fy = (b.y1 + 1) * TILE - (flat ? 12 : 34);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(fx + 3, fy + 3, 24, 22); ctx.fillStyle = '#8d939c'; ctx.fillRect(fx, fy, 24, 22); ctx.strokeStyle = '#4a4f58'; ctx.lineWidth = 2; ctx.strokeRect(fx + 1, fy + 1, 22, 20);
    ctx.fillStyle = fb && fb.cut ? '#e8473c' : '#e2c25a'; ctx.fillRect(fx + 9, fy + 6, 6, 9); }
  if (flat) {  // 안이 열려 보일 때(평면): 벽 바깥에 난간·배관 자리만 표시
    for (const tx of b.gas || []) {  // 위에서 본 가스관: 벽 바깥에 붙은 노란 관 단면 + 고정쇠 + 계량기 함
      const px = tx * TILE + (tx === b.x0 ? 9 : tx === b.x1 ? TILE - 9 : TILE / 2), py = (b.y1 + 1) * TILE + 5, ins = px < (b.x0 + b.x1 + 1) * TILE / 2 ? 1 : -1;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(px + 2, py + 3, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5c6068'; ctx.fillRect(px - 8, py - 6, 16, 4);
      ctx.fillStyle = '#9ea3ab'; ctx.fillRect(px + ins * 9 - (ins < 0 ? 14 : 0), py - 6, 14, 9); ctx.fillStyle = '#2a2d33'; ctx.fillRect(px + ins * 9 - (ins < 0 ? 14 : 0) + 3, py - 3, 8, 3);
      const g = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, 7); g.addColorStop(0, '#ffe58a'); g.addColorStop(0.6, '#d6ad2c'); g.addColorStop(1, '#7a5e12');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a2e0a'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const tx of b.balc || []) { const x0 = tx * TILE - 18, w = TILE + 36, y = (b.y1 + 1) * TILE - 2; ctx.fillStyle = '#6b6f78'; ctx.fillRect(x0, y, w, 7); ctx.fillStyle = '#2b2f37'; for (let x = x0 + 2; x < x0 + w - 1; x += 7) ctx.fillRect(x, y + 1, 2, 5); ctx.fillStyle = 'rgba(242,196,107,.8)'; ctx.font = '700 12px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('2F 베란다', tx * TILE + TILE / 2, y + 17); }
    return;
  }
  const top = (b.y1 - b.fh + 1) * TILE - 4, bot = (b.y1 + 1) * TILE + 6;
  if (b.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${b.tint})`; ctx.fillRect(b.x0 * TILE, top + 4, (b.x1 - b.x0 + 1) * TILE, bot - top - 10); ctx.globalCompositeOperation = 'source-over'; }
  if (b.plate && b.kind !== 'shop' && b.fh >= 2) {  // 건물 이름판 (꼭대기 층 벽)
    ctx.font = '700 15px Galmuri, "IBM Plex Sans KR", sans-serif'; const tw = ctx.measureText(b.plate).width + 18, cx = (b.x0 + b.x1 + 1) * TILE / 2, py = top + 8;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(cx - tw / 2 + 3, py + 3, tw, 22);
    ctx.fillStyle = b.church ? '#5a1418' : '#23303a'; ctx.fillRect(cx - tw / 2, py, tw, 22);
    ctx.strokeStyle = b.church ? '#ff6a6a' : '#c9a646'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - tw / 2 + 1, py + 1, tw - 2, 20);
    ctx.fillStyle = b.church ? '#ffd0d0' : '#f0d890'; ctx.textAlign = 'center'; ctx.fillText(b.plate, cx, py + 16);
  }
  if (!kit) for (const tx of b.gas || []) {  // 키트 건물은 3D로 구운 배관이 그림에 들어 있다
    const px = tx * TILE + (tx === b.x0 ? 9 : tx === b.x1 ? TILE - 9 : TILE / 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(px - 1, top, 7, bot - top);
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(px - 3, top, 6, bot - top);
    ctx.fillStyle = '#f0d070'; ctx.fillRect(px - 2, top, 2, bot - top);
    ctx.fillStyle = '#5a5e66'; for (let y = top + 10; y < bot - 6; y += 22) ctx.fillRect(px - 5, y, 10, 3);
    ctx.fillStyle = '#7d828c'; ctx.fillRect(px - 7, bot - 30, 14, 12); ctx.fillStyle = '#2a2d33'; ctx.fillRect(px - 4, bot - 27, 8, 5);  // 계량기
  }
  if (!kit) for (const tx of b.balc || []) {
    const yy = (b.y1 - 1) * TILE, x0 = tx * TILE - 18, w = TILE + 36;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x0 + 3, yy + TILE - 2, w, 6);
    ctx.fillStyle = '#6b6f78'; ctx.fillRect(x0, yy + TILE - 8, w, 8);
    ctx.fillStyle = '#8a8f98'; ctx.fillRect(x0, yy + TILE - 8, w, 2);
    ctx.fillStyle = '#2b2f37'; ctx.fillRect(x0, yy + 16, w, 4);
    for (let x = x0 + 2; x < x0 + w - 1; x += 7) ctx.fillRect(x, yy + 18, 2, TILE - 26);
    ctx.fillStyle = '#4a7a46'; ctx.beginPath(); ctx.arc(x0 + 10, yy + 14, 7, 0, TAU); ctx.fill();  // 난간 화분
    ctx.fillStyle = '#a8a39a'; ctx.fillRect(x0 + w - 22, yy + 12, 14, 4);  // 빨래
  }
}
// 키트 굽기용: 건물마다 정면 줄(층별)의 창·문·기둥 자리
// ---- 옥상 살림: 옥탑방·물탱크·계단실(막힘) + 간판·채광창·텃밭·빨랫줄·태양광판·실외기·환기관(그림만)
// 배치는 여기서 정하고 kitSpec으로 굽기에 넘긴다. 구운 kit.json에 같은 목록이 들어 있으면 막힘 칸이 된다
const hN = (...a) => { let h = 2166136261 >>> 0; for (const v of a) { h = Math.imul(h ^ (v & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ ((v >>> 16) & 0xffff), 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; return (h ^ (h >>> 15)) >>> 0; };
const ROOF_SOLID = { okt: 1, tank: 1, stair: 1 };
function roofProps(b, bi) {
  if (!CITY || !b.facade || b.fh !== b.h || b.piloti) return [];
  const x0 = b.x0, x1 = b.x1, ry0 = b.y0, ry1 = b.y1 - b.fh, w = x1 - x0 + 1, dr = ry1 - ry0 + 1, L = lvAt(x0, ry0);
  if (dr < 2 || L <= 0) return [];
  for (let y = ry0; y <= ry1; y++) for (let x = x0; x <= x1; x++) if (rLv(x, y) !== L || bldAt(x, y) !== bi) return [];
  const house = b.kind === 'house', shop = b.kind === 'shop', glass = !!b.glass, mansard = house && dr >= 2, fr = mansard ? 1 : 0, uy1 = ry1 - fr, hs = hN(x0, ry0, w, b.h);
  const K = (x, y) => x + ',' + y, hard = new Set(), soft = new Set();
  const mark = (x, y) => { if (x >= x0 && x <= x1 && y >= ry0 && y <= ry1) hard.add(K(x, y)); };
  // 옥상 계단실: 건물 안 계단('Y') 바로 위에 선다. 문은 걸을 수 있는 옥상 칸 쪽(남·서·동·북 순)으로, 오르내리는 자리는 문 앞
  const shs = [];
  (S.ladders || []).forEach(l => {
    if (l.kind !== 'stair' || l.tz !== L || bldAt(l.tx, l.ty) !== bi || rLv(l.tx, l.ty) !== L) return;
    const okc = (x, y) => x >= x0 && x <= x1 && y >= ry0 && y <= ry1 && rLv(x, y) === L;
    const dirs = [['S', 0, 1], ['W', -1, 0], ['E', 1, 0], ['N', 0, -1]], d = dirs.find(([, dx, dy]) => okc(l.tx + dx, l.ty + dy)); if (!d) return;
    const [dn, ddx, ddy] = d, side = ddy ? [[1, 0], [-1, 0]] : [[0, -1], [0, 1]];
    const ex = side.map(([sx, sy]) => [l.tx + sx, l.ty + sy]).find(([x, y]) => okc(x, y) && !(x === l.tx + ddx && y === l.ty + ddy));
    shs.push({ l, dn, door: [l.tx + ddx, l.ty + ddy], cells: ex ? [[l.tx, l.ty], ex] : [[l.tx, l.ty]] });
  });
  const shSet = new Set(shs.map(h => h.l));
  (S.ladders || []).forEach(l => { if (shSet.has(l)) { const h = shs.find(q => q.l === l); mark(h.door[0], h.door[1]); return; } if (l.tz === L || l.tz > 0) mark(l.tx, l.ty); if (l.bz > 0) mark(l.bx, l.by); });
  (S.vents || []).forEach(v => { if (v.roof) mark(v.tx, v.ty); });
  (STAGE.planks || []).forEach(([ax, ay, bx, by]) => { for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) mark(x, y); mark(ax - 1, ay); mark(ax + 1, ay); mark(bx - 1, by); mark(bx + 1, by); mark(ax, ay - 1); mark(ax, ay + 1); mark(bx, by - 1); mark(bx, by + 1); });
  (S.traps || []).forEach(t => { [t.at, t.sw].forEach(p => p && mark(p[0], p[1])); });
  (S.wires || []).forEach(wi => [wi.a, wi.b].forEach(n => n && !n.pole && mark(n.tx, n.ty)));
  [STAGE.start, STAGE.exit].forEach(p => p && mark(Math.floor(p[0]), Math.floor(p[1])));
  const roofSol = (x, y) => rLv(x, y) !== L;
  (S.guards || []).forEach(g => {
    if ((g.z || 0) !== L || bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)) !== bi) return;
    const pts = (g.route || []).map(p => [Math.floor(p.x / TILE), Math.floor(p.y / TILE)]); pts.push([Math.floor(g.x / TILE), Math.floor(g.y / TILE)]);
    pts.forEach(p => mark(p[0], p[1]));
    for (let i = 0; i + 1 < pts.length; i++) astar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], roofSol).forEach(p => mark(Math.floor(p.x / TILE), Math.floor(p.y / TILE)));
    if (pts.length > 2) astar(pts[pts.length - 2][0], pts[pts.length - 2][1], pts[0][0], pts[0][1], roofSol).forEach(p => mark(Math.floor(p.x / TILE), Math.floor(p.y / TILE)));
  });
  hard.forEach(k => { const [x, y] = k.split(',').map(Number); for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) soft.add(K(x + ox, y + oy)); });
  const occ = new Set(), sol = new Set(), out = [];
  const connected = () => {  // 막힘을 넣어도 옥상이 한 덩어리로 이어져 있는가
    let st = null, n = 0; for (let y = ry0; y <= ry1; y++) for (let x = x0; x <= x1; x++) if (!sol.has(K(x, y))) { n++; if (!st) st = [x, y]; }
    const seen = new Set([K(...st)]), q = [st];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = K(nx, ny); if (nx < x0 || nx > x1 || ny < ry0 || ny > ry1 || seen.has(k) || sol.has(k)) continue; seen.add(k); q.push([nx, ny]); } }
    return seen.size === n;
  };
  const take = (cw, cd, cands, solid) => {
    for (const [cx, cy] of cands) {
      if (cx < x0 || cx + cw - 1 > x1 || cy < ry0 || cy + cd - 1 > uy1) continue;
      if (solid && (cx < x0 + 1 || cx + cw - 1 > x1 - 1 || cy < ry0 + 1 || cy + cd - 1 > ry1 - 1)) continue;
      const cells = []; for (let a = cx; a < cx + cw; a++) for (let c = cy; c < cy + cd; c++) cells.push(K(a, c));
      if (cells.some(k => occ.has(k) || hard.has(k) || (solid && soft.has(k)))) continue;
      if (solid) { cells.forEach(k => sol.add(k)); if (!connected()) { cells.forEach(k => sol.delete(k)); continue; } }
      cells.forEach(k => occ.add(k)); return [cx, cy];
    }
    return null;
  };
  const mix = (seed, rows) => { const r = []; for (const y of rows || (function* () { for (let y = ry0; y <= uy1; y++) yield y; })()) for (let x = x0; x <= x1; x++) r.push([x, y]); return r.sort((p, q) => hN(p[0], p[1], seed, hs) - hN(q[0], q[1], seed, hs)); };
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  for (const h of shs) {  // 계단실 = 옥탑방 (막힘). 옥상이 끊기면 한 칸짜리로, 그래도 끊기면 놓지 않는다
    for (const cells of [h.cells, h.cells.slice(0, 1)]) {
      const ks = cells.map(([x, y]) => K(x, y)); if (ks.some(k => occ.has(k))) continue;
      ks.forEach(k => sol.add(k)); if (!connected()) { ks.forEach(k => sol.delete(k)); continue; }
      ks.forEach(k => occ.add(k)); occ.add(K(h.door[0], h.door[1]));
      out.push({ t: 'sh', cells, door: h.door, dir: h.dn, sx: h.l.tx, sy: h.l.ty, lit: hN(h.l.tx, h.l.ty, 5) % 3 !== 0 }); break;
    }
  }
  const okt = out.some(p => p.t === 'sh');
  if (!house && !glass && w >= 6 && hs % 3) { const s = take(4, 1, mix(1, [ry1]), false); if (s) out.push({ t: 'sign', x: s[0], y: s[1] }); }
  if (b.h >= 2 && hs % 3 === 0 && w >= 4 && dr - fr >= 3) { const s = take(1, 1, mix(3), true); if (s) out.push({ t: 'tank', x: s[0], y: s[1] }); }
  if (w >= 8 && dr - fr >= 4 && hN(hs, 2) % 2) { const s = take(3, 2, mix(4), false); if (s) out.push({ t: 'solar', x: s[0], y: s[1] }); }
  if (!glass && dr - fr >= 3 && w >= 5 && hN(hs, 3) % 3) { const s = take(4, 1, mix(5), false); if (s) out.push({ t: 'line', x: s[0], y: s[1], m: hs & 15 }); }
  if (!glass) for (let k = 0; k < Math.max(1, w >> 2); k++) { const s = take(1, 1, mix(10 + k, range(ry0 + 2, uy1)), false); if (s) out.push({ t: 'sky', x: s[0], y: s[1] }); }
  if (!glass && !mansard && w >= 4) { const s = take(4, 1, mix(6, [ry1]), false); if (s) out.push({ t: 'plant', x: s[0], y: s[1] }); }
  for (let k = 0; k < Math.max(1, (w / 3) | 0); k++) { const s = take(1, 1, mix(20 + k), false); if (s) out.push({ t: 'ac', x: s[0], y: s[1], r: (hs >> k) & 3 }); }
  for (let k = 0; k < Math.max(1, w >> 2); k++) { const s = take(1, 1, mix(30 + k), false); if (s) out.push({ t: 'vent', x: s[0], y: s[1] }); }
  return out;
}
// 구운 kit.json의 옥상 살림 목록 → 옥상 막힘 칸
let ROB = null;
const robAt = (tx, ty) => !!(ROB && inMap(tx, ty) && ROB[ty * MW + tx]);
function robBuild() {
  ROB = new Uint8Array(MW * MH); let n = 0;
  BLD.forEach(b => (b.kitProps || []).forEach(p => {
    if (p.t === 'sh') {
      p.cells.forEach(([x, y]) => { if (inMap(x, y)) { ROB[y * MW + x] = 1; n++; } });
      const l = S && S.ladders && S.ladders.find(q => q.kind === 'stair' && q.tx === p.sx && q.ty === p.sy);
      if (l) { l.rx = tc(p.door[0]); l.ry = tc(p.door[1]); l.shDir = p.dir; }
      return;
    }
    if (!ROB_SOLID_DIM[p.t]) return; const [cw, cd] = ROB_SOLID_DIM[p.t]; for (let y = p.y; y < p.y + cd; y++) for (let x = p.x; x < p.x + cw; x++) if (inMap(x, y)) { ROB[y * MW + x] = 1; n++; } }));
  if (!n) ROB = null;
  if (S && S.hides) S.hides = S.hides.filter(h => h.type !== 'okt');
}
const ROB_SOLID_DIM = { tank: [1, 1] };
function kitSpec() {
  return { id: STAGE.id, W: MW, H: MH, furn: [...new Set(FURN.map(furnKey))], b: BLD.map((b, i) => ({ i, props: roofProps(b, i), x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, h: b.h, fh: b.fh || 0, facade: !!b.facade, kind: b.kind || '', glass: !!b.glass, piloti: !!b.piloti, alt: b.alt || 0, balc: b.balc || [], gas: b.gas || [], name: b.name || '',
    front: Array.from({ length: b.fh || 0 }, (_, f) => { const g = f ? GF[f] : G0, row = []; for (let x = b.x0; x <= b.x1; x++) { const ch = g && g[b.y1] ? g[b.y1][x] : null; row.push(!f && S.doors.some(d => d.tx === x && d.ty === b.y1) ? 'D' : ch || '?'); } return row; }) })) };
}
// 3/4 정면벽: 건물 남쪽 벽 줄을 정면에서 본 벽으로 그린다 (실제 문·창문 그림)
function drawFacade(b) {
  const y = b.y1 * TILE;
  if (!b.fl || S.t - b.flT > 0.3) { b.flT = S.t; b.fl = []; for (let tx = b.x0; tx <= b.x1; tx++) b.fl.push(lightAt(tc(tx), y + TILE + 14)); }
  if (CITY && b.kind === 'shop') return drawShopFacade(b);
  const wn = n => (CITY && b.alt ? n + 'B' : n);
  const glow = (x, yy, tx, r) => {  // 도시: 불 켜진 창 몇 개 (촛불·등잔빛)
    if (!CITY) return; const h = ((tx * 92821) ^ ((b.y1 - r) * 68917) ^ (b.x0 * 31)) >>> 0;
    if (h % 5) return; const fl = 0.85 + 0.15 * Math.sin(S.t * 3 + tx);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,80,${0.42 * fl})`; ctx.fillRect(x + 12, yy + 10, 24, 26); ctx.globalCompositeOperation = 'source-over';
  };
  // 위층 벽: 한 칸 걸러 창, 층 사이에 작은 처마(도시는 띠)
  for (let r = 1; r < b.fh; r++) {
    const yy = (b.y1 - r) * TILE;
    for (let tx = b.x0; tx <= b.x1; tx++) {
      const x = tx * TILE;
      blit(ctx, wn(tx === b.x0 ? 'fWallL' : tx === b.x1 ? 'fWallR' : 'fWall'), x, yy, TILE, TILE);
      const win = tx > b.x0 && tx < b.x1 && (tx - b.x0) % 2 === 1;
      if (win && CITY) blit(ctx, b.alt ? 'fWinB' : 'fWin', x, yy, TILE, TILE);
      else if (win) { ctx.fillStyle = '#1d2733'; ctx.fillRect(x + 7, yy + 6, 34, 30); blit(ctx, 'fWin', x + 9, yy + 8, 30, 26); ctx.strokeStyle = '#8fc3e6'; ctx.lineWidth = 2; ctx.strokeRect(x + 7, yy + 6, 34, 30); if (NEO) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = (tx + b.y1) % 3 ? 'rgba(46,242,255,.32)' : 'rgba(255,46,136,.32)'; ctx.fillRect(x + 7, yy + 6, 34, 30); ctx.globalCompositeOperation = 'source-over'; } }
      const l = b.fl[tx - b.x0]; ctx.fillStyle = `rgba(4,8,22,${0.68 * (1 - clamp(l, 0, 1)) + 0.06 * r})`; ctx.fillRect(x, yy, TILE, TILE);
      if (win) glow(x, yy, tx, r);
    }
    const by = yy + TILE;  // 층 사이 처마 띠
    if (CITY) { for (let tx = b.x0; tx <= b.x1; tx++) blit(ctx, wn('fBand'), tx * TILE, by - 13, TILE, 26, 0, 3, 16, 9); ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(b.x0 * TILE, by - 13, (b.x1 - b.x0 + 1) * TILE, 26); }
    else if (JOSEON && F.gw_eave) { const e = F.gw_eave; for (let x = b.x0 * TILE; x < (b.x1 + 1) * TILE; x += 32) ctx.drawImage(atlas, e[0], e[1], 16, 20, x, by - 22, 32, 30); ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(b.x0 * TILE, by - 14, (b.x1 - b.x0 + 1) * TILE, 22); }
    else { ctx.fillStyle = '#2a1a14'; ctx.fillRect(b.x0 * TILE, by - 5, (b.x1 - b.x0 + 1) * TILE, 9); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(b.x0 * TILE, by + 4, (b.x1 - b.x0 + 1) * TILE, 5); }
  }
  for (let tx = b.x0; tx <= b.x1; tx++) {
    const x = tx * TILE, ch = G[b.y1][tx];
    const door = S.doors.find(d => d.tx === tx && d.ty === b.y1);
    if (b.piloti) {  // 필로티: 어두운 주차장 입구 + 콘크리트 기둥 + 위층 바닥판
      ctx.fillStyle = '#0b0d12'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(70,74,84,.5)'; ctx.fillRect(x, y + 6, TILE, 4);
      if (ch === 'I') { ctx.fillStyle = '#8c8f97'; ctx.fillRect(x + 14, y, 20, TILE); ctx.fillStyle = '#b3b6bd'; ctx.fillRect(x + 14, y, 5, TILE); ctx.fillStyle = '#5d6068'; ctx.fillRect(x + 29, y, 5, TILE); }
      ctx.fillStyle = '#9a9ca3'; ctx.fillRect(x, y, TILE, 6);
    } else if (door) { blit(ctx, wn('fWall'), x, y, TILE, TILE); blit(ctx, door.locked ? 'fDoor' : 'fDoorOpen', x, y, TILE, TILE); if (door.locked && door.keyLock) { ctx.fillStyle = keyCol(door.keyLock); ctx.fillRect(x + 19, y + 22, 10, 10); } }
    else {
      blit(ctx, wn(tx === b.x0 ? 'fWallL' : tx === b.x1 ? 'fWallR' : (tx * 7 + b.y1) % 5 === 0 ? 'fWall2' : 'fWall'), x, y, TILE, TILE);
      if (ch === 'N' && CITY) blit(ctx, b.alt ? 'fWinB' : 'fWin', x, y, TILE, TILE);
      else if (ch === 'N') { ctx.fillStyle = '#1d2733'; ctx.fillRect(x + 5, y + 4, 38, 38); blit(ctx, 'fWin', x + 7, y + 6, 34, 34); if (NEO) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = (tx + b.y1) % 3 ? 'rgba(46,242,255,.32)' : 'rgba(255,46,136,.32)'; ctx.fillRect(x + 5, y + 4, 38, 38); ctx.globalCompositeOperation = 'source-over'; } ctx.strokeStyle = '#8fc3e6'; ctx.lineWidth = 2; ctx.strokeRect(x + 5, y + 4, 38, 38); ctx.fillStyle = '#e8eef2'; ctx.fillRect(x + 3, y + 42, 42, 3); }
      if (ch === 'S') { ctx.strokeStyle = 'rgba(40,24,14,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 22, y + 6); ctx.lineTo(x + 17, y + 20); ctx.lineTo(x + 27, y + 30); ctx.lineTo(x + 21, y + 44); ctx.stroke(); }
    }
    const l = b.fl[tx - b.x0]; ctx.fillStyle = `rgba(4,8,22,${0.62 * (1 - clamp(l, 0, 1))})`; ctx.fillRect(x, y, TILE, TILE);
  }
  const top = (b.y1 - b.fh + 1) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(b.x0 * TILE, top, (b.x1 - b.x0 + 1) * TILE, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.strokeRect(b.x0 * TILE + 1, top, (b.x1 - b.x0 + 1) * TILE - 2, b.fh * TILE);
}
// 상가 건물 정면: 회색 콘크리트 + 층마다 띠창 + 간판 (전쟁 뒤라 몇 개는 꺼지거나 글자가 빠졌다)
// 네온 간판: 어둠 위에 다시 그리고 번지는 빛을 더한다 (깜빡이는 것도 있다) + 빌딩 세로 간판
function drawNeonSigns() {
  const t = S.t;
  BLD.forEach((b, i) => {
    if (!b.facade || b.kind !== 'shop' || i === S.openB) return;
    const list = (b.signRects || []).slice();
    if (b.fh >= 3) { const txt = (b.plate || b.name || '').replace(/\s/g, ''); if (txt) { const vx = b.x1 * TILE + 8, vy = (b.y1 - b.fh + 1) * TILE + 10, vh = Math.min(txt.length * 22 + 14, (b.fh - 1) * TILE - 10); list.push({ x: vx, y: vy, w: 30, h: vh, c: [['#ff3ca8', '#ffe0f4'], ['#3ce0ff', '#e0fbff'], ['#b45aff', '#f2e0ff']][i % 3], txt, on: true, vert: true, k: 9 }); } }
    for (const r of list) {
      const flick = r.on ? (((i * 7 + r.k * 13 + Math.floor(t * 9)) % 53 === 0) ? 0.25 : 1) : (Math.sin(t * 23 + i) > 0.6 ? 0.6 : 0.12);
      const rgb = hexRgb(r.c[0]);
      ctx.globalCompositeOperation = 'lighter';
      for (const [pad, a] of [[22, 0.08], [12, 0.15], [4, 0.28]]) { ctx.fillStyle = `rgba(${rgb},${a * flick})`; ctx.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 + 0.65 * flick; ctx.fillStyle = '#0c0a12'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = r.c[0]; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.fillStyle = r.c[1]; ctx.font = '700 15px Galmuri, "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (r.vert) { [...r.txt].forEach((ch, k) => { if (14 + k * 22 < r.h) ctx.fillText(ch, r.x + r.w / 2, r.y + 14 + k * 22); }); } else ctx.fillText(r.txt, r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    }
  });
}
function drawShopFacade(b) {
  const x0 = b.x0 * TILE, wAll = (b.x1 - b.x0 + 1) * TILE, hs = ((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0;
  b.signRects = []; const club = (b.floorsUse || []).includes('club');
  const COLS = [['#c8402e', '#fff4d8'], ['#2a5aa8', '#ffffff'], ['#f2c02a', '#2a2018'], ['#2a8a5a', '#ffffff'], ['#6a2a8a', '#ffe8ff'], ['#e86a2a', '#ffffff']];
  for (let r = b.fh - 1; r >= 0; r--) {
    const yy = (b.y1 - r) * TILE;
    ctx.fillStyle = club ? '#16121c' : '#80858f'; ctx.fillRect(x0, yy, wAll, TILE); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x0, yy, wAll, 3);
    if (r === 0) {
      // 1층: 유리 진열창 + 문 + 차양
      ctx.fillStyle = '#18222c'; ctx.fillRect(x0 + 6, yy + 12, wAll - 12, TILE - 12);
      for (let tx = b.x0; tx <= b.x1; tx++) { ctx.fillStyle = '#9aa0aa'; ctx.fillRect(tx * TILE, yy + 12, 3, TILE - 12); }
      for (const d of S.doors) if (d.ty === b.y1 && d.tx >= b.x0 && d.tx <= b.x1) { const dx = d.tx * TILE; ctx.fillStyle = d.locked ? '#3a4656' : '#05070a'; ctx.fillRect(dx + 6, yy + 14, 36, TILE - 14); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(dx + 22, yy + 26, 4, 10); if (d.locked && d.keyLock) { ctx.fillStyle = keyCol(d.keyLock); ctx.fillRect(dx + 18, yy + 34, 12, 9); } }
      if ((hs + r) % 4 !== 0 && S.lightsOn) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,230,255,.10)'; ctx.fillRect(x0 + 6, yy + 12, wAll - 12, TILE - 12); ctx.globalCompositeOperation = 'source-over'; }
      for (let k = 0; k * 16 < wAll; k++) { ctx.fillStyle = k % 2 ? '#e8e4dc' : COLS[hs % COLS.length][0]; ctx.fillRect(x0 + k * 16, yy, 16, 12); }
    } else {
      if (b.glass) {  // 유리 외벽(커튼월): 칸마다 유리, 몇 칸은 사무실 불이 켜져 있다
        for (let tx = b.x0; tx <= b.x1; tx++) { const px = tx * TILE, hh = ((tx * 92821) ^ (r * 68917) ^ hs) >>> 0;
          const g2 = ctx.createLinearGradient(px, yy, px + TILE, yy + TILE); g2.addColorStop(0, '#1c3a52'); g2.addColorStop(1, '#0e1c2c'); ctx.fillStyle = g2; ctx.fillRect(px, yy + 2, TILE, TILE - 2);
          if (hh % 5 === 0 && S.lightsOn) { ctx.fillStyle = hh % 2 ? 'rgba(255,236,190,.55)' : 'rgba(210,235,255,.5)'; ctx.fillRect(px + 3, yy + 6, TILE - 6, TILE - 12); }
          ctx.fillStyle = 'rgba(160,210,240,.16)'; ctx.beginPath(); ctx.moveTo(px + 6, yy + TILE - 4); ctx.lineTo(px + 20, yy + 4); ctx.lineTo(px + 28, yy + 4); ctx.lineTo(px + 14, yy + TILE - 4); ctx.fill();
          ctx.fillStyle = '#8a929e'; ctx.fillRect(px, yy, TILE, 3); ctx.fillRect(px, yy, 2, TILE); }
      } else
      for (let tx = b.x0 + 1; tx < b.x1; tx++) { const px = tx * TILE; ctx.fillStyle = '#1e2a36'; ctx.fillRect(px, yy + 16, TILE, 26); ctx.fillStyle = 'rgba(160,200,230,.18)'; ctx.fillRect(px + 4, yy + 18, 10, 22); ctx.fillStyle = '#5d626c'; ctx.fillRect(px, yy + 16, 2, 26); }
    }
    const l = b.fl[Math.floor((b.x1 - b.x0) / 2)]; ctx.fillStyle = `rgba(4,8,22,${0.6 * (1 - clamp(l, 0, 1)) + 0.05 * r})`; ctx.fillRect(x0, yy, wAll, TILE);
  }
  drawShopSigns(b);
  const top = (b.y1 - b.fh + 1) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x0, top, wAll, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, top, wAll - 2, b.fh * TILE);
}
// 상가 간판 (층마다 하나, 몇 개는 꺼져 있다) — 네온 빛은 drawNeonSigns 가 어둠 위에 더한다
function drawShopSigns(b) {
  const x0 = b.x0 * TILE, wAll = (b.x1 - b.x0 + 1) * TILE, hs = ((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0;
  b.signRects = []; const club = (b.floorsUse || []).includes('club');
  const COLS = [['#c8402e', '#fff4d8'], ['#2a5aa8', '#ffffff'], ['#f2c02a', '#2a2018'], ['#2a8a5a', '#ffffff'], ['#6a2a8a', '#ffe8ff'], ['#e86a2a', '#ffffff']];
  for (let r = b.fh - 1; r >= 0; r--) {
    const yy = (b.y1 - r) * TILE;
    // 간판
    const txt = (b.signs || [])[r]; if (!txt) continue;
    const c = COLS[(hs + r * 3) % COLS.length], on = ((hs >> (r + 2)) % 3) !== 0;
    const bw = Math.min(wAll - 24, Math.max(110, txt.length * 26 + 30)), bx = x0 + 12 + ((hs + r * 7) % Math.max(1, wAll - 24 - bw)), by = r === 0 ? yy - 22 : yy + 1;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(bx + 3, by + 3, bw, 20);
    ctx.fillStyle = c[0]; ctx.fillRect(bx, by, bw, 20); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(bx + 1, by + 1, bw - 2, 18);
    ctx.font = '700 15px Galmuri, "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = c[1]; ctx.fillText(txt, bx + bw / 2, by + 11); ctx.textBaseline = 'alphabetic'; b.signRects.push({ x: bx, y: by, w: bw, h: 20, c, txt, on: on || club, k: r });
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,.12)'; ctx.fillRect(bx, by, bw, 20); ctx.globalCompositeOperation = 'source-over'; }
    else { ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(bx, by, bw, 20); }
  }
}
// 굴뚝: 옥상 위 벽돌 기둥. 불이 타면 연기가 오른다
function drawChimney(l) {
  const x = l.ux, y = l.uy, lit = lampOn(l.lamp);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 13, y - 9, 30, 28);
  ctx.fillStyle = '#9a4a32'; ctx.fillRect(x - 16, y - 18, 30, 30);
  ctx.fillStyle = '#7a3624'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 16, y - 18 + i * 8, 30, 1.5);
  ctx.fillStyle = '#b8603f'; ctx.fillRect(x - 16, y - 18, 30, 4);
  ctx.fillStyle = '#120c0a'; ctx.fillRect(x - 9, y - 11, 16, 14);
  ctx.strokeStyle = '#2a1410'; ctx.lineWidth = 2; ctx.strokeRect(x - 16, y - 18, 30, 30);
  if (lit) { ctx.fillStyle = 'rgba(255,150,60,.55)'; ctx.fillRect(x - 7, y - 3, 12, 5); const t = S.t * 0.9; for (let i = 0; i < 4; i++) { const f = (t + i / 4) % 1; ctx.fillStyle = `rgba(200,200,205,${0.45 * (1 - f)})`; ctx.beginPath(); ctx.arc(x - 1 + Math.sin(f * 5 + i) * 6 + f * 10, y - 8 - f * 46, 5 + f * 9, 0, TAU); ctx.fill(); } }
}
// 환풍구 창살: 청록 테두리 + 가로 창살. 열려 있으면 검은 구멍
function drawGrate(v, alpha) {
  const x = v.x, y = v.y; ctx.globalAlpha = alpha;
  ctx.fillStyle = '#1a2a2e'; ctx.fillRect(x - 15, y - 15, 30, 30);
  if (v.open) { ctx.fillStyle = '#050708'; ctx.fillRect(x - 12, y - 12, 24, 24); ctx.strokeStyle = '#7fd6cc'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 15, 30, 30); ctx.fillStyle = '#5f8f8a'; ctx.fillRect(x + 15, y - 15, 6, 30); }
  else { ctx.fillStyle = '#6fa6a0'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 12, y - 11 + i * 5, 24, 2.5); ctx.strokeStyle = '#7fd6cc'; ctx.lineWidth = 2; ctx.strokeRect(x - 15, y - 15, 30, 30); }
  ctx.globalAlpha = 1;
}
function stripeFor(col) {
  if (stripePat[col]) return stripePat[col];
  const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d');
  x.strokeStyle = `rgba(${col},.55)`; x.lineWidth = 3; x.beginPath(); x.moveTo(-3, 15); x.lineTo(15, -3); x.moveTo(-3, 3); x.lineTo(3, -3); x.moveTo(9, 15); x.lineTo(15, 9); x.stroke();
  return (stripePat[col] = ctx.createPattern(c, 'repeat'));
}
// 순찰로: 바닥 점선 + 방향 화살표 + 멈추는 곳 / 고정 자경대원은 지키는 방향 표시
function drawRoutes(P) {
  const openB = (P.z === 0 && !P.jump) ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1;
  const hiddenPt = p => { const b = bldAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)); return b >= 0 && b !== openB && !(S.peek && S.peek.b === b) && !tactical; };
  const vf = (!P.z && !P.wire && !P.jump) ? flOf(P) : 0;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.civ || flOf(g) !== vf) continue;
    const col = g.target ? '232,71,60' : '200,214,235';
    if (g.routeLine) {
      ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.38})`; ctx.lineWidth = tactical ? 3 : 2.5; ctx.setLineDash([8, 7]);
      ctx.beginPath(); let pen = false;
      const pts = g.routeLine.concat([g.routeLine[0]]);
      for (const p of pts) { if (hiddenPt(p)) { pen = false; continue; } pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); pen = true; }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${col},${tactical ? 0.85 : 0.5})`;
      for (let i = 0; i < pts.length - 1; i += 4) {
        const a = pts[i], b = pts[i + 1]; if (!b || hiddenPt(a)) continue;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save(); ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      for (const p of g.routeLine) if (p.stop && !hiddenPt(p)) { ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.35})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.stroke(); }
    } else if (g.post != null && !hiddenPt(g.route[0])) {
      const p = g.route[0];
      ctx.fillStyle = `rgba(${col},${tactical ? 0.35 : 0.14})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, 60, g.post - 0.5, g.post + 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.35})`; ctx.lineWidth = 2; ctx.strokeRect(p.x - 9, p.y - 9, 18, 18);
    }
  }
}
// 창문: 하늘색 유리 + 흰 십자 창살
const winVert = w => (G[w.ty - 1] && G[w.ty - 1][w.tx] === '#') || (G[w.ty + 1] && G[w.ty + 1][w.tx] === '#');
// 창문 (평면도): 벽에 난 창틀 + 미닫이 유리 두 짝 + 창턱. 방 불이 켜져 있으면 유리가 따뜻하게 빛난다
function drawWindowOld(w, alpha) {
  const vert = winVert(w), ww = vert ? 18 : 40, hh = vert ? 40 : 18;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e8eef2'; if (vert) ctx.fillRect(w.x - ww / 2 - 6, w.y - hh / 2 - 3, 3, hh + 6); else ctx.fillRect(w.x - ww / 2 - 3, w.y + hh / 2 + 3, ww + 6, 3);
  ctx.fillStyle = '#1d2733'; ctx.fillRect(w.x - ww / 2 - 3, w.y - hh / 2 - 3, ww + 6, hh + 6);
  ctx.fillStyle = '#8fc3e6'; ctx.fillRect(w.x - ww / 2, w.y - hh / 2, ww, hh);
  ctx.fillStyle = '#eef6fb'; ctx.fillRect(w.x - 1.5, w.y - hh / 2, 3, hh); ctx.fillRect(w.x - ww / 2, w.y - 1.5, ww, 3);
  ctx.globalAlpha = 1;
}
function drawWindow(w, alpha) {
  if (!CITY) return drawWindowOld(w, alpha);
  const vert = winVert(w), L = 42, T = 14;
  const lit = lightAt(w.x, w.y) > 0.45;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(w.x, w.y); if (vert) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-L / 2 + 2, -T / 2 + 3, L, T);
  ctx.fillStyle = '#5d636d'; ctx.fillRect(-L / 2, -T / 2, L, T);                    // 창틀 (샤시)
  ctx.fillStyle = '#c3c8cf'; ctx.fillRect(-L / 2, -T / 2, L, 2); ctx.fillRect(-L / 2, T / 2 - 2, L, 2);
  const g = ctx.createLinearGradient(-L / 2, -T / 2, L / 2, T / 2);
  if (lit) { g.addColorStop(0, '#ffe2a8'); g.addColorStop(1, '#e0a85a'); } else { g.addColorStop(0, '#7fb6d6'); g.addColorStop(1, '#3d6680'); }
  ctx.fillStyle = g; ctx.fillRect(-L / 2 + 3, -T / 2 + 3, L / 2 - 2, T - 7); ctx.fillRect(1, -T / 2 + 4, L / 2 - 4, T - 7);  // 두 짝이 살짝 어긋난 미닫이
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
  ctx.moveTo(-L / 2 + 6, T / 2 - 5); ctx.lineTo(-L / 2 + 11, -T / 2 + 4); ctx.moveTo(6, T / 2 - 4); ctx.lineTo(11, -T / 2 + 5); ctx.stroke();
  ctx.fillStyle = '#8b919a'; ctx.fillRect(-1, -T / 2 + 2, 2, T - 4);
  ctx.fillStyle = '#d9d4c8'; ctx.fillRect(-L / 2 - 3, T / 2, L + 6, 3);              // 창턱
  ctx.restore(); ctx.globalAlpha = 1;
}
// 옥상이 덮인 건물의 옆·뒷벽 창문: 위에서는 벽 끝의 좁은 창틀과 바깥으로 새는 불빛만 보인다
function drawWindowEdge(w, b) {
  const vert = winVert(w); let ox = 0, oy = 0;
  if (vert) ox = w.tx <= b.x0 ? -1 : w.tx >= b.x1 ? 1 : 0; else oy = w.ty <= b.y0 ? -1 : 0;
  if (!ox && !oy) return;
  const lit = lightAt(w.x - ox * 30, w.y - oy * 30) > 0.45, ex = w.x + ox * (TILE / 2 - 3), ey = w.y + oy * (TILE / 2 - 3);
  if (lit) {  // 바닥에 떨어지는 창 불빛
    const gx = ex + ox * 26, gy = ey + oy * 26, gr = ctx.createRadialGradient(gx, gy, 2, gx, gy, 44);
    gr.addColorStop(0, 'rgba(255,206,130,.32)'); gr.addColorStop(1, 'rgba(255,206,130,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(gx, gy, vert ? 34 : 44, vert ? 44 : 30, 0, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(ex, ey); if (vert) ctx.rotate(Math.PI / 2);
  const near = !S.player.z && dist(S.player.x, S.player.y, ex, ey) < 150, pz = near ? 0.6 + 0.4 * Math.sin(S.t * 4) : 0;
  if (near) { ctx.strokeStyle = `rgba(143,195,230,${0.5 + 0.4 * pz})`; ctx.lineWidth = 3; ctx.strokeRect(-24, -8, 48, 15); }
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(-19, -1, 40, 7);
  ctx.fillStyle = near ? '#dfe6ee' : '#9aa0a8'; ctx.fillRect(-20, -4, 40, 7);
  ctx.fillStyle = lit ? '#ffd38a' : near ? '#8fc3e6' : '#33485a'; ctx.fillRect(-17, -2, 34, 3);
  ctx.fillStyle = '#6a7079'; ctx.fillRect(-1, -3, 2, 5);
  ctx.restore();
}
// 문: 갈색 문짝 (열림 = 한쪽으로 젖혀짐, 잠김 = 막힘 + 자물쇠)
function drawDoor(d, onRoof) {
  const x = d.x, y = d.y;
  ctx.save(); ctx.translate(x, y); if (!d.horiz) ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#3a2618'; ctx.fillRect(-24, -7, 5, 14); ctx.fillRect(19, -7, 5, 14);
  if (d.locked) {
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-19, -6, 38, 12); ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 2; ctx.strokeRect(-19, -6, 38, 12);
    ctx.fillStyle = '#f2c46b'; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#3a2618'; ctx.fillRect(-1, -1, 2, 3);
  } else if (onRoof) {
    // 옥상 위에서 보는 문: 벽에 뚫린 검은 출입구 + 열린 문짝 + 손잡이
    ctx.fillStyle = '#140d08'; ctx.fillRect(-19, -7, 38, 14);
    ctx.fillStyle = '#a8703f'; ctx.fillRect(-19, -7, 9, 14); ctx.fillStyle = '#f2c46b'; ctx.fillRect(-13, -1.5, 3, 3);
    ctx.strokeStyle = 'rgba(224,176,112,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-19, 7, 22, -Math.PI / 2, 0); ctx.stroke();
  } else {
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-19, -6, 6, 34); ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 1.5; ctx.strokeRect(-19, -6, 6, 34);
  }
  ctx.restore();
}
// 배관: 회색 관(벽에 붙음) + 바닥 쪽 오르기 표시
function drawPipe(l) {
  const vert = l.bx === l.tx;
  const ox = (l.x - l.ux) / TILE, oy = (l.y - l.uy) / TILE;
  const cx = l.ux + ox * 20, cy = l.uy + oy * 20;
  ctx.strokeStyle = '#b8c0ca'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
  if (vert) { ctx.moveTo(cx, cy - 18 * oy); ctx.lineTo(cx, cy + 10 * oy); } else { ctx.moveTo(cx - 18 * ox, cy); ctx.lineTo(cx + 10 * ox, cy); }
  ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#6b737e'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
}
function drawPipeBase(l) {
  const a = Math.atan2(l.uy - l.y, l.ux - l.x);
  ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(a);
  ctx.strokeStyle = 'rgba(184,192,202,.75)'; ctx.lineWidth = 3;
  for (const k of [-6, 4]) { ctx.beginPath(); ctx.moveTo(k - 4, -7); ctx.lineTo(k + 3, 0); ctx.lineTo(k - 4, 7); ctx.stroke(); }
  ctx.restore();
}
// 상호작용 대상의 색: 문 갈색 · 창문 하늘색 · 배관 회색 · 사다리/계단 황토 · 굴뚝 주황 · 환풍구 청록 · 숨을 곳 초록 · 맨홀 파랑 · 비밀 통로 보라
const SCAN = { door: '#d39a5c', window: '#8fc3e6', pipe: '#c4ccd6', ladder: '#e0b070', chimney: '#f08a3c', vent: '#7fd6cc', hide: '#8fcf95', well: '#7fb0ff', secret: '#c9a0ff', lamp: '#f2c46b', fuse: '#f2c46b' };
function tag(x, y, text, col, alpha = 1, key) {
  const k = Math.max(1, 0.95 / SCALE);  // 화면이 축소돼 있어도 글자는 읽을 수 있는 크기로
  ctx.globalAlpha = alpha; ctx.font = `700 ${13 * k}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 12 * k, h = 18 * k;
  ctx.font = `800 ${13 * k}px "IBM Plex Sans KR",sans-serif`; const kcw = key ? Math.max(h, ctx.measureText(key).width + 9 * k) : 0, kw = key ? kcw + 2 * k : 0;
  ctx.font = `700 ${13 * k}px "IBM Plex Sans KR",sans-serif`;
  ctx.fillStyle = 'rgba(8,11,18,.86)'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h / 2, 3 * k, h);
  ctx.fillStyle = '#efeadf'; ctx.fillText(text, x + k, y + 4.5 * k);
  if (key) {  // 누를 키를 작은 키캡으로
    const kx = x - w / 2 - kw; ctx.fillStyle = col; ctx.fillRect(kx, y - h / 2, kcw, h); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(kx, y + h / 2 - 3 * k, kcw, 3 * k);
    ctx.fillStyle = '#0b0d12'; ctx.font = `800 ${13 * k}px "IBM Plex Sans KR",sans-serif`; ctx.fillText(key, kx + kcw / 2, y + 4 * k);
  }
  ctx.globalAlpha = 1;
}
// 살피기(Tab / 살피기 버튼): 쓸 수 있는 물체를 모두 색 테두리와 이름으로 보여준다
// 지나갈 수 없는 경계: 걸을 수 있는 칸과 막힌 칸 사이에 선을 긋는다 (평소엔 내 주변만 옅게, 살피기 중엔 화면 전체 + 막힌 칸 빗금)
function drawBlockEdges(P, all) {
  const sol = P.z ? (tx, ty) => rLv(tx, ty) !== P.z : groundSolidP, ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE), R = 6;
  const hx = W / SCALE / 2 / TILE + 1, hy = H / SCALE / 2 / TILE + 1;
  const x0 = all ? Math.floor(cam.x / TILE - hx) : ptx - R, x1 = all ? Math.ceil(cam.x / TILE + hx) : ptx + R;
  const y0 = all ? Math.floor(cam.y / TILE - hy) : pty - R, y1 = all ? Math.ceil(cam.y / TILE + hy) : pty + R;
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let ty = Math.max(0, y0); ty <= Math.min(MH - 1, y1); ty++) for (let tx = Math.max(0, x0); tx <= Math.min(MW - 1, x1); tx++) {
    if (sol(tx, ty)) {
      if (all && !(P.z === 0 && roofAt(tx, ty) && bldAt(tx, ty) !== S.openB)) {  // 막힌 칸 빗금
        ctx.strokeStyle = 'rgba(255,96,72,.28)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let k = -TILE; k < TILE; k += 12) { ctx.moveTo(tx * TILE + Math.max(0, k), ty * TILE + Math.max(0, -k)); ctx.lineTo(tx * TILE + Math.min(TILE, TILE + k), ty * TILE + Math.min(TILE, TILE - k)); }
        ctx.stroke(); ctx.lineWidth = 2;
      }
      continue;
    }
    const dd = Math.hypot(tx - ptx, ty - pty), a = all ? 0.7 : Math.max(0, 1 - dd / R) * 0.75; if (a < 0.03) continue;
    ctx.strokeStyle = `rgba(255,150,110,${a})`; ctx.beginPath();
    const X = tx * TILE, Y = ty * TILE;
    if (sol(tx, ty - 1)) { ctx.moveTo(X + 2, Y + 1); ctx.lineTo(X + TILE - 2, Y + 1); }
    if (sol(tx, ty + 1)) { ctx.moveTo(X + 2, Y + TILE - 1); ctx.lineTo(X + TILE - 2, Y + TILE - 1); }
    if (sol(tx - 1, ty)) { ctx.moveTo(X + 1, Y + 2); ctx.lineTo(X + 1, Y + TILE - 2); }
    if (sol(tx + 1, ty)) { ctx.moveTo(X + TILE - 1, Y + 2); ctx.lineTo(X + TILE - 1, Y + TILE - 2); }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
// 가까운 상호작용 지점을 작은 표식으로 늘 보여 준다 (숨을 곳 · 오르는 곳 · 창문 · 환풍구 · 잠긴 문)
function drawNearMarks(P, openB) {
  if (P.hide || P.vent || P.under || P.wire || P.trav || P.jump) return;
  const R = 300, fP = flOf(P), k = Math.max(1, 0.95 / SCALE), list = [];
  const hidden = (tx, ty) => { const b = bldAt(tx, ty); return !P.z && !fP && b >= 0 && b !== openB; };
  const add = (x, y, col, g, lab, tx, ty) => { const d = dist(P.x, P.y, x, y); if (d > R) return; if (tx != null && hidden(tx, ty)) return; list.push({ x, y, col, g, lab, d }); };
  if (!P.z) {
    for (const h of S.hides) if ((h.fl || 0) === fP && (h.z || 0) === (S.player.z || 0)) add(h.x, h.y, h.type === 'well' ? SCAN.well : SCAN.hide, h.type === 'well' ? '맨' : '숨', hideName(h), h.tx, h.ty);
    const stc = {};  // 계단 칸: 오르기·내려가기를 한 표식으로 (↑옥상 · ↓1층)
    for (const l of S.ladders) {
      if (l.kind === 'chimney') continue;
      if (l.kind === 'fstair' || l.kind === 'stair') { const k = l.tx + ',' + l.ty, o = stc[k] || (stc[k] = { l, up: null, down: null });
        if ((l.bfl || 0) === fP && !(l.bz || 0)) o.up = l.kind === 'stair' ? '옥상' : (l.tfl + 1) + '층'; if (l.kind === 'fstair' && l.tfl === fP && fP) o.down = (l.bfl + 1) + '층'; continue; }
      if ((l.bfl || 0) === fP && !(l.bz || 0)) add(l.x, l.y, SCAN.ladder, '↑', l.kind === 'pipe' ? (l.gas ? '가스관' : '배관') : l.kind === 'balc' ? '베란다' : '계단');
    }
    for (const k in stc) { const o = stc[k]; if (!o.up && !o.down) continue;  // 오르는 곳(계단 칸)과 내려가는 곳(구멍 끝)이 다르면 표식도 따로
      const dl = o.down && S.ladders.find(l => l.kind === 'fstair' && l.tx === o.l.tx && l.ty === o.l.ty && l.tfl === fP), dp = dl && downPt(dl);
      if (dp && (dp.x !== o.l.x || dp.y !== o.l.y)) { if (o.up) add(o.l.x, o.l.y, SCAN.ladder, '↑', '↑' + o.up, o.l.bx, o.l.by); add(dp.x, dp.y, SCAN.ladder, '↓', '↓' + o.down, o.l.bx, o.l.by); }
      else add(o.l.x, o.l.y, SCAN.ladder, o.up && o.down ? '↕' : o.up ? '↑' : '↓', [o.up && '↑' + o.up, o.down && '↓' + o.down].filter(Boolean).join(' · '), o.l.bx, o.l.by); }
    if (!fP) { for (const o of S.poles) if (o.wires.length) add(o.x, o.y, SCAN.ladder, '↑', '전봇대');
      for (const w of S.windows) { const st = winSt(w); if (st !== 'bar') add(w.x, w.y, st === 'lock' ? '#9aa6b4' : SCAN.window, st === 'lock' ? '잠' : '창', st === 'lock' ? '잠긴 창문' : '창문'); } }
    else for (const w of S.fwindows) if (w.fl === fP && winUsable(w)) add(w.x, w.y, SCAN.window, '창', w.link ? '옆 건물로' : '창밖 전깃줄');
    for (const v of S.vents) if (!v.roof) add(v.x, v.y, SCAN.vent, '환', '환풍구', v.street ? null : v.tx, v.ty);
    for (const d of S.doors) if (d.keyLock && d.locked && (d.fl || 0) === fP) add(d.x, d.y, keyCol(d.keyLock), '잠', keyName(d.keyLock), d.tx, d.ty);
  } else {
    for (const l of S.ladders) if (l.tz === P.z) add(l.rx != null ? l.rx : l.ux, l.ry != null ? l.ry : l.uy, SCAN.ladder, '↓', l.kind === 'pipe' ? '내려가기' : '계단');
    for (const v of S.vents) if (v.roof) add(v.x, v.y, SCAN.vent, '환', '환기구');
    for (const w of S.wires) for (const n of [w.a, w.b]) if (n.roof && n.z === P.z) add(n.dx, n.dy, SCAN.ladder, '줄', '전깃줄');
  }
  for (const m of list) {
    const a = Math.max(0.35, 1 - m.d / R) * (0.85 + 0.15 * Math.sin(S.t * 3)), r = 9 * k, y = m.y - 22 * k;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,11,18,.85)'; ctx.beginPath(); ctx.arc(m.x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = m.col; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = m.col; ctx.font = `700 ${13 * k}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.fillText(m.g, m.x, y + 4 * k);
    if (m.d < 130 && m.lab) { ctx.font = `600 ${11.5 * k}px "IBM Plex Sans KR",sans-serif`; const tw = ctx.measureText(m.lab).width + 8 * k; ctx.fillStyle = 'rgba(8,11,18,.8)'; ctx.fillRect(m.x + r + 2 * k, y - 7 * k, tw, 14 * k); ctx.fillStyle = m.col; ctx.textAlign = 'left'; ctx.fillText(m.lab, m.x + r + 6 * k, y + 4 * k); }
  }
  ctx.globalAlpha = 1;
}
function drawScan(openB) {
  const vx0 = cam.x - W / SCALE / 2 - 60, vx1 = cam.x + W / SCALE / 2 + 60, vy0 = cam.y - H / SCALE / 2 - 60, vy1 = cam.y + H / SCALE / 2 + 60;
  const on = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
  const pulse = 0.75 + 0.25 * Math.sin(S.t * 5);
  // 글자는 가까운 것부터, 겹치면 건너뛴다 (상자는 다 그린다). 닫힌 건물 안의 것은 흐리게, 글자 없이
  const labs = [], kS = Math.max(1, 0.95 / SCALE);
  const box = (x, y, col, text, sz = 40, a = 1) => { if (!on(x, y)) return; ctx.globalAlpha = a * pulse; ctx.strokeStyle = col; ctx.lineWidth = a < 1 ? 1.5 : 2.5; ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz); ctx.globalAlpha = 1;
    const d = dist(x, y, S.player.x, S.player.y); if (text && a >= 0.9 && (tactical || d < 340)) labs.push({ x, y: y - sz / 2 - 11 * kS, text, col, d }); };
  const inner = (tx, ty) => { const b = bldAt(tx, ty); return b >= 0 && b !== openB ? 0.55 : 1; };
  const seen = new Set(), fP = flOf(S.player);
  for (const d of S.doors) { const k = d.group.map(t => t.tx + ',' + t.ty).sort()[0]; if (seen.has(k)) continue; seen.add(k); if ((d.fl || 0) !== fP && !tactical) continue; const keyed = d.locked && d.keyLock; box(d.x, d.y, keyed ? keyCol(d.keyLock) : SCAN.door, keyed ? '잠긴 문(' + keyName(d.keyLock) + ')' : '문', 40, keyed ? 1 : inner(d.tx, d.ty)); }
  if (fP) for (const w of S.fwindows) { if (w.fl === fP && winUsable(w)) box(w.x, w.y, SCAN.window, S.wires.some(x => [x.a, x.b].some(n => n.win && n.fl === fP && n.tx === w.tx && n.ty === w.ty)) ? '창문(전깃줄)' : '창문'); }
  else for (const w of S.windows) { const st = winSt(w); box(w.x, w.y, st === 'bar' ? '#5a606a' : st === 'lock' ? '#9aa6b4' : SCAN.window, st === 'bar' ? '' : st === 'lock' ? '잠긴 창문' : '창문', st === 'bar' ? 30 : 40, st === 'bar' ? 0.5 : 1); }
  for (const l of S.ladders) {
    if ((l.kind === 'stair' || l.kind === 'fstair') && !S.player.z) { if ((l.bfl || 0) === fP) box(l.x, l.y, SCAN.ladder, l.kind === 'fstair' ? `오르기 ${l.tfl + 1}층` : '오르기 옥상', 36); if (l.kind === 'fstair' && l.tfl === fP) { const dp = downPt(l); tag(dp.x, dp.y + (dp.x === l.x && dp.y === l.y ? 30 : 0), `내리기 ${l.bfl + 1}층`, SCAN.ladder); } continue; }
    if (fP) continue;
    if (l.kind === 'pipe') { box(l.x, l.y, SCAN.pipe, '배관 ↑', 36, l.bz ? 0.8 : 1); }
    else if (l.kind === 'ladder') box(l.x, l.y, SCAN.ladder, '사다리 ↑', 36);
    else if (l.kind === 'stair') box(l.x, l.y, SCAN.ladder, '오르기 옥상', 36, inner(l.bx, l.by));
    else if (l.kind === 'chimney') { const lit = lampOn(l.lamp); box(l.ux, l.uy, SCAN.chimney, lit ? '굴뚝(불 땜)' : '굴뚝', 40); }
  }
  for (const v of S.vents) box(v.x, v.y, SCAN.vent, v.roof ? '옥상 환기구' : v.street ? '거리 환기구' : '환풍구', 34, v.roof ? 1 : inner(v.tx, v.ty));
  for (const h of S.hides) { if ((h.fl || 0) !== flOf(S.player) || (h.z || 0) !== (S.player.z || 0)) continue; box(h.x, h.y, h.type === 'well' ? SCAN.well : SCAN.hide, hideName(h), 42, inner(h.tx, h.ty)); }
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'S') box(tc(tx), tc(ty), SCAN.secret, '비밀 통로', 40);
  if (STAGE.fuse && S.lightsOn) box(tc(STAGE.fuse[0]), tc(STAGE.fuse[1]), SCAN.fuse, '두꺼비집', 40);
  if (!flOf(S.player)) for (const fb of S.bfuses || []) if (!fb.cut) box(fb.x, fb.y - 26, SCAN.fuse, '두꺼비집', 30);
  for (const c of S.cams || []) if (c.fl === flOf(S.player) && !c.broken) box(c.x, c.y, '#ff5a5a', 'CCTV', 28);
  for (const l of S.lamps) if (!l.hearth && !l.broken && on(l.x, l.y)) { ctx.strokeStyle = SCAN.lamp; ctx.lineWidth = 2; ctx.globalAlpha = 0.8 * pulse; ctx.beginPath(); ctx.arc(l.x, l.y, 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const o of S.poles) if (o.wires.length) box(o.x, o.y, SCAN.ladder, '전봇대 ↑', 36);
  for (const w of S.wires) for (const n of [w.a, w.b]) if (n.roof) box(n.dx, n.dy, SCAN.ladder, '전깃줄', 26);
  for (const g of S.guards) if (g.lookout && g.state !== 'DEAD') labs.push({ x: g.x, y: g.y + 34, text: '망꾼: 옥상을 본다', col: '#f2c46b', d: 0 });
  if (!S.player.z) for (const it of FURN) {  // 가구: 파랑 = 높은 가구(막힘·시선 가림), 노랑 점선 = 낮은 가구(막힘·웅크리면 엄폐)
    if ((it.fl || 0) !== fP || FURN_FLAT.has(it.t)) continue; const bi = bldAt(it.x, it.y); if (bi >= 0 && bi !== openB && !tactical) continue;
    const x = it.x * TILE, y = it.y * TILE, w = it.w * TILE, h = it.h * TILE; if (!on(x + w / 2, y + h / 2)) continue;
    if (FURN_TALL.has(it.t)) { ctx.fillStyle = 'rgba(110,150,220,.22)'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.strokeStyle = 'rgba(140,180,240,.85)'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); }
    else { ctx.strokeStyle = 'rgba(242,196,107,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); ctx.setLineDash([]); }
  }
  labs.sort((a, b) => a.d - b.d); const placed = []; ctx.font = `700 ${13 * kS}px "IBM Plex Sans KR",sans-serif`;
  for (const L of labs) { const w = ctx.measureText(L.text).width + 14 * kS, h = 19 * kS, r = [L.x - w / 2, L.y - h / 2, L.x + w / 2, L.y + h / 2];
    if (placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue; placed.push(r); tag(L.x, L.y, L.text, L.col); if (placed.length >= 18) break; }
}
// 지금 누를 수 있는 행동을 대상 위에 글자로 띄운다
function drawActLabels(pa, P) {
  const key = '';
  let x = P.x, y = P.y - 44;
  const at = o => { x = o.x; y = o.y - 34; };
  let zKey = false;
  const stk = pa.stalk; if (pa.k === 'none') { if (!pa.held) return; pa = pa.held; zKey = true; }
  if (pa.at) { x = pa.at.x; y = pa.at.y - 30; } else if (pa.d) at(pa.d); else if (pa.wv) at(pa.wv.w); else if (pa.v) at(pa.v); else if (pa.h) at(pa.h); else if (pa.g) at(pa.g); else if (pa.list) at(pa.list[0]);
  else if (pa.l && pa.k === 'up') { x = pa.l.x; y = pa.l.y - 34; } else if (pa.l && (pa.k === 'down' || pa.k === 'smother')) { x = pa.l.rx != null ? pa.l.rx : pa.l.ux; y = (pa.l.ry != null ? pa.l.ry : pa.l.uy) - 40; } else if (pa.l) at(pa.l);
  const col = pa.list || pa.g ? '#e8473c' : pa.k === 'window' ? SCAN.window : pa.k === 'door' || pa.k === 'keymsg' ? SCAN.door : pa.v ? SCAN.vent : pa.k === 'smother' || (pa.l && pa.l.kind === 'chimney') ? SCAN.chimney : pa.k === 'hide' || pa.k === 'drag' ? SCAN.hide : '#f2c46b';
  let lab = pa.label;
  if ((pa.k === 'up' && pa.l && pa.l.kind !== 'fstair') || pa.k === 'wireOn' || pa.k === 'down') {  // 오르내리는 동안 보일 자리: 지금 그곳을 보고 있는 자경대원
    const bx = pa.l ? pa.l.x : pa.at ? pa.at.x : P.x, by = pa.l ? pa.l.y : pa.at ? pa.at.y + 30 : P.y; let n = 0;
    for (const g of S.guards) { if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.climb || flOf(g) || (g.z || 0)) continue;
      if (canSee(g, bx, by, Math.max(0.35, lightAt(bx, by)), false, false, 0) > 0) { n++; ctx.strokeStyle = 'rgba(232,90,70,.7)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y - 20); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]); } }
    if (n) lab += ` — 보는 눈 ${n}`;
  }
  if (zKey) { tag(x, y, lab + ' (사람 근처 — Space는 ' + (stk && !koDefault(stk) ? '암살' : '기절') + ')', '#c4ccd6', 1, isTouch ? null : 'Z'); return; }
  tag(x, y, key + lab, col, 1, isTouch ? null : 'Space'); let dy = 21 * Math.max(1, 0.95 / SCALE), row = 1;
  if (pa.hold && !isTouch) { tag(x, y + dy * row++, '길게 누르면 ' + pa.hold, '#ff8a76', 0.95, 'Space'); }  // 히트맨식: 같은 키 길게 누르기는 따로 한 줄
  const sa = secondaryAction();
  if (['grab', 'steal', 'tunnel', 'fdown'].includes(sa.k) || sa.viaZ) tag(x, y + dy * row, sa.label, '#c4ccd6', 1, isTouch ? null : 'Z');
}
const coveredG = (g, openB) => { const b = bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)); return b >= 0 && b !== openB; };

function drawUnderground() {
  const sc = SCALE * DPR, P = S.player;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#030406'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  worldTransform(ctx, sc); ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.14; ctx.drawImage(mapC, 0, 0); ctx.globalAlpha = 1;
  ctx.drawImage(ugC, 0, 0);
  // 맨홀 아래 빛줄기
  for (const h of S.hides) if (h.type === 'well' && ugAt(h.tx, h.ty)) {
    const gr = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 40); gr.addColorStop(0, 'rgba(200,215,230,.35)'); gr.addColorStop(1, 'rgba(200,215,230,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h.x, h.y, 40, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,215,230,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, TAU); ctx.stroke();
  }
  // 위층 자경대원은 발소리처럼 희미한 점으로
  for (const g of S.guards) if (g.state !== 'DEAD' && g.state !== 'CAPTIVE' && dist(g.x, g.y, P.x, P.y) < 420) { ctx.fillStyle = 'rgba(232,120,100,.35)'; ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, TAU); ctx.fill(); }
  drawPlayer(P);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g2 = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 60 * sc, canvas.width / 2, canvas.height / 2, 300 * sc);
  const px = (P.x - cam.x) * sc + canvas.width / 2, py = (P.y - cam.y) * sc + canvas.height / 2;
  const lg = ctx.createRadialGradient(px, py, 50 * sc, px, py, 280 * sc); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${S.fade * 1.6})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  worldTransform(ctx, sc);
  const pa = primaryAction();
  if (pa.k === 'surface') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.strokeRect(pa.w.x - 24, pa.w.y - 24, 48, 48); }
}
// 어둠 한 겹: lamps 의 빛만 뚫린다. clip 이 있으면 그 사각형(월드 좌표) 안에만 덮는다
// 어둠: 화면 반 해상도 캔버스에 어둠을 칠하고, 불빛 자리를 지워(destination-out) 화면에 덮는다
// 고정 조명(깜빡이지 않는 등)의 빛은 맵 전체를 1/4 해상도로 한 번만 그려 두고(켜짐·꺼짐이 바뀔 때만 다시), 매 프레임은 그 그림을 가져다 쓴다
// — 프레임마다 등 하나하나 가림막 다각형+그라데이션을 그리던 것이 그리기 시간의 절반이었다
const LIGHTQ = 4, lightCache = {};
function lightMap(key, lamps) {
  const sig = (tactical ? 't' : '') + lamps.map(l => l.flk ? '' : lampOn(l) ? '1' : '0').join('');
  let lc = lightCache[key];
  if (lc && lc.sig === sig) return lc.c;
  if (!lc) { lc = lightCache[key] = { c: document.createElement('canvas') }; lc.c.width = Math.ceil(MW * TILE / LIGHTQ); lc.c.height = Math.ceil(MH * TILE / LIGHTQ); }
  lc.sig = sig; const x = lc.c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, lc.c.width, lc.c.height); x.setTransform(1 / LIGHTQ, 0, 0, 1 / LIGHTQ, 0, 0);
  for (const l of lamps) { if (l.flk || !lampOn(l)) continue; lampLight(x, l, 1); }
  return lc.c;
}
function lampLight(x, l, flick) {  // 벽에 가린 빛(다각형) 안을 둥근 그라데이션으로
  x.save(); x.beginPath(); for (let i = 0; i < l.poly.length; i += 2) i ? x.lineTo(l.poly[i], l.poly[i + 1]) : x.moveTo(l.poly[i], l.poly[i + 1]); x.closePath(); x.clip();
  const gr = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * flick); gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(0.55, 'rgba(0,0,0,.66)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); x.restore();
}
function darkPass(sc, lamps, clip, key) {
  const P = S.player;
  const ds = 0.5;
  const dw = Math.ceil(canvas.width * ds), dh = Math.ceil(canvas.height * ds);
  if (darkC.width !== dw || darkC.height !== dh) { darkC.width = dw; darkC.height = dh; }
  dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, dw, dh);
  dctx.fillStyle = tactical ? 'rgba(4,8,22,0.5)' : NEONY() ? 'rgba(16,6,40,0.8)' : CITY ? 'rgba(4,8,22,0.76)' : 'rgba(4,8,22,0.84)'; dctx.fillRect(0, 0, dw, dh);
  dctx.setTransform(sc * ds, 0, 0, sc * ds, (W / 2 * DPR - cam.x * sc) * ds, (H / 2 * DPR - cam.y * sc) * ds);
  dctx.globalCompositeOperation = 'destination-out';
  if (!DBG.dk2) { dctx.imageSmoothingEnabled = true; dctx.drawImage(lightMap(key || 'g', lamps), 0, 0, MW * TILE, MH * TILE); }
  const flick = 1 + Math.sin(S.t * 13) * 0.012 + Math.sin(S.t * 7.3) * 0.01;
  for (const l of lamps) {  // 깜빡이는 등만 매 프레임
    if (!l.flk || !lampOn(l)) continue;
    if (Math.abs(l.x - cam.x) > W / SCALE / 2 + l.r || Math.abs(l.y - cam.y) > H / SCALE / 2 + l.r) continue;
    lampLight(dctx, l, flick);
  }
  const pg = dctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 120);
  pg.addColorStop(0, 'rgba(0,0,0,.42)'); pg.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = pg; dctx.fillRect(P.x - 120, P.y - 120, 240, 240);
  if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(clip[0], clip[1], clip[2], clip[3]); ctx.clip(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!DBG.dk1) { ctx.imageSmoothingEnabled = true; ctx.drawImage(darkC, 0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false; }
  worldTransform(ctx, sc);
  if (clip) ctx.restore();
}
const DBG = window.__skip || (window.__skip = {});  // 성능 측정용: 그리기 단계를 하나씩 끄고 비교
function draw() {
  if (S.player.under && !tactical) { drawUnderground(); return; }
  const sc = SCALE * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  worldTransform(ctx, sc);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapC, 0, 0);
  const P = S.player;
  setLayer(0);
  // 위층에 있으면 그 건물 자리에 그 층 평면을 덮어 그린다
  const VF = (!P.z && !P.wire && !P.jump && !P.vent && !P.under) ? flOf(P) : 0;
  const VB = VF ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1;
  const inVB = o => VB >= 0 && bldAt(Math.floor(o.x / TILE), Math.floor(o.y / TILE)) === VB;
  const onGround = o => !flOf(o) && !(VF && inVB(o));
  const onFloor = o => !!VF && flOf(o) === VF && inVB(o);
  const gVis = o => onGround(o) || onFloor(o);
  for (const l of S.lures) {
    const f = l.landed ? 1 : l.t / 0.35, x = l.x0 + (l.x - l.x0) * f, y = l.y0 + (l.y - l.y0) * f - Math.sin(f * Math.PI) * 14;
    blit(ctx, 'it_coin', x - 10, y - 10, 20, 20);
    if (l.landed) { ctx.strokeStyle = `rgba(242,196,107,${0.4 + 0.3 * Math.sin(S.t * 6)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke(); }
  }
  for (const w of S.windows) drawWindow(w, 1);
  for (const d of S.doors) drawDoor(d, false);
  for (const l of S.ladders) if (l.kind === 'pipe' && l.bz === 0) drawPipeBase(l);
  for (const v of S.vents) if (!v.roof) drawGrate(v, 0.85);
  for (const l of S.lamps) if (l.hearth && lampOn(l)) { const fl = 0.75 + 0.25 * Math.sin(S.t * 17 + l.x); ctx.fillStyle = `rgba(255,140,50,${0.85 * fl})`; ctx.beginPath(); ctx.moveTo(l.x - 9, l.y + 14); ctx.quadraticCurveTo(l.x - 6, l.y - 2 * fl, l.x, l.y - 8 * fl); ctx.quadraticCurveTo(l.x + 6, l.y - 2 * fl, l.x + 9, l.y + 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(l.x, l.y + 9, 4 * fl, 0, TAU); ctx.fill(); }
  for (const b of S.hides) if (b.bodies && b.type !== 'well' && (b.fl || 0) === flOf(S.player)) { ctx.fillStyle = 'rgba(110,14,18,.9)'; for (let i = 0; i < b.bodies; i++) { ctx.beginPath(); ctx.arc(b.x - 6 + i * 12, b.y - 14, 3, 0, TAU); ctx.fill(); } }
  if (S.exitOpen) {
    const p = 0.5 + 0.5 * Math.sin(S.t * 4);
    ctx.strokeStyle = `rgba(242,196,107,${0.5 + p * 0.4})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(S.exit.x, S.exit.y, S.exit.r - 8 + p * 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (STAGE.flee && S.fleeing) {
    const fx = tc(STAGE.flee[0]), fy = tc(STAGE.flee[1]);
    ctx.strokeStyle = 'rgba(232,71,60,.7)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(fx, fy, 40, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (showRoutes || tactical) drawRoutes(P);
  drawTrapsGround(); drawProps();
  for (const d of S.decals) { if (!onGround(d)) continue; ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = 'rgba(110,14,18,.82)'; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(d.r * 0.8, d.r * 0.4, d.r * 0.3, 0, TAU); ctx.fill(); ctx.restore(); }
  for (const it of S.items) if (!it.got && onGround(it)) { if (CITY) { const d = dist(P.x, P.y, it.x, it.y), a = clamp(1 - d / 520, 0.25, 0.9) * (0.75 + 0.25 * Math.sin(S.t * 3)); ctx.strokeStyle = `rgba(242,196,107,${a})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(it.x, it.y, 20 + Math.sin(S.t * 3) * 2, 0, TAU); ctx.stroke(); } drawScroll(it.x, it.y, S.t); }  // 목표물은 은은하게 빛난다
  for (const n of S.notes || []) if (onGround(n)) drawNote(n);
  drawLoud(0); drawCams(0);
  if (CITY && KIT_PROP.dumpster && kitOk(KIT_PROP.dumpster.img)) { const D = KIT_PROP.dumpster; for (const h of S.hides) if (h.type === 'box' && !(h.fl || 0)) ctx.drawImage(D.img, h.tx * TILE + D.ox, h.ty * TILE + D.oy); }
  if (!tactical && !P.z && !flOf(P) && !input.scan) drawBlockEdges(P, false);
  for (const n of S.noises) {
    const k = n.t / 0.7; ctx.strokeStyle = n.heard ? `rgba(240,80,60,${(1 - k) * 0.75})` : n.src === 'stone' || n.src === 'glass' ? `rgba(242,196,107,${(1 - k) * 0.6})` : `rgba(220,226,240,${(1 - k) * 0.38})`;
    ctx.lineWidth = n.heard ? 3 : 2; ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(1, n.r * (0.25 + 0.75 * k)), 0, TAU); ctx.stroke();
  }
  for (const c of S.corpses) {
    if (c.stashed || !onGround(c)) continue;
    if (c.dog) drawDog(c.x, c.y, c.a, false, c.hidden ? 0.5 : 0.9, true);
    else { if (c.carried && pairCarry(S.player)) continue; const lift = c.fly ? Math.sin(Math.min(1, c.fly.t / c.fly.dur) * Math.PI) * 40 : c.td != null && S.t - c.td < 0.22 ? (1 - (S.t - c.td) / 0.22) * 30 : 0; ctx.globalAlpha = c.hidden ? 0.5 : 1; drawBody(c, lift); ctx.globalAlpha = 1; }
    if (c.ko && !c.carried) drawEmote('zz', c.x + 16, c.y - 6);
    if (c.discovered && !c.carried) { ctx.fillStyle = 'rgba(194,54,43,.9)'; ctx.font = '700 13px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('발견됨', c.x, c.y - 24); }
  }
  if (!DBG.sprites) for (const g of S.guards) {
    if (g.state === 'DEAD' || !onGround(g) || g.z || g.climb) continue;
    drawGuard(g);
    if (g.atkT > 0) { const k = 1 - g.atkT / (g.dog ? 0.35 : 0.55); ctx.strokeStyle = `rgba(232,71,60,${0.4 + 0.5 * k})`; ctx.lineWidth = 3 + 3 * k; ctx.beginPath(); ctx.arc(g.x, g.y, 30 + 16 * k, g.a - 0.8, g.a + 0.8); ctx.stroke(); }
    if (g.hasKey && dist(g.x, g.y, P.x, P.y) < 320) drawKeyIcon(g.hasKey, g.x + 18, g.y - 30, false);
    if (CITY && g.radio && dist(g.x, g.y, P.x, P.y) < 460) drawRadio(g.x - 19, g.y - 34);
    if (STAGE.zones) drawSharpEye(g);
    else if (P.disguise && !P.disguiseBlown && (g.elite || g.target) && dist(g.x, g.y, P.x, P.y) < 380) {  // 변장: 이 사람은 얼굴을 안다 (원 안에서 보이면 들킨다)
      ctx.strokeStyle = 'rgba(232,90,70,.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(g.x, g.y, 220, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      tag(g.x, g.y + 34, '얼굴을 안다', '#e85a46', 0.9);
    }
    if (g.lookout && !g.icon) { ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.x - 7, g.y - 36); ctx.lineTo(g.x, g.y - 43); ctx.lineTo(g.x + 7, g.y - 36); ctx.moveTo(g.x - 7, g.y - 42); ctx.lineTo(g.x, g.y - 49); ctx.lineTo(g.x + 7, g.y - 42); ctx.stroke(); }
    if (g.elite) { ctx.fillStyle = '#e8473c'; ctx.beginPath(); ctx.moveTo(g.x, g.y - 34); ctx.lineTo(g.x - 6, g.y - 43); ctx.lineTo(g.x + 6, g.y - 43); ctx.closePath(); ctx.fill(); }
    if (g.state === 'CAPTIVE') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - g.captT / 9)); ctx.stroke(); }
    if (g.target) { ctx.strokeStyle = 'rgba(194,54,43,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y, 24, 0, TAU); ctx.stroke(); }
  }
  drawGhosts();
  if (P.hide) { ctx.strokeStyle = 'rgba(127,174,134,.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(P.hide.x - 22, P.hide.y - 22, 44, 44); ctx.setLineDash([]); }
  // (땅 위 주인공은 어둠·화단 위에 그린다 — 아래쪽 참고)
  const vx0 = Math.max(0, Math.floor((cam.x - W / SCALE / 2) / TILE) - 2), vx1 = Math.min(MW - 1, Math.ceil((cam.x + W / SCALE / 2) / TILE) + 2);
  const vy0 = Math.max(0, Math.floor((cam.y - H / SCALE / 2) / TILE) - 2), vy1 = Math.min(MH - 1, Math.ceil((cam.y + H / SCALE / 2) / TILE) + 4);
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  for (let ty = vy0; ty <= vy1; ty++) for (let tx = vx0; tx <= vx1; tx++) {
    const ch = G[ty][tx];
    if (ch === 'B') { const near = Math.abs(tx - ptx) <= 1 && Math.abs(ty - pty) <= 1 && P.hidden; if (CITY && kitOk(kitBush)) { const bs = S.bushShake, sh = bs && S.t - bs.t < 0.5 && Math.abs(bs.x - tc(tx)) < 30 && Math.abs(bs.y - tc(ty)) < 30 ? Math.sin((S.t - bs.t) * 45) * 3 * (1 - (S.t - bs.t) / 0.5) : 0; ctx.globalAlpha = near ? 0.5 : 0.96; ctx.drawImage(kitBush, tx * TILE - TILE / 2 + sh, (ty - 0.9) * TILE); ctx.globalAlpha = 1; continue; } const v = (tx * 7 + ty * 3) % 3; ctx.globalAlpha = near ? 0.5 : 0.96; blit(ctx, 'bush' + v, tx * TILE - 6, ty * TILE - 10, 60, 60); ctx.globalAlpha = 1; }
    if (ch === 'T') {
      if (CITY && kitT.length) {  // 키트 나무: 숲은 침엽수가 많고, 시내는 활엽수
        const hh = ((tx * 92821) ^ (ty * 68917)) >>> 0, pine = hh % 4 === 0;
        const im = kitT[pine ? 2 : hh % 3 === 0 ? 3 : 0];
        if (kitOk(im)) { ctx.drawImage(im, tx * TILE - TILE, (ty + 0.5 - 3.6) * TILE); continue; }
      }
      const v = (tx * 5 + ty * 3) % 3; blit(ctx, v === 0 ? 'treeR' : v === 1 ? 'pine' : 'treeP', tx * TILE - 24, ty * TILE - 52, 96, 96); }
  }
  for (const f of S.fx) {
    if (f.k === 'slash') { const fr = Math.min(3, Math.floor(f.t / 0.06)); blit(ctx, 'fx_slash', f.x - 48, f.y - 48, 96, 96, fr * 32, 0, 32, 32); }
    if (f.k === 'smoke') { const fr = Math.min(5, Math.floor(f.t / 0.07)); blit(ctx, 'fx_smoke', f.x - 36, f.y - 44, 72, 72, fr * 32, 0, 32, 32); }
  }
  if (S.keyDrop && (S.keyDrop.fl || 0) === flOf(S.player)) drawKeyIcon(S.keyDrop.key, S.keyDrop.x, S.keyDrop.y, true);
  for (const it of S.keyItems || []) if (!it.got && it.fl === flOf(S.player)) drawKeyIcon(it.key, it.x, it.y, true);
  for (const s of S.stones) {
    const k = Math.min(1, s.t / s.dur); const x = s.x0 + (s.x1 - s.x0) * k, y = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 30;
    ctx.fillStyle = '#c9ccd3'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
  }
  for (const k of S.kunais) {
    const f = Math.min(1, k.t / k.dur); const x = k.x0 + (k.tgt.x - k.x0) * f, y = k.y0 + (k.tgt.y - k.y0) * f;
    const a = Math.atan2(k.tgt.y - k.y0, k.tgt.x - k.x0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#d7dbe2'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(-10, -1.5, 6, 3); ctx.restore();
  }

  // 어둠
  if (!DBG.dark) darkPass(sc, S.lamps.filter(l => !flOf(l)), null);
  worldTransform(ctx, sc);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of S.lamps) {
    if (!lampOn(l) || flOf(l) || DBG.glow) continue;
    if (Math.abs(l.x - cam.x) > W / SCALE / 2 + l.r || Math.abs(l.y - cam.y) > H / SCALE / 2 + l.r) continue;  // 화면 밖
    const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
    const nn = NEONY() || !!l.col, lc = l.col || (NEONY() ? (Math.round(l.x + l.y) % 2 ? '255,60,170' : '60,236,255') : '255,186,105');
    gr.addColorStop(0, `rgba(${lc},${nn ? 0.14 : 0.07})`); gr.addColorStop(1, `rgba(${lc},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = nn ? `rgba(${lc},.95)` : 'rgba(255,214,150,.9)'; ctx.beginPath(); ctx.arc(l.x, l.y, nn ? 4.5 : 3.5, 0, TAU); ctx.fill();
  }
  // 손전등 빛줄기
  for (const g of S.guards) { if (!g.torch || g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== flOf(S.player) || !gVis(g)) continue;
    setLayer(flOf(g)); ctx.beginPath(); ctx.moveTo(g.x, g.y); for (let i = 0; i <= 12; i++) { const a = g.a - 0.32 + 0.64 * i / 12, d = castRay(g.x, g.y, a, TORCH_R); ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d); } ctx.closePath(); setLayer(flOf(S.player));
    const gr = ctx.createRadialGradient(g.x, g.y, 6, g.x, g.y, TORCH_R); gr.addColorStop(0, 'rgba(255,244,200,.32)'); gr.addColorStop(1, 'rgba(255,244,200,0)'); ctx.fillStyle = gr; ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  if (NEONY() && CITY && !DBG.neon) drawNeonSigns();
  drawSpeech();
  ctx.globalCompositeOperation = 'source-over';
  // 깨진 조명 표시
  for (const l of S.lamps) if (l.off && !l.broken) { ctx.strokeStyle = 'rgba(232,227,214,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, TAU); ctx.stroke(); }
  for (const l of S.lamps) if (l.broken) { ctx.strokeStyle = 'rgba(232,227,214,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l.x - 5, l.y - 5); ctx.lineTo(l.x + 5, l.y + 5); ctx.moveTo(l.x + 5, l.y - 5); ctx.lineTo(l.x - 5, l.y + 5); ctx.stroke(); }

  // 내 모습은 어둠과 화단 위에 그려 언제나 확인할 수 있게 (숨은 상태면 반투명 + 외곽선)
  if (VF && VB >= 0 && GF[VF]) {
    const b = BLD[VB], bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    setLayer(VF);
    // 높이감: 바깥(땅)은 층이 높을수록 더 어둡게 가라앉고, 건물 그림자는 길어진다
    ctx.fillStyle = `rgba(4,6,12,${Math.min(0.62, 0.3 + VF * 0.1)})`; ctx.beginPath(); ctx.rect(cam.x - 6000, cam.y - 6000, 12000, 12000); ctx.rect(bx, by, bw, bh); ctx.fill('evenodd');
    const shd = 8 + VF * 7; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(bx + shd, by + shd, bw, bh);
    ctx.drawImage(floorCanvas(VB, VF), bx, by);
    { const tint = ['', '255,196,130', '140,196,255', '160,230,170', '226,170,255', '255,150,150'][VF] || '200,200,200'; ctx.fillStyle = `rgba(${tint},.09)`; ctx.fillRect(bx, by, bw, bh); }
    for (const w of S.fwindows) if (w.fl === VF && bldAt(w.tx, w.ty) === VB) drawWindow(w, 1);
    for (const d of S.decals) if (onFloor(d)) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = 'rgba(110,14,18,.82)'; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const it of S.items) if (!it.got && onFloor(it)) drawScroll(it.x, it.y, S.t);
    for (const n of S.notes || []) if (onFloor(n)) drawNote(n);
    for (const c of S.corpses) if (!c.stashed && onFloor(c)) { ctx.globalAlpha = c.hidden ? 0.5 : 1; drawBody(c); ctx.globalAlpha = 1; }
    drawLoud(VF); drawCams(VF);
    if (!tactical && flOf(P) === VF) drawBlockEdges(P, input.scan);
    for (const g of S.guards) if (g.state !== 'DEAD' && onFloor(g) && !g.climb) drawGuard(g);
    darkPass(sc, S.lamps.filter(l => flOf(l) === VF), [bx, by, bw, bh], 'f' + VF);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of S.lamps) if (flOf(l) === VF && lampOn(l)) { const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7), lc = l.col || '255,186,105'; gr.addColorStop(0, `rgba(${lc},${l.col ? 0.2 : 0.08})`); gr.addColorStop(1, `rgba(${lc},0)`); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    drawSpeech();
    ctx.strokeStyle = 'rgba(242,196,107,.55)'; ctx.lineWidth = 3; ctx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
    { const lab = `${VF + 1}층` + (BLD[VB].plate ? ' · ' + BLD[VB].plate : ''); ctx.font = '700 17px "IBM Plex Sans KR", sans-serif'; const tw = ctx.measureText(lab).width; ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(bx, by - 30, tw + 18, 26); ctx.fillStyle = '#f2c46b'; ctx.fillRect(bx, by - 30, 4, 26); ctx.textAlign = 'left'; ctx.fillText(lab, bx + 10, by - 11); }
    setLayer(0);
  }
  const travUp = !!(P.trav && P.trav.phases.some(ph => ph.pose !== 'walk'));
  if (!P.hide && !P.z && !P.jump && !P.vent && !P.trav && !P.under && running && !tactical) drawStepRing(P);
  if (!P.hide && !P.z && !P.jump && !P.vent && !travUp) drawPlayer(P);
  // 키트 나무·화단: 주인공이 그 뒤(위쪽)에 있으면 잎을 반투명하게 한 번 더 덮어 '뒤에 숨은' 모습으로
  if (CITY && !P.z && !P.jump && !P.vent && !P.hide && !flOf(P)) {
    const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
    for (let ty = pty; ty <= pty + 3; ty++) for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
      const ch = G[ty] && G[ty][tx];
      if (ch === 'T' && ty > pty && kitT.length) { const hh = ((tx * 92821) ^ (ty * 68917)) >>> 0, pine = hh % 4 === 0, im = kitT[pine ? 2 : hh % 3 === 0 ? 3 : 0]; if (kitOk(im)) { ctx.globalAlpha = 0.55; ctx.drawImage(im, tx * TILE - TILE, (ty + 0.5 - 3.6) * TILE); ctx.globalAlpha = 1; } }
      if (ch === 'B' && P.hidden && tx === ptx && ty === pty && kitOk(kitBush)) { ctx.globalAlpha = 0.6; ctx.drawImage(kitBush, tx * TILE - TILE / 2, (ty - 0.9) * TILE); ctx.globalAlpha = 1; }
    }
  }
  let openB = (P.z === 0 && !P.jump && !travUp) ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1;  // 환풍구 안이면 그 건물 안이 보인다
  if (openB < 0 && S.peek && !travUp) openB = S.peek.b; S.openB = openB;
  // 자경대원 시야·표시 (옥상 위 자경대원은 옥상을 그린 뒤에 따로)
  const guardOverlay = g => {
    drawWarnRing(g); drawReport(g);
    const fov = guardFov(g), rg = guardRanges(g);
    if (g.civ && g.state === 'SLEEP') { if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return; }
    if (g.state === 'TERROR') { ctx.strokeStyle = `rgba(190,120,255,${0.5 + 0.4 * Math.sin(S.t * 14)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, TAU); ctx.stroke(); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return; }
    const col = g.civ ? (g.state === 'PANIC' ? '232,90,80' : '196,236,190') : g.state === 'ALERT' || g.state === 'FLEE' ? (NEO ? '255,46,136' : '230,70,60') : (g.state === 'NOTICE' || g.state === 'SUSPICIOUS' || g.state === 'SEARCH' || g.state === 'BODY' || g.state === 'CHECK') ? (NEO ? '255,220,60' : '242,196,107') : (NEO ? '70,236,255' : '170,200,235');
    // 시야는 그 자리의 밝기만큼만 뻗는다 (판정 canSee 와 같은 식): 어두운 곳은 짧게, 불빛·손전등 아래는 길게
    // 진한 부분 = 웅크려도 보임 · 옅은 줄무늬 = 서 있으면 보임(웅크리면 안전) · 경계(빨강) 중에는 전부 진하게
    if (DBG.cone) return; const cn = guardCone(g, fov, rg); setLayer(0);
    if (g.civ && !g.wary && g.state !== 'PANIC') {  // 경계하지 않는 주민: 시선만 옅게
      ctx.fillStyle = 'rgba(196,236,190,.05)'; conePaths(g, cn, 1, 2); ctx.fill();
      if (g.bubble && !g.icon) drawEmote(g.bubble, g.x, g.y - 30); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return;
    }
    conePaths(g, cn, 1, 1); ctx.fillStyle = `rgba(${col},.07)`; ctx.fill();
    if (g.state !== 'ALERT') { ctx.globalAlpha = 0.5; ctx.fillStyle = stripeFor(col); ctx.fill(); ctx.globalAlpha = 1; }  // 같은 경로에 줄무늬를 바로 칠한다 (잘라내기 없이)
    conePaths(g, cn, 2, 2); ctx.fillStyle = `rgba(${col},.3)`; ctx.fill(); ctx.strokeStyle = `rgba(${col},.35)`; ctx.lineWidth = 1; ctx.stroke();
    if (g.bubble && !g.icon) drawEmote(g.bubble, g.x, g.y - 30);
    if (g.act === 'smoke') { const t = S.t * 1.5 + g.id; for (let i = 0; i < 3; i++) { const f = (t + i / 3) % 1; ctx.fillStyle = `rgba(210,215,222,${0.35 * (1 - f)})`; ctx.beginPath(); ctx.arc(g.x + Math.cos(g.a) * 14 + f * 8, g.y + Math.sin(g.a) * 14 - f * 16, 3 + f * 5, 0, TAU); ctx.fill(); } }
    // 왜 의심하는지: 들은 곳(귀) / 본 곳(눈) 으로 점선과 표시
    if (g.poi && !g.civ && ['NOTICE', 'SUSPICIOUS', 'SEARCH'].includes(g.state) && !g.reached) {
      ctx.strokeStyle = g.why === 'saw' ? 'rgba(255,120,90,.7)' : 'rgba(242,196,107,.7)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.poi.x, g.poi.y); ctx.stroke(); ctx.setLineDash([]);
      const lab = g.why === 'saw' ? '봤다' : '들었다'; ctx.font = '700 12px "IBM Plex Sans KR", sans-serif'; const tw = ctx.measureText(lab).width + 10;
      ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(g.poi.x - tw / 2, g.poi.y - 9, tw, 18); ctx.fillStyle = g.why === 'saw' ? '#ff8a6a' : '#f2c46b'; ctx.textAlign = 'center'; ctx.fillText(lab, g.poi.x, g.poi.y + 4);
    }
    if (g.state === 'CHECK' && g.checks[0]) { const c = g.checks[0]; ctx.strokeStyle = 'rgba(242,196,107,.6)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); }
    const mk = !g.civ && !g.dog && (g.state === 'ALERT' || g.meter > 0.02 || g.icon === '?' || g.icon === '!');
    if (mk) drawAwareMark(g); else if (g.icon) drawEmote(g.icon, g.x, g.y - 30);
    if (mk && g.icon && g.icon !== '?' && g.icon !== '!') drawEmote(g.icon, g.x + 26, g.y - 30);
  };
  // 높이감: 옥상·전깃줄 위에 있으면 아래 거리가 한층 어둡고 푸르게 가라앉는다 (옥상은 그 위에 밝게 그려진다). 오르내릴 때는 서서히
  if (CITY && !tactical) { const el = P.wire ? Math.max(1, P.z) : P.jump ? Math.max(P.jump.z1 || 0, P.z || 0) : P.trav ? (P.trav.elev || (P.z || 0)) : (P.z || 0);
    const tgt = el > 0 ? Math.min(0.42, 0.22 + el * 0.08) : 0; S.hazeK = (S.hazeK || 0) + (tgt - (S.hazeK || 0)) * 0.12;
    if (S.hazeK > 0.01) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(4,8,20,${S.hazeK})`; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); } }
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.z || g.climb || !gVis(g) || (!tactical && coveredG(g, openB))) continue;
    guardOverlay(g);
  }
  if (!tactical) {
    if (!DBG.roofs) drawRoofs(openB); drawPlanks();
    if (CITY) drawHeardSteps(P, openB, gVis);
    const front = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return BLD.some((b, i) => b.facade && i !== openB && ty === b.y1 + 1 && tx >= b.x0 - 1 && tx <= b.x1 + 1); };
    for (const g of S.guards) if (g.state !== 'DEAD' && !flOf(g) && !g.z && !g.climb && !coveredG(g, openB) && front(g.x, g.y)) drawGuard(g);
    // 옥상 위·벽을 타는 자경대원
    for (const g of S.guards) if (g.state !== 'DEAD' && (g.z || g.climb) && (!flOf(g) || (g.climb && !(g.climb.to.fl && g.climb.from.fl)))) { drawGuard(g); if (!g.climb && g.state !== 'CAPTIVE') guardOverlay(g); else if (g.icon) drawEmote(g.icon, g.x, g.y - 30); }
    if (CITY) drawWindowSight(P, openB);
    if (input.scan && CITY) drawPlansFaint(P, openB);
    if (!P.z && !P.jump && !P.hide && !P.vent && !travUp && front(P.x, P.y)) drawPlayer(P);
  }
  if (S.poles.length) {
    const vx = W / SCALE / 2 + 80, vy = H / SCALE / 2 + 120;
    for (const o of S.poles) if (Math.abs(o.x - cam.x) < vx && Math.abs(o.y - cam.y) < vy) drawPole(o);
    drawWires();
  }
  if (P.z && !P.wire && !P.jump && !P.trav && !tactical && !input.scan) drawBlockEdges(P, false);
  if ((P.z || P.jump || P.wire || travUp) && !P.hide) drawPlayer(P);
  if (P.vent && !tactical) {
    // 환풍구 층: 아래(방)는 어둡게 비치고, 덕트와 창살만 또렷하게
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(3,6,10,.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    ctx.globalAlpha = 0.92; ctx.drawImage(ventC, 0, 0); ctx.globalAlpha = 1;
    for (const v of S.vents) { ctx.strokeStyle = v.roof ? 'rgba(242,196,107,.8)' : 'rgba(127,214,204,.9)'; ctx.lineWidth = 2; ctx.strokeRect(v.x - 13, v.y - 13, 26, 26); ctx.fillStyle = v.roof ? 'rgba(242,196,107,.25)' : 'rgba(127,214,204,.18)'; ctx.fillRect(v.x - 13, v.y - 13, 26, 26); }
    drawPlayer(P);
  }
  setLayer(flOf(P));
  if (S.entrySel) STAGE.entries.forEach((e, i) => { const p = entryPos(e), pulse = 0.6 + 0.4 * Math.sin(S.t * 5 + i); ctx.strokeStyle = `rgba(242,196,107,${pulse})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(242,196,107,.95)'; ctx.font = '700 30px Galmuri, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), p.x, p.y + 10); tag(p.x, p.y - 52, e.name, '#f2c46b'); });
  // 맨홀 속에 숨어 있거나 살피기 중이면 지하 수로·덕트 길을 비춰 보여 준다
  { const P = S.player, inWell = P.hide && P.hide.type === 'well';
    if (running && !P.under && !P.vent && (input.scan || tactical || inWell)) {
      const k = inWell ? 0.5 : 0.36; ctx.globalAlpha = k * (0.8 + 0.2 * Math.sin(S.t * 3)); if (ugC) ctx.drawImage(ugC, 0, 0);
      if (!inWell && ventC) { ctx.globalAlpha = 0.42; ctx.drawImage(ventC, 0, 0); } ctx.globalAlpha = 1;
      if (inWell) for (const h of S.hides) if (h.type === 'well' && h !== P.hide && ugAt(h.tx, h.ty)) { ctx.strokeStyle = 'rgba(150,200,255,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(h.x, h.y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    } }
  if (input.scan && running && !tactical && !flOf(P)) drawBlockEdges(P, true);
  if ((input.scan || tactical) && running) drawScan(openB);
  else if (running && !tactical) { drawNearMarks(P, openB); }
  if (running && CITY && !tactical) drawStairGlow(P, openB);
  if (running && CITY && STAGE.zones) drawZones(P);
  if (running && !tactical) { drawAwareness(S.player); if (!S.over) drawKillBlock(); drawRadioCall(); drawPickProgress(S.player); if (CITY && !flOf(P)) for (const w of S.windows) if (w.st === 'bar' && dist(P.x, P.y, w.x, w.y) < 700 && (onFacadeW(w) || w.b === openB)) drawWinBars(w); }
  if (running && CITY) { drawOpps(P); drawStoryMark(P); drawHoldRing(); if (!tactical) drawCorpseRisk(); }
  if (running && !tactical && STAGE.steps && (S.tutI || 0) < STAGE.steps.length) {  // 연습: 지금 단계의 대상 위에 화살표
    const tg = STAGE.steps[S.tutI][2] && STAGE.steps[S.tutI][2](S); if (tg && tg.x != null) { const k = Math.max(1, 0.95 / SCALE), b = Math.sin(S.t * 5) * 5 * k, y = tg.y - 52 * k + b;
      ctx.fillStyle = '#f2c46b'; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(tg.x - 10 * k, y - 12 * k); ctx.lineTo(tg.x + 10 * k, y - 12 * k); ctx.lineTo(tg.x, y); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.font = `700 ${Math.round(12 * k)}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(tg.x - 16 * k, y - 30 * k, 32 * k, 15 * k); ctx.fillStyle = '#f2c46b'; ctx.fillText('여기', tg.x, y - 19 * k); ctx.textAlign = 'left'; } }
  if (running && !tactical) drawOffscreen();
  // 행동 표시
  if (running && !S.over && !S.entrySel) {
    const pa = primaryAction();
    if (pa.choices > 1) {  // 겹친 대상: 다른 후보는 옅은 점선 고리, 고른 대상 위엔 '1/3 · F/⇄ 바꾸기'
      const pos = a => { const o = actObj(a); if (a.k === 'fdown') return downPt(a.l); if (a.wv) return { x: a.wv.w.x, y: a.wv.w.y }; if (a.n && a.n.u) return { x: tc(a.n.u.at[0]), y: tc(a.n.u.at[1]) }; if (a.k === 'down' && o) return { x: o.rx != null ? o.rx : o.ux, y: o.ry != null ? o.ry : o.uy }; return a.at || (o && o.x != null ? { x: o.x, y: o.y } : null); };
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(242,196,107,.55)';
      for (const o of pa.others) { const p = pos(o); if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, TAU); ctx.stroke(); } }
      ctx.setLineDash([]);
      const p = pos(pa); if (p) { const lab = `${pa.choiceI + 1}/${pa.choices} · ${document.body.classList.contains('touch') ? '⇄' : 'F'} 바꾸기`; ctx.font = '700 11px "IBM Plex Sans KR", sans-serif'; const tw = ctx.measureText(lab).width + 12;
        ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(p.x - tw / 2, p.y + 26, tw, 17); ctx.fillStyle = '#f2c46b'; ctx.textAlign = 'center'; ctx.fillText(lab, p.x, p.y + 38); }
    }
    const ring = (g, col) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 25 + Math.sin(S.t * 10) * 2, 0, TAU); ctx.stroke(); };
    if (pa.list) pa.list.forEach(g => ring(g, '#e8473c'));
    if (pa.k === 'drop' || pa.k === 'ambush' || pa.k === 'ventKill') ring(pa.g, '#e8473c');
    if (pa.k === 'ventIn' || pa.k === 'ventOut') { ctx.strokeStyle = 'rgba(127,214,204,.95)'; ctx.lineWidth = 2.5; ctx.strokeRect(pa.v.x - 20, pa.v.y - 20, 40, 40); }
    if (pa.k === 'smother') { ctx.strokeStyle = 'rgba(240,138,60,.95)'; ctx.lineWidth = 2.5; ctx.strokeRect(pa.l.ux - 22, pa.l.uy - 24, 40, 40); }
    if (pa.k === 'lamp') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pa.l.x, pa.l.y, 16, 0, TAU); ctx.stroke(); }
    if (pa.k === 'door') { ctx.strokeStyle = 'rgba(232,227,214,.85)'; ctx.lineWidth = 2; ctx.strokeRect(pa.d.x - 24, pa.d.y - 24, 48, 48); }
    if (pa.k === 'drag' && pa.h) { ctx.strokeStyle = 'rgba(127,174,134,.9)'; ctx.lineWidth = 2; ctx.strokeRect(pa.h.x - 24, pa.h.y - 24, 48, 48); }
    if (pa.k === 'window') { ctx.strokeStyle = 'rgba(140,190,225,.95)'; ctx.lineWidth = 2; ctx.strokeRect(pa.wv.w.x - 24, pa.wv.w.y - 24, 48, 48); }
    if (pa.k === 'hide') { ctx.strokeStyle = 'rgba(127,174,134,.9)'; ctx.lineWidth = 2; ctx.strokeRect(pa.h.x - 25, pa.h.y - 25, 50, 50); }
    if (pa.k === 'up' || pa.k === 'down') { const l = pa.l; const x = pa.k === 'up' ? l.x : (l.rx != null ? l.rx : l.ux), y = pa.k === 'up' ? l.y : (l.ry != null ? l.ry : l.uy); ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.strokeRect(x - 24, y - 24, 48, 48); }
    if (pa.k === 'leap') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + tc(pa.j.tx)) / 2, (P.y + tc(pa.j.ty)) / 2 - 40, tc(pa.j.tx), tc(pa.j.ty)); ctx.stroke(); ctx.setLineDash([]); ctx.strokeRect(pa.j.tx * TILE + 6, pa.j.ty * TILE + 6, 36, 36); }
    if (pa.k === 'jump') { const s = pa.s; ctx.strokeStyle = 'rgba(232,227,214,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeRect(s[0] * TILE + 6, s[1] * TILE + 6, 36, 36); ctx.setLineDash([]); }
    if (pa.k === 'wireOn') { ctx.strokeStyle = 'rgba(224,176,112,.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pa.at.x, pa.at.y, 16 + Math.sin(S.t * 8) * 2, 0, TAU); ctx.stroke(); }
    if (pa.k === 'fuse') { ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 2; ctx.strokeRect(STAGE.fuse[0] * TILE + 4, STAGE.fuse[1] * TILE + 4, 40, 40); }
    drawActLabels(pa, P);
    const nc = !P.carrying && nearCorpse();
    if (nc) { ctx.strokeStyle = 'rgba(232,227,214,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(nc.x, nc.y, 26, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (input.aiming && input.tool !== 'kunai') {
      const ap = aimPoint();
      if (ap) {
        const col = input.tool === 'coin' ? '242,196,107' : '215,220,230';
        ctx.strokeStyle = `rgba(${col},.85)`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + ap.x) / 2, (P.y + ap.y) / 2 - ap.d * 0.25, ap.x, ap.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ap.x, ap.y, 12, 0, TAU); ctx.stroke();
        if (input.tool === 'stone') { ctx.strokeStyle = `rgba(${col},.25)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ap.x, ap.y, 240, 0, TAU); ctx.stroke(); }
        tag(ap.x, ap.y - 26, `${TOOL_NAME[input.tool]} — 놓으면 던짐`, `rgb(${col})`);
      }
    }
    if (input.aiming && input.queue && input.queue.length) input.queue.forEach((q, i) => {  // 예약한 행동
      const tx = q.tgt ? q.tgt.x : q.pt ? q.pt.x : P.x, ty = q.tgt ? q.tgt.y : q.pt ? q.pt.y : P.y;
      ctx.strokeStyle = 'rgba(127,214,204,.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, 14, 0, TAU); ctx.stroke(); tag(tx, ty - 26, `예약 ${i + 1} · ${TOOL_NAME[q.tool]}`, '#7fd6cc');
    });
    const kt = (input.tool === 'kunai' || input.aiming) ? kunaiTarget() : null;
    if (kt && input.aiming && input.tool === 'kunai') { ctx.strokeStyle = 'rgba(215,219,226,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(kt.x, kt.y); ctx.stroke(); ctx.setLineDash([]); tag(kt.x, kt.y - 28, kt.type === 'lamp' ? '다트 — 조명 깨기' : '다트 — 원격 암살', '#d7dbe2'); }
    if (kt) {
      ctx.save(); ctx.translate(kt.x, kt.y); ctx.rotate(S.t * 1.5); ctx.strokeStyle = 'rgba(215,219,226,.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(14, 0); ctx.lineTo(0, 14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (input.aiming && running && !S.over) {  // 조준하는 동안 세상은 멈춰 있다 — 화면 테두리와 글로 알려 준다
    ctx.strokeStyle = 'rgba(120,190,255,.45)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.fillStyle = 'rgba(8,14,26,.72)'; const lw = 170 * DPR; ctx.fillRect(canvas.width / 2 - lw / 2, canvas.height - 150 * DPR, lw, 26 * DPR);
    ctx.fillStyle = 'rgba(168,220,255,.95)'; ctx.font = `700 ${13 * DPR}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.fillText('시간 멈춤 · 조준 중', canvas.width / 2, canvas.height - 132 * DPR);
  }
  const tgts = [];
  if (S.exitOpen) tgts.push({ x: S.exit.x, y: S.exit.y, c: '#f2c46b' });
  else {
    for (const g of S.guards) if (g.target && g.state !== 'DEAD') tgts.push({ x: g.x, y: g.y, c: '#e8473c' });
    for (const it of S.items) if (!it.got) tgts.push({ x: it.x, y: it.y, c: '#f2c46b' });
  }
  // 화면 밖에서 나를 의심하는 자경대원 방향 (노랑 = 의심, 빨강 = 발각)
  for (const g of S.guards) { if (g.civ || g.state === 'DEAD' || dist(g.x, g.y, S.player.x, S.player.y) > 1100) continue; const al = g.state === 'ALERT'; if (al || g.meter > 0.05 || ['SUSPICIOUS', 'SEARCH', 'NOTICE'].includes(g.state)) tgts.push({ x: g.x, y: g.y, c: awareCol(g), small: true }); }
  for (const t of tgts) {
    const sx = (t.x - cam.x) * SCALE + W / 2, sy = (t.y - cam.y) * SCALE + H / 2, m = t.small ? 30 : 46;
    if (sx < m || sy < m + 70 || sx > W - m || sy > H - m) {
      const a = Math.atan2(sy - H / 2, sx - W / 2);
      const ex = clamp(sx, m, W - m), ey = clamp(sy, m + 70, H - m);
      ctx.save(); ctx.scale(DPR, DPR); ctx.translate(ex, ey); ctx.rotate(a); if (t.small) ctx.scale(0.7, 0.7);
      ctx.fillStyle = t.c; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (input.aiming && running && !S.over) {
    ctx.fillStyle = 'rgba(30,60,110,.22)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,30,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(DPR, DPR); ctx.font = '700 13px "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,220,255,.9)'; ctx.fillText(input.aiming && input.aiming.off ? '여기서 떼면 취소' : isTouch ? '시간 멈춤 — 조이스틱으로 방향·거리, 떼면 던진다 · 버튼 밖으로 끌어 떼면 취소' : '시간 멈춤 — 방향키로 겨누고 X를 떼면 던진다 · Esc 취소', W / 2, H - (isTouch ? 230 : 70)); ctx.restore();
  }
  if (S.flash > 0) { ctx.fillStyle = `rgba(140,10,16,${S.flash * 1.2})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${S.fade * 1.6})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}

