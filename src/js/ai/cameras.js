const camOn = c => !(c.hackedUntil>S.t) && !c.broken && !c.unplugged && !(S.camsOff && !c.search) && !(c.outdoor ? mainPowerOff(c) : (S.bfuses || []).some(f => f.b === c.b && f.cut));
function cameraCableReachable(c){
  const P=S.player;
  return !!c&&S.cams.includes(c)&&!c.search&&camOn(c)&&!P.hide&&!P.under&&!P.vent&&!P.z&&!P.carrying&&!P.captive&&objectReachable(c,40);
}
function nearCameraCable(){
  return S.cams.filter(c=>!ACT_SKIP.has(c)&&cameraCableReachable(c)).sort((a,b)=>dist(S.player.x,S.player.y,a.x,a.y)-dist(S.player.x,S.player.y,b.x,b.y))[0]||null;
}
const CAM_FOV = 0.42, SL_FOV = 0.2, SL_R = 520;  // 서치라이트: 좁고 멀리
const camFov = c => c.search ? SL_FOV : CAM_FOV;
function cameraSees(c,x,y,light) { const d = dist(c.x, c.y, x, y); if (d > camRange(c, light)||smokeRayRange(c,x,y,d)<d-4) return 0; if (Math.abs(angDiff(c.a, Math.atan2(y - c.y, x - c.x))) > camFov(c)) return 0; if (castRay(c.x, c.y, Math.atan2(y - c.y, x - c.x), d) < d - 6) return 0; return c.search ? 1 - d / (SL_R + 80) : 1 - d / 360; }
function camRange(c, light) { return c.search ? SL_R : light > 0.3 ? 300 : 135; }
// The preview and live detector share geometry and permission tests. An allowed
// uniform excuses ordinary passage, never work witnessed by the camera.
function cameraAssessment(c,plannedWork=false){
  const P=S.player;if(!camOn(c)||flOf(P)!==c.fl||P.hide||P.under||P.vent||P.z||P.wire)return{visible:0,detectable:false,reason:''};
  const previous=CUR_F;setLayer(c.fl);let visible;try{visible=cameraSees(c,P.x,P.y,P.light);}finally{setLayer(previous);}
  const known=knownFace({state:''}),illegal=plannedWork||!!suspAct(null),allowed=STAGE.zones&&pZoneEff({state:''})===Z_PUB;
  return{visible,detectable:visible>0&&(!allowed||illegal||known),reason:illegal?'수상한 작업':known?'공유된 인상착의':pZoneInfo().secure?'보안구역 침입':'출입 권한 없음'};
}
// CCTV 관리실: 화면을 보는 사람이 있어야 CCTV가 경보로 이어진다. 관리실이 비면(쓰러뜨리면) 찍혀도 녹화만 된다
const camWatcher = () => { if (!S.camRoom) return true; const op = npc('camop'); return !!op && !['DEAD', 'CAPTIVE', 'SLEEP', 'TERROR', 'ALERT'].includes(op.state) && !op.climb && !op.brawl && flOf(op) === S.camRoom.fl && !(op.z || 0) && dist(op.x, op.y, S.camRoom.x, S.camRoom.y) < 85; };
function camReport(c, text, x, y) {
  if (c.search || camWatcher()) { const op = !c.search && S.camRoom && npc('camop'); if (op) gsay(op, '카메라에 수상한 사람 보인다. 현장 확인해.', 2.4); return true; }
  if (!S.camBlindToast) { S.camBlindToast = true; toast('CCTV 녹화 중 · 관리실에 사람이 없어 신고는 전달되지 않는다', 2.8); } return false;
}
// 서치라이트: 경보가 울리면 마지막으로 본 자리 쪽으로 빛을 돌린다
function searchAim(c) { const g = S.guards.find(o => o.state === 'ALERT' && o.lastSeen && !o.civ) || S.guards.find(o => o.state === 'SEARCH' && o.poi && !o.civ); const p = g ? (g.state === 'ALERT' ? g.lastSeen : g.poi) : null; return p && dist(c.x, c.y, p.x, p.y) < SL_R ? Math.atan2(p.y - c.y, p.x - c.x) : null; }
function updateCams(dt) {
  const P = S.player, L0 = CUR_F;
  for (const c of S.cams || []) {
    if (!camOn(c)) { c.meter = Math.max(0, c.meter - dt); continue; }
    const s = Math.sin((S.t + c.ph) * TAU / c.period), ta = c.search && S.alevel >= 2 ? searchAim(c) : null;
    if (ta != null) c.a += clamp(angDiff(c.a, ta), -1.4 * dt, 1.4 * dt); else c.a = c.search ? c.a + clamp(angDiff(c.a, c.base + c.sweep * s), -0.8 * dt, 0.8 * dt) : c.base + c.sweep * clamp(s * 1.35, -1, 1);
    if (c.cool > 0) { c.cool -= dt; continue; }
    setLayer(c.fl);
    const sees = (x,y,light) => cameraSees(c,x,y,light);
    const assessment=cameraAssessment(c),v=assessment.detectable?assessment.visible:0;
    c.seen = v > 0;
    if (v > 0) { c.meter = Math.min(1, c.meter + dt * (0.9 + v * 1.8) * (!STAGE.zones && S.player.disguise && !S.player.disguiseBlown && S.player.mode !== 'run' && suspAct(null) < 1 ? 0.12 : 1)); if (c.meter >= 1) {
      c.meter = 0; c.cool = 6; if (!c.search) { S.stats.camEver = Math.max(S.stats.camEver||0,S.stats.camRec||0)+1; S.stats.camRec = (S.stats.camRec || 0) + 1; recordCameraEvidence(c); }  // 서치라이트는 녹화가 아니다
      if (camReport(c)) { play('alarm', 0.4); setAlert(2, 40, c.search ? '서치라이트에 비쳤다 — 조직원이 몰려온다' : 'CCTV에 찍혔다 — 자경대원이 몰려온다');
      const at = pSpot(); rememberSuspect(null); startBuildingSearch(at, 'A', 'camera'); }
    } } else c.meter = Math.max(0, c.meter - dt * 0.4);
    for (const k of S.corpses) { if (k.hideT>S.t || k.stashed || k.carried || k.discovered || k.camSeen || flOf(k) !== c.fl || (k.z || 0) !== (c.z || 0)) continue; if (k.accident && sees(k.x, k.y, Math.max(0.5, k.light || 0))) { if(camWatcher()){k.camSeen=true;securityBodyFound(k,null);}continue; }  // 관리자가 확인한 사고는 연락 두절에서 제외한다
      if (!k.byNpc && sees(k.x, k.y, Math.max(0.5, k.light || 0)) && camReport(c)) { securityBodyFound(k,null); k.camSeen = true; k.discovered = true; S.stats.bodies++; bossRadio('body'); S.stats.camRec = (S.stats.camRec || 0) + 1; setAlert(2, 40, 'CCTV에 쓰러진 사람이 찍혔다 — 수색 시작'); startBuildingSearch({ x: k.x, y: k.y, fl: flOf(k), z: k.z || 0 }, 'A', 'body'); } }
  }
  setLayer(L0);
  if ((S.cams || []).some(c => camOn(c) && c.fl === flOf(P) && dist(c.x, c.y, P.x, P.y) < 420)) hint('cctv', (STAGE.zones?'공개 구역에서 평범하게 걸으면 CCTV는 신고하지 않는다. ':'')+'시야를 피해 접근해 행동으로 전선 분리 · 기술 불필요. 이미 녹화된 기록은 관리실에서 삭제한다');
}
function drawCams(fl) {
  const cr = S.camRoom; if (cr && cr.fl === fl) {  // 관리실 모니터 (켜져 있으면 깜빡인다)
    ctx.fillStyle = '#1a1d24'; ctx.fillRect(cr.x - 26, cr.y - 30, 52, 16);
    for (let i = 0; i < 3; i++) { const on = !S.camsOff; ctx.fillStyle = on ? `rgba(120,190,255,${0.55 + 0.25 * Math.sin(S.t * 7 + i * 2)})` : '#2a2d34'; ctx.fillRect(cr.x - 24 + i * 17, cr.y - 28, 14, 11); } }
  for (const c of S.cams || []) {
    if (c.fl !== fl) continue; const on = camOn(c);
    if (on && (c.search || showVisionField(c))) {
      setLayer(fl); const pts = []; const R = camRange(c, 1), FV = camFov(c); for (let i = 0; i <= 14; i++) { const a = c.a - FV + 2 * FV * i / 14; pts.push([a, Math.min(castRay(c.x,c.y,a,R),smokeRayRange(c,c.x+Math.cos(a)*R,c.y+Math.sin(a)*R,R))]); } setLayer(flOf(S.player));
      const path = r => { ctx.beginPath(); ctx.moveTo(c.x, c.y); for (const [a, d] of pts) { const dd = Math.min(d, r); ctx.lineTo(c.x + Math.cos(a) * dd, c.y + Math.sin(a) * dd); } ctx.closePath(); };
      if (c.search) { const gr = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, R); gr.addColorStop(0, 'rgba(255,248,210,.55)'); gr.addColorStop(1, 'rgba(255,248,210,.06)'); ctx.fillStyle = gr; path(R); ctx.fill(); ctx.strokeStyle = `rgba(255,240,180,${0.5 + c.meter * 0.5})`; ctx.lineWidth = 2; path(R); ctx.stroke(); }  // 서치라이트 빛줄기
      else {
      const recording=c.seen&&c.meter>0,col=recording?'255,115,90':'157,182,210';
      ctx.fillStyle = `rgba(${col},${0.09 + c.meter * 0.22})`; path(R); ctx.fill();
      ctx.fillStyle = `rgba(${col},${0.12 + c.meter * 0.24})`; path(135); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${0.55 + c.meter * 0.4})`; ctx.lineWidth = 2.2; ctx.setLineDash([5, 5]); path(R); ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-7, -5, 20, 12); ctx.fillStyle = c.broken ? '#4a4d55' : '#d8dbe2'; ctx.fillRect(-9, -6, 18, 11); ctx.fillStyle = '#2a2d34'; ctx.fillRect(7, -4, 5, 7);
    ctx.fillStyle = c.broken||c.unplugged ? '#666' : on && Math.floor(S.t * 2) % 2 ? '#ff3b3b' : '#601818'; ctx.beginPath(); ctx.arc(-4, 0, 2.2, 0, TAU); ctx.fill();
    if(c.unplugged){ctx.strokeStyle='#777e89';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-17,3);ctx.lineTo(-17,10);ctx.stroke();}
    ctx.restore();
    if (c.broken && Math.random() < 0.05) S.fx.push({ k: 'smoke', x: c.x, y: c.y, t: 0 });
    if (c.meter > 0.02 && on) { ctx.strokeStyle = 'rgba(255,90,90,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 16, -Math.PI / 2, -Math.PI / 2 + TAU * c.meter); ctx.stroke(); }
  }
}
