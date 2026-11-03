function goAlert(g) {
  if (g.dog && g.state !== 'ALERT') { play('bark', 0.7); noise(g.x, g.y, 320, 'bark', flOf(g)); }
  const P = S.player, observed = g.seen ? observedPlayerSpot(g) : g.lastSeen || g.poi || gSpot(g); releaseSearchJob(g); endChat(g); g.act = null; g.bubble = null;
  if (g.lure) { g.lure.claim = null; g.lure = null; }
  if (g.state !== 'ALERT') { S.stats.detected++; logEv('seen', observed.x, observed.y); play('alert', 0.65); if (S.alevel < 3) { if (g.dog) say([[g, '멍! 멍멍!']]); else bark(g, 'alert'); } }
  if (g.seen && (P.outfit || P.disguise) && !P.disguiseBlown) { if (P.outfit) (P.blown = P.blown || {})[P.outfit] = true; P.disguiseBlown = true; toast(P.outfit && STAGE.zones ? `목격자가 ${outfitName(P.outfit)}을 기억했다 · 무전 전에는 근처만 안다` : '변장이 들통났다', 2.4, 'warn'); }
  g.suspectLook = g.seen ? suspectLook() : g.suspectLook || 'face'; if (g.seen) rememberSuspect(g);  // 실제 목격한 신분만 공유한다
  g.state = 'ALERT'; g.icon = '!'; g.iconT = 99; g.lastSeen = { ...observed }; g.lostT = 0; g.path = null; g.repath = 0; g.meter = 1; g.shootT = 0; g.aim = 0;
  if (S.fuseGuard === g) { S.fuseGuard = null; g.atFuse = false; }
  if (g.target) toast('표적이 소리쳤다 — 자경대원이 몰려온다', 2.6, 'warn');
  const listeners = shareGuardReport(g, observed, g.suspectLook);
  const reporters = [g, ...listeners].filter(o => o.radio);
  const radio = reporters.length > 0;
  if (g.fac === 'B') { toast('건달파가 나를 노린다', 2, 'warn'); return; }
  if (g.fac === 'P' && STAGE.city) { copAlert(g); return; }  // 도시의 경찰: 수배로 (의뢰 판의 경찰은 자경대원처럼 경보를 올린다)  // 경찰: 조직 경보와 따로 — 수배로  // 건달파는 조직 무전망과 따로 — 전체 경보·증원 없음
  if (!radio && !g.target) {  // 무전기를 가진 자경대원이 없으면 경보가 근처에만 머문다 (증원·전체 경보 없음)
    if (S.alevel < 2) toast('근처 경비에게 발각 · 무전기가 없어 전체 경보는 전달되지 않는다', 2.4);
    setAlert(2, 30);
  } else if (!g.target) {  // 무전: 바로 퍼지지 않는다. 무전기 자경대원이 몇 초간 보고하는 사이 처치하면 끊긴다
    queueGuardRadio(reporters, observed, g.suspectLook, true);
    setAlert(2, 30);
  } else if (!S.radioCall) {  // 표적도 바로 전체 경보가 아니라 2초 동안 소리친다 — 그 사이 처치하면 막힌다
    S.radioCall = { g, t: 2.0, dur: 2.0, at: { ...observed }, look: g.suspectLook, shout: true }; toast('표적이 사람을 부른다 — 2초 안에 막으면 퍼지지 않는다', 2.4, 'warn');
    setAlert(2, 30);
  } else setAlert(2, 30);
  hint('alert', '발각됐다. 시야를 끊고 숨으면 추격이 수색으로 전환된다');
}
function radioSpread(at, look) {
  toast(look ? '인상착의가 무전으로 전달됐다' : '쓰러진 동료 신고 · 범인 인상착의는 모른다', 2.4, 'warn');
  startBuildingSearch(at, 'A', 'radio');
  if (look) setAlert(3, null, null, look);
  else setAlert(2, 35);
  lockExits();
}
const radioBusy = g => !!(S.radioCall && S.radioCall.g === g);
function updateRadioCall(dt) {
  const R = S.radioCall; if (!R) return;
  const g = R.g;
  if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.state === 'TERROR' || g.doomed) { S.radioCall = null; S.stats.radioCut = (S.stats.radioCut || 0) + 1; toast(R.shout ? '소리치기 전에 막았다 — 경보가 퍼지지 않았다' : '무전을 끊었다 — 경보가 퍼지지 않았다', 2.4, 'good'); logEv && logEv('radioCut', g.x, g.y); return; }
  if (g.state !== 'ALERT' && !(R.relay && ['SEARCH','SUSPICIOUS','CHECK'].includes(g.state))) { S.radioCall = null; return; }
  if ((R.t -= dt) <= 0) { S.radioCall = null; radioSpread(R.at, R.look); }
}
// 벽 너머 발소리: 보이지 않는 자경대원이 들리는 거리 안에서 움직이면 발밑에 작은 소리 원 (마크 오브 더 도둑 방식)
function drawHeardSteps(P, openB, gVis) {
  if (P.under || P.vent) return;
  const fP = flOf(P);
  for (const g of S.guards) {
    if (g.civ || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.z || g.climb || !g.moving) continue;
    const fG = flOf(g); if (fG !== fP) continue;  // 다른 층 사람은 아예 보이지도 들리지도 않는다 (헷갈리지 않게)
    const hidden = coveredG(g, openB) || !gVis(g); if (!hidden) continue;
    const d = dist(P.x, P.y, g.x, g.y), R = 330 * (g.state === 'ALERT' || g.state === 'SEARCH' ? 1.3 : 1); if (d > R) continue;
    const per = g.state === 'ALERT' ? 0.34 : 0.5, f = ((S.t + (g.id || 0) * 0.37) % per) / per, a = (1 - f) * (1 - d / R * 0.6);
    ctx.strokeStyle = g.state === 'ALERT' || g.state === 'SEARCH' ? `rgba(255,140,110,${0.75 * a})` : `rgba(160,210,255,${0.9 * a})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(g.x, g.y + 6, 5 + 15 * f, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(150,200,255,${0.55 * (1 - d / R * 0.5)})`; ctx.beginPath(); ctx.arc(g.x, g.y + 6, 2.2, 0, TAU); ctx.fill();
  }
}
function drawRadioCall() {
  const R = S.radioCall; if (!R) return; const g = R.g; if (flOf(g) !== flOf(S.player)) return;
  const k = 1 - R.t / R.dur, x = g.x + 34, y = g.y - 30;
  ctx.fillStyle = 'rgba(8,11,18,.8)'; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#e8473c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  drawRadio(x, y + 4);
  ctx.strokeStyle = `rgba(232,71,60,${0.5 + 0.4 * Math.sin(S.t * 12)})`; ctx.lineWidth = 2;
  for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(x + 4, y - 8, 6 * i, -1.2, -0.2); ctx.stroke(); }
  ctx.font = uiFont(12); ctx.textAlign = 'center'; ctx.fillStyle = '#ffb3a8'; ctx.fillText('무전 중', x + 6, y - 21); ctx.textAlign = 'left';
}
function startFlee() {
  if (S.fleeing) return; S.fleeing = true;
  for (const g of S.guards) if (g.target && g.state !== 'DEAD') goFlee(g);
  toast('표적이 북문으로 도주한다 — 빠져나가기 전에 막아라', 3.5, 'warn');
}
function goFlee(g) { g.state = 'FLEE'; g.path = null; g.icon = '!'; g.iconT = 99; }

