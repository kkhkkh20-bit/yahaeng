// ---------------------------------------------------------------- 자유 모드 무기: 권총 · 기관단총 · 산탄총 · 수류탄 · 화염병
// 조직 연락책(호감도 0 이상)에게 산다. L(또는 화면의 무기 칩)로 바꾼다. [공격]은 붙잡을 사람이 손 닿는 데 없을 때 쏜다.
// 조준: 앞쪽 70° 안, 420px 안의 가장 가까운 사람(경찰·조직원 먼저)을 자동으로 노린다. 없으면 바라보는 쪽으로.
// 총알은 즉시 맞는 선(벽에서 멈춤): 사람은 한 방(산탄은 퍼짐), 차는 내구성을 깎아 터지기도 한다. 총소리는 멀리 들려 신고·경찰을 부른다.
// 수류탄: 1.2초 뒤 폭발(havocBlast). 화염병: 떨어진 자리에 8초 불바다 — 들어온 사람에게 불이 붙고 차가 탄다.
// 통쾌: 2초 안 연속 처치는 '더블! 트리플! 쿼드라!' + 짧은 느린 화면, 총구 불꽃(PixelFX)·탄피·피.
// 도트 아이템 아틀라스 (src/art/weapons: 총·수류탄·화염병·폭약·조끼·독침·락픽·탄띠·구급약·동전·경찰 헬기)
const itemArt = A.cityItems, itemAtlas = itemArt ? Object.assign(new Image(), { src: itemArt.src }) : null;
const itemReady = () => !!(itemAtlas && itemAtlas.complete && itemAtlas.naturalWidth);
// 가운데(x,y) 기준으로 그린다. rot: 라디안, k: 배율
function drawItem(name, x, y, k = 1, rot = 0, alpha = 1, flipY = false) {
  const f = itemArt?.frames?.[name]; if (!f || !itemReady()) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flipY) ctx.scale(1, -1);
  ctx.drawImage(itemAtlas, f[0], f[1], f[2], f[3], -f[2] * k / 2, -f[3] * k / 2, f[2] * k, f[3] * k); ctx.restore(); return true;
}
const WEAPONS = {
  pistol: { name: '권총', rate: 0.28, dmg: 1, spread: 0.03, pellets: 1, range: 520, sound: 1, ammo: 24, price: 300 },
  silenced: { name: '소음 권총', rate: 0.45, dmg: 1, spread: 0.015, pellets: 1, range: 460, sound: 0.3, ammo: 12, price: 700, silent: true },  // 암살용: 140px 밖에선 안 들린다
  smg: { name: '기관단총', rate: 0.09, dmg: 1, spread: 0.08, pellets: 1, range: 460, sound: 0.8, ammo: 60, price: 800, burst: 3 },
  shotgun: { name: '산탄총', rate: 0.8, dmg: 1, spread: 0.22, pellets: 6, range: 300, sound: 1.4, ammo: 16, price: 600 },
  sniper: { name: '저격총', rate: 1.3, dmg: 1, spread: 0.004, pellets: 1, range: 1000, sound: 1.3, ammo: 6, price: 1200, sniper: true },  // 멈춰 서야 조준경 (47w)
  grenade: { name: '수류탄', rate: 0.9, throw: true, ammo: 3, price: 250 },
  molotov: { name: '화염병', rate: 0.8, throw: true, ammo: 3, price: 150 } };
