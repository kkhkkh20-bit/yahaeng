const GUN_AIM = 1.0, GUN_CD = 2.6, GUN_R = 430;
const armed = g => !g.dog && !g.civ && !g.target && ((g.elite || g.gun) && S.alevel >= 3 || STAGE.cityLife && g.police && S.wanted >= 2);  // 도시 경찰: 수배 ★2부터 권총
function updateGun(g, dt, sameF) {
  const P = S.player; g.gunCd = Math.max(0, (g.gunCd || 0) - dt);
  const can = armed(g) && sameF && g.seen && !g.atkT && !g.gunCd && !P.hide && !P.under && !P.vent && !P.trav && (P.z || 0) === (g.z || 0), d = dist(g.x, g.y, P.x, P.y);
  if (!can || d < 60 || d > GUN_R) { if (g.aim) { g.aim = 0; } return false; }
  if (!g.aim) { sfx('aim'); hint('gun', '전체 경보가 울리면 정예와 증원은 권총을 꺼낸다. 붉은 조준선이 굵어지면 쏜다 — 벽·차 뒤로 시야를 끊어라'); }
  g.aim = (g.aim || 0) + dt; g.want = Math.atan2(P.y - g.y, P.x - g.x); g.moving = false;
  if (g.aim >= GUN_AIM) {
    g.aim = 0; g.gunCd = GUN_CD; sfx('gun'); noise(g.x, g.y, 520, 'shot', flOf(g)); S.shakeT = Math.max(S.shakeT || 0, 0.12);
    if(pixelFxEnabled())spawnEffect('muzzle',{x:g.x+Math.cos(g.a)*18,y:g.y-23+Math.sin(g.a)*12,fl:flOf(g),z:g.z||0},{angle:g.a});
    else S.fx.push({ k: 'muzzle', x: g.x + Math.cos(g.a) * 18, y: g.y + Math.sin(g.a) * 18, t: 0 });
    if (canSee(g, P.x, P.y, Math.max(0.4, P.light), P.hidden, P.mode === 'sneak', P.z, flOf(P)) > 0) hurtPlayer(null, '총에 맞았다.',g);
    else toast('총알이 빗나갔다', 1.2);
  }
  return true;
}
function hurtPlayer(g, why, origin=g) {
  const P = S.player; if (P.hurtT > 0 || S.over) return;
  if (STAGE.cityLife && typeof armorAbsorb === 'function' && armorAbsorb()) return;  // 자유 모드 방탄조끼
  if (P.car) { const v = P.car; if (g) { v.hp -= 1; v.smoke = 1.5; P.hurtT = 0.9; play('metal', 0.5, 0.8); if (v.hp <= 0) carWreck(v); } return; }  // 차 안: 차가 대신 맞는다
  if (!S.saidHurt && P.hp > 1) { S.saidHurt = true; after(0.6, () => bark('hero', 'hurt')); }
  rememberDamage(P,origin);spawnEffect('impact',{x:P.x,y:P.y-20,fl:flOf(P),z:P.z||0},{scale:.65});
  if (STAGE.cityLife && !flOf(P)) { const src = g || origin; bloodBurst(P.x, P.y - 12, src ? Math.atan2(P.y - src.y, P.x - src.x) : rnd(0, TAU), g && !g.police ? 2 : 1); S.shakeT = Math.max(S.shakeT || 0, 0.25); }
  P.hp--; P.hurtT = 2.0; P.adrenT = 1.6; S.flash = 0.28;  // 맞으면 2초 무적 + 1.6초 동안 더 빨리 뛴다 (도망칠 여유)
  play(Math.random() < 0.5 ? 'kill' : 'kill2', 0.6); play('thud', 0.5);
  if (g) g.atkCd = Math.max(g.atkCd || 0, 2.2);  // 때린 자경대원은 잠깐 숨을 고른다
  for (const o of S.guards) if (o !== g && o.state === 'ALERT' && dist(o.x, o.y, P.x, P.y) < 80) o.atkCd = Math.max(o.atkCd || 0, 1.2);  // 옆 자경대원이 바로 이어 베지 않게
  if (g) {  // 뒤로 밀림: 조금씩 밀다가 벽에 닿으면 멈춘다 (한 번에 30px 밀면 벽 속에 박혔다)
    const a = dist(P.x, P.y, g.x, g.y) < 4 ? g.a : Math.atan2(P.y - g.y, P.x - g.x), sol = P.z ? solidFor(P.z) : groundSolidP, px0 = P.x, py0 = P.y;
    for (let k = 0; k < 6; k++) { const nx = P.x + Math.cos(a) * 5, ny = P.y + Math.sin(a) * 5; if (sol(Math.floor((nx + Math.cos(a) * 12) / TILE), Math.floor((ny + Math.sin(a) * 12) / TILE))) break; P.x = nx; P.y = ny; }
    collide(P, P.z ? 10 : 13, sol); if (sol(Math.floor(P.x / TILE), Math.floor(P.y / TILE))) { P.x = px0; P.y = py0; } }
  if (P.carrying) { const c = P.carrying; c.carried = false; c.hidden = false; P.carrying = null; }
  if (P.captive) { const c = P.captive; P.captive = null; c.state = 'PATROL'; c.seen = true; goAlert(c); }
  if (STAGE.cityLife && g && !g.police && g.fac && g.fac !== 'P' && !g.civ) P.hp--;  // 조직은 칼로 죽이러 든다: 한 번에 두 칸
  if (P.hp <= 0) { if (STAGE.city) { if (STAGE.cityLife && (g || origin)?.police) { P.hp = 1; startCuffs(why, g || origin); } else cityDown(why); return; } endGame(false, why); return; }
  toast(P.hp === 1 ? `${why.replace(/\.$/, '')} — 마지막 체력! 지금 시야를 끊고 숨어라` : `${why.replace(/\.$/, '')} — 체력 ${P.hp}/${P.hpMax}. 시야를 끊고 숨어라`, 2.6, P.hp === 1 ? 'warn big' : 'warn');
}
// 숨은 곳에서 끌려 나옴
function dragOut(g, why) {
  const P=S.player;
  if(P.trav?.hideFlow?.forced){g.seen=true;if(g.state!=='ALERT')goAlert(g);return;}
  const b=P.hide;if(b){
    leaveHide({x:P.x-g.x,y:P.y-g.y});
    const T=P.trav;if(T?.hideFlow?.kind==='exit'){T.hideFlow.forced=true;T.hideFlow.handPost=0;T.dur=T.hideFlow.walk+T.hideFlow.duration;P.hide=null;}
  }
  P.hidden=false;g.seen=true;goAlert(g);hurtPlayer(g,why);
}
// 시체를 던져 겁주기 (Mark of the Ninja의 공포): 떨어진 곳 주변의 자경대원이 비명을 지르고 달아난다
function terrorAt(x, y) {
  let n = 0;
  for (const g of S.guards) {
    if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.target || flOf(g) || dist(g.x, g.y, x, y) > 190 || !los(g.x, g.y, x, y)) continue;
    if (g.civ) { civScream(g, x, y); continue; }
    if (g.elite) { goSuspicious(g, x, y, 4); setIcon(g, '흥'); continue; }
    endChat(g); g.act = null; g.state = 'TERROR'; g.terrorT = rnd(3.5, 4.8); g.fearFrom = { x, y }; g.path = null; g.slashed = false; g.icon = '!?'; g.iconT = 4; g.meter = 0; n++;
    if (g.dog) play('bark', 0.6 * proxVol(g));
  }
  play('call', 0.7, 1.45); play('question', 0.5, 0.8); noise(x, y, 260, 'terror');
  if (n) { S.stats.terror = (S.stats.terror || 0) + n; setAlert(2, 30, `경비 ${n}명이 겁에 질려 달아난다`); bark(anyGuard(g => g.state === 'TERROR'), 'terror'); hint('terror', '겁에 질린 경비는 잠시 주변을 살피지 못한다. 이때 지나가거나 뒤에서 접근할 수 있다'); }
  else toast('시체가 떨어졌다 · 목격자 없음', 2);
}
