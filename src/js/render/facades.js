function drawFacade(b) {
  const y = b.y1 * TILE;
  if (!b.fl || S.t - b.flT > 0.3) { b.flT = S.t; b.fl = []; for (let tx = b.x0; tx <= b.x1; tx++) b.fl.push(lightAt(tc(tx), y + TILE + 14)); }
  if(freeCityBuilding(b)&&freeCityReady())return drawCityFacade(b);
  if(STAGE.industrialBuildings?.includes(BLD.indexOf(b)))return drawDepotFacade(b);
  if (b.kind === 'shop') return drawShopFacade(b);
  const wn = n => (b.alt ? n + 'B' : n);
  const glow = (x, yy, tx, r) => {  // 도시: 불 켜진 창 몇 개 (촛불·등잔빛)
    const h = ((tx * 92821) ^ ((b.y1 - r) * 68917) ^ (b.x0 * 31)) >>> 0;
    if (h % 5) return; const fl = 0.85 + 0.15 * Math.sin(S.t * 3 + tx);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,170,80,${0.42 * fl})`; ctx.fillRect(x + 12, yy + 10, 24, 26); ctx.globalCompositeOperation = 'source-over';
  };
  // 위층 벽: 한 칸 걸러 창, 층 사이에 작은 처마(도시는 띠)
  for (let r = 1; r < b.fh; r++) {
    const yy = (b.y1 - r) * TILE;
    for (let tx = b.x0; tx <= b.x1; tx++) {
      const x = tx * TILE;
      blit(ctx, wn(tx === b.x0 ? 'fWallL' : tx === b.x1 ? 'fWallR' : 'fWall'), x, yy, TILE, TILE);
      const win = tx > b.x0 && tx < b.x1 && (tx - b.x0) % 2 === 1;
      if (win) blit(ctx, b.alt ? 'fWinB' : 'fWin', x, yy, TILE, TILE);
      const l = b.fl[tx - b.x0]; ctx.fillStyle = `rgba(4,8,22,${0.68 * (1 - clamp(l, 0, 1)) + 0.06 * r})`; ctx.fillRect(x, yy, TILE, TILE);
      if (win) glow(x, yy, tx, r);
    }
    const by = yy + TILE;  // 층 사이 처마 띠
    for (let tx = b.x0; tx <= b.x1; tx++) blit(ctx, wn('fBand'), tx * TILE, by - 13, TILE, 26, 0, 3, 16, 9); ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(b.x0 * TILE, by - 13, (b.x1 - b.x0 + 1) * TILE, 26);
  }
  for (let tx = b.x0; tx <= b.x1; tx++) {
    const x = tx * TILE, ch = G[b.y1][tx];
    const door = S.doors.find(d => d.tx === tx && d.ty === b.y1);
    if (b.piloti) {  // 필로티: 어두운 주차장 입구 + 콘크리트 기둥 + 위층 바닥판
      ctx.fillStyle = '#0b0d12'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(70,74,84,.5)'; ctx.fillRect(x, y + 6, TILE, 4);
      if (ch === 'I') { ctx.fillStyle = '#8c8f97'; ctx.fillRect(x + 14, y, 20, TILE); ctx.fillStyle = '#b3b6bd'; ctx.fillRect(x + 14, y, 5, TILE); ctx.fillStyle = '#5d6068'; ctx.fillRect(x + 29, y, 5, TILE); }
      ctx.fillStyle = '#9a9ca3'; ctx.fillRect(x, y, TILE, 6);
    } else if (door) { blit(ctx, wn('fWall'), x, y, TILE, TILE); blit(ctx, door.locked ? 'fDoor' : 'fDoorOpen', x, y, TILE, TILE); if (door.locked && door.keyLock) { ctx.fillStyle = keyCol(door.keyLock); ctx.fillRect(x + 19, y + 22, 10, 10); } }
    else {
      blit(ctx, wn(tx === b.x0 ? 'fWallL' : tx === b.x1 ? 'fWallR' : (tx * 7 + b.y1) % 5 === 0 ? 'fWall2' : 'fWall'), x, y, TILE, TILE);
      if (ch === 'N') blit(ctx, b.alt ? 'fWinB' : 'fWin', x, y, TILE, TILE);
      if (ch === 'S') { ctx.strokeStyle = 'rgba(40,24,14,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 22, y + 6); ctx.lineTo(x + 17, y + 20); ctx.lineTo(x + 27, y + 30); ctx.lineTo(x + 21, y + 44); ctx.stroke(); }
    }
    const l = b.fl[tx - b.x0]; ctx.fillStyle = `rgba(4,8,22,${0.62 * (1 - clamp(l, 0, 1))})`; ctx.fillRect(x, y, TILE, TILE);
  }
  const top = (b.y1 - b.fh + 1) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(b.x0 * TILE, top, (b.x1 - b.x0 + 1) * TILE, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.strokeRect(b.x0 * TILE + 1, top, (b.x1 - b.x0 + 1) * TILE - 2, b.fh * TILE);
}
// 상가 건물 정면: 회색 콘크리트 + 층마다 띠창 + 간판 (전쟁 뒤라 몇 개는 꺼지거나 글자가 빠졌다)
// 네온 간판: 어둠 위에 다시 그리고 번지는 빛을 더한다 (깜빡이는 것도 있다) + 빌딩 세로 간판
function drawNeonSigns() {
  const t = S.t;
  BLD.forEach((b, i) => {
    if (!b.facade || b.kind !== 'shop' || i === S.openB) return;
    const list = (b.signRects || []).slice();
    if (b.fh >= 3) { const txt = (b.plate || b.name || '').replace(/\s/g, ''); if (txt) { const vx = b.x1 * TILE + 8, vy = (b.y1 - b.fh + 1) * TILE + 10, vh = Math.min(txt.length * 22 + 14, (b.fh - 1) * TILE - 10); list.push({ x: vx, y: vy, w: 30, h: vh, c: [['#ff3ca8', '#ffe0f4'], ['#3ce0ff', '#e0fbff'], ['#b45aff', '#f2e0ff']][i % 3], txt, on: true, vert: true, k: 9 }); } }
    for (const r of list) {
      const flick = r.on ? (((i * 7 + r.k * 13 + Math.floor(t * 9)) % 53 === 0) ? 0.25 : 1) : (Math.sin(t * 23 + i) > 0.6 ? 0.6 : 0.12);
      const rgb = hexRgb(r.c[0]);
      ctx.globalCompositeOperation = 'lighter';
      for (const [pad, a] of [[22, 0.08], [12, 0.15], [4, 0.28]]) { ctx.fillStyle = `rgba(${rgb},${a * flick})`; ctx.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 + 0.65 * flick; ctx.fillStyle = '#0c0a12'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = r.c[0]; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.fillStyle = r.c[1]; ctx.font = uiFont(15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (r.vert) { [...r.txt].forEach((ch, k) => { if (14 + k * 22 < r.h) ctx.fillText(ch, r.x + r.w / 2, r.y + 14 + k * 22); }); } else ctx.fillText(r.txt, r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
    }
  });
}
function drawShopFacade(b) {
  const x0 = b.x0 * TILE, wAll = (b.x1 - b.x0 + 1) * TILE, hs = ((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0;
  b.signRects = []; const club = (b.floorsUse || []).includes('club');
  const COLS = [['#c8402e', '#fff4d8'], ['#2a5aa8', '#ffffff'], ['#f2c02a', '#2a2018'], ['#2a8a5a', '#ffffff'], ['#6a2a8a', '#ffe8ff'], ['#e86a2a', '#ffffff']];
  for (let r = b.fh - 1; r >= 0; r--) {
    const yy = (b.y1 - r) * TILE;
    ctx.fillStyle = club ? '#16121c' : '#80858f'; ctx.fillRect(x0, yy, wAll, TILE); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x0, yy, wAll, 3);
    if (r === 0) {
      // 1층: 유리 진열창 + 문 + 차양
      ctx.fillStyle = '#18222c'; ctx.fillRect(x0 + 6, yy + 12, wAll - 12, TILE - 12);
      for (let tx = b.x0; tx <= b.x1; tx++) { ctx.fillStyle = '#9aa0aa'; ctx.fillRect(tx * TILE, yy + 12, 3, TILE - 12); }
      for (const d of S.doors) if (d.ty === b.y1 && d.tx >= b.x0 && d.tx <= b.x1) { const dx = d.tx * TILE; ctx.fillStyle = d.locked ? '#3a4656' : '#05070a'; ctx.fillRect(dx + 6, yy + 14, 36, TILE - 14); ctx.fillStyle = '#c8ccd2'; ctx.fillRect(dx + 22, yy + 26, 4, 10); if (d.locked && d.keyLock) { ctx.fillStyle = keyCol(d.keyLock); ctx.fillRect(dx + 18, yy + 34, 12, 9); } }
      if ((hs + r) % 4 !== 0 && !mainPowerOff({x:(b.x0+b.x1+1)*TILE/2,y:(b.y0+b.y1+1)*TILE/2})) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,230,255,.10)'; ctx.fillRect(x0 + 6, yy + 12, wAll - 12, TILE - 12); ctx.globalCompositeOperation = 'source-over'; }
      for (let k = 0; k * 16 < wAll; k++) { ctx.fillStyle = k % 2 ? '#e8e4dc' : COLS[hs % COLS.length][0]; ctx.fillRect(x0 + k * 16, yy, 16, 12); }
    } else {
      if (b.glass) {  // 유리 외벽(커튼월): 칸마다 유리, 몇 칸은 사무실 불이 켜져 있다
        for (let tx = b.x0; tx <= b.x1; tx++) { const px = tx * TILE, hh = ((tx * 92821) ^ (r * 68917) ^ hs) >>> 0;
          const g2 = ctx.createLinearGradient(px, yy, px + TILE, yy + TILE); g2.addColorStop(0, '#1c3a52'); g2.addColorStop(1, '#0e1c2c'); ctx.fillStyle = g2; ctx.fillRect(px, yy + 2, TILE, TILE - 2);
          if (hh % 5 === 0 && !mainPowerOff({x:(b.x0+b.x1+1)*TILE/2,y:(b.y0+b.y1+1)*TILE/2})) { ctx.fillStyle = hh % 2 ? 'rgba(255,236,190,.55)' : 'rgba(210,235,255,.5)'; ctx.fillRect(px + 3, yy + 6, TILE - 6, TILE - 12); }
          ctx.fillStyle = 'rgba(160,210,240,.16)'; ctx.beginPath(); ctx.moveTo(px + 6, yy + TILE - 4); ctx.lineTo(px + 20, yy + 4); ctx.lineTo(px + 28, yy + 4); ctx.lineTo(px + 14, yy + TILE - 4); ctx.fill();
          ctx.fillStyle = '#8a929e'; ctx.fillRect(px, yy, TILE, 3); ctx.fillRect(px, yy, 2, TILE); }
      } else
      for (let tx = b.x0 + 1; tx < b.x1; tx++) { const px = tx * TILE; ctx.fillStyle = '#1e2a36'; ctx.fillRect(px, yy + 16, TILE, 26); ctx.fillStyle = 'rgba(160,200,230,.18)'; ctx.fillRect(px + 4, yy + 18, 10, 22); ctx.fillStyle = '#5d626c'; ctx.fillRect(px, yy + 16, 2, 26); }
    }
    const l = b.fl[Math.floor((b.x1 - b.x0) / 2)]; ctx.fillStyle = `rgba(4,8,22,${0.6 * (1 - clamp(l, 0, 1)) + 0.05 * r})`; ctx.fillRect(x0, yy, wAll, TILE);
  }
  drawShopSigns(b);
  const top = (b.y1 - b.fh + 1) * TILE;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x0, top, wAll, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, top, wAll - 2, b.fh * TILE);
}
// 상가 간판 (층마다 하나, 몇 개는 꺼져 있다) — 네온 빛은 drawNeonSigns 가 어둠 위에 더한다
function drawShopSigns(b) {
  const x0 = b.x0 * TILE, wAll = (b.x1 - b.x0 + 1) * TILE, hs = ((b.x0 * 73856093) ^ (b.y0 * 19349663)) >>> 0;
  b.signRects = []; const club = (b.floorsUse || []).includes('club');
  const COLS = [['#c8402e', '#fff4d8'], ['#2a5aa8', '#ffffff'], ['#f2c02a', '#2a2018'], ['#2a8a5a', '#ffffff'], ['#6a2a8a', '#ffe8ff'], ['#e86a2a', '#ffffff']];
  for (let r = b.fh - 1; r >= 0; r--) {
    const yy = (b.y1 - r) * TILE;
    // 간판
    const txt = (b.signs || [])[r]; if (!txt||signReplacesFacade(b,r)) continue;
    const c = COLS[(hs + r * 3) % COLS.length], on = ((hs >> (r + 2)) % 3) !== 0;
    const bw = Math.min(wAll - 24, Math.max(110, txt.length * 26 + 30)), bx = x0 + 12 + ((hs + r * 7) % Math.max(1, wAll - 24 - bw)), by = r === 0 ? yy - 22 : yy + 1;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(bx + 3, by + 3, bw, 20);
    ctx.fillStyle = c[0]; ctx.fillRect(bx, by, bw, 20); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(bx + 1, by + 1, bw - 2, 18);
    ctx.font = uiFont(15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = c[1]; ctx.fillText(txt, bx + bw / 2, by + 11); ctx.textBaseline = 'alphabetic'; b.signRects.push({ x: bx, y: by, w: bw, h: 20, c, txt, on: on || club, k: r });
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,.12)'; ctx.fillRect(bx, by, bw, 20); ctx.globalCompositeOperation = 'source-over'; }
    else { ctx.fillStyle = 'rgba(4,8,22,.45)'; ctx.fillRect(bx, by, bw, 20); }
  }
}
// 굴뚝: 옥상 위 벽돌 기둥. 불이 타면 연기가 오른다
function drawChimney(l) {
  const x = l.ux, y = l.uy, lit = lampOn(l.lamp);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 13, y - 9, 30, 28);
  ctx.fillStyle = '#9a4a32'; ctx.fillRect(x - 16, y - 18, 30, 30);
  ctx.fillStyle = '#7a3624'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 16, y - 18 + i * 8, 30, 1.5);
  ctx.fillStyle = '#b8603f'; ctx.fillRect(x - 16, y - 18, 30, 4);
  ctx.fillStyle = '#120c0a'; ctx.fillRect(x - 9, y - 11, 16, 14);
  ctx.strokeStyle = '#2a1410'; ctx.lineWidth = 2; ctx.strokeRect(x - 16, y - 18, 30, 30);
  if (lit) { ctx.fillStyle = 'rgba(255,150,60,.55)'; ctx.fillRect(x - 7, y - 3, 12, 5); const t = S.t * 0.9; for (let i = 0; i < 4; i++) { const f = (t + i / 4) % 1; ctx.fillStyle = `rgba(200,200,205,${0.45 * (1 - f)})`; ctx.beginPath(); ctx.arc(x - 1 + Math.sin(f * 5 + i) * 6 + f * 10, y - 8 - f * 46, 5 + f * 9, 0, TAU); ctx.fill(); } }
}
// 환풍구 창살: 청록 테두리 + 가로 창살. 열려 있으면 검은 구멍
function drawGrate(v,alpha){if(S.player.trav?.accessFlow?.obj===v)return;ctx.save();ctx.globalAlpha=alpha;drawVent(v,'all',ctx,v.open?1:0);ctx.restore();}


// Authored steel shutters and painted Korean signs for the opening freight yard.
// Cosmetic texture uses coordinate hashes, never the AI random stream.
function drawCityFacade(b){
 const x=b.x0*TILE,y=(b.y1-b.fh+1)*TILE,w=(b.x1-b.x0+1)*TILE,h=b.fh*TILE;
 ctx.save();ctx.imageSmoothingEnabled=false;paintFreeCityWall(ctx,b,x,y,w,h);
 drawFreeDepotDetails(ctx,b,x,y,w,h);
 const text=(b.plate||b.name||'야간 사무동'),sw=Math.min(w-24,Math.max(84,text.length*9+18)),sy=y+2;
 b.signRects=[];
 ctx.fillStyle=cityBuildingStyle(b)==='brick'?'#633e31':'#253b4b';ctx.fillRect(x+10,sy,sw,14);ctx.strokeStyle='#a3aaa5';ctx.lineWidth=1;ctx.strokeRect(x+10.5,sy+.5,sw-1,13);
 ctx.fillStyle='#e0dfd2';ctx.font=uiFont(10,700);ctx.textAlign='left';ctx.fillText(text,x+18,sy+11,sw-16);
 for(let f=1;f<b.fh;f++){const yy=(b.y1-f+1)*TILE;ctx.fillStyle='#14233099';ctx.fillRect(x,yy-1,w,2);}
 for(let tx=b.x0;tx<=b.x1;tx++){const l=b.fl?.[tx-b.x0]??.2;ctx.fillStyle=`rgba(4,8,22,${.45*(1-clamp(l,0,1))})`;ctx.fillRect(tx*TILE,y,TILE,h);}
 ctx.fillStyle='#16212c';ctx.fillRect(x,y+h-3,w,3);ctx.restore();
}
function drawDepotFacade(b){
 const x=b.x0*TILE,y=(b.y1-b.fh+1)*TILE,w=(b.x1-b.x0+1)*TILE,h=b.fh*TILE;
 ctx.save();ctx.fillStyle='#39494f';ctx.fillRect(x,y,w,h);
 if(!paintFreeCityWall(ctx,b,x,y,w,h))for(let px=0;px<w;px+=8){ctx.fillStyle=px%24===0?'#657078':'#46575c';ctx.fillRect(x+px,y,2,h);}
 const cityOpen=freeCityBuilding(b)&&freeCityReady()&&(freeCityFront(b).windows.length||freeCityFront(b).doors.length);
 if(!cityOpen){
 const gateW=Math.min(w-88,192),gateX=x+Math.floor((w-gateW)/2),gateY=y+Math.max(18,h-62),gateH=y+h-gateY;
 ctx.fillStyle='#17232b';ctx.fillRect(gateX-5,gateY-5,gateW+10,gateH+5);ctx.fillStyle='#4b585f';ctx.fillRect(gateX,gateY,gateW,gateH);
 for(let py=2;py<gateH;py+=6){ctx.fillStyle='#293940';ctx.fillRect(gateX,gateY+py,gateW,2);ctx.fillStyle='#647078';ctx.fillRect(gateX,gateY+py+2,gateW,1);}
 ctx.fillStyle='#8c8b78';ctx.fillRect(gateX+gateW/2-11,y+h-13,22,3);
 }
 for(let i=0;i<10;i++){const px=(i*97+b.x0*31)%(w-12);ctx.fillStyle='rgba(112,83,61,.3)';ctx.fillRect(x+px,y+h-9-(i%3)*4,4,5+(i%4)*2);}
 const paid=freeCityBuilding(b)&&freeCityReady()&&freeCityArt===A.dotonbori;
 if(paid){
  for(let f=1;f<b.fh;f++){const by=y+h-f*TILE;ctx.fillStyle='#15232b';ctx.fillRect(x,by-2,w,5);ctx.fillStyle='#84929b';ctx.fillRect(x,by-2,w,1);ctx.fillStyle='#080f1644';ctx.fillRect(x,by+3,w,3);}
  ctx.fillStyle='#16232b';ctx.fillRect(x,y+h-7,w,7);ctx.fillStyle='#5d6a70';ctx.fillRect(x,y+h-7,w,1);
 }
 const signH=paid?14:23,front=paid&&b.fh===1?freeCityFront(b):null,signW=front?Math.max(44,Math.min(132,...front.windows.concat(front.doors).map(o=>o.x-x-44))):132;
 ctx.fillStyle='#192930';ctx.fillRect(x+18,y+3,signW,signH);ctx.strokeStyle='#78898b';ctx.lineWidth=1;ctx.strokeRect(x+18.5,y+3.5,signW,signH);
 ctx.fillStyle='#d9dccf';ctx.textAlign='left';ctx.font=uiFont(paid?11:15,700);ctx.fillText(b.name||'물류 창고',x+25,y+(paid?14:21),signW-14);
 if(!freeCityBuilding(b)){ctx.fillStyle='#a1b4b2';ctx.fillRect(x+w-55,y+14,27,16);ctx.fillStyle='#243b46';ctx.fillRect(x+w-52,y+17,21,10);ctx.fillStyle='#8b9b98';ctx.fillRect(x+w-43,y+15,2,14);}

 drawFreeDepotDetails(ctx,b,x,y,w,h);
 for(let tx=b.x0;tx<=b.x1;tx++){const light=b.fl?.[tx-b.x0]??.2;ctx.fillStyle=`rgba(4,8,22,${.62*(1-clamp(light,0,1))})`;ctx.fillRect(tx*TILE,y,TILE,h);}
 ctx.fillStyle='#18272f';ctx.fillRect(x,y,w,5);ctx.fillRect(x,y+h-4,w,4);ctx.restore();
}
