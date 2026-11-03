const DBG = window.__skip || (window.__skip = {});  // 성능 측정용: 그리기 단계를 하나씩 끄고 비교
function draw() {
  if(STAGE.artSlice&&window.__clubView?.ready)window.__clubView.setTactical(tactical);
  if(STAGE.artSlice&&!tactical&&window.__clubView?.ready){window.__clubView.draw(ctx,canvas);drawMini();return;}
  if (S.player.under && !tactical) { drawUnderground(); return; }
  PM();hudBlockFrame=null;
  const sc = SCALE * DPR;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  worldTransform(ctx, sc);
  ctx.imageSmoothingEnabled = false;
  drawBig(ctx, mapC, ...viewRect(60));
  const P = S.player;
  SPEECH_R = []; MARK_R = []; ACTION_R = []; TAGQ = [];  // 이번 화면의 글자 표시를 모은다 (끝에서 flushTags)
  setLayer(0);
  // 위층에 있으면 그 건물 자리에 그 층 평면을 덮어 그린다
  // 창문 넘기·창문 건너기(같은 높이 뜀): 지붕 위로 날아가는 것처럼 보이지 않게, 건물 안을 보여 준 채 땅 위 사람처럼 그린다 (절반 전엔 출발 건물, 그 뒤엔 도착 건물)
  const lowJ = !!(P.jump && P.jump.vault && !P.jump.z1 && !P.z);
  const jumpB = lowJ ? (() => { const J = P.jump, f = J.t / J.dur, bs = bldAt(Math.floor(J.x0 / TILE), Math.floor(J.y0 / TILE)), bd = bldAt(Math.floor(J.x1 / TILE), Math.floor(J.y1 / TILE)); return f > 0.5 ? (bd >= 0 ? bd : bs) : (bs >= 0 ? bs : bd); })() : -1;
  const room=traversalRoom(P.trav);
  const windowMotion=!!P.trav?.room;
  const travUp = !!(P.trav && !P.trav.hideB && !P.trav.stairs && !P.trav.local && !room && P.trav.phases.some(ph => ph.pose !== 'walk'));
  let openB = room?.b??(lowJ ? jumpB : (P.z === 0 && !P.jump && !travUp) ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1);
  if (openB < 0 && S.peek && !travUp) openB = S.peek.b; S.openB = openB;
  const VF = room?.fl??((!P.z && !P.wire && (!P.jump || lowJ) && !P.vent && !P.under) ? flOf(P) : 0);
  const VB = VF ? (room?.b??(lowJ ? jumpB : bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)))) : -1;
  const inVB = o => VB >= 0 && bldAt(Math.floor(o.x / TILE), Math.floor(o.y / TILE)) === VB;
  const onGround = o => !flOf(o) && !(VF && inVB(o));
  const onFloor = o => !!VF && flOf(o) === VF && inVB(o);
  const gVis = o => (onGround(o) || onFloor(o)) && (!tactical || !o.target || oppMode===2 || targetKnowledge(o).live);
  for (const l of S.lures) {
    const f = l.landed ? 1 : l.t / 0.35, x = l.x0 + (l.x - l.x0) * f, y = l.y0 + (l.y - l.y0) * f - Math.sin(f * Math.PI) * 14;
    blit(ctx, 'it_coin', x - 10, y - 10, 20, 20);
    if (l.landed) { ctx.strokeStyle = `rgba(242,196,107,${0.4 + 0.3 * Math.sin(S.t * 6)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke(); }
  }
  PM('map');
  // 화면 밖 것은 그리지 않는다 (큰 판은 창문·문만 수백 개)
  for (const w of S.windows) if (inView(w.x, w.y, 60)) drawWindow(w, 1);
  for (const d of S.doors) if (inView(d.x, d.y, 60)) drawDoor(d, false);
  for (const l of S.ladders) if (l.kind === 'pipe' && l.bz === 0 && inView(l.x, l.y, 120)) drawPipeBase(l);
  for (const v of S.vents) if (!v.roof && inView(v.x, v.y, 40)) drawGrate(v, 0.85);
  for (const l of S.lamps) if (l.hearth && lampOn(l)) { const fl = 0.75 + 0.25 * Math.sin(S.t * 17 + l.x); ctx.fillStyle = `rgba(255,140,50,${0.85 * fl})`; ctx.beginPath(); ctx.moveTo(l.x - 9, l.y + 14); ctx.quadraticCurveTo(l.x - 6, l.y - 2 * fl, l.x, l.y - 8 * fl); ctx.quadraticCurveTo(l.x + 6, l.y - 2 * fl, l.x + 9, l.y + 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(l.x, l.y + 9, 4 * fl, 0, TAU); ctx.fill(); }

  if (S.exitOpen) {
    const p = 0.5 + 0.5 * Math.sin(S.t * 4);
    ctx.strokeStyle = `rgba(242,196,107,${0.5 + p * 0.4})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    for (const e of S.exits || [S.exit]) { ctx.beginPath(); ctx.arc(e.x, e.y, e.r - 8 + p * 6, 0, TAU); ctx.stroke(); }  ctx.setLineDash([]);
  }
  if (STAGE.flee && S.fleeing) {
    const fx = tc(STAGE.flee[0]), fy = tc(STAGE.flee[1]);
    ctx.strokeStyle = 'rgba(232,71,60,.7)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(fx, fy, 40, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  if (showRoutes || tactical) drawRoutes(P);
  drawTrapsGround(); drawProps();
  for (const d of S.decals) { if (!onGround(d)) continue; ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = 'rgba(110,14,18,.82)'; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(d.r * 0.8, d.r * 0.4, d.r * 0.3, 0, TAU); ctx.fill(); ctx.restore(); }
  for (const it of S.items) if (!it.got && onGround(it)) { { const d = dist(P.x, P.y, it.x, it.y), a = clamp(1 - d / 520, 0.25, 0.9) * (0.75 + 0.25 * Math.sin(S.t * 3)); ctx.strokeStyle = `rgba(242,196,107,${a})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(it.dx || it.x, it.dy || it.y, 20 + Math.sin(S.t * 3) * 2, 0, TAU); ctx.stroke(); } drawLootItem(it); }  // 목표물은 은은하게 빛난다
  for (const n of S.notes || []) if (onGround(n)) drawNote(n);
  drawLoud(0); drawCams(0);
  drawHideFixtures();
  if (!tactical && !P.z && !flOf(P) && !input.scan) drawBlockEdges(P, false);
  const lastStep=S.noises.filter(n=>n.src==='step'&&flOf(n)===flOf(P)).at(-1);
  for (const n of S.noises) {
    if(flOf(n)!==flOf(P)||(n.src==='step'&&n!==lastStep))continue;
    const k = n.t / 0.7; ctx.strokeStyle = n.heard ? `rgba(242,196,107,${(1 - k) * 0.75})` : n.src === 'stone' || n.src === 'glass' ? `rgba(242,196,107,${(1 - k) * 0.6})` : `rgba(220,226,240,${(1 - k) * 0.38})`;
    ctx.save();ctx.setLineDash([3,6]);ctx.lineWidth=n.heard?2:1;ctx.beginPath();ctx.arc(n.x,n.y,Math.max(1,n.r*(.25+.75*k)),0,TAU);ctx.stroke();ctx.restore();
  }
  PM('objs');
  if (S.vehicles && !flOf(P)) drawVehicles(); if (STAGE.city) drawContracts();
  for (const c of S.corpses) {
    if (c.hideT>S.t || c.stashed || !onGround(c) || (c.z && !tactical) || !inView(c.x,c.y,100) || roofOccludes(c,openB)) continue;
    if (c.dog) drawDog(c.x, c.y, c.a, false, c.hidden ? 0.5 : 0.9, true);
    else { if (c.carried && pairCarry(S.player)) continue; const lift = c.fly ? Math.sin(Math.min(1, c.fly.t / c.fly.dur) * Math.PI) * 40 : c.td != null && S.t - c.td < 0.22 ? (1 - (S.t - c.td) / 0.22) * 30 : 0; ctx.globalAlpha = c.hidden ? 0.5 : 1; drawBody(c, lift); ctx.globalAlpha = 1; }
    if (c.ko && !c.carried) drawEmote('zz', c.x + 16, c.y - 6);
    if (c.discovered && !c.carried) { ctx.fillStyle = 'rgba(194,54,43,.9)'; ctx.font = uiFont(13); ctx.textAlign = 'center'; ctx.fillText('발견됨', c.x, c.y - 24); }
  }
  PM('cars+corpses');
  if (!DBG.sprites) for (const g of S.guards) {
    if (g.state === 'DEAD' || !onGround(g) || g.z || g.climb || !inView(g.x, g.y, 120) || roofOccludes(g,openB)) continue;
    if (g.yank) drawYanked(g); else drawGuard(g);
    if (g.atkT > 0) { const k = 1 - g.atkT / (g.dog ? 0.35 : 0.55); ctx.strokeStyle = `rgba(232,71,60,${0.4 + 0.5 * k})`; ctx.lineWidth = 3 + 3 * k; ctx.beginPath(); ctx.arc(g.x, g.y, 30 + 16 * k, g.a - 0.8, g.a + 0.8); ctx.stroke(); }
    if (g.hasKey && dist(g.x, g.y, P.x, P.y) < 320) drawKeyIcon(g.hasKey, g.x + 18, g.y - 30, false);
    if (g.radio && dist(g.x, g.y, P.x, P.y) < 460) drawRadio(g.x - 19, g.y - 34);
    if (STAGE.zones) drawSharpEye(g);
    else if (P.disguise && !P.disguiseBlown && (g.elite || g.target) && dist(g.x, g.y, P.x, P.y) < 380) {  // 변장: 이 사람은 얼굴을 안다 (원 안에서 보이면 들킨다)
      ctx.strokeStyle = 'rgba(232,90,70,.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(g.x, g.y, 220, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      tag(g.x, g.y + 34, '얼굴을 안다', '#e85a46', 0.9);
    }
    if (g.lookout && !g.icon) { ctx.strokeStyle = '#f2c46b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.x - 7, g.y - 36); ctx.lineTo(g.x, g.y - 43); ctx.lineTo(g.x + 7, g.y - 36); ctx.moveTo(g.x - 7, g.y - 42); ctx.lineTo(g.x, g.y - 49); ctx.lineTo(g.x + 7, g.y - 42); ctx.stroke(); }
    if (g.elite) { ctx.fillStyle = '#c9c6b6'; ctx.beginPath(); ctx.moveTo(g.x, g.y - 34); ctx.lineTo(g.x - 6, g.y - 43); ctx.lineTo(g.x + 6, g.y - 43); ctx.closePath(); ctx.fill(); }
    if (g.state === 'CAPTIVE') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - g.captT / 9)); ctx.stroke(); }
    if (g.target) drawTargetRing(g,'rgba(194,54,43,.85)');
  }
  PM('guards');
  drawGhosts(); drawTagged();
  if (P.hide) { ctx.strokeStyle = 'rgba(127,174,134,.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(P.hide.x - 22, P.hide.y - 22, 44, 44); ctx.setLineDash([]); }
  // (땅 위 주인공은 어둠·화단 위에 그린다 — 아래쪽 참고)
  const vx0 = Math.max(0, Math.floor((cam.x - W / SCALE / 2) / TILE) - 2), vx1 = Math.min(MW - 1, Math.ceil((cam.x + W / SCALE / 2) / TILE) + 2);
  const vy0 = Math.max(0, Math.floor((cam.y - H / SCALE / 2) / TILE) - 2), vy1 = Math.min(MH - 1, Math.ceil((cam.y + H / SCALE / 2) / TILE) + 4);
  const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
  for (let ty = vy0; ty <= vy1; ty++) for (let tx = vx0; tx <= vx1; tx++) {
    const ch = G[ty][tx];
    if (ch === 'B') { const near = Math.abs(tx - ptx) <= 1 && Math.abs(ty - pty) <= 1 && P.hidden; if (kitOk(kitBush)) { const bs = S.bushShake, sh = bs && S.t - bs.t < 0.5 && Math.abs(bs.x - tc(tx)) < 30 && Math.abs(bs.y - tc(ty)) < 30 ? Math.sin((S.t - bs.t) * 45) * 3 * (1 - (S.t - bs.t) / 0.5) : 0; ctx.globalAlpha = near ? 0.5 : 0.96; ctx.drawImage(kitBush, tx * TILE - TILE / 2 + sh, (ty - 0.9) * TILE); ctx.globalAlpha = 1; continue; } const v = (tx * 7 + ty * 3) % 3; ctx.globalAlpha = near ? 0.5 : 0.96; blit(ctx, 'bush' + v, tx * TILE - 6, ty * TILE - 10, 60, 60); ctx.globalAlpha = 1; }
    if (ch === 'T') {
      if (kitT.length) {  // 키트 나무: 숲은 침엽수가 많고, 시내는 활엽수
        const hh = ((tx * 92821) ^ (ty * 68917)) >>> 0, pine = hh % 4 === 0;
        const im = kitT[pine ? 2 : hh % 3 === 0 ? 3 : 0];
        if (kitOk(im)) { ctx.drawImage(im, tx * TILE - TILE, (ty + 0.5 - 3.6) * TILE); continue; }
      }
      const v = (tx * 5 + ty * 3) % 3; blit(ctx, v === 0 ? 'treeR' : v === 1 ? 'pine' : 'treeP', tx * TILE - 24, ty * TILE - 52, 96, 96); }
  }
  PM('tiles');
  for (const f of S.fx) {
    if (f.k === 'slash') { const fr = Math.min(3, Math.floor(f.t / 0.06)); blit(ctx, 'fx_slash', f.x - 48, f.y - 48, 96, 96, fr * 32, 0, 32, 32); }
    if (f.k === 'smoke') { const fr = Math.min(5, Math.floor(f.t / 0.07)); blit(ctx, 'fx_smoke', f.x - 36, f.y - 44, 72, 72, fr * 32, 0, 32, 32); }
    if (f.k === 'muzzle' && f.t < 0.12) { const a = 1 - f.t / 0.12; ctx.fillStyle = `rgba(255,220,140,${a})`; ctx.beginPath(); ctx.arc(f.x, f.y, 9 * a + 3, 0, TAU); ctx.fill(); }  // 총구 불꽃
  }
  drawGunAim();
  if (S.keyDrop && (S.keyDrop.fl || 0) === flOf(S.player)) drawKeyIcon(S.keyDrop.key, S.keyDrop.x, S.keyDrop.y, true);
  for (const it of S.keyItems || []) if (!it.got && it.fl === flOf(S.player)) drawKeyIcon(it.key, it.x, it.y, true);
  for (const s of S.stones) {
    const k = Math.min(1, s.t / s.dur); const x = s.x0 + (s.x1 - s.x0) * k, y = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 30;
    ctx.fillStyle = '#c9ccd3'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
  }
  for (const k of S.kunais) {
    const f = Math.min(1, k.t / k.dur); const x = k.x0 + (k.tgt.x - k.x0) * f, y = k.y0 + (k.tgt.y - k.y0) * f;
    const a = Math.atan2(k.tgt.y - k.y0, k.tgt.x - k.x0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#d7dbe2'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(-10, -1.5, 6, 3); ctx.restore();
  }

  PM('fx');
  // 어둠
  if (!DBG.dark) darkPass(sc, S.lamps.filter(l => !flOf(l)), null);
  drawTownExterior();
  PM('dark');
  worldTransform(ctx, sc);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of S.lamps) {
    if (!lampOn(l) || flOf(l) || DBG.glow) continue;
    if (Math.abs(l.x - cam.x) > W / SCALE / 2 + l.r || Math.abs(l.y - cam.y) > H / SCALE / 2 + l.r) continue;  // 화면 밖
    const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7);
    const nn = NEONY() || !!l.col, lc = inkLampColor(l) || (NEONY() ? (Math.round(l.x + l.y) % 2 ? '255,60,170' : '60,236,255') : '255,186,105');
    gr.addColorStop(0, `rgba(${lc},${nn ? 0.14 : 0.07})`); gr.addColorStop(1, `rgba(${lc},0)`);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill();
    if(!l.outdoor) {ctx.fillStyle = nn ? `rgba(${lc},.95)` : 'rgba(255,214,150,.9)'; ctx.beginPath(); ctx.arc(l.x, l.y, nn ? 4.5 : 3.5, 0, TAU); ctx.fill();}
  }
  ctx.globalCompositeOperation = 'source-over';
  // 실내등 스위치는 광원과 떨어진 실제 벽 위치에 그린다.
  for(const l of S.lamps)if(!l.outdoor&&!flOf(l)&&l.control&&inView(l.control.x,l.control.y,40)){
    const p=l.control;ctx.fillStyle='#27302d';ctx.fillRect(p.x-4,p.y-7,8,13);ctx.strokeStyle='#858b7b';ctx.lineWidth=1;ctx.strokeRect(p.x-4,p.y-7,8,13);
    ctx.fillStyle=lampOn(l)?'#c5c6a3':'#5d655c';ctx.fillRect(p.x-1,p.y-4,3,7);
  }
  // The flashlight contributes to the same visibility field; its bulb is not a second cone.
  for(const g of S.guards)if(g.torch&&g.state!=='DEAD'&&g.state!=='CAPTIVE'&&flOf(g)===flOf(P)&&gVis(g)){
    ctx.fillStyle='#dfd6ab';ctx.beginPath();ctx.arc(g.x+Math.cos(g.a)*13,g.y+Math.sin(g.a)*13,2.5,0,TAU);ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  PM('glow+torch');
  if (NEONY() && !DBG.neon) drawNeonSigns();
  ctx.globalCompositeOperation = 'source-over';
  // 깨진 조명 표시
  for (const l of S.lamps) if (!l.outdoor && !flOf(l) && l.off && !l.broken) { ctx.strokeStyle = 'rgba(232,227,214,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, TAU); ctx.stroke(); }
  for (const l of S.lamps) if (!l.outdoor && !flOf(l) && l.broken) { ctx.strokeStyle = 'rgba(232,227,214,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l.x - 5, l.y - 5); ctx.lineTo(l.x + 5, l.y + 5); ctx.moveTo(l.x + 5, l.y - 5); ctx.lineTo(l.x - 5, l.y + 5); ctx.stroke(); }

  PM('neon+speech');
  // 내 모습은 어둠과 화단 위에 그려 언제나 확인할 수 있게 (숨은 상태면 반투명 + 외곽선)
  if (VF && VB >= 0 && GF[VF]) {
    const b = BLD[VB], bx = b.x0 * TILE, by = b.y0 * TILE, bw = (b.x1 - b.x0 + 1) * TILE, bh = (b.y1 - b.y0 + 1) * TILE;
    setLayer(VF);
    // 높이감: 바깥(땅)은 층이 높을수록 더 어둡게 가라앉고, 건물 그림자는 길어진다
    ctx.fillStyle = `rgba(4,6,12,${Math.min(0.62, 0.3 + VF * 0.1)})`; ctx.beginPath(); ctx.rect(cam.x - 6000, cam.y - 6000, 12000, 12000); ctx.rect(bx, by, bw, bh); ctx.fill('evenodd');
    const shd = 8 + VF * 7; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(bx + shd, by + shd, bw, bh);
    if (hasHeightCues(VB)) drawFloorThickness(b, VF);
    ctx.drawImage(floorCanvas(VB, VF), bx, by);
    { const tint = ['', '255,196,130', '140,196,255', '160,230,170', '226,170,255', '255,150,150'][VF] || '200,200,200'; ctx.fillStyle = `rgba(${tint},.09)`; ctx.fillRect(bx, by, bw, bh); }
    for (const w of S.fwindows) if (w.fl === VF && bldAt(w.tx, w.ty) === VB) drawWindow(w, 1);
    for (const d of S.decals) if (onFloor(d)) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = 'rgba(110,14,18,.82)'; ctx.beginPath(); ctx.ellipse(0, 0, d.r, d.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const it of S.items) if (!it.got && onFloor(it)) drawLootItem(it);
    for (const n of S.notes || []) if (onFloor(n)) drawNote(n);
    drawProps(VF);
    for (const c of S.corpses) if (!c.stashed && onFloor(c)) { ctx.globalAlpha = c.hidden ? 0.5 : 1; drawBody(c); ctx.globalAlpha = 1; }
    drawLoud(VF); drawCams(VF);
    if (!tactical && flOf(P) === VF) drawBlockEdges(P, input.scan);
    for (const g of S.guards) if (g.state !== 'DEAD' && onFloor(g) && !g.climb) { if (g.yank) drawYanked(g); else drawGuard(g); }
    darkPass(sc, S.lamps.filter(l => flOf(l) === VF), [bx, by, bw, bh], 'f' + VF);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of S.lamps) if (flOf(l) === VF && lampOn(l)) { const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.7), lc = inkLampColor(l) || '255,186,105'; gr.addColorStop(0, `rgba(${lc},${l.col ? 0.2 : 0.08})`); gr.addColorStop(1, `rgba(${lc},0)`); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.7, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hasHeightCues(VB) ? 'rgba(157,166,153,.65)' : 'rgba(242,196,107,.55)'; ctx.lineWidth = hasHeightCues(VB) ? 1.5 : 3; ctx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
    { const lab = `${VF + 1}층` + (BLD[VB].plate ? ' · ' + BLD[VB].plate : ''); ctx.font = uiFont(17); const tw = ctx.measureText(lab).width; ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(bx, by - 30, tw + 18, 26); ctx.fillStyle = '#f2c46b'; ctx.fillRect(bx, by - 30, 4, 26); ctx.textAlign = 'left'; ctx.fillText(lab, bx + 10, by - 11); }
    setLayer(0);
  }
  PM('floor');
  // Footstep sound is shown by its brief wave, never a second persistent oval around the player.
  PM('stepring');
  if (!P.hide && !P.z && (!P.jump || lowJ) && !P.vent && !travUp && !windowMotion) drawPlayer(P);
  PM('drawPlayer');
  // 키트 나무·화단: 주인공이 그 뒤(위쪽)에 있으면 잎을 반투명하게 한 번 더 덮어 '뒤에 숨은' 모습으로
  if (!P.z && !P.jump && !P.vent && !P.hide && !flOf(P)) {
    const ptx = Math.floor(P.x / TILE), pty = Math.floor(P.y / TILE);
    for (let ty = pty; ty <= pty + 3; ty++) for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
      const ch = G[ty] && G[ty][tx];
      if (ch === 'T' && ty > pty && kitT.length) { const hh = ((tx * 92821) ^ (ty * 68917)) >>> 0, pine = hh % 4 === 0, im = kitT[pine ? 2 : hh % 3 === 0 ? 3 : 0]; if (kitOk(im)) { ctx.globalAlpha = 0.55; ctx.drawImage(im, tx * TILE - TILE, (ty + 0.5 - 3.6) * TILE); ctx.globalAlpha = 1; } }
      if (ch === 'B' && P.hidden && tx === ptx && ty === pty && kitOk(kitBush)) { ctx.globalAlpha = 0.6; ctx.drawImage(kitBush, tx * TILE - TILE / 2, (ty - 0.9) * TILE); ctx.globalAlpha = 1; }
    }
  }
  PM('player');
  // 자경대원 시야·표시 (옥상 위 자경대원은 옥상을 그린 뒤에 따로)
  const guardOverlay = g => {
    if(g.doomed||g.ledgeFalling||g.containerMoving||g.yank&&['box','well'].includes(S.amb?.h?.type))return;
    drawWarnRing(g); drawReport(g);
    const fov = guardFov(g), rg = guardRanges(g);
    if (g.civ && g.state === 'SLEEP') { if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return; }
    if (g.state === 'TERROR') { ctx.strokeStyle = `rgba(190,120,255,${0.5 + 0.4 * Math.sin(S.t * 14)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 22, 0, TAU); ctx.stroke(); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return; }
    const col = g.civ ? (g.state === 'PANIC' ? '232,90,80' : '196,236,190') : guardAwareness(g).phase==='seen' ? ('230,70,60') : (guardAwareness(g).phase==='search'||guardAwareness(g).phase==='suspect') ? ('242,196,107') : ('170,200,235');
    // 시야는 그 자리의 밝기만큼만 뻗는다 (판정 canSee 와 같은 식): 어두운 곳은 짧게, 불빛·손전등 아래는 길게
    // 한 겹: 내 자세에 맞는 범위만 그린다 — 서 있으면 넓은 원뿔, 웅크리면(벽에 붙으면 더) 좁아진 원뿔. 바뀔 때 0.2초 동안 부드럽게 줄고 는다
    if (DBG.cone) return; const cn = guardCone(g, fov, rg); setLayer(0);
    // 쫓기는 중: 멀리 있는 시야는 옅게, 겁먹은 주민 시야·표시는 가까운 것만 — 나와 가까운 위협이 먼저 보이게
    const chs = chaseNow(), gd = chs ? dist(g.x, g.y, P.x, P.y) : 0;
    if (chs && g.civ) { if (gd < 220 && g.icon) drawEmote(g.icon, g.x, g.y - 30); return; }
    const awareness=guardAwareness(g),quiet=!tactical&&!input.scan&&['quiet','check'].includes(awareness.phase)&&!awareness.progress;
    const far = chs && gd > 380 ? 0.35 : quiet && !STAGE.firstSteps ? (quarterNear(P) ? .19 : .42) : 1;
    if (g.civ && !g.wary && g.state !== 'PANIC') {  // 경계하지 않는 주민: 시선만 옅게
      if(!quarterNear(P)||tactical||input.scan){ctx.fillStyle = 'rgba(196,236,190,.05)'; conePaths(g, cn, 1); ctx.fill();}
      if (g.bubble && !g.icon) drawEmote(g.bubble, g.x, g.y - 30); if (g.icon) drawEmote(g.icon, g.x, g.y - 30); return;
    }
    // Interpolate the boundary itself: one enemy, one filled field and one outline.
    conePaths(g,cn,1,S.coneK||0);
    ctx.fillStyle=`rgba(${col},${(.20*far).toFixed(3)})`;ctx.fill();
    ctx.strokeStyle=`rgba(${col},${(.34*far).toFixed(3)})`;ctx.lineWidth=1;ctx.stroke();
    if (g.bubble && !g.icon) drawEmote(g.bubble, g.x, g.y - 30);
    if (g.act === 'smoke' || vipRoutine(g)==='smoke') { const t = S.t * 1.5 + g.id; for (let i = 0; i < 3; i++) { const f = (t + i / 3) % 1; ctx.fillStyle = `rgba(210,215,222,${0.35 * (1 - f)})`; ctx.beginPath(); ctx.arc(g.x + Math.cos(g.a) * 14 + f * 8, g.y + Math.sin(g.a) * 14 - 24 - f * 16, 3 + f * 5, 0, TAU); ctx.fill(); } }
    // 왜 의심하는지: 들은 곳(귀) / 본 곳(눈) 으로 점선과 표시
    // 멀리 있는 경비의 점선은 그리지 않고(쫓기는 중엔 더 가까운 것만), 같은 자리의 '들었다/봤다'는 하나로 합친다
    if (S._poiT !== S.t) { S._poiT = S.t; S._poiL = []; }
    const pdist = dist(g.x, g.y, S.player.x, S.player.y);
    if (g.poi && !g.civ && ['NOTICE', 'SUSPICIOUS', 'SEARCH'].includes(g.state) && !g.reached && g.why !== 'exit' && pdist < (chaseNow() ? 260 : 450)) {
      ctx.strokeStyle = g.why === 'saw' ? 'rgba(255,120,90,.7)' : 'rgba(242,196,107,.7)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.poi.x, g.poi.y); ctx.stroke(); ctx.setLineDash([]);
      const dup = S._poiL.find(q => dist(q.x, q.y, g.poi.x, g.poi.y) < 80); if (dup) { dup.n++; } else { S._poiL.push({ x: g.poi.x, y: g.poi.y, n: 1 }); }
      if (!dup) {
      tag(g.poi.x, g.poi.y, g.why === 'saw' ? '봤다' : '들었다', g.why === 'saw' ? '#ff8a6a' : '#f2c46b', 0.9, null, 1.5);
    } }
    if (g.state === 'CHECK' && g.checks[0]) { const c = g.checks[0]; ctx.strokeStyle = 'rgba(242,196,107,.6)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); }
    const mk = !g.civ && !g.dog && (g.state === 'ALERT' || g.meter > 0.02 || g.icon === '?' || g.icon === '!');
    if (mk) {if(!g.eyeWatching)drawAwareMark(g);} else if (g.icon) drawEmote(g.icon, g.x, g.y - 30);
    if (mk && g.icon && g.icon !== '?' && g.icon !== '!') drawEmote(g.icon, g.x + 26, g.y - 30);
  };
  // 높이감: 옥상·전깃줄 위에 있으면 아래 거리가 한층 어둡고 푸르게 가라앉는다 (옥상은 그 위에 밝게 그려진다). 오르내릴 때는 서서히
  if (!tactical) { const el = P.wire ? Math.max(1, P.z) : P.jump ? Math.max(P.jump.z1 || 0, P.z || 0) : P.trav ? (P.trav.elev || (P.z || 0)) : (P.z || 0);
    const tgt = el > 0 ? Math.min(0.42, 0.22 + el * 0.08) : 0; S.hazeK = (S.hazeK || 0) + (tgt - (S.hazeK || 0)) * 0.12;
    if (S.hazeK > 0.01) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(4,8,20,${S.hazeK})`; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); } }
  PM('haze');
  for (const g of S.guards) {
    if ((VF && flOf(g) !== VF) || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.z || g.climb || !gVis(g) || (!tactical && (!inView(g.x,g.y,guardRanges(g).lit*(g.elite?1.1:1)+40) || coveredG(g, openB)))) continue;  // 시야 원뿔이 화면에 닿지 않는 사람은 건너뛴다
    guardOverlay(g);
  }
  PM('cones');
  const exteriorClip = clipExteriorFromInterior(VB, VF);
  if (!tactical) {
    if (!DBG.roofs) drawRoofs(openB); drawPlanks(); if (S.facOn) drawGangFlags(P);
    quarterWallEdges();
    drawRoofEntrances(P);
    PM('roofs');
    for (const c of S.corpses) if (!(c.hideT>S.t) && c.z && !c.stashed && !flOf(c) && inView(c.x, c.y, 120)) {
      ctx.globalAlpha = c.hidden ? .5 : 1; drawBody(c); ctx.globalAlpha = 1;
      if (c.ko && !c.carried) drawEmote('zz', c.x + 16, c.y - 6);
    }
    if (!flOf(P) && !P.z) drawWinWatch();  // 위층 창가에서 내려다보는 사람: 창문 밖으로 옅은 시선
    drawHeardSteps(P, openB, gVis);
    const front = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return BLD.some((b, i) => b.facade && i !== openB && ty === b.y1 + 1 && tx >= b.x0 - 1 && tx <= b.x1 + 1); };
    for (const g of S.guards) if (g.state !== 'DEAD' && !flOf(g) && !g.z && !g.climb && inView(g.x, g.y, 120) && !coveredG(g, openB) && front(g.x, g.y)) drawGuard(g);
    // 옥상 위·벽을 타는 자경대원
    for (const g of S.guards) if (g.state !== 'DEAD' && (g.z || g.climb) && inView(g.x,g.y,guardRanges(g).lit*(g.elite?1.1:1)+40) && (g.climb && g.climb.stairs ? flOf(g) === flOf(P) && (g.z || 0) === (P.z || 0) : (!flOf(g) || (g.climb && !(g.climb.to.fl && g.climb.from.fl))))) { drawGuard(g); if (!g.climb && g.state !== 'CAPTIVE') guardOverlay(g); else if (g.icon) drawEmote(g.icon, g.x, g.y - 30); }
    drawWindowSight(P, openB);
    if (input.scan) drawPlansFaint(P, openB);
    if (!P.z && (!P.jump || lowJ) && !P.hide && !P.vent && !travUp && !windowMotion && front(P.x, P.y)) drawPlayer(P);
  }
  PM('roofs2');
  if (S.poles.length) {
    const vx = W / SCALE / 2 + 80, vy = H / SCALE / 2 + 120;
    for (const o of S.poles) if (Math.abs(o.x - cam.x) < vx && Math.abs(o.y - cam.y) < vy) drawPole(o);
    drawWires();
  }
  drawOutdoorLampFixtures();
  if (exteriorClip) ctx.restore();
  if (P.z && !P.wire && !P.jump && !P.trav && !tactical && !input.scan) drawBlockEdges(P, false);
  if ((P.z || (P.jump && !lowJ) || P.wire || travUp || windowMotion) && !P.hide) drawPlayer(P);
  drawHideFlowVisual();
  if(!P.vent)drawAccessFlow();
  drawSignWork();
  drawLedgePull();
  if (P.vent && !tactical) {
    // 환풍구 층: 아래(방)는 어둡게 비치고, 덕트와 창살만 또렷하게
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(3,6,10,.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    ctx.globalAlpha = 0.92; drawBig(ctx, ventC, ...viewRect(60)); ctx.globalAlpha = 1;
    for (const v of S.vents) { ctx.strokeStyle = v.roof ? 'rgba(242,196,107,.8)' : 'rgba(127,214,204,.9)'; ctx.lineWidth = 2; ctx.strokeRect(v.x - 13, v.y - 13, 26, 26); ctx.fillStyle = v.roof ? 'rgba(242,196,107,.25)' : 'rgba(127,214,204,.18)'; ctx.fillRect(v.x - 13, v.y - 13, 26, 26); }
    drawPlayer(P);
    drawAccessFlow();
  }
  setLayer(flOf(P));
  PM('poles');
  if (running && !tactical && !DBG.ui) drawLastSeen();
  if (S.entrySel) STAGE.entries.forEach((e, i) => { const p = entryPos(e), pulse = 0.6 + 0.4 * Math.sin(S.t * 5 + i); ctx.strokeStyle = `rgba(242,196,107,${pulse})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(242,196,107,.95)'; ctx.font = uiFont(30); ctx.textAlign = 'center'; ctx.fillText(String(i + 1), p.x, p.y + 10); tag(p.x, p.y - 52, e.name, '#f2c46b'); });
  // 맨홀 속에 숨어 있거나 살피기 중이면 지하 수로·덕트 길을 비춰 보여 준다
  { const P = S.player, inWell = P.hide && P.hide.type === 'well';
    if (running && !P.under && !P.vent && (input.scan || tactical || inWell)) {
      const k = inWell ? 0.5 : 0.36; ctx.globalAlpha = k * (0.8 + 0.2 * Math.sin(S.t * 3)); if (ugC) drawBig(ctx, ugC, ...viewRect(60));
      if (!inWell && ventC) { ctx.globalAlpha = 0.42; drawBig(ctx, ventC, ...viewRect(60)); } ctx.globalAlpha = 1;
      if (inWell) for (const h of S.hides) if (h.type === 'well' && h !== P.hide && ugAt(h.tx, h.ty)) { ctx.strokeStyle = 'rgba(150,200,255,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(h.x, h.y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    } }
  if (input.scan && running && !tactical && !flOf(P)) drawBlockEdges(P, true);
  PM('misc');
  if ((input.scan || tactical) && running) drawScan(openB);
  else if (running && !tactical) { drawNearMarks(P, openB); drawPushHint(); }
  PM('nearmarks');
  if(running){drawSkillDevices(P,openB);drawEffects(P,openB);drawAssassinTargets();}
  if (running && !tactical) drawStairGlow(P, openB);
  if (running && STAGE.zones) drawZones(P);
  if(isTouch&&running&&!tactical&&!P.vent&&!P.under&&(P.hide||P.car)){const at=P.hide||P.car;drawPlayerLocator({...P,x:at.x,y:at.y-10});}
  if (running && !tactical) { drawAwareness(S.player); drawCoverPush(S.player); if (!S.over) drawKillBlock(); drawRadioCall(); drawPickProgress(S.player); }
  if (running) { drawOpps(P); drawStoryMark(P); drawHoldRing(); drawEnvSelection(); drawPlanFixtures(P); drawDiningFixtures(); drawRendezvousPhone(); drawInkClubSigns(P); drawAccessCues(P); drawContactFeedback(); if (!tactical) drawCorpseRisk(); }
  if(running && tactical) drawKnownTargets();
  if (running && !tactical && !S.over) drawGoal(P);
  PM('overlays');
  if (running && !tactical) drawOffscreen();
  // 행동 표시
  if (running && !S.over && !S.entrySel && !tactical && !DLG.modal) {
    const pa = envAction(), ka = attackAction(), ga = grabAction();
    if (pa.choices > 1) {  // 겹친 대상: 다른 후보는 옅은 점선 고리, 고른 대상 위엔 '1/3 · F/⇄ 바꾸기'
      const pos = a => { if(a.c&&a.k!=='retrieve'){const m=actorMarker(a.c,a.c);return{x:m.x,y:m.y};}const o = actObj(a); if (a.k === 'fdown') return downMark(a.l); if (a.wv) return { x: a.wv.w.x, y: a.wv.w.y }; if (a.n && a.n.u) return surfacePoint(usePoint(a.n.u));if(objectActionPoint(a)?.surface)return surfacePoint(objectActionPoint(a)); if (a.k === 'down' && o) return o.roofDoor || { x: o.rx != null ? o.rx : o.ux, y: o.ry != null ? o.ry : o.uy }; return a.at || (o && o.x != null ? { x: o.x, y: o.y } : null); };
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(242,196,107,.55)';
      ctx.setLineDash([]);
      const p = pos(pa); if (p) { const lab = `${pa.choiceI + 1}/${pa.choices} · ${document.body.classList.contains('touch') ? '[대상]' : 'Tab'} 바꾸기`; ctx.font = uiFont(11); const tw = ctx.measureText(lab).width + 12;
        ctx.fillStyle = 'rgba(7,10,18,.85)'; ctx.fillRect(p.x - tw / 2, p.y + 26, tw, 17); ctx.fillStyle = '#f2c46b'; ctx.textAlign = 'center'; ctx.fillText(lab, p.x, p.y + 38); }
    }
    const ring = (g,col,c) => drawTargetRing(g,col,c);
    prWarmNear(ka.g || ka.kill || ka.stalk || ga.g || (P.captive) || null);
    if (ka.list) ka.list.forEach(g => ring(g, '#c4d3cd'));
    if (ka.k !== 'none' && ka.k !== 'counter' && (ka.g || ka.kill)) ring(ka.g || ka.kill, ka.holdOnly?'#e8473c':'#c4d3cd',ka.c);
    if (ka.k === 'counter') { ring(ka.g, '#f2c46b'); tag(ka.g.x, ka.g.y - 46, '지금 [공격] — 반격', '#f2c46b', 1); }
    if (pa.k === 'lamp') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pa.l.x, pa.l.y, 16, 0, TAU); ctx.stroke(); }
    if (pa.k === 'down' && pa.l.roofDoor) {
      const d = pa.l.roofDoor; ctx.save(); ctx.strokeStyle = '#f2c46b'; ctx.fillStyle = 'rgba(242,196,107,.12)'; ctx.lineWidth = 2;
      if (!d.dx) { ctx.fillRect(d.x - 12, d.y - 32, 24, 32); ctx.strokeRect(d.x - 12, d.y - 32, 24, 32); }
      else { const sx = -d.dx * 8; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + sx, d.y + 4); ctx.lineTo(d.x + sx, d.y - 25); ctx.lineTo(d.x, d.y - 30); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    if (pa.k === 'leap') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + tc(pa.j.tx)) / 2, (P.y + tc(pa.j.ty)) / 2 - 40, tc(pa.j.tx), tc(pa.j.ty)); ctx.stroke(); ctx.setLineDash([]); }
    if (pa.k === 'wireOn') { ctx.strokeStyle = 'rgba(224,176,112,.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pa.at.x, pa.at.y, 16 + Math.sin(S.t * 8) * 2, 0, TAU); ctx.stroke(); }
    S.paNow = pa; drawActLabels(pa, P, ka, ga);
    const nc = !P.carrying && nearCorpse();
    if(nc&&nc!==ka.c){ctx.setLineDash([5,5]);drawTargetRing(nc,'rgba(232,227,214,.8)',nc);ctx.setLineDash([]);}
    if (input.aiming && !['kunai','blade','hack'].includes(input.tool)) {
      const ap = aimPoint();
      if (ap) {
        const col = input.tool === 'coin' ? '242,196,107' : '215,220,230';
        ctx.strokeStyle = `rgba(${col},.85)`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + ap.x) / 2, (P.y + ap.y) / 2 - ap.d * 0.25, ap.x, ap.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ap.x, ap.y, 12, 0, TAU); ctx.stroke();
        if (input.tool === 'stone') { ctx.strokeStyle = `rgba(${col},.25)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ap.x, ap.y, 240, 0, TAU); ctx.stroke(); }
        tag(ap.x, ap.y - 26, `${TOOL_NAME[input.tool]} — ${input.tool==='radio'?'놓으면 사용':'놓으면 던짐'}`, `rgb(${col})`);
      }
    }
    if (input.aiming && input.queue && input.queue.length) input.queue.forEach((q, i) => {  // 예약한 행동
      const tx = q.tgt ? q.tgt.x : q.pt ? q.pt.x : P.x, ty = q.tgt ? q.tgt.y : q.pt ? q.pt.y : P.y;
      ctx.strokeStyle = 'rgba(127,214,204,.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, 14, 0, TAU); ctx.stroke(); tag(tx, ty - 26, `예약 ${i + 1} · ${TOOL_NAME[q.tool]}`, '#7fd6cc');
    });
    const kt=input.aiming&&['kunai','blade'].includes(input.tool)?kunaiTarget():null;
    if(kt&&input.aiming&&['kunai','blade'].includes(input.tool)) { ctx.strokeStyle = 'rgba(215,219,226,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(kt.x, kt.y); ctx.stroke(); ctx.setLineDash([]); tag(kt.x, kt.y - 28, input.tool==='blade'?'쿠나이 — 길게 누른 뒤 놓으면 처치':'다트 — 짧게 기절 · 길게 처치', '#d7dbe2'); }
    if (kt && input.aiming) {
      ctx.save(); ctx.translate(kt.x, kt.y); ctx.rotate(S.t * 1.5); ctx.strokeStyle = 'rgba(215,219,226,.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(14, 0); ctx.lineTo(0, 14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  }
  PM('actions');
  flushTags();  // 행동 안내를 먼저 배치한다. 말풍선은 행동과 인물을 피해 남는 자리에 둔다.
  drawSpeech(); PM('tags');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (input.aiming && running && !S.over) {  // 조준하는 동안 세상은 멈춰 있다 — 화면 테두리와 글로 알려 준다
    ctx.strokeStyle = 'rgba(120,190,255,.45)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.fillStyle = 'rgba(8,14,26,.72)'; const lw = 170 * DPR; ctx.fillRect(canvas.width / 2 - lw / 2, canvas.height - 150 * DPR, lw, 26 * DPR);
    ctx.fillStyle = 'rgba(168,220,255,.95)'; ctx.font = uiFont(13 * DPR); ctx.textAlign = 'center'; ctx.fillText('시간 멈춤 · 조준 중', canvas.width / 2, canvas.height - 132 * DPR);
  }
  if (input.aiming && running && !S.over) {
    ctx.fillStyle = 'rgba(30,60,110,.22)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,30,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(DPR, DPR); ctx.font = uiFont(13); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,220,255,.9)'; ctx.fillText(input.aiming && input.aiming.off ? '여기서 놓으면 취소' : isTouch ? '시간 멈춤 — 조이스틱으로 방향·거리, 떼면 던진다 · 버튼 밖으로 끌어 떼면 취소' : `시간 멈춤 — 방향키로 겨누고 ${KK('tool')}를 떼면 사용 · Esc 취소`, W / 2, H - (isTouch ? 230 : 70)); ctx.restore();
  }
  if (S.flash > 0) { ctx.fillStyle = `rgba(140,10,16,${S.flash * 1.2})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${S.fade * 1.6})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  PM('screen');
}


// 위층 창가에서 바깥을 내려다보는 사람: 바깥(1층 높이)에서 볼 때 창문에서 뻗는 옅은 시선 부채꼴 (winSee 와 같은 조건)
