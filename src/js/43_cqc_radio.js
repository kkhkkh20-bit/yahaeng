// ---------------------------------------------------------------- 메탈기어식 손맛: 붙잡아 심문 · 까마귀 무전 · 조직원 무전 점검 · 칭호

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
    if (!(g.tagT > S.t) || g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== flOf(P)) continue;  // 다른 층은 그 층에 가야 보인다
    const other = flOf(g) !== flOf(P), y = g.y - 40 * k, b = 3 * Math.sin(S.t * 5 + g.id);
    ctx.save(); ctx.globalAlpha = other ? 0.55 : 0.95; ctx.fillStyle = '#ffd65a'; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(g.x, y + 9 * k + b); ctx.lineTo(g.x - 8 * k, y - 4 * k + b); ctx.lineTo(g.x + 8 * k, y - 4 * k + b); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,90,.7)'; ctx.lineWidth = 2 * k; ctx.setLineDash([5 * k, 4 * k]); ctx.beginPath(); ctx.arc(g.x, g.y, 22 * k, 0, TAU); ctx.stroke(); ctx.restore();
  }
}

// ---- 까마귀(의뢰인) 무전 (메탈기어의 무전 동료식): 일이 생기면 짧게 한마디. 연습판에서는 하지 않는다
const BOSS_RADIO = {
  first: ['첫 처치 확인. 시체는 반드시 숨겨라.', '시작됐군. 시체를 남기지 마.'],
  streak: ['연속 처치. 주변부터 확인해.', '속도가 빠르다. 흔적 관리에 신경 써.', '좋다. 하지만 서두르지 마.'],
  body: ['시체가 발견됐다. 경계가 올라간다.', '시체를 들켰다. 다음부턴 숨겨.', '발견된 시체 때문에 순찰이 늘 거다.'],
  alert: ['노출됐다. 시야를 끊고 숨어.', '들켰다. 숨어서 기다려.', '추격이 붙었다. 숨을 곳을 찾아.'],
  calm: ['경계가 풀렸다. 다시 시작해.', '조용해졌다. 천천히 움직여.'],
  target: ['표적 제거 확인. 이탈해.', '확인했다. 조용히 빠져나와.'],
  accident: ['사고로 처리됐다. 깔끔하다.', '사고로 보인다. 좋은 판단이다.'],
  interro: ['심문은 짧게. 오래 붙잡고 있으면 빠져나간다.', '얻을 수 있는 건 다 얻어.'],
  civ: ['민간인 피해가 발생했다. 표적만 노려.', '민간인은 작전 대상이 아니다.'],
  blood: ['핏자국이 발견됐다. 수색이 시작된다.', '피를 남겼군. 놈들이 따라간다.'],
  check: ['곧 조직원 무전 점검이다. 쓰러진 자리는 응답이 없을 거다.', '응답 없는 자리가 있으면 누군가 확인하러 온다. 대비해.']
};
function bossRadio(ev, force) {
  if (!S || S.over || !STAGE || STAGE.tutorial) return;
  const L = BOSS_RADIO[ev]; if (!L) return;
  if (!force && S.t < (S.radioNext || 0)) return;
  S.radioNext = S.t + 14; S.radioN = (S.radioN || 0) + 1;
  toast('까마귀: ' + L[(S.radioN + ev.length) % L.length], 3.2, 'radio');
}

// ---- 조직원 무전 점검 (메탈기어 솔리드 2식): 일정 시간마다 조직원들이 무전으로 자리를 확인한다.
// 쓰러진(죽었거나 기절한) 조직원은 대답하지 못한다 → 가까운 조직원이 그 자리를 확인하러 가고, 경계가 오른다. 한 번 빠진 자리는 다시 세지 않는다
// 의뢰 자료 STAGE.radioCheck: 간격(초). 없으면 구역 판(연습 제외)은 70초
const RADIO_WARN = 8;
function radioEvery() { return STAGE.radioCheck != null ? STAGE.radioCheck : (STAGE.zones && !STAGE.tutorial ? 55 : 0); }
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
  if (st.extraKills > 0) return ['오점', '민간인까지 건드렸다'];
  if (!st.kills && !ko) return ['유령', '아무도 손대지 않았다'];
  if (streak >= 4) return ['도미노', `${streak}명을 숨 돌릴 틈 없이 연달아 처치`];
  if ((st.accidents || 0) > 0 && crew <= 1) return ['사고 전문', '사고처럼 보이게 끝냈다'];
  if (crew >= 8 && !st.bodies) return ['청소부', `${crew}명을 처치하고 시체는 하나도 안 들켰다`];
  if (crew >= 8) return ['도살자', `${crew}명 처치 — 다음엔 좀 치우자`];
  if (ko > crew) return ['제압', '처치보다 기절이 많았다'];
  if (st.detected >= 3) return ['노출', `${st.detected}번 들켰다`];
  if ((st.interro || 0) >= 2) return ['취조관', `${st.interro}명을 심문했다`];
  return ['전문가', '무난하게 끝냈다'];
}
