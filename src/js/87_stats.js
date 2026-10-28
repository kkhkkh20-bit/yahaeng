// ---------------------------------------------------------------- 플레이 기록 (동선 · 진행 · 그만둔 자리)
// 판 하나(의뢰 시작 ~ 성공·실패·그만둠)를 Firestore 문서 하나로 남긴다. 화면을 닫거나 다른 앱으로 넘어가도 그때까지를 덮어써 둔다
// STATS_CFG 가 비어 있거나 파일로 연 경우(file:// — 테스트)에는 아무것도 보내지 않는다. 이름·기기 정보 없이 무작위 번호만 쓴다
const STATS_CFG = { projectId: 'yahaeng-stats', apiKey: 'AIzaSyBGJhEfauhAkyJ7ojtIxDZfAcStU6MyOvg', col: 'runs' };  // 웹 공개용 값 (보안은 Firestore 규칙이 맡는다)
const STATS_STEP = 1.0;  // 동선 기록 간격(초, 게임 시간)
let RUN = null;
const statsOn = () => !!(STATS_CFG.projectId && STATS_CFG.apiKey) && location.protocol !== 'file:' && !/[?&]nostats/.test(location.search);
const rid = n => Array.from({ length: n }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]).join('');
const statsPid = () => { try { let p = localStorage.getItem('yahaeng.pid'); if (!p) { p = rid(12); localStorage.setItem('yahaeng.pid', p); } return p; } catch (e) { return 'anon'; } };
const STATS_SID = rid(8);  // 이번에 페이지를 연 한 번
function statsBegin(how) {
  if (RUN && !RUN.done) statsEnd('left');  // 끝내지 않고 다른 판으로 넘어감
  if (!S || !STAGE) return;
  RUN = { id: rid(16), how: how || 'new', stage: STAGE.id || String(STAGE_I), t0: Date.now(), g0: S.t, nextT: 0, path: [], cps: 0, done: false, sent: 0 };
}
// 매 프레임: 1초마다 위치 한 점 (x·y는 8픽셀 단위, 층, 경계 단계)
function statsTick() {
  if (!RUN || RUN.done || !S || S.over || !running || paused) return;
  if (S.t < RUN.nextT) return; RUN.nextT = S.t + STATS_STEP;
  const P = S.player; RUN.path.push([Math.round(P.x / 8), Math.round(P.y / 8), flOf(P), S.alevel || 0].join(','));
}
function statsCheckpoint() { if (RUN && !RUN.done) RUN.cps++; }
function statsDoc(result, reason) {
  const st = S ? S.stats : {}, items = S ? S.items || [] : [];
  return {
    pid: statsPid(), sid: STATS_SID, stage: RUN.stage, how: RUN.how, result, reason: reason || '',
    started: new Date(RUN.t0), sec: Math.round(S ? S.t - RUN.g0 : 0), real: Math.round((Date.now() - RUN.t0) / 1000),
    items: items.filter(i => i.got).length + '/' + items.length, target: !!(S && S.guards.some(g => g.target && g.state === 'DEAD')),
    cps: RUN.cps, kills: st.kills || 0, ko: st.ko || 0, seen: st.detected || 0, alarms: st.alarms || 0, bodies: st.bodies || 0, civ: st.extraKills || 0,
    hp: S ? S.player.hp : 0, rank: (document.getElementById('endRank') || {}).textContent || '',
    mobile: !!isTouch, host: location.host.slice(0, 60), ver: ((document.querySelector('.credit.ver') || {}).textContent || '').replace('야행 ', ''), demo: !!window.__DEMO,
    path: RUN.path.join(';'),
    ev: (S && S.events || []).slice(-300).map(e => [e.k, Math.round(e.x / 8), Math.round(e.y / 8), Math.round(e.t - RUN.g0)].join(',')).join(';'),
    last: S ? [Math.round(S.player.x / 8), Math.round(S.player.y / 8), flOf(S.player)].join(',') : ''
  };
}
// Firestore REST: 문서 하나를 같은 번호로 덮어쓴다 (도중 저장 → 마지막 결과가 이긴다)
function fsVal(v) {
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
}
function statsSend(doc) {
  if (!statsOn()) return;
  const fields = {}; for (const k in doc) fields[k] = fsVal(doc[k]);
  const url = `https://firestore.googleapis.com/v1/projects/${STATS_CFG.projectId}/databases/(default)/documents/${STATS_CFG.col}/${RUN.id}?key=${STATS_CFG.apiKey}`;
  const body = JSON.stringify({ fields });  // 닫히는 중에도 가도록 keepalive — 단 64KB 넘으면 브라우저가 거절하므로 그땐 보통 전송
  try { fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body, keepalive: body.length < 60000 }).catch(() => {}); } catch (e) {}
  RUN.sent++;
}
function statsEnd(result, reason) {
  if (!RUN || RUN.done) return;
  RUN.done = true; statsSend(statsDoc(result, reason));
}
// 닫기·다른 앱으로 넘어감: 그때까지를 '그만둠'으로 덮어써 둔다 (돌아와서 계속하면 나중 결과로 다시 덮인다)
function statsFlush() { if (RUN && !RUN.done && RUN.path.length > 5) statsSend(statsDoc('quit', S && S.over ? 'over' : '')); }
window.addEventListener('pagehide', statsFlush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') statsFlush(); });
