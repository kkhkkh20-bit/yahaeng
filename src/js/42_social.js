// ---------------------------------------------------------------- 사람 사는 동네 (히트맨식 2단계): 주민 신고 · 표적 일과표 · 단계형 기회 · 현장 물건
// 구역(STAGE.zones)이 있는 판에서만 새 규칙을 쓴다. 옛 판은 그대로

// ---- 주민 신고 (파티 하드식): 범죄를 본 주민은 짧게 외치고 가장 가까운 자경대원에게 뛰어가 알린다.
// 가는 길에 막으면(기절) 신고는 없던 일. 닿으면 그 자리로 수색이 오고, 주민이 본 옷차림은 그 판 동안 통하지 않는다
function reportTo(g) {
  let best = null, bd = 1600;
  for (const o of S.guards) { if (o.civ || o.dog || o.target || ['DEAD', 'CAPTIVE', 'FLEE', 'TERROR'].includes(o.state) || flOf(o) !== flOf(g) || (o.z || 0)) continue; const d = dist(o.x, o.y, g.x, g.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
function startReport(g, x, y, c, saw) {
  const to = reportTo(g); if (!to) return false;
  endChat(g); g.state = 'REPORT'; g.rep = { x, y, c: c || null, saw: saw || null, to, t: 0, rp: 0 }; g.path = null; g.icon = '!'; g.iconT = 99; g.meter = 1; g.wait = 0;
  S.stats.screams = (S.stats.screams || 0) + 1; logEv('witness', g.x, g.y);
  gsay(g, c ? ['저기 사람이 쓰러졌어!', '누가 좀 와 봐요!', '사람이 쓰러져 있어요!'][g.id % 3] : ['저 사람 수상해요!', '도둑이야! 경비 아저씨!', '저기요! 저 사람이요!'][g.id % 3], 2.2);
  play('call', 0.5 * proxVol(g), 1.6); noise(g.x, g.y, 150, 'scream', flOf(g));
  hint('report', '신고하러 뛰는 주민: 머리 위 ! 와 붉은 점선이 가는 곳이다. 자경대원에게 닿기 전에 막으면(기절) 신고는 없던 일이 된다');
  return true;
}
function updateReport(g, dt) {
  const r = g.rep; r.t += dt; g.icon = '!'; g.iconT = 0.5;
  if (!r.to || ['DEAD', 'CAPTIVE', 'FLEE', 'TERROR'].includes(r.to.state)) { r.to = reportTo(g); g.path = null; }
  if (!r.to || r.t > 30) { g.state = 'PANIC'; g.panicT = 5; g.fear = { x: r.x, y: r.y }; g.path = null; g.cowered = false; g.rep = null; return; }
  if ((r.rp -= dt) <= 0 || !g.path) { pathTo(g, r.to.x, r.to.y); r.rp = 0.6; }
  moveAlong(g, SPD.flee * 1.05, dt); g.moving = true;
  if (dist(g.x, g.y, r.to.x, r.to.y) < 58) deliverReport(g);
}
function deliverReport(g) {
  const r = g.rep, o = r.to, P = S.player; g.rep = null;
  S.stats.witness = (S.stats.witness || 0) + 1; logEv('report', g.x, g.y);
  gsay(g, r.c ? '저쪽에 사람이 쓰러져 있어요!' : '저쪽에서 어떤 사람이 사람을 해쳤어요!', 2.6);
  endChat(o); o.act = null; o.bubble = null; o.want = Math.atan2(g.y - o.y, g.x - o.x);
  if (r.c && !r.c.discovered && !r.c.stashed && !r.c.carried) { o.state = 'BODY'; o.body = r.c; o.path = null; setIcon(o, '!?'); }
  else { goSuspicious(o, r.x, r.y, 6); o.why = 'heard'; }
  setTimeout(() => { if (o.state !== 'DEAD') gsay(o, ['어디? 같이 가 봅시다.', '알겠어요, 확인할게요.', '뭐? 어느 쪽이요?'][o.id % 3]); }, 900);
  setAlert(2, 30, '주민이 자경대원에게 신고했다 — 수색 시작');
  if (r.saw && r.saw !== 'face' && P.outfit === r.saw && disguised()) blowDisguise(null, `신고한 주민이 ${outfitName(r.saw)} 차림을 말했다 — 이 옷은 이제 통하지 않는다`);
  else if (r.saw === 'face') { S.chaseSeen = true; toast('신고한 주민이 얼굴을 말했다 — 수색이 끝날 때까지 거리에서도 알아본다', 2.8, 'warn'); }
  g.state = 'PANIC'; g.panicT = 4; g.fear = { x: r.x, y: r.y }; g.path = null; g.cowered = false;
}
function drawReport(g) {
  if (g.state !== 'REPORT' || !g.rep || !g.rep.to || flOf(g) !== flOf(S.player)) return; const o = g.rep.to;
  ctx.save(); ctx.strokeStyle = 'rgba(255,90,70,.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -S.t * 40;
  ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(o.x, o.y); ctx.stroke(); ctx.restore();
  if (dist(g.x, g.y, S.player.x, S.player.y) < 600) tag(g.x, g.y + 34, '신고하러 간다', '#ff8a76', 0.95);
}

// ---- 표적 일과표 (이스케이피스트·히트맨식): 장소마다 머무는 시간과 하는 일. 경로(route)로 바꿔 쓰고, 이름은 정보 카드에 쓴다
// 스테이지: { kind: 't', target: true, sched: [{ at: [x, y], stay: 초, name: '장소', act: '하는 일' }, ...], schedKey: 'tgtNext' }
function schedRoute(d) { return d.sched ? d.sched.map(s => [s.at[0], s.at[1], s.stay]) : d.route; }
function schedNow(g) {
  if (!g.sched) return null; const n = g.sched.length, moving = g.wait <= 0 && !!g.path;
  const cur = moving ? null : g.sched[(g.ri - 1 + n) % n], next = g.sched[moving ? g.ri % n : g.ri % n];
  return { cur, next, moving };
}
function schedText(g) {
  const s = schedNow(g); if (!s) return null; const know = !g.schedKey || (S.player.keys || {})[g.schedKey];
  const now = s.moving ? `${s.next.name}(으)로 가는 중` : `${s.cur.name} — ${s.cur.act}`;
  return now + (know && !s.moving ? ` · 다음: ${s.next.name}` : '');
}

// ---- 단계형 기회 (히트맨의 기회·미션 스토리식): 엿듣기 → 물건 → 장소 같은 사슬. 하나를 추적하면 다음 단계 위치를 표시
// STAGE.stories = [{ id, name, reveal: S => bool, steps: [{ text, done: S => bool, at: [x, y, fl] }] }]
// 안내 강도: oppMode 2 = 전체(다음 단계 위치 표시), 1 = 최소(목록만), 0 = 끔
function storiesInit() {
  S.stories = (STAGE.stories || []).map(d => ({ d, found: false, step: 0, done: false }));
  S.storyTrack = null;
}
function updateStories(dt) {
  if (!S.stories) storiesInit();
  if ((S.storyT = (S.storyT || 0) - dt) > 0) return; S.storyT = 0.3;
  for (const st of S.stories) {
    if (st.done) continue;
    if (!st.found) { let rv = false; try { rv = st.d.reveal ? !!st.d.reveal(S) : false; } catch (e) {} if (!rv) continue;
      st.found = true; if (!S.storyTrack) S.storyTrack = st.d.id; if (oppMode) { toast('기회 발견 — ' + st.d.name, 3, 'good'); play('click', 0.35, 1.3); } }
    let adv = false;
    while (st.step < st.d.steps.length) { let ok = false; try { ok = !!st.d.steps[st.step].done(S); } catch (e) {} if (!ok) break; st.step++; adv = true; }
    if (st.step >= st.d.steps.length) { st.done = true; S.stats.stories = (S.stats.stories || 0) + 1; if (oppMode) toast('기회 완료 — ' + st.d.name, 2.6, 'good'); if (S.storyTrack === st.d.id) { const nx = S.stories.find(o => o.found && !o.done); S.storyTrack = nx ? nx.d.id : null; } }
    else if (adv && oppMode === 2 && S.storyTrack === st.d.id) toast('다음 — ' + st.d.steps[st.step].text, 2.6);
  }
}
const storyStep = st => st.done ? null : st.d.steps[st.step];
function storyLines() {
  const L = []; if (!oppMode || !S.stories) return L;
  for (const st of S.stories) { if (!st.found) continue; const tr = S.storyTrack === st.d.id, s = storyStep(st);
    L.push([st.done ? 'opp done' : 'opp', (tr && !st.done ? '▶ ' : '') + '기회: ' + st.d.name + (st.done ? '' : oppMode === 2 && s ? ' — ' + s.text : ` (${st.step}/${st.d.steps.length})`)]); }
  return L;
}
function trackNextStory() {
  const f = (S.stories || []).filter(o => o.found && !o.done); if (!f.length) return;
  const i = f.findIndex(o => o.d.id === S.storyTrack); S.storyTrack = f[(i + 1) % f.length].d.id; hudCache.objH = null;
  toast('추적: ' + f[(i + 1) % f.length].d.name, 1.6);
}
function drawStoryMark(P) {
  if (oppMode !== 2 || !S.stories) return; const st = S.stories.find(o => o.d.id === S.storyTrack); if (!st || st.done) return;
  const s = storyStep(st); if (!s || !s.at) return; const fl = s.at[2] || 0; if (fl !== flOf(P) && !tactical) return;
  const x = tc(s.at[0]), y = tc(s.at[1]), k = Math.max(1, 0.95 / SCALE), b = 6 * Math.sin(S.t * 4);
  ctx.save(); ctx.fillStyle = '#f2c46b'; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.moveTo(x, y - 30 * k + b); ctx.lineTo(x - 9 * k, y - 46 * k + b); ctx.lineTo(x + 9 * k, y - 46 * k + b); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  tag(x, y - 58 * k + b, st.d.name, '#f2c46b', 0.95);
  if (!tactical && dist(P.x, P.y, x, y) > 520) { const a = Math.atan2(y - P.y, x - P.x); ctx.save(); ctx.translate(P.x + Math.cos(a) * 70, P.y + Math.sin(a) * 70); ctx.rotate(a); ctx.fillStyle = 'rgba(242,196,107,.85)'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore(); }
}

// ---- 현장 물건 (히트맨식): 들고 있는 물건 한 칸. 물건이 허가처럼 작동하기도 하고(택배 상자 → 창고), 정해진 곳에서 쓴다(배탈약 → 술)
// STAGE.props = [{ id, name, at: [x, y], fl, permit: 'courier', outfit: 'staff' (놓인 옷), consume }]
// STAGE.uses = [{ need: 'emetic', at: [x, y], fl, label: '술에 배탈약 타기', act: S => {...}, keep }]
function propsInit() { S.props = (STAGE.props || []).map(d => Object.assign({}, d, { x: tc(d.at[0]), y: tc(d.at[1]), fl: d.fl || 0, taken: false })); S.usesDone = {}; }
function nearProp() {
  const P = S.player; if (!S.props || P.z || P.wire || P.carrying || P.captive || P.hide) return null; let best = null, bd = 48;
  for (const p of S.props) { if (p.taken || p.fl !== flOf(P)) continue; const d = dist(P.x, P.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
  return best;
}
function nearUse() {
  const P = S.player; if (!P.item || P.z || P.wire || P.hide) return null;
  for (const [i, u] of (STAGE.uses || []).entries()) { if (S.usesDone[i] || u.need !== P.item.id || (u.fl || 0) !== flOf(P)) continue; if (dist(P.x, P.y, tc(u.at[0]), tc(u.at[1])) < 56) return { u, i }; }
  return null;
}
function takeProp(p) {
  const P = S.player;
  if (p.outfit) {  // 놓인 옷: 그 자리에서 갈아입는다
    p.taken = true; P.disguise = PR_PAL[p.outfit] ? p.outfit : P.disguise; P.outfit = p.outfit; P.disguiseBlown = !!(P.blown || {})[p.outfit]; play('cloth', 0.6); noise(P.x, P.y, 30, 'cloth'); S.fade = 0.25; S.stats.dressed = (S.stats.dressed || 0) + 1;
    toast(P.disguiseBlown ? `${outfitName(p.outfit)} — 이미 들통난 옷이다` : `${outfitName(p.outfit)}으로 갈아입었다 — 초록 경계선 안은 지나다닐 수 있다`, 3, P.disguiseBlown ? 'warn' : 'good'); return;
  }
  if (P.item) dropItem();
  p.taken = true; P.item = p; play('cloth', 0.4); play('click', 0.3);
  toast(`${p.name}을(를) 들었다` + (p.permit ? ` — ${outfitName(p.permit)}처럼 통하는 곳이 있다` : ''), 2.4, 'good');
  hint('item', '들고 있는 물건: 한 번에 하나만. Z(특수)로 내려놓는다. 쓰는 곳 앞에서는 Z로 쓴다');
}
function dropItem() {
  const P = S.player, p = P.item; if (!p) return; P.item = null; p.taken = false; p.x = P.x; p.y = P.y + 6; p.fl = flOf(P); play('drop', 0.3);
}
function useItem(n) {
  const P = S.player, u = n.u; S.usesDone[n.i] = true; P.useT = S.t + 0.9; P.strikeT = Math.max(P.strikeT || 0, 0.5); play('cloth', 0.4);
  if (!u.keep) { const p = P.item; P.item = null; if (p) p.used = true; }
  try { u.act && u.act(S); } catch (e) { console.warn('use', e); }
  toast(u.done || '했다', 2.4, 'good');
}
function drawProps() {
  for (const p of S.props || []) { if (p.taken || p.fl !== flOf(S.player)) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-11, -4, 24, 12);
    ctx.fillStyle = p.outfit ? '#6fae7e' : p.id === 'box' ? '#b78a52' : '#d9d2c2'; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 1.5; ctx.fillRect(-10, -9, 20, 15); ctx.strokeRect(-10, -9, 20, 15);
    ctx.restore(); if (dist(p.x, p.y, S.player.x, S.player.y) < 260) tag(p.x, p.y - 20, p.name, '#f4e3c2', 0.85); }
}