// 총별 연출 (PixelFX 도트): 총구 불꽃 · 날아가는 총알(속도·크기·밝기) · 벽/쇠/사람에 맞은 효과 · 소리
const GUN_FX = {
  pistol:   { muzzle: 'muzzle', ms: 0.7, speed: 2600, ts: 0.55, ta: 0.95, wall: 'bulletHit', ws: 0.7, metal: 'ricochet', mts: 0.55, body: 'impact', bs: 0.6, snd: 'gPistol', vol: 0.55, shake: 0.06, casing: 1 },
  silenced: { muzzle: 'muzzle', ms: 0.3, ma: 0.5, speed: 2300, ts: 0.4, ta: 0.5, wall: 'bulletHit', ws: 0.45, metal: 'ricochet', mts: 0.4, body: 'impact', bs: 0.45, snd: 'gSilenced', vol: 0.45, shake: 0.02, casing: 1 },
  smg:      { muzzle: 'muzzleSmg', ms: 0.6, speed: 2900, ts: 0.48, ta: 0.85, wall: 'bulletHit', ws: 0.55, metal: 'ricochet', mts: 0.45, body: 'impact', bs: 0.5, snd: 'gSmg', vol: 0.42, shake: 0.04, casing: 1 },
  shotgun:  { muzzle: 'muzzleShot', ms: 0.75, speed: 2100, ts: 0.32, ta: 0.75, wall: 'dart', ws: 0.7, metal: 'ricochet', mts: 0.35, body: 'impact', bs: 0.75, snd: 'gShotgun', vol: 0.75, shake: 0.16, casing: 0, pump: 0.38 },
  sniper:   { muzzle: 'muzzleShot', ms: 0.55, speed: 4400, ts: 1.0, ta: 1, wall: 'bulletHit', ws: 1.0, metal: 'ricochet', mts: 0.8, body: 'critHit', bs: 0.75, snd: 'gSniper', vol: 0.8, shake: 0.2, casing: 1, bolt: 0.55 },
  npc:      { muzzle: 'muzzle', ms: 0.55, speed: 2500, ts: 0.5, ta: 0.85, wall: 'bulletHit', ws: 0.6, metal: 'ricochet', mts: 0.5, body: 'impact', bs: 0.55, snd: 'gPistol', vol: 0.4, shake: 0, casing: 0 } };
const WPN_ORDER = ['pistol', 'silenced', 'smg', 'shotgun', 'sniper', 'grenade', 'molotov'];
function gunsInit() { S.guns = Object.assign({}, S.gunsSaved || {}); S.wpn = S.wpnSaved && S.guns[S.wpnSaved] > 0 ? S.wpnSaved : null; S.gunT = 0; S.tracers = []; S.firePools = []; S.nades = []; S.kills = { n: 0, t: -9 }; gunChip(); }
const wpnOn = () => STAGE.cityLife && S.wpn && (S.guns[S.wpn] || 0) > 0;
function cycleWeapon() {
  if (!STAGE.cityLife || !S.guns) return; const have = WPN_ORDER.filter(k => (S.guns[k] || 0) > 0); if (!have.length) { S.wpn = null; gunChip(); evBanner('무기가 없다 — 조직 연락책에게 산다'); return; }
  const i = have.indexOf(S.wpn); S.wpn = i < 0 ? have[0] : i === have.length - 1 ? null : have[i + 1]; play('click', 0.4); gunChip(); evBanner(S.wpn ? `${WEAPONS[S.wpn].name} · ${S.guns[S.wpn]}` : '맨손', '#e8d070');
}
// 화면의 무기 칩 (공격 버튼 위): 누르면 바꾼다
// 무기·소지품 막대 (화면 오른쪽, 공격 버튼 위): 맨손 + 가진 무기(도트 아이콘·남은 탄) — 누르거나 숫자 1~7로 고른다.
// 아래 줄: 소지품(락픽·폭약·독침·조끼) 개수. 고른 칸은 노란 테두리
const itemIcon = (() => { const cache = {}; return name => { if (cache[name]) return cache[name]; const f = itemArt?.frames?.[name]; if (!f || !itemReady()) return null;
  const k = Math.max(1, Math.min(3, Math.floor(30 / Math.max(f[2], f[3] * 1.6)))), c = document.createElement('canvas'); c.width = f[2] * k; c.height = f[3] * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(itemAtlas, f[0], f[1], f[2], f[3], 0, 0, c.width, c.height); return cache[name] = c.toDataURL(); }; })();
