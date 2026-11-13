// ---------------------------------------------------------------- 자유 모드 변장
// 쓰러뜨린 조직원·경찰의 옷을 벗겨 입는다(스토리 모드와 같은 [옷 갈아입기]).
//   · 그 조직(또는 경찰)은 멀리서 나를 자기 사람으로 본다: 의심이 아주 느리게 찬다. 64px 안으로 붙으면 그래도 눈치챈다.
//   · 표적(의뢰 대상)은 얼굴을 안다: 220px 안이면 오히려 더 빨리 알아본다.
//   · 적대 조직이라도 그 조직 옷을 입으면 멀리서 '저 새끼다' 하고 덤비지 않는다.
//   · 다른 조직·경찰에겐 효과가 없다. 수배가 오르면(무슨 짓을 하다 들키면) 변장은 들통난다.
//   · 쓰러지거나 체포되면 옷은 벗겨진다.
const DISG_COL = '#cfe0ff';
function cityDisguiseOn(c, of) {
  const P = S.player, f = of === 'police' ? 'P' : c.fac || (c.g && c.g.fac) || null;
  P.disgFac = STAND_NAME[f] ? f : null; P.disgW = S.wanted || 0;
  if (P.disgFac) evBanner(`${STAND_NAME[P.disgFac]} 옷 · 그쪽 사람들은 멀리서 나를 자기 편으로 본다`, DISG_COL);
  fstat('disguises');
}
function cityDisguiseOff(why) {
  const P = S.player; if (!P.disgFac && !P.disguise) return;
  P.disguise = null; P.outfit = null; P.disgFac = null; P.disguiseBlown = false;
  if (why) evBanner(why, '#ff9a86');
}
// 인지 배수 (disguiseMul이 자유 모드에서 부른다)
function cityDisguiseMul(g) {
  const P = S.player, f = P.disgFac; if (!f || g.civ || g.dog) return 1;
  const gf = g.police ? 'P' : g.fac, d = dist(g.x, g.y, P.x, P.y);
  if (g.hit) return d < 220 ? 1.25 : 0.5;  // 표적은 얼굴을 안다
  if (gf !== f) return 1;
  if (P.mode === 'run' || P.carrying || P.captive || P.strikeT > 0) return 1;
  return d < 64 ? 0.45 : 0.07;
}
// 그 조직 옷이면 적대 조직도 멀리선 못 알아본다 (47g factionsUpdate)
const cityDisguisedAs = (f, g) => S.player.disgFac === f && dist(g.x, g.y, S.player.x, S.player.y) > 64;
function disguiseUpdate() {
  const P = S.player; if (!P.disgFac) return;
  if ((S.wanted || 0) > (P.disgW || 0)) cityDisguiseOff('변장이 들통났다. 이제 옷은 소용없다');
}
