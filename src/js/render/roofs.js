// 살피기(Tab): 가까운 건물의 1층 평면(방 이름)을 흐리게 겹쳐 보인다
function drawPlansFaint(P, openB) {
  BLD.forEach((b, bi) => {
    if (bi === openB || !b.plan) return; const bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    if (Math.abs(P.x - (bx + bw / 2)) > bw / 2 + 520 || Math.abs(P.y - (by + bh / 2)) > bh / 2 + 420) return;
    ctx.globalAlpha = 0.42; drawBig(ctx, mapC, bx, by, bw, bh); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(160,200,235,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); ctx.setLineDash([]);
    if (b.name) tag(bx + bw / 2, by - 12, b.name, '#a0c8eb');
  });
}
// 전봇대: 회색 콘크리트 기둥 + 노랑·검정 띠 + 완금(가로대)·애자 (+ 변압기)
function drawPole(o) {
  const x = o.x, y = o.y, top = y - o.top, lt = lightAt(x, y + 10);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 15, 10, 5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7d8088'; ctx.fillRect(x - 5, top, 10, y + 14 - top); ctx.fillStyle = '#a7aab2'; ctx.fillRect(x - 5, top, 3, y + 14 - top);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#1c1c20' : '#d8b636'; ctx.fillRect(x - 5, y + 8 - k * 6, 10, 6); }
  ctx.fillStyle = '#55585f'; ctx.fillRect(x - 20, top + 6, 40, 5); ctx.fillStyle = '#d9dde4'; for (const k of [-16, 0, 16]) ctx.fillRect(x + k - 2, top + 1, 4, 6);
  if ((o.tx + o.ty) % 2 === 0) { ctx.fillStyle = '#8e939c'; ctx.fillRect(x + 5, top + 15, 11, 17); ctx.fillStyle = '#62666e'; ctx.fillRect(x + 5, top + 15, 11, 3); }
  const lamp = S.lamps.find(l => l.pole && Math.abs(l.x - x) < 1 && Math.abs(l.y - y) < TILE);
  if (lamp) { const at = lampControl(lamp);
    ctx.fillStyle = '#14191e'; ctx.fillRect(at.x - 6, at.y - 7, 13, 15);
    ctx.strokeStyle = '#737f86'; ctx.lineWidth = 1; ctx.strokeRect(at.x - 6, at.y - 7, 13, 15);
    ctx.fillStyle = lamp.off || lamp.broken || mainPowerOff(lamp) ? '#454e51' : '#bdcfad'; ctx.fillRect(at.x - 1, at.y - 3, 3, 6);
  }
  if (!tactical) { ctx.fillStyle = `rgba(4,8,22,${0.62 * (1 - clamp(lt * 1.3, 0, 1))})`; ctx.fillRect(x - 21, top, 42, y + 16 - top); }
}
function drawWires() {
  for (const w of S.wires) {
    const cx = (w.a.dx + w.b.dx) / 2, cy = (w.a.dy + w.b.dy) / 2 + w.sag * 2;
    for (const [off, col, lw] of (STAGE.tutorial ? [[0, '#746044', 5], [-1, '#c1a67b', 2]] : [[6, '#101218', 2], [0, '#14161c', 3], [-1.5, 'rgba(176,186,206,.45)', 1]])) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(w.a.dx, w.a.dy + off); ctx.quadraticCurveTo(cx, cy + off * 1.4, w.b.dx, w.b.dy + off); ctx.stroke(); }
    for (const n of [w.a, w.b]) if (n.roof) { ctx.fillStyle = '#2e3138'; ctx.fillRect(n.dx - 5, n.dy - 5, 10, 10); ctx.fillStyle = '#9aa0aa'; ctx.fillRect(n.dx - 2, n.dy - 2, 4, 4); }
  }
}
// 건물 옥상 덮개 (안에 들어가 있는 건물만 열어 보인다)
// 판자 다리: 옥상과 옥상 사이에 걸친 널빤지 (위를 걸을 수 있고, 아래 골목은 그대로 지나다닌다)
function drawPlanks() {
  for (const p of PLANKS) {
    const { x0, y0, x1, y1, ew } = p;
    const px = x0 * TILE - (ew && p.a ? 8 : 0), py = y0 * TILE - (!ew && p.a ? 8 : 0);
    const w = (x1 - x0 + 1) * TILE + (ew ? (p.a ? 8 : 0) + (p.b ? 8 : 0) : 0);
    const h = (y1 - y0 + 1) * TILE + (!ew ? (p.a ? 8 : 0) + (p.b ? 8 : 0) : 0);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px + 6, py + 14, w, h - 6);
    for (let k = 0; k < (ew ? w : h); k += 8) {
      ctx.fillStyle = k % 16 ? '#7a5a3a' : '#8a6744';
      if (ew) ctx.fillRect(px + k, py + 6, Math.min(7, w - k), h - 12);
      else ctx.fillRect(px + 6, py + k, w - 12, Math.min(7, h - k));
    }
    ctx.fillStyle = '#3a2a1a';
    if (ew) { ctx.fillRect(px, py + 4, w, 3); ctx.fillRect(px, py + h - 7, w, 3); }
    else { ctx.fillRect(px + 4, py, 3, h); ctx.fillRect(px + w - 7, py, 3, h); }
  }
}
function drawRoofs(openB) {
  const roof = STAGE.roof || ['#444a55', '#545b68'];
  // 지붕은 열고 닫을 때 0.15초쯤 걸려 스르륵 (들어가고 나오고 벽을 탈 때 화면이 확 바뀌지 않게)
  const rdt = clamp(S.t - (S._roofT != null ? S._roofT : S.t), 0, 0.1); S._roofT = S.t;
  BLD.forEach((b, i) => {
    if (b.vacant) return;
    const tgt = i === openB ? 0 : 1; if (b.ra == null) b.ra = tgt; b.ra += (tgt - b.ra) * Math.min(1, rdt * 14); if (Math.abs(tgt - b.ra) < 0.02) b.ra = tgt;
    if (b.ra < 1) { ctx.strokeStyle = `rgba(242,196,107,${0.35 * (1 - b.ra)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.strokeRect(b.x0 * TILE + 1, b.y0 * TILE + 1, (b.x1 - b.x0 + 1) * TILE - 2, (b.y1 - b.y0 + 1) * TILE - 2); ctx.setLineDash([]); }
    if (b.ra === 0) {
      if (!flOf(S.player)&&!quarterClub(b)) drawFacadeExtras(b, true);
      return;
    }
    if (b.ra < 1) ctx.globalAlpha = b.ra;
    drawRoof1(b, i, roof); ctx.globalAlpha = 1;
  });
  const onFacade = (tx, ty) => { const b = bldAt(tx, ty); return b >= 0 && BLD[b].facade && ty >= BLD[b].y1 - BLD[b].fh + 1; };
  for (const w of S.windows) { const b = bldAt(w.tx, w.ty); if (b >= 0 && b !== openB && !onFacade(w.tx, w.ty)) { if (BLD[b].kit||freeCityBuilding(BLD[b])) drawWindowEdge(w, BLD[b]); else drawWindow(w, 0.5); } }
  for (const d of S.doors) { const b = bldAt(d.tx, d.ty); if (b >= 0 && b !== openB && !onFacade(d.tx, d.ty) && !BLD[b].plan) drawDoor(d, true); }
  for (const l of S.ladders) if (l.kind === 'pipe' && (!l.gas||S.player.trav?.pipe===l)) drawPipe(l);
  for (const l of S.ladders) if (l.kind === 'chimney' && bldAt(l.tx, l.ty) !== openB) drawChimney(l);
  for (const v of S.vents) if (v.roof && bldAt(v.tx, v.ty) !== openB) drawGrate(v, 1);
  drawTrapsRoof(openB);
}
function drawRoof1(b, i, roof) {
  if(quarterRoof(b))return;
  {
    if (false) {
      ctx.strokeStyle = 'rgba(242,196,107,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.strokeRect(b.x0 * TILE + 1, b.y0 * TILE + 1, (b.x1 - b.x0 + 1) * TILE - 2, (b.y1 - b.y0 + 1) * TILE - 2); ctx.setLineDash([]);
      if (!flOf(S.player)&&!quarterClub(b)) drawFacadeExtras(b, true);
      return;
    }
    const x = b.x0 * TILE, y = b.y0 * TILE, w = (b.x1 - b.x0 + 1) * TILE, h = b.roofC.rh;
    // Baked facades have transparent gutters and cutouts. A roof is a solid
    // surface beneath that artwork, even when its source image has alpha.
    if(b.kit){ctx.fillStyle='#3b4646';ctx.fillRect(x,y,w,h);}
    if (b.kit && !freeCityBuilding(b) && drawKitBuilding(b)) {
      drawFacadeExtras(b, false, true);
      if (hasHeightCues(i)) drawRoofCoping(b);
      ctx.fillStyle = 'rgba(232,227,214,.55)'; ctx.font = uiFont(12); ctx.textAlign = 'left'; ctx.fillText(b.h + '층 옥상', x + 6, y + 14);
      return;
    }
    const sh = b.h * 6;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x + sh, y + sh, w, h);
    if (b.facade) { drawFacade(b); drawFacadeExtras(b); }
    ctx.drawImage(b.roofC, x, y);
    drawCityRoofProps(b);
    if (b.h >= 2 && !b.roofC.flat) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); }
    ctx.fillStyle = NEONY() ? 'rgba(26,8,56,.4)' : 'rgba(4,8,22,.5)'; ctx.fillRect(x, y, w, h);
    if (NEONY()) { ctx.strokeStyle = 'rgba(255,46,136,.85)'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h + (b.facade ? b.fh * TILE : 0) - 3); if (b.facade) { ctx.strokeStyle = 'rgba(46,242,255,.8)'; ctx.beginPath(); ctx.moveTo(x, (b.y1 + 1) * TILE - 1); ctx.lineTo(x + w, (b.y1 + 1) * TILE - 1); ctx.stroke(); } }
    if (hasHeightCues(i)) drawRoofCoping(b);
    ctx.fillStyle = 'rgba(232,227,214,.55)'; ctx.font = uiFont(12); ctx.textAlign = 'left';
    ctx.fillText(b.h + '층 옥상', x + 6, y + 14);
    if (b.h >= 3 && !b.roofC.flat) { ctx.strokeStyle = 'rgba(232,227,214,.18)'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, w - 16, h - 16); }
  }
}
// 가스관과 2층 베란다 (정면 벽 위에 그린다)
function drawFacadeExtras(b, flat, kit) {
  if (b.fuse != null) { const fb = (S.bfuses || []).find(f => f.b === BLD.indexOf(b)); const fx = b.fuse * TILE + 12, fy = (b.y1 + 1) * TILE - (flat ? 12 : 34);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(fx + 3, fy + 3, 24, 22); ctx.fillStyle = '#8d939c'; ctx.fillRect(fx, fy, 24, 22); ctx.strokeStyle = '#4a4f58'; ctx.lineWidth = 2; ctx.strokeRect(fx + 1, fy + 1, 22, 20);
    ctx.fillStyle = fb && fb.cut ? '#e8473c' : '#e2c25a'; ctx.fillRect(fx + 9, fy + 6, 6, 9); }
  if (flat) {  // 안이 열려 보일 때(평면): 벽 바깥에 난간·배관 자리만 표시
    for (const tx of b.gas || []) {  // 위에서 본 가스관: 벽 바깥에 붙은 노란 관 단면 + 고정쇠 + 계량기 함
      const px = tx * TILE + (tx === b.x0 ? 9 : tx === b.x1 ? TILE - 9 : TILE / 2), py = (b.y1 + 1) * TILE + 5, ins = px < (b.x0 + b.x1 + 1) * TILE / 2 ? 1 : -1;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(px + 2, py + 3, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5c6068'; ctx.fillRect(px - 8, py - 6, 16, 4);
      ctx.fillStyle = '#9ea3ab'; ctx.fillRect(px + ins * 9 - (ins < 0 ? 14 : 0), py - 6, 14, 9); ctx.fillStyle = '#2a2d33'; ctx.fillRect(px + ins * 9 - (ins < 0 ? 14 : 0) + 3, py - 3, 8, 3);
      const g = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, 7); g.addColorStop(0, '#ffe58a'); g.addColorStop(0.6, '#d6ad2c'); g.addColorStop(1, '#7a5e12');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a2e0a'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const tx of b.balc || []) { const x0 = tx * TILE - 18, w = TILE + 36, y = (b.y1 + 1) * TILE - 2; ctx.fillStyle = '#6b6f78'; ctx.fillRect(x0, y, w, 7); ctx.fillStyle = '#2b2f37'; for (let x = x0 + 2; x < x0 + w - 1; x += 7) ctx.fillRect(x, y + 1, 2, 5); ctx.fillStyle = 'rgba(242,196,107,.8)'; ctx.font = uiFont(12); ctx.textAlign = 'center'; ctx.fillText('2층 베란다', tx * TILE + TILE / 2, y + 17); }
    return;
  }
  const top = (b.y1 - b.fh + 1) * TILE - 4, bot = (b.y1 + 1) * TILE + 6;
  if (b.tint) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${b.tint})`; ctx.fillRect(b.x0 * TILE, top + 4, (b.x1 - b.x0 + 1) * TILE, bot - top - 10); ctx.globalCompositeOperation = 'source-over'; }
  if (b.plate && b.kind !== 'shop' && b.fh >= 2) {  // 건물 이름판 (꼭대기 층 벽)
    ctx.font = uiFont(15); const tw = ctx.measureText(b.plate).width + 18, cx = (b.x0 + b.x1 + 1) * TILE / 2, py = top + 8;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(cx - tw / 2 + 3, py + 3, tw, 22);
    ctx.fillStyle = b.church ? '#5a1418' : '#23303a'; ctx.fillRect(cx - tw / 2, py, tw, 22);
    ctx.strokeStyle = b.church ? '#ff6a6a' : '#c9a646'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - tw / 2 + 1, py + 1, tw - 2, 20);
    ctx.fillStyle = b.church ? '#ffd0d0' : '#f0d890'; ctx.textAlign = 'center'; ctx.fillText(b.plate, cx, py + 16);
  }
  if (!kit) for (const tx of b.gas || []) {  // 키트 건물은 3D로 구운 배관이 그림에 들어 있다
    const px = tx * TILE + (tx === b.x0 ? 9 : tx === b.x1 ? TILE - 9 : TILE / 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(px - 1, top, 7, bot - top);
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(px - 3, top, 6, bot - top);
    ctx.fillStyle = '#f0d070'; ctx.fillRect(px - 2, top, 2, bot - top);
    ctx.fillStyle = '#5a5e66'; for (let y = top + 10; y < bot - 6; y += 22) ctx.fillRect(px - 5, y, 10, 3);
    ctx.fillStyle = '#7d828c'; ctx.fillRect(px - 7, bot - 30, 14, 12); ctx.fillStyle = '#2a2d33'; ctx.fillRect(px - 4, bot - 27, 8, 5);  // 계량기
  }
  if (!kit) for (const tx of b.balc || []) {
    const yy = (b.y1 - 1) * TILE, x0 = tx * TILE - 18, w = TILE + 36;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x0 + 3, yy + TILE - 2, w, 6);
    ctx.fillStyle = '#6b6f78'; ctx.fillRect(x0, yy + TILE - 8, w, 8);
    ctx.fillStyle = '#8a8f98'; ctx.fillRect(x0, yy + TILE - 8, w, 2);
    ctx.fillStyle = '#2b2f37'; ctx.fillRect(x0, yy + 16, w, 4);
    for (let x = x0 + 2; x < x0 + w - 1; x += 7) ctx.fillRect(x, yy + 18, 2, TILE - 26);
    ctx.fillStyle = '#4a7a46'; ctx.beginPath(); ctx.arc(x0 + 10, yy + 14, 7, 0, TAU); ctx.fill();  // 난간 화분
    ctx.fillStyle = '#a8a39a'; ctx.fillRect(x0 + w - 22, yy + 12, 14, 4);  // 빨래
  }
}
// 키트 굽기용: 건물마다 정면 줄(층별)의 창·문·기둥 자리
// ---- 옥상 살림: 옥탑방·물탱크·계단실(막힘) + 간판·채광창·텃밭·빨랫줄·태양광판·실외기·환기관(그림만)
// 배치는 여기서 정하고 kitSpec으로 굽기에 넘긴다. 구운 kit.json에 같은 목록이 들어 있으면 막힘 칸이 된다
const hN = (...a) => { let h = 2166136261 >>> 0; for (const v of a) { h = Math.imul(h ^ (v & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ ((v >>> 16) & 0xffff), 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; return (h ^ (h >>> 15)) >>> 0; };
