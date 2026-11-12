// ---------------------------------------------------------------- 자유 모드 의뢰 처치 등급 (암살자의 손맛)
// 의뢰가 끝나면 어떻게 끝냈는지로 등급을 매기고 보수에 곱한다. 조용하고 깔끔할수록 더 받는다:
//   S 유령  — 수배 0, 경호원이 한 번도 경계하지 않았고, 표적 말고는 아무도 쓰러뜨리지 않았다  ×1.6
//   A 프로  — 수배 0                                                                   ×1.25
//   B 소란  — 수배 ★2 이하                                                              ×1
//   C 학살  — 그 이상                                                                   ×0.8
// 표적이 쓰러지는 순간: 짧은 느린 화면 + '표적 제거' 띠. 경찰 검거 의뢰(기절·수갑)는 등급 없이 예전 그대로.
const HIT_GRADES = [['S', '유령', 1.6, '#9fe8ff'], ['A', '프로', 1.25, '#9fe0b0'], ['B', '소란', 1, '#f2e7c8'], ['C', '학살', 0.8, '#ff9a86']];
function hitGradeStart(h) { h.maxWanted = S.wanted || 0; h.alerted = false; h.c0 = (S.corpses || []).length; }
function hitGradeTrack() {
  const h = S.hit; if (!h || h.ko) return; if (h.c0 == null) hitGradeStart(h);
  h.maxWanted = Math.max(h.maxWanted, S.wanted || 0);
  if (!h.alerted && h.escorts.some(e => npcAlive(e) && (e.state === 'ALERT' || e.state === 'SEARCH'))) h.alerted = true;
}
function hitGrade(h) {
  const extra = (S.corpses || []).slice(h.c0).filter(c => !c.byNpc && c.g !== h.g && !(c.guardId != null && c.guardId === h.g.id)).length;  // 내가 쓰러뜨린 다른 사람만 (도시 어딘가의 조직 싸움 시체는 등급과 무관)
  const i = h.maxWanted === 0 && !h.alerted && !extra ? 0 : h.maxWanted === 0 ? 1 : h.maxWanted <= 2 ? 2 : 3;
  const [g, name, mul, col] = HIT_GRADES[i]; return { g, name, mul, col, extra };
}
// 표적이 쓰러진 순간 (hitsUpdate가 보수를 주기 직전에 부른다): 등급을 매기고 연출. 곱한 보수를 돌려준다
function hitFinish(h, pay) {
  if (h.ko) return pay;
  if (h.c0 == null) hitGradeStart(h);
  const r = hitGrade(h), cm = contractMul(h, h.g), out = Math.round(pay * r.mul * cm.mul / 10) * 10;
  slowMo(0.7); S.flash = 0.25; play('bell', 0.5, 0.75); S.lastContract = h.ctr;
  const cond = h.ctr && h.ctr !== 'plain' && cm.C.fail ? (cm.ok ? ` · ${cm.C.name} 성공 ×${cm.mul}` : ` · ${cm.C.name} 실패 ×${cm.mul}`) : h.ctr && h.ctr !== 'plain' ? ` · ${cm.C.name} ×${cm.mul}` : '';
  evBanner(`표적 제거 — ${h.name || ''} · 등급 ${r.g} ${r.name}${cond} · ${out}만`, cm.ok ? r.col : '#ff9a86'); if (cm.ok && h.ctr && h.ctr !== 'plain') fstat('ctrDone');
  fstat('grade' + r.g); if (r.g === 'S') fstat('ghost');
  return out;
}
