// ---------------------------------------------------------------- 루프
let lastT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const rawDt = (t - lastT) / 1000 || 0, dt = Math.min(0.05, rawDt); lastT = t; perfWatch(rawDt);
  if (!S || !mapC) return;
  if (running && !paused) updateDialog(dt);
  document.body.classList.toggle('scanning', !!(input.scan && running && !tactical)); document.body.classList.toggle('playing', !!(running && S && !S.over));
  { const wb = document.getElementById('btnWhistle'); if (wb && S) wb.classList.toggle('cool', S.whistleT > 0); }
  if (running && !paused && !S.over && !tactical && !DLG.modal) { let ud = dt; if (S.hitStop > 0) { S.hitStop -= dt; ud = dt * 0.06; } if (input.aiming) focusUpdate(ud); else update(ud); }
  else if (running && DLG.modal && !S.over) { moveCamera(dt); updateHUD(); }
  else if (tactical) { moveCamera(dt); updateHUD(); }
  else if (S.over) { for (const n of S.noises) n.t += dt; }
  else if (!running) { S.t += dt; const P = S.player, kx = P.x, ky = P.y; P.x = -9999; P.y = -9999; for (const g of S.guards) updateGuard(g, dt); P.x = kx; P.y = ky; }
  draw();
}
// 느린 기기: 4초 구간의 '보통 프레임'(중앙값)이 두 구간 연속 40fps 아래일 때만 해상도를 한 단계(0.5배) 낮춘다.
// 시트 색칠·초상 같은 한 번짜리 멈칫(스파이크)으로는 낮추지 않는다. 낮춘 뒤 넉넉해지면(중앙값 58fps 이상이 세 구간) 한 번은 되돌린다
let dprCap = 2, perfDts = [], perfSum = 0, perfBad = 0, perfGood = 0, perfUp = 1;
function perfWatch(rawDt) {
  if (!running || paused || !S || S.over || rawDt <= 0 || rawDt > 0.25 || document.hidden) return;
  perfDts.push(rawDt); perfSum += rawDt; if (perfSum < 4) return;
  const med = perfDts.sort((a, b) => a - b)[perfDts.length >> 1], fps = 1 / med; perfDts = []; perfSum = 0;
  const native = Math.min(2, window.devicePixelRatio || 1);
  if (fps < 40 && DPR > 1) { perfGood = 0; if (++perfBad >= 2) { perfBad = 0; dprCap = Math.max(1, DPR - 0.5); resize(); miniBase = null; toast(`화면이 느려 해상도를 낮췄다 (${Math.round(fps)}fps)`, 2.2); } }
  else if (fps >= 58 && DPR < native && perfUp > 0) { perfBad = 0; if (++perfGood >= 3) { perfGood = 0; perfUp--; dprCap = Math.min(native, DPR + 0.5); resize(); miniBase = null; } }
  else { perfBad = 0; perfGood = 0; }
}
function resize() {
  DPR = Math.min(dprCap, 2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  BASE_SCALE = clamp(Math.min(W, H * 1.45) / ((W < 640 ? 11.5 : 15) * TILE), 0.6, 1.35);
  if (!SCALE || SCALE === 1) SCALE = BASE_SCALE * userZoom;
}
function targetScale() {
  if (tactical) return Math.min(W / (MW * TILE), (H - 90) / (MH * TILE)) * 0.96;
  const P = S && S.player;
  return BASE_SCALE * userZoom * (P && P.z >= 3 ? 0.68 : P && (P.z || P.jump) ? 0.8 : 1);
}
function setZoom(z) { userZoom = clamp(z, 0.45, 1.5); try { localStorage.setItem('yahaeng.zoom', String(userZoom)); } catch (e) {} }
function toggleTactical() {
  if (!running || !S || S.over || S.entrySel) return;
  tactical = !tactical; $('tacBanner').hidden = !tactical; $('btnMap').classList.toggle('on', tactical); if (tactical) S.usedMap = true;
  if (tactical) hint('tac', '전술 지도: 게임이 멈춘 상태에서 자경대원 위치와 순찰로를 볼 수 있다');
}
window.addEventListener('resize', resize);

