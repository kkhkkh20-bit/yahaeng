function startAmbush(g) {
  const P = S.player, h = P.hide, tx = h ? h.x : P.x, ty = h ? h.y : P.y;
  if(h&&!hideSpace(h,1))return;
  endChat(g); g.act = null; g.path = null; g.moving = false; g.yank = true; g.icon = '!'; g.iconT = 99;
  S.amb = { g, h: h || null, x0: g.x, y0: g.y, tx, ty, t: 0, seen: false, inT: false, intent:{...(g.takedownIntent||{lethal:false})},held:0,holding:true };
  S.bushShake = { x: tx, y: ty, t: S.t }; play('cloth', 0.55); gsay(g, ['읍—!', '뭐, 뭐야—!', '으읍!'][g.id % 3], 0.9);
}
function ambWitness(o, A) {
  if (A.seen === o) return; A.seen = A.seen || o;
  if (o.civ) { if (!(STAGE.zones && startReport(o, A.tx, A.ty, null, null, 'crime'))) civScream(o, A.tx, A.ty, null, null, 'crime'); }  // 끌려가는 몸만 봤다 — 내 얼굴·옷은 모른다
  else { endChat(o); o.state = 'SEARCH'; o.poi = { x: A.tx, y: A.ty, fl: flOf(o), z: 0 }; o.reached = false; o.path = null; o.waitBase = 5; o.meter = Math.max(o.meter, 0.7); o.why = 'saw'; setIcon(o, '!'); gsay(o, ['누가 저 사람을 끌고 갔어!', '저쪽 확인해. 방금 사람 지나갔어.', '저기 누구 있어?'][o.id % 3], 2); setAlert(2, 30); }
  if (!A.warned) { A.warned = true; toast('끌어들이는 걸 누가 봤다!', 2.4, 'warn'); }
}
function updateAmbush(dt) {
  const A = S.amb; if (!A) return; const g = A.g;
  if (g.state === 'DEAD') { S.amb = null; g.yank = false; return; }
  if(A.holding&&combatHeld(A.intent?.source))A.held+=dt;else A.holding=false;
  A.t += dt; const f = Math.min(1, A.t / AMB_DUR);
  // 0~0.15 붙잡혀 움찔 · 0.15~0.6 뒤로 끌려감 · 0.6~1 안으로 (그리기에서 줄어들며 사라진다)
  const u = f < 0.15 ? 0 : Math.min(1, (f - 0.15) / 0.45), e = u * u * (3 - 2 * u), d = dist(A.x0, A.y0, A.tx, A.ty), k = d > 1 ? Math.max(0, (d - (A.h ? 16 : 10)) / d) : 0;
  g.x = A.x0 + (A.tx - A.x0) * e * k; g.y = A.y0 + (A.ty - A.y0) * e * k; g.a = Math.atan2(A.y0 - A.ty, A.x0 - A.tx); g.want = g.a; g.moving = false;
  if (f >= 0.6 && !A.inT) { A.inT = true; S.bushShake = { x: A.tx, y: A.ty, t: S.t }; play(A.h && A.h.type !== 'bush' ? 'metal' : 'cloth', 0.45); }
  if (f < 0.9) for (const o of S.guards) {  // 목격: 끌려가는 몸이 보이면
    if (o === g || o.yank || o.dog || o.child || flOf(o) !== flOf(g) || ['DEAD', 'CAPTIVE', 'TERROR', 'PANIC', 'SLEEP', 'ALERT', 'REPORT', 'FLEE'].includes(o.state) || o.doomed) continue;
    if (dist(o.x, o.y, g.x, g.y) < 700 && canSee(o, g.x, g.y, Math.max(0.45, lightAt(g.x, g.y)), false, false, 0) > 0) ambWitness(o, A);
  }
  if (f < 1) return;
  S.amb = null; g.yank = false; const P = S.player, h = A.h;
  g.takedownIntent={...A.intent,lethal:A.intent.lethal||(A.holding&&A.held>=LETHAL_HOLD),container:h};
  if (h) {
    if (hideSpace(h,1)) { killGuard(g, 'stash', h); toast(h.type === 'well' ? '맨홀 속으로 끌어들였다' : `${withJosa(hideIn(h), '으로/로')} 끌어들였다`, 2, A.seen ? 'warn' : 'good'); }
    else { killGuard(g); toast('끌어들였지만 수거함이 꽉 차 시체가 밖에 남았다', 2.4, 'warn'); }
  } else { killGuard(g, 'bush', P); toast('화단 속으로 끌어들였다', 2, A.seen ? 'warn' : 'good'); }
  if(S.koHold?.g===g)S.koHold.t0=S.t-A.held;
  S.stats.special++;
}
// 끌려가는 사람 그리기: 버둥거림 + 마지막에 숨는 곳 쪽으로 줄어들며 사라짐
function drawYanked(g) {
  const A = S.amb; if (!A || A.g !== g) { drawGuard(g); return; }
  if(['box','well'].includes(A.h?.type))return;
  const f = Math.min(1, A.t / AMB_DUR), q = f > 0.6 ? (f - 0.6) / 0.4 : 0, j = f < 0.9 ? Math.sin(S.t * 46) * (f < 0.15 ? 1.2 : 2.2) : 0;
  ctx.save();if(q>0){ctx.beginPath();ctx.rect(A.tx-130,A.ty-220,260,234);ctx.clip();}
  const ox=g.x,oy=g.y;g.x+=j;g.y+=q*64;drawGuard(g);g.x=ox;g.y=oy;ctx.restore();
}
// 창문 넘기: 창문 옆에 서 있고 반대편이 비어 있으면
// 창문 상태 (도시): open 열림 · lock 잠김(밖에서는 락픽, 안에서는 걸쇠를 풀면 열린다) · bar 방범창(못 지나간다, 엿보기는 된다)
// 건물마다 하나만 열려 있고, 물건·열쇠가 있는 방의 창문은 방범창
// 자경대원이 알아채는 흔적: 원래 잠겨 있던 창문·문이 열려 있으면 다가가 다시 잠근다 (인비저블 Inc 방식)
