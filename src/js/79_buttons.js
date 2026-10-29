// ---------------------------------------------------------------- 버튼 네 개 (히트맨·메탈기어식으로 공격과 환경 행동을 나눈다)
// [공격] 큰 버튼 — 톡 = 기절, 계속 누르면 처치 (표적은 바로 처치). 공격할 사람이 닿을 때만 켜진다
// [행동] 두 번째 — 문·창문·락픽·숨기·계단·줍기·시체 메기·옷 갈아입기. 절대 공격으로 바뀌지 않는다
// [붙잡기] 작은 버튼 — 등 뒤에서 잡기. 잡은 뒤: [공격] 톡 기절 / 계속 처치, [행동] 숨을 곳으로 끌고 가기, 가만히 있으면 심문
// [다트] 작은 버튼 — 톡 = 앞쪽 표시된 대상에 자동 조준, 끌기 = 직접 조준 (도구 바꾸기는 위 칩)
const ATK_K = new Set(['kill', 'kill2', 'drop', 'ambush', 'ventKill', 'pull', 'ledgeKill', 'pushOff', 'counter']);
const isAtk = a => !!a && (ATK_K.has(a.k) || !!a.kill);
// 겹친 대상까지 훑은 행동 후보 (사람 근처 '공격 우선' 바꾸기 없이 날것 그대로)
// 한 프레임 안에서 화면·버튼·라벨이 같은 계산을 되풀이하지 않게 (시각·위치가 같으면 그대로). 버튼을 누를 땐 새로 구한다
let RC = null;
const rcKey = () => { const P = S.player; return S.t + '|' + P.x + '|' + P.y + '|' + (P.fl || 0) + '|' + (P.z || 0) + '|' + !!P.captive + !!P.carrying + !!P.hide; };
function rawChoices(n = 7) {
  const key = rcKey(); if (RC && RC.key === key) return RC.out.slice();
  const out = rawChoices0(n); RC = { key, out }; return out.slice();
}
function rawChoices0(n) {
  const out = []; ACT_SKIP.clear();
  try { for (let i = 0; i < n; i++) { const a = primaryActionRaw(); if (!a || a.k === 'none') break; const o = actObj(a); if (out.some(x => x.k === a.k && actObj(x) === o)) break; out.push(a); if (!o) break; ACT_SKIP.add(o); } }
  finally { ACT_SKIP.clear(); }
  return out;
}
// 톡 = 기절, 계속 = 처치가 되는 공격 (떨어뜨리기·밀어 떨어뜨리기는 떨어지는 것 자체가 죽음이라 제외)
const KO_K = new Set(['kill', 'kill2', 'pull', 'ambush', 'drop', 'ventKill', 'winJump', 'up']);
function koLabel(a) {  // 조직원·주민은 먼저 기절 (계속 누르면 처치)
  const v = a.g || (a.list && a.list[0]) || a.kill;
  if (v && (koDefault(v) || (koFirst(v) && KO_K.has(a.k))) && /암살|처치/.test(a.label || '')) { a.label = a.label.replace('표적 암살', '기절시키기').replace(/암살|처치/, '기절'); a.hold = '처치'; }
  return a;
}
function attackAction() {
  const P = S.player;
  if (P.car) return { k: 'none', label: '경적', honk: true };
  if (P.captive) return P.captive.target ? { k: 'cap', label: '처치' } : { k: 'cap', label: '기절', hold: '처치' };
  const a = rawChoices().find(isAtk); if (a) return koLabel(Object.assign({}, a));
  // 다가가는 중: 미리 눌러 두면 닿는 순간 공격. 지나가는 행인까지 표시하지 않게 가까울 때만 (주민 90 · 조직원 150)
  // 등 뒤에 있을 때만 다가가기 표시 (정면이면 공격을 권하지 않는다)
  const sg = stalkGuard(); if (sg && dist(P.x, P.y, sg.x, sg.y) < (sg.civ ? 90 : 150) && Math.abs(angDiff(sg.a, Math.atan2(P.y - sg.y, P.x - sg.x))) > 1.75) return { k: 'none', stalk: sg, label: koTap(sg) ? '기절' : '처치' };
  return { k: 'none', label: '공격' };
}
// [행동] 후보: 환경 행동 + (시체 메기·내려놓기·옷 갈아입기·줍기 등 예전 [보조] 쪽 일). 붙잡은 뒤엔 '끌고 가기'
const ENV_Z = new Set(['carry', 'dress', 'pickup', 'use', 'dropItem', 'candy', 'steal', 'ledge', 'tunnel', 'throwBody']);
function envChoices() {
  const P = S.player, sa = secondaryAction(true), z = sa && ENV_Z.has(sa.k) ? [Object.assign({}, sa, { fromZ: true })] : [];
  if (sa && sa.k === 'dress') z.push({ k: 'carry', c: sa.c, label: '운반', fromZ: true });  // 옷 옆에서도 메기는 ⇄로
  if (P.captive) { const d = rawChoices().find(a => a.k === 'drag'); return d ? [d] : []; }
  const env = rawChoices().filter(a => !isAtk(a) && a.k !== 'execute');
  { const rc = !P.carrying && rumorTarget(); if (rc && !env.some(a => a.k === 'rumor')) env.push({ k: 'rumor', c: rc, at: { x: rc.x, y: rc.y }, label: '소문 흘리기' }); }  // 문·창문 옆이어도 [대상]으로 고를 수 있게
  // 시체 옆·메고 있을 때는 시체 일이 먼저, 그 밖엔 환경 행동이 먼저
  // 시체를 멘 채 계단 칸: 오르내리기가 먼저 (내려놓기는 ⇄)
  if (P.carrying) { const st = env.filter(a => (a.k === 'up' || a.k === 'fdown') && a.l && a.l.kind === 'fstair'); if (st.length) return st.concat(z, env.filter(a => !st.includes(a))); }
  // 맨홀 안: [행동] = 지하로 (나오기는 조이스틱을 밀면)
  return (P.carrying || (sa && (sa.k === 'carry' || sa.k === 'dress' || sa.k === 'tunnel'))) ? z.concat(env) : env.concat(z);
}
function envAction() {
  const L = envChoices(); if (!L.length) return { k: 'none', label: '행동' };
  const key = L.map(a => a.k + oid(actObj(a))).join('|'); const PP = S.player, stay = S.envPickP && Math.hypot(PP.x - S.envPickP.x, PP.y - S.envPickP.y) < 30; if (key !== S.envKey) { S.envKey = key; const j = stay ? L.findIndex(a => oid(actObj(a)) === S.envPick) : -1; S.envSel = j >= 0 ? j : 0; } else if (!stay) S.envSel = 0;  // 고르던 대상은 목록이 바뀌어도 그대로
  const i = (S.envSel || 0) % L.length, a = L[i], pk = oid(actObj(a)); if (pk !== S.envPick) S.envPickP = { x: S.player.x, y: S.player.y }; S.envPick = pk;  // 고르던 대상은 그 자리(30px 안)에서만 유지 — 걸어서 옮기면 가까운 쪽부터 다시
  a.choices = L.length; a.choiceI = i; return a;
}
function grabAction() {
  const P = S.player; if (P.car) return { k: 'none', label: '붙잡기' }; if (P.captive) return { k: 'none', label: canInterrogate() ? '심문 중' : '붙잡는 중' };
  const sa = secondaryAction(); return sa && sa.k === 'grab' ? sa : { k: 'none', label: '붙잡기' };
}
function actAttack() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) { if (S && DLG.modal) advanceDialog(); return; }
  if (DLG.modal) { advanceDialog(); return; }
  const P = S.player;
  if (P.car) { honk(); return; }
  if (P.captive) { if (P.captive.target) execCaptive(); else execCaptive(true); return; }  // 기절 → 계속 누르면 처치 (updateKoHold)
  const a = attackAction();
  if (a.k === 'none') { if (a.stalk) { S.qBuf = 0.5; S.qKill = true; } return; }
  // 끌어당기기·끌어들이기·위에서 덮치기도 조직원은 먼저 기절 (계속 누르고 있으면 updateKoHold 가 처치)
  if (a.hold && !['kill', 'kill2'].includes(a.k)) S.koNext = true;
  actPrimary(Object.assign({}, a, { viaZ: true }));
}
function actEnv() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) return;
  if (DLG.modal) { advanceDialog(); return; }
  if (input.aiming) { queueAim(); return; }
  const a = envAction(); if (a.k === 'none') return;
  if (a.fromZ) actCarry(a); else actPrimary(Object.assign({}, a, { viaZ: true }));
}
function actGrab() {
  RC = null;
  if (!S || S.over || paused || !running || tactical || S.amb) return;
  if (S.player.captive) { if (canInterrogate()) interrogate(); return; }  // 잡은 채 한 번 더 = 바로 심문 (가만히 있어도 저절로 한다)
  const a = grabAction(); if (a.k === 'grab') grab(a.g);
}
function cycleEnv() { if (!S) return; const a = envAction(); if (!(a.choices > 1)) return; S.envSel = (S.envSel || 0) + 1; play('click', 0.2); }
