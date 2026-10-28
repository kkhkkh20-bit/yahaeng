// ---------------------------------------------------------------- 빛
const TORCH_R = 210;
const flickOff = l => !!l.flk && ((Math.sin(S.t * l.flk.f + l.flk.p) > 0.62) || ((S.t * 6.3 + l.flk.p) % 7 < 0.35));  // 깜빡이는 보안등·간판: 잠깐씩 꺼진다
const lampOn = l => !l.broken && !l.off && !(l.outdoor && !S.lightsOn) && !flickOff(l);
function lightAt(x, y, elev) {
  let l = elev ? 0.1 : 0.04;
  for (const lp of S.lamps) {
    if (!lampOn(lp) || flOf(lp) !== CUR_F) continue;
    const d = dist(lp.x, lp.y, x, y);
    if (d < lp.r && los(lp.x, lp.y, x, y, elev)) l = Math.max(l, clamp((1 - d / lp.r) * 1.8, 0, 1));
  }
  // 손전등: 비추는 자경대원 앞 원뿔 안은 밝다 (어둠 속이어도 들킨다)
  if (S.guards) for (const g of S.guards) { if (!g.torch || g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== CUR_F) continue; const d = dist(g.x, g.y, x, y); if (d > TORCH_R || d < 4) continue; if (Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) > 0.32) continue; if (!los(g.x, g.y, x, y, elev)) continue; l = Math.max(l, 0.85 * (1 - d / TORCH_R) + 0.2); }
  return l;
}

// ---------------------------------------------------------------- 메시지
const toastEl = document.getElementById('toasts');
function toast(text, sec = 2.6, kind = '') { if (kind === 'hint') return showHint(text, sec); S.toasts.push({ text, t: sec, kind }); if (S.toasts.length > 4) S.toasts.shift(); renderToasts(); }
const HINT_ALARM = ['alert', 'radioCall', 'counter', 'search', 'hurt'];
function hint(key, text) { if (S.hints[key] || (STAGE && STAGE.tutorial)) return;  // 연습에서는 단계 안내만 (엇나간 도움말이 끼지 않게)
  if (S.alevel >= 2 && !HINT_ALARM.includes(key)) return;  // 쫓기는 중에는 일반 팁을 띄우지 않는다 (표시 안 한 팁은 나중에 다시 뜰 수 있다)
  S.hints[key] = true; S.hintN = (S.hintN || 0) + 1; if (S.hintN > 6) return;  // 한 판에 6개까지 — 더 많으면 읽지 않는다
  showHint(text); }
// 도움말은 화면 가운데 대신 왼쪽 아래 카드 한 장 (새 도움말이 오면 바꿔 끼운다)
let hintTimer = null;
let hintQ = [], hintAt = 0;
function showHint(text, sec) {
  const card = document.getElementById('hintCard'); if (!card) return;
  if (!card.classList.contains('off') && performance.now() - hintAt < 4000) { if (!hintQ.some(q => q[0] === text) && hintQ.length < 3) hintQ.push([text, sec]); return; }  // 앞 도움말을 덮지 않고 줄 선다
  document.getElementById('hintText').textContent = text; card.classList.remove('off'); hintAt = performance.now();
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { card.classList.add('off'); const n = hintQ.shift(); if (n) setTimeout(() => showHint(n[0], n[1]), 250); }, Math.max(5500, (sec || 0) * 1000, text.length * 75));
}
function renderToasts() {
  toastEl.innerHTML = '';
  S.toasts.slice(isTouch ? -1 : -2).forEach(m => { const d = document.createElement('div'); d.className = 'toast ' + m.kind; d.textContent = m.text; toastEl.appendChild(d); });
}

