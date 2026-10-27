// ---------------------------------------------------------------- 대사
const DLG = { q: [], cur: null, modal: false, onEnd: null };
// 말하는 사람: 이름 · 역할 색 · 얼굴(팔레트@체형 — 3D 인물을 가까이 찍은 초상에 옷 색을 칠해 쓴다)
const DLG_COL = { hero: '#7fd6ff', guard: '#ff7a66', elite: '#ff9a3c', target: '#f2c46b', civ: '#9fd8a8', master: '#c9a2ff', note: '#e8e3d6', dog: '#c8a27a' };
function speakerOf(w) {
  const P = S && S.player;
  if (w === 'hero') return { name: '나', col: DLG_COL.hero, key: P && P.disguise && PR_PAL[P.disguise] ? P.disguise : 'ninja', role: P && P.disguise && P.outfit ? outfitName(P.outfit) + ' 옷' : '', face: 'fc_ninja' };
  if (w && w.note) return { name: w.note, col: DLG_COL.note, key: null, role: '', face: null };
  if (w === 'master') return { name: '의뢰인', col: DLG_COL.master, key: 'noble', role: '', face: 'fc_master' };
  if (w && w.civ) return { name: w.child ? '아이' : '주민', col: DLG_COL.civ, key: charOf(w), role: w.outfit && w.outfit !== 'crew' ? outfitName(w.outfit) : '', face: 'fc_civ' + (w.look || 0) };
  if (w && w.doc) return { name: '한 선생', col: DLG_COL.civ, key: charOf(w), role: '', face: 'fc_doc' };
  if (w && w.kind) { const k = w.dog ? 'dog' : w.target ? 'target' : w.elite ? 'elite' : 'guard';
    return { name: w.dog ? '들개' : w.lookout ? '망꾼' : w.elite ? '정예' : w.target ? '표적' : '자경대원', col: DLG_COL[k], key: w.dog ? null : charOf(w), role: w.enforcer ? '반장' : '', face: w.dog ? null : 'fc_' + charOf(w) }; }
  return { name: '', col: '#9fb6d8', key: null, role: '', face: null };
}
// 초상 시트(키 색)를 팔레트별로 한 번 칠해 둔다
const FACE = { img: null, base: null, pal: {} };
if (PR && PR.faces && PR.faces.src) { FACE.img = new Image(); FACE.img.onload = () => { try { FACE.base = prPrep(FACE.img); } catch (e) { console.warn('face', e); } }; FACE.img.src = PR.faces.src; }
function faceSheet(pk) {
  if (FACE.pal[pk]) return FACE.pal[pk]; const B = FACE.base, pal = PR_PAL[pk]; if (!B || !pal) return null;
  const P4 = pal.map(h => hexRgb(h).split(',').map(Number)), c = document.createElement('canvas'); c.width = B.w; c.height = B.h;
  const x = c.getContext('2d'), id = x.createImageData(B.w, B.h), o = id.data; o.set(B.src);
  for (let i = 0, n = B.w * B.h; i < n; i++) { const wt = B.wgt[i]; if (!wt) continue; const p = P4[B.cls[i]], s = B.shd[i], j = i * 4;
    o[j] = p[0] * s * wt + B.src[j] * (1 - wt); o[j + 1] = p[1] * s * wt + B.src[j + 1] * (1 - wt); o[j + 2] = p[2] * s * wt + B.src[j + 2] * (1 - wt); }
  x.putImageData(id, 0, 0); return (FACE.pal[pk] = c);
}
function drawFace(cv, sp) {
  const fc = cv.getContext('2d'); fc.clearRect(0, 0, cv.width, cv.height);
  if (sp.key && FACE.base) { const [pk, bn] = prSplit(sp.key), col = PR.faces.cols[bn || ''] != null ? PR.faces.cols[bn || ''] : 0, sh = faceSheet(pk), fr = PR.faces.fr;
    if (sh) { fc.imageSmoothingEnabled = true; fc.drawImage(sh, col * fr, 0, fr, fr, 0, 0, cv.width, cv.height); return true; } }
  const f = sp.face && F[sp.face]; if (!f) return false;  // 예전 도트 얼굴 (초상 시트가 없을 때)
  fc.imageSmoothingEnabled = false; fc.drawImage(atlas, f[0], f[1], f[2], f[3], 20, 24, 120, 120); return true;
}
function say(lines, modal, onEnd) {
  if (!lines || !lines.length || (DLG.modal && !modal)) return;
  DLG.q = lines.slice(); DLG.modal = !!modal; DLG.onEnd = onEnd || null; nextLine();
}
function bark(who, key) { const arr = BARKS[key]; if (!arr || !who) return; say([[who, arr[(Math.random() * arr.length) | 0]]]); }
const anyGuard = pred => S.guards.find(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.dog && !g.target && (!pred || pred(g)));
function nextLine() {
  const l = DLG.q.shift(), el = $('dlg');
  if (!l) { DLG.cur = null; DLG.modal = false; el.hidden = true; const cb = DLG.onEnd; DLG.onEnd = null; if (cb) cb(); return; }
  const sp = speakerOf(l[0]); DLG.cur = { text: l[1], shown: 0, t: 0 };
  $('dlgName').textContent = sp.name; $('dlgName').hidden = !sp.name; $('dlgRole').textContent = sp.role || '';
  const hasF = drawFace($('dlgFace'), sp); $('dlgFaceBox').hidden = !hasF; el.classList.toggle('noface', !hasF); el.style.setProperty('--rc', sp.col);
  $('dlgText').textContent = ''; $('dlgHint').textContent = DLG.modal ? (isTouch ? '탭하면 다음' : 'Space 다음 · Esc 건너뛰기') : '';
  el.classList.toggle('modal', DLG.modal); el.classList.add('talking'); el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';  // 줄이 바뀔 때마다 살짝 떠오르며 등장
}
function advanceDialog() { const c = DLG.cur; if (!c) return; if (c.shown < c.text.length) { c.shown = c.text.length; $('dlgText').textContent = c.text; $('dlg').classList.remove('talking'); } else nextLine(); }
function skipDialog() { DLG.q = []; nextLine(); }
function resetDialog() { DLG.q = []; DLG.cur = null; DLG.modal = false; DLG.onEnd = null; $('dlg').hidden = true; }
function updateDialog(dt) {
  const c = DLG.cur; if (!c) return; c.t += dt;
  if (c.shown < c.text.length) { c.shown = Math.min(c.text.length, c.shown + dt * 38); $('dlgText').textContent = c.text.slice(0, Math.floor(c.shown)); if (c.shown >= c.text.length) $('dlg').classList.remove('talking'); }
  else if (!DLG.modal && c.t > c.text.length / 38 + 2.2) nextLine();
}
{ const el = document.getElementById('dlg'); el.addEventListener('pointerdown', e => { e.preventDefault(); advanceDialog(); });
 }
// 밤 소리(귀뚜라미) 반복
let ambSrc = null;
function startAmb() {
  if (!AC || ambSrc) return;
  const go = buf => { if (ambSrc) return; const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; const g = AC.createGain(); g.gain.value = muted ? 0 : 0.1; s.connect(g); g.connect(master); s.start(); s._g = g; ambSrc = s; };
  if (MB.crickets) go(MB.crickets); else if (A.music && A.music.crickets) AC.decodeAudioData(b64ToBuf(A.music.crickets), b => { MB.crickets = b; go(b); }, () => {});
}
