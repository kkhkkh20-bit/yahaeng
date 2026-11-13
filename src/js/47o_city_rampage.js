// ---------------------------------------------------------------- 자유 모드 떨어진 탄약/돈 줍기 · 방탄조끼
// (광란 도전은 뺐다: 이 도시에서 총을 들고 날뛰는 놀이는 하지 않는다. 총은 귀하다)
// 줍기: 쓰러진 경찰(★2부터 총을 차고 있다)·조직원 곁에 탄약 상자나 돈이 떨어진다. 걸어서 지나가면 줍는다(1분 남는다).
// 방탄조끼: 조직 무기 거래에서 산다. 맞을 때 체력 대신 조끼가 세 번까지 막는다(저장).
const ARMOR_MAX = 3, ARMOR_PRICE = 400;
function pickupsInit() {
  S.pickups = []; S.dropScan = 0;
  S.player.armor = Math.min(ARMOR_MAX, S.armorSaved | 0); S.player.poison = S.poisonSaved | 0;
}
// ---- 떨어진 탄약 · 돈
function pickupsUpdate(dt) {
  if (!STAGE.cityLife || !S.pickups) return; const P = S.player;
  if ((S.dropScan -= dt) <= 0) { S.dropScan = 0.3;
    for (let i = Math.max(0, S.corpses.length - 40); i < S.corpses.length; i++) { const c = S.corpses[i]; if (c.dropped || c.fl || c.civ) continue; c.dropped = true;
      const g = c.g; if (!g || g.evt && g.evt !== 'war' || dist(c.x, c.y, P.x, P.y) > 1000) continue;  // 구역 이벤트 사람은 이벤트가 따로 떨군다
      if (g.police) { if (S.guns?.pistol != null && (S.wanted >= 2 || Math.random() < 0.3)) dropPickup(c.x + rnd(-14, 14), c.y + rnd(8, 16), 'ammo', 'pistol', 6 + (Math.random() * 7 | 0)); }
      else if (c.fac && c.fac !== 'P') { const r = Math.random();
        if (r < 0.1) dropPickup(c.x + rnd(-14, 14), c.y + rnd(8, 16), 'ammo', 'pistol', 3 + (Math.random() * 4 | 0));  /* 조직원도 총은 드물다 */
        else if (r < 0.75) dropPickup(c.x + rnd(-14, 14), c.y + rnd(8, 16), 'cash', null, 10 + (Math.random() * 40 | 0)); } } }
  for (let i = S.pickups.length - 1; i >= 0; i--) { const k = S.pickups[i];
    if (S.t - k.t > 60) { S.pickups.splice(i, 1); continue; }
    if (P.car || flOf(P) || S.t - k.t < 0.4 || dist(P.x, P.y, k.x, k.y) > 26) continue;
    S.pickups.splice(i, 1); play('loot', 0.45);
    if (k.kind === 'cash') { S.cash = (S.cash || 0) + k.n; fstat('earned', k.n); toast(`돈 +${k.n}만`, 1.2, 'good'); }
    else { S.guns[k.wpn] = (S.guns[k.wpn] || 0) + k.n; if (!S.wpn) S.wpn = k.wpn; gunChip(); toast(`${withJosa(WEAPONS[k.wpn].name, '을/를')} 주웠다 · 탄 +${k.n}`, 1.4, 'good'); play('click', 0.4, 0.8); } }
}
function dropPickup(x, y, kind, wpn, n) { if (solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) return; S.pickups.push({ x, y, kind, wpn, n, t: S.t, rot: rnd(-0.6, 0.6) }); if (S.pickups.length > 40) S.pickups.shift(); }
// 방탄조끼: hurtPlayer가 먼저 부른다. 막으면 true
function armorAbsorb() {
  const P = S.player; if (!STAGE.cityLife || !(P.armor > 0) || P.car) return false;
  P.armor--; P.hurtT = 1.2; S.flash = 0.12; S.shakeT = Math.max(S.shakeT || 0, 0.15); play('metal', 0.5, 1.3);
  const f = { x: P.x, y: P.y - 18, a: 0, len: 4 }; fireEmit(f, 'spark', 6, f); gunChip();
  toast(P.armor ? `조끼가 막았다 · 남은 조끼 ${P.armor}` : '조끼가 다 찢어졌다', 1.6, 'warn'); return true;
}
function drawPickups() {
  for (const k of S.pickups || []) { if (!inView(k.x, k.y, 20)) continue; const fade = S.t - k.t > 50 && (S.t * 6 | 0) % 2, bob = Math.sin(S.t * 3 + k.x) * 1.5; if (fade) continue;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 5, 9, 3, 0, 0, TAU); ctx.fill();
    // 바닥에 떨어진 총 그 자체(쏜 사람이 쥐고 있던 총) · 돈은 동전 더미
    if (k.kind === 'cash') drawItem('cash', k.x, k.y - 3 + bob, 0.8); else drawItem(k.wpn || 'ammo', k.x, k.y - 2 + bob, 1.2, k.rot || 0); }
}
