// ---------------------------------------------------------------- 자유 모드 구역 이벤트: 돌아다니다 마주치는 일 (구역마다 둘, 모두 14개) + 구역 평판
// 한 번에 하나. 지금 있는 구역에서 1.5~2.5분마다 화면 밖(나에게서 수백 px)에 생긴다. 먼저 소리와 말풍선, 화면 가장자리 '!'·미니맵 점으로 알리고,
// 가까이 가면 위쪽 띠에 이름이 뜨고 목표 줄에 할 일이 나온다. 무시하면 80초 뒤 사라진다. 선택이 있는 일은 가게 창과 같은 창으로 고른다.
// 평판: 착한 선택은 오르고 범죄는 내린다. 높으면 그 구역 가게가 싸지고 목격 신고가 늦어진다. 낮으면 비싸지고 행인이 나를 피한다
const EV_GAP = [90, 150], EV_LIFE = 80, EV_HARD = 240, EV_REACH = 520;
const evDist = (x, y) => { let n = STAGE.districtAt?.(Math.floor(x / TILE), Math.floor(y / TILE)); if (n === '청계천') n = '청계천 상가'; return n || null; };
// ---- 평판
const repOf = n => (S.rep || {})[n] || 0;
function addRep(n, d) { if (!n || !d) return; S.rep = S.rep || {}; S.rep[n] = clamp((S.rep[n] || 0) + d, -100, 100); evBanner(`${n} 평판 ${d > 0 ? '+' : ''}${d} → ${S.rep[n]}`, d > 0 ? '#9fe0b0' : '#ff9a86'); }
const repTag = n => { const r = repOf(n); return r ? ` · 평판 ${r > 0 ? '+' : ''}${r}` : ''; };
function repPrice(p) { const r = repOf(evDist(S.player.x, S.player.y)); return Math.max(1, Math.round(p * (r >= 60 ? 0.8 : r >= 30 ? 0.9 : r <= -30 ? 1.2 : 1))); }
function repWitnessMul(x, y) { const r = repOf(evDist(x, y)); return r >= 30 ? 0.7 : r <= -30 ? 1.3 : 1; }
// ---- 위쪽 띠 (글자 안내를 숨긴 자유 모드에서도 보인다)
function evBanner(text, col = '#f2e7c8') {
  let el = document.getElementById('evBanner');
  if (!el) { el = document.createElement('div'); el.id = 'evBanner'; el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:41;pointer-events:none;font:600 20px/1.35 "Yahaeng UI",sans-serif;letter-spacing:-.01em;text-align:center;text-shadow:0 2px 0 #000,0 0 10px rgba(0,0,0,.85);opacity:0;transition:opacity .35s;max-width:90vw';
    document.body.appendChild(el); }
  // 밝은 네온 위에서도 읽히게: 반투명 어두운 띠 + 알림 색 밑줄 (글자 그림자만으로는 간판 앞에서 묻혔다)
  if (!el._bg) { el._bg = true; Object.assign(el.style, { background: 'rgba(7,10,18,.78)', padding: '6px 16px', borderBottom: '2px solid currentColor', maxWidth: 'min(92vw,720px)' }); }
  el.textContent = text; el.style.color = col; el.style.opacity = '1'; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 3200);
}
// ---- 등장인물 · 차 · 줍는 것
function evPerson(ev, x, y, o = {}) {
  const gi = cityGuardSlot(), g = makeGuard({ kind: o.kind || 'civ', at: [Math.floor(x / TILE), Math.floor(y / TILE)], radio: false, body: o.body }, gi);
  g.x = x; g.y = y; g.route = [{ x, y, pause: 999 }]; g.ri = 0; g.wait = 999; g.evt = ev.key;
  if (o.fac) { g.fac = o.fac; g.outfit = FAC_OUTFIT[o.fac] || null; g.rival = true; g.torch = false; }
  if (o.outfit) g.outfit = o.outfit;
  if (o.police) { g.police = true; g.fac = 'P'; g.outfit = 'police'; g.torch = true; }
  placeGuard(g, gi); setLayer(0); if (PR) prWarm([charOf(g)], true); ev.actors.push(g); return g;
}
function evGo(g, x, y) { if (!npcAlive(g)) return; g.route = [{ x, y, pause: 999 }]; g.ri = 0; g.wait = 0; g.path = null; if (g.state !== 'PANIC' && g.state !== 'ALERT') g.state = 'PATROL'; }
function evGone(g) { if (!g) return; g.off = true; g.state = 'DEAD'; g.x = -9999; g.y = -9999; g.path = null; g.icon = null; g.say = null; }
function evFlee(g, fx, fy, t = 40) { if (npcAlive(g)) civPanic(g, fx, fy, t); }
function evCar(ev, type, x, y, a, o = {}) { const v = makeVehicle({ type, x, y, a, parked: !o.ai }); Object.assign(v, o); v.evt = ev.key; S.vehicles.push(v); ev.cars.push(v); return v; }
function evItem(ev, x, y, kind, val, onPick) { const it = { x, y, kind, val, onPick, evt: ev.key }; (S.evItems || (S.evItems = [])).push(it); return it; }
// 가까운 도로 칸 (차를 세울 곳)
function roadNear(x, y, r = 7) {
  const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE); let best = null, bd = 1e9;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (!inMap(tx, ty) || G0[ty][tx] !== '=' || bldAt(tx, ty) >= 0) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { x: tc(tx), y: tc(ty) }; } }
  return best;
}
// 화면 밖 도로 칸 (r0~r1)
function roadSpot(r0, r1) { for (let k = 0; k < 12; k++) { const p = offscreenSpot(r0, r1); if (p && G0[Math.floor(p.y / TILE)][Math.floor(p.x / TILE)] === '=') return p; } return null; }
// 이 구역의 건물 앞 (pred: 건물 고르기). 나에게서 r0~r1
function districtFront(n, pred, r0 = 450, r1 = 1700) {
  const P = S.player, list = BLD.map(b => ({ b, p: shopFront(b) })).filter(o => o.p && !o.b.vacant && pred(o.b) && evDist(o.p.x, o.p.y) === n && dist(o.p.x, o.p.y, P.x, P.y) > r0 && dist(o.p.x, o.p.y, P.x, P.y) < r1);
  return list.length ? list[(Math.random() * list.length) | 0] : null;
}
const signOf = b => (b.signs?.[0] || '').trim();
const seesMe = (g, r = 280) => npcAlive(g) && dist(g.x, g.y, S.player.x, S.player.y) < r && los(g.x, g.y, S.player.x, S.player.y);
const cash = n => { S.cash = (S.cash || 0) + n; play('loot', 0.6); if (typeof hudCache !== 'undefined') hudCache.objH = null; };
// 주운 것을 주인에게 돌려줄지 챙길지: 주인 곁에서 [행동]으로 고르고, 40초 안에 안 고르면 챙긴 것이 된다
function evLoot(ev, owner, val, reward, what) {
  ev.loot = { owner, val, reward, what, until: S.t + 40 };
  if (npcAlive(owner)) { owner.state = 'PATROL'; evGo(owner, owner.x, owner.y); gsay(owner, '제 ' + what + '이에요! 돌려주세요!', 3); }
  evBanner(`${what} 습득 · (돌려줄까, 꿀꺽할까.)`);
}
// 나는 선인도 악인도 아니다. 눈앞에서 알짱대는 놈이 거슬려서 치우고, 돈을 챙길 뿐
const ANNOYED = ['...거슬리네.', '눈에 띈 게 네 운이다.', '시끄럽네.', '하필 내 앞에서.', '돈은 좀 있겠지.', '귀찮게 하네.'];
function evKeep(ev) { const L = ev.loot; if (!L || ev.done) return; cash(L.val); addRep(ev.d, -3); evEnd(ev, `${L.what} 꿀꺽 · +${L.val}만`); }
function evGive(ev) { const L = ev.loot; if (!L || ev.done) return; cash(L.reward); addRep(ev.d, 2);   /* 돌려주면 동네 평판이 오른다 */ if (npcAlive(L.owner)) gsay(L.owner, '...가, 감사합니다.', 3); evEnd(ev, `주인 품으로 · 수고비 +${L.reward}만`, true); if (ev.def.onGive) ev.def.onGive(ev); }

