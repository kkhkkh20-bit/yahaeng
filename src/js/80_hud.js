// ---------------------------------------------------------------- HUD
const $ = id => document.getElementById(id);
const hud = { tool: $('btnTool'), pips: [...document.querySelectorAll('#alertPips i')], obj: $('objective'), objT: $('objTitle'), light: $('lightFill'), lightLbl: $('lightLbl'), mode: $('modeLbl'), alarm: $('alarmChip'), act: $('btnAct'), carry: $('btnCarry'), kills: $('killsLbl'), layer: $('layerLbl'), hp: $('hpPips') };
let hudCache = {};
function setText(el, key, v) { if (hudCache[key] !== v) { hudCache[key] = v; el.textContent = v; } }
// 미니맵: 건물·골목, 나, 목표, 탈출구, 내가 볼 수 있는 사람만
let miniBase = null, miniT = 0;
function buildMiniBase(mw = 200, mh = 140) {
  const s = Math.min(mw / MW, mh / MH), c = document.createElement('canvas'); c.width = Math.ceil(MW * s); c.height = Math.ceil(MH * s);
  const x = c.getContext('2d');
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const ch = G0[ty][tx], b = bldAt(tx, ty);
    x.fillStyle = b >= 0 ? (ch === '#' || ch === 'N' ? '#6a7486' : '#3e4758') : ch === '#' ? '#4a5262' : ch === '=' ? '#2c3343' : ch === ',' ? '#2a2e28' : ch === 'g' ? '#1f3020' : ch === 'd' ? '#3a3024' : ch === 'x' ? '#6a8aa0' : ch === 'p' ? '#28405a' : ch === 'm' ? '#5d636e' : ch === 'r' ? '#4a463e' : ch === 'J' ? '#3a3e48' : ch === '~' ? '#1e3a5a' : ch === 'B' || ch === 'T' ? '#2f4a34' : ch === 'P' ? '#8a8f98' : ch === 'M' ? '#6a3a3a' : ch === 'A' ? '#5a6070' : '#181d28';
    x.fillRect(tx * s, ty * s, Math.ceil(s), Math.ceil(s));
  }
  S.wires.forEach(w => { x.strokeStyle = 'rgba(160,170,190,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(w.a.x / TILE * s, w.a.y / TILE * s); x.lineTo(w.b.x / TILE * s, w.b.y / TILE * s); x.stroke(); });
  c.s = s; return c;
}
function drawMini() {
  const cv = document.getElementById('mini'); if (!cv || !S) return;
  if (S.t - miniT < 0.12 && S.t >= miniT) return; miniT = S.t;
  { const tp = document.querySelector('#hud .top'), hc = document.getElementById('hintCard'); if (tp) { const tb = Math.round(tp.getBoundingClientRect().bottom); if (tb !== drawMini.tb) { drawMini.tb = tb; document.documentElement.style.setProperty('--topb', tb + 'px'); } }
    const v = S.entrySel ? 'hidden' : ''; if (cv.style.visibility !== v) { cv.style.visibility = v; if (hc) hc.style.visibility = v; } }
  // 주인공(과 행동 표시)이 미니맵·목표·도움말 밑에 들어가면 그 판을 옅게 한다
  { const cr = canvas.getBoundingClientRect(), px = cr.left + (S.player.x - cam.x) * SCALE + W / 2, py = cr.top + (S.player.y - cam.y) * SCALE + H / 2;
    for (const el of [cv, document.querySelector('#hud .obj'), document.getElementById('hintCard')]) { if (!el) continue; const r = el.getBoundingClientRect(); const over = r.width > 0 && px > r.left - 40 && px < r.right + 40 && py > r.top - 70 && py < r.bottom + 40; el.classList.toggle('hudfade', over); } }
  if (!miniBase || miniBase.stage !== S) { miniBase = buildMiniBase(); miniBase.stage = S; cv.width = miniBase.width; cv.height = miniBase.height; }
  const x = cv.getContext('2d'), s = miniBase.s, P = S.player, T = v => v / TILE * s;
  x.drawImage(miniBase, 0, 0);
  // 화면에 보이는 범위
  x.strokeStyle = 'rgba(232,227,214,.45)'; x.lineWidth = 1; x.strokeRect(T(cam.x - W / SCALE / 2), T(cam.y - H / SCALE / 2), T(W / SCALE), T(H / SCALE));
  if (S.exitOpen) { x.strokeStyle = '#f2c46b'; x.lineWidth = 2; for (const e of S.exits || [S.exit]) { x.beginPath(); x.arc(T(e.x), T(e.y), 5, 0, TAU); x.stroke(); } }
  for (const it of S.items) if (!it.got) { x.fillStyle = '#f2c46b'; x.fillRect(T(it.x) - 2.5, T(it.y) - 2.5, 5, 5); if (it.fl) { x.fillStyle = '#0b0d12'; x.font = '700 7px monospace'; x.textAlign = 'center'; x.fillText(String(it.fl + 1), T(it.x), T(it.y) + 2.5); } }
  // 보이는 사람만: 같은 층·시선이 닿는 자경대원(경계 단계 색), 주민은 초록
  for (const g of S.guards) {
    if (g.state === 'DEAD') continue;
    const same = flOf(g) === flOf(P) && !P.under && !P.vent;
    const seen = g.target || (same && dist(g.x, g.y, P.x, P.y) < 560 && los(P.x, P.y, g.x, g.y, P.z > 0)) || (same && g.state === 'ALERT');
    if (!seen) continue;
    x.fillStyle = g.target ? '#ff5a4a' : g.civ ? '#9ad69a' : g.state === 'ALERT' ? '#e8473c' : ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state) ? '#f2c46b' : '#c8d2e6';
    x.beginPath(); x.arc(T(g.x), T(g.y), g.target ? 3 : 2.2, 0, TAU); x.fill();
  }
  for (const c of S.cams || []) if (!c.broken && c.fl === flOf(P)) { x.fillStyle = camOn(c) ? '#ff4a4a' : '#6a6a6a'; x.fillRect(T(c.x) - 2, T(c.y) - 2, 4, 4); }
  // 나
  x.save(); x.translate(T(P.x), T(P.y)); x.rotate(P.a); x.fillStyle = '#7fe3ff'; x.beginPath(); x.moveTo(5, 0); x.lineTo(-3.5, -3.5); x.lineTo(-2, 0); x.lineTo(-3.5, 3.5); x.closePath(); x.fill(); x.restore();
  if (P.fl || P.z) { x.fillStyle = '#7fe3ff'; x.font = '700 9px monospace'; x.textAlign = 'left'; x.fillText(P.fl ? (P.fl + 1) + 'F' : 'R', T(P.x) + 5, T(P.y) - 4); }
}
// 판 지도 그림: 구운 지도를 줄여 그리고 출발(하늘)·탈출(노랑)·훔칠 것(금색 ◆)·표적(빨강 ●)을 찍는다
function stageMap(w, labels) {
  const mw = MW * TILE, mh = MH * TILE, s = w / mw, h = Math.round(mh * s), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; drawBig(x, mapC, 0, 0, mw, mh, 0, 0, w, h); x.fillStyle = 'rgba(7,10,18,.35)'; x.fillRect(0, 0, w, h);
  const R = Math.max(3, w / 90), pt = (px, py, col, sh, lab) => { const X = px * s, Y = py * s; x.fillStyle = col; x.strokeStyle = 'rgba(7,10,18,.9)'; x.lineWidth = Math.max(1.5, R / 3); x.beginPath();
    if (sh === 'd') { x.moveTo(X, Y - R * 1.4); x.lineTo(X + R * 1.1, Y); x.lineTo(X, Y + R * 1.4); x.lineTo(X - R * 1.1, Y); x.closePath(); } else x.arc(X, Y, sh === 'r' ? R * 1.6 : R, 0, TAU);
    if (sh === 'r') { x.lineWidth = R * 0.7; x.strokeStyle = col; x.stroke(); } else { x.stroke(); x.fill(); }
    if (labels && lab) { x.font = `700 ${Math.round(R * 3.2)}px "IBM Plex Sans KR",sans-serif`; x.textAlign = 'center'; const hw = x.measureText(lab).width / 2 + 3, LX = clamp(X, hw, w - hw), LY = Math.max(R * 3.4, Y - R * 2.2);  // 지도 가장자리에서 글자가 잘리지 않게
      x.lineWidth = 3; x.strokeStyle = 'rgba(7,10,18,.95)'; x.strokeText(lab, LX, LY); x.fillStyle = col; x.fillText(lab, LX, LY); } };
  pt(S.player.x, S.player.y, '#7fd6ff', 'c', '출발'); for (const e of S.exits || (S.exit ? [S.exit] : [])) pt(e.x, e.y, '#f2c46b', 'r', '탈출');
  S.items.forEach((it, i) => pt(it.x, it.y, '#ffd27a', 'd', (STAGE.itemNames || [])[i] || STAGE.itemName || '서류'));
  for (const g of S.guards) if (g.target) pt(g.x, g.y, '#ff5a4a', 'c', g.doc ? '한 선생' : '표적');
  return c;
}
// 할 일 목록 (브리핑·일시정지 공용): [표식, 색, 할 일, 자리]
function briefTodo() {
  const out = [], fg = pendingFirstGoal(); if (fg) out.push(['dia', '#7fd6ff', fg.text, fg.where || '']);
  S.items.forEach((it, i) => { if (!it.got) out.push(['dia', '#f2c46b', ((STAGE.itemNames || [])[i] || STAGE.itemName || '서류') + ' ' + (STAGE.itemVerb || '훔치기'), placeName(it.x, it.y, it.fl, it.b)]); });
  for (const g of S.guards) if (g.target && g.state !== 'DEAD') out.push(['dot', '#e8473c', (g.doc ? '한 선생' : '표적') + ' 처리', schedText(g) || placeName(g.x, g.y, flOf(g))]);
  out.push(['ring', '#f2c46b', '이탈', S.exitOpen ? '노란 원으로' : '끝나면 노란 원으로']);
  return out;
}
// 의뢰 브리핑: 시작 전에 지도·할 일·도전 과제를 한 장으로 보여 주고 [출발]
function showBrief(go) {
  const el = $('brief'); if (!el || STAGE.tutorial) { go(); return; }
  paused = true; el.hidden = false;
  $('brName').textContent = STAGE.name; $('brSub').textContent = STAGE.sub || '';
  const mp = $('brMap'); mp.innerHTML = ''; const cv = stageMap(Math.min(640, Math.round(mp.clientWidth || 340) * 2), true); cv.style.width = '100%'; mp.appendChild(cv);
  { const lg = document.querySelector('#brief .br-legend'); if (lg) { lg.querySelector('.lg-tg').hidden = !S.guards.some(g => g.target); lg.querySelector('.lg-it').hidden = !S.items.length; } }
  $('brFee').textContent = STAGE.fee || ''; $('brFeeBox').hidden = !STAGE.fee;
  { const L = (typeof DIALOGUE !== 'undefined' && DIALOGUE[STAGE.id] || []).find(l => l[0] === 'master'); $('brLine').textContent = STAGE.briefBy ? STAGE.brief : L ? L[1].replace(/^올빼미, 까마귀다\. /, '') : ''; $('brRadio').hidden = !L && !STAGE.briefBy; $('brRadio').querySelector('b').textContent = STAGE.briefBy || '까마귀'; }
  $('brTodo').innerHTML = briefTodo().map(([mk, c, t, w]) => `<li><i class="mk ${mk}" style="--c:${c}"></i><b>${t}<span> · ${w}</span></b></li>`).join('');
  $('brCh').innerHTML = (STAGE.challenges || []).map(id => '<li>' + chName(id) + '</li>').join('');
  $('brChBox').hidden = !(STAGE.challenges || []).length;
  $('btnBrGo').onclick = () => { el.hidden = true; paused = false; go(); };
  { const sc = storedCP(STAGE.id), b = $('btnBrCP'); b.hidden = !sc; if (sc) b.textContent = '체크포인트부터 이어 하기 · ' + new Date(sc.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    b.onclick = () => { el.hidden = true; paused = false; if (resumeStoredCP(STAGE_I)) { play('bell', 0.6); startAmb(); } else go(); }; }
  $('btnBrBack').onclick = () => { el.hidden = true; paused = false; running = false; $('hud').hidden = true; showMenu('ledger'); renderStageList(); };
}
// 연습 문구의 조작 이름: 휴대폰은 버튼 이름, PC는 키
const TUT_KEY = { 이동: ['화면을 끌어', '방향키로'], 지도: ['미니맵을 눌러', 'M으로'], 살금: ['[이동] 버튼으로', 'Ctrl로'], 공격: ['[공격]', () => KK('atk')], 행동: ['[행동]', () => KK('env')], 보조: ['[행동]', () => KK('env')], 도구: ['도구 버튼을', () => KK('tool') + '를'], 바꾸기: ['도구 칸을 눌러', '2로'], 살피기: ['[살피기]를', 'Alt를'] };
const tutText = t => t.replace(/\{(\S+?)\}/g, (m, k) => { if (!TUT_KEY[k]) return m; const v = TUT_KEY[k][isTouch ? 0 : 1]; return typeof v === 'function' ? v() : v; });
// 자리 이름: 건물 이름(간판)·층 — 목표 목록과 '지금 할 일'에 함께 쓴다
function placeName(x, y, fl, b) { const bi = b != null ? b : bldAt(Math.floor(x / TILE), Math.floor(y / TILE)); if (bi < 0) return '바깥'; const B = BLD[bi]; const nm = B.name ? B.name + (B.plate && !B.plate.includes(B.name) && !B.name.includes(B.plate) ? '(' + B.plate + ')' : '') : B.plate || (B.kind === 'shop' ? ((B.signs || [])[fl || 0] || '상가') + ' 건물' : B.kind === 'house' ? '단독주택' : '빌라'); return nm + ' ' + ((fl || 0) + 1) + '층'; }
function pendingFirstGoal() {
  const fg = STAGE.firstGoal; if (!fg) return null;
  try { if (fg.done(S, SH)) return null; } catch (e) {}
  return fg;
}
// 연습 → 탈출 → 필수 첫 행동 → 추적 기회(전체 안내) → 가까운 의뢰 목표.
// 최소 안내에서는 기회의 위치를 공개하지 않고 의뢰 목표임을 명시한다.
function nextGoal() {
  const P = S.player;
  if (STAGE.steps && (S.tutI || 0) < STAGE.steps.length) { const st = STAGE.steps[S.tutI || 0], tg = st[2] && st[2](S); return { text: tutText(st[0]), where: '', x: tg && tg.x, y: tg && tg.y, fl: (tg && tg.fl) || 0, tut: true }; }
  if (STAGE.city) return cityGoal();
  if (S.exitOpen) return { text: S.exits && S.exits.length > 1 ? '탈출 — ' + (S.exit.name || '가까운 노란 원') : '탈출 지점으로 빠져나가기', where: '노란 원', x: S.exit.x, y: S.exit.y, fl: 0, exit: true };
  { const fg = pendingFirstGoal(); if (fg) return { text: fg.text, where: fg.where || '', x: fg.at ? tc(fg.at[0]) : null, y: fg.at ? tc(fg.at[1]) : null, fl: fg.at ? fg.at[2] || 0 : 0 }; }
  if (oppMode === 2) { const st = trackedStory(), step = st && storyStep(st); if (step) { const at = step.at; return { text: '추적: ' + step.text, where: at ? placeName(tc(at[0]), tc(at[1]), at[2]) : '', x: at ? tc(at[0]) : null, y: at ? tc(at[1]) : null, fl: at ? at[2] || 0 : 0, story: st.d.id, storyName: st.d.name }; } }
  const c = [];
  S.items.forEach((it, i) => { if (!it.got) c.push({ text: ((STAGE.itemNames || [])[i] || STAGE.itemName || '서류') + ' ' + (STAGE.itemVerb || '훔치기'), where: placeName(it.x, it.y, it.fl, it.b), x: it.x, y: it.y, fl: it.fl || 0 }); });
  if (!S.spare) for (const g of S.guards) if (g.target && g.state !== 'DEAD') c.push({ text: (g.doc ? '한 선생' : '표적') + ' 처리하기', where: placeName(g.x, g.y, flOf(g)), x: g.x, y: g.y, fl: flOf(g), g });
  if (!c.length) return null;
  const cost = o => dist(P.x, P.y, o.x, o.y) + Math.abs((o.fl || 0) - flOf(P)) * 300;
  const goal = c.sort((a, b) => cost(a) - cost(b))[0]; goal.text = '의뢰: ' + goal.text; return goal;
}
// 목표 목록: 무엇을 어디서 (건물 이름·층) — 한 줄씩, 끝낸 것은 줄 긋기
function objectiveLines() {
  const L = [], P = S.player;
  const place = placeName;
  { const gl = !STAGE.steps && nextGoal(); if (gl) { let distance = ''; if (gl.x != null && gl.y != null) { const m0 = Math.max(1, Math.round(dist(P.x, P.y, gl.x, gl.y) / 32)), m = m0 > 20 ? Math.round(m0 / 5) * 5 : m0, df = (gl.fl || 0) - flOf(P); distance = ` · ${df ? (df > 0 ? df + '층 위 · ' : -df + '층 아래 · ') : ''}${m}m`; } L.push(['go goal', `${gl.text}${gl.where && gl.where !== '바깥' ? ' · ' + gl.where : ''}${distance}`]); } }
  if (S.mod) L.push(['info', '변형: ' + MODS[S.mod][0] + ' — ' + MODS[S.mod][1]]);
  if (STAGE.steps && (S.tutI || 0) < STAGE.steps.length) L.push(['go tut', `연습 ${(S.tutI || 0) + 1}/${STAGE.steps.length}: ${tutText(STAGE.steps[S.tutI || 0][0])}`]);
  if (S.exitOpen && !(STAGE.steps && (S.tutI || 0) < STAGE.steps.length)) L.push(['go', '탈출 지점(노란 원)으로']);
  if ((STAGE.keyBld || STAGE.keyDoors) && !STAGE.tutorial) { if (S.doors.some(d => d.keyLock)) L.push([P.hasKey || !S.doors.some(d => d.keyLock && d.locked) ? 'done' : '', P.hasKey ? '열쇠 있음' : '열쇠 확보 (또는 창문·옥상으로)']); }
  else { const ks = Object.keys(P.keys || {}); if (ks.length) L.push(['info', '가진 것: ' + ks.map(keyName).join(', ')]); }
  (S.learned || []).forEach(t => L.push(['info', '알아낸 것: ' + t]));
  if (P.disguise) L.push([P.disguiseBlown ? 'go' : 'info', STAGE.zones ? (P.disguiseBlown ? `${outfitName(P.outfit)} 들통남 — 다른 옷을 구하라` : `${outfitName(P.outfit)} — 초록 경계선 안은 지나다닐 수 있다`) : P.disguiseBlown ? '변장 들통남 — 다시 갈아입을 옷을 찾아라' : '변장 중 — 걸으면 멀리서는 안 들킨다']);
  if (STAGE.shift && S.shiftI < STAGE.shift.add.length) L.push(['', `다음 교대까지 ${Math.max(0, Math.ceil(S.shiftT))}초 — 순찰이 늘어난다`]);
  for (const g of S.guards) if (g.target) { const r = g.route[0], sc = g.state !== 'DEAD' && schedText(g); L.push([g.state === 'DEAD' ? 'done' : S.spare ? 'done' : '', (g.doc ? '한 선생' : '표적') + (S.spare && g.state !== 'DEAD' ? ' — 살려 둘 수 있다' : sc ? ' — ' + sc : ' — ' + place(r.x, r.y, g.fl))]); }
  S.items.forEach((it, i) => L.push([it.got ? 'done' : '', ((STAGE.itemNames || [])[i] || STAGE.itemName || '서류') + ' — ' + place(it.x, it.y, it.fl, it.b)]));
  if (P.item) L.push(['info', '들고 있는 것: ' + P.item.name + (P.item.permit ? ' (배달하러 온 사람으로 통하는 곳이 있다)' : '')]);
  storyLines().forEach(l => L.push(l));
  if (showOpps) for (const o of S.opps || []) if (o.seen) { const pl = o.x != null ? (o.roof ? place(o.x, o.y, o.fl).replace(/ \d+층$/, ' 옥상') : place(o.x, o.y, o.fl)) : ''; L.push([oppDone(o) ? 'opp done' : 'opp', '기회: ' + oppText(o) + (pl && pl !== '바깥' ? ' — ' + pl : '')]); }
  if (S.timeLeft) L.push([S.timeLeft < 60 ? 'go' : '', `남은 시간 ${Math.floor(S.timeLeft / 60)}:${String(Math.floor(S.timeLeft % 60)).padStart(2, '0')}`]);
  return L;
}
function objectiveText() {
  if (S.exitOpen) return '탈출 지점(노란 원)으로 이동';
  const tg = S.guards.filter(g => g.target), td = tg.filter(g => g.state === 'DEAD').length;
  const parts = [];
  if (STAGE.keyDoors && S.doors.some(d => d.keyLock && d.locked) && !S.player.hasKey) parts.push('열쇠 확보(또는 다른 길)');
  if (tg.length) parts.push(S.spare && td < tg.length ? '표적: 살려 둘 수 있다' : `표적 제거 ${td}/${tg.length}`);
  if (S.items.length) parts.push(`${STAGE.itemName || '서류'} 회수 ${S.items.filter(i => i.got).length}/${S.items.length}`);
  return parts.join(' · ');
}
// 층·높이가 바뀌면 화면 가운데 위에 큰 글씨로 잠깐 (지금 몇 층인지 바로 알게)
function floorBanner(P, ptx, pty) {
  const k = P.vent ? '환풍구 안' : P.under ? '지하 수로' : P.wire ? '' : P.fl ? `${P.fl + 1}층 실내` : P.z ? `${P.z}층 높이 옥상` : bldAt(ptx, pty) >= 0 ? '1층 실내' : '거리';
  if (!k || P.trav || P.jump) return; const el = $('floorBan'); if (!el) return;
  if (S._flk == null) { S._flk = k; return; }
  if (k === S._flk) return; S._flk = k; el.textContent = k; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}
function updateHUD(force) {
  if (force) hudCache = {};
  const P = S.player;
  drawWanted();
  setText(hud.objT, 'objT', STAGE.sub);
  { const html = objectiveLines().map(([c, t]) => `<span class="ol ${c}">${c.includes('done') ? (c.includes('opp') ? '◆' : '●') : c.startsWith('go') ? '▶' : c === 'opp' ? '◇' : '○'} ${t}</span>`).join(''); if (hudCache.objH !== html) { hudCache.objH = html; hud.obj.innerHTML = html; } }
  drawMini();
  hud.obj.classList.toggle('urgent', !!S.timeLeft && S.timeLeft < 60);
  const lv = P.hidden ? 0 : P.light;
  hud.light.style.width = Math.round(lv * 100) + '%';
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  const bnm = !P.z && !P.wire && bldAt(ptx, pty) >= 0 && BLD[bldAt(ptx, pty)].name ? ' · ' + BLD[bldAt(ptx, pty)].name : '';
  const zi0 = STAGE.zones ? pZoneInfo() : null, zk0 = zi0 ? zi0.k : STAGE.tutorial ? -1 : Z_HOS, ok0 = zi0 && permitted(zi0);
  setText(hud.layer, 'layer', (zk0 >= 0 ? (ok0 ? '통과' : ['공개', '금지', '적진'][zk0]) + ' · ' : '') + (P.vent ? '환풍구' : P.under ? '지하 수로' : P.wire ? '전깃줄' : P.fl ? `${P.fl + 1}층` : P.z ? `${P.z}층 옥상` : bldAt(ptx, pty) >= 0 ? '1층' : '지상') + (STAGE.zones ? '' : bnm));
  floorBanner(P, ptx, pty);
  hud.layer.dataset.l = P.vent ? 'vent' : P.under ? 'under' : P.z ? 'roof' : bldAt(ptx, pty) >= 0 ? 'in' : 'out';
  hud.layer.dataset.z = zk0 >= 0 ? (ok0 ? 'pub' : ['pub', 'res', 'hos'][zk0]) : '';
  hud.light.dataset.level = P.hidden ? 'hid' : lv > 0.55 ? 'hi' : lv > 0.22 ? 'mid' : 'lo';
  setText(hud.mode, 'mode', input.aiming ? TOOL_NAME[input.tool] + ' 조준' : P.hide ? '숨는 중' : P.captive ? '붙잡는 중 ' + Math.max(0, Math.ceil(9 - P.captive.captT)) + '초' : P.carrying ? '운반 중' : P.cover ? (P.cover.kind === 'tree' ? '나무에 붙음' : P.cover.kind === 'car' ? '차 뒤에 붙음' : '벽에 붙음') + ' · 잘 안 보임 · 소리 없음' : P.trav ? '오르는 중' : (input.sneakToggle ? '[살금 모드] ' : input.walkLock ? '[항상 걷기] ' : '') + { sneak: '살금살금', walk: '걷기', run: '달리기' }[P.mode] + (loudMul(P.x, P.y, flOf(P)) < 1 ? (loudMul(P.x, P.y, flOf(P)) < 0.5 ? ' · 음악에 묻힘' : ' · 음악 소리') : ''));
  syncTools();
  setText(hud.kills, 'k', '제거 ' + S.stats.kills);
  const fleeNow = S.fleeing && S.guards.some(g => g.state === 'FLEE');
  // 경계: 한 칸에 단계 이름 + 남은 시간 (따로 뜨던 경보 칸은 표적 도주 때만)
  hud.alarm.hidden = !fleeNow; hud.alarm.dataset.lv = S.alevel;
  if (fleeNow) setText(hud.alarm, 'al', '표적 도주');
  { const t = S.alevel === 3 ? '발각 · 숨어 ' + Math.max(0, Math.ceil(ESCAPE_T - S.unseenT)) + '초' : S.alevel ? A_NAME[S.alevel] + ' ' + Math.ceil(S.alevelT) + '초' : '평온';
    setText($('alertWord'), 'aw', t); const ab = $('alertBox'); if (ab && ab.dataset.lv !== String(S.alevel)) ab.dataset.lv = S.alevel; }
  hud.pips.forEach((p, i) => p.classList.toggle('on', i < S.alevel));
  { const hb = $('hpBox'), low = P.hp <= 1 && P.hpMax > 1 ? '1' : '0'; if (hb && hb.dataset.low !== low) hb.dataset.low = low; }  // 마지막 체력: 깜빡인다
  { const v = $('alertVig'); if (v) { const chase = S.guards.some(g => g.state === 'ALERT' && !g.civ && g.seen), a = S.over ? 0 : chase ? 3 : S.alevel >= 2 ? 2 : S.alevel >= 1 ? 1 : 0; if (hudCache.vig !== a) { hudCache.vig = a; v.dataset.a = a; } } }  // 화면 가장자리 경계 빛
  if (!document.body.classList.contains('joyseen') && S.t > 12) { document.body.classList.add('joyseen'); try { localStorage.setItem('yahaeng.joyseen', '1'); } catch (e) {} }
  const hpKey = P.hp + '/' + P.hpMax; if (hudCache.hp !== hpKey) { hudCache.hp = hpKey; hud.hp.innerHTML = Array.from({ length: P.hpMax }, (_, i) => `<i class="${i < P.hp ? 'on' : ''}"></i>`).join(''); }
  updateStealth(lv);
  { const hc = $('hintCard'), dl = $('dlg'); if (hc && dl) hc.style.visibility = dl.hidden ? '' : 'hidden'; }
  { const pl = $('pickLbl'); if (pl) { pl.hidden = false; setText(pl, 'picks', '락픽 ' + (P.picks || 0)); } }
  // 버튼 넷: [공격] 사람에게만 · [행동] 시설·시체 · [붙잡기] 등 뒤에서 · [다트](도구)
  const ka = attackAction(), ea = envAction(), ga = grabAction();
  padButton(hud.act, 'actH', ka, '공격');
  hud.act.classList.toggle('ready', ka.k !== 'none' || !!ka.stalk);
  const ki = ka.k === 'cap' ? (ka.hold ? 'ko' : 'kill') : ka.k !== 'none' ? actIcon(ka) : ka.stalk ? (koTap(ka.stalk) ? 'ko' : 'kill') : '';
  hud.act.classList.toggle('kill', ki === 'kill'); hud.act.classList.toggle('ko', ki === 'ko');
  hud.act.style.setProperty('--hold', holdFrac().toFixed(3));
  padButton(hud.carry, 'carryH', ea, P.ledge || P.wire ? '올라가기' : '행동');
  hud.carry.classList.toggle('ready', ea.k !== 'none');
  { const cb = $('btnCycle'); if (cb) { const n = ea.choices || 0; cb.hidden = !(n > 1); if (n > 1) setText($('cycleN'), 'cycN', (ea.choiceI + 1) + '/' + n); } }
  { const gb = $('btnGrab'); if (gb) { const label = P.ledge || P.wire ? '떨어지기' : P.captive ? (canInterrogate() ? '심문' : '잡는 중') : '붙잡기', html = `<b>${label}</b>`; if (hudCache.grabH !== html) { hudCache.grabH = html; gb.innerHTML = html; } gb.classList.toggle('ready', ga.k !== 'none' || canInterrogate()); gb.setAttribute('aria-label', ga.blocked ? '떨어지기 불가 — 착지할 곳 없음' : label); } }
  keyMap(ka, ea, ga);
}
// 은신 상태 표시 (화면 위 가운데): 숨음 · 섞임 · 들킬 수 있음 · 보인다 + 이유 한 줄
const STH_ICO = {
  hide: '<svg viewBox="0 0 24 24"><path d="M3 11c2.5 3.2 5.5 4.8 9 4.8s6.5-1.6 9-4.8"/><path d="M6.5 14.6l-1.6 2.2M12 15.8v2.6M17.5 14.6l1.6 2.2"/></svg>',
  blend: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="8" r="3"/><path d="M2.5 20c.6-3.6 2.8-5.6 5.5-5.6s4.9 2 5.5 5.6M11.5 15.3c1.2-.6 2.9-.9 5-.9 2.7 0 4.9 2 5.5 5.6"/></svg>',
  risk: '<svg viewBox="0 0 24 24"><path d="M2.5 12c2.6-4 5.8-6 9.5-6s6.9 2 9.5 6c-2.6 4-5.8 6-9.5 6s-6.9-2-9.5-6z"/><path d="M5 12h14" opacity=".55"/><path class="f" d="M8.8 12a3.2 3.2 0 006.4 0z"/></svg>',
  wall: '<svg viewBox="0 0 24 24"><path d="M4 3v18"/><path d="M4 7h3M4 12h3M4 17h3" opacity=".6"/><circle cx="12.5" cy="6.5" r="2.3"/><path d="M10.5 21v-6l-1-4.5 3-1.5 2.5 3.5h3"/></svg>',
  seen: '<svg viewBox="0 0 24 24"><path d="M2.5 12c2.6-4 5.8-6 9.5-6s6.9 2 9.5 6c-2.6 4-5.8 6-9.5 6s-6.9-2-9.5-6z"/><circle class="f" cx="12" cy="12" r="3.6"/></svg>'
};
function updateStealth(lv) {
  const box = $('stealth'); if (!box || !S) return; const P = S.player;
  { const r = box.getBoundingClientRect(), sx = (P.x - cam.x) * SCALE + W / 2, sy = (P.y - cam.y) * SCALE + H / 2, u = sx > r.left - 24 && sx < r.right + 24 && sy > r.top - 30 && sy < r.bottom + 60;  // 주인공과 겹치면 흐리게
    if (hudCache.sthU !== u) { hudCache.sthU = u; box.classList.toggle('under', u); } }
  const e = P.hide || P.under || P.vent ? 0 : S.expo || 0;
  const eyeG = STAGE.zones && S.guards.find(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !radioBusy(g) && (g.eyeT || 0) > 0.05 && flOf(g) === flOf(P)),  // 눈썰미 있는 사람이 변장을 살피는 중
    runNear = STAGE.zones && P.mode === 'run' && P.moving && S.guards.some(g => g.state !== 'DEAD' && !g.dog && flOf(g) === flOf(P) && dist(g.x, g.y, P.x, P.y) < 220),
    sus = STAGE.zones && suspAct(null) >= 1, pub = STAGE.zones && !P.hide && !P.hidden && !P.under && !P.vent && !P.z && pZoneEff() === Z_PUB && !sus;  // 시체·붙잡은 사람을 끌고 있으면 공개 구역이어도 섞이지 않는다
  const zi = STAGE.zones ? pZoneInfo() : null, banned = zi && zi.k !== Z_PUB && !permitted(zi);
  const inBush = !P.z && tileAt(P.x, P.y) === 'B';
  let s, word, why;
  if (e === 2) { s = 'seen'; word = '보인다'; why = banned ? '금지 구역에서 보였다' : '누가 보고 있다'; }
  else if (eyeG && !P.hide && !P.hidden) { s = 'risk'; word = '눈썰미'; why = '저 사람은 변장을 알아본다 — 멀어져라'; }
  else if (runNear && !P.hide && !P.hidden && (pub || STAGE.zones)) { s = 'risk'; word = '수상함'; why = '사람 가까이서 뛰면 눈에 띈다'; }
  else if (sus && !P.hide && !P.hidden) { s = 'risk'; word = '수상함'; why = P.carrying ? '시체 운반 중 — 눈에 띈다' : P.captive ? '사람을 붙잡고 있다' : '수상한 행동 중'; }
  else if (P.cover && e < 2) { s = e === 1 ? 'risk' : 'hide'; word = '벽에 붙음'; why = e === 1 ? '빛 아래 — 붙어도 가까우면 보인다' : `보이는 거리 ${Math.round(COVER_HIDE * 100)}% · 발소리 없음`; }  // 벽에 붙으면 공개 구역이어도 '섞임' 대신 붙은 상태를 보여 준다
  else if (e === 1 && !pub) { s = 'risk'; word = '들킬 수 있음'; why = inBush && !P.hidden ? '웅크려야 숨는다' : banned ? '금지 구역 · 시야 안' : lv > 0.55 ? '빛 아래 · 시야 안' : '돌아보면 보인다'; }
  else if (pub) { s = 'blend'; word = '섞임'; why = disguised() ? '변장 · 통과 가능' : '행인으로 보인다'; }
  else { s = 'hide'; word = '숨음'; why = P.vent ? '환풍구 안' : P.under ? '지하 수로' : P.hide ? hideName(P.hide) + ' 안' : P.hidden ? '화단 · 웅크림' : P.cover ? '엄폐 중' : inBush ? '웅크려야 숨는다' : lv < 0.22 ? '어둠 속' : '아무도 못 본다'; }
  { // 위험 막대(어쌔신 크리드 섀도우즈식): 나를 가장 많이 알아챈 사람의 게이지만큼 눈 양옆이 찬다
    let r = 0; for (const g of S.guards) { if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.dropped || flOf(g) !== flOf(P) || (g.civ && g.state === 'PANIC') || dist(g.x, g.y, P.x, P.y) > 700) continue; r = Math.max(r, g.state === 'ALERT' && !g.civ ? 1 : g.meter || 0, (g.eyeT || 0) / EYE_T); }  // 눈썰미 게이지도 함께  // 멀리 있는 사람·겁먹은 주민(다른 일로 놀람)은 경고음에서 뺀다
    riskTone(paused || S.over || tactical || DLG.modal ? 0 : r);
    const w = Math.round(Math.min(1, r) * 100) + '%'; if (hudCache.sthW !== w) { hudCache.sthW = w; $('sthWL').style.width = w; $('sthWR').style.width = w; } }
  const k = s + '|' + why; if (hudCache.sth === k) return; hudCache.sth = k;
  if (hudCache.sthS && hudCache.sthS !== s && S.t - (hudCache.sthSfxT || -9) > 0.35) { hudCache.sthSfxT = S.t; sfx({ hide: 'toHide', blend: 'toBlend', risk: 'toRisk', seen: 'toSeen' }[s]); } hudCache.sthS = s;  // 상태가 바뀌면 작은 신호음
  box.dataset.s = s; const el = $('expoLbl'); el.textContent = word; el.dataset.e = e; $('lightLbl').textContent = why;
  const ico = P.cover ? 'wall' : s; if (hudCache.sthI !== ico) { hudCache.sthI = ico; $('sthIco').innerHTML = STH_ICO[ico]; }
  if (P.cover && hudCache.sthCov !== true) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); } hudCache.sthCov = !!P.cover;
}
// 도구 선택 표시 (아래 오른쪽 작은 칸 + 도구 버튼 글자)
function syncTools() {
  if (!S) return; const P = S.player;
  document.querySelectorAll('#tools .tool').forEach(b => {
    const t = b.dataset.t; b.classList.toggle('on', t === input.tool); b.classList.toggle('empty', toolCount(t) <= 0);
    setText(b.querySelector('span'), 'tc_' + t, String(toolCount(t)));
  });
  { const html = P.captive ? `<b>${canInterrogate() ? '심문' : '—'}</b>` : input.padWhistle ? `<b>휘파람</b><small>${S.whistleT > 0 ? '잠시 뒤' : '부르기'}</small>` : `<b>${TOOL_NAME[input.tool]}</b><small>${toolCount(input.tool)}개</small>`; if (hudCache.toolH !== html) { hudCache.toolH = html; hud.tool.innerHTML = html; } }
  hud.tool.classList.toggle('aiming', !!input.aiming);
  hud.tool.classList.toggle('ready', input.padWhistle ? !(S.whistleT > 0) : input.tool === 'kunai' ? !!kunaiTarget() : toolCount(input.tool) > 0);
}

