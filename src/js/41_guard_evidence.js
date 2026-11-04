// Guard knowledge stays with its witness until a real spoken/radio report.
function guardHearsReport(from, to, radius = 260) {
  if (flOf(from) !== flOf(to) || (from.z || 0) !== (to.z || 0)) return false;
  const d = dist(from.x, from.y, to.x, to.y);
  if (d >= radius) return false;
  const old = CUR_F; setLayer(flOf(from));
  const heard = d < radius * soundThrough(from.x, from.y, to.x, to.y);
  setLayer(old); return heard;
}
function shareGuardReport(from, at, look, source='player') {
  const listeners = [];
  for (const g of S.guards) {
    if (g === from || g.civ || g.dog || g.target || g.doomed || g.yank || g.climb || g.off ||
        (g.fac || 'A') !== (from.fac || 'A') || !guardHearsReport(from, g)) continue;
    // A shout must not replace a direct pursuit, a casualty or a stronger assigned task.
    if (!['PATROL', 'RETURN', 'SUSPICIOUS', 'NOTICE'].includes(g.state) || g.searchJob || g.bodyCoverId || radioBusy(g)) continue;
    endChat(g); g.act = null; g.bubble = null; g.relight = null;
    g.state = 'SEARCH'; g.poi = { ...at,clue:source }; g.lastSeen = { ...at,clue:source }; g.reached = false;
    g.path = null; g.waitBase = 5; g.meter = Math.max(g.meter || 0, .35); g.why = 'report';
    g.reportFrom = from.id; g.reportAt = S.t; g.seen = false;
    if (look) rememberSuspect(g, look);
    setIcon(g, '?'); g.actionSpeechUntil = S.t + 2.4;
    gsay(g, source==='body'?'알았어. 쓰러진 사람이 있는 곳부터 확인할게.':'알았어. 마지막으로 본 곳부터 갈게.', 2.4);
    listeners.push(g);
  }
  return listeners;
}
function queueGuardRadio(candidates, at, look, relay = false) {
  if (S.radioCall || (look && S.alevel >= 3 && S.knownLooks?.[look])) return false;
  const g = candidates.find(g => g.radio && !g.civ && !g.dog && !g.doomed &&
    (g.fac || 'A') === 'A' && ['ALERT', 'SEARCH', 'SUSPICIOUS', 'CHECK'].includes(g.state));
  if (!g) return false;
  const dur = DKEY === 'easy' ? 3.4 : DKEY === 'hard' ? 2.2 : 2.8;
  S.radioCall = { g, t:dur, dur, at:{...at}, look:look || null, relay };
  g.path = null; g.actionSpeechUntil = S.t + dur;
  gsay(g, look ? '침입자 목격. 위치와 인상착의 보낸다.' : '동료가 쓰러져 있다. 누가 했는지는 못 봤다.', dur);
  toast('경비가 무전 보고 중 · 제압하면 전달을 막을 수 있다', 2.4, 'warn');
  play('metal', .25, 1.9); return true;
}
function bodyExamValid(g, c) {
  return !!c && S.corpses.includes(c) && !c.discovered && !c.carried && !c.stashed &&
    !(c.hidden && !g.dog) && flOf(c) === flOf(g) && (c.z || 0) === (g.z || 0);
}
function bodyExaminer(c) {
  return S.guards.find(g => g.id === c.checkBy && !g.doomed && g.state === 'BODY' && g.body === c && bodyExamValid(g, c));
}
function claimBodyExam(g, c) {
  if (!bodyExamValid(g, c)) return false;
  if (!c.sceneId) c.sceneId = S.bodySceneSerial = (S.bodySceneSerial || 0) + 1;
  const owner = bodyExaminer(c);
  if (!owner || owner === g) { c.checkBy = g.id; g.bodyCoverId = null; return true; }
  // At most one witness keeps watch. No NPC learns about the body through this claim.
  if (!g.dog && ['PATROL','RETURN'].includes(g.state) && !S.guards.some(o => o !== g && o.bodyCoverId === c.sceneId && !o.doomed && ['PATROL','RETURN'].includes(o.state))) {
    g.bodyCoverId = c.sceneId; g.state = 'PATROL'; g.relight = null; g.path = null; g.actionSpeechUntil = S.t + 2;
    gsay(g, '상태 좀 봐 줘. 나는 주변 볼게.', 2);
  }
  return false;
}
function updateBodyCover(g) {
  if (!g.bodyCoverId) return false;
  const c = S.corpses.find(c => c.sceneId === g.bodyCoverId);
  if (!c || !bodyExamValid(g,c) || !bodyExaminer(c)) { g.bodyCoverId = null; return false; }
  g.path = null; g.moving = false;
  g.want = Math.atan2(g.y-c.y,g.x-c.x) + Math.sin(S.t * .7) * .6;
  return true;
}
function witnessedAssailant(g) {
  const P = S.player;
  if (P.hide || P.under || P.vent || flOf(P) !== flOf(g) || (P.z || 0) !== (g.z || 0)) return null;
  const old = CUR_F; setLayer(flOf(g));
  const saw = canSee(g, P.x, P.y, P.light, P.hidden, P.mode === 'sneak', P.z) > 0;
  setLayer(old); return saw ? suspectLook() : null;
}
