// ---------------------------------------------------------------- 자유 모드 처리 방식 · 지하실 심문
// 악당을 어떻게 끝냈는지 기록한다. 총은 쉽고 시끄럽다 — 손이 많이 가는 방식일수록 보너스가 붙고,
// 처음 써 본 방식이면 '처리 방식 n/9'가 는다. (justiceMoment 가 쓰러진 놈의 방식을 읽는다)
//   총 · 맨손/흉기 · 차로 들이받기 · 폭발 · 화염병 · 사고(간판·추락) · 깔림 · 독 · 지하실
// 지하실: 기절시킨 놈을 트렁크에 실어 내 집(첫 은신처)으로 와서 차 뒤에서 [지하실로 끌고 내려가기].
//   겁주고 · 때리고 · 공구 상자를 꺼내 압박 100%가 되면 입을 연다 (돈 숨긴 곳 · 진범 인상착의 등).
//   끝에 고른다: 처리한다(지하실 · 보너스 최대) / 눈 가리고 길에 버린다 / 경찰서 앞에 묶어 둔다
const KILL_HOW = { gun: ['총', 0], melee: ['맨손', 20], car: ['차로 들이받기', 40], boom: ['폭발', 50], fire: ['화염병', 40], accident: ['사고 위장', 80], crush: ['깔림', 60], poison: ['독', 60], basement: ['지하실', 100] };
// 쓰러지는 순간의 정황으로 방식을 정한다 (npcDown 을 감싼다)
function killHowNow(o) {
  if (o.basementKill) return 'basement';
  if (o.envKill) return 'env_' + o.envKill;
  if (o.shotT && S.t - o.shotT < 0.3) return 'gun';
  if ((S.nades || []).some(n => n.kind === 'molotov' && dist(n.x1, n.y1, o.x, o.y) < 90) || (S.fires || []).some(f => dist(f.x, f.y, o.x, o.y) < 60)) return 'fire';
  if ((S.booms || []).some(b => S.t - (b.t0 ?? b.t ?? S.t) < 0.6 && dist(b.x, b.y, o.x, o.y) < 160)) return 'boom';
  if ((S.deckChunks || []).some(c => dist(c.x, c.y, o.x, o.y) < 40) || BLD.some(b => b.collapsed && o.x > b.x0 * TILE && o.x < (b.x1 + 1) * TILE && o.y > b.y0 * TILE && o.y < (b.y1 + 1) * TILE)) return 'crush';
  const P = S.player; if (P.car && Math.abs(P.car.v || 0) > 50 && dist(P.car.x, P.car.y, o.x, o.y) < 70) return 'car';
  return 'melee';
}
if (typeof npcDown === 'function') { const _npcDown = npcDown; npcDown = function (o, by, lethal) { if (STAGE.cityLife && o && npcAlive(o)) o.killHow = by && by !== S.player ? 'npc' : killHowNow(o); return _npcDown(o, by, lethal); }; }
// 쓰러진 놈의 방식 (사고·독은 시체 기록에 남는다)
function killHowOf(g) {
  const c = (S.corpses || []).find(c => c.g === g || c.guardId === g.id);
  if (c && c.accident) return 'accident'; if (c && c.poisoned) return 'poison';
  return g.killHow && KILL_HOW[g.killHow] ? g.killHow : 'melee';
}
// 처리 보너스 (justiceMoment 에서): 가까이 쓰러진 악당 하나를 골라 방식을 읽는다
function killMethodBonus(x, y) {
  let g = null, bd = 140; for (const o of S.guards) { if (o.state !== 'DEAD' || o.methodPaid || o.killHow === 'npc' || o.police || !(o.evt || o.skReal || o.assailant || o.knifeman || o.hit || o.basementKill || (o.fac && o.envKill))) continue; const d = dist(o.x, o.y, x, y); if (d < bd) { bd = d; g = o; } }
  if (!g) return null; g.methodPaid = true; const k = killHowOf(g), [name, bonus] = KILL_HOW[k];
  const seen = S.methods || (S.methods = {}); const first = !seen[k]; seen[k] = (seen[k] || 0) + 1; fstat('method_' + k);
  if (bonus) cash(bonus);
  return { k, name, bonus, first, n: Object.keys(seen).length };
}
// ---- 지하실
const BASEMENT_ASK = [
  { k: 'talk', name: '말로 겁준다 — 네 집 주소도 안다', p: 20, max: 1, say: ['...뭐, 뭘 원하는데.', ''] },
  { k: 'fist', name: '주먹', p: 25, max: 2, say: ['퍽. 의자째 넘어간다.', '퍽. "그, 그만..."'] },
  { k: 'water', name: '물 양동이', p: 30, max: 1, say: ['(콜록, 콜록) 살, 살려...', ''] },
  { k: 'tools', name: '공구 상자를 꺼내 하나씩 늘어놓는다', p: 40, max: 1, say: ['...잠깐, 잠깐만! 말할게!', ''] },
];
function basementHome() { return S.safes && S.safes[0]; }
function basementAction() {
  if (!STAGE.cityLife || S.cellar) return null; const P = S.player, home = basementHome(); if (!home || P.car || P.carrying || actionBusy(P)) return null;
  if (dist(P.x, P.y, home.x, home.y) > 260) return null;
  const v = typeof nearRear === 'function' ? nearRear(60) : null; if (!v || !v.trunk?.length) return null;
  const c = v.trunk.find(c => c.ko && c.g && !(S.hit && S.hit.g === c.g)); if (!c) return null; const p = carRear(v);
  return { k: 'evAct', label: '지하실로 끌고 내려가기', at: { x: p.x, y: p.y - 40 }, fn: () => doMotion({ dur: 1.4, pose: 'grab', at: [[0.5, () => play('cloth', 0.5)], [1.1, () => play('door', 0.5)]], end: () => basementOpen(v, c) }) };
}
function basementOpen(v, c) {
  const i = v.trunk.indexOf(c); if (i < 0) return; v.trunk.splice(i, 1); const g = c.g;
  S.cellar = { c, g, press: 0, used: {}, name: basementName(g) }; fstat('cellar'); basementAsk();
}
function basementName(g) { const e = String(g.evt || '').split(':')[0]; return g.skBi != null ? '용의자' : { tteot: '떴다방 사기꾼', gongal: '공갈단', knife: '흉기 난동범', animal: '학대범', assault: '폭행범', stalker: '스토커', molka: '불법 촬영범', gapjil: '진상 손님', jeonse: '바지사장', rage: '보복운전자' }[e] || (g.fac ? '조직원' : '남자'); }
function basementAsk() {
  const C = S.cellar; if (!C) return; const opts = BASEMENT_ASK.map(a => { const n = C.used[a.k] | 0; return { name: a.name, price: null, tag: n >= a.max ? '했다' : `+${a.p}`, ok: n < a.max, buy: () => basementPick(a) }; });
  if (C.press >= 100 || C.told) opts.push({ name: '처리한다 — 여기서 끝낸다', price: null, tag: '지하실', ok: true, buy: () => basementEnd('kill') },
    { name: '눈 가리고 먼 길에 버린다', price: null, tag: '풀어 줌', ok: true, buy: () => basementEnd('dump') },
    { name: '경찰서 앞에 묶어 둔다', price: null, tag: '넘김', ok: true, buy: () => basementEnd('cops') });
  C.picking = false; shopPanel(`지하실 · ${C.name} — 압박 ${C.press | 0}%`, opts, () => { if (S.cellar === C && !C.picking) after(0.2, basementAsk); });  /* 나가기·Esc: 아직 끝나지 않았다 — 다시 연다 */
}
function basementPick(a) {
  const C = S.cellar; if (!C) return; C.picking = true; closeShopPanel(); const n = C.used[a.k] | 0; C.used[a.k] = n + 1; C.press = Math.min(100, C.press + a.p);
  play(a.k === 'fist' ? 'thud' : a.k === 'tools' ? 'metal' : 'cloth', 0.5); const line = a.say[n] || a.say[0];
  if (C.press >= 100 && !C.told) { C.told = true; const [what, fx] = basementTruth(C.g); say([[{ note: C.name }, line || '...'], [{ note: C.name }, what]], true, () => { fx(); basementAsk(); }); return; }
  say([[{ note: C.name }, line || '...']], true, () => basementAsk());
}
// 압박 100%: 무엇을 털어놓는가
function basementTruth(g) {
  const K = S.sk;
  if (g.skBi != null && K && !K.done) {
    if (g.skReal) return ['...그래, 나야. 셋 다... 아니, 넷이던가. 기억 안 나.', () => { C_note('자백: 진범이다'); }];
    const k = K.killer; return [`난 아니라고! ...그 사람 봤어요, ${SK_BODIES[k.skBi][1]}에 담배 피우는 남자. 늘 혼자 다니는 여자 뒤에 있었어.`, () => { if (npcAlive(k)) { k.skSeen = true; K.revealed = true; evBanner(`진범 인상착의를 들었다 — ${SK_BODIES[k.skBi][1]} · 담배`, '#ffd066'); } }];
  }
  const amt = 60 + ((Math.random() * 10) | 0) * 15;
  return [`도, 돈은... 차 시트 밑에 ${amt}만. 그거 다 가져가요.`, () => { cash(amt); evBanner(`숨긴 돈 ${amt}만을 챙겼다`, '#9fe0b0'); }];
}
function C_note(t) { evBanner(t, '#ffd066'); }
function basementEnd(how) {
  const C = S.cellar; if (!C) return; C.picking = true; closeShopPanel(); S.cellar = null; const g = C.g, c = C.c, home = basementHome();
  S.corpses = (S.corpses || []).filter(o => o !== c); if (g.skBi != null) g.skChecked = true;  /* 용의자: 엉뚱한 사람 판정은 여기서 끝낸다 */
  if (how === 'kill') { g.basementKill = true; g.state = 'PATROL'; g.off = false; g.x = home.x; g.y = home.y; g.keep = false; npcDown(g, null, true);
    const k = (S.corpses || []).find(o => o.g === g); if (k) { k.stashed = true; k.hidden = true; }  /* 지하실에 남는다 — 아무도 못 본다 */
    g.off = true; play('thud', 0.4);
    if (g.skReal && S.sk && !S.sk.done) skSolved(g);
    else if (g.skBi != null) evBanner('엉뚱한 사람이었다 — 아무도 모르게 끝났지만, 진범은 아직 밖에 있다', '#ff8a7a');
    else { g.methodPaid = false; const m = killMethodBonus(g.x, g.y) || { name: '지하실', bonus: 0 }; evBanner(`지하실에서 끝냈다 · 처리 방식 ${m.name}${m.bonus ? ' +' + m.bonus + '만' : ''}`, '#c8c0b0'); }
    return; }
  g.off = true; g.state = 'DEAD'; g.x = -9999; g.y = -9999;
  if (how === 'dump') { evBanner('눈을 가려 먼 길에 내다 버렸다 — 다신 이 동네에 안 나타난다', '#c8c0b0'); if (g.skReal && S.sk && !S.sk.done) skSolved(g); return; }
  cash(40); evBanner('경찰서 앞 기둥에 묶어 뒀다 · 강 형사가 40만을 보냈다', '#9fc4ff'); if (g.skReal && S.sk && !S.sk.done) skSolved(g);
}
