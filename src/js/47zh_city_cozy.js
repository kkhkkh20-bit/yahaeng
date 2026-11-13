// ---------------------------------------------------------------- 자유 모드 동네 이야기 (아기자기한 서브 이벤트)
// 편의점·PC방·119 안전센터·지구대·국밥집 같은 동네 장소에서 소소한 부탁이 생긴다. 싸움 없이 따뜻하게 끝나는 일들.
// 보상은 작다(용돈·평판). 구역 사건(47f)과 같은 틀(d: '*' — 어느 구역에서나).
//   snack    야자 끝난 학생의 편의점 심부름 (삼각김밥·바나나우유)
//   pcbang   PC방에서 안 나오는 아들 데려오기 (엄마의 부탁)
//   puppy    119 안전센터 앞에서 우는 아이 — 잃어버린 강아지 찾아 주기
//   lostgran 길 잃은 할머니를 지구대까지 모셔다 드리기 (천천히 따라오신다)
//   gukbap   국밥집 사장님 대신 배달 — 식기 전에 (60초)
// 동네에 PC방과 119 안전센터가 없으면 흔한 상가 몇 곳을 그 가게로 바꿔 단다 (cozyPlacesInit).
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
// 나를 따라오는 사람(강아지): 0.5초마다 내 뒤쪽으로 걷는다
function cozyFollow(ev, g, gap = 46) { if (!npcAlive(g)) return; if ((g.folT = (g.folT || 0) - 1 / 60) > 0) return; g.folT = 0.5; const P = S.player;
  if (g.state === 'PANIC' || g.state === 'FLEE') { g.state = 'PATROL'; g.fear = null; }
  if (dist(g.x, g.y, P.x, P.y) > gap) cozyWalk(g, P.x - Math.cos(P.a) * gap * .7, P.y - Math.sin(P.a) * gap * .7); else { g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.path = null; } }
// 행인은 경로 점이 둘 이상일 때만 걷는다 (people.js): 지금 자리 → 목표 (목표가 30px 넘게 바뀔 때만 길을 다시 찾는다)
function cozyWalk(g, x, y) { const R = g.route, last = R && R.length > 1 && R[R.length - 1];
  if (last && dist(last.x, last.y, x, y) < 30 && g.path) return;
  g.route = [{ x: g.x, y: g.y, pause: 0 }, { x, y, pause: 999 }]; g.ri = 1; g.wait = 0; g.path = null; if (g.state !== 'PANIC') g.state = 'PATROL'; }
