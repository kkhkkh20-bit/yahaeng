// ---------------------------------------------------------------- 큰 도시 운전: 미끄러짐(드리프트) · 타이어 자국 · 끼익 소리 · 차 안 라디오
// 차가 바라보는 방향(v.a)과 실제로 미끄러져 가는 방향(v.va)을 따로 둔다. 평소에는 v.va가 v.a를 바로 따라가지만,
// 빠르게 달리며 핸들을 크게 꺾거나 급브레이크를 밟으면 접지력이 떨어져 옆으로 미끄러진다. 그동안 뒷바퀴 자국이 남고 끼익 소리가 난다.
// 큰 도시(STAGE.cityLife)에서 내가 모는 차에만 쓴다.
const SKID_MAX = 900;
function carDrift(v, steer, fwd, dt) {
  if (!STAGE.cityLife) return;
  if (v.va == null) v.va = v.a;
  const spd = Math.abs(v.v), hard = Math.abs(steer) > 0.55 && spd > 230, brake = fwd < -0.2 && v.v > 240;
  const grip = hard ? 4.2 : brake ? 4.5 : 12;  // 너무 쉽게 돌지 않게: 자유 모드 운전 보조  // 1초에 맞춰 도는 정도
  v.va += angDiff(v.va, v.a) * Math.min(1, grip * dt);
  const slip = Math.abs(angDiff(v.a, v.va));
  if (slip > 0.05) v.v *= 1 - Math.min(0.5, slip * 0.55) * dt;  // 옆으로 미끄러지면 속도가 깎인다
  v.slip = slip; v.skidding = spd > 120 && (slip > 0.16 || brake);
  if (v.skidding) skidMark(v); else v.skidPrev = null;
}
// 뒷바퀴 두 개 자리에서 직전 자리까지 선을 잇는다
function skidMark(v) {
  const len = v.len || 92, wid = (v.r || 21) * 2, ca = Math.cos(v.a), sa = Math.sin(v.a), bx = v.x - ca * len * 0.32, by = v.y - sa * len * 0.32;
  const wheels = [-1, 1].map(s => [bx - sa * wid * 0.36 * s, by + ca * wid * 0.36 * s]);
  const list = S.skids || (S.skids = []);
  if (v.skidPrev) for (let k = 0; k < 2; k++) { const [x0, y0] = v.skidPrev[k], [x1, y1] = wheels[k]; if (Math.hypot(x1 - x0, y1 - y0) > 1.5) list.push({ x0, y0, x1, y1, t: S.t }); }
  v.skidPrev = wheels;
  if (list.length > SKID_MAX) list.splice(0, list.length - SKID_MAX);
}
// 바닥 자국 (차보다 먼저): 1분에 걸쳐 옅어진다
function drawSkids() {
  const list = S.skids; if (!list?.length) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 5;
  for (const m of list) { const age = S.t - m.t; if (age > 60 || !inView(m.x1, m.y1, 20)) continue;
    ctx.strokeStyle = `rgba(10,10,12,${0.5 * (1 - age / 60)})`; ctx.beginPath(); ctx.moveTo(m.x0, m.y0); ctx.lineTo(m.x1, m.y1); ctx.stroke(); }
  ctx.restore();
}
// 끼익 소리: 잡음을 좁은 대역으로 걸러 미끄러지는 만큼 키운다
let SCREECH = null;
function screechSound() {
  if (!AC || !master) return;
  const v = S?.player?.car, on = !!v && v.skidding && running && !paused && !S.over && !muted;
  if (!SCREECH) { if (!on) return;
    const n = AC.sampleRate, buf = AC.createBuffer(1, n, n), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 7;
    const g = AC.createGain(); g.gain.value = 0; src.connect(bp); bp.connect(g); g.connect(master); src.start(); SCREECH = { g, bp }; }
  const now = AC.currentTime, s = on ? Math.min(1, (v.slip || 0) * 2 + (v.skidding ? 0.35 : 0)) : 0;
  SCREECH.g.gain.setTargetAtTime(on ? 0.05 + s * 0.16 : 0, now, on ? 0.04 : 0.1);
  SCREECH.bp.frequency.setTargetAtTime(1300 + s * 600 + Math.sin(S.t * 31) * 120, now, 0.05);
}
// 라디오: 차마다 맞춰 둔 방송. 쫓기지 않을 때만 틀고, 음악을 좁은 대역(작은 스피커 소리)으로 거른다
const RADIO_STATIONS = ['n_title', 'n_calm'];
const carStation = v => RADIO_STATIONS[(v.id || 0) % RADIO_STATIONS.length];
function radioWanted() { const v = S?.player?.car; return !!(STAGE.cityLife && v && !v.dead && !S.wanted && (S.moodHi || 0) < 2); }
