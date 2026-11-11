// ---------------------------------------------------------------- 큰 도시의 거리 생활: 체포 · 조직의 칼 · 추격 차 · 차 사고 · 간판 네온
// 경찰은 잡으면 지구대로 끌고 간다(목숨 대신 벌금). 조직은 칼을 들고 다니며 바로 죽이러 든다.
// 쫓는 쪽이 멀어지면 경찰도 조직도 차를 몰고 온다. 차에 치이면 사람은 날아가 피를 쏟고 죽는다.

// 경찰에게 붙잡힘: 수배가 낮을 때(★1~2) 경찰이 내 옆에 1초 붙어 있으면 수갑. 총을 꺼낸 뒤(★3 이상)는 붙잡지 않고 쏜다
const ARREST_T = 1.0;
function updateArrest(dt) {
  const P = S.player; if (!S.wanted || P.car || P.z || flOf(P) || P.trav || S.over) { S.arrestT = 0; return; }
  const cop = S.guards.find(g => g.police && !g.off && g.state === 'ALERT' && dist(g.x, g.y, P.x, P.y) < 34);
  if (!cop || S.wanted >= 3) { S.arrestT = Math.max(0, (S.arrestT || 0) - dt * 2); return; }
  S.arrestT = (S.arrestT || 0) + dt;
  if (S.arrestT >= ARREST_T) { S.arrestT = 0; startCuffs('경찰에게 붙잡혔다.', cop); }
}
// 수갑: 경찰이 등 뒤로 돌아와 손목에 채운다(철컥 두 번). 그동안 나는 움직일 수 없다. 끝나면 지구대로
const CUFF_T = 1.6;
function startCuffs(why, cop) {
  const P = S.player; if (S.cuffs) return;
  if (P.car) { const v = P.car; P.car = null; v.parked = true; v.v = 0; }
  cop = cop || S.guards.filter(g => g.police && !g.off && g.state !== 'DEAD').sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
  S.cuffs = { t: 0, why, cop, clicks: 0 }; P.cuffed = true; P.moving = false; P.hurtT = 9; input.aiming = null;
  play('cloth', 0.6); S.shakeT = Math.max(S.shakeT || 0, 0.15);
}
function updateCuffs(dt) {
  const C = S.cuffs; if (!C) return; const P = S.player; C.t += dt;
  const g = C.cop; if (g && g.state !== 'DEAD' && !flOf(g) && !g.z && dist(g.x, g.y, P.x, P.y) < 90) {  // 가까이 붙은 경찰만 등 뒤로 (벽 너머로 끌어오지 않는다)
    const bx = P.x - Math.cos(P.a) * 20, by = P.y - Math.sin(P.a) * 20; g.x += (bx - g.x) * Math.min(1, dt * 10); g.y += (by - g.y) * Math.min(1, dt * 10); g.a = g.want = P.a; g.moving = false; g.path = null; }
  if (C.clicks < 1 && C.t > 0.55) { C.clicks = 1; play('metal', 0.7, 1.6); S.flash = Math.max(S.flash || 0, 0.12); }
  if (C.clicks < 2 && C.t > 0.95) { C.clicks = 2; play('metal', 0.7, 1.8); S.flash = Math.max(S.flash || 0, 0.12); }
  if (C.t >= CUFF_T) { S.cuffs = null; P.cuffed = false; cityArrest(C.why); }
}
function drawCuffs() {
  const C = S.cuffs; if (!C || C.t < 0.5) return; const P = S.player, a = P.a + Math.PI;
  const cx = P.x + Math.cos(a) * 8, cy = P.y - 12 + Math.sin(a) * 5, px = -Math.sin(a) * 4, py = Math.cos(a) * 4;
  ctx.save(); ctx.strokeStyle = '#d4dbe2'; ctx.lineWidth = 2;
  for (const s of C.t > 0.95 ? [-1, 1] : [-1]) { ctx.beginPath(); ctx.arc(cx + px * s, cy + py * s, 3.5, 0, TAU); ctx.stroke(); }
  if (C.t > 0.95) { ctx.beginPath(); ctx.moveTo(cx - px, cy - py); ctx.lineTo(cx + px, cy + py); ctx.stroke(); }
  ctx.restore();
}
// 체포: 지구대 앞에서 풀려난다. 수입의 30%를 벌금으로 낸다
function cityArrest(why) {
  const P = S.player, fine = Math.round((S.cash || 0) * 0.3);
  if (P.car) { const v = P.car; P.car = null; v.parked = true; }
  P.captive = null; P.carrying = null; P.hide = null; P.hp = P.hpMax; P.hurtT = 2.5; S.fade = 1.2; S.flash = 0.2;
  const at = STAGE.police || STAGE.start; P.x = tc(at[0]); P.y = tc(at[1] + 1); P.z = 0; P.fl = 0; setLayer(0); cam.x = P.x; cam.y = P.y;
  S.cash = Math.max(0, (S.cash || 0) - fine); S.wanted = 0; S.wantLost = 0; S.alevel = 0; S.alevelT = 0;
  for (const g of S.guards) { if (g.police && !g.off) despawnCop(g); else if (['ALERT', 'SEARCH', 'SUSPICIOUS', 'CHECK'].includes(g.state)) { g.state = 'RETURN'; g.path = null; g.icon = null; g.meter = 0; } }
  S.stats.arrests = (S.stats.arrests || 0) + 1; play('lose', 0.35);
  toast(why + ' — 지구대에서 풀려났다' + (fine ? ` (벌금 ${fine}만)` : ''), 3.2, 'warn');
}

