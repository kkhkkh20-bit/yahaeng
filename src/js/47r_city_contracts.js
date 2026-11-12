// ---------------------------------------------------------------- 자유 모드 의뢰 종류 (공중전화 의뢰)
// 첫 의뢰는 그냥 처치. 그 뒤로는 아래에서 고른다(바로 앞과 같은 종류는 피한다). 조건을 지키면 보수에 배수, 어기면 깎인다.
// 처치 등급(47q, S~C)과 따로 곱한다.
//   plain    그냥 처치
//   accident 사고로 위장 — 차로 치거나, 불태우거나, 폭발에 휘말리게. 칼·총이면 반값       ×1.5
//   blade    칼로만 — 총·차·불·폭발 없이 손으로. 어기면 반값                              ×1.4
//   photo    사진만 — 블록만 알려 준다. 미니맵엔 그 블록만, 가까이서 얼굴을 봐야 표적 표시   ×1.3
//   timed    시간 제한 — 3분 안에. 넘기면 표적이 떠나고 의뢰 실패                           ×1.3
const CONTRACTS = {
  plain: { name: '처치', mul: 1 },
  accident: { name: '사고 위장', mul: 1.5, fail: 0.5, brief: '사고처럼 보여야 한다. 차로 치든, 불을 내든, 터뜨리든. 칼이나 총 자국이 남으면 반값이다.', rule: '사고로 위장 (차·불·폭발)' },
  blade: { name: '칼로만', mul: 1.4, fail: 0.5, brief: '의뢰인이 손으로 끝내길 원한다. 총소리도, 불도, 차도 안 된다. 어기면 반값.', rule: '칼로만 (총·차·불·폭발 금지)' },
  photo: { name: '사진만', mul: 1.3, brief: '얼굴 사진 한 장뿐이다. 그 블록 어딘가를 돈다. 직접 찾아서 얼굴을 확인해.', rule: '사진만 — 블록을 돌며 얼굴 찾기' },
  snipe: { name: '저격', mul: 1.4, fail: 0.6, brief: '멀리서 한 발로 끝내라. 500px 밖에서 총으로. 저격총은 조직 연락책이 판다. 가까이서 끝내면 값을 깎는다.', rule: '저격 (500px 밖에서 총으로)' },
  carbomb: { name: '차량 폭탄', mul: 1.6, fail: 0.6, brief: '그놈 차가 그 블록 길가에 서 있다. 100초 뒤에 타고 떠난다. 폭약 하나 줄 테니 차에 심어 둬. 타는 순간 끝이다. 놓치면 차째 터뜨려도 된다.', rule: '차량 폭탄 (차에 폭약)' },
  timed: { name: '시간 제한', mul: 1.3, time: 180, brief: '3분 뒤에 그놈이 서울을 뜬다. 그 전에 끝내. 놓치면 없던 일이다.', rule: '3분 안에' } };
const CONTRACT_KINDS = ['accident', 'blade', 'photo', 'timed', 'snipe', 'carbomb', 'plain'];
function pickContract() {
  if (!S.hitN) return 'plain';
  const pool = CONTRACT_KINDS.filter(k => k !== S.lastContract); return pool[(Math.random() * pool.length) | 0];
}
// 표적이 어떻게 죽었나: car · fire · blast · gun · blade
function deathCause(g) {
  const c = (S.corpses || []).find(c => c.g === g || c.guardId === g.id && !c.g);
  if (c && c.byCar) return 'car';
  if (g.burnT || c && c.charred) return 'fire';
  if ((S.booms || []).some(b => S.t - b.t < 2 && dist(b.x, b.y, g.x, g.y) < 200)) return 'blast';
  if (g.shotT && S.t - g.shotT < 2) return 'gun';
  return 'blade';
}
function contractMul(h, g) {
  const C = CONTRACTS[h.ctr || 'plain'], cause = deathCause(g);
  let ok = true;
  if (h.ctr === 'accident') ok = ['car', 'fire', 'blast'].includes(cause);
  else if (h.ctr === 'blade') ok = cause === 'blade';
  else if (h.ctr === 'carbomb') ok = cause === 'blast';
  else if (h.ctr === 'snipe') ok = cause === 'gun' && (g.shotD || 0) >= 500;
  return { ok, mul: ok ? C.mul : (C.fail || 1), cause, C };
}
// 매 프레임 (의뢰 중): 시간 제한 · 사진 의뢰 얼굴 확인
function contractUpdate() {
  const h = S.hit; if (!h || !h.ctr || h.ko) return; const g = h.g, P = S.player;
  if (h.ctr === 'timed' && npcAlive(g) && S.t > h.deadline) { contractFail(h, `${h.name}이(가) 서울을 떴다 — 의뢰 실패`); return; }
  if (h.ctr === 'timed' && !h.warned && h.deadline - S.t < 30) { h.warned = true; evBanner('30초 남았다', '#ffb070'); play('click', 0.5, 0.8); }
  if (h.ctr === 'carbomb') carbombUpdate();
  if (h.ctr === 'photo' && !h.spotted && npcAlive(g) && dist(P.x, P.y, g.x, g.y) < 280 && !flOf(P) && los(P.x, P.y, g.x, g.y)) {
    h.spotted = true; play('bell', 0.4, 1.4); evBanner(`찾았다 — 사진 속 그 얼굴, ${h.name}`, '#ffd76a'); gsay(g, '...', 1.2); }
}
function contractFail(h, msg) {
  for (const o of [h.g, ...h.escorts]) if (npcAlive(o)) { if (inView(o.x, o.y, 80)) { const a = rnd(0, TAU); evGo(o, o.x + Math.cos(a) * 1200, o.y + Math.sin(a) * 1200); after(15, () => { if (npcAlive(o) && !inView(o.x, o.y, 80)) evGone(o); }); } else evGone(o); }
  S.hit = null; S.lastContract = h.ctr; fstat('hitFail'); play('thud', 0.5); evBanner(msg, '#c8c0b0');
}
// 사진 의뢰는 얼굴을 보기 전엔 표적 위치를 안 준다 (블록 가운데만)
function contractHides(h) { return h && h.ctr === 'photo' && !h.spotted && npcAlive(h.g); }
function contractGoal(h) {
  const C = CONTRACTS[h.ctr || 'plain']; if (!C || h.ctr === 'plain' || !h.ctr) return '';
  if (h.ctr === 'timed') return ` · 남은 ${Math.max(0, Math.ceil(h.deadline - S.t))}초`;
  if (h.ctr === 'carbomb' && h.car && !h.car.dead) return h.car.bombed ? ' · 폭약 설치됨 — 차에 탈 때까지 기다려라' : h.cbIn ? ' · 차를 몰고 떠난다 — 차를 터뜨려라' : ` · 차에 폭약 심기 · 출발까지 ${Math.max(0, Math.ceil(h.leaveAt - S.t))}초`;
  return ` · ${C.rule}`;
}
