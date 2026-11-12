// ---------------------------------------------------------------- 자유 모드 광란 도전 · 떨어진 탄약/돈 줍기 · 방탄조끼
// 광란: 골목 여섯 곳에 붉은 표식이 숨어 있다(미니맵에 안 나온다). 걸어서 밟으면 그 자리 무기(탄 무제한)를 쥐고
//       정해진 시간 안에 정해진 수를 쓰러뜨려야 한다. 성공하면 돈 + 표식이 사라진다(저장). 실패하면 2분 뒤 다시 나타난다.
// 줍기: 쓰러진 경찰(★2부터 총을 차고 있다)·조직원 곁에 탄약 상자나 돈이 떨어진다. 걸어서 지나가면 줍는다(1분 남는다).
// 방탄조끼: 조직 무기 거래에서 산다. 맞을 때 체력 대신 조끼가 세 번까지 막는다(저장).
const RAMPS = [
  { wpn: 'smg', goal: 12, dur: 60, pay: 600 }, { wpn: 'shotgun', goal: 10, dur: 50, pay: 600 }, { wpn: 'grenade', goal: 8, dur: 45, pay: 700 },
  { wpn: 'molotov', goal: 8, dur: 50, pay: 700 }, { wpn: 'pistol', goal: 10, dur: 60, pay: 500 }, { wpn: 'smg', goal: 20, dur: 75, pay: 1200 }];
