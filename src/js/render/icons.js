function worldTransform(c, scale) { let sx = 0, sy = 0; if (S && S.shakeT > 0 && !reducedFxMotion.matches) { const a = S.shakeT * 22 * DPR; sx = Math.sin(S.t * 91) * a; sy = Math.cos(S.t * 73) * a * 0.7; } c.setTransform(scale, 0, 0, scale, W / 2 * DPR - cam.x * scale + sx, H / 2 * DPR - cam.y * scale + sy); }
// Actual small objects rest on their surface. Highlights appear only within reach
// or while inspecting; the mission HUD and existing pickup rules remain unchanged.
function drawPickupHint(x,y,col='#d4c59f') {
  if(!input.scan&&!tactical&&dist(x,y,S.player.x,S.player.y)>96)return;
  ctx.save();ctx.strokeStyle=col;ctx.globalAlpha=.65;ctx.lineWidth=1;
  for(const [sx,sy] of [[-1,-1],[1,1]]){ctx.beginPath();ctx.moveTo(x+sx*12,y+sy*3);ctx.lineTo(x+sx*12,y+sy*8);ctx.lineTo(x+sx*7,y+sy*8);ctx.stroke();}ctx.restore();
}
function drawKeyIcon(k,x,y,ring) {
  if(!k||k==='gold')return drawItemIcon('it_key',x,y,S.t,ring);
  ctx.save();ctx.translate(x,y);ctx.rotate(-.15);
  ctx.fillStyle='#090e1255';ctx.fillRect(-6,-2,13,9);
  ctx.fillStyle=k==='code'?'#d5cbb2':'#d0d2c9';ctx.fillRect(-6,-4,12,8);
  ctx.fillStyle=k==='code'?'#81735f':keyCol(k);ctx.fillRect(-6,-4,12,2);
  ctx.fillStyle='#78868b';ctx.fillRect(-4,-1,3,3);ctx.fillStyle='#798078';ctx.fillRect(1,-1,4,1);ctx.fillRect(1,1,3,1);
  ctx.restore();if(ring)drawPickupHint(x,y);
}
function drawItemIcon(name,x,y,t,ring) {
  if(window.__skip?.ui)return;
  const f=F[name];if(!f)return;const k=18/Math.max(f[2],f[3]);
  ctx.fillStyle='#0b101444';ctx.beginPath();ctx.ellipse(x+1,y+4,8,3,0,0,TAU);ctx.fill();
  blit(ctx,name,x-f[2]*k/2,y-f[3]*k/2,f[2]*k,f[3]*k);if(ring)drawPickupHint(x,y);
}
function drawNote(n) {
  const {x,y}=surfacePoint(n);
  if(drawPurchasedPaper(ctx,'paper',x,y))return;
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
  if(it.furn==='pc') {
    ctx.fillStyle='#101d25';ctx.fillRect(x-9,y-6,18,10);ctx.fillStyle='#56727a';ctx.fillRect(x-7,y-4,14,6);
    ctx.fillStyle='#9baea5';for(let i=0;i<3;i++)ctx.fillRect(x-5,y-3+i*2,7-i,1);
    drawPickupHint(x,y);return;
  }
  if(['safe','cab','locker','wardrobe','nstand'].includes(it.furn)) {
    ctx.fillStyle='#101719';ctx.fillRect(x-5,y-1,11,3);ctx.fillStyle='#a6a79b';ctx.fillRect(x-4,y-2,9,2);
    drawPickupHint(x,y);return;
  }
  if(!drawFieldItem(ctx,'folder',x,y))drawScroll(x,y,S.t);drawPickupHint(x,y);
}
function drawScroll(x,y,t){if(!drawFieldItem(ctx,'folder',x,y))drawItemIcon('it_scroll',x,y,t,true);}
