// ---------------------------------------------------------------- 자유 모드 저격총 조준경
// 저격총을 든 채 걸어서 0.3초 멈추면 조준경: 시야가 넓어지고(1000px), 앞쪽 좁은 부채꼴(약 50°) 안 가장 가까운 사람(의뢰 표적 먼저)에 붉은 십자선.
// 움직이면 풀린다. 옥상에서 쏘면 건물 벽 위로 날아간다. 500px 넘게 떨어진 한 방은 짧은 느린 화면.
function scopeReady() { return !!S.scope; }
function sniperUpdate(dt) {
  if (!STAGE.cityLife) return; const P = S.player;
  const hold = S.wpn === 'sniper' && (S.guns?.sniper || 0) > 0 && !P.car && !P.trav && !P.hide && !P.moving && !S.downing && !S.cuffs && !S.safeIn;
  S.stillT = hold ? (S.stillT || 0) + dt : 0;
  const on = S.stillT > 0.3; if (on && !S.scope) play('click', 0.35, 1.6); S.scope = on;
  if (on && (S.scopeT = (S.scopeT || 0) - dt) <= 0) { S.scopeT = 0.12; S.snipeAim = true; S.scopeTgt = gunAim(); S.snipeAim = false; }
  if (!on) S.scopeTgt = null;
  if ((S.chipT = (S.chipT || 0) - dt) <= 0) { S.chipT = 0.3; gunChip(); }  // 소지품 개수·아이콘 갱신 (같으면 DOM을 건드리지 않는다)
}
// 카메라 앞보기: 표적(없으면 바라보는 쪽 600px)까지의 45%
function scopeLead() { const P = S.player, g = S.scopeTgt, x = g ? g.x : P.x + Math.cos(P.a) * 600, y = g ? g.y : P.y + Math.sin(P.a) * 600; return { x: (x - P.x) * 0.45, y: (y - P.y) * 0.45 }; }
function drawScope() {
  if (!S.scope) return; const P = S.player, g = S.scopeTgt;
  const x = g ? g.x : P.x + Math.cos(P.a) * 600, y = g ? g.y - 14 : P.y + Math.sin(P.a) * 600, r = g ? 16 : 22;
  ctx.save(); ctx.strokeStyle = g ? 'rgba(255,60,50,.9)' : 'rgba(255,240,220,.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(x + dx * (r - 6), y + dy * (r - 6)); ctx.lineTo(x + dx * (r + 8), y + dy * (r + 8)); ctx.stroke(); }
  ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(255,80,60,.35)'; ctx.beginPath(); ctx.moveTo(P.x, P.y - 14); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
}
// ---------------------------------------------------------------- 운전 중 조작 안내 (화면 아래 가운데, 차에 있는 동안만)
// 무엇으로 내리는지 헷갈리지 않게: PC는 키, 휴대폰은 버튼 이름으로
function carHintUpdate() {
  let el = document.getElementById('carHint'); const P = S.player, on = STAGE.cityLife && P.car && !S.downing && !S.cuffs && !DLG.modal;
  if (!on) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'carHint'; el.setAttribute('aria-live', 'off');
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);z-index:34;pointer-events:none;display:flex;gap:6px;font:600 13px "Yahaeng UI",sans-serif;color:#efe6cf;white-space:nowrap';
    document.body.appendChild(el); }
  const gun = wpnOn() && !WEAPONS[S.wpn]?.melee, W = gun && WEAPONS[S.wpn];
  const keys = isTouch ? [['행동 버튼', P.car.fireT > 0 || Math.abs(P.car.v) >= 60 ? '뛰어내리기' : '차에서 내리기'], ['공격 버튼', gun ? (W.throw ? '창밖으로 던지기' : '창밖으로 쏘기') : '경적']]
    : [['F', P.car.fireT > 0 || Math.abs(P.car.v) >= 60 ? '뛰어내리기' : '내리기'], ['Space', gun ? (W.throw ? '던지기' : '창밖 사격') : '경적'], ['L', '무기'], ['M', '지도']];
  const html = keys.map(([k, t]) => `<span style="background:rgba(12,14,20,.78);border:1px solid #4a5160;border-radius:5px;padding:4px 8px"><b style="color:#ffd76a">${k}</b> ${t}</span>`).join('');
  if (el.dataset.k !== html) { el.innerHTML = html; el.dataset.k = html; } el.hidden = false;
}

// ---------------------------------------------------------------- 총 든 모습 (구운 동작: gun* 권총 / rifle* 기관단총·산탄총·저격총)
// 무기를 고르면 0.32초 동안 허리에서 꺼내 든다(gunDraw). 든 동안: 서면 겨누기(Aim) · 걸으면 겨누고 걷기 · 뛰면 뛰기.
// 쏠 때마다 0.22초 반동(Shoot). 맨손으로 바꾸면 꺼내기를 거꾸로(집어넣기). 던지는 무기는 기존 던지기 동작(punch)
const GUN_DRAW_T = 0.32, GUN_SHOT_T = 0.22;
const gunFamily = k => !k || WEAPONS[k]?.throw || WEAPONS[k]?.melee ? null : ['pistol', 'silenced'].includes(k) ? 'gun' : 'rifle';
function gunPose(P, moving, running) {
  if (P.car || P.hide || P.trav || P.climb || P.z && !STAGE.cityLife) return null;
  const now = wpnOn() ? gunFamily(S.wpn) : null, G = P.gunVis || (P.gunVis = { fam: null, t: -9, out: null, tOut: -9 });
  if (now !== G.fam) { if (G.fam && !now) { G.out = G.fam; G.tOut = S.t; } G.fam = now; G.t = S.t; }
  if (!now) { const k = (S.t - G.tOut) / GUN_DRAW_T; if (G.out && k < 1) return { anim: G.out + 'Draw', frame: (1 - k) * 8 }; return null; }
  const kd = (S.t - G.t) / GUN_DRAW_T; if (kd < 1) return { anim: now + 'Draw', frame: kd * 8 };
  const ks = (S.t - (P.shotT || -9)) / GUN_SHOT_T; if (ks < 1 && !moving) return { anim: now + 'Shoot', frame: ks * 5 };
  return { anim: now + (moving ? (running ? 'Run' : 'Walk') : 'Aim'), frame: -1 };
}

// 적의 총 든 모습 (구운 gun* 동작): 겨누는 중(경찰 조준·킬러 조준·총격전) → 겨누기, 막 쏨 → 반동, 무장하고 쫓음 → 겨누고 뛰기
function npcGunPose(g) {
  if (g.state === 'DEAD' || g.civ && !g.hunter && !g.aimH) return null;
  const shot = (S.t - (g.shotT || -9)) / GUN_SHOT_T; if (shot < 1) return { anim: 'gunShoot', frame: shot * 5 };
  if ((g.aim || 0) > 0 || (g.aimH || 0) > 0) return { anim: 'gunAim', frame: -1 };
  if (g.warSide != null && S.war && !S.war.over) return { anim: g.moving ? 'gunWalk' : 'gunAim', frame: -1 };
  if (g.police && !g.contact && S.wanted >= 2 && ['ALERT', 'SEARCH'].includes(g.state)) return { anim: g.moving ? 'gunRun' : 'gunAim', frame: -1 };
  return null;
}
