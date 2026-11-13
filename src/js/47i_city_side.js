// ---------------------------------------------------------------- 자유 모드 부업: 택시 영업 · 구급차 출동 · 내 차고
// 택시: 택시를 몰다 [행동] '택시 영업' → 길가에서 손 흔드는 손님 옆에 세우면 문을 열고 탄다 → 행선지(가게 이름) 앞에 세우면 내린다.
//       요금 = 기본 + 거리, 빨리 갈수록 팁. 차가 크게 망가지면(내구성 3 이상) 손님이 화내며 내린다.
// 구급차: 구급차를 몰다 [행동] '구급 출동' → 피 흘리며 쓰러질 듯 서 있는 환자를 태워 시간 안에 시립 병원으로. 늦으면 숨진다.
// 차고: 출발점 가까운 집 앞에 셔터 차고(구매 팩 셔터 타일). 차를 앞에 세우고 [행동] '차고에 넣기' → 셔터가 올라가고 차가 들어간다.
//       걸어서 셔터 앞 [행동] → 넣어 둔 차를 꺼낸다(두 대까지, 진행 저장에 함께 남는다).
const SIDE = {
  taxi: { name: '택시 영업', vtype: 'taxi', who: '손님', call: ['택시!', '저기요, 택시!', '여기요!'], board: ['○○까지요.', '좀 빨리 가 주세요.', '○○ 가 주세요.'] },
  amb: { name: '구급 출동', vtype: 'ambulance', who: '환자', call: ['살려 주세요...', '구급차...!', '피가... 멈추질 않아요'], board: ['병원... 병원으로...', '으윽...'] },
  bus: { name: '버스 운행', vtype: 'bus', who: '승객' },
  cop: { name: '자경단 출동', vtype: 'police', who: '도주 차량' } };
