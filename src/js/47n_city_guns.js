// ---------------------------------------------------------------- 자유 모드 무기: 권총 · 기관단총 · 산탄총 · 수류탄 · 화염병
// 조직 연락책(호감도 0 이상)에게 산다. L(또는 화면의 무기 칩)로 바꾼다. [공격]은 붙잡을 사람이 손 닿는 데 없을 때 쏜다.
// 조준: 앞쪽 70° 안, 420px 안의 가장 가까운 사람(경찰·조직원 먼저)을 자동으로 노린다. 없으면 바라보는 쪽으로.
// 총알은 즉시 맞는 선(벽에서 멈춤): 사람은 한 방(산탄은 퍼짐), 차는 내구성을 깎아 터지기도 한다. 총소리는 멀리 들려 신고·경찰을 부른다.
// 수류탄: 1.2초 뒤 폭발(havocBlast). 화염병: 떨어진 자리에 8초 불바다 — 들어온 사람에게 불이 붙고 차가 탄다.
// 통쾌: 2초 안 연속 처치는 '더블! 트리플! 쿼드라!' + 짧은 느린 화면, 총구 불꽃(PixelFX)·탄피·피.
const WEAPONS = {
  pistol: { name: '권총', rate: 0.28, dmg: 1, spread: 0.03, pellets: 1, range: 520, sound: 1, ammo: 24, price: 300 },
  smg: { name: '기관단총', rate: 0.09, dmg: 1, spread: 0.08, pellets: 1, range: 460, sound: 0.8, ammo: 60, price: 800, burst: 3 },
  shotgun: { name: '산탄총', rate: 0.8, dmg: 1, spread: 0.22, pellets: 6, range: 300, sound: 1.4, ammo: 16, price: 600 },
  grenade: { name: '수류탄', rate: 0.9, throw: true, ammo: 3, price: 250 },
  molotov: { name: '화염병', rate: 0.8, throw: true, ammo: 3, price: 150 } };