const RAMP_RETRY = 120, ARMOR_MAX = 3, ARMOR_PRICE = 400;
function rampageInit() {
  S.ramp = null; S.pickups = []; S.rampCd = {}; S.rampDone = Object.assign({}, S.rampDoneSaved || {}); S.dropScan = 0;
  S.player.armor = Math.min(ARMOR_MAX, S.armorSaved | 0); S.player.poison = S.poisonSaved | 0;
  // 표식 자리: 서로 1100px 넘게 떨어진 건물 앞 보도, 문에서 90px 비켜 (드나들다 밟지 않게) (도시가 같으면 늘 같은 자리)
  const fronts = []; for (let i = 0; i < BLD.length; i++) { const b = BLD[(i * 37 + 11) % BLD.length]; if (b.vacant) continue; const p = shopFront(b); if (p) fronts.push(p); }
  S.rampSpots = []; for (const p of fronts) { if (S.rampSpots.length >= RAMPS.length) break; const o = [[90, 30], [-90, 30], [90, 0], [-90, 0]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).find(q => jobOpen(q.x, q.y)); if (o && S.rampSpots.every(q => dist(q.x, q.y, o.x, o.y) > 1100)) S.rampSpots.push(o); }
  rampHud();
}
const rampLive = i => S.rampSpots[i] && !S.rampDone[i] && !(S.rampCd[i] > S.t) && !S.ramp;
function rampageUpdate(dt) {
  if (!STAGE.cityLife || !S.rampSpots) return; const P = S.player;
  // 밟기
  if (!S.ramp && !P.car && !P.trav && !S.downing && !S.cuffs && !flOf(P)) for (let i = 0; i < S.rampSpots.length; i++) { const p = S.rampSpots[i]; if (rampLive(i) && dist(P.x, P.y, p.x, p.y) < 26) { rampStart(i); break; } }
  const R = S.ramp;
  if (R) {
    if ((R.scan -= dt) <= 0) { R.scan = 0.2; for (const g of S.guards) if (g.state === 'DEAD' && !R.seen.has(g) && dist(g.x, g.y, P.x, P.y) < 900) { R.seen.add(g); R.n++; if (R.n < R.goal) play('click', 0.35, 1.4); } }
    S.guns[R.wpn] = 99; if (S.wpn !== R.wpn) S.wpn = R.wpn;
    if (R.n >= R.goal) rampEnd(true); else if (S.t - R.t0 > R.dur || S.downing || S.cuffs) rampEnd(false);
    rampHud();
  }
  pickupsUpdate(dt);
}
function rampStart(i) {
  const P = S.player, C = RAMPS[i];
  S.ramp = { i, wpn: C.wpn, goal: C.goal, dur: C.dur, pay: C.pay, t0: S.t, n: 0, scan: 0, seen: new Set(S.guards.filter(g => g.state === 'DEAD')), prevWpn: S.wpn, prevAmmo: S.guns[C.wpn] || 0 };
  S.guns[C.wpn] = 99; S.wpn = C.wpn; gunChip(); fstat('rampTries');
  play('bell', 0.6, 0.6); play('alarm', 0.3); S.flash = 0.35; S.shakeT = Math.max(S.shakeT || 0, 0.3); slowMo(0.35);
  evBanner(`광란! ${C.dur}초 안에 ${C.goal}명 — ${WEAPONS[C.wpn].name} 무제한`, '#ff5a4a');
}
function rampEnd(win) {
  const R = S.ramp; if (!R) return; S.ramp = null;
  S.guns[R.wpn] = R.prevAmmo; S.wpn = R.prevWpn && (S.guns[R.prevWpn] || 0) > 0 ? R.prevWpn : null; gunChip();
  if (win) { S.rampDone[R.i] = 1; S.cash = (S.cash || 0) + R.pay; fstat('rampages'); fstat('earned', R.pay); play('bell', 0.7); play('loot', 0.6); slowMo(0.6); S.flash = 0.3;
    evBanner(`광란 완료! +${R.pay}만 (${Object.keys(S.rampDone).length}/${RAMPS.length})`, '#ffd76a'); saveFreeProgress(true); }
  else { S.rampCd[R.i] = S.t + RAMP_RETRY; play('thud', 0.5); evBanner(`광란 실패 — ${R.n}/${R.goal}. 표식은 2분 뒤 돌아온다`, '#c8c0b0'); }
  rampHud();
}
// 화면 위쪽 가운데: 남은 시간 · 쓰러뜨린 수
function rampHud() {
  let el = document.getElementById('rampHud'); const R = S && S.ramp;
  if (!R) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'rampHud'; el.setAttribute('aria-live', 'off');
    el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translateX(-50%);z-index:40;pointer-events:none;padding:6px 14px;background:rgba(40,6,6,.78);border:1px solid #a33;border-radius:6px;color:#ffe8d8;font:700 17px "Yahaeng UI",sans-serif;text-shadow:0 1px 0 #000;white-space:nowrap';
    document.body.appendChild(el); }
  const left = Math.max(0, Math.ceil(R.dur - (S.t - R.t0)));
  el.textContent = `광란 ${R.n}/${R.goal} · ${left}초`; el.style.borderColor = left <= 10 && (S.t * 2 | 0) % 2 ? '#ff6a5a' : '#a33';
}
// ---- 떨어진 탄약 · 돈
function pickupsUpdate(dt) {
  const P = S.player;
  if ((S.dropScan -= dt) <= 0) { S.dropScan = 0.3;
    for (let i = Math.max(0, S.corpses.length - 40); i < S.corpses.length; i++) { const c = S.corpses[i]; if (c.dropped || c.fl || c.civ) continue; c.dropped = true;
      const g = c.g; if (!g || g.evt && g.evt !== 'war' || dist(c.x, c.y, P.x, P.y) > 1000) continue;  // 구역 이벤트 사람은 이벤트가 따로 떨군다
      if (g.police) { if (S.wanted >= 2 || Math.random() < 0.3) dropPickup(c.x + rnd(-14, 14), c.y + rnd(8, 16), 'ammo', 'pistol', 6 + (Math.random() * 7 | 0)); }
      else if (c.fac && c.fac !== 'P') { const r = Math.random();
        if (r < 0.35) dropPickup(c.x + rnd(-14, 14), c.y + rnd(8, 16), 'ammo', Math.random() < 0.25 ? 'shotgun' : 'pistol', 4 + (Math.random() * 6 | 0));
        else if (r < 0.75) dropPickup(c.x + rnd(-14, 14), c.y + rnd(8, 16), 'cash', null, 10 + (Math.random() * 40 | 0)); } } }
  for (let i = S.pickups.length - 1; i >= 0; i--) { const k = S.pickups[i];
    if (S.t - k.t > 60) { S.pickups.splice(i, 1); continue; }
    if (P.car || flOf(P) || S.t - k.t < 0.4 || dist(P.x, P.y, k.x, k.y) > 26) continue;
    S.pickups.splice(i, 1); play('loot', 0.45);
    if (k.kind === 'cash') { S.cash = (S.cash || 0) + k.n; fstat('earned', k.n); toast(`돈 +${k.n}만`, 1.2, 'good'); }
    else { if (S.ramp && S.ramp.wpn === k.wpn) S.ramp.prevAmmo += k.n; else S.guns[k.wpn] = (S.guns[k.wpn] || 0) + k.n; if (!S.wpn) S.wpn = k.wpn; gunChip(); toast(`${WEAPONS[k.wpn].name} 탄 +${k.n}`, 1.2, 'good'); } }
}
function dropPickup(x, y, kind, wpn, n) { if (solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) return; S.pickups.push({ x, y, kind, wpn, n, t: S.t }); if (S.pickups.length > 40) S.pickups.shift(); }
// 방탄조끼: hurtPlayer가 먼저 부른다. 막으면 true
function armorAbsorb() {
  const P = S.player; if (!STAGE.cityLife || !(P.armor > 0) || P.car) return false;
  P.armor--; P.hurtT = 1.2; S.flash = 0.12; S.shakeT = Math.max(S.shakeT || 0, 0.15); play('metal', 0.5, 1.3);
  const f = { x: P.x, y: P.y - 18, a: 0, len: 4 }; fireEmit(f, 'spark', 6, f); gunChip();
  toast(P.armor ? `조끼가 막았다 — 남은 조끼 ${P.armor}` : '조끼가 다 찢어졌다', 1.6, 'warn'); return true;
}
function drawRampage() {
  if (!S.rampSpots) return;
  for (let i = 0; i < S.rampSpots.length; i++) { const p = S.rampSpots[i]; if (!rampLive(i) || !inView(p.x, p.y, 40)) continue;
    const b = 0.6 + 0.4 * Math.sin(S.t * 4 + i), y = p.y - 6 - Math.abs(Math.sin(S.t * 2.2 + i)) * 5;
    ctx.fillStyle = `rgba(255,60,40,${0.18 * b})`; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 22, 9, 0, 0, TAU); ctx.fill();
    // 붉은 해골 픽셀 (10x10)
    const px = (x, w, yy, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(p.x - 10 + x * 2), Math.round(y - 10 + yy * 2), w * 2, 2); };
    const red = `rgba(255,${70 + 40 * b | 0},50,1)`;
    [[2, 6, 0], [1, 8, 1], [0, 10, 2], [0, 10, 3], [0, 10, 4], [1, 8, 6], [2, 6, 7], [3, 1, 8], [5, 1, 8], [7, 1, 8]].forEach(([x, w, yy]) => px(x, w, yy, red));
    px(0, 10, 5, red); px(2, 2, 3, '#1a0606'); px(6, 2, 3, '#1a0606'); px(2, 2, 4, '#1a0606'); px(6, 2, 4, '#1a0606'); px(4, 2, 6, '#1a0606');
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(p.x - 10.5), Math.round(y - 10.5), 21, 19); }
  for (const k of S.pickups || []) { if (!inView(k.x, k.y, 20)) continue; const fade = S.t - k.t > 50 && (S.t * 6 | 0) % 2, bob = Math.sin(S.t * 3 + k.x) * 1.5; if (fade) continue;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(k.x - 6, k.y + 4, 12, 3);
    if (k.kind === 'cash') { ctx.fillStyle = '#2f7a3a'; ctx.fillRect(k.x - 7, k.y - 4 + bob, 14, 7); ctx.fillStyle = '#9fe08a'; ctx.fillRect(k.x - 2, k.y - 2 + bob, 4, 3); }
    else { ctx.fillStyle = '#4a5238'; ctx.fillRect(k.x - 6, k.y - 5 + bob, 12, 8); ctx.fillStyle = '#e8c860'; ctx.fillRect(k.x - 4, k.y - 7 + bob, 2, 3); ctx.fillRect(k.x - 1, k.y - 7 + bob, 2, 3); ctx.fillRect(k.x + 2, k.y - 7 + bob, 2, 3); }
    ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.strokeRect(k.x - 7.5, k.y - 5.5 + bob, 15, 9); }
}
