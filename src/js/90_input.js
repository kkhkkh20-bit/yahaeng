// ---------------------------------------------------------------- 입력
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', isTouch);
const WASD = { KeyW: 'ArrowUp', KeyA: 'ArrowLeft', KeyS: 'ArrowDown', KeyD: 'ArrowRight' };
const keyCode = e => WASD[e.code] || e.code;
window.addEventListener('keydown', e => {
  const menu = ['intro', 'ledger', 'help'].find(id => !$(id).hidden);
  if (menu) {
    if (e.code === 'Escape' && menu !== 'intro') { e.preventDefault(); $(menu === 'ledger' ? 'btnLedgerBack' : 'btnHelpBack').click(); }
    if (menu === 'intro' && ['ArrowDown', 'ArrowUp'].includes(e.code)) {
      e.preventDefault();
      const buttons = [...document.querySelectorAll('.title-acts button')], i = buttons.indexOf(document.activeElement);
      buttons[i < 0 ? (e.code === 'ArrowDown' ? 0 : buttons.length - 1) : (i + (e.code === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
    }
    return;
  }
  const overlay = document.querySelector('.screen:not([hidden])');
  if (overlay) {
    if (e.code === 'Escape') {
      const back = { pause: 'btnResume', brief: 'btnBrBack', end: 'btnMenu' }[overlay.id];
      if (back) { e.preventDefault(); $(back).click(); }
    }
    return;
  }
  if (!S) return;
  if (S.entrySel && running) { const m = /^Digit([1-9])$/.exec(e.code); if (m) { e.preventDefault(); chooseEntry(+m[1] - 1); } return; }
  if (S.keypad && running) { e.preventDefault(); const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code); if (m && !e.repeat) kpPress(m[1]); else if (e.code === 'Backspace') kpPress('<'); else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') kpPress('ok'); else if (e.code === 'Escape') kpPress('x'); return; }
  if (e.code === 'KeyH' && !e.repeat) { const k = document.querySelector('.keys'); if (k) k.classList.toggle('mini'); return; }
  if (DLG.modal && running && !paused) { if (['KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) advanceDialog(); return; } if (e.code === 'Escape') { skipDialog(); return; } }
  if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();  // 브라우저 메뉴로 넘어가지 않게
  if (e.code === 'Tab') { e.preventDefault(); } else if (e.code === 'Digit4' || e.code === 'AltLeft' || e.code === 'AltRight') { e.preventDefault(); if (running) { input.scan = true; $('btnScan').classList.add('on'); hint('scan', '살피기: 문·창문·배관·환풍구·숨을 곳이 색으로 표시된다'); } return; }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(keyCode(e)) && running) e.preventDefault();
  if (e.repeat) return;
  S.keys[keyCode(e)] = true; combatPress(e.code);
  { const c = e.code, ks = /^Arrow|^Key[ZXCV]$/.test(c) ? 'arrow' : /^Key[WASDEQF]$|^Space$/.test(c) ? 'wasd' : null; if (ks && input.kset !== ks) { input.kset = ks; if (typeof hudCache !== 'undefined') hudCache.kset = null; } }
  if (!running || S.over) return;
  // 키는 두 벌을 함께 쓴다 — 방향키 손: Z 공격 · X 행동 · C 붙잡기 · V 다트 / WASD 손: Space 공격 · E 행동 · Q 붙잡기 · F 다트 (히트맨 PC: E 상호작용 · Q 제압)
  // 다트·도구: 톡 = 자동 조준, 누르고 있으면 겨누기. 나머지: Tab 겹친 대상 바꾸기 · G 휘파람 · 1 2 3 도구 · R 항상 걷기 · Ctrl 살금 · Alt 살피기
  if (e.code === 'Space' || e.code === 'KeyZ') actAttack();
  if (e.code === 'KeyE' || e.code === 'KeyX') actEnv();
  if (e.code === 'KeyQ' || e.code === 'KeyC') actGrab();
  if (e.code === 'KeyF' || e.code === 'KeyV') startAim('key');
  if (e.code === 'KeyR') cycleMoveLock();
  if (e.code === 'Digit1') selectTool('kunai');
  if (e.code === 'Digit2') selectTool('stone');
  if (e.code === 'Digit3') selectTool('coin');
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') toggleSneak();
  if (e.code === 'KeyN') toggleMute();
  if (e.code === 'KeyM') toggleTactical();
  if (e.code === 'KeyG') whistle();
  if (e.code === 'Tab') cycleEnv();  // 겹친 대상 중 다른 것 고르기
  if (e.code === 'KeyT') trackNextStory();
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') setZoom(userZoom - 0.1);
  if (e.code === 'Equal' || e.code === 'NumpadAdd') setZoom(userZoom + 0.1);
  if ((e.code === 'Escape' || e.code === 'KeyP') && input.aiming) { cancelAim(); toast('조준 취소', 1.2); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
});
window.addEventListener('keyup', e => { if (S) { S.keys[keyCode(e)] = false; combatRelease(e.code); } if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault(); if ((e.code === 'KeyF' || e.code === 'KeyV') && input.aiming && input.aiming.src === 'key') releaseAim(); if (e.code === 'Digit4' || e.code === 'AltLeft' || e.code === 'AltRight') { input.scan = false; $('btnScan').classList.remove('on'); } });
// 창이 잠깐 가려지면(스크린샷·알림·다른 앱) 메뉴를 띄우지 않고 조용히 멈췄다가, 돌아오면 저절로 이어 간다 (스크린샷에 게임 화면이 그대로 찍힌다)
function softPause(v) {
  if (!running || !S || S.over) return;
  if (v) { if (paused) return; paused = true; S.autoPaused = true; riskTone(0); input.joy = null; return; }
  if (S.autoPaused) { S.autoPaused = false; paused = false; }
}
window.addEventListener('blur', () => { ['btnAct','btnCarry','btnGrab'].forEach(id=>{ $(id).classList.remove('down'); combatRelease(id); }); if (S) { S.koHold = null; S.player.lethalHold = null; } input.pressIds = {}; cancelAim(); if (S) S.keys = {}; softPause(true); });
window.addEventListener('focus', () => softPause(false));
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { if (!running) return; e.preventDefault(); setZoom(userZoom * (e.deltaY > 0 ? 0.92 : 1.08)); }, { passive: false });

const joyEl = $('joy'), joyKnob = $('joyKnob'), JOY_R = 60;
let joyId = null, joyO = null;
canvas.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (joyId === null && t.clientX < W * 0.6 && running) {
      document.body.classList.add('joyused');
      joyId = t.identifier; joyO = { x: t.clientX, y: t.clientY };
      joyEl.style.left = (t.clientX - JOY_R) + 'px'; joyEl.style.top = (t.clientY - JOY_R) + 'px'; joyEl.hidden = false;
      joyKnob.style.transform = 'translate(0,0)'; input.joy = { x: 0, y: 0, mag: 0 }; joyEl.dataset.mode = input.sneakToggle ? 'sneak' : 'walk';
    }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) if (t.identifier === joyId) {
    let dx = t.clientX - joyO.x, dy = t.clientY - joyO.y; const d = Math.hypot(dx, dy);
    const m = Math.min(1, d / JOY_R);
    if (d > JOY_R) { dx = dx / d * JOY_R; dy = dy / d * JOY_R; }
    input.joy = { x: dx / JOY_R, y: dy / JOY_R, mag: m };  // 방향×세기 (이동 쪽에서 한 번만 정규화)
    joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    joyEl.dataset.mode = input.sneakToggle ? 'sneak' : input.walkLock || m < JOY_RUN ? 'walk' : 'run';
  }
  e.preventDefault();
}, { passive: false });
// 자경대원 주시(Desperados III): 자경대원을 누르면 그 자경대원의 순찰로·시야를 굵게 고정 표시한다. 다시 누르면 해제
function markAt(cx, cy) {
  if (!S || !running || S.over) return false;
  const r = canvas.getBoundingClientRect(), wx = cam.x + (cx - r.left - W / 2) / SCALE, wy = cam.y + (cy - r.top - H / 2) / SCALE;
  let best = null, bd = 34; for (const g of S.guards) { if (g.state === 'DEAD' || flOf(g) !== flOf(S.player)) continue; const d = dist(g.x, g.y - 14, wx, wy); if (d < bd) { bd = d; best = g; } }
  if (!best) return false;
  S.marked = S.marked === best ? null : best; play('click', 0.25);
  if (S.marked) toast((best.target ? '표적' : best.civ ? '주민' : best.elite ? '정예' : best.dog ? '개' : '자경대원') + ' 주시 — 순찰로와 시야를 고정 표시한다', 1.8);
  return true;
}
canvas.addEventListener('mousedown', e => { if (e.button === 0 && !isTouch) markAt(e.clientX, e.clientY); });
const touchT = {};
canvas.addEventListener('touchstart', e => { for (const t of e.changedTouches) touchT[t.identifier] = { x: t.clientX, y: t.clientY, t: performance.now() }; }, { passive: true });
const endJoy = e => {
  for (const t of e.changedTouches) {
    const o = touchT[t.identifier]; delete touchT[t.identifier];
    if (o && Math.hypot(t.clientX - o.x, t.clientY - o.y) < 10 && performance.now() - o.t < 320) markAt(t.clientX, t.clientY);
    if (t.identifier === joyId) { joyId = null; input.joy = null; joyEl.hidden = true; }
  }
};
canvas.addEventListener('touchend', endJoy); canvas.addEventListener('touchcancel', endJoy);

function bindBtn(id, fn) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); b.classList.add('down'); combatPress(id); fn(); });  // '눌림'을 먼저 — 행동 안에서 길게 누르기(기절 뒤 처치·조르기)를 알아보게
  const up = () => { b.classList.remove('down'); combatRelease(id); };
  b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
}
bindBtn('btnAct', actAttack);
bindBtn('btnCarry', actEnv);
bindBtn('btnGrab', actGrab);
{
  const b = $('btnTool');
  b.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); b.classList.add('down'); if (input.padWhistle) { whistle(); return; } try { b.setPointerCapture(e.pointerId); } catch (er) {} startAim('btn'); });  // 휘파람을 고른 동안은 누르면 바로 휘파람
  b.addEventListener('pointerup', e => { b.classList.remove('down'); if (input.padWhistle) return; const r = b.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)); if (input.aiming && d > r.width * 0.9) { cancelAim(); toast('조준 취소', 1.2); } else releaseAim(); });  // 버튼 밖으로 끌어서 떼면 취소
  b.addEventListener('pointermove', e => { if (!input.aiming) return; const r = b.getBoundingClientRect(); input.aiming.off = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > r.width * 0.9; });
  b.addEventListener('pointercancel', () => { b.classList.remove('down'); cancelAim(); });
}
document.querySelectorAll('#tools .tool').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); if (b.dataset.t === input.tool) selectTool(TOOLS[(TOOLS.indexOf(input.tool) + 1) % TOOLS.length]); else selectTool(b.dataset.t); }));  // 고른 도구만 보이고, 누르면 다음 도구로
// 휴대폰 도구 버튼 한 개에 던질 것(다트·빈 캔·담배)과 휘파람을 함께 담는다 — [바꾸기]로 돌아가며 고른다
function cyclePadTool() {
  const L = [...TOOLS, 'whistle'], cur = input.padWhistle ? 'whistle' : input.tool; let i = L.indexOf(cur);
  for (let k = 1; k <= L.length; k++) { const t = L[(i + k) % L.length]; if (t === 'whistle') { input.padWhistle = true; syncTools(); play('click', 0.2); return; } if (toolCount(t) > 0) { selectTool(t); return; } }
}
function syncSneakBtn() {
  const el = document.getElementById('modeLbl'); if (el) el.classList.toggle('lock', !!(input.sneakToggle || input.walkLock));
  const s = document.getElementById('btnSneak'), m = moveMode(); if (s) { s.dataset.m = m; const l = document.getElementById('moveLbl'); if (l) l.textContent = { walk: '걷기', run: '달리기' }[m]; s.setAttribute('aria-label', '이동 빠르기: ' + l.textContent); }
  const c = document.getElementById('btnCrouch'); if (c) { c.classList.toggle('on', !!input.sneakToggle); c.innerHTML = input.sneakToggle ? '<b>웅크림</b>' : '<b>웅크리기</b>'; c.setAttribute('aria-pressed', input.sneakToggle ? 'true' : 'false'); }
  const je = document.getElementById('joy'); if (je) je.dataset.mode = input.sneakToggle ? 'sneak' : 'walk';
}
// 웅크리기(살금): 이동 빠르기와 따로 켜고 끈다. 켜 두면 판이 바뀌어도 유지 (Ctrl 키 또는 [웅크리기] 버튼)
function toggleSneak() {
  input.sneakToggle = !input.sneakToggle;
  try { localStorage.setItem('yh_sneak', input.sneakToggle ? '1' : '0'); } catch (e) {}
  syncSneakBtn(); toast(input.sneakToggle ? '웅크림 — 발소리가 아주 작고 시야 원뿔이 줄어든다 (다시 누르면 일어선다)' : '일어섬', 1.6);
}
// 항상 걷기: 켜 두면 Shift·조이스틱 끝까지도 뛰지 않는다 (R 키)
function toggleWalkLock() {
  input.walkLock = !input.walkLock;
  try { localStorage.setItem('yh_walkLock2', input.walkLock ? '1' : '0'); } catch (e) {}
  syncSneakBtn(); toast(input.walkLock ? '항상 걷기 — 뛰지 않는다' : '항상 걷기 해제 — 다시 뛸 수 있다', 1.4);
}
function cycleMoveLock() { toggleWalkLock(); }
// [이동] 버튼: 걷기 ↔ 달리기 (조이스틱을 끝까지 밀었을 때의 빠르기). 웅크림은 [웅크리기] 버튼이 따로 맡는다 — 이동을 바꾸면 일어선다
const moveMode = () => input.walkLock ? 'walk' : 'run';
function cycleMoveMode() {
  const nx = moveMode() === 'walk' ? 'run' : 'walk';
  input.walkLock = nx === 'walk'; input.sneakToggle = false;
  try { localStorage.setItem('yh_sneak', '0'); localStorage.setItem('yh_walkLock2', input.walkLock ? '1' : '0'); } catch (e) {}
  syncSneakBtn(); toast({ walk: '걷기 — 끝까지 밀어도 뛰지 않는다', run: '달리기 — 끝까지 밀면 뛴다 (소리가 크다)' }[nx], 1.4);
}
{ const o = document.querySelector('#hud .obj'); if (o) o.addEventListener('click', e => { e.stopPropagation(); o.classList.toggle('open'); }); }  // 휴대폰: 목표 펼치기
{ const b = document.getElementById('btnWalk'); if (b) b.addEventListener('click', e => { e.stopPropagation(); if (running) toggleWalkLock(); b.blur(); }); }
{ const kp = document.getElementById('keypad'); if (kp) kp.addEventListener('pointerdown', e => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); e.stopPropagation(); initAudio(); kpPress(b.dataset.k); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120); }); }
{ const b = document.getElementById('btnCycle'); if (b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); cycleEnv(); }); }
{ const b = document.getElementById('btnWhistle'); if (b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); whistle(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 140); }); }
{ const b = document.getElementById('btnSneak'); if (b) b.addEventListener('click', e => { e.stopPropagation(); if (running) cycleMoveMode(); b.blur(); }); }
{ const b = document.getElementById('btnToolNext'); if (b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!running) return; cyclePadTool(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120); }); }  // 도구 바꾸기 칩: 남은 것이 있는 다음 도구 → … → 휘파람
{ const b = document.getElementById('btnCrouch'); if (b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (running) toggleSneak(); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 140); }); }
{ const ml = document.getElementById('modeLbl'); if (ml) { ml.style.pointerEvents = 'auto'; ml.style.cursor = 'pointer'; ml.title = '누르면 살금 모드 켜고 끄기 (C)'; ml.addEventListener('click', () => { if (running) toggleSneak(); }); } }
// 설정: 소리 크기 · 밝기 · 전체 화면 (값은 이 브라우저에 기억)
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
let VOL = +lsGet('yahaeng.vol', 90) / 100, BRI = +lsGet('yahaeng.bri', 100) / 100;
function applyVol() { if (master) master.gain.value = VOL; }
function applyBri() { canvas.style.filter = BRI === 1 ? '' : `brightness(${BRI})`; }
$('volR').value = Math.round(VOL * 100); $('briR').value = Math.round(BRI * 100); applyBri();
$('volR').addEventListener('input', e => { VOL = +e.target.value / 100; lsSet('yahaeng.vol', e.target.value); applyVol(); });
$('briR').addEventListener('input', e => { BRI = +e.target.value / 100; lsSet('yahaeng.bri', e.target.value); applyBri(); });
$('btnFull').addEventListener('click', () => { const d = document; try { if (d.fullscreenElement) d.exitFullscreen(); else d.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {} });
document.addEventListener('fullscreenchange', () => { $('btnFull').textContent = document.fullscreenElement ? '전체 화면 끄기' : '전체 화면'; });
// 첫 화면 '바로 시작': 연습 1을 안 했으면 연습 1, 했으면 아직 못 깬 첫 의뢰
function quickTarget() { const t0 = STAGES.findIndex(s => s.id === 'tI'); if (t0 >= 0 && !stageCleared(STAGES[t0])) return t0; const i = STAGES.findIndex(s => !s.tutorial && demoOk(s) && !stageCleared(s)); return i >= 0 ? i : STAGES.findIndex(s => !s.tutorial); }
function syncQuick() { const i = quickTarget(), st = STAGES[i]; if (!st || !$('btnQuick')) return; const done = !STAGES.some(s => !s.tutorial && demoOk(s) && !stageCleared(s)) && stageCleared(STAGES[STAGES.findIndex(s => s.id === 'tI')] || {});
  $('btnQuick').textContent = st.tutorial ? '시작하기' : done ? `다시 하기: ${st.name}` : `이어서: 의뢰 ${st.no} ${st.name}`;
  $('btnQuick').title = st.tutorial ? '처음 플레이하면 연습부터 시작합니다.' : (st.mission || st.name); }
document.querySelectorAll('.ledger-tabs button').forEach(button => button.addEventListener('click', () => {
  $('stageList').dataset.filter = button.dataset.filter;
  document.querySelectorAll('.ledger-tabs button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
$('btnLedger').addEventListener('click', () => { initAudio(); renderStageList(); showMenu('ledger'); document.querySelector('.ledger-tabs button[aria-pressed="true"]').focus({ preventScroll: true }); });
$('btnHelp').addEventListener('click', () => { showMenu('help'); $('btnHelpBack').focus({ preventScroll: true }); });
$('btnLedgerBack').addEventListener('click', () => { syncQuick(); showMenu('intro'); $('btnLedger').focus({ preventScroll: true }); });
$('btnHelpBack').addEventListener('click', () => { const h = $('help'); if (h.classList.contains('over')) { h.hidden = true; h.classList.remove('over'); $('btnSet2').focus({ preventScroll: true }); } else { showMenu('intro'); $('btnHelp').focus({ preventScroll: true }); } });
$('btnSet2').addEventListener('click', () => { const h = $('help'); h.classList.add('over'); h.hidden = false; h.scrollTop = 0; });
{ const bg = window.__TITLE_BG; if (bg) document.documentElement.style.setProperty('--title-bg', `url(${bg})`); }  // 첫 화면·브리핑·일시정지 공용 배경
$('btnPortrait').addEventListener('click', () => document.body.classList.add('portraitOk'));
$('btnQuick').addEventListener('click', () => { initAudio(); start(quickTarget()); });
function toggleMute() { muted = !muted; if (musicSrc) musicSrc._g.gain.value = muted ? 0 : 0.16; if (ambSrc) ambSrc._g.gain.value = muted ? 0 : 0.1; $('btnMute').textContent = muted ? '소리 켜기' : '소리 끄기'; }
function setPause(v) { if (!running || !$('brief').hidden || !$('end').hidden) return; paused = v; $('pause').hidden = !paused; if (!paused) { const h = $('help'); if (h.classList.contains('over')) { h.hidden = true; h.classList.remove('over'); } } if (paused) riskTone(0);
  if (paused && S) { $('pzSub').textContent = (STAGE.sub || '') + (STAGE.tutorial ? '' : ' · ' + STAGE.name); } }  // 메뉴에는 할 일을 띄우지 않는다 (화면 위 목표 칸에 이미 있다)  // 브리핑·끝 화면 위에서는 일시정지를 겹쳐 열지 않는다
function togglePause() { setPause(!paused); }
$('btnMute').addEventListener('click', toggleMute);
{ let drag = null; const cv = document.getElementById('game');  // 세로 전술 지도 끌어 옮기기
  cv.addEventListener('pointerdown', e => { if (tactical && S && S.tacCam) drag = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointermove', e => { if (!drag || !tactical || !S || !S.tacCam) return; S.tacCam.x -= (e.clientX - drag.x) / SCALE; S.tacCam.y -= (e.clientY - drag.y) / SCALE; drag = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointerup', () => { drag = null; }); }
try { if (localStorage.getItem('yahaeng.joyseen')) document.body.classList.add('joyseen'); } catch (e) {}
$('btnFps').addEventListener('click', () => setFpsCap(FPS_CAP === 30 ? 60 : 30)); setFpsCap(FPS_CAP);
$('btnPause').addEventListener('click', togglePause);
$('btnMap').addEventListener('click', toggleTactical);
{ const mi = $('mini'); if (mi) {
  $('btnMap').style.display = 'none'; mi.addEventListener('click', toggleTactical);
  mi.addEventListener('keydown', e => {
    if (e.code !== 'Enter' && e.code !== 'Space') return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) { toggleTactical(); if (!$('tacBanner').hidden) $('tacBanner').focus({ preventScroll: true }); }
  });
} }  // 도시: 지도 버튼 대신 미니맵을 누른다
$('btnScan').addEventListener('click', () => { input.scan = !input.scan; $('btnScan').classList.toggle('on', input.scan); });
$('btnZoomOut').addEventListener('click', () => setZoom(userZoom - 0.12));
$('btnZoomIn').addEventListener('click', () => setZoom(userZoom + 0.12));
$('btnRoutes').addEventListener('click', () => { showRoutes = !showRoutes; $('btnRoutes').classList.toggle('on', showRoutes); try { localStorage.setItem('yahaeng.routes2', showRoutes ? '1' : '0'); } catch (e) {} });
$('btnRoutes').classList.toggle('on', showRoutes);
{ const bo = $('btnOpps'), lab = () => { bo.textContent = '기회 안내: ' + ['끔', '최소', '전체'][oppMode]; bo.classList.toggle('on', oppMode > 0); };
  if (bo) { lab(); bo.addEventListener('click', () => { oppMode = (oppMode + 2) % 3; showOpps = oppMode > 0; lab(); hudCache.objH = null; try { localStorage.setItem('yahaeng.opps', ['0', '1m', '2'][oppMode]); } catch (e) {} }); } }
$('tacBanner').addEventListener('click', e => { toggleTactical(); if (!e.detail) $('mini').focus({ preventScroll: true }); });
$('btnResume').addEventListener('click', () => setPause(false));
$('btnRestart2').addEventListener('click', () => { setPause(false); start(STAGE_I, true); });
$('btnMenu2').addEventListener('click', () => { setPause(false); toMenu(); });
$('btnMenu').addEventListener('click', toMenu);
$('btnRetry').addEventListener('click', () => start(STAGE_I, true));
$('btnCity').addEventListener('click', () => { const ci = STAGES.findIndex(s => s.city); if (ci >= 0) start(ci, true); });  // 다시 하기는 브리핑 없이 바로
$('btnCP').addEventListener('click', () => loadCheckpoint());
// 다음 의뢰: 배열의 바로 다음이 아니라 '다음으로 할 수 있는 의뢰' (데모에서 잠긴 의뢰는 건너뛴다)
function nextPlayable() { for (let i = STAGE_I + 1; i < STAGES.length; i++) if (!STAGES[i].tutorial && demoOk(STAGES[i])) return i; return -1; }
$('btnNext').addEventListener('click', () => { const n = nextPlayable(); start(STAGE.tutorial ? STAGES.findIndex(s => !s.tutorial) : n >= 0 ? n : STAGE_I); });
document.addEventListener('visibilitychange', () => { if (document.hidden) softPause(true); else softPause(false); });

document.querySelectorAll('#modSel button').forEach(b => b.addEventListener('click', () => { MOD = b.dataset.m; try { localStorage.setItem('yahaeng.mod', MOD); } catch (e) {} renderStageList(); }));
function start(i, noBrief) {
  initAudio(); play('knife', 0.5); prepNeonMusic(); setTimeout(() => setMusic('n_calm'), 300);
  tactical = false; $('tacBanner').hidden = true; $('btnMap').classList.remove('on');
  syncSneakBtn(); input.scan = false; input.aiming = null; input.tool = 'kunai'; input.padWhistle = false; $('btnScan').classList.remove('on');  // 항상 걷기는 판이 바뀌어도 유지
  running = true; paused = false;
  newGame(i); resetDialog(); miniBase = null; renderToasts();
  if (!(S.player.kunai > 0)) input.tool = S.player.stones > 0 ? 'stone' : 'coin';  // 기본 도구는 다트 (없는 판이면 빈 캔)
  statsBegin('new');  // 플레이 기록: 판 시작
  if (PR) { const ks = ['ninja', ...new Set(S.guards.filter(g => !g.dog).map(charOf))]; prKeep([...ks, ...Object.keys(OUTFIT_PAL), 'police', 'rival']); prWarm(ks, true); }  // 이 판 사람들 옷 색부터 미리 칠하고, 다른 판 옷은 버린다
  const keysEl = document.querySelector('.keys'); if (keysEl) keysEl.classList.add('mini');
  const hc = document.getElementById('hintCard'); if (hc) hc.classList.add('off');
  showMenu(null); $('end').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  (noBrief ? f => f() : showBrief)(() => say(DIALOGUE[STAGE.id], true, () => { if (ENTRY_PICK && STAGE.entries && STAGE.entries.filter(e => (e.need || 0) <= starsOf(STAGE)).length > 1) beginEntry(); else { play('bell', 0.6); startAmb();  } }));
}
const ENTRY_PICK = false;  // 진입로 선택 창은 쓰지 않는다 — 길은 플레이어가 스스로 찾는다
// 시작 전 정찰: 전술 지도에서 진입로를 고른다 (골목 · 옥상 · 전깃줄)
function beginEntry() {
  S.entrySel = true; tactical = true;
  let box = $('entryBox');
  if (!box) {
    box = document.createElement('div'); box.id = 'entryBox';
    box.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;background:rgba(10,12,20,.92);border:1px solid #3a4250;padding:12px 14px;max-width:min(680px,94vw);font-family:Galmuri,"IBM Plex Sans KR",sans-serif;color:#e8e3d6;box-shadow:0 6px 24px rgba(0,0,0,.5)';
    document.body.appendChild(box);
  }
  box.innerHTML = '<div style="font-size:13px;letter-spacing:.12em;color:#f2c46b;margin-bottom:8px">정찰 — 진입로를 고른다' + (isTouch ? '' : ' (숫자 키)') + '</div>' +
    STAGE.entries.map((e, i) => (e.need || 0) > starsOf(STAGE) ? `<div style="margin:4px 0;padding:8px 10px;border:1px dashed #3a4250;color:#7a8294">${i + 1}. 잠김 — 별 ${e.need}개 필요</div>` : `<button type="button" data-i="${i}" style="display:block;width:100%;text-align:left;margin:4px 0;padding:8px 10px;background:#161b26;border:1px solid #3a4250;color:#e8e3d6;font:inherit;cursor:pointer"><b style="color:#f2c46b">${i + 1}. ${e.name}</b> <span style="font-size:12px;color:#b8b2a4">— ${e.desc}</span></button>`).join('');
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => chooseEntry(+b.dataset.i)));
  box.hidden = false;
  toast('전술 지도: 자경대원 순찰로와 목표를 보고 들어갈 길을 고른다', 4);
}
function chooseEntry(i) {
  const e = STAGE.entries[i]; if (!e || !S.entrySel || (e.need || 0) > starsOf(STAGE)) return;
  const P = S.player; P.wire = null; P.z = 0; P.fl = 0; setLayer(0); P.jump = null;
  if (e.pole) { const o = S.poles.find(o => o.tx === e.pole[0] && o.ty === e.pole[1]); const w = o.wires.find(w => !e.toward || (w.a.pole === o ? w.b : w.a).tx === e.toward) || o.wires[0]; P.wire = { w, s: w.a.pole === o ? 0 : 1 }; P.z = o.z; P.x = o.x; P.y = o.y; }
  else { P.x = tc(e.at[0]); P.y = tc(e.at[1]); P.z = e.z || 0; }
  if (e.outfit) { P.outfit = e.outfit; P.disguise = PR_PAL[e.outfit] ? e.outfit : P.disguise; P.disguiseBlown = false; }  // 숙련 해금: 변장한 채 시작
  S.entrySel = false; tactical = false; $('entryBox').hidden = true; $('tacBanner').hidden = true; $('btnMap').classList.remove('on'); S.toasts.length = 0; P.vx = 0; P.vy = 0;
  cam.x = P.x; cam.y = P.y; play('bell', 0.6); startAmb(); toast('진입: ' + e.name, 2.2);
}
function entryPos(e) { if (e.pole) { const o = S.poles.find(o => o.tx === e.pole[0] && o.ty === e.pole[1]); return { x: o.x, y: o.y - o.top }; } return { x: tc(e.at[0]), y: tc(e.at[1]) }; }
function toMenu() {
  if (club && AC) club.g.gain.setTargetAtTime(0, AC.currentTime, 0.2);
  running = false; paused = false; riskTone(0); resetDialog(); if ($('entryBox')) $('entryBox').hidden = true;
  $('end').hidden = true; $('pause').hidden = true; $('hud').hidden = true; showMenu('ledger');
  renderStageList();
  newGame(STAGE_I);
}

atlas.onload = () => {
  resize();
  renderStageList();
  newGame(0);
  requestAnimationFrame(frame);
  window.__game = {
    get S() { return S; }, drawBody, hasHeightCues, floorCanvas, paintInteriorCuts, drawFloorThickness, drawRoofCoping, startAim, releaseAim, kunaiHit, prepareCombat, grabTarget, combatPress, combatRelease, updateKoHold, updateLethalHold, targetEliminated, lampControl, lvlInit, hopClimb, updateClimbG, stairFloor, stairAccess, stairTravel, beginStairTravel, updatePlayer, updateTrav, startTrav, actionBusy, objectReachable, nearProp, nearUse, nearHide, nearCorpse, updateGuard, updateCams, updateRadioCall, goAlert, goSuspicious, knownFace, publicSuspicion, onDisguiseChanged, takeProp, deliverReport, exposure, nextGoal, briefTodo, characterLook: o => o === S.player ? playerKey(o) : charOf(o), characterPalette: o => prPalette(...prSplit(o === S.player ? playerKey(o) : charOf(o))), civScream, spreadRumor, rumorTarget: () => rumorTarget(), pZone: () => pZone(), dartBlame, facBody, inTurf, killGuard, get PR() { return PR; }, get prVar() { return prVar; }, get ctx() { return ctx; }, get cam() { return cam; }, prBench() { const r = {}; for (const k of ["sam", "civ3@fBob", "staff@big"]) { delete prVar[k]; const t0 = performance.now(); const sh = prSheet(k); if (sh) prPart(sh, 0); r[k] = Math.round(performance.now() - t0); } r.q = prWarmQ.length; r.n = Object.keys(prVar).length; return r; }, actionChoices, cycleAction, los, attackAction, envAction, grabAction, envChoices, actAttack, actEnv, actGrab, cycleEnv, zoneInfo, lightAtG: (x, y, f) => { const L0 = CUR_F; setLayer(f || 0); const v = lightAt(x, y); setLayer(L0); return v; }, get FPS_CAP() { return FPS_CAP; }, stairHole, downPt, stairDir, solidAt: (x, y) => solidAt(x, y), nearClimbDown, get LADDERS() { return S.ladders; }, coneBench() { const t0 = performance.now(); let n = 0; for (let k = 0; k < 20; k++) for (const g of S.guards) { if (g.state === 'DEAD' || g.x < 0) continue; GLC.t = -9; g._cone = null; guardCone(g, guardFov(g), guardRanges(g)); n++; } return [(performance.now() - t0) / 20, n / 20]; }, DPRinfo() { return [DPR, dprCap]; }, benchDraw(n) { const t0 = performance.now(); for (let i = 0; i < n; i++) { S.t += 1 / 60; draw(); ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / n; }, killKT, ktFrame, KILL_DUR, get STAGE() { return STAGE; }, get STAGES() { return STAGES; }, schedText, storyLines, trackNextStory, get DLG() { return DLG; }, get STAIRW() { return STAIRW; }, get GF() { return GF; }, canSee, wirePt, kitSpec, killBlockReason, robAt, solidFor, roofProps, get BLD() { return BLD; }, lightAt, loudMul, noise, musicKey: () => musicKey, tileAt, saveCheckpoint, loadCheckpoint, cpReady, endGame, get CP() { return CP; }, neonTest: k => { initAudio(); const t0 = performance.now(); const b = makeNeonLoop(k); const d = b.getChannelData(0); let nan = 0, rms = 0; for (let i = 0; i < d.length; i++) { if (!isFinite(d[i])) nan++; rms += d[i] * d[i]; } return [Math.round(performance.now() - t0), b.duration.toFixed(1), nan, Math.sqrt(rms / d.length).toFixed(3)]; }, neonWav: k => { initAudio(); const b = makeNeonLoop(k), n = b.length, sr = b.sampleRate, L = b.getChannelData(0), R = b.getChannelData(1), out = new Int16Array(n * 2); for (let i = 0; i < n; i++) { out[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; out[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; } let s = ''; const u = new Uint8Array(out.buffer); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return [sr, btoa(s)]; }, clubInfo: () => club ? { vol: club.g.gain.value, lp: club.lp.frequency.value, ctx: AC.state } : null, rLv, facadeRow, jumpTarget, lvAt, bldAt, primaryAction, actPrimary, showEnd, whistle, fallKill, planPt, astar, canSee, advanceDialog, say, nearVent, ventAmbushTarget, ventAt, drawScan, input, setDiff(k) { DKEY = k; }, actCoin, ugAt, spawnReinforcements, get SCALE() { return SCALE; }, setZoom, toggleTactical, updateChats, setAlert, lockExits, chaseNow, secondaryAction, grab, nearDoor, nearLamp, nearWindow, ambushTarget, get BLD() { return BLD; }, jumpTarget, nearClimb, start: (i, b) => start(i, !b), stageMap, actPrimary, actCarry, actThrow, actKunai, primaryAction, kunaiTarget, newGame, castRay, tileG(x, y) { return G[y][x]; }, get GF() { return GF; }, setLayer, nearFloorDown, nearWinWire, nearPole, nearWireMount, wireDropTarget, wirePt,
    mapImage() { const c = document.createElement('canvas'); c.width = mapC.width; c.height = mapC.height; drawBig(c.getContext('2d'), mapC); return c.toDataURL(); },
    npcDown, startBrawl, declareWar, facWitness, zoneAt, Z_PUB, Z_RES, Z_HOS, stairDir, setLayer, wallUpSpot, landBelow, nearWinClimb, nearWinDrop, doAct: a => actPrimary(Object.assign({}, a, { viaZ: true })), get MW() { return MW; }, get FURN() { return FURN; }, hurt: why => hurtPlayer(null, why), tileCh: (x, y) => G[y] && G[y][x], get MH() { return MH; },
    validate() {
      const issues = [];
      STAGES.forEach((st, si) => {
        newGame(si);
        const sx = st.start[0], sy = st.start[1];
        S.doors.filter(d => d.keyLock || d.gate).forEach(d => setDoor(d, false));
        (st.keyDoors || []).forEach(([kx, ky]) => { const d = S.doors.find(d => d.tx === kx && d.ty === ky); if (!d) issues.push(`${st.id}: 열쇠 문 (${kx},${ky}) 문 아님`); else setDoor(d, false); });  // 열쇠는 얻을 수 있으므로 연 상태로 검사
        const reach = (x, y, label) => { if (solidAt(x, y)) { issues.push(`${st.id}: ${label} (${x},${y}) 막힌 칸`); return; } if (!(x === sx && y === sy) && !astar(sx, sy, x, y).length) issues.push(`${st.id}: ${label} (${x},${y}) 도달 불가`); };
        reach(Math.floor(st.exit[0]), Math.floor(st.exit[1]), '출구');
        STAGE._items.forEach(p => { if (!p[2]) reach(p[0], p[1], '서류'); });
        STAGE._g.forEach((g, gi) => { if (!g.fl) (g.route || (g.at ? [g.at] : [])).forEach(r => reach(r[0], r[1], `자경대원${gi}`)); });
        // 위층: 그 층으로 올라오는 계단에서 닿는지
        const fromStair = (f, x, y, label) => { const b = bldAt(x, y); const l = S.ladders.find(l => l.kind === 'fstair' && l.tfl === f && bldAt(l.tx, l.ty) === b); setLayer(f); if (!l) issues.push(`${st.id}: ${label} (${x},${y},${f + 1}층) 올라올 계단 없음`); else if (solidAt(x, y) || (!(l.bx === x && l.by === y) && !astar(l.bx, l.by, x, y).length)) issues.push(`${st.id}: ${label} (${x},${y},${f + 1}층) 도달 불가`); setLayer(0); };
        STAGE._items.forEach(p => { if (p[2]) fromStair(p[2], p[0], p[1], '물건'); });
        STAGE._g.forEach((g, gi) => { if (g.fl) (g.route || [g.at]).forEach(r => fromStair(g.fl, r[0], r[1], `자경대원${gi}`)); });
        S.wires.forEach((w, wi) => [w.a, w.b].forEach(n => { if (n.win && (!GF[n.fl] || GF[n.fl][n.ty][n.tx] !== 'N')) issues.push(`${st.id}: 전깃줄${wi} 창문 (${n.tx},${n.ty},${n.fl + 1}층) 창문 아님`); }));
        if (st.fuse) reach(st.fuse[2], st.fuse[3], '퓨즈 앞');
        if (st.flee) st.guards.forEach((g, gi) => { if (g.target) { const r = g.route[0]; if (!astar(r[0], r[1], st.flee[0], st.flee[1]).length) issues.push(`${st.id}: 표적${gi} 도주로 없음`); } });
        S.hides.filter(b => !b.furn).forEach(b => { const ok = N8.slice(0, 4).filter(o => !solidAt(b.tx + o[0], b.ty + o[1])); if (!ok.length || !astar(sx, sy, b.tx + ok[0][0], b.ty + ok[0][1]).length) issues.push(`${st.id}: ${b.type} (${b.tx},${b.ty}) 접근 불가`); });
        S.ladders.forEach(l => { if (l.bz === 0) reach(l.bx, l.by, l.kind === 'pipe' ? '배관 밑' : '사다리'); });
        PIPES.forEach(p => { if (!S.ladders.some(l => l.kind === 'pipe' && l.tx === p[0] && l.ty === p[1])) issues.push(`${st.id}: 배관 (${p[0]},${p[1]}) 디딜 곳 없음`); });
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (G[y][x] === 'L' && !S.ladders.some(l => l.kind === 'ladder' && l.bx === x && l.by === y)) issues.push(`${st.id}: 사다리 (${x},${y}) 옆에 옥상 없음`);
        if (st.reinf) reach(st.reinf[0], st.reinf[1], '증원 지점');
        S.ladders.filter(l => l.kind === 'stair' || l.kind === 'fstair').forEach(l => { if (!l.bfl) reach(l.bx, l.by, '계단'); });
        S.lamps.filter(l => l.hearth).forEach(l => { if (!S.ladders.some(c => c.kind === 'chimney' && c.lamp === l)) issues.push(`${st.id}: 아궁이 (${l.tx},${l.ty}) 굴뚝 없음`); });
        S.vents.forEach(v => { if (v.roof ? !v.z : groundSolidP(v.tx, v.ty)) issues.push(`${st.id}: 환풍구 (${v.tx},${v.ty}) 자리 잘못됨`); else if (!v.roof) reach(v.tx, v.ty, '환풍구'); if (!ventAt(v.tx, v.ty)) issues.push(`${st.id}: 환풍구 (${v.tx},${v.ty}) 덕트 없음`); });
        (S.cams || []).forEach(c => { const g = c.fl ? GF[c.fl] : G0; if (SOLID.has(g[c.ty][c.tx])) issues.push(`${st.id}: CCTV (${c.tx},${c.ty}) 벽 안`); });
        S.hides.filter(h => h.type === 'well').forEach(h => { if (!ugAt(h.tx, h.ty)) issues.push(`${st.id}: 맨홀 (${h.tx},${h.ty}) 지하와 안 이어짐`); });
        S.windows.forEach(w => { const ok = [[1, 0], [0, 1]].some(([dx, dy]) => !groundSolidP(w.tx + dx, w.ty + dy) && !groundSolidP(w.tx - dx, w.ty - dy)); if (!ok) issues.push(`${st.id}: 창문 (${w.tx},${w.ty}) 양쪽이 막힘`); });
        S.wires.forEach((w, wi) => [w.a, w.b].forEach(n => { if (n.roof && !n.z) issues.push(`${st.id}: 전깃줄${wi} 끝 (${n.tx},${n.ty}) 옥상 아님`); }));
        S.poles.forEach(o => { if (!o.wires.length) issues.push(`${st.id}: 전봇대 (${o.tx},${o.ty}) 줄 없음`); const ok = N8.slice(0, 4).filter(d => !solidAt(o.tx + d[0], o.ty + d[1])); if (!ok.length || !astar(sx, sy, o.tx + ok[0][0], o.ty + ok[0][1]).length) issues.push(`${st.id}: 전봇대 (${o.tx},${o.ty}) 접근 불가`); });
        BLD.forEach((b, bi) => { if (!S.ladders.some(l => bldAt(l.tx, l.ty) === bi) && !S.wires.some(w => [w.a, w.b].some(n => n.roof && bldAt(n.tx, n.ty) === bi))) issues.push(`${st.id}: 건물${bi} 직접 오를 곳 없음`); });
      });
      newGame(0);
      return issues;
    }
  };
};
atlas.src = A.atlas;
// 시작 화면에서 쉬는 동안 주인공 시트를 미리 칠해 둔다 (첫 판 시작 때 끊김 줄이기)
if (PR) setTimeout(() => prWarm(['ninja']), 1500);  // 옷 색은 판마다 필요한 것만 (전부 칠해 두면 수백 MB)
