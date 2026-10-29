// ---------------------------------------------------------------- 세력: 의뢰 조직(A) · 라이벌 건달파(B) · 주민
// 두 조직은 서로 적이다. 마주치면 시비가 붙고(가끔 싸움), '전쟁'이 나면 보는 즉시 싸운다.
// 전쟁은 내가 일으킬 수 있다: 한쪽 옷을 입고 다른 쪽 조직원을 치는 걸 그쪽이 보면 / 싸움에 진 쪽 동료가 시체를 찾으면.
// 조직원은 주민도 해친다: ① 자기들 범행(싸움)을 본 주민을 쫓아가 입막음 ② 자기 구역(출입 금지)에 들어온 주민을 때려 눕힘 ③ 싸움에 휘말림.
// 조직이 해친 주민은 내 감점이 아니다 — 대신 소란이 커져 사람들 눈이 그쪽으로 쏠린다.
OUTFITS.rival = '건달파 점퍼';
OUTFIT_PAL.rival = ['#dba57e', '#141414', '#b3262a', '#1a1a1e', '#e8e8e2']; PR_PAL.rival = OUTFIT_PAL.rival;  // 빨간 점퍼 · 흰 운동화 — 의뢰 조직과 한눈에 갈린다
const FAC_NAME = { A: '조직', B: '건달파' };
const TAUNT = ['어이, 여기가 어디라고 기어 와?', '건달 새끼들이 왜 여기 있어.', '눈 깔아라.', '한판 붙자는 거냐?'];
const TAUNT_B = ['너네 구역이 언제부터 여기였냐?', '어깨 펴고 다니네?', '오늘 좀 맞아 볼래?', '비켜, 우리 길이다.'];
const npcAlive = o => o && o.state !== 'DEAD' && o.state !== 'CAPTIVE' && !o.yank && !o.doomed;
// 라이벌 배치: 구역이 있는 판(의뢰 2~5)에 셋이 한 무리로 거리를 돈다. STAGE.rivals = 0 이면 없음, 숫자면 그만큼
function factionsInit() {
  S.war = false; S.facOn = !!STAGE.zones && !STAGE.tutorial;
  for (const g of S.guards) if (!g.civ && !g.dog) g.fac = 'A';
  if (!S.facOn) return;
  const n = STAGE.rivals != null ? STAGE.rivals : 3; if (!n) return;
  const P = S.player, pub = [];
  for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < MW - 1; tx++) if (!solidAt(tx, ty) && bldAt(tx, ty) < 0 && zoneAt(tc(tx), tc(ty), 0) === Z_PUB) pub.push([tx, ty]);
  if (pub.length < 30) return;
  const far = pub.filter(([x, y]) => dist(tc(x), tc(y), P.x, P.y) > 650); if (!far.length) return;
  const pick = (arr, k) => arr[(k * 7919 + S.guards.length * 31) % arr.length];
  const a = pick(far, 1), wps = [a];
  for (let k = 2; wps.length < 3 && k < 40; k++) { const c = pick(pub, k * 13); if (wps.every(w => Math.hypot(w[0] - c[0], w[1] - c[1]) > 8)) wps.push(c); }
  for (let i = 0; i < n; i++) {
    const off = [[0, 0], [1, 0], [0, 1], [-1, 0]][i % 4], sx = a[0] + off[0], sy = a[1] + off[1], st = solidAt(sx, sy) ? a : [sx, sy];
    const g = makeGuard({ kind: i === 0 ? 'g2' : 'g1', at: st, route: wps.map((w, j) => [w[0] + (j ? off[0] : 0), w[1], 4 + i]), radio: false }, S.guards.length);
    g.fac = 'B'; g.outfit = 'rival'; g.rival = true; g.radio = false; g.torch = false; g.x = tc(st[0]); g.y = tc(st[1]);
    setLayer(0); buildRouteLine(g); S.guards.push(g);
  }
}
const aFits = o => !!o && o !== 'rival' && S.guards.some(g => g.fac === 'A' && outfitOf(g) === o);  // 이 옷이 의뢰 조직 옷인가
function startBrawl(a, b, why) {
  if (!npcAlive(a) || !npcAlive(b) || a.brawl || a.target || b.target) return;
  a.brawl = { o: b, cd: rnd(0.2, 0.6) }; if (!b.brawl && !b.civ) b.brawl = { o: a, cd: rnd(0.5, 0.9) };
  a.state = a.state === 'ALERT' ? a.state : 'PATROL'; a.path = null; a.chat = null; a.say = null;
  S.stats.fights = (S.stats.fights || 0) + 1; noise(a.x, a.y, 220, 'fight', flOf(a));
  gsay(a, why || (a.fac === 'B' ? TAUNT_B : TAUNT)[(a.id + S.stats.fights) % 4], 1.8);
  for (const c of S.guards) if (c.civ && npcAlive(c) && !c.child && flOf(c) === flOf(a) && dist(c.x, c.y, a.x, a.y) < 260) civPanic(c, a.x, a.y, 7);
  const P = S.player; if (dist(P.x, P.y, a.x, a.y) < 700) { toast(b.civ ? '조직원이 주민을 때린다' : `${FAC_NAME[a.fac]}와 ${FAC_NAME[b.fac]}가 붙었다 — 시선이 그쪽으로 쏠린다`, 2.4, 'warn'); hint('fight', '조직끼리 싸우는 동안은 서로만 본다. 한쪽 옷을 입고 다른 쪽을 치면 전쟁이 난다 — 그 틈을 노려라'); }
}
function civPanic(c, x, y, t) { if (!npcAlive(c) || c.child && c.treatT > 0) return; c.state = 'PANIC'; c.fear = { x, y }; c.panicT = t; c.cowered = false; c.path = null; c.chat = null; setIcon(c, '!'); }
function declareWar(why) {
  if (S.war) return; S.war = true; S.stats.war = 1;
  toast(why || '두 조직 사이에 전쟁이 났다 — 마주치면 바로 싸운다', 3, 'warn'); play('alert', 0.35);
}
// 조직원이 쓰러뜨린 사람 (내 통계와 따로): 처치 또는 기절. 기절한 조직원은 25초 뒤 깨어난다
function npcDown(o, by, lethal) {
  if (!npcAlive(o) || o.child) return;
  o.state = 'DEAD'; o.icon = null; o.path = null; o.say = null; o.brawl = null; o.hunt = null; o.moving = false;
  play(lethal ? 'kill' : 'thud', 0.5 * proxVol(o)); noise(o.x, o.y, 90, 'fight', flOf(o));
  const c = { fl: flOf(o), ch: charOf(o), g: o, ko: !lethal, byNpc: true, by: by && by.fac, fac: o.fac, civ: !!o.civ, outfit: outfitOf(o), tag: o.tag, x: o.x, y: o.y, a: o.a, kind: o.kind, hidden: false, discovered: false, carried: false, stashed: false, light: lightAt(o.x, o.y), t0: S.t };
  S.corpses.push(c); S.stats.npcDown = (S.stats.npcDown || 0) + 1; if (o.civ) S.stats.npcCiv = (S.stats.npcCiv || 0) + 1;
  if (S.fuseGuard === o) S.fuseGuard = null;
  if (o.hasKey) { const k = o.hasKey; o.hasKey = null; S.keyDrop = { x: c.x + 14, y: c.y + 10, key: k, fl: c.fl || 0 }; }
  if (!lethal && !o.civ) after(25, () => { const i = S.corpses.indexOf(c); if (i < 0 || c.carried || c.stashed || !c.ko) return; S.corpses.splice(i, 1); o.state = 'PATROL'; o.x = c.x; o.y = c.y; o.meter = 0.3; o.path = null; gsay(o, '으… 어디 갔어, 그 새끼들.'); });
  // 범행을 본 주민: 이긴 쪽이 쫓아가 입을 막는다
  if (by && !by.civ && npcAlive(by)) {
    const w = S.guards.filter(q => q.civ && npcAlive(q) && !q.child && flOf(q) === flOf(o) && dist(q.x, q.y, o.x, o.y) < 300 && ((q.state === 'PANIC' && q.fear && dist(q.fear.x, q.fear.y, o.x, o.y) < 220) || canSee(q, o.x, o.y, Math.max(0.4, lightAt(o.x, o.y)), false, false, 0) > 0))
      .sort((p, q) => dist(p.x, p.y, by.x, by.y) - dist(q.x, q.y, by.x, by.y))[0];
    if (w) { by.hunt = { c: w, t0: S.t }; civPanic(w, by.x, by.y, 14); gsay(by, ['본 놈 있네. 거기 서!', '너 봤지? 이리 와.', '입 다물게 해 줄게.'][by.id % 3], 2);
      if (dist(S.player.x, S.player.y, w.x, w.y) < 700) toast('조직원이 본 사람을 쫓는다', 2); }
  }
}
// 내가 쓰러뜨린 조직원: 옷으로 누구 짓인지 착각하게 만들 수 있다 (한쪽 옷을 입고 다른 쪽을 쳤는데 그쪽 조직원이 봤으면 전쟁)
function facWitness(victim) {
  if (!S.facOn || !victim || !victim.fac) return;
  const P = S.player, ow = disguised() ? P.outfit : null;
  const blamed = victim.fac === 'B' && aFits(ow) ? 'A' : victim.fac === 'A' && ow === 'rival' ? 'B' : null; if (!blamed) return;
  const seen = S.guards.some(o => o !== victim && o.fac === victim.fac && npcAlive(o) && flOf(o) === flOf(P) && dist(o.x, o.y, P.x, P.y) < 450 && canSee(o, P.x, P.y, Math.max(0.35, P.light || 0), false, false, P.z) > 0);
  if (seen) declareWar(victim.fac === 'B' ? '건달파가 조직 짓으로 안다 — 전쟁이 났다' : '조직이 건달파 짓으로 안다 — 전쟁이 났다');
}
// 매 프레임 (updateGuard 맨 앞): 싸움·입막음·구역 단속이 평소 행동보다 먼저. true 면 이번 프레임은 이걸로 끝
function updateFaction(g, dt) {
  if (!S.facOn || g.civ || g.dog || g.target || g.child || g.climb || g.x < 0 || g.y < 0 || g.fac === 'P') return false;  // 지도 밖(시험용으로 치워 둔 사람)은 세력 행동 없음
  if (g.state === 'ALERT' || g.state === 'TERROR' || g.state === 'FLEE') { g.brawl = null; g.hunt = null; return false; }
  if (g.brawl) return brawlStep(g, dt);
  if (g.hunt) return huntStep(g, dt);
  if ((g.facT = (g.facT || 0) - dt) > 0) return false; g.facT = 0.4;
  const P = S.player;
  for (const o of S.guards) {
    if (!o.fac || o.fac === g.fac || o.fac === 'P' || o.x < 0 || o.y < 0 || !npcAlive(o) || o.target || flOf(o) !== flOf(g) || (o.z || 0) !== (g.z || 0)) continue;
    const d = dist(g.x, g.y, o.x, o.y); if (d > (S.war ? 280 : 150) || !los(g.x, g.y, o.x, o.y)) continue;
    // 적진(hos) 안에 들어온 건달은 바로 친다 · 전쟁 중이면 보는 즉시 · 평소엔 시비 (가끔 붙는다)
    const inHos = g.fac === 'A' && STAGE.zones && zoneAt(o.x, o.y, o.z) === Z_HOS;
    if (S.war || inHos || o.brawl) { startBrawl(g, o); return true; }
    if (!g.tauntT || S.t - g.tauntT > 14) { g.tauntT = S.t; o.tauntT = S.t; g.want = Math.atan2(o.y - g.y, o.x - g.x); gsay(g, (g.fac === 'B' ? TAUNT_B : TAUNT)[g.id % 4], 2.2);
      if (Math.random() < 0.3) { startBrawl(g, o); return true; } }
  }
  // 건달 점퍼를 입은 나: 조직원이 가까이서 보면 시비, 전쟁 중이면 덤빈다
  if (g.fac === 'A' && disguised() && P.outfit === 'rival' && flOf(P) === flOf(g) && dist(P.x, P.y, g.x, g.y) < 160 && g.seen) {
    if (S.war) { goAlert(g); return false; }
    if (!g.tauntP || S.t - g.tauntP > 10) { g.tauntP = S.t; gsay(g, '건달이 여기 왜 왔어? 꺼져.', 2.2); }
  }
  // 자기 구역(출입 금지·적진)에 들어온 주민: 나가라고 하고, 그래도 있으면 때려 눕힌다
  if (g.fac === 'A' && STAGE.zones) for (const c of S.guards) {
    if (!c.civ || c.child || !npcAlive(c) || c.outfit || c.enforcer || flOf(c) !== flOf(g) || dist(c.x, c.y, g.x, g.y) > 170 || zoneAt(c.x, c.y, 0) === Z_PUB || !los(g.x, g.y, c.x, c.y)) continue;
    if (!c.shooT) { c.shooT = S.t; gsay(g, '여기 들어오지 말라 했지!', 2); continue; }
    if (S.t - c.shooT > 4) { g.hunt = { c, t0: S.t, beat: true }; civPanic(c, g.x, g.y, 6); return true; }
  }
  return false;
}
function closeIn(g, o, dt, spd) {
  const d = dist(g.x, g.y, o.x, o.y);
  if (d > 30) { if (!g.path || (g.repathF = (g.repathF || 0) - dt) <= 0) { g.repathF = 0.5; pathTo(g, o.x, o.y); } moveAlong(g, spd * spdMul(), dt); g.moving = true; }
  else { g.moving = false; g.path = null; }
  g.a += clamp(angDiff(g.a, Math.atan2(o.y - g.y, o.x - g.x)), -8 * dt, 8 * dt); g.want = g.a;
  return d;
}
function brawlStep(g, dt) {
  const b = g.brawl, o = b.o;
  if (!npcAlive(o) || flOf(o) !== flOf(g)) { g.brawl = null; g.state = 'RETURN'; g.path = null; return false; }
  if (g.swingT > 0) g.swingT -= dt;
  const d = closeIn(g, o, dt, SPD.gAlert * 0.95);
  if (d > 600) { g.brawl = null; g.state = 'RETURN'; return false; }
  if (d <= 34 && (b.cd -= dt) <= 0) {
    b.cd = rnd(0.8, 1.3); g.swingT = 0.3; play('thud', 0.3 * proxVol(g)); noise(g.x, g.y, 140, 'fight', flOf(g));
    if (Math.random() < 0.55) { o.fhp = (o.fhp == null ? 3 : o.fhp) - 1; o.startle = { a: Math.atan2(g.y - o.y, g.x - o.x) }; if (o.fhp <= 0) { npcDown(o, g, Math.random() < (o.civ ? 0.5 : 0.4)); g.brawl = null; g.state = 'RETURN'; g.path = null; return true; } }
    // 싸움에 휘말리는 주민
    for (const c of S.guards) if (c.civ && npcAlive(c) && !c.child && dist(c.x, c.y, o.x, o.y) < 48 && Math.random() < 0.18) { npcDown(c, g, Math.random() < 0.3); if (dist(S.player.x, S.player.y, c.x, c.y) < 700) toast('지나가던 주민이 싸움에 휘말렸다', 2); }
  }
  return true;
}
function huntStep(g, dt) {
  const h = g.hunt, c = h.c;
  if (!npcAlive(c) || S.t - h.t0 > 16 || flOf(c) !== flOf(g)) { g.hunt = null; g.state = 'RETURN'; g.path = null; return false; }
  if (g.swingT > 0) g.swingT -= dt;
  const d = closeIn(g, c, dt, SPD.gAlert * (h.beat ? 0.8 : 1));
  if (d > 650) { g.hunt = null; g.state = 'RETURN'; return false; }
  if (d <= 32) { g.swingT = 0.3; npcDown(c, g, !h.beat || Math.random() < 0.2); gsay(g, h.beat ? '다신 얼씬대지 마.' : '본 놈은 없어야지.', 2); g.hunt = null; g.state = 'RETURN'; g.path = null; }
  return true;
}
// 시체를 찾았을 때: 조직끼리 생긴 시체는 경보 대신 세력 반응 (내 탓으로 돌리지 않는다)
function facBody(g, c) {
  if (!S.facOn) return false;
  if (c.byNpc) { c.discovered = true;
    if (!c.civ && c.fac === g.fac && c.by && c.by !== g.fac) { declareWar(g.fac === 'A' ? '조직원이 동료 시체를 찾았다 — 건달파와 전쟁이다' : '건달파가 동료 시체를 찾았다 — 조직과 전쟁이다'); gsay(g, '건드렸겠다… 다 죽었어.', 2.4); }
    else if (!c.civ && c.fac !== g.fac) gsay(g, ['하나 뻗었네.', '꼴좋다.'][g.id % 2], 1.8);
    return true; }
  // 내가 쓰러뜨린 상대편 조직원: 우리 일이 아니다 / 건달파 동료가 찾으면 근처 조직원 탓으로 전쟁
  if (c.fac && c.fac !== g.fac) { c.discovered = true; gsay(g, ['누가 건달 하나 손봤네.', '쟤넨 원래 저래.'][g.id % 2], 1.8); return true; }
  if (c.fac === 'B' && g.fac === 'B') { c.discovered = true; if (S.guards.some(o => o.fac === 'A' && npcAlive(o) && dist(o.x, o.y, c.x, c.y) < 500)) declareWar('건달파가 동료 시체 옆의 조직원을 탓한다 — 전쟁이 났다'); else goSuspicious(g, c.x, c.y, 4); return true; }
  return false;
}
