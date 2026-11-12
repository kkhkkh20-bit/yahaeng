// ---------------------------------------------------------------- 모드 규칙: 스토리(잠입 의뢰판)와 자유 모드(도시)에서 서로 다르게 동작하는 장치를 한곳에 모은다.
// 잠입판 장치가 자유 모드로 새어 나가 생긴 문제(자경대원 수색, 무전 점검, 핏자국 수색 …)를 막는다.
// 새 장치가 한쪽에서만 동작해야 하면 여기에 이름을 더하고 modeRule('이름')으로 묻는다. 자유 모드 = STAGE.cityLife
const MODE_RULES = {
  stealthAlert:     { story: true, free: false, why: '전체 경계 단계(자경대원 수색·증원·옥상 점검) — 자유 모드는 수배 별이 대신한다' },
  radioCheck:       { story: true, free: false, why: '조직원 무전 점검' },
  fieldRadio:       { story: true, free: false, why: '잠입 의뢰용 까마귀 무전(발견·핏자국 경고)' },
  bloodSearch:      { story: true, free: false, why: '핏자국을 보면 수색 — 도시엔 길거리 싸움 피가 흔해 경비가 끝없이 수색한다' },
  nearbyGuardToast: { story: true, free: false, why: "'무전기가 없어 전체 경보는 전달되지 않는다' 알림" },
  stealthHudTips:   { story: true, free: false, why: '상단 상태 패널의 잠입 요령 문장(갈아입기·구역 권한·CCTV)' },
  wardenWord:       { story: true, free: false, why: "알림의 '자경대원' 말투 (자유 모드는 '조직원')" },
};
function modeRule(name) {
  const r = MODE_RULES[name]; if (!r) return true;
  return (typeof STAGE !== 'undefined' && STAGE && STAGE.cityLife) ? r.free : r.story;
}