function selectWeapon(k) { if (!STAGE.cityLife || !S.guns) return; if (k && !((S.guns[k] || 0) > 0)) return; if (S.ramp && k !== S.ramp.wpn) return; S.wpn = k; play('click', 0.4); gunChip(); }
function gunChip() {
  let el = document.getElementById('wpnChip'); if (!STAGE.cityLife) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'wpnChip'; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', '무기');
    el.style.cssText = 'position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 214px);z-index:35;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none;font:600 12px "Yahaeng UI",sans-serif;color:#efe6cf';
    el.addEventListener('click', e => { const b = e.target.closest('button[data-w]'); if (!b) return; e.stopPropagation(); selectWeapon(b.dataset.w || null); });
    document.body.appendChild(el); }
  const P = S.player, have = WPN_ORDER.filter(k => (S.guns[k] || 0) > 0), inf = k => S.ramp && S.ramp.wpn === k;
  const slot = (k, i) => { const on = (S.wpn || null) === k, ic = k ? itemIcon(k) : null, n = k ? (inf(k) ? '∞' : S.guns[k]) : '';
    return `<button type="button" data-w="${k || ''}" title="${k ? WEAPONS[k].name : '맨손'} (${i + 1})" style="pointer-events:auto;display:flex;align-items:center;gap:5px;min-width:44px;height:34px;padding:2px 7px;background:rgba(12,14,20,${on ? .92 : .7});color:inherit;border:${on ? 2 : 1}px solid ${on ? '#ffd76a' : '#4a5160'};border-radius:6px;font:inherit;cursor:pointer">`
      + `<small style="color:#8a90a0">${i + 1}</small>` + (ic ? `<img src="${ic}" alt="" style="image-rendering:pixelated;max-height:24px">` : `<span>${k ? WEAPONS[k].name : '맨손'}</span>`) + (n !== '' ? `<b>${n}</b>` : '') + '</button>'; };
  const row = ['', ...have].map((k, i) => slot(k || null, i)).join('');
  const inv = [['lockpick', P.picks], ['bomb', P.bombs], ['poison', P.poison], ['vest', P.armor]].filter(([, n]) => n > 0)
    .map(([k, n]) => { const ic = itemIcon(k); return `<span title="${({ lockpick: '락픽', bomb: '폭약', poison: '독침', vest: '방탄조끼' })[k]} ${n}" style="display:flex;align-items:center;gap:3px;background:rgba(12,14,20,.7);border:1px solid #3b4250;border-radius:5px;padding:2px 6px">${ic ? `<img src="${ic}" alt="" style="image-rendering:pixelated;max-height:18px">` : k}<b>${n}</b></span>`; }).join('');
  const html = `<div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;max-width:calc(100vw - 24px)">${row}</div>` + (inv ? `<div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px">${inv}</div>` : '');
  if (el.dataset.k !== html) { el.innerHTML = html; el.dataset.k = html; }
  el.hidden = !have.length && !inv;
}
// [공격]이 총을 쏠 차례인가: 붙잡을 사람이 손 닿는 데 없을 때
function gunAttack() {
  const P = S.player; if (!wpnOn() || P.car || P.trav || P.captive || P.hide || flOf(P) || S.downing || S.cuffs) return false;
  const a = attackAction(); if (a && a.k !== 'none') return false;  // 손 닿는 처치가 먼저 (암살 게임)
  fireWeapon(); return true;
}
function gunAim() {
  const P = S.player; let best = null, bs = 1e9;
  for (const g of (S.snipeAim ? S.guards : actorsNearWide(P.x, P.y, 440))) { if (g === P || !npcAlive(g) || g.off || flOf(g) || g.z) continue; const d = dist(P.x, P.y, g.x, g.y); const sn = S.snipeAim; if (d > (sn ? 1000 : S.driveAim ? 380 : 420) || d < 8) continue;
    const da = Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))); if (da > (sn ? 0.45 : 1.22) && !S.driveAim) continue; if (!(sn && P.z) && !los(P.x, P.y, g.x, g.y)) continue;
    const pri = (S.hit && S.hit.g === g && sn ? 0.3 : 1) * ((g.police || g.fac && !g.civ) ? 0.6 : 1), s = (d + (S.driveAim ? 0 : da * 220)) * pri; if (s < bs) { bs = s; best = g; } }
  return best;
}
function actorsNearWide(x, y, r) { return S.guards.filter(g => Math.abs(g.x - x) < r && Math.abs(g.y - y) < r); }
function fireWeapon(inCar) {
  const P = S.player, W = WEAPONS[S.wpn]; if (S.t < S.gunT) return;
  if (W.sniper && !inCar && !scopeReady()) { evBanner('멈춰 서야 조준경이 잡힌다', '#c8c0b0'); return; }
  S.gunT = S.t + W.rate;
  S.driveAim = !!inCar; S.snipeAim = !!W.sniper && !inCar; const tgt = gunAim(); S.snipeAim = false; S.driveAim = false; const off = inCar ? 30 : 18;
  const a0 = tgt ? Math.atan2(tgt.y - 10 - P.y, tgt.x - P.x) : P.a; P.a = a0;
  if (W.throw) { throwThing(S.wpn, a0, tgt); S.guns[S.wpn]--; gunChip(); return; }
  const shots = W.burst || 1;
  for (let b = 0; b < shots; b++) after(b * 0.07, () => { if ((S.guns[S.wpn] || 0) <= 0 || S.wpn == null) return; S.guns[S.wpn]--; gunChip();
    const mx = P.x + Math.cos(a0) * off, my = P.y - 14 + Math.sin(a0) * off;
    const FX = GUN_FX[S.wpn] || GUN_FX.pistol;
    P.shotT = S.t; spawnEffect(FX.muzzle, { x: mx, y: my, fl: 0, z: 0 }, { scale: FX.ms, angle: a0, alpha: FX.ma ?? 1, startAt: 0 }); gunSound(FX);
    S.shakeT = Math.max(S.shakeT || 0, FX.shake); if (FX.casing) (S.fireParts || (S.fireParts = [])).push({ kind: 'debris', x: P.x, y: P.y - 10, vx: Math.cos(a0 + Math.PI / 2) * 80, vy: -40, t: 0, life: 0.4, size: 1.5, rot: 0 });  // 탄피
    for (let k = 0; k < W.pellets; k++) shootRay(mx, my, a0 + rnd(-W.spread, W.spread), W.range, W.dmg, W.sniper && P.z > 0, FX);
    const loud = W.silent ? 140 : 700 * W.sound; noise(P.x, P.y, loud, 'gun', 0);  // 소음 권총: 바로 옆에서만 들린다
    // 아무도 안 맞힌 총질: 처음엔 별 하나(경찰은 맨손으로 잡으러 온다). 계속 쏘면(목격된 총성 8발) 별 둘 — 그때부터 경찰도 총을 꺼낸다
    if ((!S.wanted || S.wanted < 2) && witnessed(P.x, P.y, W.silent ? 170 : 520)) { if (!S.wanted) { S.gunHeat = 0; addWanted(1, W.silent ? '쏘는 걸 누가 봤다' : '총소리에 신고가 들어갔다'); } else if ((S.gunHeat = (S.gunHeat || 0) + 1) >= 8) { S.gunHeat = 0; addWanted(1, '총질을 멈추지 않는다'); } }
    for (const g of actorsNearWide(P.x, P.y, W.silent ? 150 : 500)) if (g.civ && npcAlive(g) && g.state !== 'PANIC') civPanic(g, P.x, P.y, 8); });
  if ((S.guns[S.wpn] || 0) <= shots) after(0.3, () => { if ((S.guns[S.wpn] || 0) <= 0) { evBanner(`${WEAPONS[S.wpn]?.name || ''} 탄약이 떨어졌다`); cycleWeapon(); } });
}
// 총알 한 줄: 8px씩 나아가며 벽(멈춤)·사람(쓰러짐)·차(내구성)를 본다
function shootRay(x0, y0, a, range, dmg, over, FX = GUN_FX.pistol) {  // over: 옥상에서 쏜 저격 — 건물 벽 위로 날아간다
  const ca = Math.cos(a), sa = Math.sin(a), P = S.player; let hit = null, ex = x0 + ca * range, ey = y0 + sa * range;
  const cands = S.guards.filter(g => g !== P && npcAlive(g) && !g.off && !flOf(g) && !g.z && Math.abs(g.x - x0) < range + 20 && Math.abs(g.y - y0) < range + 20);
  const cars = S.vehicles.filter(v => !v.dead && (v.z || 0) < 0.3 && Math.abs(v.x - x0) < range + 60 && Math.abs(v.y - y0) < range + 60 && v !== P.car);
  for (let s = 10; s < range; s += 8) { const x = x0 + ca * s, y = y0 + sa * s;
    if (!over && solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) { ex = x; ey = y; hit = 'wall'; break; }
    const g = cands.find(g => Math.abs(g.x - x) < 13 && Math.abs(g.y - 12 - y) < 20); if (g) { ex = x; ey = y; hit = g; break; }
    const v = cars.find(v => carPts(v).some(([px, py]) => dist(px, py, x, y) < (v.r || 21))); if (v) { ex = x; ey = y; hit = v; break; } }
  bulletFly(x0, y0, ex, ey, FX, hit === 'wall' ? 'wall' : hit && S.guards.includes(hit) ? 'body' : hit ? 'metal' : null);
  if (hit === 'wall') return;
  if (hit && S.guards.includes(hit)) {  // 사람
    const g = hit; g.shotT = S.t; g.shotD = dist(x0, y0, g.x, g.y); if (g.shotD > 500) { slowMo(0.45); S.flash = 0.12; } bloodBurst(g.x, g.y - 12, a, FX === GUN_FX.shotgun || FX === GUN_FX.sniper ? 7 : 4); g.x += ca * 10; g.y += sa * 10;
    if (g.warSide != null) warHitByPlayer(g); npcDown(g, null, true); const c = S.corpses[S.corpses.length - 1]; if (c && c.g === g) c.byNpc = false;  // 내가 쐈다: 조직 호감도에 잡힌다
    if (typeof cityVictim === 'function') cityVictim(g); gunStreak(g); return; }
  if (hit) { const v = hit; v.hp -= dmg * (FX === GUN_FX.sniper ? 2 : 0.5); v.smoke = 1.5;
    if (v.hp <= 0) carExplode(v); else if (v.driver && v.ai && Math.random() < 0.3) { v.ai = false; v.v = 0; pileupBehind(v); } }
}
function gunStreak(g) {
  const K = S.kills; if (S.t - K.t > 2) K.n = 0; K.n++; K.t = S.t; fstat('gunKills');
  const word = ['', '', '더블!', '트리플!', '쿼드라!', '펜타!'][Math.min(5, K.n)] || `${K.n}연속!`;
  if (K.n >= 2) { evBanner(word, '#ff6a5a'); slowMo(0.25 + 0.1 * Math.min(4, K.n)); }
}
// 총소리 (합성, 총마다 한 번 만들어 둔다): 권총 짧고 날카롭게 · 소음 권총 '퉁' · 기관단총 가볍고 짧게 · 산탄총 묵직한 폭음 · 저격총 큰 폭음 + 메아리
function gunBuf(name, len, fn) { if (SB[name]) return; const sr = AC.sampleRate, n = Math.floor(sr * len), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0); let lp = 0, hp = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, w = Math.random() * 2 - 1; lp += 0.5 * (w - lp); hp = w - lp; d[i] = fn(t, w, lp, hp) * (t < 0.0015 ? t / 0.0015 : 1); } SB[name] = b; }
function gunSound(FX, vol = 1) {
  if (!AC || muted) return; const s = 2 * Math.PI;
  gunBuf('gPistol', 0.32, (t, w, lp, hp) => hp * Math.exp(-t * 55) * 0.9 + lp * Math.exp(-t * 24) * 0.8 + Math.sin(s * 95 * t) * Math.exp(-t * 22) * 0.6);
  gunBuf('gSilenced', 0.18, (t, w, lp) => lp * Math.exp(-t * 60) * 0.7 + Math.sin(s * 140 * t) * Math.exp(-t * 45) * 0.5);
  gunBuf('gSmg', 0.16, (t, w, lp, hp) => hp * Math.exp(-t * 80) * 0.8 + lp * Math.exp(-t * 40) * 0.6 + Math.sin(s * 120 * t) * Math.exp(-t * 35) * 0.4);
  gunBuf('gShotgun', 0.7, (t, w, lp, hp) => lp * Math.exp(-t * 9) * 1.1 + hp * Math.exp(-t * 30) * 0.5 + Math.sin(s * 55 * t) * Math.exp(-t * 7) * 0.9);
  gunBuf('gSniper', 1.6, (t, w, lp, hp) => { const e = (u) => u < 0 ? 0 : Math.exp(-u * 14); return hp * Math.exp(-t * 40) * 1 + lp * Math.exp(-t * 10) * 0.9 + Math.sin(s * 62 * t) * Math.exp(-t * 6) * 0.8 + lp * (e(t - 0.32) * 0.35 + e(t - 0.7) * 0.18); });  // 메아리 두 번
  play(FX.snd, FX.vol * vol, rnd(0.95, 1.05));
  if (FX.pump) after(FX.pump, () => { play('click', 0.45, 0.6); after(0.12, () => play('click', 0.4, 0.9)); });  // 산탄총 펌프
  if (FX.bolt) after(FX.bolt, () => { play('metal', 0.25, 2.2); after(0.15, () => play('click', 0.35, 0.8)); });  // 저격총 노리쇠
}
// 날아가는 총알: PixelFX 탄두(꼬리 달린 불빛)가 총구에서 맞은 곳까지 실제로 날아가고, 닿는 순간 맞은 곳에 따라 효과
function bulletFly(x0, y0, x1, y1, FX, hit) {
  const L = dist(x0, y0, x1, y1), a = Math.atan2(y1 - y0, x1 - x0), dur = Math.max(0.02, L / FX.speed);
  (S.bullets || (S.bullets = [])).push({ x0, y0, x1, y1, a, t0: S.t, dur, FX });
  if (S.bullets.length > 60) S.bullets.shift();
  if (!hit) return;
  after(dur, () => { const at = { x: x1, y: y1, fl: 0, z: 0 };
    if (hit === 'wall') { spawnEffect(FX.wall, at, { scale: FX.ws, angle: a + Math.PI, startAt: 0 }); if (inView(x1, y1, 40)) play('click', 0.18 * FX.ws, 2.4); }
    else if (hit === 'metal') { spawnEffect(FX.metal, at, { scale: FX.mts, angle: a, startAt: 0 }); play('metal', 0.32 * FX.mts, 1.6 + Math.random() * 0.5); }
    else spawnEffect(FX.body, at, { scale: FX.bs, angle: a, startAt: 0 }); });
}
// 던지기: 바라보는 쪽 또는 노린 사람 쪽으로 포물선
function throwThing(kind, a, tgt) {
  const P = S.player, d = tgt ? Math.min(320, dist(P.x, P.y, tgt.x, tgt.y)) : 260;
  S.nades.push({ kind, x0: P.x, y0: P.y - 14, x1: P.x + Math.cos(a) * d, y1: P.y + Math.sin(a) * d, t0: S.t, fly: 0.55, fuse: kind === 'grenade' ? 1.2 : 0 }); play('throw', 0.5); P.strikeT = 0.25;
}
function gunsUpdate(dt) {
  if (!STAGE.cityLife || !S.nades) return;
  S.tracers = S.tracers.filter(t => S.t - t.t < 0.08); if (S.bullets?.length) S.bullets = S.bullets.filter(b => S.t - b.t0 <= b.dur + 0.05);
  for (let i = S.nades.length - 1; i >= 0; i--) { const n = S.nades[i], f = (S.t - n.t0) / n.fly; if (f < 1) continue;
    if (n.kind === 'molotov') { S.nades.splice(i, 1); play('glass', 0.7); S.firePools.push({ x: n.x1, y: n.y1, t: S.t, r: 64 }); addWanted(S.wanted ? 0 : 1, '화염병이 터졌다'); continue; }
    if (S.t - n.t0 > n.fly + n.fuse) { S.nades.splice(i, 1); havocBlast(n.x1, n.y1, 2, '수류탄에 휘말렸다.'); addWanted(1, '폭발이 일어났다'); } }
  for (let i = S.firePools.length - 1; i >= 0; i--) { const F = S.firePools[i]; if (S.t - F.t > 8) { S.firePools.splice(i, 1); continue; }
    if ((F.tick = (F.tick || 0) - dt) > 0) continue; F.tick = 0.25;
    for (const g of actorsNearWide(F.x, F.y, F.r + 20)) if (g !== S.player && dist(g.x, g.y, F.x, F.y) < F.r && !g.burnT) igniteNpc(g);
    for (const v of S.vehicles) if (!v.dead && dist(v.x, v.y, F.x, F.y) < F.r + 20) { v.hp -= 0.25; if (v.hp <= 0) carExplode(v); }
    const P = S.player; if (!P.car && dist(P.x, P.y, F.x, F.y) < F.r * 0.8) ignitePlayer(); }
}
function drawBullets() {
  const L = S.bullets; if (!L?.length) return; const m = FX_META?.effects?.tracer, ok = m && fxAtlas?.complete && fxAtlas.naturalWidth;
  for (const b of L) { const k = (S.t - b.t0) / b.dur; if (k < 0 || k > 1) continue; const x = b.x0 + (b.x1 - b.x0) * k, y = b.y0 + (b.y1 - b.y0) * k; if (!inView(x, y, 60)) continue;
    if (ok) { const r = m.frames[Math.floor((S.t - b.t0) * m.fps) % m.frames.length]; if (!r[2]) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(b.a); ctx.scale(b.FX.ts, b.FX.ts); ctx.globalAlpha = b.FX.ta; ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(fxAtlas, r[0], r[1], r[2], r[3], -m.origin[0] + (r[4] || 0), -m.origin[1] + (r[5] || 0), r[2], r[3]); ctx.restore(); }
    else { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x - 1, y - 1, 2, 2); } }
}
function drawGuns() {
  drawBullets();
  if (!S.tracers) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const t of S.tracers) { ctx.strokeStyle = `rgba(255,230,160,${0.6 * (1 - (S.t - t.t) / 0.08)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t.x0, t.y0); ctx.lineTo(t.x1, t.y1); ctx.stroke(); }  // (적 총알 등 오래된 방식)
  ctx.restore();
  for (const F of S.firePools) { if (!inView(F.x, F.y, 90)) continue; const k = clamp((8 - (S.t - F.t)) / 1.5, 0, 1);
    for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + F.t, r = F.r * (j ? 0.6 : 0); fxFrame('carfire', S.t + j * 0.4, F.x + Math.cos(a) * r, F.y + Math.sin(a) * r * 0.6 + 8, 1.2 * k + 0.2, k); } }
  for (const n of S.nades) { const f = Math.min(1, (S.t - n.t0) / n.fly), x = n.x0 + (n.x1 - n.x0) * f, y = n.y0 + (n.y1 - n.y0) * f - Math.sin(f * Math.PI) * 60;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(n.x0 + (n.x1 - n.x0) * f - 3, n.y0 + (n.y1 - n.y0) * f + 10, 6, 3);
    drawItem(n.kind, x, y, 1.6, f < 1 ? (S.t - n.t0) * 14 : 0.6);  // 날아가며 돈다 (도트 수류탄·화염병)
    if (n.kind === 'molotov' && f < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,60,.55)'; ctx.beginPath(); ctx.arc(x, y - 6, 3 + Math.sin(S.t * 30), 0, TAU); ctx.fill(); ctx.restore(); }
    if (n.kind === 'grenade' && f >= 1 && ((S.t * 8) | 0) % 2) { ctx.fillStyle = '#ff3a2a'; ctx.fillRect(x - 1, y - 1, 2, 2); } }
}
// 조직 연락책의 무기 거래 (호감도 0 이상)
// 총은 귀하다: 조직 연락책은 화염병·방탄조끼만 판다. 권총은 뒷골목 밀매상(비밀 루트, 47zg)에서.
// 기관단총·산탄총·수류탄은 팔지 않는다 — 저격총은 이야기에서 강 형사가 압수품을 빌려줄 때만.
const SHOP_GUNS = { molotov: { price: 150, need: 0 } };  /* 권총은 뒷골목 밀매상(47zg)에서만 */
function weaponShop(f) {
  const st = typeof standOf === 'function' ? standOf(f) : 0;
  const rows = Object.keys(SHOP_GUNS).map(k => { const W = WEAPONS[k], G = SHOP_GUNS[k], locked = st < G.need;
    return { name: locked ? `${W.name} — 이 조직과 더 가까워야 판다 (호감 ${G.need})` : `${W.name} (+${W.ammo})`, price: G.price, ok: !locked && (S.cash || 0) >= G.price, buy: () => { if (locked || (S.cash || 0) < G.price) return; S.cash -= G.price; S.guns[k] = (S.guns[k] || 0) + W.ammo; if (!S.wpn) S.wpn = k; play('loot', 0.5); gunChip(); saveFreeProgress(true); weaponShop(f); } }; });
  if (false) WPN_ORDER.map(k => { const W = WEAPONS[k]; return { name: `${W.name} (+${W.ammo})`, price: W.price, ok: (S.cash || 0) >= W.price, buy: () => { if ((S.cash || 0) < W.price) return; S.cash -= W.price; S.guns[k] = (S.guns[k] || 0) + W.ammo; if (!S.wpn) S.wpn = k; play('loot', 0.5); gunChip(); saveFreeProgress(true); weaponShop(f); } }; });
  const P = S.player; rows.push({ name: `방탄조끼 (${ARMOR_MAX}번 막는다)`, price: ARMOR_PRICE, ok: (S.cash || 0) >= ARMOR_PRICE && (P.armor | 0) < ARMOR_MAX, buy: () => { if ((S.cash || 0) < ARMOR_PRICE || (P.armor | 0) >= ARMOR_MAX) return; S.cash -= ARMOR_PRICE; P.armor = ARMOR_MAX; play('loot', 0.5); gunChip(); saveFreeProgress(true); weaponShop(f); } });
  shopPanel(`${STAND_NAME[f]} 뒷거래 · 가진 돈 ${S.cash || 0}만`, rows);
}
