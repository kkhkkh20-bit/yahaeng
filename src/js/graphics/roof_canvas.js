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

