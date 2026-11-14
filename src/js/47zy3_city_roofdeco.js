// ---------------------------------------------------------------- 자유 모드 옥상 살림살이 (한국 옥상)
// 위에서 내려다보는 도시는 대부분 옥상이다. 회색 판 대신, 동네마다 사는 모습이 보이게:
//  · 초록 우레탄 방수 칠 (낡아 벗겨진 자리 · 배수구 쪽 물때)
//  · 신당동 주택가: 장독대 · 고추 말리는 돗자리 · 평상 · 빨래 건조대 · 스티로폼 텃밭 · 고무 대야
//  · 동대문 시장: 파란 방수포(벽돌로 눌러 둔) · 박스 더미 · 자루
//  · 성수 공장지대: 드럼통 · 나무 팔레트 · 녹물 자국
//  · 을지로 인쇄골목: 종이 묶음 · 팔레트 · 덕트
//  · 종로 유흥가: 맥주 상자 · 플라스틱 의자 · 실외기 무더기
//  · 중구 관청가: 헬기장 H · 태양광 판 · 안테나 · 자갈
//  · 어디나: 물때 · 금 · 배수구 · 전선 · 위성 안테나
// 걷는 데 막히는 건 없다 (그림만). 그림 조각은 종류마다 한 번만 만들고, 보이는 옥상에만 찍는다.
const RD_SPR = {};
function rdSprite(key, w, h, paint) {
  if (RD_SPR[key]) return RD_SPR[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const R = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  paint(R, x); return (RD_SPR[key] = c);
}
const rdHash = (a, b, k = 0) => ((((a * 73856093) ^ (b * 19349663) ^ (k * 83492791)) >>> 0) % 1000) / 1000;
// 그림: [가로 칸, 세로 칸, 그리기]. 칸은 자리 차지(겹치지 않게), 0이면 바닥 자국(겹쳐도 된다)
const RD_ART = {
  stain: [0, 0, () => rdSprite('stain', 44, 30, R => { R(6, 6, 30, 16, 'rgba(0,0,0,.16)'); R(2, 10, 40, 8, 'rgba(0,0,0,.12)'); R(12, 2, 16, 26, 'rgba(0,0,0,.10)'); R(20, 12, 10, 6, 'rgba(0,0,0,.12)'); })],
  crack: [0, 0, () => rdSprite('crack', 46, 22, R => { const p = [[0, 10], [6, 9], [11, 12], [17, 11], [22, 7], [28, 8], [33, 12], [39, 13], [44, 16]]; for (const [x, y] of p) R(x, y, 6, 2, 'rgba(0,0,0,.42)'); R(22, 4, 2, 4, 'rgba(0,0,0,.35)'); R(33, 14, 2, 5, 'rgba(0,0,0,.3)'); })],
  puddle: [0, 0, () => rdSprite('puddle', 40, 22, R => { R(6, 4, 28, 14, 'rgba(20,34,52,.45)'); R(2, 8, 36, 6, 'rgba(20,34,52,.35)'); R(10, 6, 10, 2, 'rgba(160,190,220,.25)'); })],
  rust: [0, 0, () => rdSprite('rust', 46, 34, R => { R(6, 4, 30, 24, 'rgba(120,64,30,.22)'); R(2, 10, 40, 12, 'rgba(120,64,30,.16)'); R(14, 0, 12, 34, 'rgba(120,64,30,.12)'); })],
  drain: [0, 0, () => rdSprite('drain', 16, 16, R => { R(0, 0, 16, 16, '#2a3036'); R(2, 2, 12, 12, '#151a1f'); for (let k = 3; k < 14; k += 3) R(k, 3, 1, 10, '#4a535b'); })],
  cable: [0, 0, () => rdSprite('cable', 96, 10, R => { for (let x = 0; x < 96; x += 2) { const y = 2 + Math.round(Math.sin(x / 96 * Math.PI) * 5); R(x, y, 2, 2, '#14181c'); } R(0, 1, 3, 4, '#2a2f34'); R(93, 1, 3, 4, '#2a2f34'); })],
  pots: [1, 1, () => rdSprite('pots', 44, 30, R => { for (const [x, y] of [[2, 8], [22, 10]]) { R(x + 2, y + 4, 20, 16, 'rgba(0,0,0,.3)'); R(x, y, 20, 14, '#d4d8d2'); R(x, y, 20, 3, '#eef0ea'); R(x + 2, y + 2, 16, 4, '#5a4632'); for (let k = 0; k < 4; k++) { R(x + 2 + k * 4, y - 2 - (k % 2) * 3, 3, 6, k % 2 ? '#6fae4a' : '#4f8a3c'); } } })],
  basin: [1, 1, () => rdSprite('basin', 26, 22, R => { R(4, 6, 20, 14, 'rgba(0,0,0,.28)'); R(2, 3, 20, 14, '#b8322a'); R(0, 6, 24, 8, '#b8322a'); R(4, 5, 16, 10, '#7e1c16'); R(6, 7, 12, 6, '#3a5a74'); R(8, 7, 4, 1, '#8ab0c8'); })],
  rack: [2, 1, () => rdSprite('rack', 60, 34, R => { R(4, 26, 52, 6, 'rgba(0,0,0,.28)'); R(2, 8, 56, 2, '#9aa3a8'); R(2, 16, 56, 2, '#9aa3a8'); R(2, 6, 2, 24, '#7a8388'); R(56, 6, 2, 24, '#7a8388'); const C = ['#c8d4e0', '#d4524a', '#4a6ab0', '#e8e0c0', '#6a9a5a', '#f0f0f0']; for (let k = 0; k < 7; k++) R(5 + k * 7, 9 + (k % 2) * 8, 6, 10 + (k % 3) * 2, C[k % C.length]); })],
  dish: [1, 1, () => rdSprite('dish', 26, 26, R => { R(6, 18, 14, 6, 'rgba(0,0,0,.3)'); R(4, 4, 16, 14, '#d8dad6'); R(2, 7, 20, 8, '#d8dad6'); R(6, 6, 12, 10, '#b8bab6'); R(11, 10, 2, 10, '#6a6e72'); R(9, 18, 8, 3, '#4a4e52'); R(16, 3, 3, 3, '#3a3e42'); })],
  chairs: [1, 1, () => rdSprite('chairs', 40, 30, R => { for (const [x, y, c] of [[2, 6, '#e8e8e0'], [20, 10, '#c83a32']]) { R(x + 2, y + 14, 14, 6, 'rgba(0,0,0,.25)'); R(x, y, 14, 14, c); R(x, y, 14, 4, 'rgba(0,0,0,.18)'); R(x + 1, y + 13, 2, 5, c); R(x + 11, y + 13, 2, 5, c); } R(14, 22, 14, 6, '#4a5a3a'); })],
  crates: [1, 1, () => rdSprite('crates', 40, 34, R => { for (const [x, y, c] of [[2, 12, '#2e7a3a'], [20, 14, '#c89a28'], [10, 2, '#2e7a3a']]) { R(x + 2, y + 2, 18, 18, 'rgba(0,0,0,.3)'); R(x, y, 18, 16, c); for (let k = 3; k < 16; k += 5) R(x + k, y + 2, 2, 12, 'rgba(0,0,0,.35)'); R(x, y, 18, 2, 'rgba(255,255,255,.18)'); } })],
  onggi: [2, 1, () => rdSprite('onggi', 74, 40, R => { R(0, 30, 74, 8, '#6a6258'); R(0, 28, 74, 3, '#8a8276'); const J = [[4, 10, 18], [24, 6, 22], [48, 12, 16], [62, 18, 10], [16, 22, 10]]; for (const [x, y, s] of J) { R(x + 2, y + 4, s, s, 'rgba(0,0,0,.3)'); R(x, y + 2, s, s - 2, '#5e3418'); R(x + 2, y, s - 4, s, '#5e3418'); R(x + 2, y + 2, s - 4, 3, '#2e1a0e'); R(x + 3, y + 5, 3, s - 8, '#8a5430'); } })],
  chili: [2, 1, () => rdSprite('chili', 70, 40, R => { R(3, 5, 66, 34, 'rgba(0,0,0,.25)'); R(0, 2, 66, 34, '#c4b088'); for (let x = 0; x < 66; x += 6) R(x, 2, 1, 34, '#a8946c'); for (let k = 0; k < 90; k++) { const x = 3 + Math.floor(rdHash(k, 1, 21) * 58), y = 5 + Math.floor(rdHash(k, 2, 23) * 27); R(x, y, k % 3 ? 5 : 2, k % 3 ? 2 : 5, k % 5 ? '#b8241c' : '#8a1a14'); } })],
  bench: [2, 1, () => rdSprite('bench', 84, 46, R => { R(4, 8, 80, 38, 'rgba(0,0,0,.3)'); R(0, 4, 78, 34, '#8a6a44'); for (let y = 4; y < 38; y += 6) R(0, y, 78, 1, '#6a4e30'); R(0, 4, 78, 2, '#a88660'); R(30, 14, 18, 12, '#3a6a9a'); R(32, 16, 6, 6, '#e8e0c8'); R(40, 17, 5, 5, '#c84a3a'); })],
  tarp: [2, 2, () => rdSprite('tarp', 86, 80, R => { R(4, 6, 82, 74, 'rgba(0,0,0,.3)'); R(0, 2, 82, 72, '#2f5fa8'); for (let k = 0; k < 5; k++) R(4 + k * 16, 2, 6, 72, '#3a6cb8'); R(0, 34, 82, 3, '#25508e'); for (const [x, y] of [[2, 0], [74, 0], [2, 66], [74, 66], [38, 32]]) { R(x, y, 10, 8, '#8a4a34'); R(x, y, 10, 2, '#a86248'); } R(0, 20, 82, 1, '#d8d0b8'); R(0, 54, 82, 1, '#d8d0b8'); })],
  boxes: [1, 1, () => rdSprite('boxes', 42, 38, R => { for (const [x, y, w, h] of [[2, 16, 22, 18], [20, 12, 20, 22], [8, 2, 20, 16]]) { R(x + 2, y + 2, w, h, 'rgba(0,0,0,.3)'); R(x, y, w, h, '#a07a4a'); R(x, y, w, 3, '#c09a68'); R(x + w / 2 - 1, y, 3, h, '#c8b07a'); } })],
  drums: [1, 1, () => rdSprite('drums', 46, 34, R => { for (const [x, y, c] of [[2, 10, '#2a4f8a'], [22, 12, '#7a4a2a'], [12, 0, '#2a4f8a']]) { R(x + 2, y + 4, 18, 18, 'rgba(0,0,0,.3)'); R(x, y + 2, 18, 16, c); R(x + 2, y, 14, 20, c); R(x + 3, y + 3, 12, 12, 'rgba(0,0,0,.25)'); R(x + 7, y + 7, 4, 4, 'rgba(255,255,255,.25)'); } })],
  pallet: [1, 1, () => rdSprite('pallet', 46, 36, R => { R(4, 4, 42, 32, 'rgba(0,0,0,.28)'); for (let y = 0; y < 32; y += 7) R(0, y, 42, 5, '#a8865a'); R(0, 0, 4, 32, '#7a5e3a'); R(19, 0, 4, 32, '#7a5e3a'); R(38, 0, 4, 32, '#7a5e3a'); })],
  paper: [1, 1, () => rdSprite('paper', 44, 34, R => { for (const [x, y] of [[2, 12], [22, 14], [10, 2]]) { R(x + 2, y + 2, 20, 16, 'rgba(0,0,0,.3)'); R(x, y, 20, 16, '#e8e4d8'); for (let k = 2; k < 16; k += 3) R(x, y + k, 20, 1, '#c8c4b8'); R(x + 9, y, 2, 16, '#9a7a4a'); } })],
  duct: [2, 1, () => rdSprite('duct', 92, 26, R => { R(2, 8, 90, 16, 'rgba(0,0,0,.3)'); R(0, 4, 88, 14, '#8a949a'); for (let x = 0; x < 88; x += 12) R(x, 4, 2, 14, '#6a7278'); R(0, 4, 88, 2, '#b0b8bc'); R(76, 0, 12, 22, '#7a8288'); })],
  acs: [2, 1, () => rdSprite('acs', 90, 40, R => { for (const [x, y] of [[2, 8], [32, 4], [62, 10]]) { R(x + 3, y + 4, 26, 24, 'rgba(0,0,0,.32)'); R(x, y, 26, 22, '#c4c8c4'); R(x, y, 26, 3, '#e0e4e0'); R(x + 3, y + 5, 14, 14, '#7a807c'); for (let k = 0; k < 4; k++) R(x + 4, y + 6 + k * 3, 12, 1, '#4a504c'); R(x + 20, y + 6, 3, 12, '#9aa09c'); } R(10, 32, 70, 2, '#2a2e30'); })],
  solar: [3, 2, () => rdSprite('solar', 140, 92, R => { R(6, 8, 134, 84, 'rgba(0,0,0,.3)'); for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const x = 2 + i * 34, y = 2 + j * 44; R(x, y, 32, 40, '#9aa2a8'); R(x + 2, y + 2, 28, 36, '#1e3a5a'); for (let k = 0; k < 3; k++) R(x + 2, y + 11 + k * 10, 28, 1, '#38608a'); R(x + 15, y + 2, 1, 36, '#38608a'); R(x + 3, y + 3, 8, 2, 'rgba(180,210,240,.35)'); } })],
  antenna: [1, 1, () => rdSprite('antenna', 30, 48, R => { R(10, 40, 14, 6, 'rgba(0,0,0,.3)'); R(14, 2, 2, 40, '#8a9094'); for (const [y, w] of [[6, 22], [14, 18], [22, 14]]) R(15 - w / 2, y, w, 2, '#9aa0a4'); R(10, 40, 10, 4, '#4a4e52'); R(14, 0, 3, 3, '#d84a3a'); })],
  heli: [3, 3, () => rdSprite('heli', 140, 140, R => { const C = 'rgba(232,196,64,.75)'; for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; R(70 + Math.cos(t) * 62 - 3, 70 + Math.sin(t) * 62 - 3, 6, 6, C); } R(46, 36, 10, 68, C); R(84, 36, 10, 68, C); R(46, 65, 48, 10, C); })],
  gravel: [0, 0, () => rdSprite('gravel', 96, 96, R => { for (let k = 0; k < 140; k++) R((k * 53) % 94, (k * 31 + (k >> 3)) % 94, 2, 2, k % 3 ? 'rgba(200,196,184,.12)' : 'rgba(0,0,0,.14)'); })] };
