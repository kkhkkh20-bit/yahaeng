// ---------------------------------------------------------------- 도시 안 의뢰 (GTA식): 공중전화에서 의뢰를 받으면 큰 도시 어딘가에 표적과 경호원이 나타나 거리를 돈다.
// 별도 의뢰 맵으로 넘어가지 않는다. 조용히 등 뒤에서 처치하든, 차로 들이받든, 들켜서 싸우고 도망치든 같은 도시 안에서 끝난다.
// 표적은 의뢰 맵의 target 표시를 쓰지 않는다(탈출·의뢰 완료 로직이 켜지지 않게). g.hit 으로만 구분한다.
const HIT_NAMES = ['문태식', '오정길', '백상만', '한두철', '유창배', '노기석', '서판수', '장덕구'];
const HIT_PAY = 300, HIT_QUIET_BONUS = 200;  // 만 원. 수배 없이 끝내면 보너스 (차를 사고 가게에서 쓸 만큼)

function hitsInit() {
  S.hit = null; S.hitN = 0; S.cash = S.cash || 0;
  // 부스는 보도 바깥 가장자리(차도 쪽 연석)에 선다: 보도를 걷는 사람 길을 막지 않고, 차로에도 닿지 않는다
  S.phones = (STAGE.phones || []).map(([tx, ty]) => ({ x: tx * TILE + TILE + BOOTH_EDGE, y: tc(ty) }));
}
// 공중전화 부스: 폭 32 · 깊이 26 (발밑), 유리벽 높이 56
const BOOTH_EDGE = 6, BOOTH_HW = 16, BOOTH_N = 14, BOOTH_S = 12;
// 지금 맡은 의뢰가 없을 때, 가까운 공중전화에서 [행동]
function hitAction() {
  const P = S.player; if (P.car || P.booth || P.trav) return null;
  for (const p of S.phones || []) if (dist(P.x, P.y, p.x, p.y) < 60) return { k: 'hitPhone', p, at: { x: p.x, y: p.y - 40 }, label: '공중전화' };
  return null;
}
// 부스에 들어가 수화기를 든다 → 까마귀와 통화(대사) → 끊으면 의뢰가 시작되고 부스에서 나온다
function enterBooth(p) {
  const P = S.player; if (P.booth || P.car || P.trav) return;
  // 보도 쪽(서쪽) 문 앞까지 걸어가 → 문을 밀고 → 안으로 들어서 전화기를 본다
  const door = { x: p.x - BOOTH_HW - 12, y: p.y + 4 }, inside = { x: p.x, y: p.y + 2 }, tWalk = Math.min(0.5, dist(P.x, P.y, door.x, door.y) / 200), dur = tWalk + 0.5;
  P.moving = false; P.vx = P.vy = 0; P.boothOut = door; p.doorT = S.t + tWalk;
  startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: door.x, y: door.y, f: tWalk / dur }, { x: door.x + 4, y: door.y, f: (tWalk + 0.15) / dur }, { x: inside.x, y: inside.y, f: 1 }], dur,
    phases: [{ to: 1, pose: 'walk' }], face: -Math.PI / 2 });
  after(tWalk, () => play('click', 0.6));  // 문 미는 소리
  P.trav.end = () => {
    P.booth = p; P.x = inside.x; P.y = inside.y; P.a = -Math.PI / 2; P.moving = false;
    play('metal', 0.25, 1.9);  // 수화기 드는 소리
    const ringing = S.ringPhone === p; if (ringing) { S.ringPhone = null; S.ringNext = S.t + 25; }
    const plan = !ringing || S.hit || S.job || S.wanted > 0 ? null : planJob(), lines = ringing ? (jobLines(plan) || phoneLines(null)) : [['hero', ['신호음뿐이다. 걸 데도 없다.', '...끊긴 전화다.'][(S.t | 0) % 2]]];  // 암살·차 가져오기·배달·경주 중 하나
    S.phoneCall = true;
    say(lines, true, () => { S.phoneCall = false; play('click', 0.5); if (plan) startJob(plan); leaveBooth(); });
  };
}
function leaveBooth() {
  const P = S.player, p = P.booth; if (!p) return;
  // 수화기를 걸고 → 돌아서 문을 밀고 → 보도로 걸어 나온다
  const out = { x: p.x - BOOTH_HW - 22, y: p.y + 4 }; p.doorT = S.t + 0.2;
  P.booth = null; P.x = p.x; P.y = p.y + 2;
  startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: p.x - 4, y: p.y + 4, f: 0.35 }, { x: out.x, y: out.y, f: 1 }], dur: 0.55, phases: [{ to: 1, pose: 'walk' }], face: Math.PI });
  after(0.2, () => play('click', 0.5));
}
const DIR8 = ['동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽', '북쪽', '북동쪽'];
// 울리는 공중전화: 일이 없을 때 가끔 내 둘레(멀지 않은) 부스 하나가 운다. 받으면 까마귀다. 40초 동안 안 받으면 끊긴다
function updatePhoneRing(dt) {
  const P = S.player;
  if (S.ringPhone) {
    const p = S.ringPhone; if (S.t - S.ringT0 > 40 || S.hit || S.job) { S.ringPhone = null; S.ringNext = S.t + 12; return; }
    const ph = (S.t - S.ringT0) % 3;  // 따르릉-따르릉, 쉼
    if ((ph < 0.4 || (ph > 0.6 && ph < 1.0)) && (S.ringBeat || 0) <= S.t) { S.ringBeat = S.t + 0.05; ringTone(clamp(1 - dist(P.x, P.y, p.x, p.y) / 1400, 0, 1)); }
    return;
  }
  if (S.hit || S.job || S.wanted > 0 || S.t < (S.ringNext ?? 6)) return;
  const near = (S.phones || []).filter(p => { const d = dist(P.x, P.y, p.x, p.y); return d > 250 && d < 1300; });
  if (!near.length) { S.ringNext = S.t + 4; return; }
  S.ringPhone = near[(Math.random() * near.length) | 0]; S.ringT0 = S.t;
}
// 전화벨: 두 높이를 빠르게 번갈아 (옛 전화기 벨)
function ringTone(vol) {
  if (!AC || !master || vol <= 0.02 || muted) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.setValueAtTime(Math.floor(t * 40) % 2 ? 1250 : 1580, t);
  g.gain.setValueAtTime(0.025 * vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.06);
}
function phoneLines(plan) {
  if (S.hit) return [['master', `${S.hit.name} 일부터 끝내. 아직 숨 쉬고 있다더군.`], ['hero', '...알았어.']];
  if (S.job) return [['master', '맡은 일부터 끝내고 걸어.'], ['hero', '...알았어.']];
  if (S.wanted > 0) return [['master', '지금 경찰이 너를 쫓고 있잖나. 이 번호로 다시 걸지 마.'], ['master', '열기부터 식혀. 그다음에 일을 주지.']];
  if (!plan) return [['master', '오늘은 일이 없다. 끊어.']];
  const P = S.player, a = Math.atan2(plan.cy - P.y, plan.cx - P.x), dir = DIR8[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  const river = STAGE.river && (P.y < tc(STAGE.river.y)) !== (plan.cy < tc(STAGE.river.y)) ? '청계천 건너 ' : '';
  const where = `${river}${dir}${plan.sign ? `, '${plan.sign}' 간판 걸린 블록` : ' 블록'}`;
  const esc = plan.escorts > 1 ? '경호원 둘이 바짝 붙어 다닌다. 정면으로 들어가면 시끄러워질 거다.' : '경호원 하나가 붙어 다닌다. 눈치 빠른 놈이니 등 뒤를 잡아.';
  return [['master', '올빼미군. 일이 하나 들어왔다.'], ['master', `이름은 ${plan.name}. ${where}을 돌고 있다.`], ['master', esc],
    ['master', `처리하면 ${HIT_PAY}만. 경찰 안 붙게 조용히 끝내면 ${HIT_QUIET_BONUS}만 더 얹어 주지.`], ['hero', '알았다. 끊지.']];
}
// 블록 둘레 보도를 도는 길 (도시 행인과 같은 규칙)
const hitBlock = (bx, by) => STAGE.blockOrigin ? STAGE.blockOrigin(bx, by) : [4 + bx * 20, 4 + by * 20], hitSpan = () => (STAGE.blockSize || 16) - 1;
function hitRing(bx, by, rev) {
  const [x0, y0] = hitBlock(bx, by), e = hitSpan(), c = [[x0, y0, 2.5], [x0 + e, y0, 0.6], [x0 + e, y0 + e, 3], [x0, y0 + e, 0.6]];
  return rev ? c.slice().reverse() : c;
}
// 의뢰 고르기 (아직 사람을 세우지 않는다): 표적 이름 · 블록 · 경호원 수 · 그 블록의 가게 간판
function planHit() {
  const P = S.player, [BX, BY] = STAGE.blockCount || [(STAGE.roadsX || []).length - 1, (STAGE.roadsY || []).length - 1];
  // 나에게서 적당히 먼 블록 (화면 밖, 너무 멀지 않게)
  const blocks = [];
  for (let by = 0; by < BY; by++) for (let bx = 0; bx < BX; bx++) { const [ox, oy] = hitBlock(bx, by), cx = tc(ox + hitSpan() / 2), cy = tc(oy + hitSpan() / 2), d = dist(P.x, P.y, cx, cy); if (d > 1100 && d < 3600) blocks.push([bx, by, d]); }
  if (!blocks.length) return null;
  const [bx, by] = blocks[(Math.random() * blocks.length) | 0], rev = Math.random() < 0.5, route = hitRing(bx, by, rev);
  const [ox, oy] = hitBlock(bx, by), e = hitSpan(), inB = b => b.x0 >= ox && b.x1 <= ox + e && b.y0 >= oy && b.y1 <= oy + e;
  const shop = BLD.find(b => b.kind === 'shop' && b.signs && (b.signs[0] || '').trim() && inB(b));
  return { bx, by, route, name: HIT_NAMES[S.hitN % HIT_NAMES.length], escorts: 1 + (S.hitN >= 2 ? 1 : 0), cx: tc(ox + e / 2), cy: tc(oy + e / 2), sign: shop ? shop.signs[0].trim() : '' };
}
function takeHit() { if (!S.hit && !S.wanted) { const plan = planHit(); if (plan) startHit(plan); } }
function startHit(plan) {
  if (S.hit) return;
  const P = S.player, { route, name } = plan;
  const tIdx = S.guards.length, t = makeGuard({ kind: 't', route, radio: false }, tIdx); t.hit = true; t.hitName = name; t.fac = 'A'; S.guards.push(t);
  const escorts = [];
  for (let k = 0; k < plan.escorts; k++) {
    const g = makeGuard({ kind: k ? 'g1' : 'g2', route: [route[0]], follow: tIdx, radio: false }, S.guards.length); g.fac = 'A'; g.hitEscort = true;
    g.x += (k ? -1 : 1) * 30; g.y += 26; S.guards.push(g); escorts.push(g);
  }
  setLayer(0); for (const g of [t, ...escorts]) buildRouteLine(g); setLayer(flOf(P));
  if (PR) prWarm([t, ...escorts].map(charOf), true);
  S.hit = { g: t, escorts, name, t0: S.t, wantedAtStart: S.wanted };
  if (!STAGE.noPrompts) toast(`의뢰: ${name} 처치`, 2.4, 'good');
}
// 부스는 사람이 지나가지 못한다 (안에 든 나만 예외)
function boothBlock() {
  const P = S.player;
  for (const p of S.phones || []) {
    const x0 = p.x - BOOTH_HW, x1 = p.x + BOOTH_HW, y0 = p.y - BOOTH_N, y1 = p.y + BOOTH_S;
    for (const o of [P, ...S.guards]) {
      if (o === P ? P.booth || P.car || P.z || flOf(P) : o.state === 'DEAD' || o.x < 0 || flOf(o) || o.z) continue;
      if (o.x < x0 - BODY_R || o.x > x1 + BODY_R || o.y < y0 - BODY_R || o.y > y1 + BODY_R) continue;
      const push = [[x0 - BODY_R - o.x, 0], [x1 + BODY_R - o.x, 0], [0, y0 - BODY_R - o.y], [0, y1 + BODY_R - o.y]].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0];
      o.x += push[0]; o.y += push[1];
    }
  }
}
function hitsUpdate(dt) {
  boothBlock(); updatePhoneRing(dt || 1 / 60);
  const P = S.player; if (P.booth) { P.x = P.booth.x; P.y = P.booth.y + 2; P.moving = false; }
  jobsUpdate(dt || 1 / 60); cityEventsUpdate(dt || 1 / 60);
  saveFreeProgress();
  const h = S.hit; if (!h) return;
  const g = h.g;
  if (!S.guards.includes(g)) { S.hit = null; return; }
  if (g.state === 'DEAD' && !g.unconscious) {
    const quiet = !S.wanted, pay = HIT_PAY + (quiet ? HIT_QUIET_BONUS : 0);
    S.cash = (S.cash || 0) + pay; S.hitN++; S.hit = null;
    play('bell', 0.6); if (!STAGE.noPrompts) toast(`의뢰 완료 · ${pay}만${quiet ? ' (조용히)' : ''}`, 2.6, 'good');
    if (typeof feedbackPulse === 'function') feedbackPulse(document.querySelector('#hud .obj'), 'loot');
  }
}
function hitGoal() {
  const h = S.hit, P = S.player, money = `수입 ${S.cash || 0}만`;
  if (S.job) return jobGoal(money);
  if (!h) { const e = eventGoal(money); if (e) return e; }
  if (!h) {
    const p = S.ringPhone; if (!p) return { text: `거리를 돈다 · ${money}`, where: '', x: null, y: null, fl: 0 };
    return { text: `울리는 공중전화 받기 · ${money}`, where: '', x: p.x, y: p.y, fl: 0 };
  }
  const g = h.g;
  return { text: (g.unconscious ? `${h.name} 기절 — 숨통을 끊어라` : `${h.name} 처치`) + ` · ${money}`, where: '', x: g.x, y: g.y, fl: flOf(g), g };
}
// 공중전화 부스 (위에서 비스듬히 본 유리 상자: 은색 기둥 · 유리벽 · 안쪽 벽의 파란 전화기 · 빨간 지붕 띠)와 표적 표시
// layer 'world': 조명을 받는 부스 · 'ui': 어둠 위 — 안에 든 나를 덮는 앞 유리, 부스 안 불빛, 표적 고리
function drawBooth(p, front) {
  const x = p.x, y = p.y, H = 56, top = y - H, inUse = S.player.booth === p;
  const dOpen = p.doorT ? Math.max(0, 1 - Math.abs(S.t - p.doorT) / 0.35) : 0;  // 문 열고 닫힘 (0~1)
  if (dOpen > 0 && !front) { ctx.fillStyle = 'rgba(160,205,232,.4)'; ctx.fillRect(x - BOOTH_HW - 10 * dOpen, top + 10, 4 + 10 * dOpen, H - 2); ctx.fillStyle = '#c3cbd2'; ctx.fillRect(x - BOOTH_HW - 10 * dOpen, top + 10, 2, H - 2); }  // 서쪽 문이 바깥으로 열린다
  if (front) {  // 앞 유리와 앞 기둥만 (안에 든 사람 위로)
    ctx.fillStyle = 'rgba(160,205,232,.22)'; ctx.fillRect(x - 13, top + 6, 26, H + 4);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 10, top + 9, 3, H - 6);
    ctx.fillStyle = '#c3cbd2'; ctx.fillRect(x - BOOTH_HW, top + 4, 3, H + 8); ctx.fillRect(x + BOOTH_HW - 3, top + 4, 3, H + 8); ctx.fillRect(x - BOOTH_HW, y + 8, BOOTH_HW * 2, 4);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 11, 20, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2e3742'; ctx.fillRect(x - BOOTH_HW, top + 4, BOOTH_HW * 2, H + 8);          // 안쪽 벽
  ctx.fillStyle = '#1f5fae'; ctx.fillRect(x - 8, top + 16, 16, 20);                               // 전화기
  ctx.fillStyle = '#9fc4ea'; ctx.fillRect(x - 6, top + 18, 12, 5);                                // 화면
  ctx.fillStyle = '#d7e3ef'; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x - 5 + c * 4, top + 25 + r * 3, 2, 2);
  if (!inUse) { const j = S.ringPhone === p && (S.t - S.ringT0) % 3 < 1 ? Math.sin(S.t * 60) * 1.5 : 0; ctx.fillStyle = '#121519'; ctx.fillRect(x + 5 + j, top + 17, 3, 15); }  // 걸려 있는 수화기 (울리면 떨린다)
  ctx.fillStyle = 'rgba(160,205,232,.28)'; ctx.fillRect(x - 13, top + 6, 26, H + 4);              // 유리
  ctx.fillStyle = '#c3cbd2'; ctx.fillRect(x - BOOTH_HW, top + 4, 3, H + 8); ctx.fillRect(x + BOOTH_HW - 3, top + 4, 3, H + 8); ctx.fillRect(x - BOOTH_HW, y + 8, BOOTH_HW * 2, 4);
  ctx.fillStyle = '#d23a2e'; ctx.fillRect(x - BOOTH_HW - 2, top - 4, BOOTH_HW * 2 + 4, 9);         // 지붕 띠
  ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.arc(x - 4, top + 1, 2, 0, TAU); ctx.arc(x + 4, top + 1, 2, 0, TAU); ctx.fill(); ctx.fillRect(x - 4, top - 1, 8, 2);  // 수화기 무늬
}
function drawHits(layer) {
  if (flOf(S.player) || S.player.z > 0 || S.player.wire) return;
  for (const p of S.phones || []) {
    if (!inView(p.x, p.y, 80)) continue;
    if (layer === 'ui') {
      const ring = S.ringPhone === p && Math.floor((S.t - S.ringT0) * 8) % 2 === 0 && (S.t - S.ringT0) % 3 < 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = ring ? 'rgba(255,236,190,.28)' : 'rgba(255,236,190,.10)'; ctx.fillRect(p.x - 13, p.y - 50, 26, 58);
      if (ring) { ctx.fillStyle = 'rgba(255,90,70,.5)'; ctx.fillRect(p.x - BOOTH_HW - 2, p.y - 60, BOOTH_HW * 2 + 4, 9); } ctx.restore();  // 부스 안 형광등 · 울릴 때 지붕 띠가 깜빡인다
      const P = S.player; if (P.booth === p || (P.trav && Math.abs(P.x - p.x) < BOOTH_HW && Math.abs(P.y - p.y) < 14)) drawBooth(p, true);
      if (!STAGE.noPrompts && !S.hit && !S.job) { const pu = .5 + .4 * Math.sin(S.t * 4); ctx.strokeStyle = `rgba(80,220,170,${pu})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 24, 0, TAU); ctx.stroke(); infoTag(p.x, p.y + 22, '공중전화', '#8fe0c4', .9); }
      continue;
    }
    drawBooth(p, false);
  }
  if (layer !== 'ui') return;
  drawEvents(); drawJobs();
  const h = S.hit; if (!h || h.g.state === 'DEAD' && !h.g.unconscious) return;
  const g = h.g; if (flOf(g) !== flOf(S.player) || !inView(g.x, g.y, 60)) return;
  const pu = .55 + .35 * Math.sin(S.t * 5);
  ctx.strokeStyle = `rgba(232,71,60,${pu})`; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  if (!STAGE.noPrompts) infoTag(g.x, g.y - 60, h.name + ' · 표적', '#ff9a86', .95);
}
