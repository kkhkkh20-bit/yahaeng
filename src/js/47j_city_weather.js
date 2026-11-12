// ---------------------------------------------------------------- 자유 모드 날씨: 비
// 2~4분 맑다가 1~2분 비가 온다(서서히 들고 난다). 비가 오면 화면에 사선 빗줄기(픽셀)·땅에 튀는 빗방울·젖은 길의 푸른 윤기,
// 빗소리(걸러 낸 잡음). 젖은 길은 미끄러워 급하게 꺾으면 더 쉽게 미끄러지고 브레이크가 덜 듣는다. 실내(층)에서는 안 보인다.
const RAIN_MAX = 1;
function weatherInit() { S.rain = { k: 0, on: false, next: S.t + rnd(90, 160), drops: null }; }
const rainK = () => (STAGE.cityLife && S.rain) ? S.rain.k : 0;
function weatherUpdate(dt) {
  const W = S.rain; if (!W || !STAGE.cityLife) return;
  if (S.t > W.next) { W.on = !W.on; W.next = S.t + (W.on ? rnd(60, 120) : rnd(120, 240)); if (W.on) evBanner('비가 내리기 시작한다 — 길이 미끄럽다', '#a8c8e8'); else evBanner('비가 그쳤다', '#c8d8e8'); }
  W.k = clamp(W.k + (W.on ? 1 : -1) * dt / 8, 0, RAIN_MAX);  // 8초에 걸쳐 들고 난다
  rainSound(W.k);
  // 비 오는 날 행인 몇은 처마 밑으로 서두른다 (말 한마디)
  if (W.k > 0.6 && (W.sayT = (W.sayT || 0) - dt) <= 0) { W.sayT = rnd(6, 12); const P = S.player;
    for (const g of actorsNear(P.x, P.y)) if (g.civ && npcAlive(g) && g.state === 'PATROL' && Math.random() < 0.3) { gsay(g, ['비 오네...', '우산 없는데', '아 젖겠다'][(Math.random() * 3) | 0], 1.6); break; } }
}
// 빗소리: 걸러 낸 잡음 고리 하나를 비 세기만큼 키운다
let RAIN_SND = null;
function rainSound(k) {
  if (!AC || muted) return;
  if (!RAIN_SND) { if (k <= 0) return; const sr = AC.sampleRate, n = sr * 2, b = AC.createBuffer(1, n, sr), d = b.getChannelData(0); let lp = 0;
    for (let i = 0; i < n; i++) { lp += 0.25 * ((Math.random() * 2 - 1) - lp); d[i] = lp + (Math.random() < 0.002 ? (Math.random() - 0.5) * 0.8 : 0); }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = b; s.loop = true; f.type = 'highpass'; f.frequency.value = 900; g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(master); s.start(); RAIN_SND = { g }; }
  const inside = flOf(S.player) > 0, want = k * (inside ? 0.05 : 0.16) * (S.player.car ? 0.7 : 1);
  RAIN_SND.g.gain.setTargetAtTime(want, AC.currentTime, 0.4);
}
// 그리기 (어둠 위, 화면 영역만): 젖은 길 윤기 → 튀는 빗방울 → 사선 빗줄기
function drawRain() {
  const k = rainK(); if (k <= 0.01 || flOf(S.player)) return;
  const [vx, vy, vw, vh] = viewRect(40);
  ctx.save();
  ctx.fillStyle = `rgba(40,70,110,${0.1 * k})`; ctx.fillRect(vx, vy, vw, vh);  // 젖은 밤길의 푸른 기운
  const t = S.t, n = Math.round(400 * k * Math.min(1.6, vw * vh / 1.2e6)), seed = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // 튀는 빗방울: 자리마다 0.35초 주기로 작은 왕관
  // 튀는 빗방울: 바닥 곳곳에 도트 물결 고리 (PixelFX ripples, 자리마다 다른 위상)
  for (let i = 0; i < n * 0.12; i++) { const x = vx + seed(i + 500) * vw | 0, y = vy + seed(i + 700) * vh | 0;
    if (!fxFrame('drop', t + seed(i + 900) * 2, x, y, 1, k)) { ctx.fillStyle = `rgba(205,225,245,${0.7 * k})`; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); } }
  // 빗줄기: 화면 위에서 아래로, 바람에 살짝 기운다 (1px 폭 픽셀 선)
  ctx.fillStyle = `rgba(185,210,240,${0.6 * k})`;
  const fall = 1100, len = 16, lean = 0.22;
  for (let i = 0; i < n; i++) { const off = (t * fall + seed(i) * vh) % vh, x0 = vx + seed(i + 100) * (vw + 60) - 30 + off * lean, y0 = vy + off;
    ctx.fillRect(x0 | 0, y0 | 0, 1, len / 2 | 0); ctx.fillRect((x0 + len * lean / 2) | 0, (y0 + len / 2) | 0, 1, len / 2 | 0); }  // 두 토막: 살짝 기운 선
  ctx.restore();
}
// 처음 화면으로 나갈 때: 자유 모드가 띄운 창·알림·소리를 모두 정리한다 (다음 판·메뉴에 남지 않게)
function cityTeardown() {
  for (const id of ['evBanner', 'districtName', 'shopPanel', 'rampHud', 'carHint']) { const el = document.getElementById(id); if (el) el.remove(); }
  if (CMAP) { CMAP.el.remove(); CMAP = null; }
  { const w = document.getElementById('wpnChip'); if (w) w.remove(); }
  if (S) S.heli = null; if (typeof HELI_SND !== 'undefined' && HELI_SND && AC) HELI_SND.g.gain.setTargetAtTime(0, AC.currentTime, 0.1);
  if (S) { S.shopOpen = false; S.side = null; S.wp = null; S.wpPath = null; S.ramp = null; S.war = null; S.safeIn = null; S.hunter = null; S.scope = false; S.stillT = 0; if (S.rain) { S.rain.on = false; S.rain.k = 0; } }
  document.body.classList.remove('free-city', 'no-prompts');
  if (AC) { const now = AC.currentTime; if (RAIN_SND) RAIN_SND.g.gain.setTargetAtTime(0, now, 0.1); if (typeof SCREECH !== 'undefined' && SCREECH) SCREECH.g.gain.setTargetAtTime(0, now, 0.05); }
  if (typeof musicRadio === 'function') musicRadio(false);
}
