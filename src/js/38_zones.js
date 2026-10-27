// ---------------------------------------------------------------- 구역 (공개 · 출입 금지 · 적진)
// ---- 구역 (히트맨식): 공개 구역에선 나는 행인이다 — 수상한 짓을 보일 때만 의심받는다. 출입 금지 구역은 잠입 규칙(처음엔 경고), 적진은 보이면 적대
// STAGE.zones = [[x0, y0, x1, y1, 'pub' | 'res' | 'hos', 높이, 이름표], ...] (뒤에 적은 것이 우선. 높이: 없으면 땅, 'roof' 지붕만, 'all' 둘 다). 따로 적지 않으면: 거리 = 공개, 건물 안·옥상 = 출입 금지
// zones 가 없는 판은 옛 규칙(어디서나 적진)
const Z_PUB = 0, Z_RES = 1, Z_HOS = 2, Z_NAME = ['공개', '출입 금지', '적진'];
function zoneAt(x, y, z) {
  if (!STAGE.zones) return Z_HOS;
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); let k = (z || 0) > 0 || bldAt(tx, ty) >= 0 ? Z_RES : Z_PUB;
  for (const r of STAGE.zones) if (tx >= r[0] && tx <= r[2] && ty >= r[1] && ty <= r[3] && (r[5] === 'all' || ((z || 0) > 0) === (r[5] === 'roof'))) k = r[4] === 'pub' ? Z_PUB : r[4] === 'hos' ? Z_HOS : Z_RES;
  return k;
}
const pZone = () => { const P = S.player, pv = (P.trav && P.trav.base) || P; return zoneAt(pv.x, pv.y, P.wire ? 1 : P.jump ? Math.max(P.z || 0, P.jump.z1 || 0) : P.trav ? (P.trav.elev || 0) : P.z); };
// 공개 구역에서 보는 이가 수상하게 여길 짓: 1 = 바로 의심(끌기·처치·타기·넘기·락픽·던지기), 0.35 = 가까이서 웅크려 살금살금, 0 = 그냥 행인
function suspAct(g) {
  const P = S.player;
  if (P.carrying || P.captive || P.strikeT > 0 || P.lunge || S.pull || P.wire || P.ledge || P.pick || (S.throwT || 0) > S.t) return 1;
  if (P.trav && P.trav.phases.some(ph => ph.pose !== 'walk')) return 1;
  if (P.jump && (P.jump.vault || P.jump.z1 || P.z)) return 1;
  if (P.mode === 'sneak' && P.moving && g && dist(g.x, g.y, P.x, P.y) < 170) return 0.35;
  return 0;
}
// 나를 알아보는가: 쫓기는 중(발각)이거나, 발각 뒤 수색이 끝나기 전이면 공개 구역이어도 얼굴을 안다
const knownFace = g => g.state === 'ALERT' || (S.alevel >= 2 && S.chaseSeen);
// 출입 금지 경고: 다가와 나가라고 한다. 4초 안에 공개 구역으로 나가면 돌아가고(두 번째부터는 바로 발각), 버티거나 수상한 짓을 하면 발각
function startWarn(g) {
  if (g.warnEnd && S.t < g.warnEnd + 1) { g.state = 'WARN'; return; }
  const P = S.player; endChat(g); g.act = null; g.bubble = null; g.state = 'WARN'; g.warnEnd = S.t + 4.5; g.warnExt = 0; g.warnD0 = dist(g.x, g.y, P.x, P.y); g.path = null; g.meter = 0.92; setIcon(g, '!?'); play('question', 0.5);
  g.lastSeen = pSpot();
  g.say = ['거기요! 여긴 관계자 외 출입 금지입니다. 나가세요.', '이봐요, 여기 들어오면 안 돼요. 당장 나가요.', '여긴 관계자만 다닙니다. 돌아 나가세요.'][g.id % 3]; g.sayT = 3.2;
  hint('warn', '출입 금지 구역에서 처음 들키면 자경대원이 경고한다. 고리가 다 닳기 전에 공개 구역(거리)으로 나가거나 눈앞에서 사라지면 넘어가지만, 같은 자경대원에게 또 들키면 바로 발각된다');
}
// 경고 중: 플레이어 쪽으로 몸을 돌리고(보이면 다가온다), 시간이 다 되면
//  · 공개 구역으로 나갔다 → 돌아간다   · 나가는 중(멀어지는 중)이다 → 조금 더 기다려 준다(최대 3초)
//  · 눈앞에서 사라졌다 → 마지막 본 곳을 살피러 간다(발각 아님)   · 보이는 채로 버틴다 → 발각
function updateTrespass(g, dt, pz) {
  const P = S.player; g.want = Math.atan2(P.y - g.y, P.x - g.x); g.a += clamp(angDiff(g.a, g.want), -3.5 * dt, 3.5 * dt); g.meter = Math.max(g.meter, 0.92);
  if (g.seen) g.lastSeen = pSpot();
  if (dist(g.x, g.y, P.x, P.y) > 70 && g.seen) { g.repath = (g.repath || 0) - dt; if (g.repath <= 0 || !g.path) { pathTo(g, P.x, P.y); g.repath = 0.5; } moveAlong(g, SPD.gSusp * 0.8 * spdMul(), dt); }
  g.warnT = g.warnEnd - S.t;
  if (pz === Z_PUB && !suspAct(g)) { g.warned = true; g.state = 'RETURN'; g.path = null; g.meter = 0.3; g.icon = null; g.say = ['다시는 들어오지 마세요.', '그래요, 그쪽으로 가세요.', '두 번은 안 봐줍니다.'][g.id % 3]; g.sayT = 2.4; return; }
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
    if (!walk(x, y)) continue; const a = zoneAt(tc(x), tc(y), 0);
    for (const [dx, dy] of [[1, 0], [0, 1]]) { const nx = x + dx, ny = y + dy; if (!walk(nx, ny)) continue; const b = zoneAt(tc(nx), tc(ny), 0); if (a === b || Math.min(a, b) !== Z_PUB) continue;
      E.push({ x0: (x + dx) * TILE, y0: (y + dy) * TILE, x1: (x + 1) * TILE, y1: (y + 1) * TILE, k: Math.max(a, b), ix: a === Z_PUB ? dx : -dx, iy: a === Z_PUB ? dy : -dy }); }
  }
  setLayer(L0); return (S.zEdges = E);
}
function drawZones(P) {
  const far = tactical ? 1e9 : 520;
  for (const e of zoneEdges()) {
    const mx = (e.x0 + e.x1) / 2, my = (e.y0 + e.y1) / 2, d = dist(P.x, P.y, mx, my); if (d > far) continue;
    const col = e.k === Z_HOS ? '232,80,60' : '242,170,70', a = tactical ? 0.8 : Math.max(0.25, 0.85 - d / 700);
    ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 3; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(e.x0, e.y0); ctx.lineTo(e.x1, e.y1); ctx.stroke(); ctx.setLineDash([]);
    const g = ctx.createLinearGradient(mx, my, mx + e.ix * 18, my + e.iy * 18); g.addColorStop(0, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);  // 금지 쪽으로 번지는 옅은 띠
    ctx.fillStyle = g; ctx.fillRect(Math.min(e.x0, e.x0 + e.ix * 18) - (e.ix ? 0 : 0), Math.min(e.y0, e.y0 + e.iy * 18), e.ix ? 18 : e.x1 - e.x0, e.iy ? 18 : e.y1 - e.y0);
  }
  for (const r of STAGE.zones) {  // 적어 둔 출입 금지·적진 구역: 옅은 칠과 이름표
    if (r[4] === 'pub' || r[5] === 'roof') continue;
    const x = r[0] * TILE, y = r[1] * TILE, w = (r[2] - r[0] + 1) * TILE, h = (r[3] - r[1] + 1) * TILE, hos = r[4] === 'hos', col = hos ? '232,80,60' : '242,170,70';
    const d = Math.hypot(clamp(P.x, x, x + w) - P.x, clamp(P.y, y, y + h) - P.y); if (d > far) continue;
    ctx.fillStyle = `rgba(${col},.05)`; ctx.fillRect(x, y, w, h);
    if (d < 320 || tactical) tag(x + w / 2, y + h - 12, (r[6] || (hos ? '적진' : '출입 금지')), hos ? '#ff8a76' : '#f2b45a', 0.95);
  }
  // 가까운 문턱에 '출입 금지' 표지 (가장 가까운 하나만)
  if (!tactical) { let best = null, bd = 150; for (const e of zoneEdges()) { const mx = (e.x0 + e.x1) / 2, my = (e.y0 + e.y1) / 2, d = dist(P.x, P.y, mx, my); if (d < bd && pZone() === Z_PUB) { bd = d; best = e; } }
    if (best) tag((best.x0 + best.x1) / 2 + best.ix * 26, (best.y0 + best.y1) / 2 + best.iy * 26, best.k === Z_HOS ? '적진' : '출입 금지', best.k === Z_HOS ? '#ff8a76' : '#f2b45a', 0.9); }
}
// 출입 금지 경고 중: 경비 둘레에 남은 시간 고리 (다 닳기 전에 공개 구역으로 나가야 한다)
function drawWarnRing(g) {
  if (g.state !== 'WARN' || !g.warnEnd) return; const f = clamp((g.warnEnd - S.t) / 4.5, 0, 1);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(g.x, g.y, 26, 0, TAU); ctx.stroke();
  ctx.strokeStyle = f > 0.35 ? 'rgba(242,170,70,.95)' : 'rgba(232,80,60,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(g.x, g.y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
}
