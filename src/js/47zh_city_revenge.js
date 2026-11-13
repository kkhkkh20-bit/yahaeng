// ---------------------------------------------------------------- 자유 모드 처리 사건 (비질란테)
// 법이 손 놓은 놈들을 내가 정리한다. 영웅 놀음이 아니다: 평판은 오르지 않고, 시민은 나를 무서워하며,
// 경찰은 '사적 제재'로 쫓는다 (47zf justiceMoment). 돈은 놈들 지갑에서 나온다.
//   tteot   떴다방 사기꾼: 가게 앞에서 노인들에게 가짜 건강식품을 수백만 원에 판다. 덩치 둘이 지킨다
//   animal  동물 학대범: 골목에서 묶인 개를 걷어찬다. 다가가면 "내 개 내 맘대로 하는데?"
//   gongal  자해공갈단: 차 앞에 드러누운 놈과 둘이 초보 운전자를 둘러싸고 합의금을 뜯는다
// 동네에 PC방·119 안전센터·지구대가 없으면 흔한 상가 몇 곳을 그 가게로 바꿔 단다 (cozyPlacesInit).
function cozyPlacesInit() {
  if (!STAGE.cityLife) return; const has = n => BLD.some(b => signOf(b).includes(n));
  const spare = BLD.filter(b => b.kind === 'shop' && !b.vacant && ['자재', '타일', '지물포', '조명', '도색'].includes(signOf(b)));
  const rename = cozyRename;
  if (!has('PC방')) { rename(spare[0], 'PC방'); rename(spare[3], 'PC방'); }
  if (!has('119')) rename(spare[1], '119 안전센터');
  if (!has('지구대')) rename(spare[2], '지구대');
}
// 이름에 n이 들어간 가게 앞 (가까운 것부터, r0~r1)
function placeFront(n, r0 = 200, r1 = 2200, from = S.player) {
  const L = BLD.map(b => ({ b, p: shopFront(b) })).filter(o => o.p && !o.b.vacant && signOf(o.b).includes(n)).map(o => ({ ...o, d: dist(o.p.x, o.p.y, from.x, from.y) })).filter(o => o.d > r0 && o.d < r1);
  const best = L.sort((a, b) => a.d - b.d)[0];
  if (best || !COZY_SIGN[n]) return best || null;
  // 이 근처에 그런 가게가 없다: 흔한 상가 하나(철물·자재·인쇄…)가 그 가게다 — 간판을 바꿔 단다 (화면 밖이라 바뀌는 순간은 안 보인다)
  const C = BLD.map(b => ({ b, p: shopFront(b) })).filter(o => o.p && !o.b.vacant && o.b.kind === 'shop' && o.b.fh && cozyPlainRank(signOf(o.b)) >= 0).map(o => ({ ...o, d: dist(o.p.x, o.p.y, from.x, from.y) })).filter(o => o.d > Math.max(r0, 320) && o.d < r1).sort((a, b) => cozyPlainRank(signOf(a.b)) - cozyPlainRank(signOf(b.b)) || a.d - b.d);
  const o = C[0]; if (!o) return null; cozyRename(o.b, COZY_SIGN[n]); return o;
}
// 바꿔 달아도 되는 가게: 흔한 상가 → 간판 없는 가게 → 흔한 술집·약국 (편의점·클럽·이름 있는 곳은 그대로)
const COZY_PLAIN = ['철물', '공구', '자재', '지물포', '타일', '조명', '도색', '인쇄', '', '청계 상회', '약국', '호프', '포차', '골뱅이', '노가리', '분식'];
const cozyPlainRank = t => COZY_PLAIN.indexOf(t);
const COZY_SIGN = { 'PC방': 'PC방', '119': '119 안전센터', '지구대': '지구대', '국밥': '국밥', '편의점': '편의점' };
function cozyRename(b, n) { if (!b) return; b.signs = [n, ...(b.signs || []).slice(1)]; b.name = n; b._facade = null; }
// 놈이 무너질 때 한마디 (빌거나 끝까지 뻔뻔하거나)
function revengeBeg(g, lines) { if (npcAlive(g) && !g.begged && dist(g.x, g.y, S.player.x, S.player.y) < 70) { g.begged = true; gsay(g, lines[(g.id) % lines.length], 2.2); } }
// 덩치들은 조직원처럼 덤빈다 (행인 AI는 쫓지 않으므로 조직원으로 바꿔 단다 — 옷은 그대로)
const thugsOn = L => { for (const g of L) if (npcAlive(g) && !g.off) { if (!g.fac) { g.fac = 'D'; g.rival = true; } g.civ = false; copChase(g); } };
const REVENGE = [
  { key: 'tteot', d: '*', villain: true, name: '떴다방 사기꾼',
    start(ev) { const f = districtFront(ev.d, b => b.kind === 'shop', 380, 1000); if (!f) return false; const p = f.p;
      ev.g = evPerson(ev, p.x, p.y + 6, { body: 'coat' }); ev.olds = [evPerson(ev, p.x - 40, p.y + 30, { body: 'old' }), evPerson(ev, p.x + 40, p.y + 34, { body: 'old' })];
      ev.thugs = [evPerson(ev, p.x - 70, p.y + 4, { fac: 'C', body: 'big' }), evPerson(ev, p.x + 70, p.y + 4, { fac: 'C', body: 'big' })];
      gsay(ev.g, '어르신! 이 한 병이면 관절이고 암이고 싹 낫습니다! 오늘만 300만 원!', 3.5); after(2, () => npcAlive(ev.olds[0]) && gsay(ev.olds[0], '아들한테 받은 용돈인데...', 2.6)); return true; },
    focus: ev => ev.loot ? ev.loot.owner : ev.g,
    update(ev) { const g = ev.g, P = S.player;
      if (ev.engaged && !ev.hot && dist(g.x, g.y, P.x, P.y) < 220) { ev.hot = true; gsay(ev.thugs[0], '뭘 봐? 장사 방해하지 말고 꺼져.', 2.2); thugsOn(ev.thugs); }
      if (!npcAlive(g)) { if (!ev.dropped) { ev.dropped = true; justiceMoment('떴다방 사기꾼 처리', `[속보] ${ev.d} 노인 상대 '만병통치약' 떴다방 업자, 가게 앞에서 쓰러진 채 발견… 피해 노인 수십 명`, g.x, g.y);
          evItem(ev, g.x + 14, g.y + 8, 'bag', 200, () => evLoot(ev, ev.olds.find(npcAlive) || null, 200, 30, '노인들 돈 가방')); } return; }
      revengeBeg(g, ['자, 잠깐! 돈 돌려드릴게요!', '이거 다 합법이에요! 합법!']);
      if (g.state === 'PANIC' || g.state === 'FLEE') { if (dist(g.x, g.y, P.x, P.y) > 900) { evGone(g); evEnd(ev, '사기꾼이 돈 가방을 들고 달아났다'); } }
      if (ev.engaged && dist(ev.x, ev.y, P.x, P.y) > 1600) evEnd(ev, '그냥 지나쳤다'); },
    goal: ev => ev.loot ? '노인들 돈 가방 — 돌려주거나 챙기기' : ev.dropped ? '떨어진 돈 가방 줍기' : '노인 등치는 떴다방 사기꾼 처리 (덩치 둘)' },
  { key: 'animal', d: '*', villain: true, name: '동물 학대범',
    start(ev) { const p = offscreenSpot(380, 700); if (!p) return false; ev.g = evPerson(ev, p.x, p.y, { body: 'big' });
      const d = ev.dog = evPerson(ev, p.x + 30, p.y + 6, {}); d.dog = true; d.body = null; d.outfit = null; d.civ = true; ev.kicks = 0; gsay(ev.g, '짖지 말라고 했지!', 2.4); return true; },
    focus: ev => ev.g,
    update(ev) { const g = ev.g, d = ev.dog, P = S.player;
      if (!npcAlive(g)) { if (!ev.paid) { ev.paid = true; cash(30); evEnd(ev, '학대범 정리 · 놈의 지갑 30만', true); justiceMoment('동물 학대범 처리', `[속보] 골목서 개 상습 학대하던 남성, 같은 자리에서 쓰러진 채 발견… 주민 "몇 달째 비명 들렸다"`, g.x, g.y);
          if (npcAlive(d)) { d.dogFree = true; evFlee(d, g.x, g.y, 30); } } return; }
      if (npcAlive(d) && dist(g.x, g.y, P.x, P.y) > 120 && (ev.kickT = (ev.kickT || 0) - 1 / 60) <= 0) { ev.kickT = 2.2; ev.kicks++; g.swingT = 0.3; g.a = Math.atan2(d.y - g.y, d.x - g.x); play('thud', 0.4 * proxVol(g)); gsay(d, '깨갱!', 1); }
      if (ev.engaged && !ev.warned && dist(g.x, g.y, P.x, P.y) < 120) { ev.warned = true; gsay(g, '내 개 내 맘대로 하는데 뭔 상관이야?', 2.6); g.a = Math.atan2(P.y - g.y, P.x - g.x); }
      revengeBeg(g, ['아, 알았어! 안 때릴게!', '신고할 거야! 이거 폭행이야!']);
      if (ev.engaged && dist(g.x, g.y, P.x, P.y) > 1500) evEnd(ev, '그냥 지나쳤다'); },
    goal: () => '골목에서 개를 걷어차는 학대범 처리' },
  { key: 'gongal', d: '*', villain: true, name: '자해공갈단',
    start(ev) { const p = roadSpot(420, 800); if (!p) return false; const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), hor = G0[ty][tx - 2] === '=' && G0[ty][tx + 2] === '=', a = hor ? 0 : Math.PI / 2;
      ev.car = evCar(ev, 'sedan', p.x, p.y, a, {}); const ox = Math.cos(a), oy = Math.sin(a);
      ev.driver = evPerson(ev, p.x - oy * 34, p.y + ox * 34, { body: 'fBob' }); ev.lie = evPerson(ev, p.x + ox * 50, p.y + oy * 50, {}); ev.lie.wait = 999;
      ev.thugs = [ev.lie, evPerson(ev, p.x - oy * 60 + ox * 20, p.y + ox * 60 + oy * 20, { body: 'big' }), evPerson(ev, p.x - oy * 60 - ox * 20, p.y + ox * 60 - oy * 20, { body: 'vest' })];
      gsay(ev.lie, '아이고 다리야! 사람 쳤다!', 3); after(1.5, () => npcAlive(ev.thugs[1]) && gsay(ev.thugs[1], '합의금 500. 안 주면 보험 처리에 경찰 부른다?', 3)); after(3.5, () => npcAlive(ev.driver) && gsay(ev.driver, '저 진짜 안 박았어요... 서 있었는데...', 2.6)); return true; },
    focus: ev => ev.thugs.find(npcAlive) || ev.lie,
    update(ev) { const P = S.player, up = ev.thugs.filter(npcAlive);
      if (!up.length) { if (!ev.paid) { ev.paid = true; cash(120); evEnd(ev, '공갈단 정리 · 놈들 지갑 120만', true); justiceMoment('자해공갈단 처리', `[속보] 초보 운전자 노린 자해공갈단 셋, 도로 한복판서 모두 쓰러진 채 발견… 블랙박스엔 "다리 다쳤다"던 남성이 뛰는 장면`, ev.x, ev.y);
          if (npcAlive(ev.driver)) after(1.6, () => gsay(ev.driver, '...', 2)); } return; }
      if (ev.engaged && !ev.hot && up.some(g => dist(g.x, g.y, P.x, P.y) < 200)) { ev.hot = true; if (npcAlive(ev.lie)) gsay(ev.lie, '...뭐야 저 새끼.', 1.8); ev.lie.wait = 0; thugsOn(up); }
      for (const g of up) revengeBeg(g, ['자, 잠깐! 장난이었어!', '다리 멀쩡해요! 멀쩡하다고!']);
      if (ev.engaged && dist(ev.x, ev.y, P.x, P.y) > 1600) evEnd(ev, '그냥 지나쳤다'); },
    goal: ev => `초보 운전자 등치는 자해공갈단 처리 (${ev.thugs.filter(npcAlive).length}명)` },
];
EVENTS.push(...REVENGE);