// ---------------------------------------------------------------- 소음
// 벽이 소리를 막는다: 소리와 듣는 사람 사이의 벽 한 겹마다 크게 줄어든다 (창문·잠긴 문은 조금 덜)
function soundThrough(x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 10); let f = 1, lt = -1;
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), k = ty * MW + tx; if (k === lt) continue; lt = k;
    const c = inMap(tx, ty) ? G[ty][tx] : '#';
    if (c === '#' || c === 'V' || c === 'U') f *= 0.28; else if (c === 'N' || c === 'X') f *= 0.55; else if (c === 'T' || c === 'M') f *= 0.85;
    if (f < 0.05) break; }
  return f;
}
function noise(x, y, r, src, fl) {
  if (fl == null) fl = flOf(S.player);  // 층을 안 적으면 내 층 (예전엔 '지금 계산 중인 층'이라, 그리기가 1층으로 돌려놓은 사이 위층 발소리가 1층에 들렸다)
  if (src !== 'scream') r *= loudMul(x, y, fl);  // 클럽 음악에 묻힌다
  const nz = { x, y, r, t: 0, src, fl }; S.noises.push(nz);
  const L0 = CUR_F; setLayer(fl);
  for (const g of S.guards) {
    if (flOf(g) !== fl) continue;
    if (g.state === 'DEAD' || g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'CAPTIVE' || g.state === 'TERROR') continue;
    const d = dist(g.x, g.y, x, y);
    const rr = d > r ? 0 : r * soundThrough(x, y, g.x, g.y);
    const runStep = src === 'step' && S.player.mode === 'run' && S.player.moving;
    if (src === 'step' && STAGE.zones && zoneAt(x, y, S.player.z) === Z_PUB && !(runStep && d < rr * 0.7)) continue;  // 거리·가게의 걷는 발소리는 아무도 신경 쓰지 않는다 (가까이서 뛰어오는 소리는 돌아본다)
    if (g.civ) { if (d < rr && src !== 'scream') { if (g.state === 'SLEEP') { if (d < rr * 0.6) civWake(g, x, y); } else if (g.state === 'PATROL') { g.meter = Math.min(0.9, g.meter + 0.25); g.want = Math.atan2(y - g.y, x - g.x); setIcon(g, '?'); } } continue; }
    if (d < rr) {
      if (g.state === 'FUSE' && src !== 'stone') continue;
      if (g.state === 'BODY' || g.state === 'LURE') continue;
      if (g.elite && src === 'stone') { g.glance = 1.6; g.glanceA = Math.atan2(y - g.y, x - g.x); setIcon(g, '흥'); continue; }
      // 발소리: 바로 돌아보지 않고 잠깐 멈칫한다 (그 사이 등 뒤에서 덮칠 수 있다)
      if (src === 'step' || src === 'whistle') nz.heard = true;
      if (src === 'whistle' && !g.dog) { gsay(g, ['누구야?', '휘파람…? 거기 누구 있어?', '뭐야, 이쪽인가?'][(g.id + (S.stats.whistles || 0)) % 3]); }
      if (runStep && !g.dog && d < 200 && !g.startle) g.startle = { a: Math.atan2(y - g.y, x - g.x) };  // 등 뒤로 뛰어오는 발소리: 화들짝 돌아본다
      if (src === 'step' && !g.dog && (g.state === 'PATROL' || g.state === 'RETURN')) { if (!(g.hearT > 0)) { g.hearT = runStep ? 0.12 : 0.6; setIcon(g, '?'); play('question', 0.3 * proxVol(g)); } g.hearP = { x, y }; continue; }
      goSuspicious(g, x + rnd(-20, 20), y + rnd(-20, 20), src === 'stone' ? 3 : 3.5); g.why = 'heard';
    }
  }
  setLayer(L0);
}
function goSuspicious(g, x, y, look) {
  if (g.state === 'WARN') return;  // 나가라고 경고하는 중엔 다른 데 정신 팔지 않는다
  endChat(g); g.act = null; g.bubble = null;
  if (g.lure) { g.lure.claim = null; g.lure = null; }
  if (g.state !== 'SUSPICIOUS') { setIcon(g, '?'); play('question', 0.35 * proxVol(g)); }
  g.state = 'SUSPICIOUS'; g.poi = { x, y }; g.path = null; g.wait = 0; g.waitBase = look || 3.5; g.reached = false; g.glance = 0;
}
function setIcon(g, ic) { g.icon = ic; g.iconT = 2.2; }
function proxVol(g) { return clamp(1 - dist(g.x, g.y, S.player.x, S.player.y) / 700, 0.25, 1); }

