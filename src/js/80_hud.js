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
  if (S.exitOpen) { x.strokeStyle = '#f2c46b'; x.lineWidth = 2; x.beginPath(); x.arc(T(S.exit.x), T(S.exit.y), 5, 0, TAU); x.stroke(); }
  for (const it of S.items) if (!it.got) { x.fillStyle = '#f2c46b'; x.fillRect(T(it.x) - 2.5, T(it.y) - 2.5, 5, 5); if (it.fl) { x.fillStyle = '#0b0d12'; x.font = '700 7px monospace'; x.textAlign = 'center'; x.fillText(String(it.fl + 1), T(it.x), T(it.y) + 2.5); } }
  // 보이는 사람만: 같은 층·시선이 닿는 자경대원(경계 단계 색), 주민은 초록
  for (const g of S.guards) {
    if (g.state === 'DEAD') continue;
    const same = flOf(g) === flOf(P) && !P.under && !P.vent;
    const seen = g.target || (same && dist(g.x, g.y, P.x, P.y) < 560 && los(P.x, P.y, g.x, g.y, P.z > 0)) || g.state === 'ALERT';
    if (!seen) continue;
    x.fillStyle = g.target ? '#ff5a4a' : g.civ ? '#9ad69a' : g.state === 'ALERT' ? '#e8473c' : ['SUSPICIOUS', 'SEARCH', 'NOTICE', 'CHECK', 'BODY'].includes(g.state) ? '#f2c46b' : '#c8d2e6';
    x.beginPath(); x.arc(T(g.x), T(g.y), g.target ? 3 : 2.2, 0, TAU); x.fill();
  }
  for (const c of S.cams || []) if (!c.broken && c.fl === flOf(P)) { x.fillStyle = camOn(c) ? '#ff4a4a' : '#6a6a6a'; x.fillRect(T(c.x) - 2, T(c.y) - 2, 4, 4); }
  // 나
  x.save(); x.translate(T(P.x), T(P.y)); x.rotate(P.a); x.fillStyle = '#7fe3ff'; x.beginPath(); x.moveTo(5, 0); x.lineTo(-3.5, -3.5); x.lineTo(-2, 0); x.lineTo(-3.5, 3.5); x.closePath(); x.fill(); x.restore();
  if (P.fl || P.z) { x.fillStyle = '#7fe3ff'; x.font = '700 9px monospace'; x.textAlign = 'left'; x.fillText(P.fl ? (P.fl + 1) + 'F' : 'R', T(P.x) + 5, T(P.y) - 4); }
}
// 목표 목록: 무엇을 어디서 (건물 이름·층) — 한 줄씩, 끝낸 것은 줄 긋기
function objectiveLines() {
  const L = [], P = S.player;
  const place = (x, y, fl, b) => { const bi = b != null ? b : bldAt(Math.floor(x / TILE), Math.floor(y / TILE)); if (bi < 0) return '바깥'; const B = BLD[bi]; const nm = B.name ? B.name + (B.plate && !B.plate.includes(B.name) && !B.name.includes(B.plate) ? '(' + B.plate + ')' : '') : B.plate || (B.kind === 'shop' ? ((B.signs || [])[fl || 0] || '상가') + ' 건물' : B.kind === 'house' ? '단독주택' : '빌라'); return nm + ' ' + ((fl || 0) + 1) + '층'; };
  if (S.mod) L.push(['info', '변형: ' + MODS[S.mod][0] + ' — ' + MODS[S.mod][1]]);
  if (STAGE.steps && (S.tutI || 0) < STAGE.steps.length) L.push(['go tut', `연습 ${(S.tutI || 0) + 1}/${STAGE.steps.length}: ${STAGE.steps[S.tutI || 0][0]}`]);
  if (S.exitOpen && !(STAGE.steps && (S.tutI || 0) < STAGE.steps.length)) L.push(['go', '탈출 지점(노란 원)으로']);
  if ((STAGE.keyBld || STAGE.keyDoors) && !STAGE.tutorial) { if (S.doors.some(d => d.keyLock)) L.push([P.hasKey || !S.doors.some(d => d.keyLock && d.locked) ? 'done' : '', P.hasKey ? '열쇠 있음' : '열쇠 확보 (또는 창문·옥상으로)']); }
  else { const ks = Object.keys(P.keys || {}); if (ks.length) L.push(['info', '가진 것: ' + ks.map(keyName).join(', ')]); }
  (S.learned || []).forEach(t => L.push(['info', '알아낸 것: ' + t]));
  if (P.disguise) L.push([P.disguiseBlown ? 'go' : 'info', STAGE.zones ? (P.disguiseBlown ? `${outfitName(P.outfit)} 들통남 — 다른 옷을 구하라` : `${outfitName(P.outfit)} — 초록 경계선 안은 지나다닐 수 있다`) : P.disguiseBlown ? '변장 들통남 — 다시 갈아입을 옷을 찾아라' : '변장 중 — 걸으면 멀리서는 안 들킨다']);
  if (STAGE.shift && S.shiftI < STAGE.shift.add.length) L.push(['', `다음 교대까지 ${Math.max(0, Math.ceil(S.shiftT))}초 — 순찰이 늘어난다`]);
  for (const g of S.guards) if (g.target) { const r = g.route[0], sc = g.state !== 'DEAD' && schedText(g); L.push([g.state === 'DEAD' ? 'done' : S.spare ? 'done' : '', (g.doc ? '한 선생' : '표적') + (S.spare && g.state !== 'DEAD' ? ' — 살려 둘 수 있다' : sc ? ' — ' + sc : ' — ' + place(r.x, r.y, g.fl))]); }
  S.items.forEach((it, i) => L.push([it.got ? 'done' : '', ((STAGE.itemNames || [])[i] || STAGE.itemName || '서류') + ' — ' + place(it.x, it.y, it.fl, it.b)]));
  if (P.item) L.push(['info', '들고 있는 것: ' + P.item.name + (P.item.permit ? ` (${outfitName(P.item.permit)}처럼 통한다)` : '')]);
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
function updateHUD(force) {
  if (force) hudCache = {};
  const P = S.player;
  setText(hud.objT, 'objT', STAGE.sub);
  if (CITY) { const html = objectiveLines().map(([c, t]) => `<span class="ol ${c}">${c.includes('done') ? (c.includes('opp') ? '◆' : '●') : c.startsWith('go') ? '▶' : c === 'opp' ? '◇' : '○'} ${t}</span>`).join(''); if (hudCache.objH !== html) { hudCache.objH = html; hud.obj.innerHTML = html; } }
  else setText(hud.obj, 'obj', objectiveText() + (S.timeLeft ? ` · ${Math.floor(S.timeLeft / 60)}:${String(Math.floor(S.timeLeft % 60)).padStart(2, '0')}` : '') + (P.hasKey ? ' · 열쇠 있음' : ''));
  if (CITY) drawMini();
  hud.obj.classList.toggle('urgent', !!S.timeLeft && S.timeLeft < 60);
  const lv = P.hidden ? 0 : P.light;
  hud.light.style.width = Math.round(lv * 100) + '%';
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  const bnm = !P.z && !P.wire && bldAt(ptx, pty) >= 0 && BLD[bldAt(ptx, pty)].name ? ' · ' + BLD[bldAt(ptx, pty)].name : '';
  const zi0 = STAGE.zones ? pZoneInfo() : null, zk0 = zi0 ? zi0.k : STAGE.tutorial ? -1 : Z_HOS, ok0 = zi0 && permitted(zi0);
  setText(hud.layer, 'layer', (zk0 >= 0 ? Z_NAME[zk0] + (ok0 ? '(통과)' : '') + ' · ' : '') + (P.vent ? '환풍구' : P.under ? '지하 수로' : P.wire ? '전깃줄' : P.fl ? `실내 ${P.fl + 1}층` : P.z ? `옥상 ${P.z}층` : bldAt(ptx, pty) >= 0 ? '실내 1층' : '지상') + (STAGE.zones ? '' : bnm));
  hud.layer.dataset.l = P.vent ? 'vent' : P.under ? 'under' : P.z ? 'roof' : bldAt(ptx, pty) >= 0 ? 'in' : 'out';
  hud.layer.dataset.z = zk0 >= 0 ? (ok0 ? 'pub' : ['pub', 'res', 'hos'][zk0]) : '';
  setText(hud.lightLbl, 'll', P.vent ? '덕트 안' : P.under ? '지하 수로' : P.hide ? (P.hide.type === 'well' ? (STAGE.well === 'manhole' ? '맨홀 은신' : '땅굴 은신') : hideName(P.hide) + ' 은신') : P.hidden ? '화단 은신' : P.jump ? '공중' : P.wire ? '전깃줄' + (lv > 0.4 ? '·노출' : '') : P.z ? P.z + '층 옥상' + (lv > 0.4 ? '·노출' : '') : lv > 0.55 ? '빛 노출' : lv > 0.22 ? '어스름' : '어둠');
  hud.light.dataset.level = P.hidden ? 'hid' : lv > 0.55 ? 'hi' : lv > 0.22 ? 'mid' : 'lo';
  setText(hud.mode, 'mode', input.aiming ? TOOL_NAME[input.tool] + ' 조준' : P.hide ? '숨는 중' : P.captive ? '붙잡는 중 ' + Math.max(0, Math.ceil(9 - P.captive.captT)) + '초' : P.carrying ? '운반 중' : P.cover ? (P.cover.kind === 'tree' ? '나무에 기댐' : P.cover.kind === 'car' ? '차 뒤에 붙음' : '벽에 기댐') : P.trav ? '오르는 중' : (input.sneakToggle ? '[살금 모드] ' : input.walkLock ? '[항상 걷기] ' : '') + { sneak: '살금살금', walk: '걷기', run: '달리기' }[P.mode] + (CITY && loudMul(P.x, P.y, flOf(P)) < 1 ? (loudMul(P.x, P.y, flOf(P)) < 0.5 ? ' · 음악에 묻힘' : ' · 음악 소리') : ''));
  syncTools();
  setText(hud.kills, 'k', '제거 ' + S.stats.kills);
  const fleeNow = S.fleeing && S.guards.some(g => g.state === 'FLEE');
  hud.alarm.hidden = !(S.alevel || fleeNow);
  hud.alarm.dataset.lv = S.alevel;
  if (S.alevel || fleeNow) {
    const t = S.alevel === 3 ? '발각 — 숨어서 ' + Math.max(0, Math.ceil(15 - S.unseenT)) + '초 버티기' : A_NAME[S.alevel] + ' ' + Math.ceil(S.alevelT) + '초';
    setText(hud.alarm, 'al', (fleeNow ? '표적 도주 · ' : '') + t);
  }
  hud.pips.forEach((p, i) => p.classList.toggle('on', i < S.alevel));
  const hpKey = P.hp + '/' + P.hpMax; if (hudCache.hp !== hpKey) { hudCache.hp = hpKey; hud.hp.innerHTML = Array.from({ length: P.hpMax }, (_, i) => `<i class="${i < P.hp ? 'on' : ''}"></i>`).join(''); }
  { const el = $('expoLbl'); if (el) { el.hidden = !CITY; if (CITY) { const e = P.hide || P.under || P.vent ? 0 : S.expo || 0; const ek = e + (STAGE.zones && pZoneEff() === Z_PUB ? 'p' : ''); if (hudCache.expo !== ek) { hudCache.expo = ek; el.dataset.e = e; el.textContent = e === 2 ? '보인다!' : e === 1 ? '들킬 수 있음' : (STAGE.zones && !P.hide && pZoneEff() === Z_PUB ? (disguised() ? '변장' : '행인') : '숨음'); } } } }
  { const hc = $('hintCard'), dl = $('dlg'); if (hc && dl) hc.style.visibility = dl.hidden ? '' : 'hidden'; }
  { const pl = $('pickLbl'); if (pl) { pl.hidden = !CITY; if (CITY) setText(pl, 'picks', '락픽 ' + (P.picks || 0)); } }
  const pa = primaryAction();
  setText(hud.act.querySelector('b'), 'act', pa.k === 'none' && !pa.stalk ? '행동' : pa.label);
  hud.act.classList.toggle('ready', pa.k !== 'none');
  const sa = secondaryAction();
  setText(hud.carry.querySelector('b'), 'carry', sa.label);
  hud.carry.classList.toggle('ready', sa.k !== 'none');
  hud.act.classList.toggle('kill', ['kill', 'kill2', 'drop', 'ambush', 'ventKill'].includes(pa.k));
}
// 도구 선택 표시 (아래 오른쪽 작은 칸 + 도구 버튼 글자)
function syncTools() {
  if (!S) return; const P = S.player;
  document.querySelectorAll('#tools .tool').forEach(b => {
    const t = b.dataset.t; b.classList.toggle('on', t === input.tool); b.classList.toggle('empty', toolCount(t) <= 0);
    setText(b.querySelector('span'), 'tc_' + t, String(toolCount(t)));
  });
  setText(hud.tool.querySelector('b'), 'toolb', TOOL_NAME[input.tool] + ' ' + toolCount(input.tool));
  hud.tool.classList.toggle('aiming', !!input.aiming);
  hud.tool.classList.toggle('ready', input.tool === 'kunai' ? !!kunaiTarget() : toolCount(input.tool) > 0);
}

function endGame(win, reason) {
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
function showEnd(win, reason) {
  running = false;
  const st = S.stats, t = Math.floor(S.t);
  const hasTargets = S.guards.some(g => g.target);
  let rank = '';
  if (win) {
    // 그림자 조건 (히트맨의 사일런트 어새신식): 다섯 가지를 모두 채우면 그림자
    const bonus = [['발각 0', st.detected === 0], [hasTargets ? '표적 외 살상 0' : '살상 0', hasTargets ? st.extraKills === 0 : st.kills === 0], ['시체·기절자 발견 0', st.bodies === 0], ['목격자 0', STAGE.zones ? !(st.witness || 0) : !(st.screams || 0)], ['CCTV 기록 0', !(st.camRec || 0)]];
    S.bonus = bonus;
    if (STAGE.challenges) {
      const all = loadCh(), mine = all[STAGE.id] || (all[STAGE.id] = {}); mine._clear = true; if (S.mod) mine['mod_' + S.mod] = true;
      S.chRes = STAGE.challenges.map(id => { const ok = !!(CH[id] && CH[id][1]()), fresh = ok && !mine[id]; if (ok) mine[id] = true; return [id, ok, fresh, !!mine[id]]; });
      saveCh(all);
    }
    const n = bonus.filter(b => b[1]).length;
    rank = n === 5 ? '그림자' : n === 4 ? '암살자' : n === 3 ? '침입자' : '소란꾼';
    saveBest(STAGE.id + '_' + DKEY, rank); saveBest(STAGE.id, rank);
  }
  $('endTitle').textContent = win ? (STAGE.tutorial ? '연습 끝' : '임무 완료') : '실패';
  $('endSub').textContent = win ? (STAGE.id === 't0' ? '기본을 익혔다. 의뢰 01로 가거나, 연습 2(고급)에서 전깃줄·낙하 암살·락픽을 익힐 수 있다.' : STAGE.tutorial ? '고급 기술까지 익혔다. 이제 의뢰 01부터 시작하자.' : '등급: ' + rank) : (reason || '') + ' 경로와 타이밍을 바꿔 다시 시도해 보자.';
  if (win && STAGE.spare) { const tg = S.guards.find(g => g.target); $('endSub').textContent += ' · ' + (tg && tg.state !== 'DEAD' ? STAGE.spare.endSpared : S.realized ? STAGE.spare.endRealized : STAGE.spare.endKilled); }
  $('endStats').innerHTML = [
    ['소요 시간', Math.floor(t / 60) + '분 ' + String(t % 60).padStart(2, '0') + '초'], ['제거', st.kills + '명'], ['특수 암살', st.special + '회'], ['발각 횟수', st.detected + '회'],
    ['발견된 시체', st.bodies + '구'], ['숨긴 시체', st.stashed + '구'], ['기절시킨 사람', (st.ko || 0) + '명'], [STAGE.zones ? '신고한 주민' : '주민 비명', (STAGE.zones ? st.witness || 0 : st.screams || 0) + (STAGE.zones ? '명' : '회')], ['빈 캔·다트', st.stonesUsed + ' · ' + st.kunaiUsed]
  ].concat(st.cpUsed ? [['체크포인트 재시작', st.cpUsed + '회']] : []).map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
  $('endRankNote').innerHTML = !win ? '' : STAGE.challenges ? (() => { const n = starsOf(STAGE), max = 1 + STAGE.challenges.length;
      return `<div class="ent">그림자 조건 ${S.bonus.map(b => `<span class="bn ${b[1] ? 'ok' : ''}">${b[1] ? '●' : '○'} ${b[0]}</span>`).join(' ')}</div><div class="stars">${'★'.repeat(n)}${'☆'.repeat(max - n)} <small>별 ${n}/${max}</small></div>` + S.chRes.map(([id, ok, fresh, ever]) => `<span class="bn ${ok ? 'ok' : ''}">${ok ? '●' : ever ? '◐' : '○'} ${chName(id)}${fresh ? ' <b>새로 달성</b>' : ''}</span>`).join(' ')
        + ((STAGE.entries || []).some(e => e.need && e.need <= n) ? `<div class="ent">열린 진입로: ${(STAGE.entries || []).filter(e => (e.need || 0) <= n).map(e => e.name).join(' · ')}</div>` : ''); })()
      : '난이도 ' + D().name + ' · 보너스 목표 ' + S.bonus.map(b => `<span class="bn ${b[1] ? 'ok' : ''}">${b[1] ? '●' : '○'} ${b[0]}</span>`).join(' ');
  if (S.mod) $('endRankNote').innerHTML += `<div class="ent">변형: ${MODS[S.mod][0]}${win ? ' — 깼다' : ''}</div>`;
  if (CITY && win && S.stars0 != null) { const n = totalStars(), nw = PERKS.filter(([need]) => need > S.stars0 && need <= n); if (nw.length) $('endRankNote').innerHTML += `<div class="ent">새 장비 해금: ${nw.map(p => p[2]).join(' · ')}</div>`; }
  drawEndMap();
  $('btnNext').hidden = !(win && (STAGE.tutorial || (STAGE_I < STAGES.length - 1 && !STAGES[STAGE_I + 1].tutorial)));
  $('btnCP').hidden = win || !cpReady();
  $('hud').hidden = true; $('joy').hidden = true; $('end').hidden = false; $('end').dataset.win = win ? '1' : '0';
  renderStageList();
}

if (!CITY) document.querySelectorAll('.cityonly').forEach(e => e.remove());
if (CITY) document.querySelectorAll('.nocity').forEach(e => e.remove());
function renderStageList() {
  syncQuick();
  const best = loadBest();
  $('stageList').innerHTML = STAGES.map((s, i) => [s, i]).sort((a, b) => (b[0].tutorial ? 1 : 0) - (a[0].tutorial ? 1 : 0)).map(([s, i]) => `
    <button class="stage" type="button" data-i="${i}">
      <span class="st-no">${s.no}</span>
      <span class="st-body"><span class="st-name">${s.name}</span><span class="st-mis">${s.mission}</span></span>
      <span class="st-best ${best[s.id + '_' + DKEY] || starsOf(s) ? 'has' : ''}">${CITY && !s.tutorial && stageCleared(s) ? `<small class="modc">변형 ${Object.keys(MODS).filter(k => (loadCh()[s.id] || {})['mod_' + k]).length}/4</small> ` : ''}${s.challenges ? '★'.repeat(starsOf(s)) + '☆'.repeat(1 + s.challenges.length - starsOf(s)) : best[s.id + '_' + DKEY] ? D().name + ' 최고 ' + best[s.id + '_' + DKEY] : D().name + ' 미완료'}</span>
    </button>`).join('');
  $('stageList').querySelectorAll('.stage').forEach(b => b.addEventListener('click', () => start(+b.dataset.i)));
  { const pl = $('perkList'); if (pl) { pl.hidden = !CITY; if (CITY) { const n = totalStars(); pl.innerHTML = `<h3>장비 <small>별 ${n}개</small></h3>` + PERKS.map(([need, k, name]) => `<span class="perk ${n >= need ? 'on' : ''}"><b>★${need}</b> ${name}</span>`).join(''); } } }
  document.querySelectorAll('#diffSel button').forEach(b => b.classList.toggle('on', b.dataset.d === DKEY));
  { const mb = $('modBox'); if (mb) { mb.hidden = !CITY; document.querySelectorAll('#modSel button').forEach(b => b.classList.toggle('on', b.dataset.m === MOD)); const mn = $('modNote'); if (mn) mn.textContent = MOD ? MODS[MOD][1] + ' — 한 번 깬 의뢰에만 적용된다.' : '한 번 깬 의뢰는 조건을 바꿔 다시 할 수 있다. 깬 변형은 목록에 표시된다.'; } }
}

