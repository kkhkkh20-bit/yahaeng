// ---------------------------------------------------------------- 자유 모드 무대형 의뢰 ('stage')
// 메인 이야기의 한 장을 한 블록짜리 무대로 만든다. 표적은 정해진 길을 돌고, 그 습관 곳곳에 틈(기회)이 있다.
//   car    표적의 차 — 폭약을 심어 두면 출발할 때 터진다 (47x 차량 폭탄을 그대로 쓴다)
//   sign   도는 길 위 낡은 간판 — 배관으로 옥상에 올라가 밑을 지날 때 고정줄을 푼다 (47z)
//   smoke  담배 자리 — 한참 서서 담배를 피운다. 등 뒤로 붙어 독침(약국)
// 기회는 처음엔 숨어 있다. 표적·경호원의 말을 가까이서 엿들으면 하나씩 드러나 목표 칸과 미니맵에 뜬다.
// 사고(폭발·간판·독·차·불)로 끝내면 ×1.6, 총·칼이면 ×0.8. 끝낸 방법은 이야기 기록에 남는다 (47zz).
const STAGE_OPPS = ['car', 'sign', 'smoke'];
const STAGE_OPP_NAME = { car: '차량 폭탄', sign: '간판 사고', smoke: '담배 자리 독침' };
const STAGE_LEAVE = 240, STAGE_SMOKE = 16, STAGE_HEAR = 230;
function stageStart(h, plan) {
  h.opp = { car: { known: false }, sign: { known: false }, smoke: { known: false } };
  carbombStart(h, plan); if (!h.car) h.opp.car.none = true; h.leaveAt = S.t + STAGE_LEAVE;      // 차: 4분 뒤 떠난다
  if (!signStart(h)) h.opp.sign.none = true;                 // 간판을 걸 길이 없으면 그 기회는 없다
  const r = h.g.route || [], i = r.reduce((b, p, k) => (p.pause || 0) > (r[b].pause || 0) ? k : b, 0);
  if (r[i]) { r[i].pause = STAGE_SMOKE; h.smoke = { x: r[i].x, y: r[i].y }; }   // 가장 오래 서는 모퉁이가 담배 자리
}
// 목표 칸: 발견한 기회만 이름으로, 나머지는 개수만
function stageGoal(h) {
  const known = STAGE_OPPS.filter(k => h.opp[k].known && !h.opp[k].none), all = STAGE_OPPS.filter(k => !h.opp[k].none).length;
  const left = h.car && !h.car.dead && !h.cbIn ? ` · 출발까지 ${Math.max(0, Math.ceil(h.leaveAt - S.t))}초` : '';
  if (!known.length) return ` · 놈 곁에서 말을 엿들어 틈을 찾아라 (0/${all})${left}`;
  return ` · 틈 ${known.length}/${all}: ${known.map(k => STAGE_OPP_NAME[k]).join(' · ')}${left}`;
}
function stageReveal(h, k, who, line, note) {
  const o = h.opp[k]; if (!o || o.known || o.none) return; o.known = true;
  if (who && npcAlive(who)) gsay(who, line, 3.2);
  play('bell', 0.35, 1.5); evBanner(`(들었어 — ${note})`, '#9fd8ff'); fstat('stageClue');
}
function stageUpdate(h) {
  const P = S.player, g = h.g;
  if (!npcAlive(g) && h.smokeEsc) { for (const k of h.smokeEsc) if (npcAlive(k.o)) { k.o.follow = k.follow; k.o.route = k.route; k.o.path = null; k.o.wait = 0; } h.smokeEsc = null; }  // 담배 피우다 쓰러졌다: 비켜 섰던 경호원도 원래대로
  if (!npcAlive(g) || h.cbIn || flOf(P) || P.car) return;
  const hear = o => o && npcAlive(o) && !o.off && dist(P.x, P.y, o.x, o.y) < STAGE_HEAR && los(P.x, P.y, o.x, o.y) && o.state !== 'ALERT';
  const e = h.escorts.find(npcAlive);
  // 차: 표적이 출발 시각을 말한다 (가까이 붙어 있으면 들린다)
  if (!h.opp.car.known && !h.opp.car.none && hear(g) && S.t - h.t0 > 6) stageReveal(h, 'car', g, '차는 시간 맞춰 빼 놔. 길가 그 자리에.', `${h.name}의 차가 길가에 서 있다 — 출발 전에 폭약을 심을 수 있다`);
  // 간판: 간판 밑을 지날 때 경호원이 투덜댄다
  if (!h.opp.sign.known && !h.opp.sign.none && h.sign && !h.sign.used) {
    const gm = signGeometry(h.sign), under = o => o && npcAlive(o) && Math.abs(o.x - gm.x) < 110 && Math.abs(o.y - (h.sign.hit[1] + .5) * TILE) < 70;
    if ((under(g) || under(e)) && hear(e || g)) stageReveal(h, 'sign', e || g, '형님, 저 간판 언젠가 떨어집니다. 이 길로 다니지 마시죠.', '낡은 간판이 놈의 길 위에 걸려 있다 — 노란 점 배관으로 옥상에 올라가라');
  }
  // 담배: 담배 자리에 서면 혼자 있고 싶다고 한다
  if (!h.opp.smoke.known && h.smoke && dist(g.x, g.y, h.smoke.x, h.smoke.y) < 40 && hear(g)) stageReveal(h, 'smoke', g, '담배 피울 땐 다들 저리 가 있어. 등 뒤에 서지 말고.', '놈은 담배를 피울 때 혼자 선다 — 등 뒤로 붙어 독침(약국)');
  // 담배 피우는 동안 경호원은 떨어져 선다
  const smoking = h.smoke && dist(g.x, g.y, h.smoke.x, h.smoke.y) < 40 && !g.path && g.state === 'PATROL';
  if (smoking && !h.smokeEsc) {
    h.smokeEsc = h.escorts.filter(o => npcAlive(o) && o.state !== 'ALERT').map((o, i) => { const a = Math.atan2(o.y - g.y, o.x - g.x) + i * Math.PI, to = walkableNear(g.x + Math.cos(a) * 200, g.y + Math.sin(a) * 200, { x: g.x, y: g.y });
      const keep = { o, follow: o.follow, route: o.route }; o.follow = null; o.route = [{ x: to.x, y: to.y, pause: 999 }]; o.ri = 0; o.wait = 0; o.path = null; return keep; });
    if (inView(g.x, g.y, 60)) gsay(g, '...후.', 1.6);
  } else if (!smoking && h.smokeEsc && dist(g.x, g.y, h.smoke.x, h.smoke.y) >= 40) {
    for (const k of h.smokeEsc) if (npcAlive(k.o) && k.o.state !== 'ALERT') { k.o.follow = k.follow; k.o.route = k.route; k.o.path = null; k.o.wait = 0; }
    h.smokeEsc = null;
  }
}
// 미니맵: 발견한 담배 자리 (연두)
function drawMiniStage(x, T) {
  const h = S.hit; if (!h || h.ctr !== 'stage' || !h.smoke || !h.opp.smoke.known) return;
  x.fillStyle = '#9be37a'; x.fillRect(T(h.smoke.x) - 3, T(h.smoke.y) - 3, 6, 6);
}