// 조직원의 칼: 손에 든 칼날. 나를 쫓을 때는 앞으로 내민다
const cityGang = g => !!(STAGE.city && g && !g.civ && !g.dog && !g.police && g.fac && g.fac !== 'P' && g.state !== 'DEAD' && g.state !== 'CAPTIVE');
function drawGangKnife(g) {
  if (!cityGang(g) || g.x < 0 || !inView(g.x, g.y, 60)) return;
  const ready = g.state === 'ALERT' || !!g.brawl, a = g.a + (ready ? 0 : 0.9), hx = g.x + Math.cos(a) * (ready ? 13 : 9), hy = g.y - 14 + Math.sin(a) * (ready ? 9 : 6), len = ready ? 13 : 10;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - Math.cos(a) * 3, hy - Math.sin(a) * 3); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = '#d9dee4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * len, hy + Math.sin(a) * len); ctx.stroke();
  ctx.restore();
}

// 추격 차: 경찰차와 조직 차. 도로를 따라 와서 가까우면 서고 둘이 내린다
const GANG_CAR_COL = { A: 2, B: 3, C: 6, D: 4 };
function spawnChaseCar(fac) {
  const v = spawnCopCar(); if (!v) return null;
  if (fac && fac !== 'P') { v.police = false; v.gang = fac; v.c = GANG_CAR_COL[fac] ?? 2; }
  return v;
}
function deployFromCar(v) {
  const out = [];
  for (const s of [-1, 1]) {
    const a = v.a + s * Math.PI / 2, x = v.x + Math.cos(a) * 50, y = v.y + Math.sin(a) * 50;
    if (!v.gang) { const g = spawnCop(); if (g) { g.x = x; g.y = y; g.path = null; copChase(g); out.push(g); } continue; }
    const g = makeGuard({ kind: s < 0 ? 'g2' : 'g1', at: [Math.floor(x / TILE), Math.floor(y / TILE)], radio: false }, S.guards.length);
    g.fac = v.gang; g.outfit = FAC_OUTFIT[v.gang] || null; g.rival = true; g.radio = false; g.torch = false; g.x = x; g.y = y; g.carCrew = true;
    g.route = [{ x, y, pause: 999 }]; S.guards.push(g); setLayer(0); buildRouteLine(g); if (PR) prWarm([charOf(g)], true);
    g.state = 'ALERT'; g.lastSeen = { x: S.player.x, y: S.player.y, fl: 0, z: 0 }; g.lostT = 0; g.path = null; out.push(g);
  }
  return out;
}
// 조직이 나를 쫓다 놓칠 만큼 멀어지면 차를 부른다 (조직마다 한 대)
// 나를 쫓는 중이거나, 나를 쫓다가 놓치고 찾는 중(30초 안)인 조직원. 시체를 보고 수색하는 조직원은 빼다
function huntsMe(g) { if (g.state === 'ALERT') { g.chasedT = S.t; return true; } return g.state === 'SEARCH' && g.chasedT != null && S.t - g.chasedT < 30; }
function updateGangCars(dt) {
  if ((S.gangCarT = (S.gangCarT || 0) - dt) > 0) return; S.gangCarT = 3;
  const P = S.player, hunting = {};
  for (const g of S.guards) if (cityGang(g) && huntsMe(g)) { const d = dist(g.x, g.y, P.x, P.y); hunting[g.fac] = Math.min(hunting[g.fac] ?? 1e9, d); }
  for (const f in hunting) {
    if (hunting[f] < 520 && !P.car) continue;  // 걸어서 따라잡을 만하면 차는 부르지 않는다
    if (S.vehicles.some(v => v.gang === f && v.chase && !v.dead)) continue;
    if (!spawnChaseCar(f)) S.gangCarT = 0.5;  // 알맞은 길목을 못 찾았으면 곧 다시 찾는다
  }
  // 나를 찾는(추격·수색) 조직원이 없어진 조직의 차는 그냥 차로 돌아간다
  for (const v of S.vehicles) if (v.gang && v.chase && !S.guards.some(g => g.fac === v.gang && cityGang(g) && huntsMe(g))) v.chase = false;
}

