// ---------------------------------------------------------------- 자유 모드 일거리 (GTA식): 울리는 공중전화를 받으면 암살 말고도 세 가지 일이 들어온다.
//  · 차 가져오기: 도시 어딘가에 세워 둔 비싼 차를 훔쳐 중고차 매매 마당에 세운다. 덜 망가질수록 많이 받는다
//  · 배달: 가게에서 꾸러미를 받아 제한 시간 안에 다른 가게 앞으로 가져간다 (걸어도 되고 차로 가도 된다)
//  · 경주: 차를 타고 교차로 체크포인트를 차례로 시간 안에 지난다
// 한 번에 일 하나 (S.hit 또는 S.job). 목표 문구·화살표는 hitGoal 이 jobGoal 로 넘긴다
const JOB_KINDS = ['hit', 'car', 'parcel', 'race'];
const JOB_PAY = { car: 400, parcel: 150, race: 250 };
const JOB_CARS = ['luxury', 'sport', 'supercar', 'suv', 'limo'];
const JOB_CLIENTS = ['박 사장', '곰보 형님', '남대문 큰손', '을지로 김 실장', '청계 영감'];

// 전화로 들어올 일 고르기: 차례로 돌되 조건이 안 맞으면 다음 것
function planJob() {
  const n = S.jobN || 0;
  for (let k = 0; k < JOB_KINDS.length; k++) {
    const kind = JOB_KINDS[(n + k) % JOB_KINDS.length];
    const plan = kind === 'hit' ? planHit() : kind === 'car' ? planCarJob() : kind === 'parcel' ? planParcel() : planRace();
    if (plan) { plan.kind = kind; return plan; }
  }
  return null;
}
const jobClient = () => JOB_CLIENTS[(S.jobN || 0) % JOB_CLIENTS.length];
const dirWord = (x, y) => { const P = S.player, a = Math.atan2(y - P.y, x - P.x); return DIR8[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; };
// 길 위 한 점이 걸을 수 있는지 (벽·건물 안이 아닌지)
const jobOpen = (x, y) => !solidAt(Math.floor(x / TILE), Math.floor(y / TILE)) && bldAt(Math.floor(x / TILE), Math.floor(y / TILE)) < 0;

// 차 가져오기: 나에게서 멀고(화면 밖) 너무 멀지 않은 곳에 세워 둔 차 하나를 비싼 차로 바꿔 둔다
function planCarJob() {
  if (!S.dealer || !S.vehicles) return null;
  const P = S.player, cand = S.vehicles.filter(v => !v.ai && !v.dead && !v.chase && !v.police && !v.gang && (v.z || 0) < 0.01 && v !== P.car && dist(v.x, v.y, P.x, P.y) > 1000 && dist(v.x, v.y, P.x, P.y) < 3200);
  if (!cand.length) return null;
  const v = cand[(Math.random() * cand.length) | 0], type = JOB_CARS[(S.jobN || 0) % JOB_CARS.length];
  return { v, type, name: VTYPES[type].name, client: jobClient() };
}
// 배달: 꾸러미를 받을 가게(가까운 편)와 갖다 줄 가게(먼 곳). 가게 앞 보도
function shopFront(b) { const x = (b.x0 + b.x1 + 1) * TILE / 2; for (const dy of [1.5, 2.5, 0.5]) { const y = (b.y1 + dy) * TILE; if (jobOpen(x, y)) return { x, y }; } return null; }
function planParcel() {
  const P = S.player, shops = BLD.filter(b => b.kind === 'shop' && !b.vacant && (b.signs?.[0] || '').trim()).map(b => ({ b, p: shopFront(b) })).filter(o => o.p);
  const from = shops.filter(o => { const d = dist(o.p.x, o.p.y, P.x, P.y); return d > 300 && d < 1400; }), to = shops.filter(o => dist(o.p.x, o.p.y, P.x, P.y) > 1800 && dist(o.p.x, o.p.y, P.x, P.y) < 4200);
  if (!from.length || !to.length) return null;
  const a = from[(Math.random() * from.length) | 0], b = to[(Math.random() * to.length) | 0];
  return { from: a.p, fromSign: a.b.signs[0].trim(), to: b.p, toSign: b.b.signs[0].trim(), client: jobClient() };
}
// 경주: 가까운 교차로에서 시작해 이웃 교차로를 이어 6곳 (같은 곳 다시 안 감)
function planRace() {
  const RX = STAGE.roadsX || [], RY = STAGE.roadsY || []; if (RX.length < 3 || RY.length < 3) return null;
  const P = S.player, cx = i => (RX[i] + 2) * TILE, cy = j => (RY[j] + 2) * TILE;
  let best = null, bd = 1e9; for (let i = 0; i < RX.length; i++) for (let j = 0; j < RY.length; j++) { const d = dist(cx(i), cy(j), P.x, P.y); if (d < bd) { bd = d; best = [i, j]; } }
  const pts = [], seen = new Set([best.join()]); let [i, j] = best;
  for (let k = 0; k < 6; k++) {
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < RX.length && b < RY.length && !seen.has(a + ',' + b) && jobOpen(cx(a), cy(b)));
    if (!nb.length) break; [i, j] = nb[(Math.random() * nb.length) | 0]; seen.add(i + ',' + j); pts.push({ x: cx(i), y: cy(j) });
  }
  if (pts.length < 4) return null;
  let len = dist(P.x, P.y, pts[0].x, pts[0].y); for (let k = 1; k < pts.length; k++) len += dist(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
  return { pts, limit: Math.round(len / 330 + 12), client: jobClient() };
}

// 전화 대사
function jobLines(plan) {
  if (!plan) return null;
  if (plan.kind === 'hit') return phoneLines(plan);
  const hello = ['master', '올빼미군. 손이 비었으면 하나 해라.'];
  if (plan.kind === 'car') return [hello, ['master', `${plan.client}이 ${plan.name}를 찾는다. ${dirWord(plan.v.x, plan.v.y)}에 세워져 있다.`],
    ['master', `중고차 매매 마당까지 몰고 와. 긁히지 않게 가져오면 ${JOB_PAY.car}만, 찌그러지면 그만큼 깎는다.`], ['hero', '차 한 대쯤이야.']];
  if (plan.kind === 'parcel') return [hello, ['master', `'${plan.fromSign}' 앞에서 꾸러미를 받아 '${plan.toSign}' 앞까지 가져가라.`],
    ['master', `꾸러미를 받으면 시계가 돈다. 늦으면 한 푼도 없다. ${JOB_PAY.parcel}만에, 빨리 오면 더 얹지.`], ['hero', '알았다.']];
  return [hello, ['master', `${plan.client} 쪽 애들이 내기를 걸었다. 차를 몰고 교차로 ${plan.pts.length}곳을 차례로 지나.`],
    ['master', `${plan.limit}초 안에 들어오면 ${JOB_PAY.race}만. 차가 없으면 하나 빌려 와라.`], ['hero', '시동 걸지.']];
}
function startJob(plan) {
  if (!plan || S.job || S.hit) return;
  S.jobN = (S.jobN || 0) + 1;
  if (plan.kind === 'hit') { startHit(plan); return; }
  if (plan.kind === 'car') {
    const v = plan.v; Object.assign(v, makeVehicle({ type: plan.type }), { id: v.id, x: v.x, y: v.y, a: v.a, v: 0, ai: false, parked: true, driver: false });
    v.jobCar = true; S.job = { kind: 'car', v, name: plan.name, t0: S.t, hp0: v.hp };
    if (!STAGE.noPrompts) toast(`일: ${plan.name} 가져오기`, 2.4, 'good');
  } else if (plan.kind === 'parcel') {
    S.job = { kind: 'parcel', from: plan.from, to: plan.to, fromSign: plan.fromSign, toSign: plan.toSign, got: false, t0: S.t };
    if (!STAGE.noPrompts) toast(`일: '${plan.fromSign}'에서 꾸러미 받기`, 2.4, 'good');
  } else {
    S.job = { kind: 'race', pts: plan.pts, i: 0, limit: plan.limit, started: null, t0: S.t };
    if (!STAGE.noPrompts) toast('일: 교차로 경주 — 차에 타고 첫 체크포인트로', 2.6, 'good');
  }
}
function endJob(ok, msg, pay = 0) {
  const j = S.job; if (!j) return;
  if (j.v) j.v.jobCar = false;
  S.job = null; S.ringNext = S.t + (ok ? 15 : 20);
  if (ok) { S.cash = (S.cash || 0) + pay; play('bell', 0.6); if (typeof feedbackPulse === 'function') feedbackPulse(document.querySelector('#hud .obj'), 'loot'); }
  else play('lose', 0.3);
  if (!STAGE.noPrompts) toast(msg, 2.8, ok ? 'good' : 'warn');
}
const jobLeft = j => Math.max(0, Math.ceil(j.deadline - S.t));
function jobsUpdate(dt) {
  const j = S.job, P = S.player; if (!j || S.downing) return;
  if (j.kind === 'car') {
    const v = j.v;
    if (!S.vehicles.includes(v) || v.dead) { endJob(false, '일 실패 — 차가 망가졌다'); return; }
    const D = S.dealer, inLotNow = D && v.x > D.lot[0] && v.x < D.lot[2] && v.y > D.lot[1] && v.y < D.lot[3];
    if (P.car === v && inLotNow && Math.abs(v.v) < 25) {
      const k = clamp(v.hp / (j.hp0 || v.hpMax || 6), 0, 1), pay = Math.round(JOB_PAY.car * (0.35 + 0.65 * k) / 10) * 10;
      v.jobCar = false; carExit(true); v.ai = false; v.parked = true;
      endJob(true, `${j.name} 넘겼다 · ${pay}만${k < 1 ? ' (흠집만큼 깎였다)' : ''}`, pay);
    }
    return;
  }
  if (j.kind === 'parcel') {
    if (!j.got) { if (dist(P.x, P.y, j.from.x, j.from.y) < 70) { j.got = true; j.deadline = S.t + Math.round(dist(j.from.x, j.from.y, j.to.x, j.to.y) / 170 + 15); j.total = j.deadline - S.t; play('loot', 0.5); if (!STAGE.noPrompts) toast(`꾸러미를 받았다 — ${jobLeft(j)}초 안에 '${j.toSign}'까지`, 2.6, 'good'); } return; }
    if (S.t > j.deadline) { endJob(false, '일 실패 — 늦었다'); return; }
    if (dist(P.x, P.y, j.to.x, j.to.y) < (P.car ? 110 : 70)) { const spare = (j.deadline - S.t) / j.total, pay = JOB_PAY.parcel + Math.round(spare * 100 / 10) * 10; endJob(true, `배달 완료 · ${pay}만`, pay); }
    return;
  }
  if (j.kind === 'race') {
    if (!j.started) { const p = j.pts[0]; if (P.car && dist(P.x, P.y, p.x, p.y) < 160) { j.started = S.t; j.i = 1; j.deadline = S.t + j.limit; play('bell', 0.4); if (!STAGE.noPrompts) toast(`출발! ${j.limit}초`, 1.6, 'good'); } return; }
    if (S.t > j.deadline) { endJob(false, '경주 실패 — 시간 초과'); return; }
    const p = j.pts[j.i]; if (P.car && dist(P.x, P.y, p.x, p.y) < 150) { j.i++; play('click', 0.6);
      if (j.i >= j.pts.length) { endJob(true, `경주 완주 · ${Math.round(S.t - j.started)}초 · ${JOB_PAY.race}만`, JOB_PAY.race); } }
  }
}
// 목표 문구 · 화살표가 가리킬 곳
function jobGoal(money) {
  const j = S.job, P = S.player;
  if (j.kind === 'car') { const v = j.v, D = S.dealer;
    if (P.car === v && D) return { text: `${j.name}를 매매 마당에 세우기 · ${money}`, where: '', x: (D.lot[0] + D.lot[2]) / 2, y: (D.lot[1] + D.lot[3]) / 2, fl: 0 };
    return { text: `${j.name} 훔치기 · ${money}`, where: '', x: v.x, y: v.y, fl: 0 }; }
  if (j.kind === 'parcel') return j.got ? { text: `'${j.toSign}'까지 배달 · ${jobLeft(j)}초 · ${money}`, where: '', x: j.to.x, y: j.to.y, fl: 0 } : { text: `'${j.fromSign}'에서 꾸러미 받기 · ${money}`, where: '', x: j.from.x, y: j.from.y, fl: 0 };
  const p = j.pts[Math.min(j.i, j.pts.length - 1)];
  if (!j.started) return { text: `${P.car ? '' : '차를 구해 '}출발점 교차로로 · ${money}`, where: '', x: p.x, y: p.y, fl: 0 };
  return { text: `경주 ${j.i}/${j.pts.length - 1} · ${jobLeft(j)}초 · ${money}`, where: '', x: p.x, y: p.y, fl: 0 };
}
// 땅 표시 (어둠 위): 목표 자리에 고리와 이름표
function drawJobs() {
  const j = S.job; if (!j || flOf(S.player) || S.player.z > 0) return;
  const ring = (x, y, r, col, tag) => { if (!inView(x, y, r + 40)) return; const pu = .55 + .35 * Math.sin(S.t * 5);
    ctx.fillStyle = `rgba(${col},${0.10 + 0.06 * pu})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${col},${0.5 + 0.5 * pu})`; ctx.lineWidth = 5; ctx.setLineDash([14, 8]); ctx.lineDashOffset = -S.t * 30; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    if (tag && !STAGE.noPrompts) infoTag(x, y - r - 18, tag, `rgb(${col})`, .95); };
  if (j.kind === 'car') { const v = j.v, D = S.dealer;
    if (S.player.car !== v) ring(v.x, v.y, 52, '255,200,90', j.name + ' · 가져갈 차');
    else if (D) { const x = (D.lot[0] + D.lot[2]) / 2, y = (D.lot[1] + D.lot[3]) / 2; ring(x, y, 90, '120,230,150', '여기에 세우기'); } return; }
  if (j.kind === 'parcel') { if (!j.got) ring(j.from.x, j.from.y, 34, '255,200,90', '꾸러미 받기'); else ring(j.to.x, j.to.y, 40, '120,230,150', '배달'); return; }
  const n = j.pts.length; for (let k = Math.max(0, j.i); k < Math.min(n, j.i + 2); k++) { const p = j.pts[k], last = k === n - 1;
    ring(p.x, p.y, 120, k === j.i ? (last ? '120,230,150' : '255,200,90') : '170,190,210', k === j.i ? (j.started ? (last ? '결승' : `체크포인트 ${k}`) : '출발') : ''); }
}

// ---------------------------------------------------------------- 자유 모드 진행 저장: 번 돈 · 일 차례 · 끝낸 암살 수.
// 캠페인 저장(yahaeng.ch)과 따로 둔다. 바뀐 것이 있으면 2초에 한 번 쓴다. 다시 자유 모드를 열면 이어서 시작한다
const FREE_SAVE = 'yahaeng.free1';
function loadFreeProgress() {
  if (!STAGE.freeMode) return; let d = null;
  try { d = JSON.parse(localStorage.getItem(FREE_SAVE) || 'null'); } catch (e) {}
  if (!d) return;
  S.cash = Math.max(0, d.cash | 0); S.jobN = d.jobN | 0; S.hitN = d.hitN | 0; S.rep = d.rep && typeof d.rep === 'object' ? d.rep : {}; S.freeLoaded = true;
  if (!STAGE.noPrompts && (S.cash || S.jobN)) toast(`이어서 · 수입 ${S.cash}만`, 2, 'good');
}
function saveFreeProgress(force) {
  if (!STAGE.freeMode || !S) return;
  if (!force && S.t - (S.freeSaveT || 0) < 2) return; S.freeSaveT = S.t;
  const d = { cash: S.cash | 0, jobN: S.jobN | 0, hitN: S.hitN | 0, rep: S.rep || {} }, k = JSON.stringify(d);
  if (k === S.freeSaveK) return; S.freeSaveK = k;
  try { localStorage.setItem(FREE_SAVE, k); } catch (e) {}
}
// 미니맵 점: 지금 할 일(노란 고리), 울리는 공중전화(초록 깜빡임), 중고차 매매(파란 네모). T: 월드→미니맵
function drawMiniCity(x, T) {
  if (!STAGE.cityLife) return;
  const blink = Math.floor(S.t * 4) % 2 === 0;
  if (S.dealer) { const D = S.dealer; x.fillStyle = '#6aa8ff'; x.fillRect(T((D.lot[0] + D.lot[2]) / 2) - 3, T((D.lot[1] + D.lot[3]) / 2) - 3, 6, 6); }
  if (S.ringPhone && blink) { x.fillStyle = '#7fe0a8'; x.beginPath(); x.arc(T(S.ringPhone.x), T(S.ringPhone.y), 3.5, 0, TAU); x.fill(); }
  if (S.ev && !S.ev.done && dist(S.ev.x, S.ev.y, S.player.x, S.player.y) < 1800 && blink) { x.fillStyle = '#ff5a46'; x.beginPath(); x.arc(T(S.ev.x), T(S.ev.y), 3.5, 0, TAU); x.fill(); }
  const g = (S.job || S.hit) && hitGoal();
  if (g && g.x != null) { x.strokeStyle = '#ffd066'; x.lineWidth = 2; x.beginPath(); x.arc(T(g.x), T(g.y), blink ? 6 : 4.5, 0, TAU); x.stroke(); }
}
