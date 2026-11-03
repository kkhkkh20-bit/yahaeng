// ---------------------------------------------------------------- 상호작용 대상 찾기
// 숨을 곳 이름: 수거함(수거함) · 맨홀(맨홀) · 옷장 · 침대 밑 · 사물함
const FURN_HIDE = { wardrobe: '옷장', bed: '침대 밑', locker: '사물함', okt: '옥탑방' };
// 열쇠·카드키: 색마다 맞는 문만 연다 (gold = 예전 판의 그냥 열쇠)
const KEYS = { gold: ['열쇠', '#f2c46b'], red: ['빨간 카드키', '#ff5a5a'], blue: ['파란 카드키', '#5aa8ff'], green: ['초록 카드키', '#5ad88a'], code: ['비밀번호', '#c8ccd2'], pin: ['머리핀', '#d6d9e0'], gear: ['압수품 가방', '#c9a2ff'], truth: ['진실', '#c9a2ff'], supplies: ['예비 도구', '#c9c2ad'] };
const keyName = k => k === 'code' ? (hasK('code') ? '비밀번호 ' + (STAGE.code || '') : '비밀번호') : (KEYS[k] || KEYS.gold)[0], keyCol = k => (KEYS[k] || KEYS.gold)[1];
const hasK = k => !!(S.player.keys && S.player.keys[k]);
function giveKey(k, msg) { const P = S.player; spawnEffect('loot',{x:P.x,y:P.y-4,fl:flOf(P),z:P.z||0},{scale:.75}); play('click', 0.5);
  if (k === 'supplies' && P.got && P.got.supplies) return;
  if (k === 'pin' || k === 'gear' || k === 'supplies') (P.got || (P.got = {}))[k] = true; else { P.keys[k] = true; P.hasKey = true; }  // 도구는 열쇠 목록에 남기지 않는다
  if (k === 'supplies') { P.picks++; P.kunai++; syncTools(); toast('은닉한 도구 — 락픽 +1 · 다트 +1', 2.6, 'good'); return; }
  if (k === 'pin') { P.picks = (P.picks || 0) + 1; toast('머리핀을 찾았다 — 락픽 대신 한 번 쓸 수 있다', 2.6, 'good'); return; }
  if (k === 'gear') { S.gearRecovered=true;P.picks = Math.max(P.picks || 0, 2); P.stones = Math.max(P.stones || 0, 3); P.kunai = Math.max(P.kunai || 0, 3); syncRuntimeSkills();syncTools(); toast('압수품을 되찾았다 — 락픽·빈 캔·다트', 2.6, 'good'); return; }
  toast((msg || withJosa(keyName(k), '을/를') + (k === 'code' ? ' 알아냈다' : ' 챙겼다')) + (keyPurpose(k) ? ' · '+keyPurpose(k) : ''), 2.2, 'good'); }
