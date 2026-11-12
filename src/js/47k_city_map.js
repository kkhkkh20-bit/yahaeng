// ---------------------------------------------------------------- 자유 모드 큰 지도 · 목적지 · 길 안내(GPS)
// 미니맵을 누르거나 M → 화면 가득 도시 지도(장소 표시: 내 차고·연락책·중고차·병원·지구대·울리는 공중전화·지금 할 일).
// 지도를 누르면 그 자리에 목적지 깃발. 깃발까지 길(차면 도로, 걸으면 보도까지)을 0.8초마다 다시 찾아
// 미니맵에 노란 선, 길바닥에 노란 화살표로 보여 준다. 120px 안에 들어오면 도착.
let CMAP = null;
function cityMapOpen() {
  if (!STAGE.cityLife || !S || S.over || CMAP) return;
  const el = document.createElement('div'); el.id = 'cityMap'; el.setAttribute('role', 'dialog');
  el.style.cssText = 'position:fixed;inset:0;z-index:72;background:rgba(6,9,14,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;color:#efe6cf;font:600 14px "Yahaeng UI",sans-serif';
  const head = document.createElement('div'); head.style.cssText = 'display:flex;gap:14px;align-items:center;justify-content:space-between;width:min(96vw,1100px)';
  const t = document.createElement('b'); t.textContent = '지도 — 누르면 목적지'; t.style.fontSize = '18px';
  const clr = document.createElement('button'), cls = document.createElement('button');
  for (const b of [clr, cls]) { b.type = 'button'; b.style.cssText = 'padding:8px 14px;background:#1d222c;color:inherit;border:1px solid #3b4250;border-radius:4px;font:inherit;cursor:pointer'; }
  clr.textContent = '목적지 지우기'; cls.textContent = '닫기 ×';
  const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:8px'; btns.append(clr, cls); head.append(t, btns);
  const cv = document.createElement('canvas'); cv.style.cssText = 'max-width:96vw;max-height:calc(100vh - 110px);image-rendering:pixelated;border:2px solid #3b4250;border-radius:4px;cursor:crosshair;touch-action:none';
  const legend = document.createElement('div'); legend.style.cssText = 'font-size:12px;color:#b4bcb8;display:flex;gap:14px;flex-wrap:wrap;justify-content:center';
  legend.innerHTML = [['#7fd6ff', '나'], ['#e8d070', '내 차고'], ['#6aa8ff', '중고차'], ['#ff7a7a', '병원'], ['#9fc4ff', '지구대'], ['#c9a0ff', '연락책'], ['#8fe0c4', '공중전화'], ['#ffd76a', '목적지']].map(([c, n]) => `<span><i style="display:inline-block;width:9px;height:9px;background:${c};margin-right:5px;border-radius:2px"></i>${n}</span>`).join('');
  el.append(head, cv, legend); document.body.appendChild(el);
  const base = buildMiniBase(Math.min(1400, innerWidth * 1.4), Math.min(1000, (innerHeight - 110) * 1.4)); cv.width = base.width; cv.height = base.height;
  CMAP = { el, cv, base }; S.shopOpen = true; cityMapDraw();
  const close = () => { el.remove(); CMAP = null; S.shopOpen = false; document.removeEventListener('keydown', key, true); };
  const key = e => { if (e.code === 'Escape' || e.code === 'KeyM' || e.code === 'KeyX') { e.preventDefault(); e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true); cls.onclick = close; clr.onclick = () => { S.wp = null; S.wpPath = null; cityMapDraw(); };
  cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(), s = base.s, mx = (e.clientX - r.left) / r.width * cv.width, my = (e.clientY - r.top) / r.height * cv.height;
    const x = mx / s * TILE, y = my / s * TILE; S.wp = { x, y }; S.wpT = 0; S.wpPath = null; play('click', 0.4); cityMapDraw(); setTimeout(close, 280); });
}
function cityMapDraw() {
  if (!CMAP) return; const { cv, base } = CMAP, x = cv.getContext('2d'), s = base.s, T = v => v / TILE * s, P = S.player;
  x.drawImage(base, 0, 0);
  const dot = (px, py, col, r = 5, sq) => { x.fillStyle = col; x.strokeStyle = 'rgba(0,0,0,.8)'; x.lineWidth = 1.5; x.beginPath(); if (sq) x.rect(T(px) - r, T(py) - r, r * 2, r * 2); else x.arc(T(px), T(py), r, 0, TAU); x.fill(); x.stroke(); };
  const label = (px, py, txt) => { x.font = '600 12px "Yahaeng UI",sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,.7)'; x.fillText(txt, T(px) + 1, T(py) - 8); x.fillStyle = '#efe6cf'; x.fillText(txt, T(px), T(py) - 9); };
  if (S.garage) { dot(S.garage.x, S.garage.base, '#e8d070', 6, true); label(S.garage.x, S.garage.base, '내 차고'); }
  if (S.dealer) { const D = S.dealer, cx = (D.lot[0] + D.lot[2]) / 2, cy = (D.lot[1] + D.lot[3]) / 2; dot(cx, cy, '#6aa8ff', 6, true); label(cx, cy, '중고차'); }
  if (STAGE.hospital) { const hx = tc(STAGE.hospital[0]), hy = tc(STAGE.hospital[1]); dot(hx, hy, '#ff7a7a', 6, true); label(hx, hy, '병원'); }
  if (STAGE.police) { const px = tc(STAGE.police[0]), py = tc(STAGE.police[1]); dot(px, py, '#9fc4ff', 6, true); label(px, py, '지구대'); }
  for (const [f, c] of Object.entries(S.contacts || {})) { if (f === 'P') continue; dot(c.x, c.y, '#c9a0ff', 4.5); label(c.x, c.y, STAND_NAME[f]); }
  for (const p of S.phones || []) dot(p.x, p.y, S.ringPhone === p ? '#8fe0c4' : 'rgba(143,224,196,.45)', 3);
  if (S.wpPath) { x.strokeStyle = 'rgba(255,215,106,.9)'; x.lineWidth = 3; x.beginPath(); S.wpPath.forEach((p, i) => i ? x.lineTo(T(p.x), T(p.y)) : x.moveTo(T(p.x), T(p.y))); x.stroke(); }
  if (S.wp) { x.fillStyle = '#ffd76a'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(T(S.wp.x), T(S.wp.y)); x.lineTo(T(S.wp.x), T(S.wp.y) - 16); x.lineTo(T(S.wp.x) + 10, T(S.wp.y) - 12); x.lineTo(T(S.wp.x), T(S.wp.y) - 8); x.closePath(); x.fill(); x.stroke(); }
  dot(P.x, P.y, '#7fd6ff', 5);
}
// 길 찾기: 칸 격자 너비 우선 탐색 (차면 도로 칸만, 걸으면 벽·건물이 아닌 칸). 출발·도착은 가까운 지나갈 수 있는 칸으로 붙인다
function wpRoute() {
  const P = S.player, car = !!P.car, ok = (tx, ty) => inMap(tx, ty) && (car ? G0[ty][tx] === '=' : !solidAt(tx, ty) && bldAt(tx, ty) < 0);
  const snap = (x, y) => { const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE); for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (ok(tx0 + dx, ty0 + dy)) return [tx0 + dx, ty0 + dy]; } return null; };
  const a = snap(P.x, P.y), b = snap(S.wp.x, S.wp.y); if (!a || !b) return null;
  const N = MW * MH, prev = new Int32Array(N).fill(-1), q = new Int32Array(N); let h = 0, t = 0; const start = a[1] * MW + a[0], goal = b[1] * MW + b[0];
  prev[start] = start; q[t++] = start;
  while (h < t) { const c = q[h++]; if (c === goal) break; const cx = c % MW, cy = (c / MW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, n = ny * MW + nx; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || prev[n] >= 0 || !ok(nx, ny)) continue; prev[n] = c; q[t++] = n; } }
  if (prev[goal] < 0) return null;
  const pts = []; for (let c = goal; ; c = prev[c]) { pts.push({ x: tc(c % MW), y: tc((c / MW) | 0) }); if (c === start) break; }
  pts.reverse();
  // 꺾이는 곳만 남긴다
  const out = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const p = pts[i - 1], c = pts[i], n = pts[i + 1]; if ((c.x - p.x) * (n.y - c.y) !== (c.y - p.y) * (n.x - c.x)) out.push(c); } out.push(pts[pts.length - 1]);
  return out;
}
function wpUpdate(dt) {
  if (!S.wp) return; const P = S.player;
  if (dist(P.x, P.y, S.wp.x, S.wp.y) < 120) { S.wp = null; S.wpPath = null; evBanner('목적지에 도착했다', '#ffd76a'); play('bell', 0.35); return; }
  if ((S.wpT = (S.wpT || 0) - dt) <= 0) { S.wpT = 0.8; S.wpPath = wpRoute(); }
}
// 길바닥 화살표: 경로를 따라 내 앞 700px까지 64px마다 노란 꺾쇠 (어둠 위)
function drawWpRoute() {
  const path = S.wpPath, P = S.player; if (!path || path.length < 2 || flOf(P)) return;
  let left = 700, step = 64, acc = 20; ctx.save(); ctx.fillStyle = 'rgba(255,215,106,.75)'; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1;
  // 경로에서 나와 가장 가까운 마디부터
  let k = 0, bd = 1e9; for (let i = 0; i < path.length; i++) { const d = dist(path[i].x, path[i].y, P.x, P.y); if (d < bd) { bd = d; k = i; } }
  for (let i = Math.max(0, k); i < path.length - 1 && left > 0; i++) {
    const a = path[i], b = path[i + 1], L = dist(a.x, a.y, b.x, b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    for (let s = acc; s < L && left > 0; s += step) { left -= step; const x = a.x + (b.x - a.x) * s / L, y = a.y + (b.y - a.y) * s / L; if (dist(x, y, P.x, P.y) < 50) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -8); ctx.lineTo(-1, 0); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    acc = 0;
  }
  if (S.wp && inView(S.wp.x, S.wp.y, 40)) { const b = .6 + .4 * Math.sin(S.t * 5); ctx.strokeStyle = `rgba(255,215,106,${b})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(S.wp.x, S.wp.y, 40, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
function drawMiniWp(x, T) {
  if (S.wpPath) { x.strokeStyle = 'rgba(255,215,106,.85)'; x.lineWidth = 1.5; x.beginPath(); S.wpPath.forEach((p, i) => i ? x.lineTo(T(p.x), T(p.y)) : x.moveTo(T(p.x), T(p.y))); x.stroke(); }
  if (S.wp) { x.fillStyle = '#ffd76a'; x.fillRect(T(S.wp.x) - 3, T(S.wp.y) - 3, 6, 6); }
}