// 차 사고: 사람은 차 방향으로 날아가 쓰러지고, 그 자리에 피가 튄다
function carImpact(v, g, lethal) {
  const a = v.a, spd = Math.abs(v.v);
  spawnEffect('impact', { x: g.x, y: g.y - 16, fl: 0, z: 0 }, { scale: 1.1 });
  spawnEffect('strike', { x: g.x, y: g.y - 12, fl: 0, z: 0 }, { angle: a, scale: 1.2 });
  S.shakeT = Math.max(S.shakeT || 0, lethal ? 0.35 : 0.2); S.flash = Math.max(S.flash || 0, lethal ? 0.18 : 0.1);
  play('thud', 0.9); play(Math.random() < 0.5 ? 'kill' : 'kill2', 0.7);
  bloodSpray(g.x, g.y, a, lethal ? 7 : 3); bloodBurst(g.x, g.y - 10, a, lethal ? 4 : 2);
  // 날아가는 몸: 벽에 닿기 전까지 차가 가던 쪽으로
  const c = S.corpses[S.corpses.length - 1]; if (!c || c.g !== g) return;
  let reach = Math.min(150, 40 + spd * 0.22), x1 = g.x, y1 = g.y;
  for (let k = 6; k <= reach; k += 6) { const nx = g.x + Math.cos(a) * k, ny = g.y + Math.sin(a) * k; if (SOLID.has(G0[Math.floor(ny / TILE)]?.[Math.floor(nx / TILE)] ?? '#')) break; x1 = nx; y1 = ny; }
  c.fly = { t: 0, dur: 0.32, x0: g.x, y0: g.y, x1, y1 };
  bloodSpray(x1, y1, a, lethal ? 5 : 2); if (lethal) bloodPool(x1, y1 + 4, rnd(22, 30));
}
function bloodSpray(x, y, a, n) {
  if (!S.decals) return;
  for (let k = 0; k < n; k++) {
    const d = rnd(4, 26 + n * 4), s = a + rnd(-0.7, 0.7);
    S.decals.push({ x: x + Math.cos(s) * d, y: y + Math.sin(s) * d, r: rnd(5, k === 0 ? 20 : 12), rot: rnd(0, TAU), fl: 0, k: 0, spray: true });
  }
  if (S.decals.length > 400) S.decals.splice(0, S.decals.length - 400);
}

// 간판 네온: 밤에는 가게 간판이 제 색으로 빛난다 (가끔 깜빡임)
const signGlowCache = {};
function signGlowColor(key) {
  if (signGlowCache[key] !== undefined) return signGlowCache[key];
  const two = !citySignArt?.frames[key] && !!citySignArt2?.frames[key], art = two ? citySignArt2 : citySignArt, img = two ? citySignAtlas2 : citySignAtlas, f = art?.frames[key]?.rect;
  if (!f || !img.complete || !img.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = f[2]; c.height = f[3]; const q = c.getContext('2d'); q.drawImage(img, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
  const d = q.getImageData(0, 0, f[2], f[3]).data; let best = null, bv = 0;
  for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 200) continue; const r = d[i], gg = d[i + 1], b = d[i + 2], v = Math.max(r, gg, b) - Math.min(r, gg, b) + (r + gg + b) / 6; if (v > bv) { bv = v; best = [r, gg, b]; } }
  return (signGlowCache[key] = best ? best.join(',') : '255,220,160');
}
function drawSignNeon() {
  if (!STAGE.referenceBuildings) return;
  BLD.forEach((b, i) => { if (!b.vacant && i !== S.openB) drawStoreSigns(b, true); });
  BLD.forEach((b, i) => {
    const spec = STAGE.referenceBuildings[i], a = spec?.ad; if (!a || b.vacant || i === S.openB) return;
    const x = (b.x0 + a.x) * TILE, y = (b.y1 - a.fl) * TILE, w = a.w * TILE, h = a.h * TILE; if (!inView(x + w / 2, y + h / 2, w + 60)) return;
    const rgb = signGlowColor(a.image); if (!rgb) return;
    const flick = (i * 7 + Math.floor(S.t * 9)) % 61 === 0 ? 0.3 : 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [pad, al] of [[26, .06], [14, .1], [5, .16]]) { ctx.fillStyle = `rgba(${rgb},${al * flick})`; ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.75 * flick; drawStudySign(b, a); ctx.restore();
  });
}

