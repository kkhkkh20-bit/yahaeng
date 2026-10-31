// ---------------------------------------------------------------- 대사
const DLG = { q: [], cur: null, modal: false, onEnd: null };
// 말하는 사람: 이름 · 역할 색 · 얼굴(팔레트@체형 — 3D 인물을 가까이 찍은 초상에 옷 색을 칠해 쓴다)
const DLG_COL = { aide: '#8fe3c9', hero: '#7fd6ff', guard: '#ff7a66', elite: '#ff9a3c', target: '#f2c46b', civ: '#9fd8a8', master: '#c9a2ff', note: '#e8e3d6', dog: '#c8a27a' };
function speakerOf(w) {
  const P = S && S.player;
  if (w === 'hero') return { name: '올빼미', col: DLG_COL.hero, key: P ? playerKey(P) : 'ninja', role: P && P.disguise && P.outfit ? outfitName(P.outfit) + ' 옷' : '', face: 'fc_ninja' };
  if (w && w.note) return { name: w.note, col: DLG_COL.note, key: null, role: '', face: null };
  if (w === 'aide') return { name: '제비', col: DLG_COL.aide, key: 'civ3@fBob', role: '현장 지원', face: 'fc_aide' };
  if (w === 'master') return { name: '까마귀', col: DLG_COL.master, key: 'noble', role: '', face: 'fc_master' };
  if (w && w.civ) return { name: w.child ? '아이' : '주민', col: DLG_COL.civ, key: charOf(w), role: w.outfit && w.outfit !== 'crew' ? outfitName(w.outfit) : '', face: 'fc_civ' + (w.look || 0) };
  if (w && w.doc) return { name: '한 선생', col: DLG_COL.civ, key: charOf(w), role: '', face: 'fc_doc' };
  if (w && w.kind) { const k = w.dog ? 'dog' : w.target ? 'target' : w.elite ? 'elite' : 'guard';
    return { name: w.dog ? '들개' : w.lookout ? '망꾼' : w.elite ? '정예' : w.target ? '표적' : '자경대원', col: DLG_COL[k], key: w.dog ? null : charOf(w), role: w.enforcer ? '반장' : '', face: w.dog ? null : 'fc_' + charOf(w) }; }
  return { name: '', col: '#9fb6d8', key: null, role: '', face: null };
}
// 초상 시트(키 색)를 팔레트별로 한 번 칠해 둔다
const FACE = { img: null, base: null, pal: {} };
if (PR && PR.faces && PR.faces.src) { FACE.img = new Image(); FACE.img.onload = () => { try { FACE.base = prPrep(FACE.img); } catch (e) { console.warn('face', e); } }; FACE.img.src = PR.faces.src; }
function faceSheet(pk, body) {
  const key = pk + (body && body.startsWith('hero') ? '@hero' : '');
  if (FACE.pal[key]) return FACE.pal[key]; const B = FACE.base, pal = prPalette(pk, body); if (!B || !pal) return null;
  return (FACE.pal[key] = prPaint(B, pal));
}
// 대사창 얼굴: 실루엣 초상 — 상반신을 어두운 그림자로 칠하고 가장자리만 말하는 사람 역할 색으로 빛나게 (윤곽으로 머리 모양·헬멧·덩치를 구분)
// 저폴리곤 얼굴을 크게 보이면 어색해서, 얼굴 생김새 대신 윤곽과 옷 색 기운만 남긴다
const _fcTmp = document.createElement('canvas');
function drawFace(cv, sp) {
  const fc = cv.getContext('2d'), W = cv.width, H = cv.height; fc.clearRect(0, 0, W, H);
  if (!(sp.key && FACE.base)) return false;
  const [pk, bn] = prSplit(sp.key), col = PR.faces.cols[bn || ''] != null ? PR.faces.cols[bn || ''] : 0, sh = faceSheet(pk, bn), fr = PR.faces.fr; if (!sh) return false;
  if (PR.style === 'modular') {
    // The same authored model supplies the portrait and every in-game pose.
    // Keep the existing dialogue box/portrait position; retain face detail.
    fc.fillStyle = '#11171c'; fc.fillRect(0, 0, W, H);
    fc.imageSmoothingEnabled = true;
    fc.drawImage(sh, col * fr, 0, fr, fr, 0, 0, W, H);
    return true;
  }
  const t = _fcTmp; t.width = W; t.height = H; const x = t.getContext('2d'); x.imageSmoothingEnabled = true;
  const src = () => x.drawImage(sh, col * fr, 0, fr, fr, 0, 0, W, H);
  // 1 뒤에 번지는 빛 (역할 색)
  fc.save(); fc.filter = 'blur(10px)'; fc.globalAlpha = 0.55; x.clearRect(0, 0, W, H); src(); x.globalCompositeOperation = 'source-in'; x.fillStyle = sp.col; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  fc.drawImage(t, 0, 0); fc.restore();
  // 2 테두리 빛: 몸 모양을 왼쪽 위로 살짝 민 것과의 차이만 남긴다
  x.clearRect(0, 0, W, H); src(); x.globalCompositeOperation = 'source-in'; x.fillStyle = sp.col; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-out'; x.drawImage(sh, col * fr, 0, fr, fr, 4, 3, W, H); x.globalCompositeOperation = 'source-over';
  // 3 몸: 어두운 그림자 + 옷 색 기운 조금
  const b = document.createElement('canvas'); b.width = W; b.height = H; const y = b.getContext('2d');
  y.drawImage(sh, col * fr, 0, fr, fr, 0, 0, W, H); y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(10,13,22,.95)'; y.fillRect(0, 0, W, H);
  const g = y.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,13,22,.5)'); g.addColorStop(1, 'rgba(10,13,22,0)'); y.fillStyle = g; y.fillRect(0, 0, W, H);
  fc.drawImage(b, 0, 0); fc.drawImage(t, 0, 0);
  return true;
}
// 이야기 장면(modal)은 아래 대사창, 플레이 중 혼잣말·외침은 그 사람 머리 위 말풍선으로 (몸이 없는 말 — 쪽지·의뢰인 — 만 대사창)
function say(lines, modal, onEnd) {
  if (!lines || !lines.length || (DLG.modal && !modal)) return;
  if (!modal && S && lines.every(l => l[0] === 'hero' || (l[0] && l[0].kind && l[0].x != null))) {
    let at = S.t; S.sayQ = (S.sayQ || []).filter(q => !lines.some(l => l[0] === q.w));  // 같은 사람의 밀린 말은 새 말로 바꾼다
    for (const [w, text] of lines) { const dur = Math.min(4.5, 1.4 + text.length / 14); S.sayQ.push({ at, w, text, dur }); at += dur * 0.85; }
    if (onEnd) onEnd(); return;
  }
  DLG.q = lines.slice(); DLG.modal = !!modal; DLG.onEnd = onEnd || null; nextLine();
}
function updateSayQ() {
  if (!S || !S.sayQ || !S.sayQ.length) return;
  for (const q of S.sayQ.slice()) { if (q.at > S.t) continue; S.sayQ.splice(S.sayQ.indexOf(q), 1);
    if (q.w === 'hero') { S.player.say = q.text; S.player.sayT = q.dur; } else if (q.w.state !== 'DEAD') { q.w.say = q.text; q.w.sayT = q.dur; } }
}
function bark(who, key) { const arr = BARKS[key]; if (!arr || !who) return; say([[who, arr[(Math.random() * arr.length) | 0]]]); }
const anyGuard = pred => S.guards.find(g => g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !g.dog && !g.target && (!pred || pred(g)));
function nextLine() {
  const l = DLG.q.shift(), el = $('dlg');
  if (!l) { DLG.cur = null; DLG.modal = false; el.hidden = true; document.body.classList.remove('dlgmodal'); const cb = DLG.onEnd; DLG.onEnd = null; if (cb) cb(); return; }
  const sp = speakerOf(l[0]); DLG.cur = { speaker:sp, text: l[1], shown: 0, t: 0, seed: [...(sp.name || '')].reduce((h, ch) => h + ch.charCodeAt(0), 0) };
  $('dlgName').textContent = sp.name; $('dlgName').hidden = !sp.name; $('dlgRole').textContent = sp.role || '';
  const hasF = drawFace($('dlgFace'), sp); $('dlgFaceBox').hidden = !hasF; el.classList.toggle('noface', !hasF); el.style.setProperty('--rc', sp.col);
  $('dlgMeasure').textContent = l[1]; $('dlgText').textContent = ''; $('dlgText').scrollTop=0; $('dlgHint').textContent = DLG.modal ? (isTouch ? '탭하면 다음' : 'Space 다음 · Esc 건너뛰기') : '';
  const opening = el.hidden; el.classList.toggle('modal', DLG.modal); el.classList.add('talking'); el.hidden = !DLG.modal&&playerActionFocus(); document.body.classList.toggle('dlgmodal', !!DLG.modal);
  if (opening) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }  // 처음 열릴 때만 떠오르며 등장. 이어지는 줄은 같은 창에서 글자만 바뀐다
}
function advanceDialog() { if (paused) return;  // 일시정지·브리핑 화면 중에는 대사가 넘어가지 않는다
  const c = DLG.cur; if (!c) return; if (c.shown < c.text.length) { c.shown = c.text.length; $('dlgText').textContent = c.text; $('dlg').classList.remove('talking'); } else nextLine(); }