// 동네마다 나오는 것 (가중치)
const RD_KIT = {
  '신당동 주택가': { onggi: 4, chili: 3, rack: 4, pots: 4, basin: 3, bench: 2, dish: 2, chairs: 1 },
  '동대문 시장': { tarp: 4, boxes: 4, crates: 2, basin: 1, pots: 1, rack: 1, chairs: 1 },
  '성수 공장지대': { drums: 4, pallet: 4, duct: 2, acs: 1, boxes: 2, antenna: 1 },
  '을지로 인쇄골목': { paper: 4, pallet: 3, duct: 2, acs: 2, crates: 1, pots: 1 },
  '종로 유흥가': { crates: 4, chairs: 3, acs: 4, dish: 2, basin: 1, duct: 1 },
  '중구 관청가': { solar: 3, acs: 3, antenna: 2, dish: 2, duct: 2 },
  '청계천 상가': { boxes: 3, acs: 3, pots: 2, rack: 2, crates: 2, dish: 1 } };
const RD_GREEN = { '신당동 주택가': 0.75, '청계천 상가': 0.5, '을지로 인쇄골목': 0.45, '종로 유흥가': 0.35, '동대문 시장': 0.4, '성수 공장지대': 0.15, '중구 관청가': 0.1 };
function rdBuild(b, bi) {
  const x0 = b.x0, x1 = b.x1, y0 = b.y0, y1 = b.y1 - (b.fh || 0), w = x1 - x0 + 1, h = y1 - y0 + 1, out = { items: [], green: false };
  if (w < 3 || h < 2) return out;
  const d = STAGE.districtAt?.(Math.floor((x0 + x1) / 2), Math.floor((y0 + y1) / 2)) || '', K = (x, y) => x + ',' + y, occ = new Set();
  for (const p of b.kitProps || []) { const cells = p.cells || [[p.x, p.y]]; for (const [cx, cy] of cells) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) occ.add(K(cx + ox, cy + oy));
    if (p.t === 'plant') for (let k = 0; k < 4; k++) occ.add(K(p.x + k, p.y)); if (p.t === 'tank' || p.t === 'ac' || p.t === 'vent') occ.add(K(p.x, p.y)); }
  for (const l of S.ladders || []) if (bldAt(l.tx, l.ty) === bi || l.tx >= x0 && l.tx <= x1 && l.ty >= y0 && l.ty <= y1) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) occ.add(K(l.tx + ox, l.ty + oy));
  const spec = STAGE.referenceBuildings?.[bi]; if (spec?.boards) for (const bd of spec.boards) if (bd.mode === 'roof') for (let x = x0 + bd.x; x < Math.min(x1 + 1, x0 + bd.x + 4); x++) for (let y = Math.max(y0, y1 - 2); y <= y1; y++) occ.add(K(x, y));   // 옥상 광고판 자리
  out.green = rdHash(bi, 7, 1) < (RD_GREEN[d] ?? 0.3) && b.kind !== 'office';
  const kit = RD_KIT[d] || RD_KIT['청계천 상가'], keys = Object.keys(kit), tot = keys.reduce((s, k) => s + kit[k], 0);
  const pickKind = r => { let a = r * tot; for (const k of keys) { a -= kit[k]; if (a < 0) return k; } return keys[0]; };
  const fits = (x, y, fw, fh) => { if (x < x0 || y < y0 || x + fw - 1 > x1 || y + fh - 1 > y1) return false; for (let a = x; a < x + fw; a++) for (let c = y; c < y + fh; c++) if (occ.has(K(a, c))) return false; return true; };
  const put = (t, x, y, fw, fh) => { for (let a = x - 0; a < x + fw; a++) for (let c = y; c < y + fh; c++) occ.add(K(a, c)); out.items.push({ t, x, y }); };
  // 관청가 큰 옥상: 헬기장
  if (d === '중구 관청가' && w >= 6 && h >= 5) { const hx = x0 + Math.floor((w - 3) / 2), hy = y0 + Math.floor((h - 3) / 2); if (fits(hx, hy, 3, 3)) put('heli', hx, hy, 3, 3); }
  const n = Math.min(26, Math.max(3, Math.round(w * h / 4.5)));
  for (let k = 0, tries = 0; k < n && tries < n * 6; tries++) {
    const t = pickKind(rdHash(bi, tries, 3)), [fw, fh] = RD_ART[t], x = x0 + Math.floor(rdHash(bi, tries, 5) * w), y = y0 + Math.floor(rdHash(bi, tries, 9) * h);
    if (!fits(x, y, fw, fh)) continue; put(t, x, y, fw, fh); k++;
  }
  // 바닥 자국: 물때 · 금 · 배수구 · 전선 (겹쳐도 된다) — 공장은 녹물, 관청가는 자갈
  const m = Math.min(12, Math.max(2, Math.round(w * h / 8)));
  for (let k = 0; k < m; k++) { const r = rdHash(bi, k, 11), t = d === '성수 공장지대' && r < 0.3 ? 'rust' : r < 0.42 ? 'stain' : r < 0.66 ? 'crack' : r < 0.8 ? 'puddle' : r < 0.9 ? 'cable' : 'drain';
    out.items.unshift({ t, x: x0 + rdHash(bi, k, 13) * (w - 1), y: y0 + rdHash(bi, k, 17) * (h - 1) }); }
  if (d === '중구 관청가') out.items.unshift({ t: 'gravel', x: x0 + 0.5, y: y0 + 0.5, fill: true });
  out.items.unshift({ t: 'drain', x: x0 + 0.2, y: y1 + 0.55 }); out.items.unshift({ t: 'drain', x: x1 + 0.45, y: y1 + 0.55 });   // 모서리 배수구
  return out;
}
let rdGreenPat = null;
function rdGreen() {   // 낡은 초록 방수 칠 무늬 (96칸 반복)
  if (rdGreenPat) return rdGreenPat;
  const c = rdSprite('greenTex', 96, 96, R => { R(0, 0, 96, 96, '#3d6a4c'); for (let k = 0; k < 90; k++) R((k * 41) % 92, (k * 67) % 92, 3 + k % 5, 2 + k % 3, k % 4 ? 'rgba(20,40,28,.35)' : 'rgba(150,180,150,.18)'); for (let k = 0; k < 6; k++) R((k * 29) % 80, (k * 53) % 80, 14, 9, 'rgba(90,96,98,.55)'); });
  return (rdGreenPat = ctx.createPattern(c, 'repeat'));
}
function drawRoofDeco(b, bi) {
  if (!STAGE.cityLife || b.vacant || b.collapsed || bi === S.openB) return;
  const y1 = b.y1 - (b.fh || 0), cx = (b.x0 + b.x1 + 1) * TILE / 2, cy = (b.y0 + y1 + 1) * TILE / 2, rw = (b.x1 - b.x0 + 1) * TILE, rh = (y1 - b.y0 + 1) * TILE;
  if (!inView(cx, cy, (rw + rh) / 2 + 60)) return;
  const D = b.rdeco || (b.rdeco = rdBuild(b, bi));
  if (D.green) { const X = b.x0 * TILE + 10, Y = b.y0 * TILE + 10, W = (b.x1 - b.x0 + 1) * TILE - 20, H = (y1 - b.y0 + 1) * TILE - 16;
    if (W > 20 && H > 20) { ctx.save(); ctx.globalAlpha = 0.72; ctx.fillStyle = rdGreen(); ctx.fillRect(X, Y, W, H); ctx.globalAlpha = 0.35; ctx.fillStyle = '#1c2a22'; ctx.fillRect(X, Y + H - 6, W, 6); ctx.restore(); } }
  for (const it of D.items) { const A = RD_ART[it.t]; if (!A) continue; const s = A[2]();
    if (it.fill) { ctx.save(); ctx.fillStyle = s.pat || (s.pat = ctx.createPattern(s, 'repeat')); ctx.fillRect(b.x0 * TILE + 8, b.y0 * TILE + 8, (b.x1 - b.x0 + 1) * TILE - 16, (y1 - b.y0 + 1) * TILE - 12); ctx.restore(); continue; }
    const ix = it.x * TILE, iy = it.y * TILE; if (!inView(ix + s.width / 2, iy + s.height / 2, Math.max(s.width, s.height))) continue;
    ctx.drawImage(s, Math.round(it.x * TILE + (A[0] ? (A[0] * TILE - s.width) / 2 : 0)), Math.round(it.y * TILE + (A[1] ? (A[1] * TILE - s.height) / 2 : 0))); }
}
