// ---------------------------------------------------------------- 구역 (공개 · 출입 금지 · 적진)
// ---- 구역 (히트맨식): 공개 구역에선 나는 행인이다 — 수상한 짓을 보일 때만 의심받는다. 출입 금지 구역은 잠입 규칙(처음엔 경고), 적진은 보이면 적대
// STAGE.zones = [[x0, y0, x1, y1, 'pub' | 'res' | 'hos', 높이, 이름표], ...] (뒤에 적은 것이 우선. 높이: 없으면 땅, 'roof' 지붕만, 'all' 둘 다). 따로 적지 않으면: 거리 = 공개, 건물 안·옥상 = 출입 금지
// zones 가 없는 판은 옛 규칙(어디서나 적진)
const Z_PUB = 0, Z_RES = 1, Z_HOS = 2, Z_NAME = ['공개', '출입 금지', '적진'];
// ---- 신분(옷): 출입 금지·적진 구역마다 '허가 옷'이 있다. 허가된 옷을 입으면 그 구역 안에서도 행인처럼 대우받는다
// 구역 8번째 칸 = 허가 옷 목록. 적지 않으면: 땅은 STAGE.zoneAllow(기본: 자경대원 옷), 옥상은 아무도 없음
const OUTFITS = { crew: '자경대원 옷', staff: '상회 직원 조끼', courier: '택배 기사 옷', waiter: '클럽 직원 옷', cater: '출장 뷔페 조끼', parcel: '택배 상자' };
const outfitOf = g => g.outfit || (g.civ || g.dog || g.target ? null : 'crew');
const outfitName = o => OUTFITS[o] || '변장';
function zoneInfo(x, y, z) {
  if (!STAGE.zones) return { k: Z_HOS, allow: [] };
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), up = (z || 0) > 0, base = up ? [] : (STAGE.zoneAllow || ['crew']);
  const bi = bldAt(tx, ty);
  let k = up || (bi >= 0 && !BLD[bi].vacant) ? Z_RES : Z_PUB, allow = base;
  for (const r of STAGE.zones) if (tx >= r[0] && tx <= r[2] && ty >= r[1] && ty <= r[3] && (r[5] === 'all' || up === (r[5] === 'roof'))) { k = r[4] === 'pub' ? Z_PUB : r[4] === 'hos' ? Z_HOS : Z_RES; allow = r[7] || base; }
  return { k, allow };
}
const zoneAt = (x, y, z) => zoneInfo(x, y, z).k;
const pZoneInfo = () => { const P = S.player, pv = (P.trav && P.trav.base) || P; return zoneInfo(pv.x, pv.y, P.wire ? 1 : P.jump ? Math.max(P.z || 0, P.jump.z1 || 0) : P.trav ? (P.trav.elev || 0) : P.z); };
const pZone = () => pZoneInfo().k;
const disguised = () => { const P = S.player; return !!(P.outfit && !P.disguiseBlown); };
// 지금 통하는 신분: 입은 옷 + 들고 있는 물건(택배 상자 → 택배 기사처럼)
const myPermits = () => { const P = S.player, a = []; if (disguised()) a.push(P.outfit); if (P.item && P.item.permit) a.push(P.item.permit); return a; };
const allowedBy = allow => !!allow && myPermits().some(o => allow.includes(o));
const permitName = allow => { const o = myPermits().find(o => allow && allow.includes(o)); return o === S.player.outfit ? outfitName(o) : (S.player.item && S.player.item.name) || outfitName(o); };
const permitted = zi => zi.k !== Z_PUB && allowedBy(zi.allow);
// 실제로 적용되는 구역: 허가된 옷을 입고 있으면 공개 구역처럼
const pZoneEff = () => { const zi = pZoneInfo(); return permitted(zi) ? Z_PUB : zi.k; };
// 눈썰미: 같은 옷 무리 중 반장·사장(enforcer)은 가까이서 보면 변장을 알아챈다. 정예·표적은 어떤 옷이든 알아본다
const sharpEye = g => !g.dog && disguised() && (g.civ ? g.enforcer && outfitOf(g) === S.player.outfit : (g.elite || g.target || (g.enforcer && outfitOf(g) === S.player.outfit)));
const EYE_R = 120, EYE_T = 3;
function blowDisguise(g, why) {
  const P = S.player; if (!P.outfit || P.disguiseBlown) return;
  (P.blown = P.blown || {})[P.outfit] = true; P.disguiseBlown = true; S.stats.blown = (S.stats.blown || 0) + 1;
  toast(why || `들통났다 — 이제 ${outfitName(P.outfit)}은 통하지 않는다. 다른 옷을 구하라`, 3, 'warn');
  if (g) { gsay(g, ['잠깐, 넌 우리 사람이 아니잖아!', '너 누구야? 처음 보는 얼굴인데.', '그 옷 어디서 났어?'][g.id % 3]); g.eyeT = 0; }
}
function updateSharpEye(g, dt, rawVis) {
  if (!sharpEye(g)) { g.eyeT = 0; return; }
  const P = S.player, d = dist(g.x, g.y, P.x, P.y), R = g.target ? 90 : EYE_R;  // 표적은 바로 앞(90px)까지 와야 변장을 알아본다
  const faceVisible = Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))) < Math.PI * .6;
  if (rawVis > 0 && d < R && faceVisible) { if (!g.eyeT && !(S.eyeWarned = S.eyeWarned || {})[g.id]) { S.eyeWarned[g.id] = true; bossRadio('eye', true); } g.eyeT = (g.eyeT || 0) + dt; g.want = Math.atan2(P.y - g.y, P.x - g.x);
    hint('eye', '눈 표시: 눈썰미가 있다. 가까이서 오래 보이면 변장이 들통난다');
    if (g.eyeT >= EYE_T) { const of = P.outfit; blowDisguise(g); if (g.civ) { if (!(STAGE.zones && startReport(g, P.x, P.y, null, of, 'disguise'))) civScream(g, P.x, P.y); } else { g.seen = true; g.meter = 1; goAlert(g); } } }
  else g.eyeT = Math.max(0, (g.eyeT || 0) - dt * 0.6);
}
// 공개 구역에서 보는 이가 수상하게 여길 짓: 1 = 바로 의심(끌기·처치·타기·넘기·락픽·던지기), 0.35 = 가까이서 웅크려 살금살금, 0 = 그냥 행인
function suspAct(g) {
  const P = S.player;
  if ((P.interact && P.interact.illegal) || P.carrying || P.captive || P.strikeT > 0 || P.lunge || P.grabIn || S.pull || P.wire || P.ledge || P.pick || (S.throwT || 0) > S.t || (P.useT || 0) > S.t) return 1;
  if (P.trav && P.trav.phases.some(ph => ph.pose !== 'walk')) return 1;
  if (P.jump && (P.jump.vault || P.jump.z1 || P.z)) return 1;
  if (P.mode === 'run' && P.moving && g && dist(g.x, g.y, P.x, P.y) < 220) return 0.8;  // 사람 가까이서 뛰면 눈길을 끈다
  if (P.mode === 'sneak' && P.moving && g && !myPermits().length && dist(g.x, g.y, P.x, P.y) < 170) return 0.35;  // 변장·택배 상자가 있으면 웅크려 걸어도 신경 쓰지 않는다
  return 0;
}
// 목격한 옷차림만 기억한다. 시야 밖에서 얻은 새 신분을 경보만으로 알아보지는 않는다.
const suspectLook = () => S.player.outfit || 'face';
function rememberSuspect(g, look = suspectLook()) {
  if (g) g.suspectLook = look;
  S.chaseSeen = true; (S.knownLooks = S.knownLooks || {})[look] = true;
}
const knownFace = (g, look = suspectLook()) =>
  (g.state === 'ALERT' && (g.dog || (g.police && S.wanted > 0) || (g.suspectLook || 'face') === look)) ||
  !!(S.alevel >= 2 && S.chaseSeen && (S.knownLooks ? S.knownLooks[look] : look === 'face'));
