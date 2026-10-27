// ---------------------------------------------------------------- 구역 (공개 · 출입 금지 · 적진)
// ---- 구역 (히트맨식): 공개 구역에선 나는 행인이다 — 수상한 짓을 보일 때만 의심받는다. 출입 금지 구역은 잠입 규칙(처음엔 경고), 적진은 보이면 적대
// STAGE.zones = [[x0, y0, x1, y1, 'pub' | 'res' | 'hos'], ...] (뒤에 적은 것이 우선). 따로 적지 않으면: 거리 = 공개, 건물 안·옥상 = 출입 금지
// zones 가 없는 판은 옛 규칙(어디서나 적진)
const Z_PUB = 0, Z_RES = 1, Z_HOS = 2, Z_NAME = ['공개', '출입 금지', '적진'];
function zoneAt(x, y, z) {
  if (!STAGE.zones) return Z_HOS;
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); let k = (z || 0) > 0 || bldAt(tx, ty) >= 0 ? Z_RES : Z_PUB;
  for (const r of STAGE.zones) if (tx >= r[0] && tx <= r[2] && ty >= r[1] && ty <= r[3] && (!r[5] || ((z || 0) > 0) === (r[5] === 'roof'))) k = r[4] === 'pub' ? Z_PUB : r[4] === 'hos' ? Z_HOS : Z_RES;
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
  endChat(g); g.act = null; g.bubble = null; g.state = 'WARN'; g.warnEnd = S.t + 4.5; g.path = null; g.meter = 0.92; setIcon(g, '!?'); play('question', 0.5);
  g.say = ['거기요! 여긴 관계자 외 출입 금지입니다. 나가세요.', '이봐요, 여기 들어오면 안 돼요. 당장 나가요.', '여긴 직원만 다닙니다. 돌아 나가세요.'][g.id % 3]; g.sayT = 3.2;
  hint('warn', '출입 금지 구역에서 처음 들키면 자경대원이 경고한다. 공개 구역(거리)으로 나가면 넘어가지만, 같은 자경대원에게 또 들키면 바로 발각된다');
}
function updateTrespass(g, dt, pz) {
  const P = S.player; g.warnT = g.warnEnd - S.t; g.want = Math.atan2(P.y - g.y, P.x - g.x); g.meter = Math.max(g.meter, 0.92);
  if (dist(g.x, g.y, P.x, P.y) > 70 && g.seen) { g.repath = (g.repath || 0) - dt; if (g.repath <= 0 || !g.path) { pathTo(g, P.x, P.y); g.repath = 0.5; } moveAlong(g, SPD.gSusp * 0.8 * spdMul(), dt); }
  if (pz === Z_PUB && !suspAct(g)) { g.warned = true; g.state = 'RETURN'; g.path = null; g.meter = 0.3; g.icon = null; g.say = ['다시는 들어오지 마세요.', '그래요, 그쪽으로 가세요.', '두 번은 안 봐줍니다.'][g.id % 3]; g.sayT = 2.4; return; }
  if (suspAct(g) === 1 || g.warnT <= 0 || pz === Z_HOS) { g.warned = true; goAlert(g); }
}
