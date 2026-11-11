function drawWinWatch() {
  const P = S.player;
  for (const g of S.guards) {
    if (!flOf(g) || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'SLEEP' || g.dog) continue;
    const b = bldAt(Math.floor(g.x / TILE), Math.floor(g.y / TILE)); if (b < 0) continue;
    for (const w of S.fwindows || []) {
      if (w.fl !== flOf(g) || !w.out || bldAt(w.tx, w.ty) !== b || dist(g.x, g.y, w.x, w.y) > 160 || dist(P.x, P.y, w.x, w.y) > 700) continue;
      if (Math.abs(angDiff(g.a, Math.atan2(w.y - g.y, w.x - g.x))) > guardFov(g)) continue;
      const a0 = Math.atan2(w.out.d[1], w.out.d[0]), r = 210, col = g.state === 'ALERT' ? '230,70,60' : g.civ ? '196,236,190' : '242,196,107';
      const gr = ctx.createRadialGradient(w.out.x, w.out.y, 10, w.out.x, w.out.y, r); gr.addColorStop(0, `rgba(${col},.16)`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.arc(w.x, w.y, r, a0 - 0.6, a0 + 0.6); ctx.closePath(); ctx.fill();
      infoTag(w.x + w.out.d[0] * 30, w.y + w.out.d[1] * 30 - 8, g.civ ? '창가 · 주민' : '창가 · 내려다봄', g.civ ? '#9fd6a0' : '#f2c46b', 1.2);
    }
  }
}