// 허가받은 직원이 걷거나 뛰는 것은 업무 동선이다. 실제 불법 행동은 복장과 관계없이 판정한다.
const publicSuspicion = g => { const k = suspAct(g); return k < 1 && myPermits().length ? 0 : k; };
function onDisguiseChanged(previousLook) {
  const P = S.player; if (previousLook === suspectLook() || P.hide || P.under || P.vent) return;
  const L0 = CUR_F; setLayer(flOf(P));
  const witness = S.guards.find(g => !g.civ && !g.dog && !g.doomed && !['DEAD', 'CAPTIVE', 'TERROR'].includes(g.state) && flOf(g) === flOf(P) && knownFace(g, previousLook) && canSee(g, P.x, P.y, P.light, P.hidden, P.mode === 'sneak', P.z) > 0);
  setLayer(L0);
  if (witness) { witness.seen = true; goAlert(witness); }
}
// 출입 금지 경고: 다가와 나가라고 한다. 4초 안에 공개 구역으로 나가면 돌아가고(두 번째부터는 바로 발각), 버티거나 수상한 짓을 하면 발각
function startWarn(g) {
  if (g.warnEnd && S.t < g.warnEnd + 1) { g.state = 'WARN'; return; }
  const P = S.player; endChat(g); g.act = null; g.bubble = null; g.state = 'WARN'; g.warnEnd = S.t + 4.5; g.warnExt = 0; g.warnD0 = dist(g.x, g.y, P.x, P.y); g.path = null; g.meter = 0.92; setIcon(g, '!?'); play('question', 0.5);
  g.lastSeen = pSpot();
  g.say = ['거기요! 여긴 관계자 외 출입 금지입니다. 나가세요.', '이봐요, 여기 들어오면 안 돼요. 당장 나가요.', '여긴 관계자만 다닙니다. 돌아 나가세요.'][g.id % 3]; g.sayT = 3.2;
  hint('warn', '출입 금지: 처음 들키면 경고만 한다. 고리가 닳기 전에 나가면 끝, 또 들키면 발각');
}
// 경고 중: 플레이어 쪽으로 몸을 돌리고(보이면 다가온다), 시간이 다 되면
//  · 공개 구역으로 나갔다 → 돌아간다   · 나가는 중(멀어지는 중)이다 → 조금 더 기다려 준다(최대 3초)
//  · 눈앞에서 사라졌다 → 마지막 본 곳을 살피러 간다(발각 아님)   · 보이는 채로 버틴다 → 발각
function updateTrespass(g, dt, pz) {
  const P = S.player; g.want = Math.atan2(P.y - g.y, P.x - g.x); g.a += clamp(angDiff(g.a, g.want), -3.5 * dt, 3.5 * dt); g.meter = Math.max(g.meter, 0.92);
  if (g.seen) g.lastSeen = pSpot();
  if (dist(g.x, g.y, P.x, P.y) > 70 && g.seen) { g.repath = (g.repath || 0) - dt; if (g.repath <= 0 || !g.path) { pathTo(g, P.x, P.y); g.repath = 0.5; } moveAlong(g, SPD.gSusp * 0.8 * spdMul(), dt); }
  g.warnT = g.warnEnd - S.t;
  if (pz === Z_PUB && !publicSuspicion(g)) { g.warned = true; g.state = 'RETURN'; g.path = null; g.meter = 0.3; g.icon = null; g.say = ['다시는 들어오지 마세요.', '그래요, 그쪽으로 가세요.', '두 번은 안 봐줍니다.'][g.id % 3]; g.sayT = 2.4; return; }
  if (suspAct(g) === 1 || pz === Z_HOS) { g.warned = true; goAlert(g); return; }
  if (g.warnT > 0) return;
  const away = dist(g.x, g.y, P.x, P.y) > (g.warnD0 || 0) + 48;
  if (g.seen && away && (g.warnExt || 0) < 3) { g.warnEnd += 1; g.warnExt = (g.warnExt || 0) + 1; return; }  // 나가는 중이면 조금 더
  g.warned = true;
  if (g.seen) { goAlert(g); return; }
  g.state = 'SEARCH'; g.poi = g.lastSeen || { x: P.x, y: P.y }; g.reached = false; g.path = null; g.waitBase = 3; g.meter = 0.6; setIcon(g, '?');  // 사라졌다: 마지막 본 곳을 살핀다
  g.say = '어디 갔어…? 분명 이쪽으로 왔는데.'; g.sayT = 2.2;
}
// 구역 경계 그리기: 땅에서 공개 칸과 출입 금지·적진 칸이 맞닿는 변(문턱·담 틈·마당 경계)에 주황·빨강 선. 적어 둔 구역은 옅게 칠하고 이름표
// 경계 변은 판마다 한 번 계산한다 (S.zEdges). 전술 지도에서는 거리와 상관없이 모두 보인다
function zoneEdges() {
  if (S.zEdges) return S.zEdges; const E = [], L0 = CUR_F; setLayer(0);
  const walk = (x, y) => inMap(x, y) && !SOLID.has(G[y][x]);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (!walk(x, y)) continue; const ia = zoneInfo(tc(x), tc(y), 0), a = ia.k;
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const nx = x + dx, ny = y + dy; if (!walk(nx, ny)) continue; const ib = zoneInfo(tc(nx), tc(ny), 0), b = ib.k; if (a === b || Math.min(a, b) !== Z_PUB) continue;
      E.push({ x0: (x + dx) * TILE, y0: (y + dy) * TILE, x1: (x + 1) * TILE, y1: (y + 1) * TILE, k: Math.max(a, b), allow: (a === Z_PUB ? ib : ia).allow, ix: a === Z_PUB ? dx : -dx, iy: a === Z_PUB ? dy : -dy }); }
  }
  setLayer(L0); return (S.zEdges = E);
}
// 경계선 색은 지금 입은 옷 기준: 초록 = 들어가도 된다, 주황 = 출입 금지, 빨강 = 적진
const zoneCol = (k, allow) => allowedBy(allow) ? '110,205,135' : k === Z_HOS ? '232,80,60' : '242,170,70';
function drawZones(P) { if (window.__skip && window.__skip.ui) return;  // 첫 화면 배경 찍기: 글자·표시 없이
  if (!tactical && ((P.z || 0) > 0 || flOf(P) > 0 || P.wire)) return;  // 옥상·위층·전깃줄 위: 땅의 구역 선·이름표는 안 보인다
  const far = tactical ? 1e9 : 520;
  for (const e of zoneEdges()) {
    const mx = (e.x0 + e.x1) / 2, my = (e.y0 + e.y1) / 2, d = dist(P.x, P.y, mx, my); if (d > far) continue;
    const col = zoneCol(e.k, e.allow), a = tactical ? 0.8 : Math.max(0.25, 0.85 - d / 700);
    ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(e.x0, e.y0); ctx.lineTo(e.x1, e.y1); ctx.stroke(); ctx.setLineDash([]);
    const g = ctx.createLinearGradient(mx, my, mx + e.ix * 18, my + e.iy * 18); g.addColorStop(0, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);  // 금지 쪽으로 번지는 옅은 띠
    ctx.fillStyle = g; ctx.fillRect(Math.min(e.x0, e.x0 + e.ix * 18) - (e.ix ? 0 : 0), Math.min(e.y0, e.y0 + e.iy * 18), e.ix ? 18 : e.x1 - e.x0, e.iy ? 18 : e.y1 - e.y0);
  }
  for (const r of STAGE.zones) {  // 적어 둔 출입 금지·적진 구역: 옅은 칠과 이름표
    if (r[4] === 'pub' || r[5] === 'roof') continue;
    const x = r[0] * TILE, y = r[1] * TILE, w = (r[2] - r[0] + 1) * TILE, h = (r[3] - r[1] + 1) * TILE, hos = r[4] === 'hos', ok = allowedBy(r[7] || STAGE.zoneAllow || ['crew']), col = zoneCol(hos ? Z_HOS : Z_RES, r[7] || STAGE.zoneAllow || ['crew']);
    const d = Math.hypot(clamp(P.x, x, x + w) - P.x, clamp(P.y, y, y + h) - P.y); if (d > far) continue;
    ctx.fillStyle = `rgba(${col},.05)`; ctx.fillRect(x, y, w, h);
    const lo = Math.max(x + 60, cam.x - W / SCALE / 2 + 110 / SCALE), hi = Math.min(x + w - 60, cam.x + W / SCALE / 2 - 110 / SCALE), lx = lo <= hi ? clamp(x + w / 2, lo, hi) : x + w / 2;  // 구역이 화면에 걸쳐 있으면 이름표를 보이는 쪽으로
    if ((d < 320 && !chaseNow()) || tactical) tag(lx, y + h - 12, ok ? (r[6] || '출입 금지').split(' · ')[0] + ' · 통과' : (r[6] || (hos ? '적진' : '출입 금지')), ok ? '#8fe0a4' : hos ? '#ff8a76' : '#f2b45a', 0.95);
  }
  // 가까운 문턱에 '출입 금지' 표지 (가장 가까운 하나만). 허가 옷을 입었으면 '통과'
  if (!tactical) { let best = null, bd = 150; for (const e of zoneEdges()) { const mx = (e.x0 + e.x1) / 2, my = (e.y0 + e.y1) / 2, d = dist(P.x, P.y, mx, my); if (d < bd && pZone() === Z_PUB) { bd = d; best = e; } }
    if (best) { const ok = allowedBy(best.allow);
      tag((best.x0 + best.x1) / 2 + best.ix * 26, (best.y0 + best.y1) / 2 + best.iy * 26, ok ? '통과 — ' + permitName(best.allow) : best.k === Z_HOS ? '적진' : '출입 금지', ok ? '#8fe0a4' : best.k === Z_HOS ? '#ff8a76' : '#f2b45a', 0.9); } }
}
// 눈썰미 인물: 머리 위 눈 표시, 알아채는 중이면 차오르는 고리
function drawSharpEye(g) {
  if (!STAGE.zones || g.state === 'DEAD' || g.dog || !(g.enforcer || (!g.civ && (g.elite || g.target)))) return;
  const P = S.player, on = sharpEye(g); if (!on && !(g.enforcer && dist(g.x, g.y, P.x, P.y) < 420)) return;
  const x = g.x, y = g.y - 52, f = clamp((g.eyeT || 0) / EYE_T, 0, 1);
  ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.fillStyle = on ? (f > 0 ? '#ffd06a' : '#f4f1ea') : 'rgba(244,241,234,.55)';
  ctx.beginPath(); ctx.ellipse(x, y, 9, 5.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#141820'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
  if (f > 0) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.stroke(); ctx.strokeStyle = f > 0.6 ? '#ff6a4c' : '#ffd06a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke(); }
  ctx.restore();
}
// 출입 금지 경고 중: 경비 둘레에 남은 시간 고리 (다 닳기 전에 공개 구역으로 나가야 한다)
function drawWarnRing(g) {
  if (g.state !== 'WARN' || !g.warnEnd) return; const f = clamp((g.warnEnd - S.t) / 4.5, 0, 1);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(g.x, g.y, 26, 0, TAU); ctx.stroke();
  ctx.strokeStyle = f > 0.35 ? 'rgba(242,170,70,.95)' : 'rgba(232,80,60,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(g.x, g.y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
}
