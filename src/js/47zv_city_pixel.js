// ---------------------------------------------------------------- 자유 모드 도트화: 캔버스 도형(원·선·사각형)으로 그린 소품을 도트로
// 그 그림을 작은 캔버스에 도트 한 칸(PIX 월드 px) 크기로 그린 뒤, 반투명 가장자리를 잘라(알파 0/255) 또렷한 픽셀로 만들고
// 흐림 없이 확대해 찍는다. 사람·차·건물 같은 도트 그림과 같은 굵기의 픽셀이 된다. 그리는 코드는 그대로 두고 감싸기만 한다.
const PIX = 1.5;
const pixC = document.createElement('canvas'), pixX = pixC.getContext('2d', { willReadFrequently: true });
function pixelize(x0, y0, w, h, fn) {
  if (!STAGE.cityLife) return fn();
  x0 = Math.floor(x0 / PIX) * PIX; y0 = Math.floor(y0 / PIX) * PIX;   // 화면이 움직여도 픽셀 격자가 흔들리지 않게
  const n = Math.max(1, Math.ceil(w / PIX)), m = Math.max(1, Math.ceil(h / PIX)); if (n * m > 90000) return fn();
  if (pixC.width !== n || pixC.height !== m) { pixC.width = n; pixC.height = m; } else { pixX.setTransform(1, 0, 0, 1, 0, 0); pixX.clearRect(0, 0, n, m); }
  pixX.setTransform(1 / PIX, 0, 0, 1 / PIX, -x0 / PIX, -y0 / PIX); pixX.imageSmoothingEnabled = false; pixX.globalAlpha = 1; pixX.globalCompositeOperation = 'source-over';
  const main = ctx; ctx = pixX; let r; try { r = fn(); } finally { ctx = main; }
  const im = pixX.getImageData(0, 0, n, m), d = im.data; let any = false;
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (!a) continue; any = true; d[i] = a < 100 ? 0 : 255; }
  if (!any) return r; pixX.putImageData(im, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(pixC, x0, y0, n * PIX, m * PIX); ctx.restore(); return r;
}
const pixWrap = (f, box) => function (...a) { const b = STAGE.cityLife && box(...a); return b ? pixelize(b[0], b[1], b[2], b[3], () => f.apply(this, a)) : f.apply(this, a); };
// 감쌀 그림: 경찰 모자·경광봉 · 동호회 자전거 · 폴리스라인·들것 · 꾸러미 · 엘리베이터 문 · 수갑 · 배달 오토바이
drawCopGear = pixWrap(drawCopGear, g => [g.x - 36, g.y - 62, 72, 84]);
drawCrewBike = pixWrap(drawCrewBike, g => [g.x - 44, g.y - 44, 88, 88]);
drawCarriedParcel = pixWrap(drawCarriedParcel, () => { const P = S.player; return [P.x - 30, P.y - 50, 60, 50]; });
drawCuffs = pixWrap(drawCuffs, () => { const P = S.player; return [P.x - 24, P.y - 34, 48, 36]; });
drawElevDoors = pixWrap(drawElevDoors, () => { const P = S.player, inB = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)), E = S.elevs?.get(inB), D = E?.door; return D && !D.stairs ? [D.x - 32, D.y - TILE - 34, 64, 64] : null; });
drawScene = pixWrap(drawScene, () => { const T = S.scene?.tape; return T ? [T.x0 - 40, T.y0 - 60, T.x1 - T.x0 + 80, T.y1 - T.y0 + 100] : null; });
if (typeof drawDamageDirection === 'function') drawDamageDirection = pixWrap(drawDamageDirection, P => [P.x - 44, P.y - 62, 88, 88]);   // 맞은 방향 표시도 도트로
drawNuisance = pixWrap(drawNuisance, () => { const B = S.ev?.bikes; if (!B?.length) return null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const b of B) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x); y1 = Math.max(y1, b.y); } return x1 - x0 < 300 && y1 - y0 < 300 ? [x0 - 30, y0 - 30, x1 - x0 + 60, y1 - y0 + 60] : null; });
// 바닥 핏자국 (도트): 1.5px 격자에 맞춘 덩어리 몇 개 — 크기·모양은 자국마다 정해진 씨앗으로 (매 프레임 같은 모양)
function drawPixelBlood(d) {
  const q = 1.5, r = Math.max(q, d.r), seed = (d.rot || 0) * 1000, n = r > 6 ? 4 : 2; ctx.fillStyle = d.spray ? 'rgba(130,16,20,.85)' : 'rgba(110,14,18,.85)';
  const cx = Math.round(d.x / q) * q, cy = Math.round(d.y / q) * q;
  ctx.fillRect(cx - Math.round(r / q) * q, cy - Math.round(r * 0.6 / q) * q, Math.round(r * 2 / q) * q, Math.round(r * 1.2 / q) * q);
  for (let k = 0; k < n; k++) { const a = seed + k * 2.3, rr = r * (0.5 + 0.4 * Math.abs(Math.sin(a * 1.7))), ox = Math.round(Math.cos(a) * r * 0.8 / q) * q, oy = Math.round(Math.sin(a) * r * 0.5 / q) * q;
    ctx.fillRect(cx + ox - Math.round(rr / q) * q, cy + oy - Math.round(rr * 0.6 / q) * q, Math.round(rr * 2 / q) * q, Math.round(rr * 1.2 / q) * q); }
}
