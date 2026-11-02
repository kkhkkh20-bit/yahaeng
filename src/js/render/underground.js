function roofOccludes(o,openB){if(tactical||o.yank||o.fly||!coveredG(o,openB))return false;const b=BLD[bldAt(Math.floor(o.x/TILE),Math.floor(o.y/TILE))];return(b.ra??1)>=.98;}
function drawUnderground() {
  const sc = SCALE * DPR, P = S.player;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#030406'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  worldTransform(ctx, sc); ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.14; drawBig(ctx, mapC, ...viewRect(60)); ctx.globalAlpha = 1;
  drawBig(ctx, ugC, ...viewRect(60));
  // 맨홀 아래 빛줄기
  for (const h of S.hides) if (h.type === 'well' && ugAt(h.tx, h.ty)) {
    const gr = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 40); gr.addColorStop(0, 'rgba(200,215,230,.35)'); gr.addColorStop(1, 'rgba(200,215,230,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h.x, h.y, 40, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,215,230,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, TAU); ctx.stroke();
  }
  // 위층 자경대원은 발소리처럼 희미한 점으로
  for (const g of S.guards) if (g.state !== 'DEAD' && g.state !== 'CAPTIVE' && dist(g.x, g.y, P.x, P.y) < 420) { ctx.fillStyle = 'rgba(232,120,100,.35)'; ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, TAU); ctx.fill(); }
  drawPlayer(P);
  drawAccessFlow();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g2 = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 60 * sc, canvas.width / 2, canvas.height / 2, 300 * sc);
  const px = (P.x - cam.x) * sc + canvas.width / 2, py = (P.y - cam.y) * sc + canvas.height / 2;
  const lg = ctx.createRadialGradient(px, py, 50 * sc, px, py, 280 * sc); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (S.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${S.fade * 1.6})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  worldTransform(ctx, sc);
  const pa = primaryAction();
  if (pa.k === 'surface') { ctx.strokeStyle = 'rgba(242,196,107,.9)'; ctx.lineWidth = 2; ctx.strokeRect(pa.w.x - 24, pa.w.y - 24, 48, 48); }
}
// 어둠 한 겹: lamps 의 빛만 뚫린다. clip 이 있으면 그 사각형(월드 좌표) 안에만 덮는다
// 어둠: 화면 반 해상도 캔버스에 어둠을 칠하고, 불빛 자리를 지워(destination-out) 화면에 덮는다
// 고정 조명(깜빡이지 않는 등)의 빛은 맵 전체를 1/4 해상도로 한 번만 그려 두고(켜짐·꺼짐이 바뀔 때만 다시), 매 프레임은 그 그림을 가져다 쓴다
// — 프레임마다 등 하나하나 가림막 다각형+그라데이션을 그리던 것이 그리기 시간의 절반이었다
