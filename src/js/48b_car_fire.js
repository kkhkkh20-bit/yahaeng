// ---------------------------------------------------------------- 큰 도시: 망가진 차의 연기 · 불 · 폭발 (GTA식)
// 내구성이 절반 아래면 엔진에서 연기, 4분의 1 아래면 불이 붙고 CAR_FIRE_T초 뒤 터진다. 부딪혀 내구성이 다 떨어져도 터진다.
// 폭발: 섬광 · 충격파 · 불덩이 · 파편, 둘레 사람과 차가 다치고 불이 옮겨 붙는다. 불탄 차는 한동안 타오르고 바닥에 그을음이 남는다.
// 큰 도시(STAGE.cityLife)에서만 쓴다. 의뢰 맵의 차는 예전처럼 부서진다.
const CAR_FIRE_T = 5, CAR_BLAST_R = 120;
function carFireUpdate(dt) {
  if (!STAGE.cityLife || !S.vehicles) return;
  const P = S.player, parts = S.fireParts || (S.fireParts = []);
  for (const v of S.vehicles) {
    const near = Math.abs(v.x - cam.x) < 1600 && Math.abs(v.y - cam.y) < 1200;
    if (v.dead) {
      if (v.burn > 0 && near) { const k = Math.min(1, v.burn / 6); if (Math.random() < dt * 60 * k) fireEmit(v, 'fire', 1, { x: v.x + Math.cos(v.a) * rnd(-.4, .4) * (v.len || 92), y: v.y + Math.sin(v.a) * rnd(-.4, .4) * (v.len || 92) }); if (Math.random() < dt * 14) fireEmit(v, 'smoke', 1); }
      continue;
    }
    const k = v.hp / (v.hpMax || 6);
    if (k <= 0.25) {
      if (!v.fireT) { v.fireT = 0.001; if (near) play('kill2', 0.25); }
      v.fireT += dt; if (near && Math.random() < dt * (30 + v.fireT * 14)) fireEmit(v, 'fire', 1);  // 터질 때가 가까울수록 더 크게 탄다
      if (v.fireT >= CAR_FIRE_T) carExplode(v);
    } else v.fireT = 0;
    if (k <= 0.5 && near && Math.random() < dt * (k <= 0.25 ? 14 : 6)) fireEmit(v, 'smoke', 1);
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.2, dt); p.vy = p.vy * Math.pow(0.2, dt) + (p.kind === 'debris' ? 0 : -18 * dt);
  }
  if (parts.length > 700) parts.splice(0, parts.length - 700);
  if (S.booms) S.booms = S.booms.filter(b => S.t - b.t < 0.7);
}
// 엔진(차 앞쪽)에서 입자 하나
function fireEmit(v, kind, n, at) {
  const parts = S.fireParts || (S.fireParts = []), hx = at ? at.x : v.x + Math.cos(v.a) * (v.len || 92) * 0.28, hy = at ? at.y : v.y + Math.sin(v.a) * (v.len || 92) * 0.28;
  for (let k = 0; k < n; k++) {
    const a = rnd(0, TAU), s = kind === 'spark' ? rnd(120, 360) : kind === 'debris' ? rnd(80, 260) : kind === 'blast' ? rnd(30, 150) : rnd(4, 26);
    parts.push({ kind, x: hx + rnd(-8, 8), y: hy + rnd(-8, 8), vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'smoke' ? 14 : 0), t: 0,
      life: kind === 'smoke' ? rnd(1.6, 3) : kind === 'spark' ? rnd(.3, .7) : kind === 'debris' ? rnd(.5, .9) : kind === 'blast' ? rnd(.45, .9) : rnd(.35, .8),
      size: kind === 'smoke' ? rnd(12, 22) : kind === 'blast' ? rnd(30, 58) : kind === 'fire' ? rnd(13, 24) : rnd(2, 4), rot: rnd(0, TAU) });
  }
}
function carExplode(v) {
  if (v.dead) return;
  const P = S.player, mine = P.car === v;
  v.fireT = 0; v.hp = 0;
  carWreck(v); v.burn = 12;
  (S.booms || (S.booms = [])).push({ x: v.x, y: v.y, t: S.t });
  (S.scorch || (S.scorch = [])).push({ x: v.x, y: v.y, r: rnd(46, 58), rot: rnd(0, TAU) }); if (S.scorch.length > 60) S.scorch.shift();
  fireEmit(v, 'blast', 40, v); fireEmit(v, 'fire', 30, v); fireEmit(v, 'spark', 30, v); fireEmit(v, 'debris', 14, v); fireEmit(v, 'smoke', 14, v);
  const d = dist(v.x, v.y, P.x, P.y), near = clamp(1 - d / 900, 0, 1);
  S.shakeT = Math.max(S.shakeT || 0, 0.25 + 0.45 * near); S.flash = Math.max(S.flash || 0, 0.35 * near);
  play('thud', 0.6 + 0.4 * near); play('glass', 0.7 * near); play('metal', 0.5 * near, .6);
  noise(v.x, v.y, 700, 'car', 0);
  // 둘레 사람: 가까우면 죽고 조금 떨어지면 쓰러진다
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.off || flOf(g) || g.z) continue;
    const r = dist(g.x, g.y, v.x, v.y); if (r > CAR_BLAST_R) continue;
    npcDown(g, null, r < CAR_BLAST_R * 0.7); if (typeof bloodBurst === 'function') bloodBurst(g.x, g.y - 10, Math.atan2(g.y - v.y, g.x - v.x), 3);
  }
  if (!P.car && !flOf(P) && !P.z && d < CAR_BLAST_R) { P.hurtT = 0; hurtPlayer(null, '폭발에 휘말렸다.'); if (d < CAR_BLAST_R * 0.6) { P.hurtT = 0; hurtPlayer(null, '폭발에 휘말렸다.'); } }
  // 둘레 차: 크게 망가지고, 가까우면 불이 옮겨 붙는다 (연쇄 폭발)
  for (const o of S.vehicles) {
    if (o === v || o.dead) continue; const r = dist(o.x, o.y, v.x, v.y); if (r > CAR_BLAST_R + 30) continue;
    o.hp = Math.min(o.hp, Math.max(0.5, (o.hpMax || 6) * (r < CAR_BLAST_R * 0.6 ? 0.2 : 0.45))); o.smoke = 2;
    const push = (CAR_BLAST_R + 30 - r) * 1.6, a = Math.atan2(o.y - v.y, o.x - v.x); o.x += Math.cos(a) * push * 0.12; o.y += Math.sin(a) * push * 0.12; o.a += rnd(-0.3, 0.3);
  }
  if (mine) addWanted(1, '차가 터졌다');
}
// 바닥 그을음 (차 밑에): 차보다 먼저 그린다
function drawCarScorch() {
  if (!S.scorch) return;
  for (const s of S.scorch) { if (!inView(s.x, s.y, s.r * 2)) continue;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r); g.addColorStop(0, 'rgba(8,6,6,.75)'); g.addColorStop(.6, 'rgba(14,10,8,.45)'); g.addColorStop(1, 'rgba(14,10,8,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * .78, s.rot, 0, TAU); ctx.fill(); }
}
// 불 · 연기 · 폭발: 어둠 위에 그린다 (불은 스스로 빛난다)
function drawCarFire() {
  if (!S.fireParts?.length && !S.booms?.length) return;
  ctx.save();
  for (const p of S.fireParts) { if (p.kind !== 'smoke' || !inView(p.x, p.y, 60)) continue;
    const f = p.t / p.life, r = p.size * (1 + f * 1.8); ctx.fillStyle = `rgba(52,50,54,${0.42 * (1 - f)})`; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); }
  for (const p of S.fireParts) { if (p.kind !== 'debris' || !inView(p.x, p.y, 20)) continue;
    ctx.fillStyle = '#1a1a1c'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.t * 9); ctx.fillRect(-p.size, -p.size * .6, p.size * 2, p.size * 1.2); ctx.restore(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const b of S.booms || []) { const f = (S.t - b.t) / 0.7; if (!inView(b.x, b.y, 300)) continue;
    const r = 70 + f * 240, g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r); g.addColorStop(0, `rgba(255,240,200,${0.9 * (1 - f)})`); g.addColorStop(.35, `rgba(255,150,40,${0.6 * (1 - f)})`); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,220,170,${0.5 * (1 - f)})`; ctx.lineWidth = 6 * (1 - f) + 1; ctx.beginPath(); ctx.arc(b.x, b.y, 30 + f * 220, 0, TAU); ctx.stroke(); }
  for (const p of S.fireParts) {
    if ((p.kind !== 'fire' && p.kind !== 'blast' && p.kind !== 'spark') || !inView(p.x, p.y, 60)) continue;
    const f = p.t / p.life;
    if (p.kind === 'spark') { ctx.fillStyle = `rgba(255,${200 - f * 120 | 0},90,${1 - f})`; ctx.fillRect(p.x, p.y, 2.5, 2.5); continue; }
    const r = p.size * (p.kind === 'blast' ? 1 + f * 1.4 : 1 - f * 0.5), gcol = f < .35 ? '255,236,170' : f < .7 ? '255,150,50' : '200,60,20';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, `rgba(${gcol},${0.95 * (1 - f * f)})`); g.addColorStop(.45, `rgba(${gcol},${0.55 * (1 - f)})`); g.addColorStop(1, `rgba(${gcol},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  }
  // 타는 차 둘레를 비추는 불빛
  for (const v of S.vehicles) { if (!(v.dead && v.burn > 0 || v.fireT > 0) || !inView(v.x, v.y, 160)) continue;
    const fl = 0.75 + 0.25 * Math.sin(S.t * 23 + v.id), r = 110 * fl, g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r); g.addColorStop(0, `rgba(255,140,50,${0.22 * (v.dead ? Math.min(1, v.burn / 4) : 1)})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(v.x, v.y, r, 0, TAU); ctx.fill(); }
  ctx.restore();
}
