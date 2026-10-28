// ---------------------------------------------------------------- 사운드
let AC = null, master = null, muted = false; const SB = {};
function b64ToBuf(d) { const s = atob(d.split(',')[1]); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; }
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = typeof VOL === 'number' ? VOL : 0.9; master.connect(AC.destination);
    setTimeout(() => prepNeonMusic(), 50);  // 처음 누른 순간부터 음악을 작업자에서 미리 합성
    for (const k in A.sounds) AC.decodeAudioData(b64ToBuf(A.sounds[k]), buf => { SB[k] = buf; }, () => {});
    const len = AC.sampleRate * 4, nb = AC.createBuffer(1, len, AC.sampleRate), d = nb.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
    const src = AC.createBufferSource(); src.buffer = nb; src.loop = true;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = AC.createGain(); g.gain.value = 0.05; src.connect(lp); lp.connect(g); g.connect(master); src.start();
  } catch (e) { AC = null; }
}
const MB = {}; let musicGain = null, musicSrc = null, musicKey = null;
function setMusic(k) {
  if (!AC || musicKey === k) return;
  if (k.startsWith('n_') && !MB[k]) { if (neonPending[k]) { musicKey = '__want_' + k; return; } MB[k] = makeNeonLoop(k); }
  if (!MB[k]) { if (A.music && A.music[k] && !MB['_' + k]) { MB['_' + k] = 1; AC.decodeAudioData(b64ToBuf(A.music[k]), b => { MB[k] = b; if (musicKey === '__want_' + k) { musicKey = null; setMusic(k); } }, () => {}); } musicKey = '__want_' + k; return; }
  if (!musicGain) { musicGain = AC.createGain(); musicGain.connect(master); }
  const now = AC.currentTime;
  if (musicSrc) { const old = musicSrc; const og = old._g; og.gain.setTargetAtTime(0, now, 0.4); setTimeout(() => { try { old.stop(); } catch (e) {} }, 2000); }
  const src = AC.createBufferSource(); src.buffer = MB[k]; src.loop = true;
  const g = AC.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(muted ? 0 : (k === 'calm' ? 0.16 : k === 'n_calm' ? 0.08 : k === 'n_tense' ? 0.17 : 0.2), now, k === 'n_fight' ? 0.15 : 0.5);
  src.connect(g); g.connect(musicGain); src._g = g; src.start(); musicSrc = src; musicKey = k;
}
// 도시 음악: 네온 신스 3단계 (평상시 · 의심 · 발각) — 직접 합성, 루프
// 합성 본체: 순수 함수라 작업자(Web Worker)에서도 돈다 — 판 시작 때 0.6초 넘게 화면이 멈추던 원인
function neonSynth(kind, sr) {
  const TAU = Math.PI * 2, BPM = kind === 'n_calm' ? 72 : kind === 'n_tense' ? 96 : 132, beat = 60 / BPM, bars = 8, len = Math.floor(sr * beat * 4 * bars);
  const L = new Float32Array(len), R = new Float32Array(len);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12), at = b => Math.floor(b * beat * sr);
  const add = (i, l, r) => { i %= len; L[i] += l; R[i] += r == null ? l : r; };
  const saw = ph => 2 * (ph - Math.floor(ph + 0.5)), tri = ph => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5));
  // 음 하나: 파형, 길이, 볼륨, 저역 통과, 좌우, 엔벨로프(공격·감쇠)
  const note = (b0, durB, m, o) => {
    const f = hz(m), n = Math.floor(durB * beat * sr), s0 = at(b0), A = (o.att || 0.005) * sr, dec = o.dec || 0, cut = o.cut || 4000, pan = o.pan || 0, vol = o.vol || 0.2, det = o.det || 0;
    let y = 0, y2 = 0, ph1 = Math.random(), ph2 = Math.random();
    for (let i = 0; i < n + sr * (o.rel || 0.05); i++) {
      const tt = i / sr, env = Math.min(1, i / A) * (dec ? Math.exp(-tt * dec) : 1) * (i > n ? Math.exp(-(i - n) / sr / (o.rel || 0.05) * 4) : 1);
      ph1 += f * (1 + det) / sr; ph2 += f * (1 - det) / sr;
      let x = o.wave === 'tri' ? tri(ph1) : o.wave === 'sin' ? Math.sin(TAU * ph1) : o.wave === 'sq' ? (ph1 % 1 < 0.5 ? 1 : -1) * 0.6 : (saw(ph1) + saw(ph2)) * 0.5;
      const fc = o.sweep ? cut * (1 + o.sweep * Math.exp(-tt * 10)) : cut, a = 1 - Math.exp(-TAU * fc / sr); y += a * (x - y); y2 += a * (y - y2);
      const v = y2 * env * vol; add(s0 + i, v * (1 - pan) , v * (1 + pan));
    }
  };
  const kick = (b, v = 0.9) => { const s0 = at(b); for (let i = 0; i < sr * 0.32; i++) { const tt = i / sr, ph = TAU * (46 * tt + 120 * (1 - Math.exp(-tt * 30)) / 30); add(s0 + i, Math.sin(ph) * Math.exp(-tt * 9) * v); } };
  const noiseHit = (b, durS, v, hp, pan = 0) => { const s0 = at(b); let pv = 0, y = 0; for (let i = 0; i < sr * durS; i++) { const n = Math.random() * 2 - 1, h = hp ? n - pv : n; pv = n; y += 0.5 * (h - y); const e = v * Math.exp(-i / sr / durS * 5); add(s0 + i, (hp ? h : y) * e * (1 - pan), (hp ? h : y) * e * (1 + pan)); } };
  const delay = (sec, fb, mix) => { const d = Math.floor(sec * sr); for (let i = 0; i < len; i++) { const j = (i + d) % len; L[j] += R[i] * fb * mix; R[j] += L[i] * fb * mix; } };
  const B = bars * 4;
  if (kind === 'n_calm') {
    const prog = [[45, 57, 60, 64], [41, 57, 60, 64], [38, 57, 60, 65], [40, 55, 59, 64]];
    for (let c = 0; c < 4; c++) { const ch = prog[c], b0 = c * 8;
      for (const m of ch.slice(1)) note(b0, 8, m, { att: 1.6, rel: 1.2, cut: 600, vol: 0.07, det: 0.004, pan: (m % 3 - 1) * 0.4 });
      note(b0, 8, ch[0] - 12, { wave: 'sin', att: 0.4, rel: 0.6, cut: 300, vol: 0.32 });
      const arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 24, ch[3] + 12];
      for (let k = 0; k < 5; k++) note(b0 + k * 1.5 + 0.5, 0.4, arp[k % arp.length], { wave: 'tri', dec: 5, cut: 3200, vol: 0.11, pan: k % 2 ? 0.5 : -0.5, rel: 0.2 });
    }
    for (let b = 0; b < B; b += 2) noiseHit(b + 1, 0.05, 0.03, true, 0.3);
    delay(beat * 0.75, 0.5, 0.55);
  } else if (kind === 'n_tense') {
    for (let c = 0; c < 2; c++) note(c * 16, 16, 33, { att: 2, rel: 1, cut: 260, vol: 0.28, det: 0.006 });
    const pat = [45, 45, 57, 45, 48, 45, 57, 51];
    for (let k = 0; k < B * 4; k++) { const m = pat[k % 8] + (k >= B * 2 ? 1 : 0) * (k % 16 > 11 ? -2 : 0); note(k / 4, 0.2, m, { wave: 'sq', dec: 14, cut: 500 + 1400 * ((k % 64) / 64), vol: 0.09, pan: k % 2 ? 0.25 : -0.25, rel: 0.03 }); }
    for (let k = 0; k < B * 4; k++) noiseHit(k / 4, 0.03, k % 4 === 2 ? 0.07 : 0.035, true, 0.4);
    for (let b = 0; b < B; b += 4) { kick(b, 0.55); kick(b + 0.75, 0.35); }
    for (let c = 0; c < 4; c++) for (const m of [57, 60, 63]) note(c * 8 + 6, 2, m, { att: 0.6, rel: 0.6, cut: 1200, vol: 0.05, det: 0.008 });
    delay(beat * 0.5, 0.35, 0.4);
  } else {
    for (let b = 0; b < B; b++) kick(b, 0.85);
    for (let b = 1; b < B; b += 2) { noiseHit(b, 0.16, 0.32, false); note(b, 0.1, 50, { wave: 'sin', dec: 30, vol: 0.25 }); }
    for (let k = 0; k < B * 2; k++) noiseHit(k / 2 + 0.25, 0.04, 0.08, true, 0.3);
    const bass = [45, 45, 45, 57, 43, 43, 55, 43, 41, 41, 53, 41, 40, 40, 52, 47];
    for (let k = 0; k < B * 2; k++) note(k / 2, 0.42, bass[Math.floor(k / 2) % 16] - 12, { cut: 700, sweep: 2, vol: 0.2, det: 0.005 });
    const lead = [69, 72, 76, 74, 72, 71, 67, 69];
    for (let bar = 0; bar < bars; bar++) { note(bar * 4 + 2.5, 0.35, lead[bar], { wave: 'sq', dec: 6, cut: 2600, vol: 0.08, pan: 0.3 }); note(bar * 4 + 3, 0.35, lead[bar] - 5, { wave: 'sq', dec: 6, cut: 2600, vol: 0.07, pan: -0.3 }); }
    delay(beat * 0.75, 0.25, 0.3);
  }
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); const nm = 0.9 / (pk || 1); for (let i = 0; i < len; i++) { L[i] *= nm; R[i] *= nm; }
  return { L, R };
}
const toBuf = r => { const b = AC.createBuffer(2, r.L.length, AC.sampleRate); b.copyToChannel(r.L, 0); b.copyToChannel(r.R, 1); return b; };
function makeNeonLoop(kind) { return toBuf(neonSynth(kind, AC.sampleRate)); }
// 작업자에서 세 곡을 미리 합성한다 (안 되는 환경이면 쉬는 틈에 하나씩)
let neonW = null; const neonPending = {};
function prepNeonMusic() {
  if (!AC) return;
  const ks = ['n_calm', 'n_tense', 'n_fight'].filter(k => !MB[k] && !neonPending[k]); if (!ks.length) return;
  try {
    if (!neonW) { neonW = new Worker(URL.createObjectURL(new Blob([neonSynth.toString() + '\nonmessage = e => { const r = neonSynth(e.data.k, e.data.sr); postMessage({ k: e.data.k, L: r.L, R: r.R }, [r.L.buffer, r.R.buffer]); };'], { type: 'text/javascript' })));
      neonW.onmessage = e => { const { k, L, R } = e.data; delete neonPending[k]; if (!MB[k]) MB[k] = toBuf({ L, R }); if (musicKey === '__want_' + k) { musicKey = null; setMusic(k); } }; }
    ks.forEach(k => { neonPending[k] = 1; neonW.postMessage({ k, sr: AC.sampleRate }); });
  } catch (e) { ks.forEach((k, i) => setTimeout(() => { if (!MB[k]) MB[k] = makeNeonLoop(k); }, 60 + i * 400)); }
}
// 클럽 음악: 124BPM 4박 킥 + 오프비트 하이햇 + 베이스 + 화음 (직접 합성, 2마디 반복)
const CLUB_BPM = 124; let club = null;
function makeClubLoop() {
  const sr = AC.sampleRate, beat = 60 / CLUB_BPM, len = Math.floor(sr * beat * 8), buf = AC.createBuffer(2, len, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const add = (i, l, r) => { if (i >= 0 && i < len) { L[i] += l; R[i] += r == null ? l : r; } };
  for (let b = 0; b < 8; b++) { const s0 = Math.floor(b * beat * sr); for (let i = 0; i < sr * 0.3; i++) { const t = i / sr, ph = 2 * Math.PI * (48 * t + 110 * (1 - Math.exp(-t * 28)) / 28); add(s0 + i, Math.sin(ph) * Math.exp(-t * 8) * 0.95); } }
  let pv = 0; for (let b = 0; b < 8; b++) { const s0 = Math.floor((b + 0.5) * beat * sr); for (let i = 0; i < sr * 0.09; i++) { const n = Math.random() * 2 - 1, hp = n - pv; pv = n; const e = 0.16 * Math.exp(-i / sr * 38); add(s0 + i, hp * e * 0.8, hp * e); } }
  for (let b = 0; b < 8; b++) if (b % 2) { const s0 = Math.floor(b * beat * sr); for (let i = 0; i < sr * 0.12; i++) { const n = Math.random() * 2 - 1; add(s0 + i, n * 0.22 * Math.exp(-i / sr * 22)); } }  // 클랩
  const bass = [45, 0, 45, 57, 45, 0, 48, 50, 45, 0, 45, 57, 52, 0, 50, 48];
  for (let k = 0; k < 16; k++) { const m = bass[k]; if (!m) continue; const f = 440 * Math.pow(2, (m - 69) / 12), s0 = Math.floor(k * beat / 2 * sr); let y = 0; for (let i = 0; i < sr * beat / 2 * 0.85; i++) { const t = i / sr, saw = 2 * ((t * f) % 1) - 1; y += (saw - y) * 0.06; const duck = 0.35 + 0.65 * Math.min(1, ((i / sr + (k % 2) * beat / 2) % beat) / (beat * 0.35)); add(s0 + i, y * 0.5 * Math.min(1, i / 120) * duck); } }
  const chord = [57, 60, 64]; for (let bar = 0; bar < 2; bar++) for (const off of [1.5, 3.5]) { const s0 = Math.floor((bar * 4 + off) * beat * sr); for (const m of chord) { const f = 440 * Math.pow(2, (m - 69) / 12); for (let i = 0; i < sr * 0.18; i++) { const t = i / sr; add(s0 + i, (2 * ((t * f) % 1) - 1) * 0.045 * Math.exp(-t * 14), (2 * ((t * f * 1.003) % 1) - 1) * 0.045 * Math.exp(-t * 14)); } } }
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); const nm = 0.9 / (pk || 1); for (let i = 0; i < len; i++) { L[i] *= nm; R[i] *= nm; }
  return buf;
}
function updateClubMusic() {
  if (!AC || !S) return;
  const zones = CROWD.filter(c => c.club); if (!zones.length) { if (club) { club.g.gain.setTargetAtTime(0, AC.currentTime, 0.3); } return; }
  if (!club) { const src = AC.createBufferSource(); src.buffer = makeClubLoop(); src.loop = true; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const g = AC.createGain(); g.gain.value = 0; src.connect(lp); lp.connect(g); g.connect(master); src.start(); club = { src, lp, g, t0: AC.currentTime }; }
  const P = S.player, fl = flOf(P); let vol = 0, open = false;
  for (const c of zones) {
    const inside = c.fl === fl && P.x >= c.x0 * TILE && P.x < (c.x1 + 1) * TILE && P.y >= (c.y0 - 1) * TILE && P.y < (c.y1 + 1) * TILE;
    if (inside) { vol = 0.55; open = true; hint('loud', '클럽 안: 음악에 소리가 묻히고 손님 사이에서 덜 띈다'); break; }
    const B = BLD[c.b], cx = (B.x0 + B.x1 + 1) / 2 * TILE, cy = (B.y0 + B.y1 + 1) / 2 * TILE, d = dist(P.x, P.y, cx, cy);
    vol = Math.max(vol, clamp(1 - d / 900, 0, 1) * (bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) === c.b ? 0.4 : 0.28));
  }
  const now = AC.currentTime; club.g.gain.setTargetAtTime(muted || S.over ? 0 : vol, now, 0.25); club.lp.frequency.setTargetAtTime(open ? 16000 : 380, now, 0.25);
}
const clubBeat = () => club && AC ? ((AC.currentTime - club.t0) * CLUB_BPM / 60) % 1 : (S.t * CLUB_BPM / 60) % 1;
// 클럽 안: 박자에 맞춰 퍼지는 음파 (내 발소리가 묻히는 곳)
function drawLoud(fl) {
  const b = clubBeat();
  for (const c of CROWD) { if (!c.club || c.fl !== fl) continue;
    const cx = (c.x0 + c.x1 + 1) / 2 * TILE, cy = (c.y0 + c.y1 + 1) / 2 * TILE, rr = Math.max(c.x1 - c.x0, c.y1 - c.y0) * TILE * 0.6;
    for (let k = 0; k < 2; k++) { const f = (b + k * 0.5) % 1; ctx.strokeStyle = `rgba(255,90,200,${0.45 * (1 - f)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 20 + rr * f, 0, TAU); ctx.stroke(); }
  }
}
function play(name, vol = 0.6, rate = 1) {
  if (!AC || muted || !SB[name]) return;
  const s = AC.createBufferSource(); s.buffer = SB[name]; s.playbackRate.value = rate * rnd(0.94, 1.06);
  const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}


// ---------------------------------------------------------------- 합성 효과음 (파일 없이 WebAudio로)
// 히트맨식 '암살 스팅어'(조용한 처치에 붙는 짧고 추상적인 소리 — 플레이어만 듣는다), 은신 상태 신호음, 의심 상승음, 메뉴 딸깍
function sfx(kind) {
  if (!AC || muted || !master) return; const t = AC.currentTime;
  const osc = (type, f0, f1, dur, vol, at = 0) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + at); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
    g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(vol, t + at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur); o.connect(g); g.connect(master); o.start(t + at); o.stop(t + at + dur + 0.02); };
  const hiss = (dur, vol, freq, q = 1, at = 0) => { const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t + at); };
  if (kind === 'click') { osc('triangle', 2300, 1800, 0.035, 0.06); hiss(0.02, 0.05, 4000, 2); }
  else if (kind === 'stinger') { osc('sine', 72, 42, 0.55, 0.38); hiss(0.28, 0.14, 900, 0.7); osc('sine', 1318, 1318, 0.7, 0.035, 0.03); osc('sine', 1975, 1975, 0.5, 0.02, 0.06); }
  else if (kind === 'stingerKO') { osc('sine', 150, 100, 0.3, 0.2); osc('sine', 988, 988, 0.45, 0.025, 0.02); }
  else if (kind === 'toHide') osc('sine', 540, 330, 0.16, 0.06);
  else if (kind === 'toBlend') osc('sine', 440, 440, 0.1, 0.04);
  else if (kind === 'toRisk') { osc('sine', 420, 640, 0.12, 0.06); }
  else if (kind === 'toSeen') { osc('square', 660, 660, 0.07, 0.045); osc('square', 880, 880, 0.09, 0.045, 0.08); }
}
// 의심 상승음: 누가 나를 알아채는 게이지(0~1)를 따라 아주 작은 음이 높아진다. 0이면 사라진다
let riskOsc = null, riskGain = null;
function riskTone(r) {
  if (!AC || !master) return; if (muted) r = 0;
  if (!riskOsc) { if (r < 0.05) return; riskOsc = AC.createOscillator(); riskGain = AC.createGain(); const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; riskOsc.type = 'triangle'; riskGain.gain.value = 0; riskOsc.connect(f); f.connect(riskGain); riskGain.connect(master); riskOsc.start(); }
  const t = AC.currentTime, on = r >= 0.05 && r < 1;
  riskGain.gain.setTargetAtTime(on ? 0.012 + 0.05 * r : 0, t, on ? 0.08 : 0.15); riskOsc.frequency.setTargetAtTime(240 + 620 * Math.min(1, r), t, 0.1);
}
// 메뉴·화면 버튼 딸깍 (게임 안 행동 버튼은 각자 소리가 있어 제외)
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b || b.closest('.pad') || b.closest('#keypad')) return; if (!b.closest('.screen, .sysbtns, #tacBanner')) return; try { initAudio(); } catch (er) {} sfx('click'); }, true);