const garageArt = A.cityGarage, garageAtlas = garageArt ? Object.assign(new Image(), { src: garageArt.src }) : null;
const GARAGE_CAP = 2;
// ---------- 공통: 부업 시작·끝, [행동]
function sideAction() {
  const P = S.player, v = P.car; if (!STAGE.cityLife) return null;
  const sh = safehouseAction(); if (sh) return sh;
  const g = garageAction(); if (g) return g;
  if (!v || S.job || S.hit) return null;
  const sd = S.side, k = Object.keys(SIDE).find(k => vType(v) === VTYPES[SIDE[k].vtype] || (k === 'cop' && v.police));
  if (!sd && k) return { k: 'evAct', label: SIDE[k].name + ' 시작', fn: () => sideStart(k) };
  if (sd && !sd.fare?.aboard && !(sd.kind === 'bus' && sd.riders > 0)) return { k: 'evAct', label: SIDE[sd.kind].name + ' 끝내기', fn: () => sideEnd('영업을 마쳤다') };
  return null;
}
function sideStart(kind) {
  S.side = { kind, v: S.player.car, n: 0, earned: 0, fare: null, nextT: S.t + 1.5, riders: 0 };
  if (kind === 'bus') { if (!busPlanRoute(S.side)) { S.side = null; evBanner('지금은 노선을 짤 수 없다'); return; } evBanner('버스 운행 — 정류장마다 세워 승객을 태우고 내려라', '#8fe0a8'); play('bell', 0.4); return; }
  if (kind === 'cop') { if (S.wanted) { S.side = null; evBanner('수배 중에는 자경단을 할 수 없다'); return; } evBanner('자경단 — 무전: 도주 차량을 들이받아 세워라', '#9fc4ff'); play('bell', 0.4); return; }
  evBanner(kind === 'taxi' ? '택시 영업 — 손 흔드는 손님 옆에 세워라' : '구급 출동 — 환자를 태워 병원으로', kind === 'taxi' ? '#ffd76a' : '#ff8a8a');
  play('bell', 0.4);
}
function sideEnd(msg) {
  const sd = S.side; if (!sd) return; const f = sd.fare;
  if (f && f.g && !f.aboard && npcAlive(f.g)) { f.g.hail = false; evGo(f.g, f.g.x + 40, f.g.y); }
  if (f && f.aboard) sideDropOut(f, true);
  S.side = null; evBanner(`${msg} · ${sd.n}건 · ${sd.earned}만`);
}
// ---------- 손님·환자 고르기
function sideSpot(min, max) {  // 길가 보도 자리 (화면 밖)
  for (let k = 0; k < 30; k++) { const p = offscreenSpot(min, max); if (p && roadNear(p.x, p.y, 3)) return p; }
  return null;
}
function sidePickTarget(kind) {
  if (kind === 'amb') { const h = STAGE.hospital; return h ? { x: tc(h[0]), y: tc(h[1]) + TILE, label: '시립 병원' } : null; }
  const P = S.player, shops = BLD.filter(b => b.kind === 'shop' && !b.vacant && (b.signs?.[0] || '').trim()).map(b => ({ b, p: shopFront(b) })).filter(o => o.p && dist(o.p.x, o.p.y, P.x, P.y) > 900 && dist(o.p.x, o.p.y, P.x, P.y) < 2800);
  if (!shops.length) return null; const o = shops[(Math.random() * shops.length) | 0]; return { x: o.p.x, y: o.p.y, label: o.b.signs[0].trim() };
}
function sideSpawnFare(sd) {
  const p = sideSpot(500, 1100); if (!p) return false; const to = sidePickTarget(sd.kind); if (!to) return false;
  const gi = cityGuardSlot(), g = makeGuard({ kind: 'civ', at: [Math.floor(p.x / TILE), Math.floor(p.y / TILE)], radio: false }, gi);
  g.x = p.x; g.y = p.y; g.route = [{ x: p.x, y: p.y, pause: 999 }]; g.ri = 0; g.wait = 999; g.evt = 'side'; g.hail = true; placeGuard(g, gi); setLayer(0); if (PR) prWarm([charOf(g)], true);
  const d = dist(p.x, p.y, to.x, to.y), limit = Math.round(d / (sd.kind === 'amb' ? 230 : 200) + (sd.kind === 'amb' ? 28 : 22));
  sd.fare = { g, to, limit, d, hp0: null, aboard: false, sayT: 0, t0: S.t };
  return true;
}
// ---------- 매 프레임
function sideUpdate(dt) {
  const sd = S.side, P = S.player; if (!sd) return;
  if (P.car !== sd.v || sd.v.dead) { sideEnd(sd.v.dead ? '차가 부서져 영업을 접었다' : '차에서 내려 영업을 접었다'); return; }
  const f = sd.fare, v = sd.v;
  if (sd.kind === 'bus') { busUpdate(sd, dt); return; }
  if (sd.kind === 'cop') { copSideUpdate(sd, dt); return; }
  if (!f) { if (S.t > sd.nextT && !sideSpawnFare(sd)) sd.nextT = S.t + 3; return; }
  const g = f.g;
  if (!f.aboard) {
    if (!npcAlive(g) || g.off) { sd.fare = null; sd.nextT = S.t + 3; return; }
    if ((f.sayT -= dt) <= 0 && dist(g.x, g.y, P.x, P.y) < 700) { f.sayT = 3; gsay(g, SIDE[sd.kind].call[(Math.random() * 3) | 0], 1.6); }
    g.a = Math.atan2(P.y - g.y, P.x - g.x);
    if (S.t - f.t0 > 150) { g.hail = false; evGo(g, g.x + 60, g.y); sd.fare = null; sd.nextT = S.t + 2; evBanner(`${SIDE[sd.kind].who}이 기다리다 갔다`); return; }
    if (dist(g.x, g.y, v.x, v.y) < 85 && Math.abs(v.v) < 25 && !f.boarding) sideBoard(sd, f);
    return;
  }
  // 태우고 가는 중
  const left = f.limit - (S.t - f.t1);
  if (f.hp0 - v.hp >= 3) { sideDropOut(f, true); gsay(f.g, sd.kind === 'taxi' ? '이게 운전이야?! 세워!' : '...', 2); sd.fare = null; sd.nextT = S.t + 4; evBanner(sd.kind === 'taxi' ? '손님이 화내며 내렸다' : '환자를 다치게 했다', '#f2b0a0'); return; }
  if (sd.kind === 'amb' && left <= 0) { sideDropOut(f, true); G_kill(f.g); sd.fare = null; sd.nextT = S.t + 4; evBanner('환자가 숨졌다…', '#f2b0a0'); return; }
  if (dist(v.x, v.y, f.to.x, f.to.y) < 110 && Math.abs(v.v) < 25 && !f.leaving) {
    f.leaving = true; const pay = Math.round((sd.kind === 'amb' ? 90 : 30) + f.d / (sd.kind === 'amb' ? 30 : 40) + Math.max(0, left) * 2), tip = Math.max(0, left) > f.limit * 0.35 ? (sd.kind === 'amb' ? 30 : 20) : 0;
    after(0.5, () => { sideDropOut(f, false); cash(pay + tip); sd.n++; fstat(sd.kind === 'amb' ? 'patients' : 'taxi'); sd.earned += pay + tip; sd.fare = null; sd.nextT = S.t + 2.5; play('loot', 0.5);
      gsay(f.g, sd.kind === 'amb' ? '고, 고맙습니다...' : tip ? '빠르네요! 잔돈은 넣어 두세요.' : '수고하세요.', 2);
      evBanner(`${sd.kind === 'amb' ? '환자 이송' : '운행 완료'} · ${pay}만${tip ? ` + 팁 ${tip}만` : ''}`, '#9fe0b0'); });
  }
}
function G_kill(g) { if (!g) return; g.off = false; npcDown(g, null, true); const c = S.corpses[S.corpses.length - 1]; if (c && c.g === g) c.byNpc = true; }
// 탄다: 차 쪽으로 걸어와 → 뒷문이 열리고 → 사라진다(차 안)
function sideBoard(sd, f) {
  const g = f.g, v = sd.v; f.boarding = true; g.hail = false;
  const side = v.a + Math.PI / 2, door = { x: v.x + Math.cos(side) * 34 - Math.cos(v.a) * 10, y: v.y + Math.sin(side) * 34 - Math.sin(v.a) * 10 };
  evGo(g, door.x, door.y); gsay(g, SIDE[sd.kind].board[(Math.random() * 2) | 0].replace('○○', f.to.label), 2);
  after(0.9, () => { if (S.side !== sd || sd.fare !== f) return; v.doorT = S.t + 0.2; v.doorSide = 1; play('switch', 0.4);
    after(0.25, () => { if (S.side !== sd || sd.fare !== f) return; g.off = true; g.x = -9000; g.y = -9000; f.aboard = true; f.t1 = S.t; f.hp0 = v.hp;
      evBanner(`${f.to.label}까지 · ${f.limit}초`, sd.kind === 'taxi' ? '#ffd76a' : '#ff8a8a'); }); });
}
// 내린다: 문이 열리고 차 옆에 나타나 행선지(또는 길가)로 걸어간다
function sideDropOut(f, angry) {
  const v = S.side?.v || S.player.car, g = f.g; if (!g || !v) return;
  v.doorT = S.t + 0.2; v.doorSide = 1; play('switch', 0.4);
  const side = v.a + Math.PI / 2; g.off = false; g.state = 'PATROL'; g.x = v.x + Math.cos(side) * 40; g.y = v.y + Math.sin(side) * 40; g.path = null;
  if (angry) civPanic(g, v.x, v.y, 4); else evGo(g, f.to.x, f.to.y);
  f.aboard = false;
}
// 길가 손님 머리 위 손짓 · 행선지 고리 · 남은 시간 (어둠 위)
function drawSide() {
  const sd = S.side; if (sd?.kind === 'bus') { drawBus(sd); return; } if (sd?.kind === 'cop') { drawCopSide(sd); return; } if (!sd || !sd.fare) return; const f = sd.fare, col = sd.kind === 'taxi' ? '255,215,106' : '255,120,120';
  if (!f.aboard && npcAlive(f.g) && inView(f.g.x, f.g.y, 60)) {
    if (sd.kind === 'amb') { ctx.fillStyle = 'rgba(120,10,10,.6)'; ctx.beginPath(); ctx.ellipse(f.g.x + 4, f.g.y + 4, 9, 5, 0, 0, TAU); ctx.fill(); }  // 바닥에 떨어진 피
    infoTag(f.g.x, f.g.y - 60, sd.kind === 'taxi' ? '손님' : '환자', `rgb(${col})`, .9); }
  if (f.aboard && inView(f.to.x, f.to.y, 80)) { infoTag(f.to.x, f.to.y + 30, f.to.label, `rgb(${col})`, .9); }
}
function sideGoal(money) {
  const sd = S.side; if (!sd) return null; const f = sd.fare, nm = SIDE[sd.kind].name;
  if (sd.kind === 'bus') { const st = sd.stops[sd.si]; return { text: `${nm} · ${st.name} 정류장 (${sd.si + 1}/${sd.stops.length}) · 승객 ${sd.riders}명 · ${money}`, where: '', x: st.x, y: st.y, fl: 0 }; }
  if (sd.kind === 'cop') { const c = sd.target; return c ? { text: `${nm} · 도주 차량 들이받아 세우기 · ${Math.max(0, Math.ceil(sd.until - S.t))}초 · ${money}`, where: '', x: c.x, y: c.y, fl: 0 } : { text: `${nm} · 무전 대기 · ${money}`, where: '', x: S.player.x, y: S.player.y, fl: 0 }; }
  if (!f) return { text: `${nm} · ${SIDE[sd.kind].who} 찾는 중 · ${money}`, where: '', x: S.player.x, y: S.player.y, fl: 0 };
  if (!f.aboard) return { text: `${nm} · 손 흔드는 ${SIDE[sd.kind].who} 옆에 세우기 · ${money}`, where: '', x: f.g.x, y: f.g.y, fl: 0 };
  return { text: `${nm} · '${f.to.label}'까지 ${Math.max(0, Math.ceil(f.limit - (S.t - f.t1)))}초 · ${money}`, where: '', x: f.to.x, y: f.to.y, fl: 0 };
}
// ---------- 내 차고
function garageInit() {
  S.garage = null; if (!STAGE.cityLife) return;
  const st = STAGE.start || [0, 0], sx = tc(st[0]), sy = tc(st[1]);
  const cands = BLD.filter(b => (b.kind === 'house' || b.kind === 'villa') && !b.vacant && b.x1 - b.x0 >= 4).map(b => ({ b, p: shopFront(b) })).filter(o => o.p && roadNear(o.p.x, o.p.y + TILE * 2, 2))
    .sort((a, b) => dist(a.p.x, a.p.y, sx, sy) - dist(b.p.x, b.p.y, sx, sy));
  const o = cands[0]; if (!o) return;
  const base = (o.b.y1 + 1) * TILE;
  S.garage = { b: o.b, x: o.p.x, base, bay: { x0: o.p.x - 70, x1: o.p.x + 70, y0: base, y1: base + 150 }, cars: (S.garageSaved || []).slice(0, GARAGE_CAP), open: 0, openTo: 0 };
}
function garageAction() {
  const G = S.garage, P = S.player; if (!G) return null;
  const v = P.car, inBay = o => o.x > G.bay.x0 && o.x < G.bay.x1 && o.y > G.bay.y0 && o.y < G.bay.y1;
  if (v && inBay(v) && Math.abs(v.v) < 20 && !G.busy) {
    if (G.cars.length >= GARAGE_CAP) return { k: 'evAct', label: '차고가 꽉 찼다 (2대)', fn: () => evBanner('차고가 꽉 찼다 — 먼저 한 대를 꺼내라') };
    if (v.police || v.forSale != null || (S.job && S.job.v === v) || (S.side && S.side.v === v)) return null;
    return { k: 'evAct', label: '차고에 넣기', fn: () => garageStore(v) };
  }
  if (!v && !G.busy && dist(P.x, P.y, G.x, G.base + 20) < 70) {
    if (!G.cars.length) return { k: 'evAct', label: '차고 (비어 있음)', fn: () => evBanner('차고가 비어 있다 — 차를 셔터 앞에 세우고 넣어라') };
    return { k: 'evAct', label: `차고 — 차 꺼내기 (${G.cars.length}대)`, fn: () => shopPanel('내 차고', G.cars.map((c, i) => ({ name: `${VTYPES[c.type]?.name || '차'}${c.hp < c.hpMax ? ' (흠집)' : ''}`, price: null, tag: '꺼내기', ok: true, buy: () => { closeShopPanel(); garageTake(i); } }))) };
  }
  return null;
}
function garageStore(v) {
  const G = S.garage, P = S.player; G.busy = true; G.openTo = 1; play('metal', 0.4, 0.7);
  v.ai = false; v.v = 0; v.jacking = true;  // 셔터가 올라가면 차가 천천히 들어간다
  const x0 = v.x, y0 = v.y, a0 = v.a, tx = G.x, ty = G.base - 30;
  let k = 0; const step = () => { k++; const f = Math.min(1, k / 30); v.x = x0 + (tx - x0) * f; v.y = y0 + (ty - y0) * f; v.a = a0 + angDiff(a0, -Math.PI / 2) * Math.min(1, f * 2); P.x = v.x; P.y = v.y; if (k < 30) after(1 / 30, step); else done(); };
  const done = () => { v.jacking = false; P.car = null; P.x = G.x + 56; P.y = G.base + 40; collide(P, 13, groundSolidP); v.gone = true; S.vehicles = S.vehicles.filter(o => o !== v);
    G.cars.push({ type: v.type || 'sedan', c: v.c || 0, hp: Math.max(1, v.hp), hpMax: v.hpMax || vType(v).hp });
    G.openTo = 0; G.busy = false; play('metal', 0.4, 0.6); evBanner(`차고에 넣었다 · ${G.cars.length}/${GARAGE_CAP}`, '#9fe0b0'); saveFreeProgress(true); };
  after(0.7, step);
}
function garageTake(i) {
  const G = S.garage, c = G.cars[i]; if (!c) return; G.busy = true; G.openTo = 1; play('metal', 0.4, 0.7);
  after(0.7, () => { const v = makeVehicle({ type: c.type, x: G.x, y: G.base - 30, a: Math.PI / 2, parked: true }); v.c = c.c; v.hp = c.hp; v.bought = true; v.unlocked = true; S.vehicles.push(v);
    let k = 0; const step = () => { k++; v.y = G.base - 30 + 110 * Math.min(1, k / 25); if (k < 25) after(1 / 30, step); else { G.cars.splice(i, 1); G.openTo = 0; G.busy = false; play('metal', 0.4, 0.6); evBanner('차를 꺼냈다', '#9fe0b0'); saveFreeProgress(true); } };
    step(); });
}
function garageUpdate(dt) { const G = S.garage; if (G) G.open += clamp(G.openTo - G.open, -dt * 1.6, dt * 1.6); }
// 셔터: 구매 팩 갈색 셔터 타일 3×2장 (집 앞벽 밑동). 올라가면 아래부터 어두운 안쪽이 드러난다
function drawGarage() {
  const G = S.garage; if (!G || !inView(G.x, G.base, 160)) return;
  const w = 96, h = 64, x = G.x - w / 2, y = G.base - h, open = clamp(G.open, 0, 1), sh = Math.round(h * (1 - open * 0.9));
  ctx.fillStyle = '#121418'; ctx.fillRect(x - 3, y - 6, w + 6, h + 6); ctx.fillStyle = '#07080a'; ctx.fillRect(x, y, w, h);
  const F = garageArt?.frames;
  if (F && garageAtlas.complete && garageAtlas.naturalWidth) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.beginPath(); ctx.rect(x, y, w, sh); ctx.clip();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const f = F['shutterBrown' + ((r + c) % 3)].rect; ctx.drawImage(garageAtlas, f[0], f[1], f[2], f[3], x + c * 32, y + sh - h + r * 32, 32, 32); }
    ctx.restore(); }
  else { ctx.fillStyle = '#6b5a48'; ctx.fillRect(x, y, w, sh); }
  ctx.fillStyle = '#d08a2a'; ctx.fillRect(x, y + sh - 3, w, 3);  // 셔터 아래 끝
  ctx.fillStyle = `rgba(4,8,22,${(STAGE.nightShade ?? 0.6) * 0.45})`; ctx.fillRect(x - 3, y - 6, w + 6, h + 6);  // 밤 어둠 (고가처럼 어둠 단계 뒤에 그려진다)
  ctx.fillStyle = '#2a2e34'; ctx.fillRect(x - 6, y - 14, w + 12, 10); ctx.fillStyle = '#e8d070'; ctx.font = '700 9px ' + UI_FONT_FAMILY; ctx.textAlign = 'center'; ctx.fillText(`내 차고 ${G.cars.length}/${GARAGE_CAP}`, G.x, y - 6);
  const P = S.player; if (P.car && !G.busy) { const b = .35 + .25 * Math.sin(S.t * 4); ctx.strokeStyle = `rgba(232,208,112,${b})`; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeRect(G.bay.x0, G.bay.y0, G.bay.x1 - G.bay.x0, G.bay.y1 - G.bay.y0); ctx.setLineDash([]); }
}
function drawMiniSide(x, T) {
  const G = S.garage; if (G) { x.fillStyle = '#e8d070'; x.fillRect(T(G.x) - 3, T(G.base) - 3, 6, 6); x.strokeStyle = 'rgba(0,0,0,.7)'; x.strokeRect(T(G.x) - 3, T(G.base) - 3, 6, 6); }
  const sd = S.side; if (sd?.kind === 'bus') { const st = sd.stops[sd.si]; x.fillStyle = '#8fe0a8'; x.fillRect(T(st.x) - 3, T(st.y) - 3, 6, 6); }
  if (sd?.kind === 'cop' && sd.target) { x.fillStyle = (S.t * 4 | 0) % 2 ? '#ff5a5a' : '#5a8aff'; x.beginPath(); x.arc(T(sd.target.x), T(sd.target.y), 4, 0, TAU); x.fill(); }
  const f = S.side?.fare; if (f) { const p = f.aboard ? f.to : f.g; x.fillStyle = S.side.kind === 'taxi' ? '#ffd76a' : '#ff7a7a'; x.beginPath(); x.arc(T(p.x), T(p.y), 3.5, 0, TAU); x.fill(); }
}

