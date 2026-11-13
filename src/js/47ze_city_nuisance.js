// ---------------------------------------------------------------- 자유 모드 민폐·위험 인물 (어느 구역에서나 일어나는 사건)
// 한국에서 공분을 사는 유형 넷. 구역 사건(47f)과 같은 틀로 생기고 끝난다. 막아 내면 그 구역 평판과 사례.
//   assault  묻지마 폭행범: 지나가는 행인을 이유 없이 때리고 다닌다. 쓰러뜨리면 시민들이 박수 — 수배 1은 풀린다
//   rage     보복운전: 내 차 뒤에 붙어 쫓아와 들이받는다. 내가 서면 내려서 시비. 차를 부수거나 운전자를 쓰러뜨리면 끝
//   kick     전동킥보드 2인 탑승: 10대 둘이 킥보드 하나로 보도를 질주하며 행인을 치고 그냥 간다. 붙잡으면(쓰러뜨리면) 끝
//   delivery 배달 오토바이 인도 점령 + 주차 빌런: 상가 앞 보도에 오토바이 여러 대, 차도엔 칸을 가로질러 세운 차.
//            오토바이를 하나씩 넘어뜨리거나(옆에서 [오토바이 치우기]) 차로 밀어 치우면 끝. 기사 둘이 와서 따진다
const NUISANCE = [
  { key: 'assault', d: '*', name: '묻지마 폭행',
    start(ev) { const p = offscreenSpot(380, 700); if (!p) return false; const g = ev.g = evPerson(ev, p.x, p.y, { body: 'big' }); g.assailant = true; ev.hits = 0; gsay(g, '...다 짜증나.', 2.5); return true; },
    focus: ev => ev.g,
    update(ev) { const g = ev.g, P = S.player;
      if (!npcAlive(g)) { if (!ev.paid) { ev.paid = true; if (S.wanted === 1) { S.wanted = 0; S.wantLost = 0; } for (const o of actorsNear(g.x, g.y)) if (o.civ && npcAlive(o) && o !== g && dist(o.x, o.y, g.x, g.y) < 300 && o.state !== 'DEAD') gsay(o, ['잡았다!', '고마워요!', '경찰 불러요!'][o.id % 3], 2); cash(80); addRep(ev.d, 6); evEnd(ev, `묻지마 폭행범을 제압했다 · 사례 80만 · 평판 +6`, true); justiceMoment('묻지마 폭행범 제압', `[속보] ${ev.d} 묻지마 폭행범, 시민에게 제압돼… 피해자 ${ev.hits}명 "누군지도 모르는 사람이 막아 줬다"`, g.x, g.y, { thank: '저 사람한테 맞은 게 제 동생이에요... 고맙습니다.' }); } return; }
      if (g.state !== 'PATROL') { if (g.state === 'PANIC' || g.state === 'FLEE') { g.state = 'PATROL'; g.fear = null; g.icon = null; } }   // 겁먹고 도망가지 않는다
      if ((ev.stepT = (ev.stepT || 0) - 1 / 60) <= 0) { ev.stepT = 0.8;
        let tgt = null, bd = 260; for (const o of actorsNear(g.x, g.y)) { if (o === g || !o.civ || !npcAlive(o) || o.evt || o.crew || o.off) continue; const d = dist(o.x, o.y, g.x, g.y); if (d < bd) { bd = d; tgt = o; } }
        if (!P.car && dist(P.x, P.y, g.x, g.y) < 200) tgt = P; ev.tgt = tgt; if (tgt) evGo(g, tgt.x, tgt.y); }
      const t = ev.tgt;
      if (t && t !== P && npcAlive(t) && dist(t.x, t.y, g.x, g.y) < 34 && (ev.hitT || 0) < S.t) { ev.hitT = S.t + 1.5; ev.hits++; g.swingT = 0.35; play('thud', 0.5 * proxVol(g)); npcDown(t, g, false); gsay(g, ['비켜!', '뭘 봐!', '...'][ev.hits % 3], 1.4);
        for (const o of actorsNear(g.x, g.y)) if (o.civ && npcAlive(o) && o !== g && !o.crew && dist(o.x, o.y, g.x, g.y) < 260) civPanic(o, g.x, g.y, 8);
        if (ev.engaged) evBanner(`묻지마 폭행 — 피해자 ${ev.hits}명`, '#ff9a86'); }
      if (t === P && dist(P.x, P.y, g.x, g.y) < 36 && (ev.hitT || 0) < S.t) { ev.hitT = S.t + 1.6; g.swingT = 0.35; hurtPlayer(g, '묻지마 폭행범에게 맞았다'); }
      if (ev.engaged && dist(g.x, g.y, P.x, P.y) > 1500) evEnd(ev, '폭행범이 골목으로 사라졌다'); },
    goal: ev => `묻지마 폭행범 제압하기 (피해자 ${ev.hits || 0}명)` },

  { key: 'rage', d: '*', name: '보복운전',
    start(ev) { const P = S.player; if (!P.car || Math.abs(P.car.v) < 60) return false; const v = rageCar(); if (!v) return false;
      ev.car = v; ev.cars.push(v); v.rage = ev; ev.t1 = S.t; return true; },
    focus: ev => ev.out || ev.car,
    update(ev) { const v = ev.car, P = S.player, d = ev.out || v;
      if (!ev.honked && ev.engaged) { ev.honked = true; evBanner('보복운전 — 뒤에서 상향등을 번쩍이며 붙는다', '#ff9a86'); play('metal', 0.5, 2.2); }
      if (v.dead || ev.out && !npcAlive(ev.out)) { if (!ev.paid) { ev.paid = true; cash(100); addRep(ev.d, 4); evEnd(ev, '보복운전자를 막았다 · 사례 100만', true); justiceMoment('보복운전 응징', `[속보] 도심서 보복운전하던 SUV 운전자, 되레 당해… 블랙박스 영상 "사이다" 반응`, d.x, d.y, { thank: false }); } return; }
      if (ev.out) { const g = ev.out; if (g.state === 'PANIC' || g.state === 'FLEE') { g.state = 'PATROL'; g.fear = null; } if (!P.car) evGo(g, P.x, P.y);
        if (!P.car && dist(P.x, P.y, g.x, g.y) < 38 && (ev.hitT || 0) < S.t) { ev.hitT = S.t + 1.8; g.swingT = 0.35; gsay(g, ['내려! 내리라고!', '운전 똑바로 해!', '죽고 싶어?'][(S.t | 0) % 3], 2); hurtPlayer(g, '보복운전자에게 맞았다'); } }
      if (dist(d.x, d.y, P.x, P.y) > 1700 || S.t - ev.t1 > 120) evEnd(ev, '보복운전자를 따돌렸다'); },
    goal: ev => ev.out ? '내려서 시비 거는 운전자 제압하기' : '뒤에 붙은 보복운전 차 — 부수거나 따돌리기' },

  { key: 'kick', d: '*', name: '킥보드 2인 질주',
    start(ev) { const c = crewSpawn('kick'); if (!c) return false; ev.crew = c; for (const m of c.members) { m.evt = ev.key; ev.actors.push(m); } gsay(c.members[0], '꽉 잡아!', 2); ev.hits = 0; return true; },
    focus: ev => ev.crew.members[0],
    update(ev) { const c = ev.crew, P = S.player;
      if (c.members.some(m => !npcAlive(m))) { if (!ev.paid) { ev.paid = true; cash(60); addRep(ev.d, 5); evEnd(ev, '킥보드 폭주를 멈췄다 · 사례 60만', true); const L = c.members[0]; justiceMoment('인도 질주 킥보드 정지', `[속보] 2인 탑승 킥보드 인도 질주하다 멈춰 세워져… 치인 행인 ${ev.hits}명, 보호자 호출`, L.x, L.y, { thank: '아까 저 킥보드에 우리 애가 치일 뻔했어요!' }); } return; }
      if (c.broken) { if (dist(c.members[0].x, c.members[0].y, P.x, P.y) > 1400) evEnd(ev, '킥보드가 달아났다'); return; }
      // 보도를 질주하며 앞에 있는 행인을 치고 지나간다 (뺑소니)
      const L = c.members[0];
      for (const o of actorsNear(L.x, L.y)) { if (!o.civ || o.crew || o.evt || !npcAlive(o) || o.off || dist(o.x, o.y, L.x, L.y) > 22) continue; npcDown(o, null, false); ev.hits++; play('thud', 0.4 * proxVol(o)); gsay(L, ['아 죄송~', '비켜요!', 'ㅋㅋ 가자'][ev.hits % 3], 1.6); for (const k of actorsNear(o.x, o.y)) if (k.civ && npcAlive(k) && !k.crew && dist(k.x, k.y, o.x, o.y) < 200) civPanic(k, o.x, o.y, 6); }
      if (!P.car && dist(P.x, P.y, L.x, L.y) < 140 && !ev.boost) { ev.boost = true; c.slow = 1.25; gsay(L, '튀어!', 1.4); }
      if (ev.engaged && dist(L.x, L.y, P.x, P.y) > 1800) evEnd(ev, '킥보드가 사라졌다'); },
    goal: ev => `보도 질주 킥보드 멈추기 (친 사람 ${ev.hits || 0}명)` },

  { key: 'delivery', d: '*', name: '인도 점령·주차 빌런',
    start(ev) { const f = districtFront(ev.d, b => b.kind === 'shop', 380, 900); if (!f) return false;
      ev.bikes = []; for (let i = 0; i < 6; i++) ev.bikes.push({ x: f.p.x - 110 + i * 44, y: f.p.y + 18, a: Math.PI / 2 + (i % 2 ? .12 : -.12), up: true });
      const r = roadNear(f.p.x, f.p.y + 120, 6); if (r) { const v = ev.car = evCar(ev, 'luxury', r.x, r.y, Math.PI / 4); v.locked = true; v.villain = true; }
      ev.riders = [evPerson(ev, f.p.x + 160, f.p.y + 30, { outfit: 'courier' }), evPerson(ev, f.p.x + 190, f.p.y + 40, { outfit: 'courier' })];
      gsay(ev.riders[0], '콜 하나만 더 받고 뺄게요~', 3); return true; },
    focus: ev => ev.bikes.find(b => b.up) || ev.bikes[0],
    update(ev) { const P = S.player, up = ev.bikes.filter(b => b.up);
      if (P.car && Math.abs(P.car.v) > 60) for (const b of up) if (dist(P.car.x, P.car.y, b.x, b.y) < 46) bikeDown(ev, b, true);
      if (!up.length && !ev.done) { const bonus = ev.car && ev.car.dead ? 40 : 0; cash(50 + bonus); addRep(ev.d, 5 + (bonus ? 2 : 0)); evEnd(ev, `인도를 비웠다 · 사례 ${50 + bonus}만${bonus ? ' · 주차 빌런 차까지' : ''}`, true); justiceMoment(bonus ? '인도 점령·주차 빌런 정리' : '인도 점령 정리', `[속보] ${ev.d} 상가 앞 인도 점령 오토바이 일제히 치워져… 주민들 "이제야 유모차가 지나간다"${bonus ? ' · 칸 가로질러 세운 고급 세단도 박살' : ''}`, ev.x, ev.y, { thank: '휠체어로 맨날 돌아갔는데... 고마워요.' }); return; }
      // 기사들이 와서 따진다
      for (const g of ev.riders) { if (!npcAlive(g)) continue; if (ev.angry && !P.car) { if (g.state === 'PANIC' || g.state === 'FLEE') g.state = 'PATROL'; evGo(g, P.x, P.y); if (dist(P.x, P.y, g.x, g.y) < 40 && (g.shoveT || 0) < S.t) { g.shoveT = S.t + 2.4; gsay(g, ['왜 남의 오토바이를!', '배달 늦으면 책임질 거예요?'][g.id % 2], 2); const a = Math.atan2(P.y - g.y, P.x - g.x); P.x += Math.cos(a) * 20; P.y += Math.sin(a) * 20; collide(P, 13, groundSolidP); play('thud', 0.35); } } }
      if (ev.engaged && dist(ev.x, ev.y, P.x, P.y) > 1500) evEnd(ev, '그냥 지나쳤다'); },
    action(ev) { const P = S.player; if (P.car) return null; const b = ev.bikes.find(b => b.up && dist(P.x, P.y, b.x, b.y) < 50); if (!b) return null;
      return { label: `오토바이 치우기 (${ev.bikes.filter(b => b.up).length})`, at: { x: b.x, y: b.y - 50 }, fn: () => doMotion({ x: b.x - 26, y: b.y, face: 0, pose: 'grab', dur: 0.6, end: () => bikeDown(ev, b, false) }) }; },
    goal: ev => `인도 점령 배달 오토바이 치우기 (${ev.bikes.filter(b => b.up).length}대 남음)${ev.car && !ev.car.dead ? ' · 칸 가로지른 빌런 차' : ''}` },

  // 몰카범: 횡단보도 앞에서 치마 밑을 찍다가 눈이 마주치면 달아난다. 쓰러뜨리면 휴대폰이 떨어지고, 주워서 증거를 챙기면 끝
  { key: 'molka', d: '*', name: '불법 촬영범',
    start(ev) { const p = offscreenSpot(380, 700); if (!p) return false; ev.g = evPerson(ev, p.x, p.y, {}); ev.v = evPerson(ev, p.x + 26, p.y - 4, { body: 'fLong' }); gsay(ev.g, '(휴대폰을 낮게 든다)', 3); return true; },
    focus: ev => ev.g,
    update(ev) { const g = ev.g, P = S.player;
      if (!npcAlive(g)) { if (!ev.dropped) { ev.dropped = true; evItem(ev, g.x + 14, g.y + 8, 'phone', 0, () => { cash(50); addRep(ev.d, 5); evEnd(ev, '불법 촬영 휴대폰 확보 · 사례 50만', true); justiceMoment('불법 촬영범 검거', `[속보] ${ev.d} 횡단보도 불법 촬영범, 달아나다 붙잡혀… 휴대폰서 수백 장 나와`, g.x, g.y, { thank: '저 사람이 찍고 있었던 거예요? ...고맙습니다.' }); }); } return; }
      if (ev.engaged && !ev.fled && dist(g.x, g.y, P.x, P.y) < 220) { ev.fled = true; gsay(g, '아, 아무것도 아니에요!', 1.6); evFlee(g, P.x, P.y, 60); if (npcAlive(ev.v)) gsay(ev.v, '방금 찍었어요?!', 2); }
      if (g.state === 'PATROL' && ev.fled) evFlee(g, P.x, P.y, 60);
      if (ev.fled && dist(g.x, g.y, P.x, P.y) > 1500) evEnd(ev, '불법 촬영범이 달아났다'); },
    goal: ev => ev.dropped ? '떨어진 휴대폰 줍기 (증거)' : '불법 촬영범 잡기 — 달아난다' },
  // 스토커: 퇴근길 여성을 몇 걸음 뒤에서 계속 따라간다. 쓰러뜨리면 끝 (그녀가 고맙다고 한다)
  { key: 'stalker', d: '*', name: '스토킹',
    start(ev) { const p = offscreenSpot(380, 700); if (!p) return false; ev.v = evPerson(ev, p.x, p.y, { body: 'fBob' }); ev.g = evPerson(ev, p.x - 70, p.y + 6, { body: 'big' }); const a = rnd(0, TAU); evGo(ev.v, p.x + Math.cos(a) * 900, p.y + Math.sin(a) * 900); gsay(ev.v, '(자꾸 뒤를 돌아본다)', 3); return true; },
    focus: ev => ev.g,
    update(ev) { const g = ev.g, v = ev.v, P = S.player;
      if (!npcAlive(g)) { if (!ev.paid) { ev.paid = true; cash(60); addRep(ev.d, 6); evEnd(ev, '스토커를 떼어 냈다 · 사례 60만', true); justiceMoment('스토커 제압', `[속보] 접근금지 어기고 퇴근길 따라붙던 스토커, 길에서 제압돼… 피해자 "이제 집에 갈 수 있다"`, g.x, g.y, { thank: false }); if (npcAlive(v)) after(1.5, () => gsay(v, '석 달째였어요... 정말 고맙습니다.', 3)); } return; }
      if (npcAlive(v) && g.state === 'PATROL' && (ev.stepT = (ev.stepT || 0) - 1 / 60) <= 0) { ev.stepT = 0.6; const a = Math.atan2(g.y - v.y, g.x - v.x); evGo(g, v.x + Math.cos(a) * 60, v.y + Math.sin(a) * 60); }
      if (ev.engaged && dist(g.x, g.y, P.x, P.y) < 60 && !ev.warned) { ev.warned = true; gsay(g, '당신이 뭔데 상관이야.', 2); }
      if (ev.engaged && dist(g.x, g.y, P.x, P.y) > 1500) evEnd(ev, '둘 다 시야에서 사라졌다'); },
    goal: () => '퇴근길 여성을 따라붙는 스토커 떼어 내기' },
  // 진상 손님: 편의점 앞에서 알바생에게 반말·폭언, 물건을 집어 던진다. 쓰러뜨리거나 밀어내면 끝
  { key: 'gapjil', d: '*', name: '진상 손님',
    start(ev) { const f = districtFront(ev.d, b => b.kind === 'shop', 380, 900); if (!f) return false; ev.clerk = evPerson(ev, f.p.x, f.p.y + 8, { outfit: 'staff' }); ev.g = evPerson(ev, f.p.x + 34, f.p.y + 18, { body: 'big' }); gsay(ev.g, '야! 내가 누군 줄 알아? 사장 나오라 그래!', 3); return true; },
    focus: ev => ev.g,
    update(ev) { const g = ev.g, c = ev.clerk, P = S.player;
      if (!npcAlive(g)) { if (!ev.paid) { ev.paid = true; cash(40); addRep(ev.d, 5); evEnd(ev, '진상 손님 정리 · 사례 40만', true); justiceMoment('진상 손님 참교육', `[속보] 편의점 알바생에 폭언·물건 투척한 손님, 지나가던 시민에게 제압… 영상 조회수 폭발`, g.x, g.y, { thank: '알바 3년 만에 처음 웃네요. 고맙습니다.' }); } return; }
      if (npcAlive(c) && g.state === 'PATROL' && (ev.yellT = (ev.yellT || 0) - 1 / 60) <= 0) { ev.yellT = 3; gsay(g, ['반말? 너 몇 살이야!', '이거 환불해! 먹던 거라도!', '카드 안 받아? 장사 접어!'][(S.t | 0) % 3], 2.4); g.swingT = 0.3; play('thud', 0.3 * proxVol(g)); if (Math.random() < 0.4) gsay(c, '...죄송합니다.', 1.6); }
      if (ev.engaged && dist(g.x, g.y, P.x, P.y) > 1500) evEnd(ev, '진상 손님이 씩씩대며 떠났다'); },
    goal: () => '편의점 알바생에게 행패 부리는 진상 손님 정리하기' },
  // 전세사기 바지사장: 세입자 보증금이 든 가방을 들고 차로 뛴다. 차에 타기 전에 쓰러뜨리면 가방 — 세입자에게 돌려줄지(평판) 챙길지
  { key: 'jeonse', d: '*', name: '전세사기 바지사장',
    start(ev) { const f = districtFront(ev.d, b => b.kind !== 'shop', 380, 900); if (!f) return false; ev.g = evPerson(ev, f.p.x, f.p.y + 10, { body: 'pack' }); ev.tenant = evPerson(ev, f.p.x - 60, f.p.y + 20, {});
      const r = roadNear(f.p.x + 400, f.p.y + 120, 8); ev.to = r || { x: f.p.x + 500, y: f.p.y + 150 }; evGo(ev.g, ev.to.x, ev.to.y); gsay(ev.tenant, '저 사람이에요! 보증금 들고 튀어요!', 3); ev.t1 = S.t; return true; },
    focus: ev => ev.loot ? ev.tenant : ev.g,
    update(ev) { const g = ev.g, P = S.player;
      if (!npcAlive(g)) { if (!ev.dropped) { ev.dropped = true; evItem(ev, g.x + 14, g.y + 8, 'bag', 300, () => evLoot(ev, ev.tenant, 300, 120, '보증금 가방')); } return; }
      if (ev.loot) return;
      if (g.state === 'PANIC' || g.state === 'FLEE') { g.state = 'PATROL'; evGo(g, ev.to.x, ev.to.y); }
      if (dist(g.x, g.y, ev.to.x, ev.to.y) < 50 || S.t - ev.t1 > 70) { evGone(g); evEnd(ev, '바지사장이 차를 타고 사라졌다'); } },
    onGive: ev => justiceMoment('보증금 되찾아 줌', `[속보] 전세사기 바지사장, 보증금 들고 달아나다 길에서 제압… 세입자 "돈 돌아올 줄 몰랐다"`, ev.tenant ? ev.tenant.x : S.player.x, ev.tenant ? ev.tenant.y : S.player.y, { thank: false }),
    goal: ev => ev.loot ? '보증금 가방 — 세입자에게 돌려주기 또는 챙기기' : ev.dropped ? '떨어진 가방 줍기' : '보증금 들고 튀는 바지사장 막기' },
];
EVENTS.push(...NUISANCE);
function bikeDown(ev, b, byCar) { if (!b.up) return; b.up = false; b.fallA = b.a + (Math.random() < .5 ? 1.3 : -1.3); play(byCar ? 'metal' : 'thud', 0.5); ev.angry = true; fstat('bikesDown'); }
// 보복운전 차: 경찰차처럼 차로 위에 세워 나를 쫓는다 (화면 밖 500~1100px)
function rageCar() {
  const P = S.player, RX = STAGE.roadsX, RY = STAGE.roadsY, vw = W / SCALE / 2 + 80, vh = H / SCALE / 2 + 80, c = [];
  for (const hor of [true, false]) for (const road of hor ? RY : RX) for (const d of hor ? [0, 2] : [1, 3]) {
    const lane = laneOf(road, d); if (Math.abs(lane - (hor ? P.y : P.x)) > 1000) continue;
    for (const back of [600, 800, 1000]) { const sg = DV[d][0] + DV[d][1], along = (hor ? P.x : P.y) - sg * back, x = hor ? along : lane, y = hor ? lane : along;  /* 나를 향해 달리는 차로, 내 뒤쪽 */
      if (!inMap(Math.floor(x / TILE), Math.floor(y / TILE)) || (Math.abs(x - cam.x) < vw && Math.abs(y - cam.y) < vh)) continue;
      if ((hor ? RX : RY).some(r => (hor ? x : y) > r * TILE - 60 && (hor ? x : y) < (r + 4) * TILE + 60)) continue;
      if (deckSpawnZ(x, y) !== 0) continue; c.push({ x, y, d }); } }
  if (!c.length) return null; const o = c[(Math.random() * c.length) | 0];
  const v = makeVehicle({ type: 'suv', x: o.x, y: o.y, d: o.d, a: Math.atan2(DV[o.d][1], DV[o.d][0]), v: AI_SPD, ai: true, driver: true, chase: true }); planTurn(v); S.vehicles.push(v); return v;
}
// 보복운전 차가 내 곁에 서면: 운전자가 내린다 (47_city copCarArrive에서 부른다)
function rageArrive(v, dt) {
  const ev = v.rage; v.v = Math.max(0, v.v - CAR_BRAKE * dt); if (v.v > 5) { v.x += Math.cos(v.a) * v.v * dt; v.y += Math.sin(v.a) * v.v * dt; return true; }
  v.chase = false; v.ai = false; v.parked = true; v.driver = false;
  if (ev && !ev.out && !ev.done) { const a = v.a - Math.PI / 2; ev.out = evPerson(ev, v.x + Math.cos(a) * 46, v.y + Math.sin(a) * 46, { body: 'big' }); gsay(ev.out, '야! 내려! 깜빡이 안 켜?', 2.5); play('switch', 0.5); }
  return true;
}
// 배달 오토바이 (보도 위, 사람보다 먼저)
function drawNuisance() {
  const ev = S.ev; if (!ev || !ev.bikes) return;
  for (const b of ev.bikes) { if (!inView(b.x, b.y, 40)) continue; const a = b.up ? b.a : b.fallA;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a); ctx.fillStyle = '#0d0f13'; ctx.fillRect(-15, -4, 7, 8); ctx.fillRect(9, -4, 7, 8);
    ctx.fillStyle = b.up ? '#c9372c' : '#7b2a24'; ctx.fillRect(-10, -5, 20, 10); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(-12, -7, 9, 14); ctx.fillStyle = '#20242c'; ctx.fillRect(6, -6, 3, 12); ctx.restore(); }
}