function skipDialog() { DLG.q = []; nextLine(); }
function resetDialog() { DLG.q = []; DLG.cur = null; DLG.modal = false; DLG.onEnd = null; $('dlg').hidden = true; document.body.classList.remove('dlgmodal'); }
function updateDialog(dt) {
  updateSayQ(); const P = S && S.player; if (P && P.sayT > 0 && (P.sayT -= dt) <= 0) P.say = null;
  const c = DLG.cur; if (!c) return;
  if(!DLG.modal&&playerActionFocus()){ $('dlg').hidden=true; return; }
  $('dlg').hidden=false; c.t += dt;
  if (c.shown < c.text.length) { const n0 = Math.floor(c.shown); c.shown = Math.min(c.text.length, c.shown + dt * 38); const n1 = Math.floor(c.shown); $('dlgText').textContent = c.text.slice(0, n1);
    for (let i = n0; i < n1; i++) if (i % 2 === 0 && !/[\s.,…·!?]/.test(c.text[i])) { typeTick(c.seed); break; } if (c.shown >= c.text.length) $('dlg').classList.remove('talking'); }  // 타이핑 소리 (두 글자에 한 번, 띄어쓰기·문장부호는 조용히)
  else if (!DLG.modal && c.t > c.text.length / 38 + 2.2) nextLine();
}
{ const el=document.getElementById('dlg'); let tap=null;
  el.addEventListener('pointerdown',e=>{if(e.isPrimary!==false&&e.button===0)tap={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
  el.addEventListener('pointermove',e=>{if(tap&&tap.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap.moved=true;});
  el.addEventListener('pointerup',e=>{const t=tap;tap=null;if(t&&t.id===e.pointerId&&!t.moved){e.preventDefault();advanceDialog();}});
  el.addEventListener('pointercancel',()=>{tap=null;});
}
// 밤 소리(귀뚜라미) 반복
let ambSrc = null;
function startAmb() {
  if (!AC || ambSrc) return;
  const go = buf => { if (ambSrc) return; const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; const g = AC.createGain(); g.gain.value = muted ? 0 : 0.1; s.connect(g); g.connect(master); s.start(); s._g = g; ambSrc = s; };
  if (MB.crickets) go(MB.crickets); else if (A.music && A.music.crickets) AC.decodeAudioData(b64ToBuf(A.music.crickets), b => { MB.crickets = b; go(b); }, () => {});
}