// ---------- 버스 운행: 정류장 5곳을 차례로. 정류장 앞(보도 쪽 차로)에 서면 내릴 사람이 내리고 기다리던 사람이 탄다. 한 명당 15만, 노선을 다 돌면 50만
const BUS_STOP_NAMES = ['을지로입구', '청계2가', '수표교', '세운상가', '을지로3가', '충무로', '동대문시장', '종로3가', '인쇄골목', '장교동', '관수교', '신당역'];
function busPlanRoute(sd) {
  const P = S.player, stops = []; let at = { x: P.x, y: P.y };
  for (let k = 0; k < 5; k++) { let best = null;
    for (let t = 0; t < 40 && !best; t++) { const a = Math.random() * TAU, r = rnd(600, 1000), x = at.x + Math.cos(a) * r, y = at.y + Math.sin(a) * r, p = roadNear(x, y, 6);
      if (p && dist(p.x, p.y, at.x, at.y) > 450 && stops.every(s => dist(s.x, s.y, p.x, p.y) > 400)) best = p; }
    if (!best) return false; stops.push({ x: best.x, y: best.y, name: BUS_STOP_NAMES[(S.t * 7 + k * 5 | 0) % BUS_STOP_NAMES.length], wait: [] }); at = best; }
  sd.stops = stops; sd.si = 0; sd.riders = 0; sd.t0 = S.t; busFillStop(sd, 0); return true;
}
function busFillStop(sd, i) {  // 정류장에 기다리는 사람 1~3명 (길가 보도에)
  const st = sd.stops[i]; if (!st || st.wait.length) return; const n = 1 + ((Math.random() * 3) | 0);
  for (let k = 0; k < n; k++) { const gi = cityGuardSlot(), x = st.x + (k - 1) * 20, y = st.y + 40, g = makeGuard({ kind: 'civ', at: [Math.floor(x / TILE), Math.floor(y / TILE)], radio: false }, gi);
    g.x = x; g.y = y; g.route = [{ x, y, pause: 999 }]; g.ri = 0; g.wait = 999; g.evt = 'side'; placeGuard(g, gi); setLayer(0); if (PR) prWarm([charOf(g)], true); st.wait.push(g); }
}
function busUpdate(sd, dt) {
  const v = sd.v, st = sd.stops[sd.si]; if (!st) return;
  if (dist(v.x, v.y, st.x, st.y) < 900) busFillStop(sd, sd.si);
  if (dist(v.x, v.y, st.x, st.y) < 100 && Math.abs(v.v) < 20 && !sd.dwell) {
    sd.dwell = true; v.doorT = S.t + 0.2; v.doorSide = 1; play('switch', 0.5);
    const off = sd.si ? Math.min(sd.riders, 1 + ((Math.random() * sd.riders) | 0)) : 0, on = st.wait.filter(npcAlive);
    for (let k = 0; k < off; k++) after(0.3 + k * 0.4, () => { const gi = cityGuardSlot(), side = v.a + Math.PI / 2, x = v.x + Math.cos(side) * 46, y = v.y + Math.sin(side) * 46, g = makeGuard({ kind: 'civ', at: [Math.floor(x / TILE), Math.floor(y / TILE)], radio: false }, gi);
      g.x = x; g.y = y; g.route = [{ x: x + Math.cos(side) * 60, y: y + Math.sin(side) * 60, pause: 999 }]; g.evt = 'side'; placeGuard(g, gi); if (PR) prWarm([charOf(g)], true); });
    on.forEach((g, k) => { const side = v.a + Math.PI / 2; evGo(g, v.x + Math.cos(side) * 40, v.y + Math.sin(side) * 40); after(0.9 + k * 0.45, () => { if (S.side !== sd) return; g.off = true; g.x = -9000; g.y = -9000; }); });
    const t = Math.max(0.9 + on.length * 0.45, 0.3 + off * 0.4) + 0.3;
    after(t, () => { if (S.side !== sd) return; sd.riders += on.length - off; const pay = on.length * 15; if (pay) { cash(pay); sd.earned += pay; } sd.n += on.length; fstat('busRiders', on.length); st.wait = [];
      v.doorT = S.t + 0.2; play('switch', 0.4); sd.si++; sd.dwell = false;
      if (sd.si >= sd.stops.length) { const bonus = 50; cash(bonus); sd.earned += bonus; play('bell', 0.5); evBanner(`노선 완주 · 보너스 ${bonus}만`, '#9fe0b0'); sd.riders = 0; if (!busPlanRoute(sd)) sideEnd('운행을 마쳤다'); }
      else evBanner(`${st.name} · 탄 사람 ${on.length} · 내린 사람 ${off}${pay ? ` · ${pay}만` : ''} → 다음 ${sd.stops[sd.si].name}`, '#8fe0a8'); });
  }
}
function drawBus(sd) {
  const st = sd.stops[sd.si]; if (!st) return;
  for (const [i, s] of sd.stops.entries()) { if (i < sd.si || !inView(s.x, s.y, 80)) continue;  // 정류장 표지: 기둥 + 파란 판
    const x = s.x | 0, y = s.y + 36 | 0; ctx.fillStyle = '#2a2e34'; ctx.fillRect(x - 1, y - 38, 3, 40); ctx.fillStyle = '#2f6db4'; ctx.fillRect(x - 9, y - 50, 19, 13); ctx.fillStyle = '#e8f0ff'; ctx.fillRect(x - 6, y - 47, 13, 2); ctx.fillRect(x - 6, y - 43, 9, 2);
    if (i === sd.si) { infoTag(s.x, s.y - 70, `${s.name} 정류장`, '#8fe0a8', .9); } }
}
// ---------- 자경단: 경찰차로 무전을 받는다 → 화면 밖에서 도주 차량(조직 스포츠카)이 달아난다 → 들이받아 내구성 절반 아래로 세우면 범인이 내려 손을 든다
function copSideUpdate(sd, dt) {
  const P = S.player;
  if (S.wanted) { sideEnd('수배가 붙어 자경단을 접었다'); return; }
  if (!sd.target) { if (S.t < sd.nextT) return;
    const r = roadSpot(700, 1100); if (!r) { sd.nextT = S.t + 2; return; }
    const v = makeVehicle({ type: ['sport', 'luxury', 'suv'][(sd.n + (S.t | 0)) % 3], x: r.x, y: r.y, a: r.a ?? 0, parked: false }); Object.assign(v, { ai: true, driver: true, flee: true, gang: 'B', c: 3, v: 120 });
    v.d = ((Math.round((v.a || 0) / (Math.PI / 2)) % 4) + 4) % 4; S.vehicles.push(v); sd.target = v; sd.hp0 = v.hp; sd.until = S.t + 100; play('click', 0.5);
    evBanner('무전: 도주 차량 발견 — 들이받아 세워라', '#9fc4ff'); return; }
  const c = sd.target;
  if (c.dead || c.hp <= sd.hp0 * 0.5) {  // 섰다: 범인이 내려 손을 든다
    c.ai = false; c.v = 0; c.flee = false; c.driver = false; c.doorT = S.t + 0.2; c.doorSide = -1;
    const gi = cityGuardSlot(), side = c.a - Math.PI / 2, g = makeGuard({ kind: 'g2', at: [Math.floor(c.x / TILE), Math.floor(c.y / TILE)], radio: false }, gi);
    g.x = c.x + Math.cos(side) * 46; g.y = c.y + Math.sin(side) * 46; g.fac = 'B'; g.outfit = FAC_OUTFIT.B || null; g.evt = 'side'; g.route = [{ x: g.x, y: g.y, pause: 999 }]; placeGuard(g, gi); if (PR) prWarm([charOf(g)], true);
    gsay(g, '아, 알았어! 쏘지 마!', 2.5); after(4, () => evGone(g));
    const pay = 120 + Math.max(0, Math.round(sd.until - S.t)); cash(pay); sd.earned += pay; sd.n++; fstat('perps'); applyStanding({ P: 3, B: -2 });
    evBanner(`도주 차량 검거 · ${pay}만`, '#9fe0b0'); play('bell', 0.5); sd.target = null; sd.nextT = S.t + 6; return; }
  if (S.t > sd.until || dist(c.x, c.y, P.x, P.y) > 3200) { c.flee = false; evBanner('도주 차량을 놓쳤다', '#f2b0a0'); sd.target = null; sd.nextT = S.t + 8; }
  if ((sd.sirenT = (sd.sirenT || 0) - dt) <= 0) { sd.sirenT = 0.55; play('metal', 0.12, 2.9); }  // 사이렌 대용: 높은 쇳소리 깜빡
}
function drawCopSide(sd) {
  const c = sd.target; if (!c || !inView(c.x, c.y, 80)) return; const b = (S.t * 4 | 0) % 2;
  const k = clamp(c.hp / sd.hp0, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(c.x - 26, c.y - 74, 52, 6); ctx.fillStyle = '#ff6a5a'; ctx.fillRect(c.x - 25, c.y - 73, Math.round(50 * k), 4);
  infoTag(c.x, c.y - 84, '도주 차량', '#ff9a8a', .9);
}
