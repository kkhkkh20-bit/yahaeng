function corpseBounds(c){
  if(c.dog)return[c.x-24,c.y-26,c.x+24,c.y+22];
  const rest=corpseRestPose(c);
  if(rest){const m=rest.meta,frame=Math.round(rest.frame),box=m.bounds?.[rest.anim]?.[prDir(c.a||0)]?.[frame],s=m.scales[rest.anim],x=c.x-PR.fr*s/2,y=c.y+7-m.grounds[rest.anim]*s;if(box)return[x+box[0]*s,y+box[1]*s,x+box[2]*s,y+box[3]*s];}
  const key=c.stripped?strippedKey(c):c.ch,bm=PR?.bodies?.[prSplit(key||'ninja')[1]],m=bm||PR;
  const frame=Math.min((m?.anims?.death?.[1]||10)-1,corpseFrame(c)),box=m?.bounds?.death?.[prDir(c.a||0)]?.[frame];
  if(!box)return[c.x-20,c.y-24,c.x+20,c.y+10];
  const s=m.scales?.death||PR.scales?.death||1,x=c.x-PR.fr*s/2,y=c.y+7-(m.grounds?.death??PR.grounds?.death??PR.groundY)*s;
  return[x+box[0]*s,y+box[1]*s,x+box[2]*s,y+box[3]*s];
}
function actorMarker(g,c){
  if(c){const b=corpseBounds(c);return{x:(b[0]+b[2])/2,y:(b[1]+b[3])/2,rx:(b[2]-b[0])/2+4,ry:(b[3]-b[1])/2+4};}
  return{x:g.x,y:g.y-12,rx:18,ry:24};
}
function drawTargetRing(g,col,c){const p=actorMarker(g,c);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,p.rx,p.ry,0,0,TAU);ctx.stroke();}
function drawBody(c, lift = 0) {
  if (c.hideT > S.t || c.skillAnimating) return;  // 목 조르는 동안은 주인공과 함께 그린다
  if (c.carried && S.player.carrying === c && pairCarry(S.player)) return;  // 층·그리기 순서와 관계없이 운반 짝동작에서 한 번만 그린다
  if(c.dog||c.ch==='dog'){drawDog(c.x,c.y-lift,c.a||0,false,ctx.globalAlpha,true);return;}
  const rest=corpseRestPose(c);if(rest){drawPR(rest.key,c.x,c.y-6,c.a||0,rest.anim,0,ctx.globalAlpha,1,lift,rest.frame);return;}
  const fr = corpseFrame(c);  // 쓰러지는 동작
  if (c.stripped && usePR(strippedKey(c))) { drawPR(strippedKey(c), c.x, c.y - 6, c.a || 0, 'death', 0, ctx.globalAlpha, 1, lift, 9); return; }
  if (usePR(c.ch)) { drawPR(c.ch, c.x, c.y - 6, c.a || 0, 'death', 0, ctx.globalAlpha, 1, lift, fr); return; }
  blit(ctx, 'dead_' + c.ch, c.x - 24, c.y - 26 - lift, 48, 48);
}
// 들고 있는 상자 (택배): 두 팔을 모은 자세 위에 상자를 그린다. 북쪽(화면 위)을 보면 몸 뒤에 가려진다
const holdingNow = g => g.carryTo != null && g.ri === g.carryTo && ['PATROL', 'RETURN'].includes(g.state);
function drawHeldBox(x, y, a, s, front) {
  if (!front || Math.sin(a) < -0.35) return;  // 등을 보이면 상자는 몸에 가려 보이지 않는다
  // 상자는 두 손 가운데에 (렌더할 때 방향마다 잰 손 위치 PR.holdHand, 64px 프레임 좌표)
  const hh = PR && PR.holdHand && PR.holdHand[prDir(a)], dw = (PR ? PR.fr : 64) * s, gy = (PR ? PR.groundY : 46.8) * s;
  const bx = hh ? x - dw / 2 + hh[0] * s : x + Math.cos(a) * 11 * s, by = hh ? y + 13 - gy + hh[1] * s - 3 * s : y - 4 * s, w = 15 * s, h = 11 * s;
  ctx.save(); ctx.translate(bx, by); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w / 2 + 1, -h / 2 + 2, w, h);
  ctx.fillStyle = '#b98a50'; ctx.strokeStyle = 'rgba(30,20,10,.9)'; ctx.lineWidth = 1.2; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#e8d9b8'; ctx.fillRect(-1.2 * s, -h / 2, 2.4 * s, h); ctx.restore();
}
function guardAnim(g) {
  if(g.act==='pickup')return 'workLow';
  if(g.act==='smoke')return 'workHigh';
  if (g.state === 'BODY' && g.bodyWork) return 'crouch';
  if (g.swingT > 0) return 'punch';
  if ((g.drinkT > 0 || g.mealT > 0 || vipRoutine(g)) && PR && PR.anims.talk) return 'talk';
  if (holdingNow(g)) return g.moving ? 'hold' : 'holdI';
  if (!(g.moving || g.state === 'CAPTIVE')) {
    if (g.state === 'PANIC' && g.cowered) return 'crouch';
    // 평소에는 편하게 선다 (팔 내리고 곧게), 말하는 중이면 손짓 — 싸움 자세(idle)는 경계·수색·추격 중인 자경대원만
    const calm = g.civ || ['PATROL', 'RETURN', 'WARN', 'FUSE'].includes(g.state);
    if (calm && PR && PR.anims.idleC) return g.chat || g.say ? 'talk' : 'idleC';
    return 'idle';
  }
  return g.state === 'ALERT' || g.state === 'FLEE' || g.state === 'PANIC' ? 'run' : 'walk';
}
function drawChar(key, x, y, a, moving, alpha = 1, scale = 3, attack = false, lift = 0) {
  if (key === 'dog') return drawDog(x, y, a, moving, alpha);
  if (usePR(key)) { drawPR(key, x, y, a, attack ? 'punch' : moving ? 'walk' : 'idle', S.t + (x + y) * 0.013, alpha, scale / 3, lift); return; }
  const d = dirOf(a), row = attack ? 4 : moving ? (Math.floor(S.t * 8 + (x + y) * 0.013) % 4) : 0;
  ctx.globalAlpha = alpha; blit(ctx, 'ch_' + key, x - 8 * scale, y - 11 * scale - lift, 16 * scale, 16 * scale, d * 16, row * 16, 16, 16); ctx.globalAlpha = 1;
}
// 마지막 목격 지점(Mark of the Ninja): 자경대원이 의심하거나 쫓는 자리에 내 잔상을 남겨, 놈들이 어디를 보는지 알려 준다
function drawMarked() {
  const g = S.marked; if (!g) return; if (g.state === 'DEAD') { S.marked = null; return; }
  if (flOf(g) !== flOf(S.player) || (g.z||0)!==(S.player.z||0) || (!g.z&&coveredG(g,bldAt(Math.floor(S.player.x/TILE),Math.floor(S.player.y/TILE))))) return;
  const pts = g.routeLine ? g.routeLine.concat([g.routeLine[0]]) : null;
  if (pts) { ctx.strokeStyle = 'rgba(255,214,90,.85)'; ctx.lineWidth = 3.5; ctx.setLineDash([10, 6]); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]); for (const p of g.routeLine) if (p.stop) { ctx.fillStyle = 'rgba(255,214,90,.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill(); } }
  // The live overlay owns the single field, including a danger override.
  ctx.strokeStyle = 'rgba(255,214,90,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(g.x, g.y, 26, 0, TAU); ctx.stroke();
}
function drawGhosts() { drawMarked(); }
// 마지막 목격 지점 (어쌔신 크리드 유니티식 유령 + 수색 범위): 어둠 위에 그려 늘 또렷하게
function drawLastSeen() {
  const P = S.player, pts = []; if (chaseNow() || STAGE.cityLife) return;  // 자유 모드는 수색 범위·십자·물음표를 그리지 않는다 (수배 별과 미니맵으로 충분)  // 쫓기는 중엔 지금 내 자리가 곧 '마지막 목격 지점'이다
  for (const g of S.guards) {
    if (g.civ || g.dog || g.state === 'DEAD' || flOf(g) !== flOf(P)) continue;
    const q = g.state === 'ALERT' ? g.lastSeen : ['SUSPICIOUS', 'SEARCH', 'NOTICE'].includes(g.state) && g.why ? (g.state==='SEARCH'&&g.searchJob ? g.searchOrigin : g.poi) : null;
    if (!q || flOf(q) !== flOf(P) || (q.z || 0) !== (P.z || 0) || pts.some(o => dist(o.x, o.y, q.x, q.y) < 40)) continue;
    pts.push({ x: q.x, y: q.y, hot: false,info:investigationReadout(g) });
  }
  for (const q of pts) {
    if (dist(q.x, q.y, P.x, P.y) < 30) continue;
    { // 수색 범위 (어쌔신 크리드식): 놈들이 뒤질 둘레
      const col = q.hot ? '232,90,70' : '242,196,107', rr = 120 + 8 * Math.sin(S.t * 2);
      ctx.fillStyle = `rgba(${col},.06)`; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${col},.55)`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -S.t * 12; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      infoTag(q.x, q.y + 30, q.info.site, q.hot ? '#e85a46' : '#f2c46b', 0.85); }
    // 기억한 위치는 사람을 복제하지 않고 바닥의 십자 표식으로만 남긴다.
    const k=1/SCALE;ctx.save();ctx.strokeStyle='#d7b76c';ctx.lineWidth=1.5*k;ctx.beginPath();
    ctx.moveTo(q.x-6*k,q.y);ctx.lineTo(q.x+6*k,q.y);ctx.moveTo(q.x,q.y-6*k);ctx.lineTo(q.x,q.y+6*k);ctx.stroke();ctx.restore();
    ctx.fillStyle = q.hot ? 'rgba(232,90,70,.9)' : 'rgba(242,196,107,.9)'; ctx.font = uiFont(14); ctx.textAlign = 'center'; ctx.fillText(q.hot ? '!' : '?', q.x, q.y - 40);
  }
}
function drawGuard(g) {const r=withFurnitureOcclusion(g,()=>drawGuardSprite(g));if(STAGE.cityLife&&!(typeof npcGunPose==='function'&&npcGunPose(g))){drawGangKnife(g);drawCopGear(g);}return r;}
function drawGuardSprite(g) {
  if(assassinOwnsActor(g))return;
  if(S.player.killAnim?.g===g)return; // the paired pose draws this victim once
  if(g.containerMoving||g.ledgeFalling)return;
  if (g.state === 'CAPTIVE' && S.player.captive === g && pairGrab(S.player)) return;
  if (g.state === 'CAPTIVE' && S.player.grabIn && S.player.grabIn.g === g && PAIR() && PR.anims.choke && usePR(charOf(g))) return;  // 목을 감는 중: 플레이어와 함께 그린다
  if (g.civ && g.state === 'SLEEP') { drawBody({ ch: charOf(g), x: g.x, y: g.y, a: g.a }); drawEmote('zz', g.x + 16, g.y - 6); return; }
  const k = charOf(g);
  if (g.climb && usePR(k) && PR.anims.climb) {  // 배관·벽을 타는 중
    const c = g.climb;
    if (c.stairs) {
      const tp = travPose(c); if (tp.pose === 'stairHidden') return;
      const depth = tp.pose === 'stairRise' ? (1 - tp.g) * 28 : tp.pose === 'stairSink' ? tp.g * 28 : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(g.x - 100, g.y - 150, 200, 165); ctx.clip();
      drawPR(k, g.x, g.y + depth, g.a, 'walk', S.t + g.id * .37); ctx.restore(); return;
    }
    if (c.kind === 'stair') { drawPR(k, g.x, g.y, g.a, 'walk', S.t + g.id * 0.37); return; }
    drawPR(k, g.x, g.y, -Math.PI / 2, 'climb', 0, 1, 1, 14, ((Math.floor(c.t * 7) * (c.up ? 1 : -1)) % 4 + 4) % 4); return;
  }
  if (g.z) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(g.x + 4 + g.z * 2, g.y + 6 + g.z * 3, 15, 11, 0, 0, TAU); ctx.fill(); }
  if (usePR(k)) { const hb = holdingNow(g); if (hb) drawHeldBox(g.x, g.y, g.a, 1, false); const pose=targetGesturePose(g)||(STAGE.cityLife&&typeof npcGunPose==='function'?npcGunPose(g):null);drawPR(pose?.key||k, g.x, g.y, g.a, pose?.anim||guardAnim(g), S.t + g.id * 0.37, 1, 1 + (g.z || 0) * 0.05, 0, pose?.frame??-1); if (hb) drawHeldBox(g.x, g.y, g.a, 1, true); drawActorGear(g); return; }
  drawChar(k, g.x, g.y, g.a, g.moving || g.state === 'CAPTIVE', 1, 3, g.swingT > 0); drawActorGear(g);
}
const strayDogImage=new Image();if(A.strayDog?.src)strayDogImage.src=A.strayDog.src;
function drawDog(x, y, a, moving, alpha = 1, dead = false) {
  if(strayDogImage.complete&&strayDogImage.naturalWidth){
    const m=A.strayDog,row=dead?3:moving?1+Math.floor(S.t*7)%2:0,fr=m.frame,s=m.scale;
    ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(strayDogImage,prDir(a)*fr,row*fr,fr,fr,x-fr*s/2,y-m.ground*s,fr*s,fr*s);ctx.restore();return;
  }
  const fr = moving ? Math.floor(S.t * 9) % 2 : 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  if (dead) ctx.rotate(Math.PI / 2);
  if (Math.cos(a) < 0) ctx.scale(-1, 1);
  blit(ctx, 'dog', -24, -32, 48, 48, fr * 16, 0, 16, 16); ctx.restore();
}
const EMOTE = { 'zz': 'em_zz', '?': 'em_q', '!': 'em_ex', '!?': 'em_exq', '...': 'em_dots', '흥': 'em_meh', '잡담…': 'em_chat', '후—': 'em_dots', '하암': 'em_zz', '담배?': 'em_q', '멍!': 'em_ex' };
function drawEmote(txt, x, y) { const n = EMOTE[txt] || 'em_q'; blit(ctx, n, x - 21, y - 40, 42, 39); MARK_R.push([x - 21, y - 40, x + 21, y - 1]); }
const roofPats = {};
