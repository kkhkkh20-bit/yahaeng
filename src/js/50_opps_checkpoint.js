// ---------------------------------------------------------------- 기회 (Hitman식): 직접 보거나 엿들어 알게 된 암살 수단을 임무 칸에 모은다
function oppsInit() {
  S.opps = [];
  (S.traps || []).forEach((tr, i) => { if (tr.noOpp) return; const p = tr.k === 'shock' ? tr.sw : tr.at;  // noOpp: 단계형 기회(stories)가 같은 수단을 안내하면 옛 목록에선 뺀다
    S.opps.push({ k: 'trap', ref: i, x: tc(p[0]), y: tc(p[1]), fl: 0, roof: tr.k === 'drop', text: tr.k === 'shock' ? '전선을 끊어 물웅덩이 감전시키기' : '옥상 간판을 떨어뜨려 아래를 덮치기' }); });
  if (STAGE.fuse) S.opps.push({ k: 'fuse', x: tc(STAGE.fuse[0]), y: tc(STAGE.fuse[1]), fl: 0, text: '두꺼비집을 내려 동네 조명 전부 끄기' });
  const cds = []; if (STAGE.codeOpp !== false) for (const d of S.doors) if (d.keyLock === 'code' && !cds.some(o => dist(o.x, o.y, d.x, d.y) < 120)) cds.push(d);
  cds.forEach(d => S.opps.push({ k: 'code', d, x: d.x, y: d.y, fl: d.fl || 0, text: '' }));
  if (STAGE.disguise) S.opps.push({ k: 'dress', seen: true, text: '조직원을 쓰러뜨려 옷을 빼앗아 변장하기' });
}
function oppText(o) { if (o.k === 'trap' && S.traps[o.ref] && S.traps[o.ref].tip) return o.text + ' — ' + S.traps[o.ref].tip; return o.k === 'code' ? (S.player.keys.code ? `비번 ${STAGE.code || ''}로 잠긴 문 열기` : '잠긴 문 비번 알아내기 — 엿듣거나 쪽지 찾기') : o.text; }
function oppDone(o) { return o.k === 'trap' ? !!(S.traps[o.ref] && S.traps[o.ref].used) : o.k === 'fuse' ? !S.lightsOn : o.k === 'code' ? !o.d.locked : o.k === 'dress' ? !!S.player.disguise : false; }
function updateOpps(dt) {
  if (!S.opps) oppsInit();
  if ((S.oppT = (S.oppT || 0) - dt) > 0) return; S.oppT = 0.3;
  const P = S.player, fP = flOf(P);
  for (const o of S.opps) {
    if (o.seen || o.x == null) continue;
    const got = (o.k === 'code' && P.keys.code) || (fP === o.fl && !P.under && !P.vent && dist(P.x, P.y, o.x, o.y) < (o.roof ? 380 : 300) && (o.roof || los(P.x, P.y, o.x, o.y, true)));
    if (got) { o.seen = true; if (!oppDone(o)) { toast('기회 발견 — ' + oppText(o), 3, 'good'); play('click', 0.35, 1.3); } }
  }
}
function drawCorpseRisk() {
  for (const c of S.corpses) {
    if (c.stashed || flOf(c) !== flOf(S.player)) continue;
    if (c.risk && !c.carried && dist(c.x, c.y, S.player.x, S.player.y) < 700) { const pu = 0.45 + 0.35 * Math.sin(S.t * 6); ctx.strokeStyle = `rgba(240,90,70,${pu})`; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 26, 15, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '700 12px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(7,10,18,.8)'; ctx.fillRect(c.x - 34, c.y - 34, 68, 15); ctx.fillStyle = '#ff9a86'; ctx.fillText('눈에 띄는 시체', c.x, c.y - 23); ctx.textAlign = 'left'; hint('corpseRisk', '붉은 점선 시체: 자경대원이 보면 발견한다. [행동]으로 메고 숨겨라'); }
  }
}
function drawOpps(P) { if (window.__skip && window.__skip.ui) return;  // 첫 화면 배경 찍기: 글자·표시 없이
  if (!showOpps || !S.opps) return; const fP = flOf(P), k = Math.max(1, 0.95 / SCALE);
  for (const o of S.opps) {
    if (!o.seen || o.x == null || oppDone(o) || (o.fl !== fP && !tactical)) continue;
    if (!tactical && dist(P.x, P.y, o.x, o.y) > 760) continue;
    const x = o.x, y = o.y - 34 * k, s = 7 * k, pulse = 0.7 + 0.3 * Math.sin(S.t * 3);
    ctx.fillStyle = `rgba(242,196,107,${0.9 * pulse})`; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.font = `700 ${Math.round(12 * k)}px "IBM Plex Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(7,10,18,.85)';
    const lab = '기회', tw = ctx.measureText(lab).width + 8 * k; ctx.fillRect(x - tw / 2, y - s - 17 * k, tw, 15 * k); ctx.fillStyle = '#f2c46b'; ctx.fillText(lab, x, y - s - 6 * k); ctx.textAlign = 'left';
  }
}
// ---------------------------------------------------------------- 체크포인트 (목표를 이룰 때마다, 조용해지면 저장)
let CP = null;
function cloneDeep(o, memo = new Map()) {
  if (o === null || typeof o !== 'object') return o;
  if (memo.has(o)) return memo.get(o);
  if (ArrayBuffer.isView(o)) { const c = o.slice(); memo.set(o, c); return c; }
  const ct = o.constructor; if (ct && ct !== Object && ct !== Array) return o;
  const c = Array.isArray(o) ? new Array(o.length) : {}; memo.set(o, c);
  for (const k of Object.keys(o)) c[k] = cloneDeep(o[k], memo);
  return c;
}
// 체크포인트를 기기에 남긴다 (새로고침·앱을 다시 열어도 이어 하기). 같은 객체를 여러 곳에서 가리키는 관계를 살려 JSON으로 바꾼다
const CP_KEY = 'yahaeng.cp';
function packGraph(root) {
  const ids = new Map(), nodes = [];
  const enc = v => {
    if (v === undefined || typeof v === 'function') return { $u: 1 };
    if (typeof v === 'number' && !isFinite(v)) return { $n: String(v) };
    if (v === null || typeof v !== 'object') return v;
    if (ids.has(v)) return { $r: ids.get(v) };
    const id = nodes.length; ids.set(v, id); nodes.push(null);
    if (ArrayBuffer.isView(v)) { nodes[id] = { $t: v.constructor.name, d: Array.from(v) }; return { $r: id }; }
    const ct = v.constructor; if (ct && ct !== Object && ct !== Array) return { $u: 1 };
    if (Array.isArray(v)) nodes[id] = { $a: v.map(enc) }; else { const o = {}; for (const k of Object.keys(v)) o[k] = enc(v[k]); nodes[id] = { $o: o }; }
    return { $r: id };
  };
  return { root: enc(root), nodes };
}
function unpackGraph(P) {
  const out = P.nodes.map(n => !n ? null : n.$t ? new window[n.$t](n.d) : n.$a ? [] : {});
  const dec = v => (v === null || typeof v !== 'object') ? v : '$r' in v ? out[v.$r] : '$n' in v ? Number(v.$n) : undefined;
  P.nodes.forEach((n, i) => { if (!n || n.$t) return; if (n.$a) n.$a.forEach((x, j) => { out[i][j] = dec(x); }); else for (const k in n.$o) { const e = n.$o[k]; if (e && typeof e === 'object' && '$u' in e) continue; out[i][k] = dec(e); } });
  return dec(P.root);
}
function storeCP() {
  if (!CP || STAGE.tutorial) return;
  try { localStorage.setItem(CP_KEY, JSON.stringify({ id: STAGE.id, diff: CP.diff, used: CP.used, mod: S.mod || '', at: Date.now(), g: packGraph(CP.S), grids: CP.grids })); } catch (e) {}
}
function storedCP(id) { try { const r = JSON.parse(localStorage.getItem(CP_KEY) || 'null'); return r && r.id === id && r.diff === DKEY ? r : null; } catch (e) { return null; } }
function clearStoredCP(id) { try { const r = storedCP(id); if (r || !id) localStorage.removeItem(CP_KEY); } catch (e) {} }
// 남겨 둔 체크포인트로 이어 하기: 판을 새로 만든 뒤 상태와 지도 칸을 덮어쓴다
function resumeStoredCP(si) {
  const r = storedCP(STAGES[si].id); if (!r) return false;
  let st; try { st = unpackGraph(r.g); } catch (e) { clearStoredCP(); return false; }
  (st.stories || []).forEach((o, i) => { if (STAGE.stories && STAGE.stories[i]) o.d = STAGE.stories[i]; });  // 함수가 든 기회 정의는 판 자료에서 다시 잇는다
  CP = { si, diff: r.diff, S: st, grids: r.grids, used: r.used || 0 };
  return loadCheckpoint();
}
const cpOn = () => DKEY !== 'hard' || !!(STAGE && STAGE.tutorial);
function cpProgress() { return S.guards.filter(g => g.target && targetEliminated(g)).length + S.items.filter(i => i.got).length + (S.keyItems || []).filter(i => i.got).length + (S.exitOpen ? 1 : 0); }
function syncMissionProgress() {
  for (const c of S.corpses) if (c.ko && c.g && c.z == null) { c.z = c.g.z || 0; c.target = !!c.g.target; }
  if (S.missionProgressVersion === 1) return;
  if (!S.spare) for (const st of S.stories || []) {
    const tag = st.d && st.d.targetTag, g = tag && S.guards.find(g => g.tag === tag);
    if (!g || targetEliminated(g) || (!st.done && !st.moot)) continue;
    if (st.done) S.stats.stories = Math.max(0, (S.stats.stories || 0) - 1);
    st.done = false; st.moot = false; st.step = Math.min(st.step, st.d.steps.length - 1);
  }
  if (S.items.some(i => !i.got) || (!S.spare && S.guards.some(g => g.target && !targetEliminated(g)))) S.exitOpen = false;
  S.cpProg = Math.min(S.cpProg || 0, cpProgress()); S.missionProgressVersion = 1;
}
function updateCheckpoint(dt) {
  if (!cpOn() || S.over) return;
  const pr = cpProgress(); if (pr > (S.cpProg || 0)) { S.cpProg = pr; S.cpWant = true; }
  if (!S.cpWant || (S.cpT = (S.cpT || 0) - dt) > 0) return; S.cpT = 0.5;
  const P = S.player;
  if (S.alevel >= 2 || S.radioCall || P.lethalHold || S.koHold || P.interact || P.pick || P.trav || P.jump || P.lunge || P.grabIn || P.captive || P.wire || P.ledge || P.strikeT > 0 || S.keypad) return;
  if (S.guards.some(g => !g.civ && ['ALERT', 'NOTICE', 'BODY'].includes(g.state))) return;
  S.cpWant = false; saveCheckpoint();
}
function saveCheckpoint() {
  CP = { si: STAGE_I, diff: DKEY, S: cloneDeep(S), grids: [G0.map(r => r.slice())].concat(GF.slice(1).map(g => g ? g.map(r => r.slice()) : null)), used: CP && CP.si === STAGE_I ? CP.used : 0 };
  statsCheckpoint();
  if (!STAGE.tutorial) { storeCP(); toast('체크포인트 저장 — 죽거나 앱을 닫아도 여기서 이어 할 수 있다', 2.4, 'good'); play('switch', 0.3, 1.6); }
}
const cpReady = () => !!(CP && CP.si === STAGE_I && CP.diff === DKEY && cpOn());
function loadCheckpoint() {
  if (!cpReady()) return false;
  initAudio();
  CP.used++; S = cloneDeep(CP.S); S.stats.cpUsed = CP.used; S.timers = []; S.amb = null; S.killWait = null; S.guards.forEach(g => { g.yank = false; g.doomed = false; g.guardExit = false; g.aim = 0; });  // 예약 동작·끌어들이는 중은 이어 가지 않는다 (함수가 옛 상태를 붙잡고 있다)
  CP.grids.forEach((g, f) => { const dst = f ? GF[f] : G0; if (!g || !dst) return; for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) dst[y][x] = g[y][x]; });
  moveStageFixtures(STAGE, G0, true); restoreContractLayout();
  robBuild(); syncDynamicTurf(); stairsInit(); lvlInit(); syncCameraLayout(); syncMissionProgress(); checkObjective();  // 구버전 위치·경계·표적 완료 판정을 현재 기준과 맞춘다
  setLayer(flOf(S.player)); cam.x = S.player.x; cam.y = S.player.y; hudCache = {}; miniBase = null;
  tactical = false; $('tacBanner').hidden = true; input.aiming = null; input.scan = false; if (input.queue) input.queue.length = 0;
  S.keys = {}; input.joy = null; S.qBuf = 0; S.qKill = false; S.player.vx = 0; S.player.vy = 0;  // 저장 당시 눌린 키·조이스틱이 이어지지 않게
  S.koHold = null; S.player.lethalHold = null; input.pressIds = {};
  S.keypad = null; const kp = $('keypad'); if (kp) kp.hidden = true;
  resetDialog(); running = true; paused = false;
  $('end').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  toast('체크포인트에서 다시 시작 (' + CP.used + '번째)', 2.4); syncTools();
  statsBegin('cp');  // 플레이 기록: 체크포인트에서 이어 하기는 새 판으로 센다
  return true;
}
function checkObjective() {
  if (STAGE.city) return;  // 도시: 끝이 없다 (의뢰는 의뢰 장소에서)
  const targetsLeft = S.spare ? 0 : S.guards.filter(g => g.target && !targetEliminated(g)).length;
  const itemsLeft = S.items.filter(i => !i.got).length;
  const ready = !targetsLeft && !itemsLeft && !evidencePending(), wasOpen = S.exitOpen;
  S.exitOpen = ready;
  if (ready && !wasOpen) { if (S.guards.some(g => g.target)) toast('목표 완료. 탈출 지점으로', 3.5, 'good'); bark('master', 'done'); }
}