const hideName = h => FURN_HIDE[h.type] || (h.type === 'well' ? (STAGE.well === 'manhole' ? '맨홀' : '맨홀') : h.type === 'bush' ? '화단' : '대형 수거함');
const hideIn = h => h.type === 'bed' ? '침대 밑' : hideName(h) + ' 안';
function nearHide() {
  const P = S.player; if (P.wire || P.jump) return null; let best = null, bd = 60;
  for (const b of [...S.hides, ...(S.bushes || [])]) { if (ACT_SKIP.has(b) || (b.type==='bush' && !P.carrying)) continue; if ((b.fl || 0) !== flOf(P) || (b.z || 0) !== (P.z || 0)) continue; const d = hideDistance(b,P); if (d < bd && objectReachable(b)) { bd = d; best = b; } }
  return best;
}
// 오르기: 바닥 쪽(b)에 서 있으면 / 내려가기: 위쪽(u)에 서 있으면
// 시체를 메고는 실내 계단(fstair)만 오른다 (사다리·배관·옥상 계단은 못 오른다)
// 그려진 관 축과 이동 동작은 같은 좌표를 사용한다. 옥상 착지점은 별도로 보존한다.
function pipeGeometry(l) {
  const landing={x:l.rx??l.ux,y:l.ry??l.uy},nx=Math.sign(l.x-l.ux),ny=Math.sign(l.y-l.uy),b=BLD[bldAt(l.tx,l.ty)];
  const height=Math.max(1,(l.tz||1)-(l.bz||0));
  let x=nx?(l.x+l.ux)/2+nx*3:l.ux,bottom=l.y-26,base=l.y+8,top=Math.min(bottom-height*40,landing.y+ny*20-16);
  if(l.gas&&b){x=l.tx*TILE+(l.tx===b.x0?9:l.tx===b.x1?TILE-9:TILE/2);top=b.facade?(b.y1-b.fh+1)*TILE+4:bottom-height*40;base=(b.y1+1)*TILE+6;}
  return {top:{x,y:Math.min(top,bottom-28)},bottom:{x,y:bottom},base:{x,y:base},landing,face:Math.atan2(l.uy-l.y,l.ux-l.x)};
}
function pipeTravel(l,P,up) {
  const geometry=pipeGeometry(l),key=playerKey(P),foot=at=>climbContact(key,geometry.face,0,at)?.foot||at,a=foot(geometry.bottom),b=foot(geometry.top),lv=Math.max(1,(l.tz||1)-(l.bz||0));
  return {pipe:l,face:geometry.face,base:{x:l.x,y:l.y},step:'metal',loud:45,down:!up,dur:.65+lv*.65,
    pts:up?[{x:P.x,y:P.y,f:0},{...a,f:.16},{...b,f:.8},{...geometry.landing,f:1}]:[{x:P.x,y:P.y,f:0},{...b,f:.2},{...a,f:.84},{x:l.x,y:l.y,f:1}],
    phases:up?[{to:.16,pose:'walk'},{to:.8,pose:'climb'},{to:1,pose:'vault'}]:[{to:.2,pose:'vault'},{to:.84,pose:'climb'},{to:1,pose:'walk'}]};
}
function pipeGripAt(T) {
  const geometry=pipeGeometry(T.pipe),f=clamp(T.t/T.dur,0,1),u=T.down?1-clamp((f-.2)/.64,0,1):clamp((f-.16)/.64,0,1);
  return {x:geometry.bottom.x,y:geometry.bottom.y+(geometry.top.y-geometry.bottom.y)*u};
}
function nearClimb() {
  const P = S.player; if (P.captive || P.jump) return null; let best = null, bd = 44;
  for (const l of S.ladders) { if (ACT_SKIP.has(l)) continue; if (P.carrying && l.kind !== 'fstair') continue; if (l.bz !== P.z || (P.z === 0 && (l.bfl || 0) !== flOf(P)) || (l.kind === 'chimney' && lampOn(l.lamp))) continue; let d = dist(P.x, P.y, l.x, l.y);
    if (l.kind === 'fstair' || l.kind === 'stair') { if (!stairAccess(l, true, P)) continue; const g = stairLower(l), a = clamp((P.x-g.shaft.x)*g.d[0]+(P.y-g.shaft.y)*g.d[1],0,TILE); d = dist(P.x,P.y,g.shaft.x+g.d[0]*a,g.shaft.y+g.d[1]*a); }
    if (d < bd) { bd = d; best = l; } }
  return best;
}
// 계단실 (꺾인 두 줄): 올라가는 줄 = 계단 칸 Y + 들어서는 칸 e(=Y+d), 위층의 옆 줄 = 내려가는 구멍 c1(Y 옆, 깊은 쪽)·c2(e 옆, 바닥 쪽 끝)
// 내려가기는 열린 층계참에서, 오르기는 해당 층의 올라가는 줄에서만 선택한다
function stairHole(l) { return l.kind === 'fstair' ? stairUpper(l).well : null; }
// 내려가는 입구는 난간 구멍 안이 아니라 그 앞의 걸을 수 있는 층계참이다.
const downPt = l => l.kind === 'fstair' ? stairUpper(l).down.entry : { x: l.x, y: l.y };
const downMark = l => l.kind === 'fstair' ? stairUpper(l).down.marker : downPt(l);
// 위층에서 아래층으로
function nearFloorDown() {
  const P = S.player; if (P.z || !flOf(P) || P.jump || P.captive) return null; let best = null, bd = 1e9;
  for (const l of S.ladders) { if (ACT_SKIP.has(l)) continue; if ((l.kind !== 'fstair' && l.kind !== 'balc') || l.tfl !== flOf(P) || (P.carrying && l.kind !== 'fstair')) continue; const p = l.kind === 'balc' ? { x: l.ux, y: l.uy } : downPt(l), r = 60, d = dist(P.x, P.y, p.x, p.y); if (d < r && d < bd && (l.kind === 'balc' || stairAccess(l, false, P))) { bd = d; best = l; } }  // 난간 옆·뒤에서는 선택되지 않는다
  return best;
}
function nearNote() {
  const P = S.player; if (P.z || P.wire || P.jump || P.hide || !S.notes) return null; let best = null, bd = 44;
  for (const n of S.notes) { if (ACT_SKIP.has(n)) continue; if (n.fl !== flOf(P)) continue; const d = n.surface ? hideDistance(surfaceFixture(n),P) : dist(P.x, P.y, n.x, n.y); if (d < bd && objectReachable(n, 44)) { bd = d; best = n; } }
  return best;
}
// 쪽지를 읽는다. 표적을 살려 둘 근거(spare)가 되는 쪽지면 선택이 열린다
function readNote(n) {
  const first = !n.read; n.read = true; play('cloth', 0.35);
  if (first && n.gives) { S.player.keys[n.gives] = true; S.player.hasKey = true; if (n.learn) S.learned.push(n.learn); toast('알아냈다 — ' + (n.learn || keyName(n.gives)), 3, 'good'); }
  const lines = n.lines.map(t => [{ note: n.title }, t]);
  const sp = STAGE.spare, tgt = S.guards.find(g => g.target);
  if (first && sp && n.key === sp.note && tgt) {
    if (tgt.state === 'DEAD') { S.realized = true; lines.push(['hero', sp.after]); }
    else { S.spare = true; lines.push(['hero', sp.before]); }
  }
  say(lines, true, () => { if (S.spare && tgt && tgt.state !== 'DEAD') { toast(sp.toast, 4.5, 'good'); checkObjective(); } });
}
// 위층 옆 창문 → 마주 보는 옆 건물 창문
// 넘어 들어가는 곳 바로 앞에 있는 사람(같은 층) — 착지와 함께 처리한다
function landingVictim(x, y, fl) {
  const L0 = CUR_F; setLayer(fl); let best = null, bd = 78;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || flOf(g) !== fl || g.z || g.climb || g.dog || (g.state === 'ALERT' && !g.target)) continue;
    const d = dist(x, y, g.x, g.y); if (d < bd && los(x, y, g.x, g.y)) { bd = d; best = g; }
  }
  setLayer(L0); return best;
}
function nearSideWin() {
  const P = S.player; if (P.z || !flOf(P) || P.wire || P.jump || P.carrying || P.captive) return null; let best = null, bd = 46;
  for (const w of S.fwindows) { if (ACT_SKIP.has(w)) continue; if (!w.link || w.fl !== flOf(P)) continue; const ix = tc(w.tx - w.link.dir), d = dist(P.x, P.y, ix, w.y); if (d < bd) { bd = d; best = w; } }
  return best;
}
// 위층 창문 안쪽에서 창밖 전깃줄로
function nearWinWire() {
  if (!wireUsable()) return null;
  const P = S.player; if (P.z || !flOf(P) || P.wire || P.jump || P.carrying || P.captive) return null; let best = null, bd = 52;
  for (const w of S.wires) for (const [n, s] of [[w.a, 0], [w.b, 1]]) { if (ACT_SKIP.has(w) || !n.win || n.fl !== flOf(P)) continue; const d = dist(P.x, P.y, tc(n.tx), tc(n.ty - 1)); if (d < bd) { bd = d; best = { w, s, at: { x: tc(n.tx), y: tc(n.ty) } }; } }
  return best;
}
function nearClimbDown(manualOnly = false) {
  const P = S.player; if (!P.z || P.jump) return null; let best = null, bd = 52;
  for (const l of S.ladders) { if (ACT_SKIP.has(l) || (manualOnly && l.kind === 'stair' && l.roofDoor)) continue; if (l.tz !== P.z) continue;
    const entry = l.roofDoor;
    if (entry) {
      const vx = P.x - entry.x, vy = P.y - entry.y;
      if (vx * entry.dx + vy * entry.dy < 0 || Math.abs(vx * -entry.dy + vy * entry.dx) > 30 || !objectReachable(entry, 52)) continue;
    }
    const d = dist(P.x, P.y, entry ? entry.x : l.rx != null ? l.rx : l.ux, entry ? entry.y : l.ry != null ? l.ry : l.uy); if (d < bd) { bd = d; best = l; } }
  return best;
}
// 골목 건너뛰기: 바라보는 방향으로 1~2칸 틈 너머의 같은 높이(또는 한 층 아래) 옥상
function jumpTarget() {
  const P = S.player; if (!P.z || P.jump) return null;
  const k = Math.round(P.a / (Math.PI / 4)), a = k * Math.PI / 4;
  const dx = Math.round(Math.cos(a)), dy = Math.round(Math.sin(a));
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  if (rLv(tx + dx, ty + dy) >= P.z) return null;
  const ex = tc(tx) + dx * TILE / 2, ey = tc(ty) + dy * TILE / 2;
  if (dist(P.x, P.y, ex, ey) > 34) return null;
  // 정면벽 줄(건물 옆면)은 거리에 넣지 않는다: 실제 틈은 골목 폭이다
  let real = 0;
  for (let n = 1; n <= 12; n++) {
    const lx = tx + dx * n, ly = ty + dy * n; if (!inMap(lx, ly)) return null;
    const lv = rLv(lx, ly);
    if (n > 1 && lv > 0 && !robAt(lx,ly) && (lv === P.z || lv === P.z - 1) && real >= 1) return { tx: lx, ty: ly, z: lv };
    if (lv >= P.z) return null;
    if (!facadeRow(lx, ly)) real++;
    if (real > 1) return null;  // 사람 한 칸 정도 틈만 건너뛴다
  }
  return null;
}
const MELEE_CONTACT=48,LUNGE=112;
const meleeReach=(P=S.player)=>STAGE.artSlice?134:skillOn('reach')&&!P.carrying?LUNGE:MELEE_CONTACT;
function canKill(g,P,reach=meleeReach(P)){return meleeCandidate(g,P,Math.min(reach,g.civ?MELEE_CONTACT:meleeReach(P)));}
function meleeCandidate(g, P, reach) {
  if(!concealedMeleeAllowed(P))return false;
  if (g.child || g.state === 'DEAD' || g.state === 'CAPTIVE' || g.doomed || g.climb || flOf(g) !== flOf(P) || (g.z || 0) !== (P.z || 0)) return false;
  const d = dist(P.x, P.y, g.x, g.y); if (d > reach) return false;
  if (g.state === 'ALERT' && !g.target && !radioBusy(g)) return false;
  const behind = Math.abs(angDiff(g.a, Math.atan2(P.y - g.y, P.x - g.x))) > (skillOn('blindside')&&!g.elite&&!g.civ?1.4:1.75);
  if (g.civ) return (behind || g.state === 'SLEEP' || g.state === 'PANIC' || g.state === 'REPORT') && los(P.x, P.y, g.x, g.y);
  if (!behind && !(g.target && (g.state === 'FLEE' || (g.state !== 'ALERT' && d < 36))) && !(radioBusy(g) && d <= 56)) return false;
  return los(P.x, P.y, g.x, g.y) && (d <= 56 || lungeClear(P, g));
}
// 돌진 경로: 가는 길에 벽·가구가 없어야 한다
function lungeClear(P, g) {
  const n = Math.ceil(dist(P.x, P.y, g.x, g.y) / 12), sol = solidFor(P.z || 0);
  for (let i = 1; i < n; i++) { const x = P.x + (g.x - P.x) * i / n, y = P.y + (g.y - P.y) * i / n; if (sol(Math.floor(x / TILE), Math.floor(y / TILE))) return false; }
  return true;
}
// 땅 위 암살 대상 (최대 2명 — 붙어 있으면 동시 암살)
function killList() {
  const P = S.player; if (P.carrying || P.captive || P.strikeT > 0 || P.hide || P.jump || P.wire || P.trav || P.under || P.vent) return [];
  if (P.lunge || P.grabIn) return [];
  let list = S.guards.filter(g => !ACT_SKIP.has(g) && canKill(g, P)).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y));
  if (STAGE.artSlice && list.length >= 2 && dist(list[0].x, list[0].y, list[1].x, list[1].y) < 112) return [list[0], list[1]];
  return list.slice(0, 1);
}
// 옥상 위에서 아래로 떨어지며 암살
function dropTarget() {
  const P = S.player; if ((!STAGE.tutorial&&!skillOn('drop')) || !P.z || P.z >= 3 || P.strikeT > 0 || P.jump) return null;
  // 옥상 가장자리 바깥의 맨땅 칸(뛰어내릴 자리)을 먼저 찾는다
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  const edges = N8.map(o => [tx + o[0], ty + o[1]]).filter(([x, y]) => !roofAt(x, y) && bldAt(x, y) < 0 && !groundSolidP(x, y));
  if (!edges.length) return null;
  let best = null, bd = P.z >= 2 ? 132 : 118;
  for (const g of S.guards) { if (g.child||g.civ||g.dog||g.elite) continue;

    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || (g.state === 'ALERT' && !g.target) || flOf(g) || g.z || g.climb) continue;
    // 옥상 아래(건물 안)에 있는 사람은 옥상 위에서 칠 수 없다
    const gx = Math.floor(g.x / TILE), gy = Math.floor(g.y / TILE);
    if (roofAt(gx, gy) || bldAt(gx, gy) >= 0) continue;
    const d = dist(P.x, P.y, g.x, g.y); if (d >= bd) continue;
    // 뛰어내릴 자리에서 표적까지 벽에 막히지 않아야 한다
    if (!edges.some(([x, y]) => dist(tc(x), tc(y), g.x, g.y) < 100 && los(tc(x), tc(y), g.x, g.y))) continue;
    bd = d; best = g;
  }
  return best;
}
// 맨홀 속에서 끌어들이는 기습 암살
// 숨은 곳(수거함·맨홀·화단)에서 지나가는 자경대원을 끌어들여 암살 — 등 뒤일 필요 없음
function ambushTarget() {
  if(!abilityOn('ambush'))return null;
  const P = S.player;
  const from = P.hide ? P.hide : (P.hidden && P.z === 0 && !P.carrying && !P.captive ? P : null);
  if (!from || P.strikeT > 0 || S.amb || (P.hide&&!hideSpace(P.hide,1))) return null;
  let best = null, bd = P.hide ? 80 : 60;
  for (const g of S.guards) { if (g.child) continue;  // 아이는 손댈 수 없다

    if (g.state === 'DEAD' || g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'CAPTIVE' || g.yank || flOf(g) !== flOf(P) || g.z || g.climb) continue;
    const d = dist(from.x, from.y, g.x, g.y); if (d < bd && los(from.x, from.y, g.x, g.y)) { bd = d; best = g; }
  }
  return best;
}
// 끌어들여 암살: 순간이동 대신 약 1.2초 동작 — 움찔(붙잡힘) → 뒤로 끌려감 → 안으로 사라짐.
// 그동안 끌려가는 사람이 다른 사람 눈에 보이면 목격: 조직원은 그 자리로 덮치고(발각), 주민은 소리치거나 신고하러 간다
const AMB_DUR = 1.2;

function concealedAttackCandidate(P=S.player){
  const radius=P.hide?80:P.vent?80:P.cover?60:P.hidden?60:meleeReach(P);
  return S.guards.find(g=>!g.child&&!g.climb&&!g.yank&&!['DEAD','CAPTIVE','FLEE','TERROR'].includes(g.state)&&flOf(g)===flOf(P)&&(g.z||0)===(P.z||0)&&dist(P.x,P.y,g.x,g.y)<=radius&&sightLine(P,g.x,g.y,g.z||0,false,flOf(g)))||null;
}
