// ---------------------------------------------------------------- 메탈기어식 손맛: 붙잡아 심문 · 사장님 무전 · 조직원 무전 점검 · 칭호

// ---- 심문 (메탈기어 솔리드 3·5식): 조직원을 붙잡은 채 [도구](X)를 누르면 아는 것을 실토한다
// 의뢰 자료 STAGE.interrogate = [{ gives, learn, say }] 중 아직 모르는 것 하나. 다 알면 근처 조직원 위치를 분다(30초 동안 표시)
const INTERRO_T = 1.4;
function canInterrogate() { const g = S.player.captive; return !!(g && !g.target && !g.civ && !g.dog && !g.questioned); }
function interrogate() {
  const P = S.player, g = P.captive; if (!g) return;
  if (g.target || g.civ || g.dog) { toast('이 사람은 아는 게 없어 보인다', 1.6); return; }
  if (g.questioned) { toast('더 아는 게 없다 — [행동] 처치 · [특수] 기절', 1.8); return; }
  g.questioned = true; g.captT = Math.max(0, (g.captT || 0) - 2.5); S.stats.interro = (S.stats.interro || 0) + 1;  // 겁먹어서 잠깐 덜 버둥거린다
  play('cloth', 0.4); P.strikeT = Math.max(P.strikeT || 0, 0.2);
  const it = (STAGE.interrogate || []).find(i => !S.learned.includes(i.learn) && !(i.gives && P.keys[i.gives]));
  if (it) {
    gsay(g, it.say, 3.2); setTimeout(() => { if (!S || S.over) return; if (it.gives) { P.keys[it.gives] = true; P.hasKey = true; } S.learned.push(it.learn); hudCache.objH = null; toast('실토했다 — ' + it.learn, 3.2, 'good'); }, INTERRO_T * 1000);
  } else {
    const near = S.guards.filter(o => o !== g && !o.civ && !o.dog && !o.target && !['DEAD', 'CAPTIVE'].includes(o.state) && dist(o.x, o.y, g.x, g.y) < 1100);
    gsay(g, near.length ? ['알았어, 말할게! 저쪽에 우리 애들이…', '살려 줘! 다 불게! 몇 명 더 있어!', '나 혼자 아니야, 저기도 있다고!'][g.id % 3] : '나, 나밖에 없어! 진짜야!', 3);
    setTimeout(() => { if (!S || S.over) return; near.forEach(o => o.tagT = S.t + 30); if (near.length) toast(`실토했다 — 근처 조직원 ${near.length}명 위치 표시 (30초)`, 2.8, 'good'); }, INTERRO_T * 1000);
  }
  bossRadio('interro');
  hint('interro', '붙잡은 조직원에게 [도구]로 심문 — 비번·위치를 분다. 다 듣고 나면 [행동] 처치 · [특수] 기절');
}
// 실토로 위치가 드러난 조직원: 벽·지붕 너머에서도 머리 위 노란 표시
function drawTagged() {
  const P = S.player, k = Math.max(1, 0.95 / SCALE);
  for (const g of S.guards) {
    if (!(g.tagT > S.t) || g.state === 'DEAD' || g.state === 'CAPTIVE') continue;
    const other = flOf(g) !== flOf(P), y = g.y - 40 * k, b = 3 * Math.sin(S.t * 5 + g.id);
    ctx.save(); ctx.globalAlpha = other ? 0.55 : 0.95; ctx.fillStyle = '#ffd65a'; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(g.x, y + 9 * k + b); ctx.lineTo(g.x - 8 * k, y - 4 * k + b); ctx.lineTo(g.x + 8 * k, y - 4 * k + b); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,90,.7)'; ctx.lineWidth = 2 * k; ctx.setLineDash([5 * k, 4 * k]); ctx.beginPath(); ctx.arc(g.x, g.y, 22 * k, 0, TAU); ctx.stroke(); ctx.restore();
    if (other) tag(g.x, y - 14 * k, flOf(g) > flOf(P) ? '위층' : '아래층', '#ffd65a', 0.8);
  }
}

// ---- 사장님 무전 (메탈기어의 무전 동료식): 일이 생기면 짧게 한마디. 연습판에서는 하지 않는다
const BOSS_RADIO = {
  first: ['하나 처리했으면 조용히 치워. 청소비 따로 없다.', '시작했구나. 시체는 꼭 숨겨라.'],
  streak: ['연달아? 일당은 똑같다.', '그렇게 바쁘게 할 거면 시급으로 받지 그랬냐.', '손이 빠르네. 계산은 느리게 해 줄게.'],
  body: ['그걸 거기 두면 어떡해. 누가 봐도 시체잖아.', '들켰다. 숨겨 놓으라고 했지.', '시체 하나에 동네가 시끄러워진다.'],
  alert: ['소란 피우지 말라니까. 일단 숨어.', '뛰어! 아니, 뛰지 말고 숨어!', '들켰으면 어디든 들어가. 쓰레기통이라도.'],
  calm: ['조용해졌다. 다시 해 봐.', '이제 좀 낫네. 천천히.'],
  target: ['됐다. 이제 조용히 나와.', '끝났으면 얼른 나와. 택시비는 안 준다.'],
  accident: ['사고? 사고 좋지. 보험도 안 나오고.', '깔끔하네. 이래야 뒷말이 없지.'],
  interro: ['심문은 짧게. 시간이 돈이다.', '물어볼 거 다 물어봐. 공짜 정보다.'],
  civ: ['동네 사람은 건드리지 말랬지. 병원비 네가 내.', '주민은 왜! 그건 일에 없던 거다.'],
  check: ['무전 점검 시간이다. 쓰러진 놈 자리에 누가 가 볼 거야.', '대답 없는 자리가 있으면 놈들이 확인하러 간다. 조심해.']
};
function bossRadio(ev, force) {
  if (!S || S.over || !STAGE || STAGE.tutorial) return;
  const L = BOSS_RADIO[ev]; if (!L) return;
  if (!force && S.t < (S.radioNext || 0)) return;
  S.radioNext = S.t + 14; S.radioN = (S.radioN || 0) + 1;
  toast('사장님: ' + L[(S.radioN + ev.length) % L.length], 3.2, 'radio');
}

