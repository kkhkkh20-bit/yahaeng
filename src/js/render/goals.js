function chaseHide(P) {
  let best = null, bd = 700;
  for (const h of S.hides || []) { if ((h.fl || 0) !== flOf(P) || (h.cap && h.bodies >= h.cap) || h.spotted) continue; const d = dist(P.x, P.y, h.x, h.y); if (d < bd && d > 30) { bd = d; best = h; } }
  return best ? { x: best.x, y: best.y, fl: best.fl || 0, shelter:true, text: '숨을 곳 — ' + hideName(best) } : null;
}
function sameGoalLevel(P,g){const d=g.destinationFloor||g;return(d.fl||0)===flOf(P)&&(d.z||0)===(P.z||0);}
function goalMarkerVisible(P,gl){
 if(!gl||actionBusy(P)||P.killAnim||P.approachAttack||S.koHold)return false;
 const last=feedbackState().events.findLast(e=>['ko','kill','stash','dress','loot'].includes(e.kind));
 if(last&&S.t-last.t>=0&&S.t-last.t<.55)return false;
 // Real movement lessons retain their destination even within one metre.
 return !(gl.tut&&sameGoalLevel(P,gl)&&dist(P.x,P.y,gl.x,gl.y)<80&&!gl.moveCue);
}
function drawGoal(P) { if (window.__skip && window.__skip.ui) return;  // 첫 화면 배경 찍기: 글자·표시 없이
  const gl = goalNavigation((S.alevel === 3 && chaseNow() && chaseHide(P)) || nextGoal()); if (!gl || gl.x == null) return;
  if(!goalMarkerVisible(P,gl)||gl.via)return;
  const k = isTouch ? 0.95 / SCALE : Math.max(1, 0.95 / SCALE), hw = W / SCALE / 2, hh = H / SCALE / 2, dx = gl.x - cam.x, dy = gl.y - cam.y, m = Math.max(1, Math.round(dist(P.x, P.y, gl.x, gl.y) / 32));
  // Nearby action targets have a button cue; a movement target still needs its
  // destination marker until the lesson actually advances.
  if(gl.tut&&m<3&&!gl.moveCue&&sameGoalLevel(P,gl))return;
  const short=goalMarkerCaption(gl,m),pulse=.8+.2*Math.sin(S.t*4);
  ctx.font = uiFont(Math.round(12 * k)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // 할 일 글자는 전역 tag(겹침 정리)로
  const frame=goalViewport();
  const sy0=cam.y-hh+frame.top/SCALE,sy1=cam.y-hh+frame.bottom/SCALE,sx0=cam.x-hw+frame.left/SCALE,sx1=cam.x-hw+frame.right/SCALE;
  if (gl.x > sx0 && gl.x < sx1 && gl.y > sy0 && gl.y < sy1) {  // 화면 안: 목표 위 은백색 표 (가까우면 생략 — 행동 버튼이 대신 알려 준다)
    if (m < 3 && !gl.tut && sameGoalLevel(P,gl)) { ctx.textBaseline = 'alphabetic'; return; }
    const b = Math.sin(S.t * 4) * 4 * k, y = gl.y - 46 * k + b;
    ctx.strokeStyle = `rgba(223,230,240,${pulse})`; ctx.lineWidth = 2 * k; ctx.setLineDash(gl.area?[9*k,7*k]:gl.lastSeen?[3*k,4*k]:[]); ctx.beginPath(); ctx.arc(gl.x, gl.y, (gl.area?32:20) * k + Math.sin(S.t * 4) * 2 * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#dfe6f0'; ctx.beginPath(); ctx.moveTo(gl.x - 8 * k, y); ctx.lineTo(gl.x + 8 * k, y); ctx.lineTo(gl.x, y + 10 * k); ctx.closePath(); ctx.fill();
    tag(gl.x, y - 13 * k, short, '#dfe6f0', 1, null, 2.6);
  } else {  // 화면 밖: 가장자리 화살표 + 할 일 · 거리
    const cx = (sx0 + sx1) / 2, cy = (sy0 + sy1) / 2, ddx = gl.x - cx, ddy = gl.y - cy, kk = Math.min((sx1 - sx0) / 2 / Math.max(1e-6, Math.abs(ddx)), (sy1 - sy0) / 2 / Math.max(1e-6, Math.abs(ddy))), ex = cx + ddx * kk, ey = cy + ddy * kk, a = Math.atan2(ddy, ddx), sz = 13 * k;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = `rgba(223,230,240,${pulse})`; ctx.strokeStyle = 'rgba(7,10,18,.9)'; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(sz * 1.5, 0); ctx.lineTo(-sz, -sz); ctx.lineTo(-sz * 0.35, 0); ctx.lineTo(-sz, sz); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
    const txt = short; ctx.font = uiFont(13 * k); const th = ctx.measureText(txt).width / 2 + 10 * k, rEdge = cam.x + hw - (document.body.classList.contains('touch') ? 66 : 20) / SCALE;  // 글자가 화면·오른쪽 버튼 줄 밖으로 나가지 않게
    const lx = clamp(ex - Math.cos(a) * 46 * k, sx0 + th, Math.max(sx0 + th, rEdge - th)), ly = clamp(ey - Math.sin(a) * 30 * k, sy0 + 12 * k, sy1 - 12 * k);
    tag(lx, ly, txt, '#dfe6f0', 1, null, 2.6);
  }
  ctx.textBaseline = 'alphabetic';
}
// 성능 측정: __pf 가 켜져 있을 때만 단계별 시간을 모은다
let PM_T = 0; function PM(k) { const pf = window.__pf; if (!pf) return; const t = performance.now(); if (k) { const s = pf.s || (pf.s = {}); s[k] = (s[k] || 0) + t - PM_T; } PM_T = t; }
