function drawRoutes(P) {
  const openB = (P.z === 0 && !P.jump) ? bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : -1;
  const hiddenPt = p => { const b = bldAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)); return b >= 0 && b !== openB && !tactical; };
  const vf = (!P.z && !P.wire && !P.jump) ? flOf(P) : 0;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.civ || flOf(g) !== vf) continue;
    const col = g.target ? '232,71,60' : '200,214,235';
    if (g.routeLine) {
      ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.38})`; ctx.lineWidth = tactical ? 3 : 2.5; ctx.setLineDash([8, 7]);
      ctx.beginPath(); let pen = false;
      const pts = g.routeLine.concat([g.routeLine[0]]);
      for (const p of pts) { if (hiddenPt(p)) { pen = false; continue; } pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); pen = true; }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${col},${tactical ? 0.85 : 0.5})`;
      for (let i = 0; i < pts.length - 1; i += 4) {
        const a = pts[i], b = pts[i + 1]; if (!b || hiddenPt(a)) continue;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save(); ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      for (const p of g.routeLine) if (p.stop && !hiddenPt(p)) { ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.35})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.stroke(); }
    } else if (g.post != null && !hiddenPt(g.route[0])) {
      const p = g.route[0];
      ctx.fillStyle = `rgba(${col},${tactical ? 0.35 : 0.14})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, 60, g.post - 0.5, g.post + 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${tactical ? 0.7 : 0.35})`; ctx.lineWidth = 2; ctx.strokeRect(p.x - 9, p.y - 9, 18, 18);
    }
  }
}
// 창문: 하늘색 유리 + 흰 십자 창살
const winVert = w => {const g=GF[w.fl||0]||G0;return g[w.ty-1]?.[w.tx]==='#'||g[w.ty+1]?.[w.tx]==='#';};
// 창문 (평면도): 벽에 난 창틀 + 미닫이 유리 두 짝 + 창턱. 방 불이 켜져 있으면 유리가 따뜻하게 빛난다
// 실제 창짝·걸쇠·창살로 상태를 읽는다. 평면과 외벽은 같은 창문을 그린다.
function paintWindow(w,lit,L=44,T=20) {
  const state=winSt(w),open=state==='open',left=-L/2,top=-T/2;
  ctx.fillStyle='#080e12';ctx.fillRect(left-2,top-1,L+4,T+4);
  ctx.fillStyle='#3b454d';ctx.fillRect(left,top,L,T);
  ctx.fillStyle='#a4adb1';ctx.fillRect(left,top,L,2);ctx.fillRect(left,top,2,T);
  ctx.fillStyle='#101b20';ctx.fillRect(left+3,top+3,L-6,T-6);
  const glass=ctx.createLinearGradient(left,top,L/2,T/2);
  glass.addColorStop(0,lit?'#c4b085':'#607c90');glass.addColorStop(1,lit?'#716653':'#243a4a');
  const pane=open?L*.32:(L-8)/2;
  ctx.fillStyle=glass;ctx.fillRect(left+3,top+3,pane,T-6);
  if(!open)ctx.fillRect(1,top+3,L/2-4,T-6);
  ctx.strokeStyle='#c3d9e26b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left+6,top+5);ctx.lineTo(left+pane-1,T/2-4);ctx.stroke();
  const join=open?left+pane+3:0;
  ctx.fillStyle='#7e909a';ctx.fillRect(join-1,top+2,2,T-4);
  if(!open){ctx.fillStyle='#75818a';ctx.fillRect(-2,-1,4,2);if(state==='lock'){ctx.fillStyle='#b79b63';ctx.fillRect(-1,-2,2,3);}}
  if(state==='bar'){
    ctx.strokeStyle='#081014';ctx.lineWidth=3;ctx.beginPath();
    for(let x=left+7;x<L/2-2;x+=8){ctx.moveTo(x,top+1);ctx.lineTo(x,T/2+1);}ctx.stroke();
    ctx.strokeStyle='#9aa5ac';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.fillStyle='#79858e';ctx.fillRect(left-2,T/2,L+4,3);ctx.fillStyle='#c0c7c8';ctx.fillRect(left-2,T/2,L+4,1);
}
function drawWindow(w, alpha) {
  if(drawRoomFinishWindow(w,alpha))return;
  if (!(S.t - (w._lt || -9) < 0.25 && S.t >= w._lt)) { w._lt = S.t; w._lit = lightAt(w.x, w.y) > 0.45; }
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(w.x,w.y);if(winVert(w))ctx.rotate(Math.PI/2);
  paintWindow(w,w._lit,winVert(w)?36:44,winVert(w)?14:20);ctx.restore();
}
// A side facade shows the recessed glass face and a shallow sill, not a rotated door.
function paintSideWindow(w,lit,side){
  ctx.save();ctx.scale(1,.72);
  const st=winSt(w),open=st==='open',outer=side*9,inner=-side*4;
  const quad=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.lineTo(...d);ctx.closePath();};
  ctx.fillStyle='#080e12a8';quad([outer+side*2,-16],[inner,-19],[inner,18],[outer+side*2,21]);ctx.fill();
  ctx.fillStyle='#4a5862';quad([outer,-17],[inner,-20],[inner,17],[outer,20]);ctx.fill();
  ctx.fillStyle='#111d21';quad([outer-side*1.5,-14],[inner+side*1.5,-17],[inner+side*1.5,14],[outer-side*1.5,17]);ctx.fill();
  const glass=ctx.createLinearGradient(inner,-15,outer,16);glass.addColorStop(0,lit?'#b2a17e':'#3b556a');glass.addColorStop(1,lit?'#675d4c':'#1a2e3c');
  ctx.fillStyle=glass;
  if(!open){quad([outer-side*2,-13],[inner+side*2,-15],[inner+side*2,-1],[outer-side*2,1]);ctx.fill();}
  quad([outer-side*2,3],[inner+side*2,1],[inner+side*2,13],[outer-side*2,15]);ctx.fill();
  ctx.strokeStyle='#98a8b299';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(outer,-17);ctx.lineTo(inner,-20);ctx.lineTo(inner,17);ctx.moveTo(outer,2);ctx.lineTo(inner,-1);ctx.stroke();
  if(st==='bar'){ctx.strokeStyle='#0a1115';ctx.lineWidth=2;ctx.beginPath();for(const y of [-9,0,9]){ctx.moveTo(outer-side,y+2);ctx.lineTo(inner+side,y-1);}ctx.stroke();}
  if(st==='lock'){ctx.fillStyle='#a59874';ctx.fillRect(Math.min(outer,inner)+3,-1,2,2);}
  ctx.fillStyle='#84919b';quad([outer,18],[inner,15],[inner+side*2,18],[outer+side*2,22]);ctx.fill();ctx.restore();
}
// 옥상이 덮인 건물의 옆·뒷벽 창문: 위에서는 벽 끝의 좁은 창틀과 바깥으로 새는 불빛만 보인다
function drawWindowEdge(w, b) {
  if(drawRoomFinishWindow(w,.9))return;
  const vert = winVert(w); let ox = 0, oy = 0;
  if (vert) ox = w.tx <= b.x0 ? -1 : w.tx >= b.x1 ? 1 : 0; else oy = w.ty <= b.y0 ? -1 : 0;
  if (!ox && !oy) return;
  const lit = lightAt(w.x - ox * 30, w.y - oy * 30) > 0.45, ex = w.x + ox * (TILE / 2 - 3), ey = w.y + oy * (TILE / 2 - 3);
  if (lit) {  // 바닥에 떨어지는 창 불빛
    const gx = ex + ox * 26, gy = ey + oy * 26, gr = ctx.createRadialGradient(gx, gy, 2, gx, gy, 44);
    gr.addColorStop(0, 'rgba(255,206,130,.32)'); gr.addColorStop(1, 'rgba(255,206,130,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(gx, gy, vert ? 34 : 44, vert ? 44 : 30, 0, 0, TAU); ctx.fill();
  }
  ctx.save(); ctx.translate(ex, ey);
  if(vert)paintSideWindow(w,lit,ox);else paintWindow(w,lit,38,12);
  ctx.restore();
}
// 문: 갈색 문짝 (열림 = 한쪽으로 젖혀짐, 잠김 = 막힘 + 자물쇠)
function drawDoor(d, onRoof) {
  const x = d.x, y = d.y;
  ctx.save(); ctx.translate(x, y); if (!d.horiz) ctx.rotate(Math.PI / 2);
  ctx.fillStyle='#69716b';ctx.fillRect(-19,-9,38,3);ctx.fillStyle='#b8bca6';ctx.fillRect(-19,-9,38,1);
  ctx.fillStyle = '#3a2618'; ctx.fillRect(-24, -7, 5, 14); ctx.fillRect(19, -7, 5, 14);
  const open=doorVisualOpen(d),a=open*Math.PI/2,ex=-19+38*Math.cos(a),ey=-6+38*Math.sin(a);
  ctx.fillStyle='#16241e';ctx.fillRect(-19,-6,38,12);
  ctx.fillStyle='#8a5a34';ctx.strokeStyle='#3a2618';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-19,-6);ctx.lineTo(ex,ey);ctx.lineTo(ex-3*Math.sin(a),ey+3*Math.cos(a));ctx.lineTo(-19,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#d3c18d';ctx.beginPath();ctx.arc(ex-6*Math.cos(a),ey-6*Math.sin(a)+2,2,0,TAU);ctx.fill();
  if(d.locked&&open<.2&&d.keyLock){ctx.fillStyle='#b39c59';ctx.fillRect(-4,-3,8,7);}
  ctx.restore();
}
// 배관: 회색 관(벽에 붙음) + 바닥 쪽 오르기 표시
function drawPipe(l) {
  const g=pipeGeometry(l),x=g.top.x,top=g.top.y,bottom=g.base.y;
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x+2,top+3);ctx.lineTo(x+2,bottom+3);ctx.stroke();
  ctx.strokeStyle=l.gas?'#c9a43a':'#8e99a2';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();
  ctx.strokeStyle=l.gas?'#f0d070':'#cad1d5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-1,top);ctx.lineTo(x-1,bottom);ctx.stroke();
  ctx.fillStyle='#525b61';for(let y=top+8;y<bottom-4;y+=24)ctx.fillRect(x-5,y,10,3);
  // 옥상 쪽 짧은 꺾임은 건물로 들어간다. 손은 세로 관 구간을 붙잡는다.
  const nx=Math.sign(l.ux-l.x);if(nx){ctx.strokeStyle='#aeb8bf';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x+nx*13,top);ctx.stroke();}
  ctx.restore();
}
function drawPipeBase(l) {
  if(S.player.trav?.pipe===l)return;
  const a = Math.atan2(l.uy - l.y, l.ux - l.x);
  ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(a);
  ctx.strokeStyle = 'rgba(184,192,202,.75)'; ctx.lineWidth = 3;
  for (const k of [-6, 4]) { ctx.beginPath(); ctx.moveTo(k - 4, -7); ctx.lineTo(k + 3, 0); ctx.lineTo(k - 4, 7); ctx.stroke(); }
  ctx.restore();
}
// 상호작용 대상의 색: 문 갈색 · 창문 하늘색 · 배관 회색 · 사다리/계단 황토 · 굴뚝 주황 · 환풍구 청록 · 숨을 곳 초록 · 맨홀 파랑 · 비밀 통로 보라