// ---- 조직원 무전 점검 (메탈기어 솔리드 2식): 일정 시간마다 조직원들이 무전으로 자리를 확인한다.
// 쓰러진(죽었거나 기절한) 조직원은 대답하지 못한다 → 가까운 조직원이 그 자리를 확인하러 가고, 경계가 오른다. 한 번 빠진 자리는 다시 세지 않는다
// 의뢰 자료 STAGE.radioCheck: 간격(초). 없으면 구역 판(연습 제외)은 70초
const RADIO_WARN = 8;
function radioEvery() { return STAGE.radioCheck != null ? STAGE.radioCheck : (STAGE.zones && !STAGE.tutorial ? 70 : 0); }
function updateRadioCheck(dt) {
  const every = radioEvery(); if (!every || S.over) return;
  if (S.rcT == null) S.rcT = every;
  S.rcT -= dt;
  if (S.rcT <= RADIO_WARN && !S.rcWarned) { S.rcWarned = true; if (S.guards.some(g => isCrew(g) && g.state === 'DEAD' && !g.rcMissed)) { toast(`${RADIO_WARN}초 뒤 조직원 무전 점검 — 쓰러진 자리는 대답이 없다`, 2.8, 'warn'); bossRadio('check'); } }
  if (S.rcT > 0) return;
  S.rcT = every; S.rcWarned = false;
  const missing = S.guards.filter(g => isCrew(g) && (g.state === 'DEAD' || g.state === 'CAPTIVE') && !g.rcMissed);
  if (!missing.length) return;
  missing.forEach(g => { g.rcMissed = true; });
  play('call', 0.45);
  // 대답 없는 자리마다 가장 가까운 조직원 하나가 확인하러 간다 (그 자리 = 원래 지키던 곳)
  const sent = new Set();
  for (const m of missing.slice(0, 3)) {
    const home = m.route && m.route[0] ? m.route[0] : { x: m.x, y: m.y }; let best = null, bd = 1e9;
    for (const g of S.guards) { if (!isCrew(g) || sent.has(g) || g.elite || ['DEAD', 'CAPTIVE', 'ALERT', 'FUSE'].includes(g.state) || flOf(g) !== flOf(m)) continue; const d = dist(g.x, g.y, home.x, home.y); if (d < bd) { bd = d; best = g; } }
    if (best) { sent.add(best); endChat(best); best.act = null; goSuspicious(best, home.x, home.y, 6); best.why = 'radio'; gsay(best, ['어이, 대답 좀 해 봐. …가 볼게.', '무전 안 받네. 확인하고 올게.', '또 졸고 있나. 가 본다.'][best.id % 3], 2.4); }
  }
  setAlert(1, 30, `무전 점검 — ${missing.length}명이 대답하지 않는다. 확인하러 간다`);
}
const isCrew = g => !!g && !g.civ && !g.dog && !g.target && !g.dropped;

// ---- 칭호 (메탈기어의 동물 칭호식): 등급과 따로, 어떻게 놀았는지 한 단어
function playTitle(st) {
  const crew = st.crewKills || 0, ko = st.ko || 0, streak = st.maxStreak || 0;
  if (st.extraKills > 0) return ['민폐', '동네 사람까지 건드렸다'];
  if (!st.kills && !ko) return ['유령', '아무도 손대지 않았다'];
  if (streak >= 4) return ['도미노', `${streak}명을 숨 돌릴 틈 없이 연달아 처치`];
  if ((st.accidents || 0) > 0 && crew <= 1) return ['사고 전문', '사고처럼 보이게 끝냈다'];
  if (crew >= 8 && !st.bodies) return ['청소부', `${crew}명을 처치하고 시체는 하나도 안 들켰다`];
  if (crew >= 8) return ['도살자', `${crew}명 처치 — 다음엔 좀 치우자`];
  if (ko > crew) return ['자장가', '죽이기보다 재웠다'];
  if (st.detected >= 3) return ['시끄러운 손님', `${st.detected}번 들켰다`];
  if ((st.interro || 0) >= 2) return ['취조관', `${st.interro}명을 심문했다`];
  return ['해결사', '무난하게 끝냈다'];
}
