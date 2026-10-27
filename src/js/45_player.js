// ---------------------------------------------------------------- 플레이어
function stepSound(x, y) {
  const t = tileAt(x, y); const v = (Math.random() * 3) | 0;
  if (t === 'w' || t === 'v' || t === 'K' || t === 'E' || t === 'U') return 'step_w' + v;
  if (t === '.' || t === 'B' || t === 'T') return 'step_g' + v;
  if (t === ',' || t === 'r') return 'step_d' + v;
  if (t === 'm') return 'step_w' + v;
  return 'step_c' + v;
}
// 바닥 재질: 유리 조각(x) · 철판(m) · 물웅덩이(p) · 자갈(r) 은 발소리가 커진다
const MAT = { x: 2.3, m: 1.8, p: 1.7, r: 1.45 };
const MAT_NAME = { x: '유리 조각', m: '철판', p: '물웅덩이', r: '자갈' };
function floorMul(x, y, z) { if (z) return 0.6; const t = tileAt(x, y); if (MAT[t]) return MAT[t]; return (t === 'w' || t === 'v') ? 1.25 : (t === '.' || t === 'B') ? 0.75 : t === ',' ? 0.9 : 1; }
function collide(o, r, solid) {
  const tx0 = Math.floor((o.x - r) / TILE), tx1 = Math.floor((o.x + r) / TILE), ty0 = Math.floor((o.y - r) / TILE), ty1 = Math.floor((o.y + r) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!solid(tx, ty)) continue;
    const cx = clamp(o.x, tx * TILE, tx * TILE + TILE), cy = clamp(o.y, ty * TILE, ty * TILE + TILE);
    const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
    if (d < r) { if (d > 0.001) { o.x += dx / d * (r - d); o.y += dy / d * (r - d); } else o.y += r; }
  }
}

const input = { walkLock: (() => { const touch = matchMedia('(pointer: coarse)').matches; try { const v = localStorage.getItem('yh_walkLock'); return v == null ? touch : v === '1'; } catch (e) { return touch; } })()  /* 휴대폰은 처음부터 '항상 걷기' (조이스틱을 끝까지 밀어 뜻하지 않게 뛰지 않게) */, sneakToggle: (() => { try { return localStorage.getItem('yh_sneak') === '1'; } catch (e) { return false; } })(), joy: null, tool: 'stone', aiming: null, scan: false };
const TOOLS = ['stone', 'coin', 'kunai'], TOOL_NAME = { stone: '빈 캔', coin: '담배', kunai: '다트' };
const toolCount = t => { const P = S.player; return t === 'stone' ? P.stones : t === 'coin' ? P.coins : P.kunai; };
function selectTool(t) { if (!TOOLS.includes(t)) return; input.tool = t; if (input.aiming) input.aiming.t0 = performance.now(); syncTools(); play('click', 0.2); }
function cycleTool() { selectTool(TOOLS[(TOOLS.indexOf(input.tool) + 1) % TOOLS.length]); }
function canAim() { const P = S.player; return S && running && !S.over && !paused && !P.hide && !P.jump && !P.trav && !P.under && !P.vent && !P.captive; }
// 도구: 누르고 있으면 조준(이동 입력으로 방향, 오래 누를수록 멀리), 떼면 사용
function startAim(src) { if (!canAim() || tactical) return; input.aiming = { t0: performance.now(), src }; }
function cancelAim() { input.aiming = null; input.queue = []; }
// 동시 행동 예약 (Desperados III 방식): 시간이 멈춘 조준 중 [특수]로 지금 조준을 예약 → 손을 떼면 예약한 것까지 한꺼번에 던진다
function queueAim() {
  const P = S.player; if (!input.aiming) return; input.queue = input.queue || [];
  if (input.queue.length >= 2) { toast('예약은 두 개까지 — 손을 떼면 한꺼번에 실행', 1.6); return; }
  const tool = input.tool, used = input.queue.filter(q => q.tool === tool).length + 1;
  const have = tool === 'stone' ? P.stones : tool === 'coin' ? P.coins : P.kunai;
  if (have - used < 1) { toast(`${TOOL_NAME[tool]}이(가) 모자라다`, 1.4); return; }
  const it = { tool, a: P.a, pt: aimPoint() };
  if (tool === 'kunai') { it.tgt = kunaiTarget(); if (!it.tgt) { toast('노릴 대상이 없다', 1.4); return; }
    if (input.queue.some(q => q.tgt && q.tgt.ref === it.tgt.ref)) { toast('이미 예약한 대상이다', 1.4); return; } }
  input.queue.push(it); play('click', 0.35); input.aiming.t0 = performance.now();
  toast(`행동 예약 ${input.queue.length} — 다른 곳을 겨누고 손을 떼면 한꺼번에`, 1.8);
  hint('queue', '동시 실행: 시간이 멈춘 조준 중 [특수]로 겨눈 것을 예약하고, 다른 곳을 겨눈 뒤 손을 떼면 모두 한꺼번에 던진다 (다트 둘로 자경대원 둘을 동시에)');
}
function runQueued(it) {
  const P = S.player; P.a = it.a;
  if (it.tool === 'stone') actThrow(it.pt); else if (it.tool === 'coin') actCoin(it.pt);
  else if (it.tgt && !(it.tgt.ref && (it.tgt.ref.state === 'DEAD' || it.tgt.ref.broken))) { const g = it.tgt.ref; if (g && g.x != null && it.tgt.type !== 'cam' && it.tgt.type !== 'lamp') { it.tgt.x = g.x; it.tgt.y = g.y; } actKunai(it.tgt); }
}
function aimPoint() {
  const P = S.player, a = input.aiming; if (!a) return null;
  const charge = input.joy && input.joy.mag > 0.15 ? clamp((input.joy.mag - 0.15) / 0.8, 0, 1) : clamp((performance.now() - a.t0) / 900, 0, 1);
  const [lo, hi] = input.tool === 'coin' ? [50, 160] : [90, 330];
  let d = lo + (hi - lo) * charge;
  d = Math.max(16, Math.min(d, castRay(P.x, P.y, P.a, d, input.tool === 'stone' && P.z > 0) - 8));
  return { x: P.x + Math.cos(P.a) * d, y: P.y + Math.sin(P.a) * d, d };
}
function releaseAim() {
  if (!input.aiming) return;
  const pt = aimPoint(); input.aiming = null;
  const q = input.queue || []; input.queue = [];
  if (!canAim()) return;
  if (input.tool === 'stone') actThrow(pt); else if (input.tool === 'coin') actCoin(pt); else actKunai();
  if (q.length) { S.qRun = q; S.qRunT = 0.1; }
  syncTools();
}
// 조이스틱: 살짝 = 살금살금, 반쯤 = 걷기, 끝까지 = 달리기
const JOY_WALK = 0.38, JOY_RUN = 0.86;

