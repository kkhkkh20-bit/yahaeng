// ---------------------------------------------------------------- 그래픽
const atlas = new Image();
const F = A.frames;
const spr = {};
// 픽셀 아트 그리기 도우미 (16px 원본을 3배로)
function blit(c, name, dx, dy, dw, dh, sx = 0, sy = 0, sw, sh) { const f = F[name]; if (!f) return; c.drawImage(atlas, f[0] + sx, f[1] + sy, sw || f[2], sh || f[3], dx, dy, dw, dh); }
const dirOf = a => { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > Math.abs(s) ? (c > 0 ? 3 : 2) : (s > 0 ? 0 : 1); };
const charOf = g => charBase(g) + (g.body && PR && PR.bodies && PR.bodies[g.body] ? '@' + g.body : '');
const charBase = g => g.outfit && OUTFIT_PAL[g.outfit] ? g.outfit : g.doc ? 'doc' : g.civ ? 'civ' + (window.__PR ? ((g.look || 0) + g.id * 3) % 10 : (g.look || 0)) : g.dog ? 'dog' : g.lookout ? 'hunter' : g.target ? (g.id % 2 ? 'old' : 'noble') : g.kind === 'g3' ? 'samR' : g.kind === 'g2' ? 'samB' : 'sam';
// ---- 프리렌더 배경 (Kenney Retro Urban Kit, CC0): 건물 외관 · 바닥 · 나무를 같은 3/4 투영으로 미리 찍은 그림
const KIT_PROP = {};  // 키트 거리 소품 (쓰레기통 등)
if (window.__KIT && window.__KIT.props) for (const k in window.__KIT.props) { const e = window.__KIT.props[k]; KIT_PROP[k] = { img: Object.assign(new Image(), { src: e.src }), ox: e.ox, oy: e.oy }; }
const KIT = window.__KIT || null, kitG = {}, kitT = [], kitB = {}, kitBush = KIT && KIT.bush ? Object.assign(new Image(), { src: KIT.bush }) : null;
if (KIT) {
  for (const [k, src] of Object.entries(KIT.ground || {})) { const im = new Image(); im.src = src; kitG[k] = im; }
  (KIT.trees || []).forEach(src => { const im = new Image(); im.src = src; kitT.push(im); });
}
const kitOk = im => im && im.complete && im.naturalWidth > 0;
const kitTex = {}, kitFurn = {};
if (KIT) {
  for (const [k, src] of Object.entries(KIT.tex || {})) kitTex[k] = Object.assign(new Image(), { src });
  for (const [k, v] of Object.entries(KIT.furn || {})) kitFurn[k] = { img: Object.assign(new Image(), { src: v.src }), ox: v.ox, oy: v.oy };
}
// 실내 바닥 재질 (64px 텍스처를 한 칸으로): 나무 마루 · 짙은 마루(가로결) · 타일 · 콘크리트
const kitFloorC = {};
function kitFloor(k) {
  if (kitFloorC[k]) return kitFloorC[k];
  const src = kitTex[k === 'planks2' ? 'planks' : k]; if (!kitOk(src)) return null;
  const c = document.createElement('canvas'); c.width = c.height = TILE; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (k === 'planks2') { x.translate(TILE, 0); x.rotate(Math.PI / 2); }
  x.drawImage(src, 0, 0, TILE, TILE); x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = k === 'planks2' ? 'rgba(30,18,10,.35)' : k === 'tiles' ? 'rgba(220,230,240,.08)' : 'rgba(0,0,0,.08)'; x.fillRect(0, 0, TILE, TILE);
  return (kitFloorC[k] = c);
}
// 판이 시작될 때: 구운 건물 그림을 이 판 건물에 붙인다 (지도 모양이 바뀌었으면 붙이지 않고 기존 그림을 쓴다)
function kitAttach() {
  ROB = null; BLD.forEach(b => { b.kitProps = null; });
  const kid = STAGE.kitId || STAGE.id;  // 같은 지도를 쓰는 판은 구운 그림을 나눠 쓴다
  if (!KIT || !KIT.bld || !KIT.bld[kid]) return;
  const cache = kitB[STAGE.id] || (kitB[STAGE.id] = {});
  for (const e of KIT.bld[kid]) {
    const b = BLD[e.i]; if (!b || [b.x0, b.y0, b.x1, b.y1, b.h].join() !== e.key.join()) continue;
    let k = cache[e.i];
    if (!k) { k = cache[e.i] = { img: new Image(), ox: e.ox, oy: e.oy, w: e.w, h: e.h, c: null, gl: e.gl || [], g: null }; k.img.src = e.src; }
    b.kit = k; b.kitProps = e.props || null;
  }
  robBuild();
}
// 옥상 부분만 밤빛으로 한 번 어둡게 칠한 사본 (정면 벽은 매 프레임 조명에 따라 칠한다)
function kitCanvas(b) {
  const k = b.kit; if (k.c) return k.c; if (!kitOk(k.img)) return null;
  const c = document.createElement('canvas'); c.width = k.w; c.height = k.h; const x = c.getContext('2d'); x.drawImage(k.img, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = NEONY() ? 'rgba(26,8,56,.42)' : 'rgba(4,8,22,.46)';
  x.fillRect(0, 0, k.w, (b.y1 - b.fh + 1) * TILE - k.oy);
  // 옥상 발광체(간판·옥탑방 창·채광창)는 어둡게 칠한 뒤 다시 밝힌다. 간판에는 글자를 쓴다
  x.globalCompositeOperation = 'source-over';
  k.gl.forEach(([gx, gy, gw, gh, col, t], i) => {
    if (t === 's') {
      x.fillStyle = col; x.fillRect(gx, gy, gw, gh);
      const words = ['노래방', 'PC방', '호프', '당구장', '24시', '모텔', '사우나', '찜질방', '치킨', '소주방'], wd = words[(b.x0 * 7 + b.y0 * 13 + i) % words.length];
      x.font = `700 ${Math.round(gh * 0.72)}px Galmuri, "IBM Plex Sans KR", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 3; x.strokeStyle = 'rgba(20,6,30,.85)'; x.strokeText(wd, gx + gw / 2, gy + gh / 2 + 1); x.fillStyle = '#fff6fb'; x.fillText(wd, gx + gw / 2, gy + gh / 2 + 1);
    } else { x.fillStyle = t === 'w' ? '#ffd8a0' : 'rgba(255,214,150,.3)'; x.fillRect(gx, gy, gw, gh); }  // 채광창은 바닥에 깔린 유리라 은은하게
  });
  return (k.c = c);
}
// 옥상 발광체 둘레의 번짐(한 번만 그려 두고 매 프레임 더하기 합성)
function kitGlow(k) {
  if (k.g !== null) return k.g; if (!k.gl.length) return (k.g = false);
  const c = document.createElement('canvas'); c.width = k.w; c.height = k.h; const x = c.getContext('2d');
  k.gl.forEach(([gx, gy, gw, gh, col, t]) => {
    const cx = gx + gw / 2, cy = gy + gh / 2, r = t === 's' ? Math.max(gw, gh) * 0.75 : 26, g = x.createRadialGradient(cx, cy, 2, cx, cy, r);
    const rgb = t === 's' ? col : t === 'w' ? '#ffb060' : '#ffc070', al = t === 's' ? 0.55 : t === 'w' ? 0.4 : 0.12;
    g.addColorStop(0, rgb + Math.round(al * 255).toString(16).padStart(2, '0')); g.addColorStop(1, rgb + '00');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  });
  return (k.g = c);
}
function drawKitBuilding(b) {
  const c = kitCanvas(b); if (!c) return false;
  const k = b.kit; ctx.drawImage(c, k.ox, k.oy);
  const gw = kitGlow(k);
  if (gw && !(b.wsT > S.t - 0.2)) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 + 0.2 * Math.sin(S.t * 2.3 + b.x0); ctx.drawImage(gw, k.ox, k.oy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const y = b.y1 * TILE;
  if (!b.fl || S.t - b.flT > 0.3) { b.flT = S.t; b.fl = []; for (let tx = b.x0; tx <= b.x1; tx++) b.fl.push(lightAt(tc(tx), y + TILE + 14)); }
  for (let r = 0; r < b.fh; r++) {
    const yy = (b.y1 - r) * TILE, g = r ? GF[r] : G0;
    for (let tx = b.x0; tx <= b.x1; tx++) {
      const x = tx * TILE, l = b.fl[tx - b.x0];
      ctx.fillStyle = `rgba(4,8,22,${(r ? 0.66 : 0.6) * (1 - clamp(l, 0, 1)) + 0.05 * r})`; ctx.fillRect(x, yy, TILE, TILE);
      const win = g && g[b.y1] ? g[b.y1][tx] === 'N' : (tx > b.x0 && tx < b.x1 && (tx - b.x0) % 2 === 1);
      if (win && b.kind !== 'shop') { const h = ((tx * 92821) ^ ((b.y1 - r) * 68917) ^ (b.x0 * 31)) >>> 0; if (h % 5 === 0) { const fl = 0.85 + 0.15 * Math.sin(S.t * 3 + tx); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,80,${0.4 * fl})`; ctx.fillRect(x + 12, yy + 13, 24, 21); ctx.globalCompositeOperation = 'source-over'; } }
    }
  }
  if (b.kind === 'shop') drawShopSigns(b);
  return true;
}
// 내 둘레 가구의 막힌 칸: 어두운 방에서도 어디로 지나갈 수 있는지 보이게 (가까울수록 진하게)
function drawNearFurn(P, openB) {
  if (P.z || P.vent || P.under || P.hide) return; const fP = flOf(P), R = 230;
  for (const it of FURN) {
    if ((it.fl || 0) !== fP || FURN_FLAT.has(it.t)) continue; const bi = bldAt(it.x, it.y); if (bi >= 0 && bi !== openB) continue;
    const x = it.x * TILE, y = it.y * TILE, w = it.w * TILE, h = it.h * TILE, d = Math.hypot(clamp(P.x, x, x + w) - P.x, clamp(P.y, y, y + h) - P.y); if (d > R) continue;
    const a = 0.75 * (1 - d / R), tall = FURN_TALL.has(it.t);
    ctx.strokeStyle = tall ? `rgba(150,190,240,${a})` : `rgba(240,196,120,${a})`; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    if (tall) { ctx.fillStyle = `rgba(150,190,240,${a})`; for (const [cx, cy] of [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2]]) ctx.fillRect(cx - 3, cy - 3, 6, 6); }
  }
}
// 가까운 자경대원을 덮칠 수 없을 때 그 이유 (행동 버튼이 아무것도 안 할 때 자경대원 위에 작게 보인다)
function killBlockReason() {
  const P = S.player; if (P.hide || P.vent || P.under || P.wire || P.jump || P.trav || P.lunge || P.grabIn || P.strikeT > 0) return null;
  let best = null, bd = 78;
  for (const g of S.guards) { if (g.civ || g.dog || g.dropped || ['DEAD', 'CAPTIVE'].includes(g.state) || g.climb || flOf(g) !== flOf(P)) continue; const d = dist(P.x, P.y, g.x, g.y); if (d < bd) { bd = d; best = g; } }
  if (!best || canKill(best, P) || canKill(best, P, LUNGE)) return null;
  const g = best, behind = Math.abs(angDiff(g.a, Math.atan2(P.y - g.y, P.x - g.x))) > 1.75;
  const why = P.carrying || P.captive ? '손이 비어야 덮친다' : (g.z || 0) !== (P.z || 0) ? '높이가 다르다' : g.state === 'ALERT' && !radioBusy(g) ? '경계 중 — 몸을 숨기고 기회를 노려라' : !behind ? '정면 — 등 뒤로 돌아가라' : !los(P.x, P.y, g.x, g.y) ? '사이가 막혀 있다' : '가는 길이 막혔다';
  return { g, why };
}
function drawKillBlock() {
  const r = killBlockReason(); if (!r) return; const pa = primaryAction(); if (pa.k !== 'none') return;
  const g = r.g, k = Math.max(1, 0.9 / SCALE); ctx.font = `600 ${12 * k}px "IBM Plex Sans KR",sans-serif`; const tw = ctx.measureText('× ' + r.why).width + 12 * k, x = g.x - tw / 2, y = g.y + 30 * k;
  ctx.fillStyle = 'rgba(7,10,18,.82)'; ctx.fillRect(x, y, tw, 18 * k); ctx.fillStyle = '#ff9a86'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('× ' + r.why, g.x, y + 9.5 * k); ctx.textBaseline = 'alphabetic';
}
// 어쌔신 크리드식 머리 위 발견 표시: 아래를 향한 삼각형이 밑에서부터 찬다. 흰색 = 눈치, 노랑 = 의심, 빨강 = 발각
function drawAwareMark(g) {
  const al = g.state === 'ALERT', m = al ? 1 : clamp(g.meter, 0, 1), col = awareCol(g), k = Math.max(1, 0.9 / SCALE), x = g.x, y = g.y - 40 * k, w = 13 * k, h = 15 * k;
  const pulse = al ? 1 : m > 0.75 ? 0.75 + 0.25 * Math.sin(S.t * 14) : 1;
  ctx.save(); ctx.globalAlpha = pulse;
  ctx.beginPath(); ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x, y + h * 0.55); ctx.closePath();
  ctx.fillStyle = 'rgba(7,10,18,.78)'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = col; const top = y + h * 0.55 - (h * 1.55) * m; ctx.fillRect(x - w, top, w * 2, y + h * 0.55 - top); ctx.restore();
  ctx.lineWidth = 2 * k; ctx.strokeStyle = col; ctx.stroke();
  const glyph = al ? '!' : (g.meter >= NOTICE_AT || g.icon === '?') ? '?' : '';
  if (glyph) { ctx.font = `900 ${Math.round(13 * k)}px "IBM Plex Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = m > 0.55 ? '#140d08' : col; ctx.fillText(glyph, x, y - h * 0.32); ctx.textBaseline = 'alphabetic'; }
  ctx.restore();
}
// 내 둘레의 방향 표시: 나를 보고 있는 사람 쪽으로 호가 생기고 게이지만큼 길고 진해진다. 시야에서 놓친 자리에는 흐린 그림자(마지막으로 본 곳)
function drawAwareness(P) {
  if (P.hide || P.vent || P.under) return;
  const k = Math.max(1, 0.9 / SCALE), R = 34 * k;
  if (S.guards.some(g => !g.civ && g.meter > 0.08 && g.state !== 'ALERT')) hint('aware', '머리 위 삼각형: 흰색 눈치 · 노랑 확인하러 옴 · 빨강 발각. 시야를 벗어나면 줄어든다');
  for (const g of S.guards) {
    if (g.civ || g.dog || g.state === 'DEAD' || g.state === 'CAPTIVE' || dist(g.x, g.y, P.x, P.y) > 1100) continue;
    const al = g.state === 'ALERT', m = al ? 1 : g.meter; if (m < 0.03) continue;
    const a = Math.atan2(g.y - P.y, g.x - P.x), span = 0.22 + 0.5 * m;
    ctx.strokeStyle = awareCol(g); ctx.globalAlpha = 0.35 + 0.6 * m; ctx.lineWidth = (3 + 3 * m) * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(P.x, P.y, R, a - span / 2, a + span / 2); ctx.stroke(); ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
  }
  const seenBy = S.guards.find(g => !g.civ && g.state !== 'DEAD' && ((g.state === 'ALERT' && g.lostT > 0.4) || (g.state === 'SEARCH' && g.why !== 'heard')) && g.lastSeen);
  if (seenBy && dist(seenBy.lastSeen.x, seenBy.lastSeen.y, P.x, P.y) > 60) {
    const L = seenBy.lastSeen; ctx.save(); ctx.globalAlpha = 0.3 + 0.08 * Math.sin(S.t * 4); drawChar('ninja', L.x, L.y, 0, false, 0.5); ctx.restore();
    ctx.font = '700 12px "IBM Plex Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,210,235,.75)'; ctx.fillText('마지막으로 들킨 곳', L.x, L.y + 34);
  }
}
// ---- 프리렌더 캐릭터 (3D 모델을 8방향으로 미리 찍은 시트, Commandos 방식). 색 키 시트 한 장을 역할별 옷 색으로 바꿔 쓴다
const PR = window.__PR || null;
// 신분 옷 색 (피부 · 머리 · 윗옷 · 바지 · 신발): 옷마다 확실히 다른 색 (히트맨 GO식 — 2D에서 한눈에 구분)
const OUTFIT_PAL = { staff: ['#e6b690', '#2a2a2a', '#3f9a5e', '#2f3440', '#1c1c1c'], courier: ['#d9a47e', '#1e1e1e', '#d2862a', '#3a3a3a', '#222222'], waiter: ['#efc49e', '#151515', '#f2f0ea', '#141414', '#0e0e0e'], cater: ['#e8b892', '#1e1e1e', '#c8463c', '#18181c', '#101010'] };
const PR_PAL = {
  ninja: ['#e6b38a', '#141414', '#17191f', '#1f2537', '#0c0c0e'], sam: ['#ddaa80', '#3a2a1c', '#56603c', '#3e3a2c', '#2a241c'], samB: ['#c79470', '#1d1d1d', '#2a3654', '#1d1f26', '#141416'],
  samR: ['#e4b28a', '#0f0f0f', '#121317', '#121317', '#0c0c0c'], hunter: ['#d4a078', '#2b1d12', '#3d4a2e', '#5a4630', '#3a2a1a'], noble: ['#efc49e', '#2b2b2b', '#e6e2d8', '#3a3a44', '#1a1a1a'],
  old: ['#e6bd9a', '#c4c4c4', '#6a2a2a', '#2e2e36', '#3a2e24'], doc: ['#edc6a2', '#4a3a2a', '#f0f0ea', '#8a7f6a', '#4a3a2a'], civ0: ['#efbf98', '#6a4020', '#b84a3a', '#3a4a6a', '#d8d8d4'],
  civ1: ['#c48961', '#1a1a1a', '#d6ae48', '#5a5040', '#3a2a1a'], civ2: ['#e6b68e', '#2a2a2a', '#3a8a8a', '#6a6a72', '#c8c8c0'], civ3: ['#f2caa6', '#7a2a2a', '#d27a9e', '#20222a', '#202020'],
  civ4: ['#e8b890', '#3a2a20', '#2f5a8a', '#2a2a2e', '#e0e0dc'], civ5: ['#d9a47e', '#121212', '#ececec', '#3c4c6c', '#2a2a2a'], civ6: ['#f0c8a4', '#8a5a2a', '#7a3a8a', '#2a2a30', '#1a1a1a'],
  civ7: ['#c99068', '#1a1a1a', '#2a2a2a', '#2a2a2a', '#d0d0c8'], strip: ['#ddaa80', '#2a2a2a', '#d8d4c8', '#4a4a52', '#2a2a2a'], civ8: ['#eabd96', '#5a3a1a', '#c8b48a', '#5a4a3a', '#3a2a1a'], civ9: ['#e2b088', '#202020', '#4a7a4a', '#c8c0b0', '#2a2a2a'],
  ...OUTFIT_PAL,
};
const prImg = PR ? new Image() : null, prVar = {};
let prBase = null;  // {w,h,src:Uint8ClampedArray, cls:Uint8Array, wgt:Float32Array, shd:Float32Array}
if (PR) { prImg.onload = () => { try { prBase = prPrep(prImg); } catch (e) { console.warn('PR', e); } }; prImg.src = PR.src; }
// 주민 체형 변형 시트 (치마·긴 머리·코트·가방·헬멧·덩치·노인): 'civ3@fLong' = 팔레트 civ3 + 체형 fLong
const prBodies = {};
if (PR && PR.bodies) for (const [bn, bm] of Object.entries(PR.bodies)) { const im = new Image(); im.onload = () => { try { prBodies[bn] = prPrep(im); } catch (e) { console.warn('PR body', bn, e); } }; im.src = bm.src; }
function prPrep(img) {
  const w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, w, h).data;
  const n = w * h, cls = new Uint8Array(n), wgt = new Float32Array(n), shd = new Float32Array(n);
  const K = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1]];  // 피부·머리·윗옷·바지·신발
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; if (!d[i * 4 + 3]) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn; if (ch < 20 || !mx) continue;
    const nr = r / mx, ng = g / mx, nb = b / mx; let best = 0, bd = 9;
    for (let k = 0; k < 5; k++) { const q = (nr - K[k][0]) ** 2 + (ng - K[k][1]) ** 2 + (nb - K[k][2]) ** 2; if (q < bd) { bd = q; best = k; } }
    cls[i] = best; wgt[i] = Math.min(1, (ch - 20) / 60); shd[i] = Math.min(1.35, mx / 255 * 1.25);
  }
  return { w, h, src: d, cls, wgt, shd };
}
const prSplit = key => { const i = key.indexOf('@'); return i < 0 ? [key, null] : [key.slice(0, i), key.slice(i + 1)]; };
function prSheet(key) {
  if (prVar[key]) return prVar[key]; const [pk, bn] = prSplit(key), base = bn ? prBodies[bn] : prBase;
  if (!base) return null; const pal = PR_PAL[pk]; if (!pal) return null;
  const { w, h, src, cls, wgt, shd } = base, P4 = pal.map(h => hexRgb(h).split(',').map(Number));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const id = x.createImageData(w, h), o = id.data; o.set(src);
  for (let i = 0, n = w * h; i < n; i++) {
    const wt = wgt[i]; if (!wt) continue; const p = P4[cls[i]], s = shd[i], j = i * 4;
    o[j] = p[0] * s * wt + src[j] * (1 - wt); o[j + 1] = p[1] * s * wt + src[j + 1] * (1 - wt); o[j + 2] = p[2] * s * wt + src[j + 2] * (1 - wt);
  }
  x.putImageData(id, 0, 0);
  // 숨었을 때 쓰는 밝은 외곽선 실루엣 (주인공만)
  if (key === 'ninja') {
    const s = document.createElement('canvas'); s.width = w; s.height = h; const sx = s.getContext('2d');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sx.drawImage(c, dx, dy);
    sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#a8e8ff'; sx.fillRect(0, 0, w, h);
    sx.globalCompositeOperation = 'destination-out'; sx.drawImage(c, 0, 0); prVar.ninja_ol = s;
  }
  return (prVar[key] = c);
}
// 시트 미리 칠하기: 옷 색 칠하기(prSheet)는 한 장에 수십 ms라 판 시작 직후 첫 프레임들이 끊겼다.
// 시작 화면·브리핑·대사 동안 쉬는 틈(requestIdleCallback)에 한 장씩 미리 칠해 둔다
const prWarmQ = [];
function prWarm(keys, first) {
  for (const k of first ? [...keys].reverse() : keys) if (k && !prVar[k]) { const i = prWarmQ.indexOf(k); if (i >= 0) prWarmQ.splice(i, 1); if (first) prWarmQ.unshift(k); else prWarmQ.push(k); }
  if (prWarm.on || !prWarmQ.length) return; prWarm.on = true;
  const ric = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 30));
  const step = () => { const k = prWarmQ.shift(); if (k && !prVar[k]) { const [pk, bn] = prSplit(k); if (!PR || !PR_PAL[pk] || (bn && !(PR.bodies && PR.bodies[bn]))) {} else if (bn ? prBodies[bn] : prBase) prSheet(k); else prWarmQ.push(k); }  // 아직 그림이 안 읽혔으면 뒤로
    if (prWarmQ.length) ric(step, { timeout: 400 }); else prWarm.on = false; };
  ric(step, { timeout: 400 });
}
const prDir = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
// anim: idle walk run sneak crouch death punch / t: 경과 시간(초)
function drawPR(key, x, y, a, anim, t, alpha = 1, scale = 1, lift = 0, frame = -1) {
  const bn = prSplit(key)[1], bm = bn && PR.bodies && PR.bodies[bn];
  if (bm && !bm.anims[anim]) key = prSplit(key)[0];  // 체형 시트에 없는 동작은 기본 체형으로
  const sh = prSheet(key); if (!sh) return false;
  const [c0, nf] = (bm && bm.anims[anim]) || PR.anims[anim] || PR.anims.idle, fps = anim === 'run' ? 12.7 : anim === 'sneak' ? 7 : anim === 'walk' ? 9 : anim === 'punch' ? 12 : anim === 'carry' || anim === 'carried' ? 7 : anim === 'grab' || anim === 'held' ? 6 * DRAG_SPD / 0.55 : anim === 'climb' ? 7 : anim === 'hold' ? 9 : anim === 'talk' ? 2.6 : anim === 'idleC' ? 0.7 : 1.6;
  const fi = frame >= 0 ? Math.min(nf - 1, frame) : Math.floor(t * fps) % nf;
  const fr = PR.fr, dw = fr * scale, gy = PR.groundY * scale;
  ctx.globalAlpha = alpha; ctx.drawImage(sh, (c0 + fi) * fr, prDir(a) * fr, fr, fr, x - dw / 2, y + 13 - gy - lift, dw, dw); ctx.globalAlpha = 1;
  return true;
}
const usePR = key => { if (!PR || !prBase) return false; const [pk, bn] = prSplit(key); return bn ? !!(PR_PAL[pk] && prBodies[bn]) : !!(PR_PAL[key] || (key === 'ninja_ol' && prVar.ninja_ol)); };
const PAIR = () => !!(PR && PR.anims.carry && PR.anims.held);
const carryKey = c => c && !c.dog && (c.stripped ? 'strip' : c.ch);
const pairCarry = P => P.carrying && PAIR() && usePR(carryKey(P.carrying)) && usePR('ninja');
// 처치 진행(0~1) → 핵심 자세 시간(0~3). 다가섬(0→1) → 버둥거림(1 근처를 오가며 힘이 빠짐) → 무릎 꺾임(1→2) → 주저앉음(2→3)
// from = 1: 이미 목을 감은 상태(붙잡은 사람)에서 시작
const easeIO = u => u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
function killKT(kind, f, from) {
  const A = from ? [0, 0.4, 0.72] : kind === 'choke' ? [0.13, 0.52, 0.8] : [0.15, 0.4, 0.72], n = kind === 'choke' ? 3 : 2;
  if (f < A[0]) return easeIO(f / A[0]);
  if (f < A[1]) { const u = (f - A[0]) / (A[1] - A[0]); return 1 + 0.34 * Math.abs(Math.sin(u * Math.PI * n)) * (1 - u * 0.4); }
  if (f < A[2]) return 1 + easeIO((f - A[1]) / (A[2] - A[1]));
  return 2 + easeIO(Math.min(1, (f - A[2]) / (1 - A[2])));
}
const ktFrame = (anim, kt) => { const nf = (PR.anims[anim] || [0, 4])[1]; return Math.max(0, Math.min(nf - 1, Math.round(kt / 3 * (nf - 1)))); };
const pairGrab = P => P.captive && PAIR() && usePR(charOf(P.captive)) && usePR('ninja');
function drawBody(c, lift = 0) {
  if (c.hideT > S.t) return;  // 목 조르는 동안은 주인공과 함께 그린다
  const fr = c.t0 != null && S.t - c.t0 < 1 ? (c.f0 || 0) + Math.floor((S.t - c.t0) * 10) : 9;  // 쓰러지는 동작
  if (c.stripped && usePR('strip')) { drawPR('strip', c.x, c.y - 6, c.a || 0, 'death', 0, ctx.globalAlpha, 1, lift, 9); return; }
  if (usePR(c.ch)) { drawPR(c.ch, c.x, c.y - 6, c.a || 0, 'death', 0, ctx.globalAlpha, 1, lift, fr); return; }
  blit(ctx, 'dead_' + c.ch, c.x - 24, c.y - 26 - lift, 48, 48);
}
// 들고 있는 상자 (택배): 두 팔을 모은 자세 위에 상자를 그린다. 북쪽(화면 위)을 보면 몸 뒤에 가려진다
const holdingNow = g => g.carryTo != null && g.ri === g.carryTo && ['PATROL', 'RETURN'].includes(g.state);
function drawHeldBox(x, y, a, s, front) {
  if (!front || Math.sin(a) < -0.35) return;  // 등을 보이면 상자는 몸에 가려 보이지 않는다
  // 상자는 두 손 가운데에 (렌더할 때 방향마다 잰 손 위치 PR.holdHand, 64px 프레임 좌표)
  const hh = PR && PR.holdHand && PR.holdHand[prDir(a)], dw = (PR ? PR.fr : 64) * s, gy = (PR ? PR.groundY : 46.8) * s;
  const bx = hh ? x - dw / 2 + hh[0] * s : x + Math.cos(a) * 11 * s, by = hh ? y + 13 - gy + hh[1] * s - 3 * s : y - 4 * s, w = 15 * s, h = 11 * s;
  ctx.save(); ctx.translate(bx, by); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w / 2 + 1, -h / 2 + 2, w, h);
  ctx.fillStyle = '#b98a50'; ctx.strokeStyle = 'rgba(30,20,10,.9)'; ctx.lineWidth = 1.2; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#e8d9b8'; ctx.fillRect(-1.2 * s, -h / 2, 2.4 * s, h); ctx.restore();
}
function guardAnim(g) {
  if (g.swingT > 0) return 'punch';
  if (holdingNow(g)) return g.moving ? 'hold' : 'holdI';
  if (!(g.moving || g.state === 'CAPTIVE')) {
    if (g.state === 'PANIC' && g.cowered) return 'crouch';
    // 평소에는 편하게 선다 (팔 내리고 곧게), 말하는 중이면 손짓 — 싸움 자세(idle)는 경계·수색·추격 중인 자경대원만
    const calm = g.civ || ['PATROL', 'RETURN', 'WARN', 'FUSE'].includes(g.state);
    if (calm && PR && PR.anims.idleC) return g.chat || g.say ? 'talk' : 'idleC';
    return 'idle';
  }
  return g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'PANIC' ? 'run' : 'walk';
}
function drawChar(key, x, y, a, moving, alpha = 1, scale = 3, attack = false, lift = 0) {
  if (key === 'dog') return drawDog(x, y, a, moving, alpha);
  if (usePR(key)) { drawPR(key, x, y, a, attack ? 'punch' : moving ? 'walk' : 'idle', S.t + (x + y) * 0.013, alpha, scale / 3, lift); return; }
  const d = dirOf(a), row = attack ? 4 : moving ? (Math.floor(S.t * 8 + (x + y) * 0.013) % 4) : 0;
  ctx.globalAlpha = alpha; blit(ctx, 'ch_' + key, x - 8 * scale, y - 11 * scale - lift, 16 * scale, 16 * scale, d * 16, row * 16, 16, 16); ctx.globalAlpha = 1;
}
// 마지막 목격 지점(Mark of the Ninja): 자경대원이 의심하거나 쫓는 자리에 내 잔상을 남겨, 놈들이 어디를 보는지 알려 준다
function drawMarked() {
  const g = S.marked; if (!g) return; if (g.state === 'DEAD') { S.marked = null; return; }
  if (flOf(g) !== flOf(S.player)) return;
  const pts = g.routeLine ? g.routeLine.concat([g.routeLine[0]]) : null;
  if (pts) { ctx.strokeStyle = 'rgba(255,214,90,.85)'; ctx.lineWidth = 3.5; ctx.setLineDash([10, 6]); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]); for (const p of g.routeLine) if (p.stop) { ctx.fillStyle = 'rgba(255,214,90,.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill(); } }
  // 시야: 지금 보는 방향의 원뿔 테두리를 진하게
  const rg = guardRanges(g), fov = guardFov(g);  // 실제로 보이는 범위(밝기 반영)의 테두리
  ctx.strokeStyle = 'rgba(255,214,90,.9)'; ctx.lineWidth = 2.5; conePaths(g, guardCone(g, fov, rg), 1, 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,214,90,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 26, 0, TAU); ctx.stroke();
}
function drawGhosts() {
  drawMarked();
  const P = S.player, pts = [];
  for (const g of S.guards) {
    if (g.civ || g.dog || g.state === 'DEAD' || flOf(g) !== flOf(P)) continue;
    const q = g.state === 'ALERT' ? g.lastSeen : ['SUSPICIOUS', 'SEARCH', 'NOTICE'].includes(g.state) && g.why ? g.poi : null;
    if (!q || pts.some(o => dist(o.x, o.y, q.x, q.y) < 40)) continue;
    pts.push({ x: q.x, y: q.y, hot: g.state === 'ALERT' || g.state === 'NOTICE' });
  }
  for (const q of pts) {
    if (dist(q.x, q.y, P.x, P.y) < 30) continue;
    const pulse = 0.5 + 0.2 * Math.sin(S.t * 4);
    if (usePR('ninja') && prVar.ninja_ol) { drawPR('ninja_ol', q.x, q.y, Math.PI / 2, 'idle', 0, pulse, 1, 0, 0); drawPR('ninja', q.x, q.y, Math.PI / 2, 'idle', 0, 0.18, 1, 0, 0); }
    else { ctx.strokeStyle = `rgba(168,232,255,${pulse})`; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(q.x, q.y, 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = q.hot ? 'rgba(232,90,70,.9)' : 'rgba(242,196,107,.9)'; ctx.font = '700 14px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(q.hot ? '!' : '?', q.x, q.y - 40);
  }
}
function drawGuard(g) {
  if (g.state === 'CAPTIVE' && S.player.captive === g && pairGrab(S.player)) return;
  if (g.state === 'CAPTIVE' && S.player.grabIn && S.player.grabIn.g === g && PAIR() && PR.anims.choke && usePR(charOf(g))) return;  // 목을 감는 중: 플레이어와 함께 그린다
  if (g.civ && g.state === 'SLEEP') { drawBody({ ch: charOf(g), x: g.x, y: g.y, a: g.a }); drawEmote('zz', g.x + 16, g.y - 6); return; }
  const k = charOf(g);
  if (g.climb && usePR(k) && PR.anims.climb) {  // 배관·벽을 타는 중
    const c = g.climb;
    if (c.kind === 'stair') { drawPR(k, g.x, g.y, g.a, 'walk', S.t + g.id * 0.37, 0.4 + 0.6 * Math.abs(1 - 2 * Math.min(1, c.t / c.dur))); return; }
    drawPR(k, g.x, g.y, -Math.PI / 2, 'climb', 0, 1, 1, 14, ((Math.floor(c.t * 7) * (c.up ? 1 : -1)) % 4 + 4) % 4); return;
  }
  if (g.z) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(g.x + 4 + g.z * 2, g.y + 6 + g.z * 3, 15, 11, 0, 0, TAU); ctx.fill(); }
  if (usePR(k)) { const hb = holdingNow(g); if (hb) drawHeldBox(g.x, g.y, g.a, 1, false); drawPR(k, g.x, g.y, g.a, guardAnim(g), S.t + g.id * 0.37, 1, 1 + (g.z || 0) * 0.05); if (hb) drawHeldBox(g.x, g.y, g.a, 1, true); return; }
  drawChar(k, g.x, g.y, g.a, g.moving || g.state === 'CAPTIVE', 1, 3, g.swingT > 0);
}
function drawDog(x, y, a, moving, alpha = 1, dead = false) {
  const fr = moving ? Math.floor(S.t * 9) % 2 : 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  if (dead) ctx.rotate(Math.PI / 2);
  if (Math.cos(a) < 0) ctx.scale(-1, 1);
  blit(ctx, 'dog', -24, -32, 48, 48, fr * 16, 0, 16, 16); ctx.restore();
}
const EMOTE = { 'zz': 'em_zz', '?': 'em_q', '!': 'em_ex', '!?': 'em_exq', '...': 'em_dots', '흥': 'em_meh', '잡담…': 'em_chat', '후—': 'em_dots', '하암': 'em_zz', '담배?': 'em_q', '멍!': 'em_ex' };
function drawEmote(txt, x, y) { const n = EMOTE[txt] || 'em_q'; blit(ctx, n, x - 21, y - 40, 42, 39); }
const roofPats = {};
function roofPattern(name) {
  if (roofPats[name]) return roofPats[name];
  const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  blit(x, name, 0, 0, 48, 48);
  return (roofPats[name] = ctx.createPattern(c, 'repeat'));
}
// 건물 옥상을 한 장으로 미리 그린다. 조선 테마의 기와는 남쪽·북쪽 비탈 + 용마루 + 막새 끝선 + 들린 처마 끝
function buildRoofCanvas(b, i) {
  const w = (b.x1 - b.x0 + 1) * TILE, h = (b.y1 - b.y0 + 1 - (b.fh || 0)) * TILE, hang = 22;
  const c = document.createElement('canvas'); c.width = w; c.height = h + hang;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const key = roofOf(i);
  if (F[key] && key.startsWith('cRoof')) {
    // 평옥상 옥상: 난간 9칸 조각 + 물탱크·실외기·빨랫줄·계단실(옥탑)
    const f = F[key], pc = (sx, sy, dx, dy) => x.drawImage(atlas, f[0] + sx, f[1] + sy, 16, 16, dx, dy, 48, 48);
    for (let yy = 48; yy < h - 48; yy += 48) for (let xx = 48; xx < w - 48; xx += 48) pc(16, 16, xx, yy);
    for (let xx = 48; xx < w - 48; xx += 48) { pc(16, 0, xx, 0); pc(16, 32, xx, h - 48); }
    for (let yy = 48; yy < h - 48; yy += 48) { pc(0, 16, 0, yy); pc(32, 16, w - 48, yy); }
    pc(0, 0, 0, 0); pc(32, 0, w - 48, 0); pc(0, 32, 0, h - 48); pc(32, 32, w - 48, h - 48);
    const hs = (((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0);
    // 계단실(옥탑): 건물 안 계단 'Y' 칸 위
    let stair = null;
    for (let ty = b.y0; ty <= b.y1 && !stair; ty++) for (let tx = b.x0; tx <= b.x1; tx++) if (G[ty][tx] === 'Y') { stair = [(tx - b.x0) * TILE, (ty - b.y0) * TILE]; break; }
    // 물탱크 (파란 원통, 위에서 본 모습)
    if (b.h >= 2) {
      const tx = w - 44, ty = 38;
      if (!stair || Math.abs(stair[0] - tx) > 60 || Math.abs(stair[1] - ty) > 60) {
        x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(tx + 5, ty + 6, 19, 19, 0, 0, TAU); x.fill();
        x.fillStyle = hs % 3 === 0 ? '#c9a646' : '#3e78b8'; x.beginPath(); x.arc(tx, ty, 18, 0, TAU); x.fill();
        x.strokeStyle = hs % 3 === 0 ? '#e8cc72' : '#6aa2dc'; x.lineWidth = 3; x.beginPath(); x.arc(tx, ty, 13, 0, TAU); x.stroke();
        x.fillStyle = '#2a3440'; x.beginPath(); x.arc(tx, ty, 6, 0, TAU); x.fill();
      }
    }
    // 실외기 두 대
    for (let k = 0; k < 2; k++) {
      const ax = 34 + k * 34, ay = h - 50;
      if (stair && Math.abs(stair[0] + 24 - ax) < 50 && Math.abs(stair[1] + 24 - ay) < 50) continue;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ax + 3, ay + 4, 28, 20);
      x.fillStyle = '#c9ccd2'; x.fillRect(ax, ay, 28, 20); x.strokeStyle = '#7d828c'; x.lineWidth = 2; x.strokeRect(ax + 1, ay + 1, 26, 18);
      x.fillStyle = '#4a4f58'; x.beginPath(); x.arc(ax + 10, ay + 10, 7, 0, TAU); x.fill(); x.strokeStyle = '#9aa0aa'; x.lineWidth = 1; x.beginPath(); x.moveTo(ax + 4, ay + 10); x.lineTo(ax + 16, ay + 10); x.moveTo(ax + 10, ay + 4); x.lineTo(ax + 10, ay + 16); x.stroke();
    }
    // 장독대 · 스티로폼 상자 텃밭 (옥상마다 하나)
    const kind = (hs >> 3) % 5, ox = 30, oy = 28;
    if (kind === 0 && !(stair && stair[0] < 140 && stair[1] < 100)) {
      for (let k = 0; k < 5; k++) { const jx = ox + 10 + (k % 3) * 22 + (k > 2 ? 11 : 0), jy = oy + 10 + (k > 2 ? 20 : 0), r = k % 2 ? 8 : 10;
        x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(jx + 3, jy + 4, r, 0, TAU); x.fill();
        x.fillStyle = '#6b3a22'; x.beginPath(); x.arc(jx, jy, r, 0, TAU); x.fill(); x.fillStyle = '#8a4e2e'; x.beginPath(); x.arc(jx - 2, jy - 2, r * 0.55, 0, TAU); x.fill(); x.fillStyle = '#3a2016'; x.beginPath(); x.arc(jx, jy, r * 0.3, 0, TAU); x.fill(); }
    } else if (kind === 1 && !(stair && stair[0] < 140 && stair[1] < 100)) {
      for (let k = 0; k < 3; k++) { const bx2 = ox + 4 + k * 30, by2 = oy + 2;
        x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(bx2 + 3, by2 + 4, 26, 18); x.fillStyle = '#e6e8ea'; x.fillRect(bx2, by2, 26, 18); x.fillStyle = '#5d4a36'; x.fillRect(bx2 + 3, by2 + 3, 20, 12);
        x.fillStyle = '#5fa04e'; for (let q = 0; q < 4; q++) { x.beginPath(); x.arc(bx2 + 7 + (q % 2) * 10, by2 + 7 + (q > 1 ? 5 : 0), 3.5, 0, TAU); x.fill(); } }
    }
    else if (kind === 3 && !(stair && stair[0] < 160 && stair[1] < 110)) {  // 평상 + 돗자리
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ox + 6, oy + 6, 96, 60); x.fillStyle = '#8a6a44'; x.fillRect(ox, oy, 96, 60); x.fillStyle = '#6e5234'; for (let q = 0; q < 96; q += 12) x.fillRect(ox + q, oy, 2, 60);
      x.fillStyle = '#b8443a'; x.fillRect(ox + 14, oy + 10, 50, 36); x.fillStyle = '#d8c070'; for (let q = 0; q < 50; q += 10) x.fillRect(ox + 14 + q, oy + 10, 3, 36);
    } else if (kind === 4 && w >= 200 && !(stair && stair[1] < 110)) {  // 태양광 판
      for (let k = 0; k < 3; k++) { const px2 = ox + k * 42, py2 = oy; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px2 + 4, py2 + 5, 36, 50); x.fillStyle = '#1f2f4a'; x.fillRect(px2, py2, 36, 50); x.strokeStyle = '#6a86b0'; x.lineWidth = 1; for (let q = 1; q < 3; q++) { x.beginPath(); x.moveTo(px2 + q * 12, py2); x.lineTo(px2 + q * 12, py2 + 50); x.stroke(); } for (let q = 1; q < 4; q++) { x.beginPath(); x.moveTo(px2, py2 + q * 12.5); x.lineTo(px2 + 36, py2 + q * 12.5); x.stroke(); } }
    }
    if (b.church) {  // 옥상 붉은 네온 십자가
      const cx2 = w / 2, cy2 = Math.min(h / 2, 90);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(cx2 - 4, cy2 - 26, 14, 64); x.fillRect(cx2 - 18, cy2 - 8, 42, 14);
      x.fillStyle = 'rgba(255,60,60,.25)'; x.beginPath(); x.arc(cx2, cy2, 44, 0, TAU); x.fill();
      x.fillStyle = '#ff4a4a'; x.fillRect(cx2 - 5, cy2 - 30, 10, 62); x.fillRect(cx2 - 20, cy2 - 12, 40, 10);
      x.fillStyle = '#ffd0d0'; x.fillRect(cx2 - 2, cy2 - 28, 4, 58); x.fillRect(cx2 - 18, cy2 - 9, 36, 4);
    }
    // 빨랫줄
    if (w >= 240 && h >= 144 && hs % 2) {
      const lx0 = 60, lx1 = Math.min(w - 90, 200), ly = h / 2 - 6;
      x.fillStyle = '#6d727c'; x.fillRect(lx0 - 2, ly - 4, 4, 8); x.fillRect(lx1 - 2, ly - 4, 4, 8);
      x.strokeStyle = 'rgba(210,214,220,.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(lx0, ly); x.quadraticCurveTo((lx0 + lx1) / 2, ly + 8, lx1, ly); x.stroke();
      const cols = ['#d8d4c8', '#b84a4a', '#5a7ab0', '#e2c25a'];
      for (let c = 0; c < 4; c++) { const cx = lx0 + 18 + c * ((lx1 - lx0 - 36) / 3); x.fillStyle = cols[(c + hs) % 4]; x.fillRect(cx - 7, ly + 2, 14, 12); }
    }
    if (stair) {
      const [sx, sy] = stair;
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(sx + 6, sy - 12, 46, 50);
      x.fillStyle = '#b9b3a6'; x.fillRect(sx + 1, sy - 18, 46, 46); x.fillStyle = '#8e887c'; x.fillRect(sx + 1, sy - 18, 46, 8);
      x.fillStyle = '#4f6b8a'; x.fillRect(sx + 15, sy + 8, 18, 20); x.fillStyle = '#e2c25a'; x.fillRect(sx + 28, sy + 17, 2, 3);
      x.strokeStyle = '#5d584f'; x.lineWidth = 2; x.strokeRect(sx + 1, sy - 18, 46, 46);
    }
    c.flat = true;
  } else {
    x.fillStyle = roofPattern(key); x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,.35)'; if (w >= h) x.fillRect(0, h / 2 - 3, w, 6); else x.fillRect(w / 2 - 3, 0, 6, h);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, h - 5, w, 5);
  }
  c.rh = h;
  return c;
}
const roofOf = i => STAGE.roofs ? STAGE.roofs[i % STAGE.roofs.length] : (STAGE.roofTex || 'roofRed');
function makeSprite(name, tint) {
  const f = F[name]; const c = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
  const x = c.getContext('2d'); x.drawImage(atlas, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
  if (tint) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = tint; x.fillRect(0, 0, f[2], f[3]); }
  return c;
}