// ---------------------------------------------------------------- 이벤트 14개
// start(ev): 자리를 잡고 사람·차를 세운다 (못 하면 false). update(ev,dt). goal(ev): 목표 줄. action(ev): [행동] 후보. x,y: 표시할 곳(ev.focus())
const EVENTS = [
  // 종로 유흥가 ① 취객 시비
  { key: 'drunk', d: '종로 유흥가', name: '취객 시비',
    start(ev) { const p = offscreenSpot(380, 700); if (!p) return false; ev.g = evPerson(ev, p.x, p.y, { body: 'big' }); gsay(ev.g, '어이! 거기 너! 이리 와 봐!', 3); return true; },
    focus: ev => ev.g,
    update(ev, dt = 1 / 60) { const g = ev.g, P = S.player;
      if (g.state === 'DEAD') { if (!ev.dropped) { ev.dropped = true; const val = 60 + ((Math.random() * 7) | 0) * 10; if (witnessed(g.x, g.y, 300 * repWitnessMul(g.x, g.y))) addWanted(1, '취객을 때려눕혔다'); evItem(ev, g.x + 16, g.y + 8, 'wallet', val, it => { cash(it.val); addRep(ev.d, -1); evEnd(ev, `취객 지갑 · ${it.val}만`); }); } return; }
      if ((ev.stepT = (ev.stepT || 0) - dt) <= 0) { ev.stepT = 1; if (dist(g.x, g.y, P.x, P.y) < 700 && !P.car) evGo(g, P.x, P.y); }
      if (!P.car && dist(g.x, g.y, P.x, P.y) < 42 && (ev.shoveT || 0) < S.t) { ev.shoveT = S.t + 2.6; gsay(g, ['뭘 꼬나봐!', '내가 누군 줄 알아?', '한잔 사든가!'][(S.t | 0) % 3], 2.2); const a = Math.atan2(P.y - g.y, P.x - g.x); P.x += Math.cos(a) * 22; P.y += Math.sin(a) * 22; collide(P, 13, groundSolidP); play('thud', 0.4); }
      if (ev.engaged && dist(g.x, g.y, P.x, P.y) > 950) evEnd(ev, '(비틀비틀 가 버리네.)', true); },
    goal: ev => ev.dropped ? '취객이 떨어뜨린 지갑 줍기' : '취객 시비 · 피하거나 때려눕히기' },
  // 종로 유흥가 ② VIP 출차: 클럽 앞 리무진에 간부가 탄다. 떠나기 전에 차를 빼앗으면 현금, 대신 조직이 덤빈다
  { key: 'vip', d: '종로 유흥가', name: 'VIP 출차',
    start(ev) { let f = null, r = null; for (let k = 0; k < 10 && !r; k++) { f = (k < 3 && districtFront(ev.d, b => /^CLUB/.test(signOf(b)))) || districtFront(ev.d, b => b.kind === 'shop'); r = f && roadNear(f.p.x, f.p.y + TILE * 2, 10); } if (!r) return false;  // 클럽(없으면 아무 가게) 앞 · 차 세울 도로가 가까운 곳
      ev.car = evCar(ev, 'limo', r.x, r.y, 0); ev.car.driver = true; ev.vip = evPerson(ev, f.p.x, f.p.y, { kind: 'g2', fac: 'D' }); ev.guards = [-1, 1].map(s => evPerson(ev, r.x + s * 34, r.y - 40, { kind: 'g1', fac: 'D' })); ev.phase = 'wait'; ev.t = S.t; return true; },
    focus: ev => ev.car,
    update(ev, dt = 1 / 60) { const v = ev.car, P = S.player;
      if (P.car === v) { const c = 150 + ((Math.random() * 11) | 0) * 10; cash(c); addRep(ev.d, -3); for (const g of [ev.vip, ...ev.guards]) if (npcAlive(g) && !g.off) copChase(g); evEnd(ev, `VIP 차 탈취 · 글러브박스 +${c}만`); return; }
      if (ev.phase === 'wait' && ev.engaged && S.t - ev.t > 12) { ev.phase = 'walk'; evGo(ev.vip, v.x, v.y - 30); gsay(ev.vip, '차 빼.', 2); }
      if (ev.phase === 'walk' && npcAlive(ev.vip) && dist(ev.vip.x, ev.vip.y, v.x, v.y) < 60) { ev.phase = 'go'; ev.goT = S.t + 2.4;  // 경호원이 문을 열고 VIP부터 차례로 탄다
        [ev.vip, ...ev.guards].forEach((g, i) => after(i * 0.5, () => { if (!npcAlive(g) || g.off || v.dead) return; g.x = v.x - Math.sin(v.a) * 30; g.y = v.y + Math.cos(v.a) * 30; v.doorT = S.t + 0.2; v.doorSide = -1; play('switch', 0.4); after(0.25, () => evGone(g)); })); }
      if (ev.phase === 'go' && S.t > ev.goT) { ev.phase = 'gone'; v.ai = true; v.parked = false; v.v = 120; ev.leftT = S.t; }
      if (ev.phase === 'gone' && S.t - ev.leftT > 25) evEnd(ev, '(리무진 놓쳤어.)', true); },
    goal: ev => ev.phase === 'gone' ? 'VIP 리무진 쫓아 빼앗기' : '떠나기 전에 VIP 리무진 빼앗기' },
  // 을지로 인쇄골목 ① 날치기: 경차가 가방을 낚아채 달아난다. 들이받아 세우면 가방
  { key: 'snatch', d: '을지로 인쇄골목', name: '날치기',
    start(ev) { const r = roadSpot(420, 800); if (!r) return false; ev.victim = evPerson(ev, r.x, r.y - TILE * 2, {}); ev.car = evCar(ev, 'micro', r.x, r.y, rnd(0, TAU), { ai: true, driver: true }); ev.hp0 = ev.car.hp; gsay(ev.victim, '도둑이야! 내 가방!', 3.5); play('metal', 0.25, 1.6); return true; },
    focus: ev => ev.loot ? ev.victim : ev.car,
    update(ev, dt = 1 / 60) { const v = ev.car, P = S.player;
      if (!ev.stopped && (v.dead || v.hp < ev.hp0)) { ev.stopped = true; v.ai = false; v.v = 0; v.driver = false; const t = evPerson(ev, v.x + 40, v.y, {}); evFlee(t, P.x, P.y, 40); gsay(t, '젠장!', 1.5);
        evItem(ev, v.x - 30, v.y + 10, 'bag', 150, () => evLoot(ev, ev.victim, 150, 40, '가방')); }
      if (!ev.stopped && ev.engaged && dist(v.x, v.y, P.x, P.y) > 2400) evEnd(ev, '(날치기 놓쳤어.)'); },
    goal: ev => ev.loot ? '가방을 주인에게 돌려주거나 챙기기' : ev.stopped ? '떨어진 가방 줍기' : '날치기 경차를 들이받아 세우기' },
  // 을지로 인쇄골목 ② 위조지폐 단속 첩보: 60초 안에 인쇄소 앞 상자 셋을 빼돌리고 멀리 벗어난다
  { key: 'counterfeit', d: '을지로 인쇄골목', name: '위조지폐 단속 첩보',
    start(ev) { const f = districtFront(ev.d, b => /인쇄/.test(signOf(b))) || districtFront(ev.d, b => b.kind === 'shop'); if (!f) return false; ev.f = f.p; ev.got = 0;
      for (let k = 0; k < 3; k++) evItem(ev, f.p.x + (k - 1) * 30, f.p.y + 6 + (k % 2) * 12, 'box', 0, () => { ev.got++; play('cloth', 0.5); if (ev.got === 3) evBanner('상자 셋을 챙겼다 · 이제 멀리 벗어나라'); }); return true; },
    focus: ev => ev.f,
    update(ev, dt = 1 / 60) { const P = S.player;
      if (ev.engaged && !ev.deadline) { ev.deadline = S.t + 60; evBanner('첩보: 60초 뒤 단속반 · (상자 셋, 빨리.)'); }
      if (!ev.deadline) return;
      if (ev.got === 3 && dist(P.x, P.y, ev.f.x, ev.f.y) > 650) { cash(300); addRep(ev.d, -2); evEnd(ev, '위조지폐 상자 확보 · +300만'); return; }
      if (S.t > ev.deadline) { const near = dist(P.x, P.y, ev.f.x, ev.f.y) < 600; for (let k = 0; k < 2; k++) { const g = spawnCop(true); if (g) evGo(g, ev.f.x, ev.f.y); } if (near) addWanted(ev.got ? 2 : 1, '단속 현장에 있었다'); evEnd(ev, '(단속반이다. 늦었어.)'); } },
    goal: ev => ev.deadline ? `상자 ${ev.got}/3 빼돌리기 · ${Math.max(0, Math.ceil(ev.deadline - S.t))}초` : '인쇄소 앞 수상한 상자' },
  // 동대문 시장 ① 소매치기: 지갑을 털고 달아나는 소매치기를 잡는다
  { key: 'pickpocket', d: '동대문 시장', name: '소매치기',
    start(ev) { const p = offscreenSpot(400, 700); if (!p) return false; ev.victim = evPerson(ev, p.x, p.y, { body: 'fBob' }); ev.thief = evPerson(ev, p.x + 30, p.y + 10, { body: 'pack' }); gsay(ev.victim, '소매치기야! 잡아 주세요!', 3.5); evFlee(ev.thief, p.x, p.y, 60); return true; },
    focus: ev => ev.loot ? ev.victim : ev.thief,
    update(ev, dt = 1 / 60) { const t = ev.thief, P = S.player;
      if (t.state === 'DEAD') { if (!ev.dropped) { ev.dropped = true; evItem(ev, t.x + 14, t.y + 8, 'wallet', 100, () => evLoot(ev, ev.victim, 100, 30, '지갑')); } return; }
      if ((ev.fT = (ev.fT || 0) - dt) <= 0) { ev.fT = 2; if (dist(t.x, t.y, P.x, P.y) < 600) evFlee(t, P.x, P.y, 30); }
      if (ev.engaged && dist(t.x, t.y, P.x, P.y) > 1900) evEnd(ev, '(인파 속으로 빠졌어.)'); },
    goal: ev => ev.loot ? '지갑을 주인에게 돌려주거나 챙기기' : ev.dropped ? '떨어진 지갑 줍기' : '소매치기 잡기 (때려눕히기)' },
  // 동대문 시장 ② 짐차 사고: 쏟아진 상자를 줍는다 (하나 30만). 상인이 보면 수배
  { key: 'spill', d: '동대문 시장', name: '짐차 사고',
    start(ev) { const r = roadSpot(450, 850); if (!r) return false; ev.car = evCar(ev, 'box', r.x, r.y, rnd(0, TAU)); ev.merchant = evPerson(ev, r.x + 50, r.y - 40, {}); gsay(ev.merchant, '아이고 내 물건! 손대지 마!', 3); play('thud', 0.4);
      ev.left = 5; for (let k = 0; k < 5; k++) evItem(ev, r.x + rnd(-70, 70), r.y + rnd(-50, 50), 'box', 30, it => { ev.left--; cash(it.val); addRep(ev.d, -1); if (!ev.seen && seesMe(ev.merchant, 300)) { ev.seen = true; addWanted(1, '상인의 물건을 주워 갔다'); } });
      ev.pickers = [0, 1].map(k => evPerson(ev, r.x + (k ? 300 : -300), r.y + 40, {})); return true; },
    focus: ev => ev.car,
    update(ev, dt = 1 / 60) { // 구경꾼도 상자를 주워 간다
      for (const g of ev.pickers) { if (!npcAlive(g)) continue; const it = (S.evItems || []).find(i => i.evt === ev.key); if (!it) break; if (dist(g.x, g.y, it.x, it.y) < 22) { S.evItems.splice(S.evItems.indexOf(it), 1); ev.left--; gsay(g, '횡재다!', 1.4); } else evGo(g, it.x, it.y); }
      if (ev.left <= 0) evEnd(ev, '(상자는 벌써 다 털렸네.)', true); },
    goal: ev => `쏟아진 상자 줍기 · 남은 ${ev.left}개` },
  // 청계천 상가 ① 다리 위 거래: 가방을 든 쪽을 쓰러뜨리면 큰돈. 양쪽 모두 덤빈다
  { key: 'deal', d: '청계천 상가', name: '다리 위 거래',
    start(ev) { const R = STAGE.river, P = S.player; if (!R) return false; const ys = (R.y + R.rows / 2) * TILE;
      const cand = (STAGE.roadsX || []).map(rx => ({ x: (rx + 2) * TILE, y: ys })).filter(p => { const d = dist(p.x, p.y, P.x, P.y); return d > 550 && d < 2600; }); if (!cand.length) return false;   // 블록 34칸 주기: 구역 북쪽 끝에서도 강 다리가 닿게
      const p = cand[(Math.random() * cand.length) | 0]; ev.p = p; ev.side = [];
      for (const [s, o] of [[-1, null], [1, 'gangD']]) for (let k = 0; k < 2; k++) { const g = evPerson(ev, p.x + s * (40 + k * 26), p.y + (k ? 26 : -10), { kind: k ? 'g1' : 'g2', fac: 'C' }); if (o) g.outfit = o; g.a = s < 0 ? 0 : Math.PI; ev.side.push(g); }
      ev.holder = ev.side[0]; return true; },
    focus: ev => ev.p,
    update(ev, dt = 1 / 60) { const h = ev.holder;
      if (h.state === 'DEAD' && !ev.dropped) { ev.dropped = true; for (const g of ev.side) if (npcAlive(g)) copChase(g); evItem(ev, h.x + 12, h.y + 10, 'bag', 400, it => { cash(it.val); addRep(ev.d, -2); evEnd(ev, `거래 가방 가로채기 · +${it.val}만`); }); return; }
      if (ev.engaged && !ev.leaveT) ev.leaveT = S.t + 55;
      if (ev.leaveT && S.t > ev.leaveT && !ev.dropped) { for (const g of ev.side) evGo(g, g.x + (g.x < ev.p.x ? -900 : 900), g.y); evEnd(ev, '(거래 끝. 다 흩어졌어.)', true); } },
    goal: ev => ev.dropped ? '거래 가방 줍기 · 조직이 쫓아온다' : '다리 위 거래 · 가방 든 놈을 쓰러뜨리면 큰돈' },
  // 청계천 상가 ② 노점 단속: 상인 편(평판↑·할인) 또는 단속반 편(사례금)
  { key: 'stall', d: '청계천 상가', name: '노점 단속',
    start(ev) { const f = districtFront(ev.d, b => b.kind === 'shop'); if (!f) return false; const p = f.p; ev.p = p; ev.vendor = evPerson(ev, p.x, p.y + 20, { body: 'old' }); ev.enf = [-1, 1].map(s => evPerson(ev, p.x + s * 40, p.y + 34, { outfit: 'staff' }));
      gsay(ev.vendor, '먹고살자고 하는 건데 너무하잖소!', 3); gsay(ev.enf[0], '불법 노점이에요. 치우세요.', 3); return true; },
    focus: ev => ev.p,
    update(ev, dt = 1 / 60) { if (ev.enf.some(g => g.state === 'DEAD') && !ev.done) { if (witnessed(ev.p.x, ev.p.y, 280)) addWanted(1, '단속반을 때렸다'); evHelpVendor(ev); }
      if ((ev.talkT = (ev.talkT || 0) - dt) <= 0) { ev.talkT = 3.5; const g = [ev.vendor, ...ev.enf][(S.t | 0) % 3]; if (npcAlive(g)) gsay(g, g === ev.vendor ? ['이거 뺏기면 우리 식구 굶어요!', '좀 봐줘요!'][(S.t | 0) % 2] : ['규정은 규정입니다.', '안 치우면 압수합니다.'][(S.t | 0) % 2], 2.4); } },
    action(ev) { const P = S.player; if (P.car || dist(P.x, P.y, ev.p.x, ev.p.y) > 80) return null; return { label: '노점 단속 끼어들기', at: { x: ev.p.x, y: ev.p.y - 50 }, fn: () => shopPanel('노점 단속', [
      { name: '상인 편 · 단속반 쫓아내기 (평판 +5)', price: null, tag: '+30만', ok: true, buy: () => { closeShopPanel(); evHelpVendor(ev); } },
      { name: '단속반 편 · 노점 치우기 (평판 -4)', price: null, tag: '+50만', ok: true, buy: () => { closeShopPanel(); if (ev.done) return; cash(50); addRep(ev.d, -4); evFlee(ev.vendor, S.player.x, S.player.y, 20); evEnd(ev, '단속반 사례 · +50만'); } }]) }; },
    goal: () => '노점 단속 · 상인 편 또는 단속반 편' },
  // 신당동 주택가 ① 빈집털이: 도둑을 제압하면 집주인 사례, 가방을 챙기면 돈
  { key: 'burglar', d: '신당동 주택가', name: '빈집털이',
    start(ev) { const f = districtFront(ev.d, b => b.kind !== 'shop'); if (!f) return false; ev.p = f.p; ev.thief = evPerson(ev, f.p.x + 20, f.p.y - 10, { body: 'pack' }); ev.thief.a = -Math.PI / 2; gsay(ev.thief, '(창문을 비집는다)', 3); return true; },
    focus: ev => ev.loot ? ev.owner : ev.thief,
    update(ev, dt = 1 / 60) { const t = ev.thief, P = S.player;
      if (t.state === 'DEAD') { if (!ev.dropped) { ev.dropped = true; ev.owner = evPerson(ev, ev.p.x - 30, ev.p.y + 10, { body: 'old' }); gsay(ev.owner, '우리 집 도둑이야!', 3); evItem(ev, t.x + 14, t.y + 8, 'bag', 140, () => evLoot(ev, ev.owner, 140, 80, '보따리')); } return; }
      if (!ev.fled && ev.engaged && (dist(t.x, t.y, P.x, P.y) < 130 || S.t - ev.t0 > 70)) { ev.fled = true; gsay(t, '들켰다!', 1.5); evFlee(t, P.x, P.y, 60); }
      if (ev.fled && dist(t.x, t.y, P.x, P.y) > 1700) evEnd(ev, '(빈집털이 놓쳤어.)'); },
    goal: ev => ev.loot ? '보따리를 집주인에게 돌려주거나 챙기기' : ev.dropped ? '떨어진 보따리 줍기' : '빈집털이 잡기 (때려눕히기)' },
  // 신당동 주택가 ② 차 화재: 터지기 전에 갇힌 사람을 끌어낸다
  { key: 'fire', d: '신당동 주택가', name: '차 화재',
    start(ev) { const r = roadSpot(420, 800); if (!r) return false; const v = ev.car = evCar(ev, 'hatch', r.x, r.y, rnd(0, TAU)); v.hp = 1; v.fireHold = true; ev.by = evPerson(ev, r.x + 60, r.y - 50, {}); gsay(ev.by, '사람이 갇혔어요! 누가 좀!', 3.5); return true; },
    focus: ev => ev.car,
    update(ev, dt = 1 / 60) { const v = ev.car, P = S.player;
      if (v.fireHold && dist(P.x, P.y, v.x, v.y) < 240) { v.fireHold = false; v.fireT = Math.min(v.fireT || 0, 0.5); }
      if (v.dead && !ev.done) evEnd(ev, '(늦었어... 차가 터졌다.)'); },
    action(ev) { const v = ev.car, P = S.player; if (P.car || v.dead || dist(P.x, P.y, v.x, v.y) > 75) return null; return { label: '갇힌 사람 끌어내기', at: { x: v.x, y: v.y - 56 }, fn: () => {  // 운전석 문으로 가서 열고 → 붙잡아 끌어낸다 → 바닥에 눕혔다가 일어나 달아난다
      const door = carDoorSpot(v);
      doMotion({ x: door.x, y: door.y, face: Math.atan2(v.y - door.y, v.x - door.x), pose: 'grab', dur: 1.0,
        at: [[0.05, () => { v.doorT = S.t + 0.2; v.doorSide = -1; play('switch', 0.5); }], [0.45, () => { play('cloth', 0.6); play('thud', 0.3); }]],
        end: () => { if (ev.done) return; const P = S.player, g = evPerson(ev, P.x + Math.cos(P.a + Math.PI) * 26, P.y + Math.sin(P.a + Math.PI) * 26, {}); gsay(g, '콜록... 살았다... 고맙습니다!', 2.5); after(0.8, () => evFlee(g, v.x, v.y, 10));
          cash(60); evEnd(ev, '갇힌 사람 구출 · +60만', true); } }); } }; },
    goal: () => '불붙은 차가 터지기 전에 갇힌 사람 구하기' },
  // 중구 관청가 ① 현금 수송차: 들이받아 세우면 돈자루 둘. 수배 3
  { key: 'armored', d: '중구 관청가', name: '현금 수송차',
    start(ev) { const r = roadSpot(600, 1000); if (!r) return false; const v = ev.car = evCar(ev, 'van', r.x, r.y, rnd(0, TAU), { ai: true, driver: true }); v.hpMax = v.hp = 14; v.hue = 200; ev.hp0 = v.hp; return true; },
    focus: ev => ev.car,
    update(ev, dt = 1 / 60) { const v = ev.car, P = S.player;
      if (!ev.hit && v.hp < ev.hp0 && P.car && dist(P.car.x, P.car.y, v.x, v.y) < 160) { ev.hit = true; addWanted(3, '현금 수송차를 습격했다'); }
      if (!ev.stopped && (v.dead || v.hp <= v.hpMax * 0.5)) { ev.stopped = true; v.ai = false; v.v = 0; v.driver = false; v.doorT = S.t + 0.2; v.doorSide = 1;
        for (const s of [-1, 1]) { const g = evPerson(ev, v.x + s * 44, v.y + 30, { kind: 'g1', police: true }); copChase(g); }
        const bx = v.x - Math.cos(v.a) * 60, by = v.y - Math.sin(v.a) * 60; let n = 0;
        for (const k of [-1, 1]) evItem(ev, bx + k * 20, by, 'money', 250, it => { cash(it.val); addRep(ev.d, -3); if (++n === 2) evEnd(ev, '현금 수송차 털이 · +500만'); }); }
      if (!ev.stopped && ev.engaged && dist(v.x, v.y, P.x, P.y) > 2600) evEnd(ev, '(수송차 놓쳤어.)', true); },
    goal: ev => ev.stopped ? '돈자루 챙기기 · 경비가 쏜다' : '현금 수송차를 들이받아 세우기 (수배 3)' },
  // 중구 관청가 ② 시위 행진: 시위대 속에 섞이면 수배가 빨리 풀린다
  { key: 'protest', d: '중구 관청가', name: '시위 행진',
    start(ev) { const r = roadSpot(450, 850); if (!r) return false; const a = Math.random() < 0.5 ? 0 : Math.PI / 2, P = S.player; ev.a = a; ev.crowd = [];
      for (let k = 0; k < 9; k++) { const g = evPerson(ev, r.x + Math.cos(a) * (k % 3) * 26 - Math.sin(a) * ((k / 3) | 0) * 26, r.y + Math.sin(a) * (k % 3) * 26 + Math.cos(a) * ((k / 3) | 0) * 26, {}); ev.crowd.push(g); evGo(g, g.x + Math.cos(a) * 900, g.y + Math.sin(a) * 900); }
      for (let k = 0; k < 2; k++) { const g = spawnCop(true); if (g) evGo(g, r.x, r.y); } return true; },
    focus: ev => { const c = ev.crowd.filter(npcAlive); if (!c.length) return null; return { x: c.reduce((s, g) => s + g.x, 0) / c.length, y: c.reduce((s, g) => s + g.y, 0) / c.length }; },
    update(ev, dt = 1 / 60) { const c = this.focus(ev), P = S.player; if (!c) { evEnd(ev, '(시위는 끝났네.)', true); return; }
      if ((ev.sloganT = (ev.sloganT || 0) - dt) <= 0) { ev.sloganT = 2.2; const g = ev.crowd[(S.t * 3 | 0) % ev.crowd.length]; if (npcAlive(g)) gsay(g, ['물가를 잡아라!', '재개발 반대!', '상인도 사람이다!'][(S.t | 0) % 3], 2); }
      if (S.wanted > 0 && !P.car && dist(P.x, P.y, c.x, c.y) < 170) { S.wantLost = (S.wantLost || 0) + dt * 2.5; S.crowdT = S.t + 0.3; ev.hid = true; }
      if (S.t - ev.t0 > 95) evEnd(ev, ev.hid ? '시위대 속에서 경찰 눈을 피했다' : '시위 행진이 지나갔다', true); },
    goal: () => '시위 행진 · 섞이면 수배가 빨리 풀린다' },
  // 성수 공장지대 ① 즉석 드래그 레이스: 판돈 100만, 직선 결승선까지 먼저
  { key: 'drag', d: '성수 공장지대', name: '즉석 드래그 레이스',
    start(ev) { const r = roadSpot(420, 800); if (!r) return false; const tx = Math.floor(r.x / TILE), ty = Math.floor(r.y / TILE), along = d => [0, 1, 2].every(k => G0[ty + d[1] * k * 8]?.[tx + d[0] * k * 8] === '='), dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(along); if (!dirs.length) return false;
      const d = dirs[(Math.random() * dirs.length) | 0]; ev.a = Math.atan2(d[1], d[0]); ev.start = r; ev.fin = { x: r.x + d[0] * 1000, y: r.y + d[1] * 1000 };
      ev.opp = evCar(ev, 'sport', r.x - Math.sin(ev.a) * 40, r.y + Math.cos(ev.a) * 40, ev.a, { scripted: true }); ev.bettor = evPerson(ev, r.x - Math.cos(ev.a) * 80 + Math.sin(ev.a) * 70, r.y - Math.sin(ev.a) * 80 - Math.cos(ev.a) * 70, {}); gsay(ev.bettor, '한 판 붙을 사람!', 3); return true; },
    focus: ev => ev.race ? ev.fin : ev.start,
    update(ev, dt = 1 / 60) { const P = S.player, o = ev.opp;
      if (ev.race === 'count' && S.t > ev.goT) { ev.race = 'run'; play('bell', 0.5); evBanner('출발!'); }
      if (ev.race === 'run') { o.v = Math.min(500, (o.v || 0) + 290 * dt); o.x += Math.cos(ev.a) * o.v * dt; o.y += Math.sin(ev.a) * o.v * dt; o.a = ev.a;
        const me = P.car && dist(P.x, P.y, ev.fin.x, ev.fin.y) < 130, him = dist(o.x, o.y, ev.fin.x, ev.fin.y) < 60;
        if (me) { cash(200); evEnd(ev, '드래그 레이스 승리 · 200만', true); o.v = 0; }
        else if (him) { o.v = 0; evEnd(ev, '드래그 레이스 패배 · 판돈 날림'); } } },
    action(ev) { const P = S.player; if (ev.race || !P.car || dist(P.x, P.y, ev.start.x, ev.start.y) > 160) return null; return { label: '레이스 참가 · 판돈 100만', at: { x: ev.start.x, y: ev.start.y - 60 }, fn: () => {
      if ((S.cash || 0) < 100) { evBanner('(판돈 100만... 지갑이 얇네.)'); return; } S.cash -= 100; play('loot', 0.5); ev.race = 'count'; ev.goT = S.t + 3; P.car.v = 0; evBanner('3… 2… 1…'); } }; },
    goal: ev => ev.race ? '결승선까지 먼저' : '드래그 레이스 · 차를 몰고 와서 판돈 걸기' },
  // 성수 공장지대 ② 폐공장 도박장: 걸기 · 신고 · 털기
  { key: 'den', d: '성수 공장지대', name: '폐공장 도박장',
    start(ev) { const f = districtFront(ev.d, b => b.kind !== 'shop' || /창고|공장/.test(b.plate || b.name || '')); if (!f) return false; ev.p = f.p; ev.bouncer = evPerson(ev, f.p.x, f.p.y + 16, { body: 'big' }); ev.players = [0, 1, 2].map(k => evPerson(ev, f.p.x + (k - 1) * 30, f.p.y - 14, {})); gsay(ev.bouncer, '판 벌어졌다. 낄 거면 들어와.', 3); return true; },
    focus: ev => ev.p,
    update() {},
    action(ev) { const P = S.player; if (P.car || dist(P.x, P.y, ev.p.x, ev.p.y) > 90) return null; return { label: '폐공장 도박장', at: { x: ev.p.x, y: ev.p.y - 56 }, fn: () => openDen(ev) }; },
    goal: () => '폐공장 도박장 · 걸거나 신고하거나 털기' },
];
function evHelpVendor(ev) { if (ev.done) return; addRep(ev.d, 5);   /* 고르는 칸에 적힌 '평판 +5' */ for (const g of ev.enf) evFlee(g, S.player.x, S.player.y, 20); if (npcAlive(ev.vendor)) gsay(ev.vendor, '고맙수! 다음에 오면 싸게 해 주지.', 3); cash(30); evEnd(ev, '상인 편 · +30만', true); }
function openDen(ev) {
  const show = () => shopPanel('폐공장 도박장', [
    { name: '판돈 50만 걸기 (반반)', price: 50, ok: (S.cash || 0) >= 50, buy: () => { if (ev.done) { closeShopPanel(); return; } S.cash -= 50; const win = Math.random() < 0.48; if (win) cash(100); else play('click', 0.4); evBanner(win ? '땄다! +100만' : '잃었다'); show(); } },
    { name: '경찰에 넘기기', price: null, tag: '+80만', ok: true, buy: () => { closeShopPanel(); if (ev.done) return; cash(80); for (const g of ev.players) evFlee(g, ev.p.x, ev.p.y, 20); for (let k = 0; k < 2; k++) { const g = spawnCop(true); if (g) evGo(g, ev.p.x, ev.p.y); } evEnd(ev, '도박장 신고 · +80만', true); } },
    { name: '판 털기 (수배 2, 평판 -4)', price: null, tag: '+300만', ok: true, buy: () => { closeShopPanel(); if (ev.done) return; cash(300); addWanted(2, '도박장을 털었다'); addRep(ev.d, -4); for (const g of [ev.bouncer, ...ev.players]) evFlee(g, S.player.x, S.player.y, 20); evEnd(ev, '도박장 판돈 털이 · +300만'); } }]);
  show();
}
function closeShopPanel() { const el = document.getElementById('shopPanel'); if (el) { const c = [...el.querySelectorAll('button')].pop(); c && c.click(); } }