// 피: 튀는 핏방울(떨어지면 바닥 자국)과 몸 밑에 번지는 피 웅덩이
function bloodBurst(x, y, a, power) {
  const B = S.bloodParts || (S.bloodParts = []);
  for (let k = 0; k < power * 7; k++) {
    const s = a + rnd(-1.0, 1.0), sp = rnd(70, 240) * (0.6 + power * 0.25);
    B.push({ x, y, z: rnd(12, 26), vx: Math.cos(s) * sp, vy: Math.sin(s) * sp, vz: rnd(60, 180), r: rnd(1.6, 3.6) });
  }
  if (B.length > 600) B.splice(0, B.length - 600);
}
function bloodPool(x, y, to) { if (S.decals) S.decals.push({ x, y, r: 3, rot: rnd(0, TAU), fl: 0, k: 0, grow: to }); }
function updateBlood(dt) {
  const B = S.bloodParts; if (B && B.length) {
    for (let i = B.length - 1; i >= 0; i--) { const p = B[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 560 * dt; p.z += p.vz * dt; p.vx *= 0.985; p.vy *= 0.985;
      if (p.z <= 0) { S.decals.push({ x: p.x, y: p.y, r: p.r * rnd(1.2, 2.2), rot: rnd(0, TAU), fl: 0, k: 0, spray: true }); B.splice(i, 1); } }
  }
  for (const d of S.decals || []) if (d.grow && d.r < d.grow) d.r = Math.min(d.grow, d.r + dt * 7);
}
function drawBloodParts() {
  const B = S.bloodParts; if (!B || !B.length) return;
  ctx.save(); ctx.fillStyle = '#9a1016';
  for (const p of B) { if (!inView(p.x, p.y, 40)) continue; ctx.beginPath(); ctx.ellipse(p.x, p.y - p.z, p.r, p.r * 1.3, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// 사람이 죽는 순간(칼·주먹·총·차): 피가 터지고 몸 밑에 웅덩이가 번진다
function cityDeathGore(o, by) {
  const a = by ? Math.atan2(o.y - by.y, o.x - by.x) : rnd(0, TAU);
  bloodBurst(o.x, o.y - 6, a, by && cityGang(by) ? 3 : 2); bloodPool(o.x + rnd(-4, 4), o.y + rnd(-2, 6), rnd(18, 26));
  spawnEffect('impact', { x: o.x, y: o.y - 16, fl: 0, z: 0 }, { scale: 0.9 });
}

function cityLifeUpdate(dt) {
  updateCuffs(dt); if (!S.cuffs) updateArrest(dt);
  for (const g of S.guards) if (g.state === 'ALERT' && cityGang(g)) g.chasedT = S.t;
  updateGangCars(dt);
  updateBlood(dt);
}

// 한국식 간판: 1층 위 건물 폭 가로 간판(가게 이름 · 작은 부제), 위층 업소는 건물 오른쪽 세로 돌출 간판(층 표시)
// 밤에는 LED처럼 스스로 빛난다(lit). 글자는 게임 UI 글꼴로 그린다
const SIGN_STYLE = [
  [/국밥|순댓국|백반|분식|곱창|골뱅이|노가리|포차|식당/, '#c8302a', '#fff6e8', '#ffd25a'],
  [/호프|생맥주|치킨/, '#f2b420', '#3a1a10', '#c8302a'],
  [/편의점/, '#1f8a4a', '#ffffff', '#ffd25a'],
  [/약국/, '#ffffff', '#1f8a4a', '#1f8a4a'],
  [/PC방|노래방|당구장|기원|다방/, '#2a1440', '#ff7ad8', '#6ae8ff'],
  [/헬스/, '#121418', '#ffd23a', '#ff4a3a'],
  [/학원/, '#ffffff', '#1d4ea8', '#e8402a'],
  [/세무사|법무사|부동산/, '#f4f2ea', '#1d2c58', '#b02a2a'],
  [/CLUB/, '#120818', '#ff4ad8', '#6ae8ff'],
];
const SIGN_SUB = ['24시', '맛집', '배달', '영업중', '본점', '할인', '1층'];
function signStyle(txt) { for (const [re, bg, fg, ac] of SIGN_STYLE) if (re.test(txt)) return { bg, fg, ac }; return { bg: '#1d3c78', fg: '#ffffff', ac: '#ffd25a' }; }
function signHash(b) { return ((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0; }
function drawStoreSigns(b, lit) {
  if (b.kind !== 'shop' || !b.fh || !b.signs) return;
  const hs = signHash(b), x0 = b.x0 * TILE, w = (b.x1 - b.x0 + 1) * TILE; if (!inView(x0 + w / 2, b.y1 * TILE, w)) return;
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  // 가로 간판
  const name = (b.signs[0] || '').trim();
  if (name) {
    const st = signStyle(name), bx = x0 + 4, bw = w - 8, bh = 30, by = b.y1 * TILE - bh + 4, sub = SIGN_SUB[hs % SIGN_SUB.length];
    if (lit) { ctx.globalCompositeOperation = 'lighter'; const c = hexRgb(st.bg === '#ffffff' || st.bg === '#f4f2ea' ? st.ac : st.bg);
      for (const [pad, a] of [[20, .07], [9, .12]]) { ctx.fillStyle = `rgba(${c},${a})`; ctx.fillRect(bx - pad, by - pad, bw + pad * 2, bh + pad * 2); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .9; }
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(bx + 2, by + 3, bw, bh);
    ctx.fillStyle = st.bg; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = st.ac; ctx.fillRect(bx, by, bw, 3); ctx.fillRect(bx, by + bh - 2, bw, 2);
    ctx.font = '700 22px ' + UI_FONT_FAMILY; ctx.fillStyle = st.fg; ctx.fillText(name, bx + bw / 2, by + bh / 2 + 1, bw - 80);
    if (bw > 150) { ctx.font = '700 11px ' + UI_FONT_FAMILY; ctx.fillStyle = st.ac; ctx.fillText(sub, bx + 26, by + bh / 2 + 1); ctx.fillText('☎', bx + bw - 22, by + bh / 2 + 1); }
    ctx.globalAlpha = 1;
  }
  // 세로 돌출 간판: 위층 업소들 (층 표시와 함께)
  const ups = []; for (let f = 1; f < b.signs.length && f < b.fh; f++) { const t = (b.signs[f] || '').trim(); if (t) ups.push([f, t]); }
  if (ups.length) {
    const [f, t] = ups[0], st = signStyle(t), vx = x0 + w - 4, vy = (b.y1 - b.fh + 1) * TILE + 8, vh = Math.max(TILE, (b.fh - 1) * TILE - 10), vw = 28, chars = [...t.replace(/\s/g, '')];
    if (lit) { ctx.globalCompositeOperation = 'lighter'; const c = hexRgb(st.ac); for (const [pad, a] of [[16, .08], [6, .14]]) { ctx.fillStyle = `rgba(${c},${a})`; ctx.fillRect(vx - pad, vy - pad, vw + pad * 2, vh + pad * 2); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .9; }
    ctx.fillStyle = '#2a2e36'; ctx.fillRect(vx - 6, vy + 6, 6, 3); ctx.fillRect(vx - 6, vy + vh - 9, 6, 3);
    ctx.fillStyle = st.bg; ctx.fillRect(vx, vy, vw, vh); ctx.strokeStyle = st.ac; ctx.lineWidth = 2; ctx.strokeRect(vx + 1, vy + 1, vw - 2, vh - 2);
    ctx.font = '700 16px ' + UI_FONT_FAMILY; ctx.fillStyle = st.fg; const step = Math.min(20, (vh - 22) / Math.max(1, chars.length));
    chars.forEach((ch, k) => ctx.fillText(ch, vx + vw / 2, vy + 12 + k * step));
    ctx.font = uiFont(9); ctx.fillStyle = st.ac; ctx.fillText((f + 1) + 'F', vx + vw / 2, vy + vh - 8);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
