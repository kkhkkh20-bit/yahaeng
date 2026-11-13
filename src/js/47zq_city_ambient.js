// ---------------------------------------------------------------- 자유 모드 거리 생활: 경찰은 범죄자도 잡고, 주민끼리도 싸운다
// · 악당(사건 인물·흉기 난동범·폭행범)이 행인을 해치면 누군가 신고한다 → 가까운 경찰이 달려가 제압하고 연행한다.
//   내가 끼어들기 전에 경찰이 잡으면 그 사건은 "경찰이 먼저 잡았다"로 끝 (내 몫은 없다)
// · 주민끼리 시비: 가끔 화면 근처에서 두 사람이 어깨를 부딪치고 주먹다짐을 한다. 지는 쪽이 도망가거나,
//   경찰이 오면 시비를 건 쪽을 연행한다. 끼어들어 말리든(때리든) 구경하든 자유
// 무작위는 게임 시드 난수를 건드리지 않게 따로 돌린다 (다른 장면이 바뀌지 않게)
let AMB_SEED = 7771; const ambRnd = () => (AMB_SEED = (AMB_SEED * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const QUARREL = [['어깨 쳤잖아요!', '그쪽이 먼저 쳤잖아!'], ['어디서 반말이야?', '반말은 그쪽이 먼저 했지!'], ['차 빼라고 했잖아!', '내 자리거든?'], ['줄 서세요, 줄!', '내가 먼저 왔거든?'], ['담배 좀 끄세요!', '네가 뭔데!']];
function ambientInit() { if (!STAGE.cityLife) return; S.quarrelT = S.t + 90 + ambRnd() * 30; }
// 경찰 손에 쓰러진 범죄자: 잠시 뒤 연행돼 사라진다. 진행 중인 사건이면 "경찰이 먼저"
function copTookDown(o, cop) {
  const near = dist(o.x, o.y, S.player.x, S.player.y) < 700; o.criminal = false; o.cfight = null;
  if (o.evt && S.ev && S.ev.key === o.evt && !S.ev.done) { S.ev.copTook = true; evEnd(S.ev, '경찰이 먼저 잡았다 — 이번엔 빈손', false); }
  if (near) { gsay(cop, ['연행한다. 일어나.', '현행범으로 체포합니다.', '얌전히 있어.'][cop.id % 3], 2.2); toast('경찰이 범인을 제압했다', 2); }
  after(3.5, () => { if (o.state === 'DEAD' && !o.off) { const c = (S.corpses || []).find(k => k.g === o); if (c && c.ko && !c.carried && !c.inTrunk) { S.corpses = S.corpses.filter(k => k !== c); evGone(o); } } });
}
// npcDown 을 한 겹 더: 범죄자가 사람을 해치면 신고 / 경찰이 범죄자를 쓰러뜨리면 연행
if (typeof npcDown === 'function') { const _nd = npcDown; npcDown = function (o, by, lethal) { const r = _nd(o, by, lethal);
  if (STAGE.cityLife && by && by !== S.player && o) {
    if (by.police && (o.criminal || o.cfight)) copTookDown(o, by);
    else if (!by.police && !by.fac && o.civ) { by.criminal = true; policeCall(o.x, o.y, by); } }
  return r; }; }
// ---- 주민끼리 시비
function quarrelStart() {
  const P = S.player, cand = S.guards.filter(g => g.civ && npcAlive(g) && !g.off && !g.evt && !g.crew && !g.child && !g.dog && !g.student && !g.cfight && !g.fist && g.state === 'PATROL' && !flOf(g) && !g.z && dist(g.x, g.y, P.x, P.y) < 650 && dist(g.x, g.y, P.x, P.y) > 120);
  for (let k = 0; k < 6 && cand.length; k++) { const a = cand[(ambRnd() * cand.length) | 0]; const b = cand.filter(o => o !== a && dist(o.x, o.y, a.x, a.y) < 240).sort((p, q) => dist(p.x, p.y, a.x, a.y) - dist(q.x, q.y, a.x, a.y))[0];
    if (!b) continue; const L = QUARREL[(ambRnd() * QUARREL.length) | 0];
    a.cfight = { o: b, hp: 3, cd: 0.6, t0: S.t, starter: true }; b.cfight = { o: a, hp: 3, cd: 1.0, t0: S.t };
    gsay(a, L[0], 2.2); after(1.2, () => npcAlive(b) && gsay(b, L[1], 2.2)); fstat('quarrels');
    after(2.5, () => { if (a.cfight && npcAlive(a)) { a.criminal = true; policeCall(a.x, a.y, a); } });  // 지나가던 사람이 신고
    return true; }
  return false;
}
function quarrelStep(g, dt) {
  const f = g.cfight, o = f.o, P = S.player;
  if (!npcAlive(o) || !npcAlive(g) || S.t - f.t0 > 25 || dist(g.x, g.y, o.x, o.y) > 400 || g.fist || o.fist) { quarrelEnd(g); return; }
  if (g.state === 'PANIC' || g.state === 'FLEE') { g.state = 'PATROL'; g.fear = null; }
  if ((g.stunT || 0) > S.t) return;
  const d = dist(g.x, g.y, o.x, o.y); g.a = Math.atan2(o.y - g.y, o.x - g.x);
  if (d > 30) { evRun(g, o.x, o.y, 95, dt); return; }
  if ((f.cd -= dt) > 0) return; f.cd = 0.9 + ambRnd() * 0.6; g.swingT = 0.3;
  after(0.15, () => { if (!npcAlive(o) || !o.cfight || dist(g.x, g.y, o.x, o.y) > 40) return; if (ambRnd() < 0.3) { gsay(o, '어딜!', 1); return; }
    play('thud', 0.5 * proxVol(o)); o.stunT = S.t + 0.35; const a = Math.atan2(o.y - g.y, o.x - g.x), nx = o.x + Math.cos(a) * 10, ny = o.y + Math.sin(a) * 10; if (!solidAt(Math.floor(nx / TILE), Math.floor(ny / TILE))) { o.x = nx; o.y = ny; }
    if ((o.cfight.hp -= 1) <= 0) { const w = g; quarrelEnd(o); quarrelEnd(w); civPanic(o, w.x, w.y, 10); gsay(o, ['살려 주세요!', '아이고...', '경찰 불러!'][o.id % 3], 1.6); after(0.8, () => npcAlive(w) && gsay(w, '다음에 또 까불어 봐.', 2)); } });
}
function quarrelEnd(g) { if (!g) return; g.cfight = null; g.route = [{ x: g.x, y: g.y, pause: 1 }, { x: g.x + 1, y: g.y, pause: 2 }]; g.ri = 0; g.path = null; }
function ambientUpdate(dt) {
  if (!STAGE.cityLife) return;
  for (const g of S.guards) if (g.cfight) quarrelStep(g, dt);
  if (S.quarrelT && S.t > S.quarrelT && !S.player.car && (S.wanted || 0) < 2) { S.quarrelT = S.t + (quarrelStart() ? 45 : 12) + ambRnd() * 30; }
}