const WPN_ORDER = ['pistol', 'smg', 'shotgun', 'grenade', 'molotov'];
function gunsInit() { S.guns = Object.assign({}, S.gunsSaved || {}); S.wpn = S.wpnSaved && S.guns[S.wpnSaved] > 0 ? S.wpnSaved : null; S.gunT = 0; S.tracers = []; S.firePools = []; S.nades = []; S.kills = { n: 0, t: -9 }; gunChip(); }
const wpnOn = () => STAGE.cityLife && S.wpn && (S.guns[S.wpn] || 0) > 0;
function cycleWeapon() {
  if (!STAGE.cityLife || !S.guns) return; const have = WPN_ORDER.filter(k => (S.guns[k] || 0) > 0); if (!have.length) { S.wpn = null; gunChip(); evBanner('무기가 없다 — 조직 연락책에게 산다'); return; }
  const i = have.indexOf(S.wpn); S.wpn = i < 0 ? have[0] : i === have.length - 1 ? null : have[i + 1]; play('click', 0.4); gunChip(); evBanner(S.wpn ? `${WEAPONS[S.wpn].name} · ${S.guns[S.wpn]}` : '맨손', '#e8d070');
}
// 화면의 무기 칩 (공격 버튼 위): 누르면 바꾼다
function gunChip() {
  let el = document.getElementById('wpnChip'); if (!STAGE.cityLife) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('button'); el.id = 'wpnChip'; el.type = 'button'; el.style.cssText = 'position:fixed;right:58px;bottom:calc(env(safe-area-inset-bottom,0px) + 214px);z-index:35;padding:6px 10px;background:rgba(12,14,20,.82);color:#efe6cf;border:1px solid #4a5160;border-radius:6px;font:600 13px "Yahaeng UI",sans-serif;pointer-events:auto';
    el.addEventListener('click', e => { e.stopPropagation(); cycleWeapon(); }); document.body.appendChild(el); }
  const arm = S.player.armor > 0 ? ` · 조끼 ${S.player.armor}` : '';
  el.textContent = (S.wpn ? `${WEAPONS[S.wpn].name} ${S.ramp && S.ramp.wpn === S.wpn ? '∞' : S.guns[S.wpn]}` : '맨손 ⇄') + arm; el.hidden = !Object.values(S.guns || {}).some(n => n > 0) && !arm;
}
// [공격]이 총을 쏠 차례인가: 붙잡을 사람이 손 닿는 데 없을 때
function gunAttack() {
  const P = S.player; if (!wpnOn() || P.car || P.trav || P.captive || P.hide || flOf(P) || S.downing || S.cuffs) return false;
  const a = attackAction(); if (a && a.k !== 'none') return false;  // 손 닿는 처치가 먼저 (암살 게임)
  fireWeapon(); return true;
}
function gunAim() {
  const P = S.player; let best = null, bs = 1e9;
  for (const g of actorsNearWide(P.x, P.y, 440)) { if (g === P || !npcAlive(g) || g.off || flOf(g) || g.z) continue; const d = dist(P.x, P.y, g.x, g.y); if (d > (S.driveAim ? 380 : 420) || d < 8) continue;
    const da = Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))); if (da > 1.22 && !S.driveAim) continue; if (!los(P.x, P.y, g.x, g.y)) continue;
    const pri = (g.police || g.fac && !g.civ) ? 0.6 : 1, s = (d + (S.driveAim ? 0 : da * 220)) * pri; if (s < bs) { bs = s; best = g; } }
  return best;
}
function actorsNearWide(x, y, r) { return S.guards.filter(g => Math.abs(g.x - x) < r && Math.abs(g.y - y) < r); }
function fireWeapon(inCar) {
  const P = S.player, W = WEAPONS[S.wpn]; if (S.t < S.gunT) return; S.gunT = S.t + W.rate;
  S.driveAim = !!inCar; const tgt = gunAim(); S.driveAim = false; const off = inCar ? 30 : 18;
  const a0 = tgt ? Math.atan2(tgt.y - 10 - P.y, tgt.x - P.x) : P.a; P.a = a0;
  if (W.throw) { throwThing(S.wpn, a0, tgt); S.guns[S.wpn]--; gunChip(); return; }
  const shots = W.burst || 1;
  for (let b = 0; b < shots; b++) after(b * 0.07, () => { if ((S.guns[S.wpn] || 0) <= 0 || S.wpn == null) return; S.guns[S.wpn]--; gunChip();
    const mx = P.x + Math.cos(a0) * off, my = P.y - 14 + Math.sin(a0) * off;
    spawnEffect('muzzle', { x: mx, y: my, fl: 0, z: 0 }, { scale: 0.7, angle: a0, alpha: 1, startAt: 0 }); gunSound(W.sound);
    S.shakeT = Math.max(S.shakeT || 0, 0.06 * W.sound); (S.fireParts || (S.fireParts = [])).push({ kind: 'debris', x: P.x, y: P.y - 10, vx: Math.cos(a0 + Math.PI / 2) * 80, vy: -40, t: 0, life: 0.4, size: 1.5, rot: 0 });  // 탄피
    for (let k = 0; k < W.pellets; k++) shootRay(mx, my, a0 + rnd(-W.spread, W.spread), W.range, W.dmg);
    noise(P.x, P.y, 700 * W.sound, 'gun', 0);
    if (!S.wanted || S.wanted < 2) { if (witnessed(P.x, P.y, 520)) addWanted(S.wanted ? 1 : 2, '총소리에 신고가 들어갔다'); }
    for (const g of actorsNearWide(P.x, P.y, 500)) if (g.civ && npcAlive(g) && g.state !== 'PANIC') civPanic(g, P.x, P.y, 8); });
  if ((S.guns[S.wpn] || 0) <= shots) after(0.3, () => { if ((S.guns[S.wpn] || 0) <= 0) { evBanner(`${WEAPONS[S.wpn]?.name || ''} 탄약이 떨어졌다`); cycleWeapon(); } });
}
// 총알 한 줄: 8px씩 나아가며 벽(멈춤)·사람(쓰러짐)·차(내구성)를 본다
function shootRay(x0, y0, a, range, dmg) {
  const ca = Math.cos(a), sa = Math.sin(a), P = S.player; let hit = null, ex = x0 + ca * range, ey = y0 + sa * range;
  const cands = S.guards.filter(g => g !== P && npcAlive(g) && !g.off && !flOf(g) && !g.z && Math.abs(g.x - x0) < range + 20 && Math.abs(g.y - y0) < range + 20);
  const cars = S.vehicles.filter(v => !v.dead && (v.z || 0) < 0.3 && Math.abs(v.x - x0) < range + 60 && Math.abs(v.y - y0) < range + 60 && v !== P.car);
  for (let s = 10; s < range; s += 8) { const x = x0 + ca * s, y = y0 + sa * s;
    if (solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) { ex = x; ey = y; hit = 'wall'; break; }
    const g = cands.find(g => Math.abs(g.x - x) < 13 && Math.abs(g.y - 12 - y) < 20); if (g) { ex = x; ey = y; hit = g; break; }
    const v = cars.find(v => carPts(v).some(([px, py]) => dist(px, py, x, y) < (v.r || 21))); if (v) { ex = x; ey = y; hit = v; break; } }
  S.tracers.push({ x0, y0, x1: ex, y1: ey, t: S.t });
  if (hit === 'wall') { const f = { x: ex, y: ey, a: 0, len: 4 }; fireEmit(f, 'spark', 4, f); return; }
  if (hit && S.guards.includes(hit)) {  // 사람
    const g = hit; bloodBurst(g.x, g.y - 12, a, 4); g.x += ca * 10; g.y += sa * 10;
    if (g.warSide != null) warHitByPlayer(g); npcDown(g, null, true); const c = S.corpses[S.corpses.length - 1]; if (c && c.g === g) c.byNpc = false;  // 내가 쐈다: 조직 호감도에 잡힌다
    if (typeof cityVictim === 'function') cityVictim(g); gunStreak(g); return; }
  if (hit) { const v = hit; v.hp -= dmg * 0.5; v.smoke = 1.5; const f = { x: ex, y: ey, a: 0, len: 4 }; fireEmit(f, 'spark', 6, f); play('metal', 0.3, 1.7);
    if (v.hp <= 0) carExplode(v); else if (v.driver && v.ai && Math.random() < 0.3) { v.ai = false; v.v = 0; pileupBehind(v); } }
}
function gunStreak(g) {
  const K = S.kills; if (S.t - K.t > 2) K.n = 0; K.n++; K.t = S.t; fstat('gunKills');
  const word = ['', '', '더블!', '트리플!', '쿼드라!', '펜타!'][Math.min(5, K.n)] || `${K.n}연속!`;
  if (K.n >= 2) { evBanner(word, '#ff6a5a'); slowMo(0.25 + 0.1 * Math.min(4, K.n)); }
}
// 총소리: 짧은 터지는 잡음 + 낮은 쿵 (합성, 한 번 만들어 둔다)
function gunSound(k) {
  if (!AC || muted) return;
  if (!SB.gunshot) { const sr = AC.sampleRate, n = Math.floor(sr * 0.35), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; lp += 0.5 * ((Math.random() * 2 - 1) - lp); d[i] = (lp * Math.exp(-t * 28) * 1.2 + Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t * 18) * 0.7) * (t < 0.002 ? t / 0.002 : 1); }
    SB.gunshot = b; }
  play('gunshot', 0.55 * k, 1 / Math.max(0.7, k));
}
// 던지기: 바라보는 쪽 또는 노린 사람 쪽으로 포물선
function throwThing(kind, a, tgt) {
  const P = S.player, d = tgt ? Math.min(320, dist(P.x, P.y, tgt.x, tgt.y)) : 260;
  S.nades.push({ kind, x0: P.x, y0: P.y - 14, x1: P.x + Math.cos(a) * d, y1: P.y + Math.sin(a) * d, t0: S.t, fly: 0.55, fuse: kind === 'grenade' ? 1.2 : 0 }); play('throw', 0.5); P.strikeT = 0.25;
}
function gunsUpdate(dt) {
  if (!STAGE.cityLife || !S.nades) return;
  S.tracers = S.tracers.filter(t => S.t - t.t < 0.08);
  for (let i = S.nades.length - 1; i >= 0; i--) { const n = S.nades[i], f = (S.t - n.t0) / n.fly; if (f < 1) continue;
    if (n.kind === 'molotov') { S.nades.splice(i, 1); play('glass', 0.7); S.firePools.push({ x: n.x1, y: n.y1, t: S.t, r: 64 }); addWanted(S.wanted ? 0 : 1, '화염병이 터졌다'); continue; }
    if (S.t - n.t0 > n.fly + n.fuse) { S.nades.splice(i, 1); havocBlast(n.x1, n.y1, 2, '수류탄에 휘말렸다.'); addWanted(1, '폭발이 일어났다'); } }
  for (let i = S.firePools.length - 1; i >= 0; i--) { const F = S.firePools[i]; if (S.t - F.t > 8) { S.firePools.splice(i, 1); continue; }
    if ((F.tick = (F.tick || 0) - dt) > 0) continue; F.tick = 0.25;
    for (const g of actorsNearWide(F.x, F.y, F.r + 20)) if (g !== S.player && dist(g.x, g.y, F.x, F.y) < F.r && !g.burnT) igniteNpc(g);
    for (const v of S.vehicles) if (!v.dead && dist(v.x, v.y, F.x, F.y) < F.r + 20) { v.hp -= 0.25; if (v.hp <= 0) carExplode(v); }
    const P = S.player; if (!P.car && dist(P.x, P.y, F.x, F.y) < F.r * 0.8) ignitePlayer(); }
}
function drawGuns() {
  if (!S.tracers) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const t of S.tracers) { ctx.strokeStyle = `rgba(255,230,160,${0.9 * (1 - (S.t - t.t) / 0.08)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x0, t.y0); ctx.lineTo(t.x1, t.y1); ctx.stroke(); }
  ctx.restore();
  for (const F of S.firePools) { if (!inView(F.x, F.y, 90)) continue; const k = clamp((8 - (S.t - F.t)) / 1.5, 0, 1);
    for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + F.t, r = F.r * (j ? 0.6 : 0); fxFrame('carfire', S.t + j * 0.4, F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.6 + 8, 1.2 * k + 0.2, k); } }
  for (const n of S.nades) { const f = Math.min(1, (S.t - n.t0) / n.fly), x = n.x0 + (n.x1 - n.x0) * f, y = n.y0 + (n.y1 - n.y0) * f - Math.sin(f * Math.PI) * 60;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(n.x0 + (n.x1 - n.x0) * f - 3, n.y0 + (n.y1 - n.y0) * f + 10, 6, 3);
    ctx.fillStyle = n.kind === 'grenade' ? '#3a4a2a' : '#7a5a2a'; ctx.fillRect(x - 3, y - 3, 6, 6); if (n.kind === 'molotov') { ctx.fillStyle = '#ffb040'; ctx.fillRect(x - 1, y - 6, 2, 3); }
    if (n.kind === 'grenade' && f >= 1 && ((S.t * 8) | 0) % 2) { ctx.fillStyle = '#ff3a2a'; ctx.fillRect(x - 1, y - 1, 2, 2); } }
}
// 조직 연락책의 무기 거래 (호감도 0 이상)
function weaponShop(f) {
  const rows = WPN_ORDER.map(k => { const W = WEAPONS[k]; return { name: `${W.name} (+${W.ammo})`, price: W.price, ok: (S.cash || 0) >= W.price, buy: () => { if ((S.cash || 0) < W.price) return; S.cash -= W.price; S.guns[k] = (S.guns[k] || 0) + W.ammo; if (!S.wpn) S.wpn = k; play('loot', 0.5); gunChip(); saveFreeProgress(true); weaponShop(f); } }; });
  const P = S.player; rows.push({ name: `방탄조끼 (${ARMOR_MAX}번 막는다)`, price: ARMOR_PRICE, ok: (S.cash || 0) >= ARMOR_PRICE && (P.armor | 0) < ARMOR_MAX, buy: () => { if ((S.cash || 0) < ARMOR_PRICE || (P.armor | 0) >= ARMOR_MAX) return; S.cash -= ARMOR_PRICE; P.armor = ARMOR_MAX; play('loot', 0.5); gunChip(); saveFreeProgress(true); weaponShop(f); } });
  shopPanel(`${STAND_NAME[f]} 무기 거래 · 가진 돈 ${S.cash || 0}만`, rows);
}
