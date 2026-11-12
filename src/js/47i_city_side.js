// ---------------------------------------------------------------- 자유 모드 부업: 택시 영업 · 구급차 출동 · 내 차고
// 택시: 택시를 몰다 [행동] '택시 영업' → 길가에서 손 흔드는 손님 옆에 세우면 문을 열고 탄다 → 행선지(가게 이름) 앞에 세우면 내린다.
//       요금 = 기본 + 거리, 빨리 갈수록 팁. 차가 크게 망가지면(내구성 3 이상) 손님이 화내며 내린다.
// 구급차: 구급차를 몰다 [행동] '구급 출동' → 피 흘리며 쓰러질 듯 서 있는 환자를 태워 시간 안에 시립 병원으로. 늦으면 숨진다.
// 차고: 출발점 가까운 집 앞에 셔터 차고(구매 팩 셔터 타일). 차를 앞에 세우고 [행동] '차고에 넣기' → 셔터가 올라가고 차가 들어간다.
//       걸어서 셔터 앞 [행동] → 넣어 둔 차를 꺼낸다(두 대까지, 진행 저장에 함께 남는다).
const SIDE = {
  taxi: { name: '택시 영업', vtype: 'taxi', who: '손님', call: ['택시!', '저기요, 택시!', '여기요!'], board: ['○○까지요.', '좀 빨리 가 주세요.', '○○ 가 주세요.'] },
  amb: { name: '구급 출동', vtype: 'ambulance', who: '환자', call: ['살려 주세요...', '구급차...!', '피가... 멈추질 않아요'], board: ['병원... 병원으로...', '으윽...'] } };
const garageArt = A.cityGarage, garageAtlas = garageArt ? Object.assign(new Image(), { src: garageArt.src }) : null;
const GARAGE_CAP = 2;
// ---------- 공통: 부업 시작·끝, [행동]
function sideAction() {
  const P = S.player, v = P.car; if (!STAGE.cityLife) return null;
  const g = garageAction(); if (g) return g;
  if (!v || S.job || S.hit) return null;
  const sd = S.side, k = Object.keys(SIDE).find(k => vType(v) === VTYPES[SIDE[k].vtype]);
  if (!sd && k) return { k: 'evAct', label: SIDE[k].name + ' 시작', fn: () => sideStart(k) };
  if (sd && !sd.fare?.aboard) return { k: 'evAct', label: SIDE[sd.kind].name + ' 끝내기', fn: () => sideEnd('영업을 마쳤다') };
  return null;
}
function sideStart(kind) {
  S.side = { kind, v: S.player.car, n: 0, earned: 0, fare: null, nextT: S.t + 1.5 };
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
    after(0.5, () => { sideDropOut(f, false); cash(pay + tip); sd.n++; sd.earned += pay + tip; sd.fare = null; sd.nextT = S.t + 2.5; play('loot', 0.5);
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
  const sd = S.side; if (!sd || !sd.fare) return; const f = sd.fare, col = sd.kind === 'taxi' ? '255,215,106' : '255,120,120';
  if (!f.aboard && npcAlive(f.g) && inView(f.g.x, f.g.y, 60)) { const b = .6 + .4 * Math.sin(S.t * 8);
    ctx.strokeStyle = `rgba(${col},${b})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.g.x, f.g.y - 4, 22, 0, TAU); ctx.stroke();
    if (sd.kind === 'amb') { ctx.fillStyle = 'rgba(120,10,10,.6)'; ctx.beginPath(); ctx.ellipse(f.g.x + 4, f.g.y + 4, 9, 5, 0, 0, TAU); ctx.fill(); }  // 바닥에 떨어진 피
    infoTag(f.g.x, f.g.y - 60, sd.kind === 'taxi' ? '손님' : '환자', `rgb(${col})`, .9); }
  if (f.aboard && inView(f.to.x, f.to.y, 80)) { const b = .5 + .4 * Math.sin(S.t * 5); ctx.strokeStyle = `rgba(${col},${b})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.to.x, f.to.y, 46, 0, TAU); ctx.stroke(); infoTag(f.to.x, f.to.y + 30, f.to.label, `rgb(${col})`, .9); }
}
function sideGoal(money) {
  const sd = S.side; if (!sd) return null; const f = sd.fare, nm = SIDE[sd.kind].name;
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
  const f = S.side?.fare; if (f) { const p = f.aboard ? f.to : f.g; x.fillStyle = S.side.kind === 'taxi' ? '#ffd76a' : '#ff7a7a'; x.beginPath(); x.arc(T(p.x), T(p.y), 3.5, 0, TAU); x.fill(); }
}
