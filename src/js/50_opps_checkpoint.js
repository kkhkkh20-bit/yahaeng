// ---------------------------------------------------------------- 기회 (Hitman식): 직접 보거나 엿들어 알게 된 암살 수단을 임무 칸에 모은다
function oppsInit() {
  S.opps = [];
  (S.traps || []).forEach((tr, i) => { const p = tr.k === 'shock' ? tr.sw : tr.at; S.opps.push({ k: 'trap', ref: i, x: tc(p[0]), y: tc(p[1]), fl: 0, roof: tr.k === 'drop', text: tr.k === 'shock' ? '전선을 끊어 물웅덩이 감전시키기' : '옥상 간판을 떨어뜨려 아래를 덮치기' }); });
  if (STAGE.fuse) S.opps.push({ k: 'fuse', x: tc(STAGE.fuse[0]), y: tc(STAGE.fuse[1]), fl: 0, text: '두꺼비집을 내려 동네 조명 전부 끄기' });
  const cds = []; for (const d of S.doors) if (d.keyLock === 'code' && !cds.some(o => dist(o.x, o.y, d.x, d.y) < 120)) cds.push(d);
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
      ctx.font = '700 12px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(7,10,18,.8)'; ctx.fillRect(c.x - 34, c.y - 34, 68, 15); ctx.fillStyle = '#ff9a86'; ctx.fillText('눈에 띄는 시체', c.x, c.y - 23); ctx.textAlign = 'left'; hint('corpseRisk', '붉은 점선 시체: 자경대원이 그쪽을 보면 발견한다. 메고(특수) 수거함·맨홀·어두운 구석으로 옮겨라'); }
  }
}
function drawOpps(P) {
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
const cpOn = () => DKEY !== 'hard' || !!(STAGE && STAGE.tutorial);
function cpProgress() { return S.guards.filter(g => g.target && g.state === 'DEAD').length + S.items.filter(i => i.got).length + (S.keyItems || []).filter(i => i.got).length + (S.exitOpen ? 1 : 0); }
function updateCheckpoint(dt) {
  if (!cpOn() || S.over) return;
  const pr = cpProgress(); if (pr > (S.cpProg || 0)) { S.cpProg = pr; S.cpWant = true; }
  if (!S.cpWant || (S.cpT = (S.cpT || 0) - dt) > 0) return; S.cpT = 0.5;
  const P = S.player;
  if (S.alevel >= 2 || S.radioCall || P.trav || P.jump || P.lunge || P.grabIn || P.captive || P.wire || P.ledge || P.strikeT > 0 || S.keypad) return;
  if (S.guards.some(g => !g.civ && ['ALERT', 'NOTICE', 'BODY'].includes(g.state))) return;
  S.cpWant = false; saveCheckpoint();
}
function saveCheckpoint() {
  CP = { si: STAGE_I, diff: DKEY, S: cloneDeep(S), grids: [G0.map(r => r.slice())].concat(GF.slice(1).map(g => g ? g.map(r => r.slice()) : null)), used: CP && CP.si === STAGE_I ? CP.used : 0 };
  if (!STAGE.tutorial) { toast('체크포인트 저장 — 죽으면 여기서 다시 시작할 수 있다', 2.4, 'good'); play('switch', 0.3, 1.6); }
}
const cpReady = () => !!(CP && CP.si === STAGE_I && CP.diff === DKEY && cpOn());
function loadCheckpoint() {
  if (!cpReady()) return false;
  initAudio();
  CP.used++; S = cloneDeep(CP.S); S.stats.cpUsed = CP.used;
  CP.grids.forEach((g, f) => { const dst = f ? GF[f] : G0; if (!g || !dst) return; for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) dst[y][x] = g[y][x]; });
  setLayer(flOf(S.player)); cam.x = S.player.x; cam.y = S.player.y; hudCache = {}; miniBase = null;
  tactical = false; $('tacBanner').hidden = true; input.aiming = null; input.scan = false; if (input.queue) input.queue.length = 0;
  S.keys = {}; input.joy = null; S.qBuf = 0; S.qKill = false; S.player.vx = 0; S.player.vy = 0;  // 저장 당시 눌린 키·조이스틱이 이어지지 않게
  S.keypad = null; const kp = $('keypad'); if (kp) kp.hidden = true;
  resetDialog(); running = true; paused = false;
  $('end').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  toast('체크포인트에서 다시 시작 (' + CP.used + '번째)', 2.4); syncTools();
  return true;
}
function checkObjective() {
  if (S.exitOpen) return;
  const targetsLeft = S.spare ? 0 : S.guards.filter(g => g.target && g.state !== 'DEAD').length;
  const itemsLeft = S.items.filter(i => !i.got).length;
  if (!targetsLeft && !itemsLeft) { S.exitOpen = true; if (S.guards.some(g => g.target)) toast('목표 완료. 탈출 지점으로', 3.5, 'good'); bark('master', 'done'); }
}

