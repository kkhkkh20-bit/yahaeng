function civWake(g, x, y) { g.state = 'PATROL'; g.meter = Math.max(g.meter, 0.45); g.want = Math.atan2(y - g.y, x - g.x); setIcon(g, '!?'); play('question', 0.3 * proxVol(g)); }
// 한 사건에 신고하러 가는 사람은 한두 명뿐: 이미 근처 사건을 신고하러 간(간) 사람이 있으면 나머지는 대부분 비명 지르며 달아난다
function reportersNear(x, y) { const L = S.repLog || (S.repLog = []); for (let i = L.length - 1; i >= 0; i--) if (S.t - L[i].t > 12) L.splice(i, 1); return L.filter(r => dist(r.x, r.y, x, y) < 380).length; }
function gateReport(g, x, y) { const n = reportersNear(x, y); if (n >= 2 || (n === 1 && Math.random() < 0.65)) { civRun(g, x, y); return false; } S.repLog.push({ x, y, t: S.t }); return true; }
function civRun(g, x, y) {
  endChat(g); g.state = 'PANIC'; g.panicT = rnd(6, 10); g.fear = { x, y }; g.path = null; g.cowered = false; g.meter = 0; g.rep = null; setIcon(g, '!');
  if (Math.random() < 0.5) gsay(g, ['으악!', '도망쳐!', '어, 어떡해…', '사람 살려!'][(Math.random() * 4) | 0], 1.6);
  if (Math.random() < 0.5) play('call', 0.35 * proxVol(g), 1.9);
}
function civScream(g, x, y, c, saw, kind) {
  if (g.state === 'PANIC' || g.state === 'REPORT') return;
  if (kind !== 'trespass' && kind !== 'disguise' && !gateReport(g, x, y)) return;
  if (STAGE.city) { cityScream(g, x, y); return; }  // 도시: 경찰에 신고 (수배)
  if (STAGE.zones && startReport(g, x, y, c, saw, kind, true)) return;  // 구역이 있는 판: 비명 대신 자경대원에게 뛰어가 신고한다 (도중에 막을 수 있다)
  endChat(g); g.state = 'PANIC'; g.panicT = rnd(6, 9); g.fear = { x, y }; g.path = null; g.cowered = false; g.meter = 1; S.stats.screams = (S.stats.screams || 0) + 1;
  say([[g, ['도둑이야!', '누, 누구세요!', '사람 살려!'][(Math.random() * 3) | 0]]]);
  play('call', 0.7 * proxVol(g), 1.6); noise(g.x, g.y, 380, 'scream', flOf(g));
  setAlert(2, 30, '주민이 비명을 질렀다 — 자경대원이 몰려온다');
}
// 사람끼리 겹치지 않게: 가까우면 서로 밀어낸다 (벽 안으로는 밀지 않는다). 나도 사람을 뚫고 지나가지 못한다
// CCTV: 좌우로 천천히 돌며(끝에서 잠깐 멈춤) 빨간 시야 안의 나·시체를 찍는다. 관리실이나 해당 구역의 전원으로 제어한다