// ---------------------------------------------------------------- 관리
function evEnd(ev, msg, good) { if (ev.done) return; ev.done = true; ev.doneT = S.t; S.evNext[ev.d] = S.t + rnd(...EV_GAP); if (msg) evBanner(msg, good ? '#9fe0b0' : '#f2e7c8'); }
function evCleanup(ev) {
  const P = S.player;
  for (const g of ev.actors) if (!g.off && g.state !== 'DEAD' && !(g.state === 'ALERT' && g.fac) && !inView(g.x, g.y, 80)) evGone(g);
  if (S.evItems) S.evItems = S.evItems.filter(i => i.evt !== ev.key);
  for (const v of ev.cars) { v.fireHold = false; if (v.rage) { v.rage = false; v.chase = false; } }
  if (ev.loot && !ev.loot.resolved) {}  // evEnd 전에 처리됨
  S.ev = null;
}
function cityEventsUpdate(dt) {
  if (!STAGE.cityLife || !S.player || S.downing) return;
  const P = S.player; S.evNext = S.evNext || {};
  const ev = S.ev;
  if (ev) {
    const f = ev.def.focus(ev); if (f) { ev.x = f.x; ev.y = f.y; }
    if (!ev.done) {
      if (!ev.engaged && dist(P.x, P.y, ev.x, ev.y) < EV_REACH) { ev.engaged = true; evBanner(ev.def.villain ? `${ev.def.name} — (${ANNOYED[(S.t * 7 | 0) % ANNOYED.length]})` : `${ev.d} · ${ev.def.name}`, '#ffd066'); play('click', 0.4); }
      ev.def.update.call(ev.def, ev, dt);
      evItemsUpdate();
      const L = ev.loot; if (L && !ev.done && S.t > L.until) evKeep(ev);
      if (!ev.done && ((!ev.engaged && S.t - ev.t0 > EV_LIFE) || S.t - ev.t0 > EV_HARD)) evEnd(ev, ev.engaged ? `${ev.def.name} · 끝났다` : null);
    }
    if (ev.done && S.t - ev.doneT > 2) evCleanup(ev);
  } else if (S.wanted < 2 && !P.booth) {
    const n = evDist(P.x, P.y);
    if (n) {
      if (S.evNext[n] == null) S.evNext[n] = S.t + rnd(20, 40);
      if (S.t >= S.evNext[n]) {
        const defs = EVENTS.filter(e => e.d === n || e.d === '*');  /* '*': 어느 구역에서나 (47ze 민폐 인물) */ S.evPick = S.evPick || {}; const k0 = S.evPick[n] || 0; let made = null;
        for (let k = 0; k < defs.length && !made; k++) { const def = defs[(k0 + k) % defs.length], e = { def, key: def.key + ':' + ((S.evSeq = (S.evSeq || 0) + 1)), d: n, t0: S.t, actors: [], cars: [], x: P.x, y: P.y };
          if (def.start(e)) { made = e; S.evPick[n] = (k0 + k + 1) % defs.length; } else { for (const g of e.actors) evGone(g); S.vehicles = S.vehicles.filter(v => !e.cars.includes(v)); } }
        if (made) { S.ev = made; const f = made.def.focus(made); if (f) { made.x = f.x; made.y = f.y; } play('metal', 0.2, 1.4); } else S.evNext[n] = S.t + 15;
      }
    }
  }
  // 평판 낮은 구역: 가까운 행인이 나를 보고 피한다
  if ((S.repT = (S.repT || 0) - dt) <= 0) { S.repT = 1.5; const r = repOf(evDist(P.x, P.y)); if (r <= -30) for (const g of actorsNear(P.x, P.y)) if (g.civ && npcAlive(g) && !g.evt && g.state === 'PATROL' && dist(g.x, g.y, P.x, P.y) < 120 && Math.random() < 0.4) civPanic(g, P.x, P.y, 4); }
}
// 걸어서 지나가면 줍는다
function evItemsUpdate() {
  const P = S.player; if (P.car || !S.evItems?.length) return;
  if (P.trav) return;
  const it = S.evItems.find(it => dist(P.x, P.y, it.x, it.y) < 34); if (!it) return;
  // 쪼그려 앉아 줍는다 (붙어 있는 것들은 한 번에)
  const all = S.evItems.filter(o => dist(o.x, o.y, it.x, it.y) < 48); S.evItems = S.evItems.filter(o => !all.includes(o));
  doMotion({ x: it.x, y: it.y + 6, pose: 'crouch', dur: 0.45, at: [[0.25, () => { play('loot', 0.4); for (const o of all) o.onPick && o.onPick(o); }]] });
}
function eventAction() {
  const ev = S.ev; if (!ev || ev.done) return null; const P = S.player;
  const L = ev.loot; if (L && npcAlive(L.owner) && !P.car && dist(P.x, P.y, L.owner.x, L.owner.y) < 70) return { k: 'evAct', label: `${L.what} 돌려주기`, at: { x: L.owner.x, y: L.owner.y - 56 }, fn: () => shopPanel(`${L.what}`, [
    { name: `주인에게 돌려주기`, price: null, tag: `수고비 ${L.reward}만`, ok: true, buy: () => { closeShopPanel(); if (ev.done) return; const o = L.owner, s = standBy(S.player, o, 26); faceEachOther(o); doMotion({ x: s.x, y: s.y, face: s.face, pose: 'grab', dur: 0.55, at: [[0.2, () => play('cloth', 0.4)]], end: () => evGive(ev) }); } },
    { name: `챙기기 (평판 -3)`, price: null, tag: `+${L.val}만`, ok: true, buy: () => { closeShopPanel(); evKeep(ev); } }]) };
  const a = ev.def.action && ev.def.action(ev); return a ? Object.assign({ k: 'evAct' }, a) : null;
}
function eventGoal(money) { const ev = S.ev; if (!ev || ev.done || !ev.engaged) return null; return { text: `${ev.def.goal(ev)} · ${money}`, where: '', x: ev.x, y: ev.y, fl: 0 }; }
// 그림: 줍는 것 · 이벤트 자리 표시 · 화면 밖이면 가장자리 '!' 화살표 (어둠 위)
function drawEvents() {
  const P = S.player; if (flOf(P) || P.z > 0) return;
  for (const it of S.evItems || []) { if (!inView(it.x, it.y, 30)) continue; const b = .6 + .4 * Math.sin(S.t * 6);
    ctx.fillStyle = `rgba(255,214,110,${0.25 * b})`; ctx.beginPath(); ctx.arc(it.x, it.y, 16, 0, TAU); ctx.fill();
    const col = it.kind === 'box' ? '#a8784a' : it.kind === 'money' ? '#3f6a3a' : it.kind === 'wallet' ? '#2a2420' : '#6a4a2a';
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(it.x - 8, it.y + 2, 18, 6); ctx.fillStyle = col; const w = it.kind === 'wallet' ? 10 : 16, h = it.kind === 'wallet' ? 7 : 12; ctx.fillRect(it.x - w / 2, it.y - h, w, h); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.strokeRect(it.x - w / 2 + .5, it.y - h + .5, w - 1, h - 1);
    if (it.kind === 'money') { ctx.fillStyle = '#e8d070'; ctx.font = '700 9px ' + UI_FONT_FAMILY; ctx.textAlign = 'center'; ctx.fillText('₩', it.x, it.y - 3); } }
  const ev = S.ev; if (!ev || ev.done) return;
  const d = dist(P.x, P.y, ev.x, ev.y); if (d > 1800) return;
  if (inView(ev.x, ev.y, -30)) { if (!ev.engaged) { const b = .55 + .45 * Math.sin(S.t * 7); ctx.fillStyle = `rgba(255,90,70,${b})`; ctx.font = '700 22px ' + UI_FONT_FAMILY; ctx.textAlign = 'center'; ctx.fillText('!', ev.x, ev.y - 52); } return; }
  const [vx, vy, vw, vh] = viewRect(-40 / SCALE), cx = vx + vw / 2, cy = vy + vh / 2, a = Math.atan2(ev.y - cy, ev.x - cx), k = Math.min(Math.abs((vw / 2) / Math.cos(a) || 1e9), Math.abs((vh / 2) / Math.sin(a) || 1e9));
  const ax = cx + Math.cos(a) * k, ay = cy + Math.sin(a) * k, s = 1 / SCALE, b = .6 + .4 * Math.sin(S.t * 6);
  ctx.save(); ctx.translate(ax, ay); ctx.scale(s, s); ctx.fillStyle = `rgba(255,90,70,${0.6 + 0.4 * b})`; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
  ctx.rotate(a); ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(13, -7); ctx.lineTo(13, 7); ctx.closePath(); ctx.fill(); ctx.rotate(-a);
  ctx.fillStyle = '#fff'; ctx.font = '700 16px ' + UI_FONT_FAMILY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 1); ctx.textBaseline = 'alphabetic'; ctx.restore();
}
