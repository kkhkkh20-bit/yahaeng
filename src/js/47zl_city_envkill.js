// ---------------------------------------------------------------- 자유 모드 환경 처치 (붙잡은 놈을 주변 물건에)
// 놈을 붙잡은 채(뒤에서 잡기) 주변 물건 곁에 서면 [환경 처치]가 뜬다. 물건마다 방식이 다르고, 처리 방식 기록·보너스가 따로 붙는다.
//   공중전화 부스 유리 · 세워 둔 차 문 · 달리는 차 앞 · 청계천 · 벽
// 잔인한 장면이라 보는 눈이 있으면 수배가 붙는다. 맨손 처리보다 보너스가 크다.
const ENV_KILLS = {
  booth: { label: '공중전화 부스 유리에 처박기', how: '공중전화 부스', bonus: 90 },
  cardoor: { label: '차 문 사이에 끼워 닫기', how: '차 문', bonus: 80 },
  traffic: { label: '달리는 차 앞으로 밀어 넣기', how: '달리는 차', bonus: 90 },
  river: { label: '청계천에 처박기', how: '청계천', bonus: 100 },
  wall: { label: '벽에 머리를 찧기', how: '벽', bonus: 50 },
};
for (const [k, e] of Object.entries(ENV_KILLS)) KILL_HOW['env_' + k] = [e.how, e.bonus];
function envSpot() {
  const P = S.player;
  const b = (S.phones || []).find(p => dist(P.x, P.y, p.x, p.y) < 60); if (b) return { k: 'booth', x: b.x, y: b.y };
  const car = S.vehicles.find(v => !v.dead && v !== P.car && Math.abs(v.v || 0) < 10 && dist(v.x, v.y, P.x, P.y) < 56); if (car) return { k: 'cardoor', x: car.x, y: car.y, v: car };
  const R = STAGE.river; if (R && P.y > (R.y - 1.3) * TILE && P.y < (R.y + R.rows + 1.3) * TILE) return { k: 'river', x: P.x, y: P.y };
  const fast = S.vehicles.find(v => !v.dead && v !== P.car && Math.abs(v.v || 0) > 80 && dist(v.x, v.y, P.x, P.y) < 220 && Math.cos(Math.atan2(P.y - v.y, P.x - v.x) - v.a) > 0.6);
  if (fast) return { k: 'traffic', x: fast.x, y: fast.y, v: fast };
  for (let a = 0; a < 8; a++) { const x = P.x + Math.cos(a * TAU / 8) * 30, y = P.y + Math.sin(a * TAU / 8) * 30; if (solidAt(Math.floor(x / TILE), Math.floor(y / TILE))) return { k: 'wall', x, y }; }
  return null;
}
function envKillAction() {
  if (!STAGE.cityLife) return null; const P = S.player, g = P.captive; if (!g || P.car || !npcAlive(g) && g.state !== 'CAPTIVE') return null;
  const s = envSpot(); if (!s) return null; const E = ENV_KILLS[s.k];
  return { k: 'evAct', label: `${E.label} (처리)`, at: { x: s.x, y: s.y - 40 }, fn: () => envKill(g, s) };
}
function envKill(g, s) {
  const P = S.player, E = ENV_KILLS[s.k]; if (P.captive !== g) return; P.captive = null; g.state = 'PATROL'; g.envKill = s.k;
  const a = Math.atan2(s.y - P.y, s.x - P.x); P.a = a; slowMo(0.4); S.shakeT = Math.max(S.shakeT || 0, 0.35);
  const hit = () => { if (!npcAlive(g) && g.state !== 'PATROL') return; g.x = P.x + Math.cos(a) * 24; g.y = P.y + Math.sin(a) * 24;
    if (s.k === 'booth') { play('glass', 0.8); spawnEffect && spawnEffect('impact', { x: s.x, y: s.y - 20, fl: 0, z: 0 }, { scale: 0.9 }); }
    else if (s.k === 'cardoor') { play('metal', 0.8); play('thud', 0.6); }
    else if (s.k === 'traffic') { g.x = s.v.x + Math.cos(s.v.a) * 30; g.y = s.v.y + Math.sin(s.v.a) * 30; play('metal', 0.7); }
    else if (s.k === 'river') { play('cloth', 0.6); }
    else play('thud', 0.9);
    bloodBurst(g.x, g.y - 12, a, s.k === 'river' ? 1 : 5); npcDown(g, null, true);
    const c = (S.corpses || []).find(o => o.g === g); if (c && s.k === 'river') { c.hidden = true; c.stashed = true; }  // 물에 가라앉는다
    if (witnessed(P.x, P.y, 300)) addWanted(1, `${E.how} 처치를 누가 봤다`);
    fstat('envKill'); };
  if (s.k === 'traffic') { doMotion({ dur: 0.45, pose: 'grab', at: [[0.25, hit]] }); }
  else doMotion({ dur: 0.9, pose: 'grab', at: [[0.2, () => play('cloth', 0.5)], [0.55, hit]] });
  // 악당이 아니면 보너스 없이 기록만 (행인을 이렇게 죽이면 그냥 살인이다)
  after(1.2, () => { if (g.evt || g.skReal || g.hit || g.fac) { const m = killMethodBonus(g.x, g.y); if (m) evBanner(`처리 방식: ${m.name}${m.bonus ? ` · 보너스 +${m.bonus}만` : ''}${m.first ? ` · 처음 써 본 방식 (${m.n}/${Object.keys(KILL_HOW).length})` : ''}`, '#e8d8a8'); } });
}
