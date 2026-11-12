// ---------------------------------------------------------------- 자유 모드 조직 호감도 · 조직/경찰 미션
// 조직 넷(조직 본부·건달파·청계파·종로파)과 경찰마다 호감도(-100~100)가 있다. 근거지 앞(지구대 앞) 연락책에게 [행동]으로 미션을 고른다.
// 한쪽 일을 하면 그쪽이 오르고 라이벌(조직 일이면 경찰도)이 내려간다. 그 조직원·경찰을 직접 해치면 크게 내려간다.
// 효과: 우호(+30)면 그 조직원이 나를 봐도 덤비지 않고 인사한다 / 적대(-30)면 보자마자 덤빈다.
//       경찰 우호면 수배가 빨리 풀리고, 경찰 적대면 수배가 없어도 순찰 경찰이 알아보고 쫓는다. 적대(-30 이하)인 쪽 연락책은 일을 주지 않는다
const STAND_FACS = ['A', 'B', 'C', 'D', 'P'];
const STAND_NAME = { A: '조직', B: '건달파', C: '청계파', D: '종로파', P: '경찰' };
const CONTACT_BLD = { A: '조직 본부', B: '건달파 당구장', C: '청계파 사무실', D: '종로파 사무실', P: '지구대' };
const STAND_COL = { A: '#e0a0a0', B: '#e6c27a', C: '#8fd0e0', D: '#c9a0ff', P: '#9fc4ff' };
const standOf = f => (S.stand || {})[f] || 0;
const standWord = v => v >= 60 ? '형제' : v >= 30 ? '우호' : v <= -60 ? '원수' : v <= -30 ? '적대' : '중립';
function applyStanding(d) {
  S.stand = S.stand || {}; const parts = [];
  for (const [f, v] of Object.entries(d || {})) { if (!v || !STAND_NAME[f]) continue; S.stand[f] = clamp((S.stand[f] || 0) + v, -100, 100); parts.push(`${STAND_NAME[f]} ${v > 0 ? '+' : ''}${v}`); }
  if (parts.length) evBanner('호감도 · ' + parts.join(' · '), '#cfe0ff');
}
// 연락책: 근거지 건물 앞 보도에 선다 (조직원은 그 조직 옷, 경찰은 제복)
function cityFactionsInit() {
  if (!STAGE.cityLife) return; S.contacts = {}; S.facProvoked = {};
  for (const f of STAND_FACS) {
    const b = BLD.find(b => b.name === CONTACT_BLD[f] && !b.vacant); const p = b && shopFront(b); if (!p) continue;
    const g = makeGuard({ kind: f === 'P' ? 'g1' : 'g2', at: [Math.floor(p.x / TILE), Math.floor(p.y / TILE)], radio: false }, S.guards.length);
    g.x = p.x; g.y = p.y; g.route = [{ x: p.x, y: p.y, pause: 999 }]; g.wait = 999; g.contact = f; g.a = Math.PI / 2;
    if (f === 'P') { g.police = true; g.fac = 'P'; g.outfit = 'police'; g.torch = true; } else { g.fac = f; g.outfit = FAC_OUTFIT[f] || null; g.rival = f !== 'A'; g.torch = false; }
    S.guards.push(g); S.contacts[f] = { g, x: p.x, y: p.y, b };
  }
  setLayer(0); if (PR) prWarm(Object.values(S.contacts).map(c => charOf(c.g)), true);
}
function factionAction() {
  const P = S.player; if (!S.contacts || P.car) return null;
  for (const [f, c] of Object.entries(S.contacts)) { const g = c.g; if (!npcAlive(g) || dist(P.x, P.y, g.x, g.y) > 70) continue;
    return { k: 'evAct', label: `${STAND_NAME[f]} 연락책`, at: { x: g.x, y: g.y - 56 }, fn: () => { faceEachOther(g); openContact(f); } }; }
  return null;
}
const RIVALS = f => ['A', 'B', 'C', 'D'].filter(o => o !== f);
// 미션 목록 (조직마다 셋, 경찰 셋)
function contactMissions(f) {
  const c = S.contacts[f], here = { x: c.x, y: c.y, label: CONTACT_BLD[f] };
  if (f === 'P') return [
    { name: '수배자 검거 — 조직원을 기절시켜라', tag: '250만', go: () => { const R = RIVALS('P')[(Math.random() * 4) | 0], p = planHit(); if (!p) return false; Object.assign(p, { kind: 'hit', fac: R, ko: true, pay: 250, stand: { P: 8, [R]: -10 }, name: `수배자 ${p.name}` }); startJob(p); return true; } },
    { name: '도난차 회수 — 지구대로 몰고 와라', tag: '220만', go: () => { const p = planCarJob(); if (!p) return false; p.kind = 'car'; startJob(p); Object.assign(S.job, { drop: here, pay: 220, stand: { P: 6 } }); return true; } },
    { name: '순찰 동행 — 차로 순찰 지점을 돌아라', tag: '160만', go: () => { const p = planRace(); if (!p) return false; p.kind = 'race'; startJob(p); Object.assign(S.job, { patrol: true, pay: 160, stand: { P: 4 } }); return true; } }];
  const R = RIVALS(f)[(S.jobN || 0) % 3];
  return [
    { name: `${STAND_NAME[R]} 간부 처리`, tag: '250만', go: () => { const p = planHit(); if (!p) return false; Object.assign(p, { kind: 'hit', fac: R, pay: 250, stand: { [f]: 8, [R]: -12, P: -3 }, name: `${STAND_NAME[R]} ${p.name}` }); startJob(p); return true; } },
    { name: '물건 운반 — 늦지 마라', tag: '180만+', go: () => { const p = planParcel(); if (!p) return false; Object.assign(p, { kind: 'parcel', from: { x: c.x + 30, y: c.y + 20 }, fromSign: CONTACT_BLD[f] }); startJob(p); Object.assign(S.job, { pay: 180, stand: { [f]: 5, P: -2 } }); return true; } },
    { name: `차 가져오기 — ${CONTACT_BLD[f]} 앞으로`, tag: '320만', go: () => { const p = planCarJob(); if (!p) return false; p.kind = 'car'; startJob(p); Object.assign(S.job, { drop: here, pay: 320, stand: { [f]: 6, P: -2 } }); return true; } }];
}
function openContact(f) {
  const v = standOf(f), title = `${STAND_NAME[f]} 연락책 · 호감도 ${v > 0 ? '+' : ''}${v} (${standWord(v)})`, g = S.contacts[f].g;
  if (S.job || S.hit) { shopPanel(title, [{ name: '맡은 일부터 끝내고 와라', price: null, tag: '', ok: false, buy: () => {} }]); return; }
  if (v <= -30) { gsay(g, f === 'P' ? '당신한테 맡길 일은 없소.' : '네놈하고는 말 안 한다.', 2.5); shopPanel(title, [{ name: '상대해 주지 않는다 (호감도 -30 이하)', price: null, tag: '', ok: false, buy: () => {} }]); return; }
  if (f === 'P' && S.wanted > 0) { shopPanel(title, [{ name: '수배 중에는 일을 줄 수 없다', price: null, tag: '', ok: false, buy: () => {} }]); return; }
  gsay(g, f === 'P' ? '마침 잘 왔소. 일손이 모자라서.' : '왔냐. 할 일 있다.', 2.5);
  shopPanel(title, contactMissions(f).map(m => ({ name: m.name, price: null, tag: m.tag, ok: true, buy: () => { closeShopPanel(); if (m.go()) { S.job && (S.job.by = f); if (S.hit) S.hit.by = f; evBanner(`${STAND_NAME[f]} 일 · ${m.name.split(' — ')[0]}`, STAND_COL[f]); } else evBanner('지금은 맡길 일이 없다'); } })));
}
// 매 0.5초: 내가 해친 조직원·경찰 → 호감도 하락, 우호 조직은 덤비지 않고 적대 조직은 덤빈다, 경찰 호감도 효과
function factionsUpdate(dt) {
  if (!STAGE.cityLife || !S.player || S.downing) return;
  const P = S.player;
  if (S.stand && S.stand.P >= 30 && S.wanted > 0) S.wantLost = (S.wantLost || 0) + dt * 0.5;  // 경찰 우호: 수배가 빨리 풀린다
  if ((S.facT = (S.facT || 0) - dt) > 0) return; S.facT = 0.5;
  for (const c of S.corpses || []) { if (c._st || c.byNpc || !c.fac || !c.g || c.g.evt) continue; c._st = true; const f = c.g.police ? 'P' : c.fac; if (!STAND_NAME[f]) continue;
    S.facProvoked[f] = S.t; if (!(S.hit && S.hit.g === c.g)) applyStanding({ [f]: f === 'P' ? -15 : -10 }); }
  for (const g of actorsNear(P.x, P.y)) {
    if (!npcAlive(g) || g === P || g.civ || g.off) continue; const f = g.police ? 'P' : g.fac; if (!STAND_NAME[f]) continue;
    const v = standOf(f), d = dist(g.x, g.y, P.x, P.y), mine = S.hit && (S.hit.g === g || S.hit.escorts.includes(g));
    if (g.contact && g.state === 'ALERT' && !(S.facProvoked[f] > S.t - 20)) { g.state = 'RETURN'; g.meter = 0; g.path = null; g.icon = null; continue; }
    if (f !== 'P' && v >= 30 && (g.state === 'ALERT' || g.state === 'SUSPICIOUS') && !mine && !(S.facProvoked[f] > S.t - 30)) {  /* 우호: 의심도 풀린다 */ g.state = 'RETURN'; g.meter = 0; g.path = null; g.icon = null; g.lastSeen = null; if (d < 260) gsay(g, '아, 형님이셨군요. 실례했습니다.', 2); continue; }
    if (f !== 'P' && v >= 30 && g.state === 'PATROL' && d < 90 && (g.greetT || 0) < S.t) { g.greetT = S.t + 40; gsay(g, v >= 60 ? '형님, 오셨습니까!' : '어, 왔어?', 1.8); }
    if (v <= -30 && (g.state === 'PATROL' || g.state === 'RETURN') && d < 260 && !P.car && los(g.x, g.y, P.x, P.y)) {
      if (f === 'P') { if (!S.wanted) addWanted(1, '경찰이 나를 알아봤다'); } else { copChase(g); gsay(g, '저 새끼다!', 1.6); } }
  }
}
// 연락책 머리 위 이름표 (가까울 때) · 미니맵 점
function drawContacts() {
  if (!S.contacts || flOf(S.player)) return;
  for (const [f, c] of Object.entries(S.contacts)) { const g = c.g; if (!npcAlive(g) || !inView(g.x, g.y, 40) || dist(g.x, g.y, S.player.x, S.player.y) > 420) continue;
    const v = standOf(f); infoTag(g.x, g.y - 62, `${STAND_NAME[f]} 연락책 · ${standWord(v)} ${v > 0 ? '+' : ''}${v}`, STAND_COL[f], .9); }
}
function drawMiniContacts(x, T) {
  if (!S.contacts) return;
  for (const [f, c] of Object.entries(S.contacts)) { x.fillStyle = STAND_COL[f]; x.strokeStyle = 'rgba(0,0,0,.7)'; x.lineWidth = 1; x.beginPath(); x.moveTo(T(c.x), T(c.y) - 4); x.lineTo(T(c.x) + 4, T(c.y)); x.lineTo(T(c.x), T(c.y) + 4); x.lineTo(T(c.x) - 4, T(c.y)); x.closePath(); x.fill(); x.stroke(); }
}