function endGame(win, reason) { riskTone(0);
  if (S.over) return;
  S.over = true;
  if (!win && STAGE.tutorial && cpReady()) { play('lose', 0.5); toast('들켰다 — 이 단계부터 다시 한다', 2); const run = S; setTimeout(() => { if (S === run && S.over) loadCheckpoint(); }, 1300); return; }  // 연습: 죽어도 그 자리에서 다시
  play(win ? 'win' : 'lose', 0.7); resetDialog();
  const run = S; setTimeout(() => { if (S === run) showEnd(win, reason); }, win ? 500 : 800);
}
// 임무 경로 지도 (Hitman식): 지나간 길·처치·발각·시체 발견 위치
function drawEndMap() {
  const cv = document.getElementById('endMap'); if (!cv || !S) return;
  const wmax = Math.min(560, (window.innerWidth || 600) - 40), base = buildMiniBase(wmax, 300), s = base.s, T = v => v / TILE * s;
  cv.width = base.width; cv.height = base.height; const x = cv.getContext('2d');
  x.globalAlpha = 0.85; x.drawImage(base, 0, 0); x.globalAlpha = 1;
  const tr = S.trail || [];
  if (tr.length > 1) { x.lineWidth = 2; x.lineJoin = 'round';
    for (let i = 1; i < tr.length; i++) { const a = tr[i - 1], b = tr[i]; if (dist(a.x, a.y, b.x, b.y) > 300) continue; x.strokeStyle = b.z || b.fl ? 'rgba(242,196,107,.9)' : 'rgba(120,210,255,.85)'; x.beginPath(); x.moveTo(T(a.x), T(a.y)); x.lineTo(T(b.x), T(b.y)); x.stroke(); } }
  if (tr[0]) { x.fillStyle = '#78d2ff'; x.beginPath(); x.arc(T(tr[0].x), T(tr[0].y), 4, 0, TAU); x.fill(); }
  const ex = S.exit; if (ex) { x.strokeStyle = '#f2c46b'; x.lineWidth = 2; x.beginPath(); x.arc(T(ex.x), T(ex.y), 6, 0, TAU); x.stroke(); }
  for (const e of S.events || []) {
    const px = T(e.x), py = T(e.y);
    if (e.k === 'seen') { x.fillStyle = '#ff9a3c'; x.font = '800 13px monospace'; x.textAlign = 'center'; x.fillText('!', px, py + 4); continue; }
    if (e.k === 'found') { x.strokeStyle = '#ff5a4a'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.stroke(); continue; }
    x.strokeStyle = e.k === 'accident' ? '#f2c46b' : e.k === 'target' ? '#ff3a3a' : '#e8473c'; x.lineWidth = e.k === 'target' ? 3 : 2;
    x.beginPath(); x.moveTo(px - 4, py - 4); x.lineTo(px + 4, py + 4); x.moveTo(px + 4, py - 4); x.lineTo(px - 4, py + 4); x.stroke();
  }
}
const END_MAIN = ['칭호', '수고비', '소요 시간', '조직원 처치', '발각 횟수', '발견된 시체'];  // 결과 화면에 바로 보이는 줄 (나머지는 '자세히'에)
function showEnd(win, reason) {
  running = false;
  const st = S.stats, t = Math.floor(S.t);
  const hasTargets = S.guards.some(g => g.target);
  let rank = '';
  if (win) {
    // 그림자 조건 (히트맨의 사일런트 어새신식): 다섯 가지를 모두 채우면 그림자
    // 근처만 알아챈 발각은 괜찮다 — 무전으로 퍼지지만 않으면
    const bonus = [['전체 경보 0', !(st.full || 0)], ['주민 살상 0', st.extraKills === 0], ['시체·기절자 발견 0', st.bodies === 0], ['목격자 0', STAGE.zones ? !(st.witness || 0) : !(st.screams || 0)], ['CCTV 기록 0', !(st.camRec || 0)]];
    S.bonus = bonus;
    if (STAGE.challenges) {
      const all = loadCh(), mine = all[STAGE.id] || (all[STAGE.id] = {}); mine._clear = true; if (S.mod) mine['mod_' + S.mod] = true;
      S.chRes = STAGE.challenges.map(id => { const ok = !!(CH[id] && CH[id][1]()), fresh = ok && !mine[id]; if (ok) mine[id] = true; return [id, ok, fresh, !!mine[id]]; });
      saveCh(all);
    }
    const n = bonus.filter(b => b[1]).length;
    rank = n === 5 ? '그림자' : n === 4 ? '암살자' : n === 3 ? '침입자' : '소란꾼';
    saveBest(STAGE.id + '_' + DKEY, rank); saveBest(STAGE.id, rank); clearStoredCP(STAGE.id);  // 깬 의뢰의 체크포인트는 지운다
  }
  $('endTitle').textContent = win ? (STAGE.tutorial ? '연습 끝' : '임무 완료') : '실패';
  $('endSub').textContent = win ? (STAGE.id === 'tI' ? '이 게임의 규칙을 익혔다. 이제 의뢰 01로 가자. 살금·기대기·전깃줄 같은 잠입 기술은 연습 2·3(선택)에서.' : STAGE.id === 't0' ? '기본을 익혔다. 의뢰 01로 가거나, 연습 2(고급)에서 전깃줄·낙하 암살·락픽을 익힐 수 있다.' : STAGE.tutorial ? '고급 기술까지 익혔다. 이제 의뢰 01부터 시작하자.' : STAGE.endText || '') : (reason || '') + ' 경로와 타이밍을 바꿔 다시 시도해 보자.';
  { const rb = $('endRank'); if (rb) { rb.hidden = !(win && rank); rb.dataset.r = rank; rb.innerHTML = rank ? `<small>등급</small><b>${rank}</b>` : ''; } }
  if (win && STAGE.spare) { const tg = S.guards.find(g => g.target); $('endSub').textContent += ($('endSub').textContent ? ' · ' : '') + (tg && tg.state !== 'DEAD' ? STAGE.spare.endSpared : S.realized ? STAGE.spare.endRealized : STAGE.spare.endKilled); }
  const ttl = win ? playTitle(st) : null;
  // 들킨 대가: 경보가 무전으로 전체에 퍼졌을 때만 수고비를 깎는다 (전체 경보 1회 −15%, 민간인 살상 1명 −20%, 최대 −70%). 근처만 알아챈 발각은 깎지 않는다
  let feeRow = null; { const base = parseInt(STAGE.fee || '', 10); if (win && base > 0) { const cut = Math.min(0.7, (st.full || 0) * 0.15 + (st.extraKills || 0) * 0.2), got = Math.round(base * (1 - cut)), why = [st.full ? `전체 경보 ${st.full}회` : '', st.extraKills ? `민간인 ${st.extraKills}명` : ''].filter(Boolean).join(' · ');
    const purge = STAGE.purgeBonus && S.guards.filter(g => !g.civ && !g.dog && !g.reinf).every(g => g.state === 'DEAD' || g.state === 'CAPTIVE');  // 몰살 보너스
    // 깔끔한 처리의 보상: 표적을 모두 사고로 처리하면 +20%, 시체 발견·목격자 없이 끝내면 +10%
    const tc0 = S.corpses.filter(c => c.target), acc = tc0.length && tc0.length === S.guards.filter(g => g.target).length && tc0.every(c => c.accident), clean = !st.bodies && !(st.witness || 0);
    const adds = [purge ? ['몰살', STAGE.purgeBonus] : null, acc ? ['사고 처리', Math.round(base * 0.2)] : null, clean ? ['흔적 없음', Math.round(base * 0.1)] : null].filter(Boolean), bonus = adds.reduce((s, a) => s + a[1], 0), addTxt = adds.map(a => `${a[0]} +${a[1]}만`).join(' · ');
    feeRow = ['수고비', (cut > 0 ? `${got + bonus}만 (원래 ${base}만 — ${why}로 −${base - got}만` + (bonus ? ` · ${addTxt}` : '') + ')' : bonus ? `${base + bonus}만 (전액 + ${addTxt})` : `${base}만 전액`)]; S.feeGot = got + bonus; } }
  $('endStats').innerHTML = (ttl ? [['칭호', ttl[0] + ' — ' + ttl[1]]] : []).concat(feeRow ? [feeRow] : []).concat([
    ['소요 시간', Math.floor(t / 60) + '분 ' + String(t % 60).padStart(2, '0') + '초'], ['조직원 처치', (st.crewKills || 0) + '명' + (st.maxStreak >= 2 ? ` (최대 ${st.maxStreak}연속)` : '')], ['주민 살상', st.extraKills + '명'], ['보조 암살', st.special + '회'], ['발각 횟수', st.detected + '회'],
    ['발견된 시체', st.bodies + '구'], ['숨긴 시체', st.stashed + '구'], ['기절시킨 사람', (st.ko || 0) + '명'], [STAGE.zones ? '신고한 주민' : '주민 비명', (STAGE.zones ? st.witness || 0 : st.screams || 0) + (STAGE.zones ? '명' : '회')], ['빈 캔·다트', st.stonesUsed + ' · ' + st.kunaiUsed]
  ]).concat(st.interro ? [['심문', st.interro + '명']] : []).concat(st.counters ? [['반격', st.counters + '회']] : []).concat(st.fights ? [['조직 싸움', st.fights + '회' + (st.war ? ' · 전쟁' : '')]] : []).concat(st.npcDown ? [['조직이 쓰러뜨린 사람', st.npcDown + '명' + (st.npcCiv ? ` (주민 ${st.npcCiv})` : '') + ' · 감점 없음']] : []).concat(st.cpUsed ? [['체크포인트 재시작', st.cpUsed + '회']] : []).map(r => `<div class="${END_MAIN.includes(r[0]) ? 'main' : 'more'}"><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
  { const mo = $('endMore'); if (mo) { mo.innerHTML = ''; $('endStats').querySelectorAll('.more').forEach(d => mo.appendChild(d)); } }
  $('endRankNote').innerHTML = !win ? '' : STAGE.challenges ? (() => { const n = starsOf(STAGE), max = 1 + STAGE.challenges.length;
      return `<div class="ent"><b>등급</b>은 얼마나 조용히 했나 (다섯 개 다 지키면 그림자) — ${S.bonus.map(b => `<span class="bn ${b[1] ? 'ok' : ''}">${b[1] ? '●' : '○'} ${b[0]}</span>`).join(' ')}</div><div class="stars">${'★'.repeat(n)}${'☆'.repeat(max - n)} <small>별 ${n}/${max}</small></div>` + S.chRes.map(([id, ok, fresh, ever]) => `<span class="bn ${ok ? 'ok' : ''}">${ok ? '●' : ever ? '◐' : '○'} ${chName(id)}${fresh ? ' <b>새로 달성</b>' : ''}</span>`).join(' ')
        + (ENTRY_PICK && (STAGE.entries || []).some(e => e.need && e.need <= n) ? `<div class="ent">열린 진입로: ${(STAGE.entries || []).filter(e => (e.need || 0) <= n).map(e => e.name).join(' · ')}</div>` : ''); })()
      : '보너스 목표 ' + S.bonus.map(b => `<span class="bn ${b[1] ? 'ok' : ''}">${b[1] ? '●' : '○'} ${b[0]}</span>`).join(' ');
  if (S.mod) $('endRankNote').innerHTML += `<div class="ent">변형: ${MODS[S.mod][0]}${win ? ' — 깼다' : ''}</div>`;
  if (win && S.stars0 != null) { const n = totalStars(), nw = PERKS.filter(([need]) => need > S.stars0 && need <= n); if (nw.length) $('endRankNote').innerHTML += `<div class="ent">새 장비 해금: ${nw.map(p => p[2]).join(' · ')}</div>`; }
  drawEndMap();
  $('btnNext').hidden = !(win && (STAGE.tutorial || nextPlayable() >= 0));
  $('btnCP').hidden = win || !cpReady();
  $('btnCity').hidden = !(CITY_RET && !STAGE.city); if (win && CITY_RET && !STAGE.city) markCityDone(CITY_RET.id);  // 도시에서 받은 의뢰: 끝나면 도시로
  $('hud').hidden = true; $('joy').hidden = true; $('end').hidden = false; $('end').dataset.win = win ? '1' : '0';
  renderStageList();
  statsEnd(win ? 'clear' : 'fail', reason);  // 플레이 기록: 판 끝
}

document.querySelectorAll('.nocity').forEach(e => e.remove());
// 데모(itch) 빌드: 'all' 이면 도시 시제품만 빼고 전부, 목록이면 그 판만 (나머지는 잠긴 카드 하나로 알린다)
const demoOk = s => !window.__DEMO || (window.__DEMO === 'all' ? !s.city : window.__DEMO.includes(s.id));
// 첫 화면·의뢰 장부·도움말: 셋 중 하나만 보인다
function showMenu(which) { { const h = $('help'); if (h) h.classList.remove('over'); } ['intro', 'ledger', 'help'].forEach(id => { const el = $(id); if (el) el.hidden = id !== which; }); const el = $(which); if (el) el.scrollTop = 0; }
const RANK_TXT = r => r ? '최고 ' + r : '';
function renderStageList() {
  syncQuick();
  const best = loadBest(), next = quickTarget();
  const locked = STAGES.filter(s => !demoOk(s) && !s.city);
  const row = ([s, i]) => {
    const st = starsOf(s), all = s.challenges ? 1 + s.challenges.length : 0, rk = best[s.id + '_' + DKEY] || best[s.id];
    const stars = s.challenges ? `<span class="st-stars ${st ? 'has' : ''}" aria-label="별 ${st}개 / ${all}개">${'★'.repeat(st)}${'☆'.repeat(Math.max(0, all - st))}</span>` : '';
    const mods = !s.tutorial && stageCleared(s) ? `<span class="st-rank">변형 ${Object.keys(MODS).filter(k => (loadCh()[s.id] || {})['mod_' + k]).length}/4</span>` : '';
    const map = !s.tutorial && window.__THUMBS && __THUMBS[s.id] ? `<img class="st-map" src="${__THUMBS[s.id]}" alt="${s.name} 지도">` : '';
    const fee = s.fee ? `<span class="st-fee"><small>수고비</small>${s.fee}</span>` : '';
    const sub = s.tutorial ? ((s.sub || '').match(/\(([^)]*)\)/) || ['', ''])[1].replace(/, /g, ' · ') : s.mission, tno = (s.name.match(/^연습 (\d)/) || ['', ''])[1];
    return `<button class="stage ${s.tutorial ? 'tut' : ''} ${i === next ? 'next' : ''}" type="button" data-i="${i}">
      <span class="st-no">${s.tutorial ? tno : s.no}</span><span class="st-name">${s.name.replace(/^연습 \d · /, '')}</span>${fee}
      <span class="st-mis">${sub}</span>${map}
      <span class="st-foot">${i === next ? '<span class="st-next">다음 차례</span>' : ''}${stars}${rk ? `<span class="st-rank">최고 ${RANK_TXT(rk)}</span>` : ''}${mods}</span>
    </button>`;
  };
  const list = STAGES.map((s, i) => [s, i]).filter(([s]) => demoOk(s));
  const tuts = list.filter(([s]) => s.tutorial).sort((a, b) => (b[0].id === 'tI') - (a[0].id === 'tI')), miss = list.filter(([s]) => !s.tutorial && !s.city), city = list.filter(([s]) => s.city);
  $('stageList').innerHTML = `<div class="lg-sec">연습</div>` + tuts.map(row).join('') + `<div class="lg-sec">의뢰</div>` + miss.map(row).join('') + (city.length ? `<div class="lg-sec">도시 (시제품)</div>` + city.map(row).join('') : '')
    + (locked.length ? `<div class="stage locked"><span class="st-no">${locked[0].no}</span><span class="st-name">의뢰 ${locked.length}개 더</span><span class="st-stamp">정식판</span><span class="st-mis">${locked.map(s => s.name).join(', ')}</span></div>` : '');
  $('stageList').querySelectorAll('.stage[data-i]').forEach(b => b.addEventListener('click', () => { CITY_RET = null; start(+b.dataset.i); }));
  { const pl = $('perkList'); if (pl) { pl.hidden = false; { const n = totalStars(); pl.innerHTML = `<h3>장비 <small>별 ${n}개</small></h3>` + PERKS.map(([need, k, name]) => `<span class="perk ${n >= need ? 'on' : ''}"><b>★${need}</b> ${name}</span>`).join(''); } } }
  { const mb = $('modBox'); if (mb) { mb.hidden = false; document.querySelectorAll('#modSel button').forEach(b => b.classList.toggle('on', b.dataset.m === MOD)); const mn = $('modNote'); if (mn) mn.textContent = MOD ? MODS[MOD][1] + ' — 한 번 깬 의뢰에만 적용된다.' : '한 번 깬 의뢰는 조건을 바꿔 다시 할 수 있다. 깬 변형은 목록에 표시된다.'; } }
}

