// ---------------------------------------------------------------- 루프
let lastT = 0;
// 프레임 제한: 기본 60fps. 메뉴에서 30으로 낮출 수 있다
let FPS_CAP = (() => { try { const v = +localStorage.getItem('yahaeng.fps2'); if (v === 30 || v === 60) return v; } catch (e) {} return 60; })();  // 기본 60fps (휴대폰도). 메뉴의 '절전 30fps'로 낮출 수 있다
function setFpsCap(v) { FPS_CAP = v; try { localStorage.setItem('yahaeng.fps2', String(v)); } catch (e) {} const b = document.getElementById('btnFps'); if (b) b.textContent = v === 30 ? '절전 30fps' : '부드럽게 60fps'; perfDts = []; perfSum = 0; }
function frame(t) {
  requestAnimationFrame(frame);
  if (FPS_CAP < 60 && lastT && t - lastT < 1000 / FPS_CAP - 4) return;  // 이번 화면 갱신은 건너뛴다
  const rawDt = (t - lastT) / 1000 || 0, dt = Math.min(0.05, rawDt); lastT = t; perfWatch(rawDt);
  if (!S || !mapC) return;
  updateHelpTip();
  if (ENG && (paused || !running || S.over)) engineSound();  // 멈추면 엔진 소리도
  if (running && !paused) updateDialog(dt);
  input.scan=false;document.body.classList.remove('scanning','scanleg');document.body.classList.toggle('playing',!!(running&&S&&!S.over));
  { const wb = document.getElementById('btnWhistle'); if (wb && S) wb.classList.toggle('cool', S.whistleT > 0); }
  const pf = window.__pf, t0 = pf ? performance.now() : 0;  // 성능 측정 (__pf 를 켰을 때만)
  if (running && !paused && !S.over && !tactical && !DLG.modal) { let ud = dt; if (S.hitStop > 0) { S.hitStop -= dt; ud = dt * 0.06; } if (input.aiming) focusUpdate(ud); else update(ud); }
  else if (running && DLG.modal && !S.over) { moveCamera(dt); updateHUD(); }
  else if (tactical) { moveCamera(dt); updateHUD(); }
  else if (S.over) { for (const n of S.noises) n.t += dt; }
  else if (!running) { S.t += dt; const P = S.player, kx = P.x, ky = P.y; P.x = -9999; P.y = -9999; for (const g of S.guards) updateGuard(g, dt); P.x = kx; P.y = ky; }
  const t1 = pf ? performance.now() : 0;
  draw();
  if (pf) { pf.u.push(t1 - t0); pf.d.push(performance.now() - t1); }
}
// 느린 기기: 4초 구간의 '보통 프레임'(중앙값)이 두 구간 연속 40fps 아래일 때만 해상도를 한 단계(0.5배) 낮춘다.
// 시트 색칠·초상 같은 한 번짜리 멈칫(스파이크)으로는 낮추지 않는다. 낮춘 뒤 넉넉해지면(중앙값 58fps 이상이 세 구간) 한 번은 되돌린다
let dprCap = 2, perfDts = [], perfSum = 0, perfBad = 0, perfGood = 0, perfUp = 1;
function perfWatch(rawDt) {
  if (!running || paused || !S || S.over || rawDt <= 0 || rawDt > 0.25 || document.hidden) return;
  perfDts.push(rawDt); perfSum += rawDt; if (perfSum < 4) return;
  const med = perfDts.sort((a, b) => a - b)[perfDts.length >> 1], fps = 1 / med; perfDts = []; perfSum = 0;
  const native = Math.min(2, window.devicePixelRatio || 1);
  // 60fps 목표여도 24fps 아래일 때만 해상도를 낮춘다 (조금 못 미친다고 화질을 깎지 않게)
  if (fps < Math.min(FPS_CAP * 0.66, 24) && DPR > 1) { perfGood = 0; if (++perfBad >= 2) { perfBad = 0; dprCap = Math.max(1, DPR - 0.5); resize(); miniBase = null; toast(`화면이 느려 해상도를 낮췄다 (${Math.round(fps)}fps)`, 2.2); } }
  else if (fps >= FPS_CAP * 0.95 && DPR < native && perfUp > 0) { perfBad = 0; if (++perfGood >= 3) { perfGood = 0; perfUp--; dprCap = Math.min(native, DPR + 0.5); resize(); miniBase = null; } }
  else { perfBad = 0; perfGood = 0; }
}
function resize() {
  DPR = Math.min(dprCap, 2, window.devicePixelRatio || 1);
  W = canvas.clientWidth; H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  BASE_SCALE = clamp(Math.min(W, H * 1.45) / ((W < 640 ? (H > W * 1.3 ? 12 : 14) : 18) * TILE), 0.5, 1.25);  // 세로 휴대폰: 가로 12칸 (주변이 넉넉히 보이게)
  if (!SCALE || SCALE === 1) SCALE = BASE_SCALE * userZoom;
}
function targetScale() {
  if (tactical) { const fit = Math.min(W / (MW * TILE), (H - 90) / (MH * TILE)) * 0.96; return H > W * 1.3 ? Math.max(fit, Math.min(W / (MW * TILE) * 2.3, 0.62)) : fit; }  // 세로: 지도를 크게 보여 주고 끌어서 옮긴다
  const P = S && S.player;
  if (P && P.car) return BASE_SCALE * userZoom * (0.72 - Math.min(0.14, Math.abs(P.car.v) / 2600));  // 운전: 멀리 본다 (빠를수록 더)
  return BASE_SCALE * userZoom * (P && P.z >= 3 ? 0.8 : P && (P.z || P.jump) ? 0.9 : 1);
}
function setZoom(z) { userZoom = clamp(z, 0.75, 1.6); try { localStorage.setItem('yahaeng.zoom3', String(userZoom)); } catch (e) {} }  // 너무 멀리(전지적 시점)는 못 빼게. 전체는 전술 지도로
function toggleTactical() {
  if (!running || !S || S.over || S.entrySel || paused || DLG.modal || S.keypad) return;
  clearPlayerInput();closeEnvPicker();
  tactical = !tactical; $('tacBanner').hidden = !tactical; $('btnMap').classList.toggle('on', tactical); if (tactical) S.usedMap = true;
  if (tactical) hint('tac', '전술 지도: 게임이 멈춘 상태에서 자경대원 위치와 순찰로를 볼 수 있다');
}
window.addEventListener('resize', resize);

