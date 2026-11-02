function drawPlayerLocator(P) {
  const k=1/SCALE,x=P.x,y=P.y+10,a=P.car?P.car.a:P.cover?Math.atan2(P.cover.y,P.cover.x):P.a;
  const col='#7fe3ff';  // 내 위치는 항상 같은 색. 위험은 중앙 상태와 시선 방향 호가 알린다.
  ctx.save();ctx.setLineDash([]);ctx.lineWidth=3.5*k;ctx.strokeStyle='#081015cc';ctx.beginPath();ctx.ellipse(x,y,11*k,5*k,0,0,TAU);ctx.stroke();
  ctx.lineWidth=1.5*k;ctx.strokeStyle=col;ctx.stroke();
  if(P.hide){ctx.restore();return;}
  const dx=Math.cos(a),dy=Math.sin(a),px=x+dx*15*k,py=y+dy*9*k;
  ctx.fillStyle='#7fe3ff';ctx.strokeStyle='#081015';ctx.lineWidth=1.5*k;ctx.beginPath();ctx.moveTo(px+dx*3*k,py+dy*3*k);ctx.lineTo(px-dx*3*k-dy*3*k,py-dy*3*k+dx*3*k);ctx.lineTo(px-dx*3*k+dy*3*k,py-dy*3*k-dx*3*k);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
}
function drawPlayer(P) {
  const previous=playerInkKey;playerInkKey=isTouch?playerKey(P):null;
  try{return drawPlayerBody(P)}finally{playerInkKey=previous;}
}
function drawPlayerBody(P) {
  if(P.trav?.hideFlow||P.trav?.accessFlow||P.trav?.signFlow)return;
  const playerLook = playerKey(P), playerOutline = playerLook + '_ol';
  if (usePR(playerLook)) prSheet(playerLook);
  if(P.assassinAnim&&drawAssassinActors(P,playerLook))return;
  if (P.car) return;  // 차 안: 차가 곧 나
  if (P.wire) {
    // 전깃줄에 두 손으로 매달린 모습 (땅에는 그림자)
    const h = wirePt(P.wire.w, P.wire.s), sw = P.moving ? Math.sin(S.t * 9) * 2 : 0, dim = P.light < 0.3;
    const blinkW = P.hurtT > 0 && Math.floor(P.hurtT * 12) % 2;
    { const gp = wireGround(P.wire.w, P.wire.s), sx = gp.x + (P.z || 1) * SHD.x, sy = gp.y + (P.z || 1) * SHD.y;  // 땅에 떨어진 내 그림자: 높이만큼 떨어져 있다
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.ellipse(sx, sy, 13, 6.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 19, 9.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,230,255,.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(h.x, h.y + 46); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]); }
    if (usePR(playerLook) && PR.anims.hang && PR.hangHand) {  // 프리렌더 매달림: 두 손을 줄에 맞추고, 움직이면 다리를 흔들며 옮겨 간다
      const nf=PR.anims.hang[1],fi=P.moving?Math.floor(S.t*6)%nf:0;
      drawHangPR(playerLook,h.x+sw,h.y+2,P.wire.fa??-Math.PI/2,fi,blinkW?.3:dim?.75:1);
      ctx.globalAlpha = 1; return;
    }
    ctx.strokeStyle = '#2c3040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(h.x - 8 + sw, h.y + 18); ctx.lineTo(h.x - 5, h.y + 1); ctx.moveTo(h.x + 8 + sw, h.y + 18); ctx.lineTo(h.x + 5, h.y + 1); ctx.stroke();
    drawChar('ninja', h.x + sw, h.y + 36, -Math.PI / 2, P.moving, blinkW ? 0.3 : dim ? 0.6 : 1, 3);
    if (F.ch_ninja_ol) drawChar('ninja_ol', h.x + sw, h.y + 36, -Math.PI / 2, P.moving, dim ? 0.95 : 0.6, 3);
    ctx.fillStyle = '#f1b089'; ctx.fillRect(h.x - 8, h.y - 3, 5, 5); ctx.fillRect(h.x + 3, h.y - 3, 5, 5);
    return;
  }
  let lift = P.z ? 1 + P.z * 0.05 : 1, yo = 0;
  if (P.jump) { const f = Math.min(1, P.jump.t / P.jump.dur); yo = -(P.jump.downward?(P.jump.releasedHang?0:4*f*(1-f)):Math.sin(f*Math.PI))*P.jump.arc; lift += Math.sin(f * Math.PI) * 0.25; }
  if (P.z || P.jump) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(P.x + 4 + P.z * 2, P.y + 6 + P.z * 3, 15, 11, 0, 0, TAU); ctx.fill(); }
  // 숨은 상태(어둠·화단): 몸은 반투명, 밝은 외곽선과 발밑 고리로 내 위치는 늘 보이게
  const concealed = !P.jump && !P.under && (S.expo != null ? S.expo === 0 : (P.hidden || P.light < 0.3)) && !(STAGE.zones && !P.hidden && !P.z && pZoneEff() === Z_PUB);  // 공개 구역에서 섞여 있을 땐 숨음 외곽선을 쓰지 않는다 (위 표시와 맞춘다)
  if (!isTouch && !P.jump && !P.z && !P.under && S.expo > 0) {  // 드러남 고리: 노랑(돌아보면 보인다) · 빨강(보고 있다)
    const red = S.expo === 2, pu = red ? 0.6 + 0.35 * Math.sin(S.t * 10) : 0.75;
    ctx.strokeStyle = red ? `rgba(240,80,60,${pu})` : `rgba(242,196,107,${pu})`; ctx.lineWidth = red ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 21, 10, 0, 0, TAU); ctx.stroke();
  }
  const blink = P.hurtT > 0 && Math.floor(P.hurtT * 12) % 2;
  const sc = 3 * lift, mv = (P.travelSpeed==null?P.moving:P.travelSpeed>6) || !!P.jump;
  // 자세: 살금살금은 몸을 낮추고, 달리기는 발 접촉의 작은 먼지로 표현한다
  const crouch = P.mode === 'sneak' && !P.jump && !P.carrying && !P.captive, runP = P.mode === 'run' && P.moving && !P.jump;
  if(P.jump?.downward&&usePR(playerLook)){
    const j=P.jump,f=clamp(j.t/j.dur,0,1);ctx.save();
    if(j.releaseMaskY!=null){ctx.beginPath();ctx.rect(P.x-200,j.releaseMaskY-500,400,500);ctx.clip();}
    drawPR(playerLook,P.x,P.y,j.face??P.a,j.releasedHang?'drop':'leap',0,1,1,-yo,Math.round(f*12));ctx.restore();return;
  }
  if (P.ledge && usePR(playerLook) && PR.anims.hang && PR.hangHand) {  // 옥상 끝에 두 손으로 매달림
    const n = P.ledge, hx = P.x + n.x * 14, hy = P.y + n.y * 14 + (n.y > 0 ? 6 : 0), nf=PR.anims.hang[1],anim=S.ledgePull?'ledgePull':'hang',fi=S.ledgePull?Math.round(clamp(S.ledgePull.t/S.ledgePull.dur,0,1)*12):P.moving?Math.floor(S.t*6)%nf:0;
    ctx.save(); if (n.y < 0) { ctx.beginPath(); ctx.rect(hx - 60, hy - 200, 120, 206); ctx.clip(); }
    drawHangPR(playerLook,hx,hy+2,Math.atan2(-n.y,-n.x),fi,n.y<0?.75:1,anim);ctx.restore();ctx.globalAlpha=1;
    return;
  }
  if (usePR(playerLook) && PR.anims.climb && (P.trav || (P.jump && P.jump.vault))) {
    // 오르기·넘기: 배관·벽을 붙잡고 팔다리를 번갈아 / 창턱을 짚고 몸을 접어 넘는다
    const PK = playerLook, s1 = sc / 3, al = blink ? 0.35 : 1;
    if (P.jump) { const f = Math.min(1, P.jump.t / P.jump.dur); drawVaultPR(PK,P.x,P.y,P.a,f,al,s1,-yo); return; }
    const T = P.trav, tp = travPose(T);
    if (T.stairs) {
      if (tp.pose === 'stairHidden') return;
      if (tp.pose === 'stairRise' || tp.pose === 'stairSink') {
        const depth = (tp.pose === 'stairRise' ? 1 - tp.g : tp.g) * 28, pc = pairCarry(P), pg = !pc && pairGrab(P), anim = pc ? 'carry' : pg ? 'grab' : 'walk';
        ctx.save(); ctx.beginPath(); ctx.rect(P.x - 100, P.y - 150, 200, 165); ctx.clip();
        drawPR(PK, P.x, P.y + depth, P.a, anim, P.gaitTime??S.t, al, s1, 0);
        if (pc || pg) drawPR(pc ? carryKey(P.carrying) : charOf(P.captive), P.x, P.y + depth, P.a, pc ? 'carried' : 'held', P.gaitTime??S.t, al, s1, 0);
        ctx.restore(); return;
      }
    }
    if(tp.pose==='walk'){
      const pc=pairCarry(P),pg=!pc&&pairGrab(P);
      drawPR(PK,P.x,P.y,P.a,pc?'carry':pg?'grab':'walk',P.gaitTime??T.t,al,s1);
      if(pc||pg)drawPR(pc?carryKey(P.carrying):charOf(P.captive),P.x,P.y,P.a,pc?'carried':'held',P.gaitTime??T.t,al,s1);
      return;
    }

    if (tp.pose === 'sink' || tp.pose === 'sinkBush' || tp.pose === 'climbDown' || tp.pose === 'climbUp') {  // 숨는 곳 안으로 들어가고 나오는 몸: 테두리(rim) 아래는 잘라 낸다
      const bush = tp.pose === 'sinkBush', cl = tp.pose === 'climbDown' || tp.pose === 'climbUp', g = tp.pose === 'climbUp' ? 1 - tp.g : tp.g, rim = T.rim != null ? T.rim : P.y + 10;
      ctx.save(); ctx.beginPath(); ctx.rect(P.x - 80, rim - 240, 160, 240); ctx.clip();
      const drop = g * (bush ? 8 : cl ? 46 : 36), fr = cl ? ((Math.floor(T.t * 7) * (tp.pose === 'climbDown' ? -1 : 1)) % 4 + 4) % 4 : 0;
      drawPR(PK, P.x, P.y + drop, T.face != null ? T.face : P.a, cl ? 'climb' : 'crouch', 0, al * (bush ? 1 - g * 0.55 : 1), s1, cl ? 14 : 0, fr);
      ctx.restore(); return; }
    // 벽 잡고 오르기: 웅크렸다 → 뛰어올라 → 가장자리에 두 손으로 매달려 → 끌어올린다
    if (tp.pose === 'wjCrouch') { drawPR(PK, P.x, P.y, T.face, 'crouch', 0, al, s1, 0, 0); return; }
    if (tp.pose === 'wjLeap') { drawPR(PK, P.x, P.y, T.face, 'vault', 0, al, s1, tp.g * 22, tp.g < 0.5 ? 0 : 1); return; }
    if (tp.pose === 'wjHang') {
      if (T.hangOk && PR.anims.hang && PR.hangHand) { const nf=PR.anims.hang[1],fi=Math.min(nf-1,Math.floor(tp.g*nf)),sw=Math.sin(tp.g*Math.PI)*2;
        drawHangPR(PK,P.x,P.y+2+sw,T.face,fi,al);return; }
      drawPR(PK, P.x, P.y, T.face, 'climb', 0, al, s1, 14, 0); return; }
    if (tp.pose === 'climb') { const frame=((Math.floor(T.t*7)*(T.down?-1:1))%4+4)%4;
      const grip=T.pipe&&climbContact(PK,T.face,frame,pipeGripAt(T));
      drawPR(PK,grip?grip.x:P.x,grip?grip.y:P.y,T.face??P.a,'climb',0,al,grip?1:s1,14,frame);if(isTouch&&grip)drawPlayerLocator({...P,...grip.foot,a:T.face,cover:null});return; }
    if (tp.pose === 'vault') { drawVaultPR(PK,P.x,P.y,T.face??P.a,tp.g,al,s1,Math.sin(tp.g*Math.PI)*10); return; }
  }
  if(isTouch&&!P.trav&&!P.jump&&!P.under&&!P.vent)drawPlayerLocator(P);
  if (usePR(playerLook)) {
    // 프리렌더: 자세가 애니메이션으로 구분된다 (서기·걷기·달리기·웅크려 걷기·웅크림·찌르기)
    if ((P.interact || P.pick) && PR.anims.stoop && PR.anims.lift) {
      if(P.interact?.a.k==='door'){const I=P.interact,p=clamp(I.t/I.dur,0,1),d=I.a.d,s=accessHandSample({type:'panel',x:d.x,y:d.y},{x:I.x,y:I.y},p,!I.state,true);drawPR(playerLook,s.x,s.y,P.a,s.anim,0,blink?.35:1,sc/3,0,s.frame);return;}
      const I=P.interact||P.pick,s=actionHandPose(I);drawPR(playerLook,P.x,P.y,P.a,s.anim,0,blink?.35:1,sc/3,-yo,s.frame);return;
    }
    const GI = P.grabIn;  // 붙잡기: 손이 닿은 뒤 목을 감아 끌어당기는 동작 (조르기 첫 단계를 그대로 쓴다)
    if (GI && GI.g.state === 'CAPTIVE' && PAIR() && PR.anims.choke && usePR(charOf(GI.g))) {
      const u = Math.min(1, (GI.t - GI.run) / Math.max(0.01, GI.dur - GI.run)), kt = 1 - (1 - u) * (1 - u), PK1 = playerLook, s1 = sc / 3, fi = ktFrame('choke', kt), j = u > 0.6 ? Math.sin(S.t * 40) * 1.2 : 0;
      drawPR(PK1, P.x, P.y, P.a, 'choke', 0, 1, s1, -yo, fi); drawPR(charOf(GI.g), P.x + j, P.y, P.a, 'choked', 0, 1, s1, -yo, fi); return;
    }
    if (P.killAnim && P.strikeT > 0 && PAIR() && usePR(P.killAnim.ch)) {  // 뒤에서 처치: 칼 / 목 조르기 (핵심 자세 4개 + 사이 프레임)
      const KA = P.killAnim, PK1 = playerLook, s1 = sc / 3;
      if (KA.kind && PR.anims[KA.kind]) { const f = Math.min(1, (S.t - KA.t0) / KA.dur), kt = killKT(KA.kind, f, KA.from), fi = ktFrame(KA.kind, kt), j = kt > 0.9 && kt < 1.5 ? Math.sin(S.t * 40) * (1.6 - (kt - 1) * 2) : 0;
        drawPR(PK1, P.x, P.y, P.a, KA.kind, 0, 1, s1, -yo, fi); drawPR(KA.ch, P.x + j, P.y, P.a, KA.kind === 'stab' ? 'stabbed' : 'choked', 0, 1, s1, -yo, fi); return; }
      const j = Math.sin(S.t * 40) * 1.5; drawPR(PK1, P.x, P.y, P.a, 'grabI', 0, 1, s1, -yo); drawPR(KA.ch, P.x + j, P.y, P.a, 'heldI', 0, 1, s1, -yo); return;
    }
    const BA = P.bodyAnim;  // 시체 들기(허리 숙임 → 안아 올림 → 어깨) · 내려놓기(거꾸로) · 넣기(어깨에서 내려 통에 넣음)
    if (BA && S.t - BA.t0 < BA.dur && PR.anims.lift && PR.anims.stoop) {
      if(drawHandling(P,BA,blink?.35:1,sc/3))return;
      const f = (S.t - BA.t0) / BA.dur, PKb = playerLook, s1 = sc / 3, ck = carryKey(BA.c);
      const ph = BA.k === 'lift' ? (f < 0.4 ? 'stoop' : f < 0.7 ? 0 : 1) : BA.k === 'drop' ? (f < 0.3 ? 1 : f < 0.6 ? 0 : 'stoop') : (f < 0.45 ? 1 : f < 0.8 ? 0 : 'stoop');
      if (ph === 'stoop') {
        const cx = BA.k === 'lift' ? BA.cx : BA.c.x, cy = BA.k === 'lift' ? BA.cy : BA.c.y, ca = BA.k === 'lift' ? BA.ca : BA.c.a, showC = BA.k !== 'stash' && ck && usePR(ck);
        if (showC && cy < P.y) drawPR(ck, cx, cy - 6, ca || 0, 'death', 0, 1, 1, 0, 5);
        drawPR(PKb, P.x, P.y, P.a, 'stoop', 0, 1, s1, -yo, 0);
        if (showC && cy >= P.y) drawPR(ck, cx, cy - 6, ca || 0, 'death', 0, 1, 1, 0, 5);
      } else { drawPR(PKb, P.x, P.y, P.a, 'lift', 0, 1, s1, -yo, ph); if (ck && usePR(ck)) drawPR(ck, P.x, P.y, P.a, 'lifted', 0, 1, s1, -yo, ph); }
      return;
    }
    if (BA && S.t - BA.t0 >= BA.dur) P.bodyAnim = null;
    if (P.killAnim && P.strikeT <= 0) P.killAnim = null;
    const pc = pairCarry(P), pg = !pc && pairGrab(P);
    if (P.cover && (PR.anims.hug || PR.anims.lean) && !P.strikeT) {  // 벽에 바짝 붙음: 웅크려 등을 붙인 자세, 옆걸음, 좌우 살피기. 붙는 순간은 몸을 돌려 벽에 '툭'
      const n = P.cover, PK0 = playerLook, s0 = sc / 3, aw = Math.atan2(n.y, n.x), al0 = blink ? 0.35 : concealed ? (isTouch?.95:.6) : 1;
      const wx = P.x - n.x * 14, wy = P.y - n.y * 14, glow = P.snap ? Math.min(1, P.snap.t / P.snap.dur) : 1;
      ctx.strokeStyle = `rgba(150,220,255,${0.75 * glow})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx - n.y * 18, wy + n.x * 18); ctx.lineTo(wx + n.y * 18, wy - n.x * 18); ctx.stroke();
      const drawC = (k, ang, an, fr, ox, oy) => { drawPR(k, P.x + (ox || 0), P.y + (oy || 0), ang, an, S.t, k === playerOutline ? 0.85 : al0, s0, -yo, fr); };
      let ang = aw, an, fr, ox = 0, oy = 0;
      if (!PR.anims.hug) { an = mv ? 'sneak' : 'lean'; fr = mv ? -1 : Math.floor(S.t * 0.4) % 2; ang = mv ? P.a : aw; }
      else if (P.snap) {  // 붙는 동작: 앞 절반은 웅크린 채 몸을 돌리고, 뒤 절반은 등이 벽에 닿으며 살짝 눌렸다 돌아온다
        const f = Math.min(1, P.snap.t / P.snap.dur);
        if (f < 0.5) { an = 'crouch'; fr = 0; ang = P.snap.a0 + angDiff(P.snap.a0, aw) * (f / 0.5); }
        else { an = 'hug'; fr = 0; const b = Math.sin((f - 0.5) / 0.5 * Math.PI) * 2.5; ox = -n.x * b; oy = -n.y * b; }
      } else if (mv) {  // 옆걸음: 몸 왼쪽(화면 기준 sin a, -cos a)으로 가면 앞으로, 오른쪽이면 거꾸로
        const lx = Math.sin(aw), ly = -Math.cos(aw), fw = (P.vx * lx + P.vy * ly) >= 0, i = Math.floor(S.t * 4.5) % 4;  // 느린 옆걸음에 맞춘 걸음 속도
        an = 'hugStep'; fr = fw ? i : (4 - i) % 4;
      } else {  // 멈춤: 방금 움직인 쪽을 살피고, 오래 있으면 가끔 좌우를 번갈아 본다
        an = 'hug'; const side = P.coverSide && S.t - (P.coverSideT || 0) < 1.6 ? P.coverSide : 0;
        if (side) { const lx = Math.sin(aw), ly = -Math.cos(aw), wsx = -n.y * side, wsy = n.x * side; fr = wsx * lx + wsy * ly > 0 ? 1 : 2; }
        else fr = [0, 0, 1, 0, 0, 2][Math.floor(S.t / 1.3) % 6];
      }
      drawC(PK0, ang, an, fr, ox, oy); if (concealed && prVar[playerOutline]) drawC(playerOutline, ang, an, fr, ox, oy);
      return;
    }
    const hold = P.item && P.item.id === 'box' && !pc && !pg && PR.anims.hold;  // 택배 상자를 두 손으로 든다
    const rising = !mv && P.riseT && S.t < P.riseT && !pc && !pg;
    const anim = P.techWork ? (P.techWork.kind==='radio'?'crouch':'talk') : pc ? (mv ? 'carry' : 'carryI') : pg ? (mv ? 'grab' : 'grabI') : P.strikeT > 0 ? 'punch' : rising ? 'duck' : hold ? (mv ? 'hold' : 'holdI') : crouch ? (mv ? 'sneak' : 'crouch') : !mv ? (PR.anims.idleC ? 'idleC' : 'idle') : (runP || P.jump) ? 'run' : 'walk';
    const t = mv&&!P.jump?(P.gaitTime??S.t):S.t, s = sc / 3, PK = playerLook, rf=rising?Math.round(clamp((P.riseT-S.t)/.22,0,1)*8):-1;
    // 메고 있는 시체·붙잡은 사람: 같은 프레임으로 겹쳐 그린다 (서로 가린 채 렌더링돼 있다)
    const other = pc ? [carryKey(P.carrying), mv ? 'carried' : 'carriedI'] : pg ? [charOf(P.captive), mv ? 'held' : 'heldI'] : null;
    const shake = pg ? Math.sin(S.t * 31) * 1.2 : 0;
    if (concealed) {
      if(!isTouch){
      const pulse = 0.55 + 0.25 * Math.sin(S.t * 3);
      ctx.fillStyle = 'rgba(120,200,255,.10)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(160,230,255,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, false); drawPR(PK, P.x, P.y, P.a, anim, t, blink ? 0.25 : isTouch ? .95 : .55, s, -yo,rf); if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, true);
      if (other) drawPR(other[0], P.x + shake, P.y, P.a, other[1], t, blink ? 0.3 : 0.92, s, -yo);
      if (!isTouch&&prVar[playerOutline]) drawPR(playerOutline, P.x, P.y, P.a, anim, t, blink ? 0.3 : 0.32, s, -yo,rf);
    } else { if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, false); drawPR(PK, P.x, P.y, P.a, anim, t, blink ? 0.35 : 1, s, -yo,rf); if (other) drawPR(other[0], P.x + shake, P.y, P.a, other[1], t, blink ? 0.35 : 1, s, -yo); if (hold) drawHeldBox(P.x, P.y + yo, P.a, s, true); }
    return;
  }
  if (crouch) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 14, 19, 8, 0, 0, TAU); ctx.fill(); }
  ctx.save(); if (crouch) { ctx.translate(P.x, P.y + 16); ctx.scale(1.14, 0.72); ctx.translate(-P.x, -(P.y + 16)); }
  if (concealed) {
    const pulse = 0.55 + 0.25 * Math.sin(S.t * 3);
    ctx.fillStyle = 'rgba(120,200,255,.10)'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(160,230,255,${pulse})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(P.x, P.y + 10, 20, 9, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    drawChar('ninja', P.x, P.y, P.a, mv, blink ? 0.25 : 0.5, sc, P.strikeT > 0, -yo);
    if (F.ch_ninja_ol) drawChar('ninja_ol', P.x, P.y, P.a, mv, blink ? 0.3 : 0.95, sc, P.strikeT > 0, -yo);
  } else drawChar('ninja', P.x, P.y, P.a, mv, blink ? 0.35 : 1, sc, P.strikeT > 0, -yo);
  ctx.restore();
}
// 도면 시야 (Monaco): 바깥 땅에 서 있으면, 창문·열린 문으로 시선이 닿는 방 안만 보인다
