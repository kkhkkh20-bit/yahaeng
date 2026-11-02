const SCAN = { door: '#d39a5c', window: '#8fc3e6', pipe: '#c4ccd6', ladder: '#e0b070', chimney: '#f08a3c', vent: '#7fd6cc', hide: '#8fcf95', well: '#7fb0ff', secret: '#c9a0ff', lamp: '#f2c46b', fuse: '#f2c46b' };
// 글자 표시 겹침 정리: 한 화면의 tag 를 모아 두었다가(TAGQ) 중요한 것부터 겹치지 않는 자리(위·아래 한두 줄)에 놓는다.
// 인물·발견 표시·조작 영역을 먼저 비운다. 행동을 배치한 뒤 말풍선은 남은 자리에 둔다.
let TAGQ = null, SPEECH_R = [], MARK_R = [], ACTION_R = [];
function tag(x, y, text, col, alpha = 1, key, pri) { if (window.__skip && window.__skip.ui) return;
  if (TAGQ) { TAGQ.push({ x, y, text, col, alpha, key, pri: pri != null ? pri : (key || /^\[/.test(text) ? 3 : 1) }); return; }
  drawTag(x, y, text, col, alpha, key);
}
function tagRect(x, y, text, key) {
  const k = Math.max(1, 0.95 / SCALE); ctx.font = `700 ${13 * k}px "IBM Plex Sans KR",sans-serif`;
  const w = ctx.measureText(text).width + 12 * k, h = 18 * k; let kw = 0;
  if (key) { ctx.font = `800 ${13 * k}px "IBM Plex Sans KR",sans-serif`; kw = Math.max(h, ctx.measureText(key).width + 9 * k) + 2 * k; }
  return [x - w / 2 - kw, y - h / 2, x + w / 2, y + h / 2];
}
function flushTags() {
  const q = TAGQ; TAGQ = null; if (!q || !q.length) return;
  const k = Math.max(1, 0.95 / SCALE), lh = 21 * k, hit = (r, p) => r[0] < p[2] + 2 && r[2] + 2 > p[0] && r[1] < p[3] + 1 && r[3] + 1 > p[1];
  const placed = MARK_R.concat(actorTextBlocks()), blocks=hudTextBlocks();
  q.forEach((t, i) => { t.i = i; }); q.sort((a, b) => b.pri - a.pri || a.i - b.i);
  const seen = new Set();
  for (const t of q) {
    const sig = t.text + '|' + Math.round(t.x / 40) + '|' + Math.round(t.y / 40); if (seen.has(sig)) continue; seen.add(sig);  // 같은 자리 같은 글은 한 번
    let at = null;
    if (t.pri>=2) {
      const margin=tagBounds(t,0,0)[2]+8/SCALE;
      const xs=[t.x,clamp(t.x,cam.x-W/2/SCALE+margin,cam.x+W/2/SCALE-margin),cam.x-30/SCALE];
      for(const x of xs) { for(const dy of [0,-1,1,-2,2,-3,3,-4,4,-5,5,-6,6]) { const y=t.y+dy*lh,r=tagBounds(t,x,y);
        if(r[0]<cam.x-W/2/SCALE+4/SCALE||r[2]>cam.x+W/2/SCALE-4/SCALE||r[1]<cam.y-H/2/SCALE+4/SCALE||r[3]>cam.y+H/2/SCALE-75/SCALE)continue;
        if(!blocks.concat(placed).some(p=>hit(r,p))) { t.x=x;at=[y,r];break; }
      } if(at)break; }
      if(!at)continue;
    }
    if(!at) for (const dy of [0, -1, 1, -2, 2, -3]) { const y = t.y + dy * lh, r = tagBounds(t,t.x,y); if (!placed.some(p => hit(r, p))) { at = [y, r]; break; } }
    if (!at) { if (t.pri < 2) continue; at = [t.y, tagBounds(t,t.x,t.y)]; }
    placed.push(at[1]); ACTION_R.push(at[1]); if(t.rows)drawEncounter(t.x,at[0],t.rows);else drawTag(t.x, at[0], t.text, t.col, t.alpha, t.key);
  }
}
function drawTag(x, y, text, col, alpha = 1, key) {
  const k = Math.max(1, 0.95 / SCALE);  // 화면이 축소돼 있어도 글자는 읽을 수 있는 크기로
  ctx.globalAlpha = alpha; ctx.font = `700 ${13 * k}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 12 * k, h = 18 * k;
  ctx.font = `800 ${13 * k}px "IBM Plex Sans KR",sans-serif`; const kcw = key ? Math.max(h, ctx.measureText(key).width + 9 * k) : 0, kw = key ? kcw + 2 * k : 0;
  ctx.font = `700 ${13 * k}px "IBM Plex Sans KR",sans-serif`;
  ctx.fillStyle = INK_STUDY?'#191b18f0':'rgba(8,11,18,.86)'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, y - h / 2, 3 * k, h);
  ctx.fillStyle = INK_STUDY?INK.paper:'#efeadf'; ctx.fillText(text, x + k, y + 4.5 * k);
  if (key) {  // 누를 키를 작은 키캡으로
    const kx = x - w / 2 - kw; ctx.fillStyle = col; ctx.fillRect(kx, y - h / 2, kcw, h); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(kx, y + h / 2 - 3 * k, kcw, 3 * k);
    ctx.fillStyle = '#0b0d12'; ctx.font = `800 ${13 * k}px "IBM Plex Sans KR",sans-serif`; ctx.fillText(key, kx + kcw / 2, y + 4 * k);
  }
  ctx.globalAlpha = 1;
}
// 살피기(Tab / 살피기 버튼): 쓸 수 있는 물체를 모두 색 테두리와 이름으로 보여준다
// 지나갈 수 없는 경계: 걸을 수 있는 칸과 막힌 칸 사이에 선을 긋는다 (평소엔 내 주변만 옅게, 살피기 중엔 화면 전체 + 막힌 칸 빗금)
function drawBlockEdges(P, all) {
  const sol = P.z ? (tx, ty) => rLv(tx, ty) !== P.z : groundSolidP, ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE), R = 6;
  const hx = W / SCALE / 2 / TILE + 1, hy = H / SCALE / 2 / TILE + 1;
  const x0 = all ? Math.floor(cam.x / TILE - hx) : ptx - R, x1 = all ? Math.ceil(cam.x / TILE + hx) : ptx + R;
  const y0 = all ? Math.floor(cam.y / TILE - hy) : pty - R, y1 = all ? Math.ceil(cam.y / TILE + hy) : pty + R;
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let ty = Math.max(0, y0); ty <= Math.min(MH - 1, y1); ty++) for (let tx = Math.max(0, x0); tx <= Math.min(MW - 1, x1); tx++) {
    if (sol(tx, ty)) {
      if (all && !(P.z === 0 && roofAt(tx, ty) && bldAt(tx, ty) !== S.openB)) {  // 막힌 칸 빗금
        ctx.strokeStyle = 'rgba(255,96,72,.28)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let k = -TILE; k < TILE; k += 12) { ctx.moveTo(tx * TILE + Math.max(0, k), ty * TILE + Math.max(0, -k)); ctx.lineTo(tx * TILE + Math.min(TILE, TILE + k), ty * TILE + Math.min(TILE, TILE - k)); }
        ctx.stroke(); ctx.lineWidth = 2;
      }
      continue;
    }
    const dd = Math.hypot(tx - ptx, ty - pty), a = all ? 0.7 : Math.max(0, 1 - dd / R) * 0.75; if (a < 0.03) continue;
    ctx.strokeStyle = `rgba(255,150,110,${a})`; ctx.beginPath();
    const X = tx * TILE, Y = ty * TILE;
    if (sol(tx, ty - 1)) { ctx.moveTo(X + 2, Y + 1); ctx.lineTo(X + TILE - 2, Y + 1); }
    if (sol(tx, ty + 1)) { ctx.moveTo(X + 2, Y + TILE - 1); ctx.lineTo(X + TILE - 2, Y + TILE - 1); }
    if (sol(tx - 1, ty)) { ctx.moveTo(X + 1, Y + 2); ctx.lineTo(X + 1, Y + TILE - 2); }
    if (sol(tx + 1, ty)) { ctx.moveTo(X + TILE - 1, Y + 2); ctx.lineTo(X + TILE - 1, Y + TILE - 2); }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
// 가까운 상호작용 지점을 작은 표식으로 늘 보여 준다 (숨을 곳 · 오르는 곳 · 창문 · 환풍구 · 잠긴 문)
const _nearPaths = {}; const nearPath = k => _nearPaths[k] || (_nearPaths[k] = new Path2D(ICON_P[k]));  // 근처 표시용 아이콘 (버튼 아이콘과 같은 그림)
function drawNearMarks(P, openB) { if (P.trav || (window.__skip && window.__skip.ui)) return;  // 첫 화면 배경 찍기: 글자·표시 없이
  if (P.hide || P.vent || P.under || P.wire || P.trav || P.jump) return;
  const R = 300, fP = flOf(P), k = isTouch ? 0.95 / SCALE : Math.max(1, 0.95 / SCALE), list = [];
  const hidden = (tx, ty) => { const b = bldAt(tx, ty); return !P.z && !fP && b >= 0 && b !== openB; };
  const add = (x, y, col, g, lab, tx, ty) => { const d = dist(P.x, P.y, x, y); if (d > R) return; if (tx != null && hidden(tx, ty)) return; const m = { x, y, col, g, lab, d }; list.push(m); return m; };
  if (!P.z) {
    for (const h of S.hides) if ((h.fl || 0) === fP && (h.z || 0) === (S.player.z || 0)) add(h.x, h.y, h.type === 'well' ? SCAN.well : SCAN.hide, h.type === 'well' ? 'manhole' : 'hide', hideName(h), h.tx, h.ty);
    const stc = {};  // 계단 칸: 오르기·내려가기를 한 표식으로 (↑옥상 · ↓1층)
    for (const l of S.ladders) {
      if (l.kind === 'chimney') continue;
      if (l.kind === 'fstair' || l.kind === 'stair') { const k = l.tx + ',' + l.ty, o = stc[k] || (stc[k] = { l, up: null, down: null });
        if ((l.bfl || 0) === fP && !(l.bz || 0)) o.up = l.kind === 'stair' ? '옥상' : (l.tfl + 1) + '층'; if (l.kind === 'fstair' && l.tfl === fP && fP) o.down = (l.bfl + 1) + '층'; continue; }
      if ((l.bfl || 0) === fP && !(l.bz || 0)) add(l.x, l.y, SCAN.ladder, '↑', l.kind === 'pipe' ? (l.gas ? '가스관' : '배관') : l.kind === 'balc' ? '베란다' : '계단');
    }
    for (const k in stc) { const o = stc[k]; if (!o.up && !o.down) continue;  // 오르는 곳(계단 칸)과 내려가는 곳(구멍 끝)이 다르면 표식도 따로
      const dl = o.down && S.ladders.find(l => l.kind === 'fstair' && l.tx === o.l.tx && l.ty === o.l.ty && l.tfl === fP), dp = dl && downMark(dl), up = stairFloor(o.l.tx, o.l.ty, fP).up.marker;
      if (dp && (dp.x !== o.l.x || dp.y !== o.l.y)) { if (o.up) add(up.x, up.y, SCAN.ladder, '↑', '↑' + o.up, o.l.bx, o.l.by); add(dp.x, dp.y, SCAN.ladder, '↓', '↓' + o.down, o.l.bx, o.l.by); }
      else add(up.x, up.y, SCAN.ladder, o.up && o.down ? '↕' : o.up ? '↑' : '↓', [o.up && '↑' + o.up, o.down && '↓' + o.down].filter(Boolean).join(' · '), o.l.bx, o.l.by); }
    if (!fP) { for (const o of S.poles) if (wireUsable() && o.wires.length) add(o.x, o.y, SCAN.ladder, '↑', STAGE.tutorial ? '훈련 지주' : '전봇대');
      // 창문·문은 표식 없이 그림으로 (열린 창은 틈이 벌어져 보인다). 무엇을 할지는 다가가 [행동]에 뜬다
    }
    else for (const w of S.fwindows) if (w.fl === fP && winUsable(w)) add(w.x, w.y, SCAN.window, 'window', w.link ? '옆 건물로' : (wireUsable() ? '창밖 전깃줄' : '창문'));
    for (const v of S.vents) if (!v.roof && flOf(v) === fP) add(v.x, v.y, SCAN.vent, 'vent', '환풍구', v.street ? null : v.tx, v.ty);
    if (S.camRoom && !S.camsOff && S.camRoom.fl === fP) add(S.camRoom.x, S.camRoom.y, '#ff6a6a', 'light', 'CCTV 관리실', S.camRoom.tx, S.camRoom.ty);
  } else {
    for (const l of S.ladders) if (l.tz === P.z) {
      if (l.roofDoor) continue;  // 실제 문턱·열린 철문·계단 명판이 입구를 표시한다
      else add(l.rx != null ? l.rx : l.ux, l.ry != null ? l.ry : l.uy, SCAN.ladder, '↓', l.kind === 'pipe' ? '내려가기' : '계단');
    }
    for (const v of S.vents) if (v.roof) add(v.x, v.y, SCAN.vent, 'vent', '환기구');
    for (const w of S.wires) for (const n of [w.a, w.b]) if (wireUsable() && n.roof && n.z === P.z) add(n.dx, n.dy, SCAN.ladder, 'wire', STAGE.tutorial ? '훈련 로프' : '전깃줄');
  }
  const pa = S.paNow, paAt = pa && (pa.at || (pa.l && (pa.k === 'down' ? { x: pa.l.rx != null ? pa.l.rx : pa.l.ux, y: pa.l.ry != null ? pa.l.ry : pa.l.uy } : pa.l)) || (pa.wv && pa.wv.w) || pa.d || pa.v || pa.h);
  const WAY = new Set(['↓', '↑', '↕', 'window', 'pick', 'door', 'vent', 'manhole', 'wire']);
  for (const m of list) {
    // 오르내리는 곳·창문·문: 가까이 오면 실제로 서야 할 자리에 바닥 고리를 그린다. 바로 앞인데 다른 행동이 잡혀 있으면 이유를 적는다
    if (WAY.has(m.g) && !m.roofDoor && m.d < 150) { const on = paAt && dist(paAt.x, paAt.y, m.x, m.y) < 30; ctx.strokeStyle = m.col; ctx.globalAlpha = on ? 0.95 : 0.5; ctx.lineWidth = on ? 2.5 : 1.5; ctx.setLineDash(on ? [] : [4, 4]); ctx.beginPath(); ctx.ellipse(m.x, m.y + 4 * k, 20 * k, 11 * k, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (!on && m.d < 60) { const why = P.carrying && !/^[↑↓]\d+층/.test(m.lab || '') ? '운반 중에는 통과 불가 · [행동]으로 내려놓기' : P.captive ? '붙잡은 상태에서는 통과 불가' : pa && pa.choices > 1 ? (isTouch ? '[대상] 버튼으로 바꾸기' : 'Tab으로 바꾸기') : pa && pa.k !== 'none' ? '한 걸음 더 가까이' : '';
        if (why) { ctx.font = `600 ${11 * k}px "IBM Plex Sans KR",sans-serif`; const tw = ctx.measureText(why).width + 10 * k; ctx.fillStyle = 'rgba(8,11,18,.85)'; ctx.fillRect(m.x - tw / 2, m.y + 18 * k, tw, 15 * k); ctx.fillStyle = '#ffb36b'; ctx.textAlign = 'center'; ctx.fillText(why, m.x, m.y + 29 * k); } } }
    if (m.d > 170 || (m.roofDoor && paAt && dist(paAt.x, paAt.y, m.x, m.y) < 2)) continue;  // 선택된 옥탑문은 문 테두리와 행동 안내만
    const a = Math.max(0.3, 1 - m.d / 170) * 0.8, r = 8 * k, y = m.y - 22 * k;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,11,18,.85)'; ctx.beginPath(); ctx.arc(m.x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = m.col; ctx.lineWidth = 2; ctx.stroke();
    if (ICON_P[m.g]) { const sc = (13 * k) / 24; ctx.save(); ctx.translate(m.x - 12 * sc, y - 12 * sc); ctx.scale(sc, sc); ctx.strokeStyle = m.col; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(nearPath(m.g)); ctx.restore(); }
    else { ctx.fillStyle = m.col; ctx.font = `700 ${13 * k}px "IBM Plex Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.fillText(m.g, m.x, y + 4 * k); }
    if (false && m.lab) { ctx.font = `600 ${11.5 * k}px "IBM Plex Sans KR",sans-serif`; const tw = ctx.measureText(m.lab).width + 8 * k; ctx.fillStyle = 'rgba(8,11,18,.8)'; ctx.fillRect(m.x + r + 2 * k, y - 7 * k, tw, 14 * k); ctx.fillStyle = m.col; ctx.textAlign = 'left'; ctx.fillText(m.lab, m.x + r + 6 * k, y + 4 * k); }
  }
  ctx.globalAlpha = 1;
}
function drawScan(openB) {
  const vx0 = cam.x - W / SCALE / 2 - 60, vx1 = cam.x + W / SCALE / 2 + 60, vy0 = cam.y - H / SCALE / 2 - 60, vy1 = cam.y + H / SCALE / 2 + 60;
  const on = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
  const pulse = 0.75 + 0.25 * Math.sin(S.t * 5);
  // 글자는 가까운 것부터, 겹치면 건너뛴다 (상자는 다 그린다). 닫힌 건물 안의 것은 흐리게, 글자 없이
  const labs = [], kS = Math.max(1, 0.95 / SCALE);
  const box = (x, y, col, text, sz = 40, a = 1) => { if (!on(x, y)) return; ctx.globalAlpha = a * pulse; ctx.strokeStyle = col; ctx.lineWidth = a < 1 ? 1.5 : 2.5; ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz); ctx.globalAlpha = 1;
    const d = dist(x, y, S.player.x, S.player.y); if (text && a >= 0.9 && (tactical || d < 340)) labs.push({ x, y: y - sz / 2 - 11 * kS, text, col, d }); };
  const inner = (tx, ty) => { const b = bldAt(tx, ty); return b >= 0 && b !== openB ? 0.55 : 1; };
  const seen = new Set(), fP = flOf(S.player);
  for (const d of S.doors) { const k = d.group.map(t => t.tx + ',' + t.ty).sort()[0]; if (seen.has(k)) continue; seen.add(k); if ((d.fl || 0) !== fP && !tactical) continue; const keyed = d.locked && d.keyLock; box(d.x, d.y, keyed ? keyCol(d.keyLock) : SCAN.door, keyed ? '잠긴 문(' + keyName(d.keyLock) + ')' : '문', 40, keyed ? 1 : inner(d.tx, d.ty)); }
  if (fP) for (const w of S.fwindows) { if (w.fl === fP && winUsable(w)) box(w.x, w.y, SCAN.window, S.wires.some(x => [x.a, x.b].some(n => n.win && n.fl === fP && n.tx === w.tx && n.ty === w.ty)) ? '창문(전깃줄)' : '창문'); }
  else for (const w of S.windows) { const st = winSt(w); box(w.x, w.y, st === 'bar' ? '#7a808a' : st === 'lock' ? '#9aa6b4' : SCAN.window, st === 'bar' ? '방범창' : st === 'lock' ? '잠긴 창문' : '창문', st === 'bar' ? 34 : 40, st === 'bar' ? 0.75 : 1); }
  for (const l of S.ladders) {
    if (S.player.z && l.roofDoor && l.tz === S.player.z) { box(l.roofDoor.x, l.roofDoor.y, SCAN.ladder, '계단 입구 · ' + ((l.bfl || 0) + 1) + '층', 28); continue; }
    if ((l.kind === 'stair' || l.kind === 'fstair') && !S.player.z) { if ((l.bfl || 0) === fP) box(l.x, l.y, SCAN.ladder, l.kind === 'fstair' ? `오르기 ${l.tfl + 1}층` : '오르기 옥상', 36); if (l.kind === 'fstair' && l.tfl === fP) { const dp = downPt(l); tag(dp.x, dp.y + (dp.x === l.x && dp.y === l.y ? 30 : 0), `내려가기 ${l.bfl + 1}층`, SCAN.ladder); } continue; }
    if (fP) continue;
    if (l.kind === 'pipe') { box(l.x, l.y, SCAN.pipe, '배관 ↑', 36, l.bz ? 0.8 : 1); }
    else if (l.kind === 'ladder') box(l.x, l.y, SCAN.ladder, '사다리 ↑', 36);
    else if (l.kind === 'stair') box(l.x, l.y, SCAN.ladder, '오르기 옥상', 36, inner(l.bx, l.by));
    else if (l.kind === 'chimney') { const lit = lampOn(l.lamp); box(l.ux, l.uy, SCAN.chimney, lit ? '굴뚝 · 불이 켜져 있음' : '굴뚝', 40); }
  }
  for (const v of S.vents) if (!fP || (!v.roof && flOf(v) === fP)) box(v.x, v.y, SCAN.vent, v.roof ? '옥상 환기구' : v.street ? '거리 환기구' : '환풍구', 34, v.roof ? 1 : inner(v.tx, v.ty));
  for (const h of S.hides) { if ((h.fl || 0) !== flOf(S.player) || (h.z || 0) !== (S.player.z || 0)) continue; box(h.x, h.y, h.type === 'well' ? SCAN.well : SCAN.hide, hideName(h), 42, inner(h.tx, h.ty)); }
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (G[ty][tx] === 'S') box(tc(tx), tc(ty), SCAN.secret, '비밀 통로', 40);
  if (!fP && STAGE.fuse && S.lightsOn) box(tc(STAGE.fuse[0]), tc(STAGE.fuse[1]), SCAN.fuse, '두꺼비집', 40);
  if (!flOf(S.player)) for (const fb of S.bfuses || []) if (!fb.cut) box(fb.x, fb.y - 26, SCAN.fuse, '두꺼비집', 30);
  for (const c of S.cams || []) if (c.fl === flOf(S.player) && !c.broken) box(c.x, c.y, '#ff5a5a', 'CCTV', 28);
  for (const l of S.lamps) if (flOf(l) === fP && !l.hearth && !l.broken && on(l.x, l.y)) { const p=lampControl(l);ctx.strokeStyle = SCAN.lamp; ctx.lineWidth = 2; ctx.globalAlpha = 0.8 * pulse; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  if (!fP) for (const o of S.poles) if (wireUsable() && o.wires.length) box(o.x, o.y, SCAN.ladder, STAGE.tutorial ? '훈련 지주 ↑' : '전봇대 ↑', 36);
  if (!fP) for (const w of S.wires) for (const n of [w.a, w.b]) if (wireUsable() && n.roof) box(n.dx, n.dy, SCAN.ladder, STAGE.tutorial ? '훈련 로프' : '전깃줄', 26);
  for (const g of S.guards) if (flOf(g) === fP && g.lookout && g.state !== 'DEAD') labs.push({ x: g.x, y: g.y + 34, text: '망꾼: 옥상을 본다', col: '#f2c46b', d: 0 });
  if (!S.player.z) for (const it of FURN) {  // 가구: 파랑 = 높은 가구(막힘·시선 가림), 노랑 점선 = 낮은 가구(막힘·웅크리면 엄폐)
    if ((it.fl || 0) !== fP || FURN_FLAT.has(it.t)) continue; const bi = bldAt(it.x, it.y); if (bi >= 0 && bi !== openB && !tactical) continue;
    const x = it.x * TILE, y = it.y * TILE, w = it.w * TILE, h = it.h * TILE; if (!on(x + w / 2, y + h / 2)) continue;
    if (FURN_TALL.has(it.t)) { ctx.fillStyle = 'rgba(110,150,220,.22)'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); ctx.strokeStyle = 'rgba(140,180,240,.85)'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); }
    else { ctx.strokeStyle = 'rgba(242,196,107,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); ctx.setLineDash([]); }
  }
  labs.sort((a, b) => a.d - b.d); const placed = []; ctx.font = `700 ${13 * kS}px "IBM Plex Sans KR",sans-serif`;
  for (const L of labs) { const w = ctx.measureText(L.text).width + 14 * kS, h = 19 * kS, r = [L.x - w / 2, L.y - h / 2, L.x + w / 2, L.y + h / 2];
    if (placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue; placed.push(r); tag(L.x, L.y, L.text, L.col); if (placed.length >= 18) break; }
}
// 권총 조준선: 겨눈 시간만큼 굵고 진해진다 (1초 뒤 발사)
function drawGunAim() {
  const P = S.player;
  for (const g of S.guards) { if (!g.aim || g.state !== 'ALERT' || flOf(g) !== flOf(P)) continue; const f = Math.min(1, g.aim / GUN_AIM);
    const L = Math.min(dist(g.x, g.y, P.x, P.y), castRay(g.x, g.y, Math.atan2(P.y - g.y, P.x - g.x), GUN_R)), a = Math.atan2(P.y - g.y, P.x - g.x);
    ctx.strokeStyle = `rgba(255,40,40,${0.25 + 0.65 * f})`; ctx.lineWidth = 1 + 2.5 * f; ctx.setLineDash(f > 0.7 ? [] : [6, 5]); ctx.beginPath(); ctx.moveTo(g.x + Math.cos(a) * 14, g.y + Math.sin(a) * 14); ctx.lineTo(g.x + Math.cos(a) * L, g.y + Math.sin(a) * L); ctx.stroke(); ctx.setLineDash([]);
    if (f > 0.7 && Math.floor(S.t * 12) % 2) { ctx.fillStyle = 'rgba(255,60,60,.9)'; ctx.beginPath(); ctx.arc(g.x + Math.cos(a) * L, g.y + Math.sin(a) * L, 4, 0, TAU); ctx.fill(); } }
}
// 지금 누를 수 있는 행동을 대상 위에 글자로 띄운다
function drawActLabels(pa, P, ka, ga) {
  const k = Math.max(1, 0.95 / SCALE), T = (b, kc) => isTouch ? [`[${b}] `, null] : ['', kc];
  const vic=ka&&(ka.c||ka.g||ka.kill||ka.list?.[0]||ka.stalk),vy=vic?vic.y-34*k:null;
  queueEncounter(P,encounterRows(P,ka,ga,pa));
  if (!isTouch && ga && ['ledgeDrop','wireFall'].includes(ga.k)) {
    const h=P.wire?wirePt(P.wire.w,P.wire.s):P;tag(h.x,h.y-75*k,'떨어지기','#f2c46b',1,KK('grab'),3.5);
  }
  if(P.captive || pa?.k==='steal')return;
  if (!pa || pa.k === 'none') return;
  // [행동]: 대상(문·창문·계단·시체…) 위. 대상이 따로 없는 행동(들고 있는 것 내려놓기 등)은 버튼만 — 주인공 머리 위를 가리지 않게
  if (!pa.at && !pa.c && !actObj(pa)) return;
  let x = P.x, y = P.y - 44;
  const at = o => { x = o.x; y = o.y - 34; };
  if (pa.k==='use'||objectActionPoint(pa)?.surface) {const p=surfacePoint(objectActionPoint(pa));x=p.x;y=p.y-30;} else if (pa.at) { x = pa.at.x; y = pa.at.y - 30; } else if (pa.d) at(pa.d); else if (pa.wv) at(pa.wv.w); else if (pa.v) at(pa.v); else if (pa.h) at(pa.h); else if (pa.c) at(pa.c); else if (pa.p) at(pa.p); else if (pa.g) at(pa.g); else if (pa.list) at(pa.list[0]); else if (pa.tp && pa.tp.car) at(pa.tp.car);
  else if (pa.l && pa.k === 'up') { x = pa.l.x; y = pa.l.y - 34; } else if (pa.l && (pa.k === 'down' || pa.k === 'smother')) { x = pa.l.rx != null ? pa.l.rx : pa.l.ux; y = (pa.l.ry != null ? pa.l.ry : pa.l.uy) - 40; } else if (pa.l) at(pa.l);
  if (vic && Math.abs(x - vic.x) < 60 && Math.abs(y - vy) < 44 * k) y = vy - 23 * k;  // 사람과 겹치면 한 줄 위로
  const col = pa.k === 'window' ? SCAN.window : pa.k === 'door' || pa.k === 'keymsg' ? SCAN.door : pa.v ? SCAN.vent : pa.k === 'smother' || (pa.l && pa.l.kind === 'chimney') ? SCAN.chimney : pa.k === 'hide' || pa.k === 'drag' || pa.k === 'stash' ? SCAN.hide : '#f2c46b';
  let lab = pa.label;
  if ((pa.k === 'up' && pa.l && pa.l.kind !== 'fstair') || pa.k === 'wireOn' || pa.k === 'down') {  // 오르내리는 동안 보일 자리: 지금 그곳을 보고 있는 자경대원
    const bx = pa.l ? pa.l.x : pa.at ? pa.at.x : P.x, by = pa.l ? pa.l.y : pa.at ? pa.at.y + 30 : P.y; let n = 0;
    for (const g of S.guards) { if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.climb || flOf(g) || (g.z || 0)) continue;
      if (canSee(g, bx, by, Math.max(0.35, lightAt(bx, by)), false, false, 0) > 0) { n++; ctx.strokeStyle = 'rgba(232,90,70,.7)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y - 20); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]); } }
    if (n) lab += ` · 이 위치를 보는 경비 ${n}명`;
  }
  const [p, kc] = T('행동', KK('env')); tag(x, y, p + lab, col, 1, kc, 3.5);
}
const coveredG = (g, openB) => { const b = bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)); return b >= 0 && !BLD[b].vacant && b !== openB; };

