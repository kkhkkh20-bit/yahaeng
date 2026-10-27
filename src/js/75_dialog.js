// ---------------------------------------------------------------- 대사
const DLG = { q: [], cur: null, modal: false, onEnd: null };
function speakerOf(w) {
  if (w === 'hero') return { name: '나', face: 'fc_ninja' };
  if (w && w.note) return { name: w.note, face: null };
  if (w === 'master') return { name: '의뢰인', face: 'fc_master' };
  if (w && w.civ) return { name: '주민', face: 'fc_civ' + (w.look || 0) };
  if (w && w.doc) return { name: '한 선생', face: 'fc_doc' };
  if (w && w.kind) return { name: w.dog ? '들개' : w.lookout ? '망꾼' : w.elite ? '정예' : w.target ? '표적' : '자경대원', face: w.dog ? null : 'fc_' + charOf(w) };
  return { name: '', face: null };
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
  $('dlgName').textContent = sp.name; $('dlgName').hidden = !sp.name;
  const fc = $('dlgFace').getContext('2d'); fc.imageSmoothingEnabled = false; fc.clearRect(0, 0, 38, 38);
  const f = sp.face && F[sp.face]; $('dlgFaceBox').hidden = !f; if (f) fc.drawImage(atlas, f[0], f[1], f[2], f[3], 0, 0, 38, 38);
  $('dlgText').textContent = ''; $('dlgHint').textContent = DLG.modal ? (isTouch ? '탭하면 다음 ▸' : 'Q · Space 다음 ▸   Esc 건너뛰기') : '';
  el.classList.toggle('modal', DLG.modal); el.hidden = false;
}
function advanceDialog() { const c = DLG.cur; if (!c) return; if (c.shown < c.text.length) { c.shown = c.text.length; $('dlgText').textContent = c.text; } else nextLine(); }
function skipDialog() { DLG.q = []; nextLine(); }
function resetDialog() { DLG.q = []; DLG.cur = null; DLG.modal = false; DLG.onEnd = null; $('dlg').hidden = true; }
function updateDialog(dt) {
  const c = DLG.cur; if (!c) return; c.t += dt;
  if (c.shown < c.text.length) { c.shown = Math.min(c.text.length, c.shown + dt * 38); $('dlgText').textContent = c.text.slice(0, Math.floor(c.shown)); }
  else if (!DLG.modal && c.t > c.text.length / 38 + 2.2) nextLine();
}
{ const el = document.getElementById('dlg'); el.addEventListener('pointerdown', e => { e.preventDefault(); advanceDialog(); });
  if (A.ui) { el.querySelector('.dlg-box').style.borderImage = `url(${A.ui.dialog}) 6 fill / 14px / 0 stretch`; document.getElementById('dlgFaceBox').style.backgroundImage = `url(${A.ui.facebox})`; } }
// 밤 소리(귀뚜라미) 반복
let ambSrc = null;
function startAmb() {
  if (!AC || ambSrc) return;
  const go = buf => { if (ambSrc) return; const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; const g = AC.createGain(); g.gain.value = muted ? 0 : 0.1; s.connect(g); g.connect(master); s.start(); s._g = g; ambSrc = s; };
  if (MB.crickets) go(MB.crickets); else if (A.music && A.music.crickets) AC.decodeAudioData(b64ToBuf(A.music.crickets), b => { MB.crickets = b; go(b); }, () => {});
}