function drawRadio(x, y) {  // 무전기: 이 자경대원이 경보를 맵 전체에 퍼뜨린다
  ctx.fillStyle = 'rgba(8,11,18,.85)'; ctx.fillRect(x - 6, y - 8, 12, 15); ctx.fillStyle = '#3a3f48'; ctx.fillRect(x - 4, y - 6, 8, 11);
  ctx.strokeStyle = '#c9cfd8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 2, y - 6); ctx.lineTo(x + 2, y - 14); ctx.stroke();
  ctx.fillStyle = Math.floor(S.t * 2) % 2 ? '#7fe08a' : '#2f6a38'; ctx.fillRect(x - 3, y - 4, 3, 3);
}
// 발소리 반경: 지금 걸음으로 내는 소리가 닿는 거리. 자경대원이 그 안에 있으면 붉게
function drawStepRing(P) {
  const m = P.cover ? 'sneak' : P.mode, r = ({ sneak: 22, walk: 110, run: 250 }[m] + (P.carrying ? 35 : 0)) * (m === 'walk' && perkOn('sole') ? 0.75 : 1) * floorMul(P.x, P.y, P.z) * loudMul(P.x, P.y, flOf(P));
  let heard = false;
  for (const g of S.guards) if (!g.civ && g.state !== 'DEAD' && g.state !== 'CAPTIVE' && flOf(g) === flOf(P) && !(g.z || 0) && dist(g.x, g.y, P.x, P.y) < r * soundThrough(P.x, P.y, g.x, g.y)) { heard = true; break; }
  const a = P.moving ? 1 : 0.55;
  ctx.strokeStyle = heard ? `rgba(240,100,70,${0.6 * a})` : `rgba(220,226,240,${0.2 * a})`; ctx.lineWidth = heard ? 2.5 : 1.5; ctx.setLineDash([5, 7]);
  ctx.beginPath(); ctx.ellipse(P.x, P.y + 6, r, r * 0.92, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  if (heard && P.moving) { ctx.font = '700 12px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(240,100,70,.9)'; ctx.fillText('발소리가 들린다', P.x, P.y + 6 + r * 0.92 + 14); }
}
// 화면 밖에서 나를 보거나 쫓는 자경대원: 화면 가장자리에 화살표
function drawOffscreen() {
  const hw = W / SCALE / 2, hh = H / SCALE / 2, m = 30 / SCALE, sz = 11 / SCALE;
  for (const g of S.guards) {
    if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE') continue;
    if (!(g.seen || g.state === 'ALERT' || g.state === 'NOTICE')) continue;
    const dx = g.x - cam.x, dy = g.y - cam.y; if (Math.abs(dx) < hw - m && Math.abs(dy) < hh - m) continue;
    const k = Math.min((hw - m) / Math.max(1e-6, Math.abs(dx)), (hh - m) / Math.max(1e-6, Math.abs(dy))), ex = cam.x + dx * k, ey = cam.y + dy * k, a = Math.atan2(dy, dx);
    const col = g.state === 'ALERT' ? '232,71,60' : '242,196,107', pz = 0.65 + 0.35 * Math.sin(S.t * 8);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = `rgba(${col},${pz})`; ctx.beginPath(); ctx.moveTo(sz * 1.4, 0); ctx.lineTo(-sz, -sz); ctx.lineTo(-sz * 0.4, 0); ctx.lineTo(-sz, sz); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
// ---- 휘파람: 공짜 유인. 들은 자경대원이 이 자리를 확인하러 온다 (숨은 채·벽에 기댄 채로도 분다)
function sfxWhistle() {
  if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(1350, t); o.frequency.linearRampToValueAtTime(1950, t + 0.12); o.frequency.linearRampToValueAtTime(1500, t + 0.32);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.03); g.gain.setValueAtTime(0.13, t + 0.26); g.gain.linearRampToValueAtTime(0, t + 0.36);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
}
function whistle() {
  if (!S || S.over || paused || !running || DLG.modal || tactical) return;
  const P = S.player; if (P.under || P.vent || P.trav || P.jump || P.wire || P.captive) return;
  if (S.whistleT > 0) return;
  S.whistleT = 2.5; sfxWhistle();
  const x = P.hide ? P.hide.x : P.x, y = P.hide ? P.hide.y : P.y;
  noise(x, y, 230, 'whistle'); S.stats.whistles = (S.stats.whistles || 0) + 1;
  hint('whistle', '휘파람: 들은 자경대원이 이 자리를 확인하러 온다. 화단·쓰레기통·벽 모서리에서 불고 기다렸다가 처치하라');
}
// ---- 옥상 가장자리에 매달리기 · 끌어내리기 · 배관에서 밀어 떨어뜨리기
function ledgeAt(P) {
  if (!P.z || P.wire || P.jump || P.trav || P.carrying || P.captive) return null;
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE), fx = P.x - tx * TILE, fy = P.y - ty * TILE, c = [];
  if (rLv(tx, ty + 1) < P.z && fy > TILE - 24) c.push({ x: 0, y: 1, d: TILE - fy });
  if (rLv(tx, ty - 1) < P.z && fy < 24) c.push({ x: 0, y: -1, d: fy });
  if (rLv(tx + 1, ty) < P.z && fx > TILE - 24) c.push({ x: 1, y: 0, d: TILE - fx });
  if (rLv(tx - 1, ty) < P.z && fx < 24) c.push({ x: -1, y: 0, d: fx });
  c.sort((a, b) => a.d - b.d); return c[0] || null;
}
function groundBelow(x, y, n) {  // 가장자리 바깥으로 처음 나오는 땅 칸
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  for (let k = 1; k <= 4; k++) { const gx = tx + n.x * k, gy = ty + n.y * k; if (inMap(gx, gy) && !rLv(gx, gy) && !roofAt(gx, gy) && !groundSolidP(gx, gy)) return { x: tc(gx), y: tc(gy) }; }
  return null;
}
const ledgeDraw = P => { const n = P.ledge; return { x: P.x + n.x * 20, y: P.y + (n.y > 0 ? 34 : n.y < 0 ? -8 : 10) }; };
function ledgeTarget() {
  const P = S.player; if (!P.ledge) return null; let best = null, bd = 60;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다
 if (['DEAD', 'CAPTIVE', 'ALERT', 'FLEE'].includes(g.state) || g.dog || (g.z || 0) !== P.z || g.climb || g.doomed) continue; const d = dist(P.x, P.y, g.x, g.y); if (d < bd) { bd = d; best = g; } }
  return best;
}
function pushOffTarget() {
  const P = S.player; if (!P.z || P.ledge || P.trav) return null;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다
 const c = g.climb; if (!c || c.kind !== 'climb' || !c.up || (c.to.z || 0) !== P.z || g.state === 'DEAD') continue; if (dist(P.x, P.y, c.to.x, c.to.y) < 72) return g; }
  return null;
}
// 떨어뜨리기: 사고(추락사)로 처리. 몸은 아래 땅으로 떨어진다
function fallKill(g, from, to) {
  g.climb = null; g.z = 0; g.fl = 0; g.x = to.x; g.y = to.y; accidentKill(g, 'fall');
  const c = S.corpses[S.corpses.length - 1]; if (c) { c.x = from.x; c.y = from.y; c.fly = { x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, dur: 0.45 }; }
  S.stats.special++; S.hitStop = 0.06;
}
// ---- 벽에 기대기 · 끌어당겨 암살
function coverAt(P, prev) {
  if (P.wire || P.jump || P.hide || P.vent || P.under || P.trav || P.ledge) return null;
  // 옥상 위: 옥탑방·물탱크·계단실 벽에만 기댄다 (옥상 끝은 기댈 벽이 아니다)
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE), fx = P.x - tx * TILE, fy = P.y - ty * TILE, sol = P.z ? (x, y) => robAt(x, y) && lvAt(x, y) === P.z : groundSolidP, c = [];
  const kd = (x, y) => { if (P.z) return 'wall'; const ch = inMap(x, y) ? G0[y][x] : '#'; return ch === 'T' ? 'tree' : ch === 'A' ? 'car' : 'wall'; };
  if (sol(tx, ty - 1) && fy < 22) c.push({ x: 0, y: 1, d: fy, kind: kd(tx, ty - 1) });
  if (sol(tx, ty + 1) && fy > TILE - 22) c.push({ x: 0, y: -1, d: TILE - fy, kind: kd(tx, ty + 1) });
  if (sol(tx - 1, ty) && fx < 22) c.push({ x: 1, y: 0, d: fx, kind: kd(tx - 1, ty) });
  if (sol(tx + 1, ty) && fx > TILE - 22) c.push({ x: -1, y: 0, d: TILE - fx, kind: kd(tx + 1, ty) });
  if (prev) { const same = c.find(o => o.x === prev.x && o.y === prev.y); if (same) return same; }
  c.sort((a, b) => a.d - b.d); return c[0] || null;
}
function enterCover(n, quiet) {
  const P = S.player; P.cover = { x: n.x, y: n.y, kind: n.kind }; P.coverPush = 0; P.idleWall = 0; P.vx = 0; P.vy = 0; P.a = Math.atan2(n.y, n.x); play('cloth', quiet ? 0.12 : 0.22);
  hint('cover', '벽에 기댐: 몸을 붙여 덜 보인다. 벽을 따라 옆걸음만 하고, 벽 반대쪽으로 밀면 떨어진다. 나를 못 본 채 옆을 지나는 사람은 [끌어당겨 암살]');
}
// 기댄 자리 옆을 지나는, 나를 보지 못한 사람
function coverTarget() {
  const P = S.player; if (!P.cover || P.strikeT > 0 || S.pull) return null;
  let best = null, bd = perkOn('reach') ? 120 : 100;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (['DEAD', 'CAPTIVE', 'ALERT', 'FLEE', 'TERROR'].includes(g.state) || g.dog || (g.z || 0) !== (P.z || 0) || g.climb || g.doomed || (g.seen && g.meter > 0.6) || flOf(g) !== flOf(P)) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d < bd && los(P.x, P.y, g.x, g.y, P.z || 0)) { bd = d; best = g; }
  }
  return best;
}
function updatePull(dt) {
  const L = S.pull; L.t += dt; const f = Math.min(1, L.t / L.dur), e = f * f, g = L.g;
  g.x = L.x0 + (L.x1 - L.x0) * e; g.y = L.y0 + (L.y1 - L.y0) * e;
  if (f >= 1) {
    S.pull = null; g.doomed = false;
    if (g.state !== 'DEAD') { killGuard(g, null, null, true); S.hitStop = 0.08; if (!g.civ) { S.stats.special++; toast(lastKO() ? '벽 뒤로 끌어당겨 기절' : '벽 뒤로 끌어당겨 암살', 1.6, 'good'); } }
  }
}
// 몸으로 오르고 넘는 동작: 순간이동하지 않고 정해진 길을 따라 시간을 들여 움직인다
// o: { pts: [{x, y, f}], dur, phases: [{to, pose}], face, base: {x, y}, step, end }
function startTrav(o) {
  const P = S.player; if (o.hideB) P.hideFrom = { x: P.x, y: P.y }; P.trav = Object.assign({ t: 0, st: 0 }, o); P.vx = 0; P.vy = 0; P.moving = true; S.qBuf = 0;
}
function travPose(T) {
  const f = Math.min(1, T.t / T.dur); let lo = 0;
  for (const ph of T.phases) { if (f <= ph.to + 1e-6) return { pose: ph.pose, g: (f - lo) / Math.max(1e-6, ph.to - lo) }; lo = ph.to; }
  const ph = T.phases[T.phases.length - 1]; return { pose: ph.pose, g: 1 };
}
function updateLedge(P, dt) {
  const k = S.keys, n = P.ledge; let mx = 0, my = 0;
  if (k.ArrowLeft) mx -= 1; if (k.ArrowRight) mx += 1; if (k.ArrowUp) my -= 1; if (k.ArrowDown) my += 1;
  if (input.joy && input.joy.mag > 0.1) { mx = input.joy.x; my = input.joy.y; }
  const mag = Math.hypot(mx, my); P.moving = false; P.hidden = false; P.light = lightAt(P.x, P.y, true);
  if (mag < 0.15) { P.ledgeLock = false; return; }
  const into = (mx * -n.x + my * -n.y) / mag, out = -into;
  if (into > 0.6 && !P.ledgeLock) { const n0 = P.ledge, d = ledgeDraw(P); P.ledge = null; play('cloth', 0.3);  // 다시 올라서기
    startTrav({ pts: [{ x: d.x, y: d.y, f: 0 }, { x: P.x - n0.x * 6, y: P.y - n0.y * 6, f: 1 }], dur: 0.38, phases: [{ to: 1, pose: 'vault' }], face: Math.atan2(-n0.y, -n0.x) }); return; }
  if (out > 0.6 && !P.ledgeLock) { const gb = P.z === 1 ? groundBelow(P.x, P.y, n) : null;  // 1층 옥상이면 손을 놓고 내려간다
    if (gb) { const d = ledgeDraw(P); P.ledge = null; P.jump = { x0: d.x, y0: d.y, x1: gb.x, y1: gb.y, t: 0, dur: 0.3, z1: 0, arc: 4, noise: 70 }; P.z = 0; } return; }
  const al = mx * -n.y + my * n.x; if (Math.abs(al) / mag < 0.4) return;  // 옆으로 이동 (가장자리가 이어지는 곳까지)
  const nx = P.x + -n.y * Math.sign(al) * 52 * dt, ny = P.y + n.x * Math.sign(al) * 52 * dt, ox = P.x, oy = P.y;
  P.x = nx; P.y = ny; const e = ledgeAt(P);
  if (!e || e.x !== n.x || e.y !== n.y || rLv(Math.floor(nx / TILE), Math.floor(ny / TILE)) !== P.z) { P.x = ox; P.y = oy; return; }
  P.moving = true; P.stepT -= dt; if (P.stepT <= 0) { P.stepT = 0.5; play('cloth', 0.08); }
}
function updateTrav(P, dt) {
  const T = P.trav; T.t += dt; const f = Math.min(1, T.t / T.dur), pts = T.pts;
  let i = 0; while (i < pts.length - 2 && f > pts[i + 1].f) i++;
  const a = pts[i], b = pts[i + 1], r = Math.max(0, Math.min(1, (f - a.f) / Math.max(1e-6, b.f - a.f)));
  P.x = a.x + (b.x - a.x) * r; P.y = a.y + (b.y - a.y) * r; P.moving = true; P.hidden = false;
  const bp = T.base || P; P.light = lightAt(bp.x, bp.y, false);
  if (T.step && (T.st -= dt) <= 0 && travPose(T).pose === 'climb') { T.st = 0.3; play(T.step, 0.16); noise(bp.x, bp.y, T.loud || 40, 'climb'); }
  if (f >= 1) { P.trav = null; P.moving = false; if (T.end) T.end(); }
}
function updatePlayer(dt) {
  const P = S.player, k = S.keys;
  if (S.keypad) { P.moving = false; if (dist(P.x, P.y, S.keypad.d.x, S.keypad.d.y) > 90 || S.over) closeKeypad(); return; }
  if (P.trav) { updateTrav(P, dt); return; }
  if (P.ledge) { updateLedge(P, dt); return; }
  if (P.grabIn) { updateGrabIn(P, dt); return; }
  if (P.lunge) {
    const L = P.lunge; L.t += dt; const f = Math.min(1, L.t / L.dur), e = 1 - (1 - f) * (1 - f);
    P.x = L.x0 + (L.x1 - L.x0) * e; P.y = L.y0 + (L.y1 - L.y0) * e; P.moving = true; P.mode = 'run'; P.vx = 0; P.vy = 0;
    if (f >= 1) { P.lunge = null; P.moving = false; collide(P, P.z ? 10 : 13, solidFor(P.z || 0)); if (L.list.every(g => g.state !== 'DEAD')) strikeKill(L.list, L.two); else L.list.forEach(g => { g.doomed = false; }); }
    return;
  }
  let mx = 0, my = 0;
  if (k.ArrowLeft) mx -= 1; if (k.ArrowRight) mx += 1;
  if (k.ArrowUp) my -= 1; if (k.ArrowDown) my += 1;
  let mag = Math.hypot(mx, my);
  // 기본은 걷기. 살금 모드를 켜 두면 계속 살금살금 (키보드 Shift만 잠깐 달리기)
  const shiftRun = (k.ShiftLeft || k.ShiftRight) && mag > 0;
  let mode = shiftRun ? 'run' : 'walk';
  if (input.joy && input.joy.mag > 0.1) {
    mx = input.joy.x; my = input.joy.y; mag = input.joy.mag;
    mode = mag < JOY_RUN ? 'walk' : 'run';
  }
  if (input.sneakToggle && !shiftRun) mode = 'sneak';
  if (input.walkLock && mode === 'run') mode = 'walk';  // 걷기 고정: 뛰지 않는다
  if ((P.carrying || P.captive) && mode === 'run') mode = 'walk';
  if (P.captive) {
    const g = P.captive; g.captT += dt;
    if ((g.squirm = (g.squirm || 0) - dt) <= 0) { g.squirm = 1.4; noise(g.x, g.y, 55, 'struggle'); play('cloth', 0.25); }
    if (g.captT > 9) { P.captive = null; g.state = 'PATROL'; g.meter = 1; goAlert(g); toast('붙잡은 자경대원이 몸부림쳐 빠져나갔다!', 2.6, 'warn'); }
  }
  if (P.wire || P.jump || P.under || P.vent || P.hide) { P.vx = 0; P.vy = 0; }
  if (P.z > 0 && !P.wire && !P.jump && facadeRow(Math.floor(P.x / TILE), Math.floor(P.y / TILE))) P.y = roofEdgeY(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  if (P.wire && !P.jump) { updateWire(P, mx, my, mag, mode, dt); return; }
  if (P.pick) { updatePick(P, mag, dt); return; }
  if (P.jump) {
    const j = P.jump; j.t += dt; const f = Math.min(1, j.t / j.dur);
    P.x = j.x0 + (j.x1 - j.x0) * f; P.y = j.y0 + (j.y1 - j.y0) * f;
    if (f >= 1) { P.jump = null; P.z = j.z1; play('land', j.noise ? 0.25 : 0.4); noise(P.x, P.y, (j.noise || (j.z1 ? 70 : 120)) * floorMul(P.x, P.y, j.z1), 'land'); if (j.killG && j.killG.state !== 'DEAD') { const g = j.killG; P.strikeT = 0.35; P.a = Math.atan2(g.y - P.y, g.x - P.x); killGuard(g); if (!g.civ) { S.stats.special++; toast(lastKO() ? '창문 넘어 기절' : '창문 넘어 암살', 1.8, 'good'); } collide(P, 13, groundSolidP); } }
    P.light = lightAt(P.x, P.y, true); P.hidden = false; P.moving = true;
    return;
  }
  if (P.under) {
    P.mode = mode === 'run' ? 'walk' : mode; P.hidden = true; P.light = 0;
    P.moving = mag > 0.05;
    if (P.moving) {
      const nx = mx / mag, ny = my / mag, sp = SPD[P.mode] * 1.05;
      P.x += nx * sp * dt; P.y += ny * sp * dt;
      const sol = (tx, ty) => !ugAt(tx, ty);
      collide(P, 11, sol); collide(P, 11, sol);
      P.a += clamp(angDiff(P.a, Math.atan2(ny, nx)), -12 * dt, 12 * dt);
      P.stepT -= dt; if (P.stepT <= 0) { P.stepT = 0.45; play('step_c' + ((Math.random() * 3) | 0), 0.12, 0.8); }
    }
    hint('sewer', '지하 수로: 자경대원은 내려오지 않는다. 다른 맨홀 아래에서 [올라가기]');
    return;
  }
  if (P.vent) {
    const fast = mode !== 'sneak'; P.mode = fast ? 'walk' : 'sneak'; P.hidden = true; P.light = 0;
    P.moving = mag > 0.05;
    if (P.moving) {
      const nx = mx / mag, ny = my / mag, sp = fast ? 92 : 52;
      P.x += nx * sp * dt; P.y += ny * sp * dt;
      const sol = (tx, ty) => !ventAt(tx, ty);
      collide(P, 10, sol); collide(P, 10, sol);
      P.a += clamp(angDiff(P.a, Math.atan2(ny, nx)), -12 * dt, 12 * dt);
      P.stepT -= dt; if (P.stepT <= 0) { P.stepT = fast ? 0.4 : 0.62; if (fast) { play('step_m' + ((Math.random() * 3) | 0), 0.4); noise(P.x, P.y, 150, 'vent'); } else play('step_m' + ((Math.random() * 3) | 0), 0.06, 0.8); }
    }
    hint('vent', '환풍구: 살금살금(조이스틱 살짝)은 조용하다. 서두르면 쇠 덕트가 울려 아래 자경대원이 듣는다. 창살 밑을 지나는 자경대원은 [끌어올려 암살]');
    return;
  }
  if (P.hide) {
    P.mode = 'sneak'; P.moving = false; P.hidden = true; P.light = 0;
    if (mag > 0.5 && !S.hideExitLock) leaveHide({ x: mx / mag, y: my / mag });
    hint('hideDir', '숨은 상태에서 조이스틱(방향키)을 밀면 그 방향으로 빠져나온다');
    if (mag < 0.1) S.hideExitLock = false;
    if (P.hide && P.hide.type === 'well') hint('well', '맨홀 안: 지나가는 자경대원을 끌어들여 암살하거나, [지하로]를 눌러 지하 수로를 걸어서 이동한다');
    return;
  }
  if (P.hurtT > 0) P.hurtT -= dt;
  P.mode = mode;
  if (input.aiming) {
    if (!canAim()) input.aiming = null;
    else { if (mag > 0.05) P.a += clamp(angDiff(P.a, Math.atan2(my, mx)), -9 * dt, 9 * dt); mag = 0; hint('aim', '집중: 조준하는 동안 시간이 멈춘다. 방향을 잡고, 오래 누를수록 멀리 던진다. 떼면 사용'); }
  }
  if (P.strikeT > 0) { P.strikeT = Math.max(0, P.strikeT - dt); mag = 0; }  // 0 아래로 내려가면 '공격 중'으로 남아 벽 기대기가 막혔다
  // 벽에 기대기: 벽(가구·차 포함) 쪽으로 잠깐 밀면 등을 붙인다. 기댄 채로는 벽을 따라 옆걸음만, 벽에서 떨어지는 쪽으로 밀면 나온다
  if (P.cover) {
    const n = coverAt(P, P.cover), away = mag > 0.05 ? (mx * P.cover.x + my * P.cover.y) / mag : 0;
    const into = mag > 0.05 ? -(mx * P.cover.x + my * P.cover.y) / mag : 0;
    if (!n || away > 0.45 || P.carrying || P.captive || mode === 'run' || (P.cover.auto && mag > 0.05 && into < 0.7)) { P.cover = null; }
    else { P.cover = Object.assign(n, { auto: P.cover.auto && !(mag > 0.05 && into >= 0.7) }); mode = 'sneak'; P.mode = 'sneak'; if (mag > 0.05) { const al = mx * -n.y + my * n.x; mx = -n.y * al; my = n.x * al; mag = Math.abs(al); if (mag < 0.2) mag = 0; } }
  } else if (mag > 0.05 && mode !== 'run' && !P.carrying && !P.captive && (!P.z || ROB) && !P.strikeT) {
    P.idleWall = 0;
    const n = coverAt(P); if (n && (mx * n.x + my * n.y) / mag < -0.92) { P.coverPush = (P.coverPush || 0) + dt; if (P.coverPush > 0.42) { enterCover(n); mag = 0; } } else P.coverPush = 0;  // 벽을 향해 거의 똑바로 잠깐 밀어야 기댄다 (비스듬히 걸을 땐 안 걸린다)
  } else {
    P.coverPush = 0;
    // 벽에 붙어 멈추면 저절로 기댄다 (움직이면 바로 떨어진다)
    if (mag <= 0.05 && mode !== 'run' && !P.carrying && !P.captive && (!P.z || ROB) && !P.strikeT && !P.pick && !input.aiming) {
      const n = coverAt(P); if (n) { P.idleWall = (P.idleWall || 0) + dt; if (P.idleWall > 0.22) { enterCover(n, true); P.cover.auto = true; } } else P.idleWall = 0;
    } else P.idleWall = 0;
  }
  // 조작감: 아주 짧은 가속·감속(무게감), 모서리에 걸리면 옆으로 미끄러져 빠져나간다
  if (P.adrenT > 0) P.adrenT -= dt;
  const sp0 = SPD[mode] * (P.adrenT > 0 ? 1.3 : 1) * (mode === 'sneak' && perkOn('shadow') ? 1.2 : 1) * (P.carrying ? 0.6 : P.captive ? DRAG_SPD : 1) * (STAGE.pspd || 1);
  const tvx = mag > 0.05 ? mx / mag * sp0 : 0, tvy = mag > 0.05 ? my / mag * sp0 : 0;
  const kk = 1 - Math.exp(-dt * (mag > 0.05 ? 24 : 30));
  P.vx = (P.vx || 0) + (tvx - (P.vx || 0)) * kk; P.vy = (P.vy || 0) + (tvy - (P.vy || 0)) * kk;
  if (Math.hypot(P.vx, P.vy) < 4 && mag <= 0.05) { P.vx = 0; P.vy = 0; }
  P.moving = mag > 0.05;
  if (P.moving || P.vx || P.vy) {
    const nx = mag > 0.05 ? mx / mag : 0, ny = mag > 0.05 ? my / mag : 0;
    const sp = sp0;
    const solid = solidFor(P.z), rad = P.z ? 10 : 13, ox = P.x, oy = P.y;
    P.x += P.vx * dt; P.y += P.vy * dt;
    collide(P, rad, solid); collide(P, rad, solid);
    if (P.moving && Math.hypot(P.x - ox, P.y - oy) < sp * dt * 0.35) {
      // 막힌 방향의 양옆을 살펴 비어 있는 쪽으로 밀어 준다 (문틀·골목 입구에서 걸리지 않게)
      const ax = Math.abs(nx) >= Math.abs(ny), px = ax ? 0 : 1, py = ax ? 1 : 0, fx = ax ? Math.sign(nx) : 0, fy = ax ? 0 : Math.sign(ny);
      for (const sgn of [1, -1]) {
        const tx = Math.floor((P.x + fx * (rad + 6) + px * sgn * 18) / TILE), ty = Math.floor((P.y + fy * (rad + 6) + py * sgn * 18) / TILE);
        const sx2 = Math.floor((P.x + px * sgn * 18) / TILE), sy2 = Math.floor((P.y + py * sgn * 18) / TILE);
        if (!solid(tx, ty) && !solid(sx2, sy2)) { P.x += px * sgn * sp * dt * 0.9; P.y += py * sgn * sp * dt * 0.9; collide(P, rad, solid); break; }
      }
    }
    if (!P.moving) { P.x = clamp(P.x, 14, MW * TILE - 14); P.y = clamp(P.y, 14, MH * TILE - 14); }
    P.x = clamp(P.x, 14, MW * TILE - 14); P.y = clamp(P.y, 14, MH * TILE - 14);
    if (P.moving) P.a += clamp(angDiff(P.a, Math.atan2(ny, nx)), -14 * dt, 14 * dt);
    P.stepT -= dt;
    if (P.moving && P.stepT <= 0) {
      P.stepT = { sneak: 0.56, walk: 0.4, run: 0.28 }[mode];
      const r = ({ sneak: 22, walk: 110, run: 250 }[mode] + (P.carrying ? 35 : 0)) * (mode === 'walk' && perkOn('sole') ? 0.75 : 1) * floorMul(P.x, P.y, P.z);
      play(P.z ? 'step_w' + ((Math.random() * 3) | 0) : stepSound(P.x, P.y), { sneak: 0.12, walk: 0.32, run: 0.55 }[mode] * (P.z ? 0.7 : 1));
      { const mt = P.z ? null : tileAt(P.x, P.y); if (MAT[mt]) { play(mt === 'x' ? 'glass' : mt === 'm' ? 'metal' : mt === 'p' ? 'drop' : 'step_d0', mt === 'x' ? 0.18 : 0.14, mt === 'p' ? 1.7 : 1.5); hint('mat', '바닥 재질: 유리 조각·철판·물웅덩이·자갈은 발소리가 커진다(살금살금이어도 유리는 들린다). 돌아가거나 천천히'); } }
      if (P.carrying) play('cloth', 0.12);
      noise(P.x, P.y, r, 'step');
    }
  }
  P.hidden = P.z === 0 && tileAt(P.x, P.y) === 'B';
  if (P.hidden !== !!S._wasBush) { S._wasBush = P.hidden; S.bushShake = { x: tc(Math.floor(P.x / TILE)), y: tc(Math.floor(P.y / TILE)), t: S.t }; play('cloth', 0.12); }  // 화단에 드나들면 잎이 흔들린다
  P.light = lightAt(P.x, P.y, P.z > 0);
  if (P.captive && !P.grabIn) { const g = P.captive, o = pairGrab(P) ? 10 : 22; g.x = P.x + Math.cos(P.a) * o; g.y = P.y + Math.sin(P.a) * o; g.a = P.a; }
  if (P.carrying) {
    const c = P.carrying; c.fl = flOf(P); const sh = pairCarry(P), bx = sh ? P.x : P.x - Math.cos(P.a) * 24, by = sh ? P.y - 1 : P.y - Math.sin(P.a) * 24;
    c.x += (bx - c.x) * Math.min(1, dt * (sh ? 30 : 10)); c.y += (by - c.y) * Math.min(1, dt * (sh ? 30 : 10)); c.a = P.a + Math.PI;
    c.light = lightAt(c.x, c.y);
  }
  if (S.keyDrop && P.z === 0 && flOf(P) === (S.keyDrop.fl || 0) && dist(P.x, P.y, S.keyDrop.x, S.keyDrop.y) < 34) { const k = S.keyDrop.key || 'gold'; S.keyDrop = null; giveKey(k, keyName(k) + '을(를) 주웠다'); bark('hero', 'key'); }
  for (const it of S.keyItems || []) if (!it.got && !P.z && !P.under && !P.vent && flOf(P) === it.fl && dist(P.x, P.y, it.x, it.y) < 34) { it.got = true; giveKey(it.key, keyName(it.key) + '을(를) 찾았다'); }
  for (const it of S.items) if (!it.got && P.z === 0 && flOf(it) === flOf(P) && dist(P.x, P.y, it.x, it.y) < 32) {
    it.got = true; play('switch', 0.6); play('cloth', 0.3); if (!S.stats.gotAs) S.stats.gotAs = disguised() ? P.outfit : P.item && P.item.permit ? P.item.permit : 'self';  // 어떤 신분으로 훔쳤나 (도전 과제)
    const left = S.items.filter(i => !i.got).length;
    { const nm = STAGE.itemName || '서류'; toast(left ? `${nm} 회수 — 남은 것 ${left}개` : `${nm} 회수 완료 — 탈출 지점으로`, 3, 'good'); }
  }
  if (P.z >= 3) hint('top', '3층 옥상: 멀리 보이고 자경대원이 거의 올려다보지 못한다. 너무 높아서 낙하 암살은 안 된다');
  if (P.z) {
    hint('roof', '옥상 위: 자경대원은 위를 잘 보지 않는다. 단, 망꾼은 옥상을 똑바로 본다. 아래 자경대원 가까이 가면 [낙하 암살]');
    if (jumpTarget()) hint('gap', '골목 건너편 옥상을 향해 서면 [건너뛰기]로 넘어간다 (같은 높이나 한 층 아래만)');
    if (P.z === 2) hint('high', '2층 옥상: 땅으로 바로 뛰어내릴 수 없다. 1층 옥상으로 내려가거나 배관을 이용하라');
  }
  else {
    if (P.hidden) hint('bush', '화단 속에선 바로 옆이 아니면 보이지 않는다');
    if (P.light < 0.25 && !P.hidden) hint('dark', '어둠 속에선 자경대원 시야가 크게 줄어든다 (원뿔의 진한 안쪽만 위험)');
    const nh = nearHide();
    if (nh && nh.furn) hint('furnHide', '옷장·침대 밑·사물함: [숨기]로 들어가고, 시체를 메고 [넣기]로 하나씩 숨긴다. 지나가는 사람을 끌어들여 처치할 수도 있다. 수색하는 자경대원은 가까운 가구도 열어 본다');
    if (nh && nh.type === 'box') hint('box', CITY ? '쓰레기통: [숨기]로 들어가 숨고, 시체를 메고 와서 [넣기]로 버린다 (2구까지)' : '은신 수거함: [숨기]로 들어가고, 시체를 업고 [넣기]로 보관한다');
    if (nh && nh.type === 'well') hint('well0', STAGE.well === 'manhole' ? '맨홀: 숨어서 기습 암살하거나 다른 맨홀로 이동할 수 있다' : '맨홀: 숨어서 기습 암살하거나 다른 출구로 이동할 수 있다');
    const cl = nearClimb(); if (cl) hint(cl.gas ? 'gas' : cl.kind, cl.kind === 'balc' ? '베란다: 난간을 붙잡고 2층으로 오른다. 안에서는 같은 창 앞에서 [베란다로 나가 내려가기]' : cl.gas ? '가스관: 정면 벽 노란 배관을 타고 옥상까지 오른다' : cl.kind === 'pipe' ? '배관: [오르기]로 건물 옥상까지 타고 오른다' : '사다리: [오르기]로 옥상에 올라간다');
    const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
    if (N8.some(o => inMap(tx + o[0], ty + o[1]) && G[ty + o[1]][tx + o[0]] === 'S')) hint('secret', '벽에 금이 간 곳은 숨겨진 통로다. 그대로 걸어 들어가면 지나갈 수 있다 (자경대원은 모른다)');
    if (bldAt(tx, ty) >= 0) hint('inside', '건물 안은 들어가야 다 보인다. 밖에서는 창문·열린 문 너머로 보이는 만큼과 소리로만 알 수 있다');
  }
  updateWindowView(P);
  checkObjective();
  if (S.exitOpen && P.z === 0 && !flOf(P) && dist(P.x, P.y, S.exit.x, S.exit.y) < S.exit.r && !S.over) endGame(true);
}
// 창문 앞에서 창문 쪽을 바라보고 있으면 그 건물 안이 보인다
function updateWindowView(P) {
  const was = S.peek; S.peek = null;
  if (P.z || P.fl || P.hide || P.vent || P.under || P.jump) return;
  if (bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) >= 0) return;
  let best = null, bd = 76;
  for (const w of S.windows) {
    const b = bldAt(w.tx, w.ty); if (b < 0) continue;
    const d = dist(P.x, P.y, w.x, w.y); if (d >= bd) continue;
    if (Math.abs(angDiff(P.a, Math.atan2(w.y - P.y, w.x - P.x))) > 0.9) continue;
    bd = d; best = { w, b };
  }
  S.peek = best;
  if (best && !was) { play('cloth', 0.12); hint('peek', '창문 쪽을 바라보면 안이 보인다. 고개를 돌리면 다시 가려진다'); }
}