const near = (o, r = 56) => o && dist(S.player.x, S.player.y, o.x, o.y) < r && !S.player.car;
function cozyDone(ev, msg, pay, rep, who, line) { if (ev.done) return; if (pay) cash(pay); addRep(ev.d, rep); fstat('cozy'); if (who && npcAlive(who) && line) gsay(who, line, 3); evEnd(ev, msg, true); }
const COZY = [
  { key: 'snack', d: '*', name: '편의점 심부름',
    start(ev) { const p = offscreenSpot(300, 600); const s = placeFront('편의점'); if (!p || !s) return false; ev.kid = evPerson(ev, p.x, p.y, { body: 'kid', outfit: 'student' }); ev.shop = s.p; gsay(ev.kid, '저기요... 편의점 가시면 삼각김밥 하나만요. 야자 끝나서 배고파요.', 3.5); return true; },
    focus: ev => ev.got ? ev.kid : ev.shop,
    update(ev) { if (!npcAlive(ev.kid)) evEnd(ev, null); },
    action(ev) { if (!ev.got && near(ev.shop, 60)) return { label: '삼각김밥·바나나우유 사기 (8만)', at: { x: ev.shop.x, y: ev.shop.y - 50 }, fn: () => { if (!pay(8)) return; ev.got = true; play('cloth', 0.4); evBanner('삼각김밥이랑 바나나우유 — 학생한테 갖다 주자', '#ffe1a8'); } };
      if (ev.got && near(ev.kid)) return { label: '건네주기', at: { x: ev.kid.x, y: ev.kid.y - 50 }, fn: () => cozyDone(ev, '학생이 허겁지겁 먹는다 · 평판 +3', 0, 3, ev.kid, '와 바나나우유까지! 감사합니다!! 공부 열심히 할게요!') };
      return null; },
    goal: ev => ev.got ? '학생에게 삼각김밥 건네주기' : '편의점에서 삼각김밥 사 오기' },
  { key: 'pcbang', d: '*', name: 'PC방 아들',
    start(ev) { const p = offscreenSpot(300, 600); const s = placeFront('PC방'); if (!p || !s) return false; ev.mom = evPerson(ev, p.x, p.y, { body: 'fBob' }); ev.shop = s.p; gsay(ev.mom, '우리 애가 PC방에서 사흘째 안 나와요... 좀 데려와 주실래요?', 3.5); return true; },
    focus: ev => ev.son ? ev.mom : ev.shop,
    update(ev) { if (ev.son) { cozyFollow(ev, ev.son); if (near(ev.mom, 90) && dist(ev.son.x, ev.son.y, ev.mom.x, ev.mom.y) < 110) { gsay(ev.son, '엄마... 딱 한 판만...', 2.4); after(1.2, () => npcAlive(ev.mom) && gsay(ev.mom, '너 집에 가서 보자.', 2.4)); cash(30); cozyDone(ev, 'PC방 아들 귀가 · 30만 · 평판 +3', 0, 3); } } },
    action(ev) { if (!ev.son && near(ev.shop, 70)) return { label: 'PC방 들어가서 데려오기', at: { x: ev.shop.x, y: ev.shop.y - 50 }, fn: () => doMotion({ dur: 1.2, pose: 'idle', end: () => { ev.son = evPerson(ev, ev.shop.x + 20, ev.shop.y + 10, { body: 'hoodieCasual', outfit: 'gamer' }); gsay(ev.son, '아 지금 랭겜 중인데...!', 2.4); } }) };
      return null; },
    goal: ev => ev.son ? '아들을 엄마한테 데려다주기 (따라온다)' : 'PC방에서 아들 데려오기' },
  { key: 'puppy', d: '*', name: '강아지 찾기',
    start(ev) { const s = placeFront('119', 300, 2400); if (!s) return false; ev.home = s.p; ev.kid = evPerson(ev, s.p.x - 30, s.p.y + 12, { body: 'kid' }); ev.ff = evPerson(ev, s.p.x + 34, s.p.y + 6, { body: 'helmet', outfit: 'firefighter' });
      const a = rnd(0, TAU), q = { x: s.p.x + Math.cos(a) * 650, y: s.p.y + Math.sin(a) * 650 }, w = walkableNear(q.x, q.y, { x: -1e5, y: -1e5 }); ev.dog = evPerson(ev, w.x, w.y, {}); ev.dog.dog = true; ev.dog.civ = true; ev.dog.body = null; ev.dog.outfit = null;
      gsay(ev.kid, '우리 콩이가 없어졌어요... 흑흑', 3); gsay(ev.ff, '소방서도 동물 구조는 하는데, 지금 출동이 밀려서요.', 3); return true; },
    focus: ev => ev.found ? ev.kid : ev.dog,
    update(ev) { const d = ev.dog; if (!npcAlive(d)) { evEnd(ev, null); return; }
      if (!ev.found && near(d, 80)) { ev.found = true; play('call', 0.4, 1.8); evBanner('콩이를 찾았다 — 따라온다', '#ffe1a8'); }
      if (ev.found) { cozyFollow(ev, d, 36); if (dist(d.x, d.y, ev.kid.x, ev.kid.y) < 90) { gsay(ev.ff, '찾아 주셨네요! 고맙습니다.', 2.6); cozyDone(ev, '콩이가 집에 왔다 · 평판 +4', 20, 4, ev.kid, '콩아!! 아저씨 고마워요!'); } } },
    goal: ev => ev.found ? '강아지를 119 안전센터 앞 아이에게 데려다주기' : '잃어버린 강아지 찾기' },
  { key: 'lostgran', d: '*', name: '길 잃은 할머니',
    start(ev) { const p = offscreenSpot(300, 600); const s = placeFront('지구대', 300, 1300); if (!p || !s) return false; ev.gran = evPerson(ev, p.x, p.y, { body: 'old' }); ev.dest = s.p; gsay(ev.gran, '총각, 우리 집이 어디였더라... 지구대 가면 알려 준다던데.', 3.5); return true; },
    focus: ev => ev.go ? ev.dest : ev.gran,
    update(ev) { const g = ev.gran; if (!npcAlive(g)) { evEnd(ev, null); return; }
      if (!ev.go && near(g, 70)) { ev.go = true; gsay(g, '아이고 고마워라. 천천히 가 줘.', 2.6); }
      if (ev.go) { cozyFollow(ev, g, 40); if (dist(g.x, g.y, ev.dest.x, ev.dest.y) < 90) { if (!ev.cop) ev.cop = evPerson(ev, ev.dest.x + 30, ev.dest.y, { police: true }); gsay(ev.cop, '어르신 가족분이 찾고 계셨어요! 감사합니다.', 2.6); cozyDone(ev, '할머니를 지구대에 모셔다 드렸다 · 평판 +5', 0, 5, g, '복 받을 거야, 총각.'); } } },
    goal: ev => ev.go ? '할머니를 지구대까지 모셔다 드리기 (천천히)' : '길 잃은 할머니에게 말 걸기' },
  { key: 'gukbap', d: '*', name: '국밥 배달',
    start(ev) { const s = placeFront('국밥', 250, 1600) || placeFront('백반', 250, 1600); if (!s) return false; ev.shop = s.p; ev.boss = evPerson(ev, s.p.x + 24, s.p.y + 8, { body: 'workApron', outfit: 'chef' }); gsay(ev.boss, '배달 기사가 안 와! 한 그릇만 갖다 줄 수 있어? 식기 전에!', 3.5); return true; },
    focus: ev => ev.to ? ev.to : ev.shop,
    update(ev) { if (ev.to && !ev.done) { const left = ev.until - S.t; if (near(ev.to, 70)) { const hot = left > 0; if (!ev.cust) ev.cust = evPerson(ev, ev.to.x + 20, ev.to.y, {}); cozyDone(ev, hot ? '국밥 배달 · 팁 30만 · 평판 +3' : '다 식었다… · 5만', hot ? 30 : 5, hot ? 3 : 0, ev.cust, hot ? '와 아직 뜨끈하네! 이건 팁이에요.' : '다 식었잖아요...'); } } },
    action(ev) { if (!ev.to && near(ev.shop, 70)) return { label: '국밥 받아 들기', at: { x: ev.shop.x, y: ev.shop.y - 50 }, fn: () => { const L = BLD.filter(b => (b.kind === 'villa' || b.kind === 'house') && !b.vacant).map(b => shopFront(b)).filter(p => p && dist(p.x, p.y, ev.shop.x, ev.shop.y) > 500 && dist(p.x, p.y, ev.shop.x, ev.shop.y) < 1200);
        ev.to = L[(Math.random() * L.length) | 0] || { x: ev.shop.x + 600, y: ev.shop.y }; ev.until = S.t + 60; play('cloth', 0.4); evBanner('국밥 한 그릇 — 60초 안에 배달 (미니맵 목표)', '#ffe1a8'); } };
      return null; },
    goal: ev => ev.to ? `국밥 배달 — 남은 ${Math.max(0, Math.ceil(ev.until - S.t))}초` : '국밥집에서 배달 받아 들기' },
];
EVENTS.push(...COZY);
