function worldTransform(c, scale) { let sx = 0, sy = 0; if (S && S.shakeT > 0) { const a = S.shakeT * 22 * DPR; sx = Math.sin(S.t * 91) * a; sy = Math.cos(S.t * 73) * a * 0.7; } c.setTransform(scale, 0, 0, scale, W / 2 * DPR - cam.x * scale + sx, H / 2 * DPR - cam.y * scale + sy); }
function drawKeyIcon(k, x, y, ring) {
  if (!k || k === 'gold') return drawItemIcon('it_key', x, y, S.t, ring);
  const bob = Math.sin(S.t * 3) * 2, c = keyCol(k);
  if (ring) { ctx.strokeStyle = c; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(S.t * 4) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 11, y - 7 + bob, 24, 17);
  ctx.fillStyle = c; ctx.fillRect(x - 12, y - 9 + bob, 24, 16); ctx.fillStyle = '#f4f2ea'; ctx.fillRect(x - 9, y - 6 + bob, 7, 5); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 12, y + 3 + bob, 24, 3);
}
function drawItemIcon(name, x, y, t, ring) { if (window.__skip && window.__skip.ui) return;  // 첫 화면 배경 찍기: 글자·표시 없이
  const bob = Math.sin(t * 3) * 2;
  if (ring) { ctx.strokeStyle = 'rgba(242,196,107,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18 + Math.sin(t * 4) * 2, 0, TAU); ctx.stroke(); }
  const f = F[name]; const k = 32 / Math.max(f[2], f[3]); blit(ctx, name, x - f[2] * k / 2, y - f[3] * k / 2 + bob, f[2] * k, f[3] * k);
}
function drawNote(n) {
  const {x,y}=surfacePoint(n);
  ctx.save();ctx.translate(x,y);ctx.rotate(-.12);
  ctx.fillStyle='#11171366';ctx.fillRect(-9,-5,20,14);
  ctx.fillStyle=n.read?'#b4ad98':'#d5cbb2';ctx.fillRect(-10,-7,18,13);
  ctx.fillStyle='#f0e5cb';ctx.beginPath();ctx.moveTo(3,-7);ctx.lineTo(8,-2);ctx.lineTo(3,-2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#706958';for(let k=0;k<3;k++)ctx.fillRect(-7,-3+k*3,k===2?6:10,1);
  ctx.restore();

}
// 훔칠 물건: 가구 위에 놓인 경우 그 가구 위에 (컴퓨터는 화면이 깜빡이고, 서랍·금고는 손잡이가 빛난다)
function drawLootItem(it) {
  const x = it.dx || it.x, y = it.dy || it.y;
  if (it.furn === 'pc') { const a = 0.45 + 0.35 * Math.sin(S.t * 5); ctx.fillStyle = `rgba(120,220,255,${a})`; ctx.fillRect(x - 12, y - 8, 24, 14); ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.strokeRect(x - 13, y - 9, 26, 16); return; }
  if (it.furn === 'safe' || it.furn === 'cab' || it.furn === 'locker' || it.furn === 'wardrobe' || it.furn === 'nstand') { const a = 0.55 + 0.35 * Math.sin(S.t * 4); ctx.fillStyle = `rgba(242,196,107,${a})`; ctx.fillRect(x - 9, y - 2, 18, 4); ctx.beginPath(); ctx.arc(x, y + 8, 3, 0, TAU); ctx.fill(); return; }
  if(!drawFieldItem(ctx,'folder',x,y))drawScroll(x, y, S.t);
}
function drawScroll(x,y,t){if(!drawFieldItem(ctx,'folder',x,y))drawItemIcon('it_scroll',x,y,t,true);}
