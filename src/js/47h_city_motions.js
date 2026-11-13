// ---------------------------------------------------------------- 자유 모드 미션 동작
// 순간이동처럼 넘어가던 손동작을 채운다: 줍기(쪼그려 앉아) · 꾸러미 받기/건네기 · 주인에게 돌려주기 · 갇힌 사람 끌어내기 ·
// 기절한 수배자에게 수갑 채우기 · 연락책과 마주 보기. 걷기가 필요하면 그 자리까지 걸어간 뒤 동작한다.
// o: { x, y (가서 설 자리, 없으면 제자리), face(바라볼 각), pose('crouch'|'grab'|'walk'), dur(동작 초), at:[[초, fn]], end:fn }
function doMotion(o) {
  const P = S.player; if (P.trav || P.car || S.downing) { for (const [, fn] of o.at || []) fn(); o.end && o.end(); return false; }  // 동작할 수 없으면 결과만
  const tx = o.x ?? P.x, ty = o.y ?? P.y, far = dist(P.x, P.y, tx, ty), tW = far > 6 ? Math.min(0.55, far / 220) : 0, dur = tW + o.dur;
  const face = o.face ?? (far > 6 ? Math.atan2(ty - P.y, tx - P.x) : P.a);
  input.aiming = null; P.hide = null; P.cover = null;
  startTrav({ pts: tW ? [{ x: P.x, y: P.y, f: 0 }, { x: tx, y: ty, f: tW / dur }, { x: tx, y: ty, f: 1 }] : [{ x: P.x, y: P.y, f: 0 }, { x: tx, y: ty, f: 1 }], dur,
    phases: tW ? [{ to: tW / dur, pose: 'walk' }, { to: 1, pose: o.pose || 'grab' }] : [{ to: 1, pose: o.pose || 'grab' }], face });
  for (const [t, fn] of o.at || []) after(tW + t, fn);
  if (o.end) after(dur, o.end);  // 동작이 중간에 끊겨도(맞아서 넘어지는 등) 결과는 꼭 적용된다
  return true;
}
// a를 바라보며 b 쪽 가까이 설 자리 (b에서 r만큼 a 쪽)
function standBy(a, b, r = 28) { const k = Math.atan2(a.y - b.y, a.x - b.x); return { x: b.x + Math.cos(k) * r, y: b.y + Math.sin(k) * r, face: k + Math.PI }; }
// 서로 마주 본다 (연락책·주인 등)
function faceEachOther(g) { const P = S.player; if (!g) return; P.a = Math.atan2(g.y - P.y, g.x - P.x); g.a = Math.atan2(P.y - g.y, P.x - g.x); }
// 경찰 검거 미션: 기절시킨 수배자 옆에서 [행동] → 무릎 꿇고 수갑 (1.4초). 그 뒤 순찰차가 데려간 것으로 친다
function cuffAction() {
  const h = S.hit, P = S.player; if (STAGE.cityLife || !h || !h.ko || h.cuffed || P.car) return null;   /* 자유 모드: 쓰러뜨리면 바로 검거 (47b) */ const g = h.g;
  const ko = g.unconscious || (S.corpses || []).some(c => c.g === g && c.ko); if (!ko || dist(P.x, P.y, g.x, g.y) > 70) return null;
  return { k: 'evAct', label: '수갑 채우기', at: { x: g.x, y: g.y - 50 }, fn: () => {
    const s = standBy(P, g, 22);
    doMotion({ x: s.x, y: s.y, face: s.face, pose: 'crouch', dur: 1.4, at: [[0.4, () => play('metal', 0.35, 1.9)], [0.9, () => play('click', 0.5)]],
      end: () => { if (S.hit !== h) return; h.cuffed = true; g.cuffed = true; evBanner('수갑을 채웠다. 순찰차가 데려간다', '#9fc4ff'); after(6, () => { if (S.guards.includes(g)) evGone(g); }); } });
  } };
}
// 꾸러미를 든 모습 (걸을 때 가슴 앞): 일거리 꾸러미를 받은 뒤
function drawCarriedParcel() {
  const j = S.job, P = S.player; if (!j || j.kind !== 'parcel' || !j.got || P.car || flOf(P)) return;
  const ca = Math.cos(P.a || 0), sa = Math.sin(P.a || 0), x = P.x + ca * 9 | 0, y = P.y - 26 + sa * 5 | 0;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - 7, y - 4, 15, 11); ctx.fillStyle = '#a8784a'; ctx.fillRect(x - 7, y - 5, 14, 10); ctx.fillStyle = '#c99a62'; ctx.fillRect(x - 7, y - 5, 14, 2);
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 1, y - 5, 2, 10);  // 테이프
}
