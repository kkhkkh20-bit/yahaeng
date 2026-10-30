// ---------------------------------------------------------------- 기록
const RANKS = ['소란꾼', '침입자', '암살자', '그림자'];
// 임무별 도전과제 (Hitman식): 깨면 별 하나 + 과제마다 별 하나. 모은 별로 다른 진입로가 열린다
const CH = {
  ghost: ['한 번도 들키지 않기', () => S.stats.detected === 0],
  clean: ['주민은 아무도 죽이지 않기', () => S.stats.extraKills === 0],
  purge: ['조직원 모두 제압하기 · 기절 포함', () => S.guards.filter(g => !g.civ && !g.dog && !g.target && !g.dropped && !g.reinf).every(g => g.state === 'DEAD' || g.state === 'CAPTIVE')],
  streak3: ['조직원 3명 연속 처치 · 간격 8초 이내', () => (S.stats.maxStreak || 0) >= 3],
  nokill: ['아무도 죽이지 않기', () => S.stats.kills === 0],
  nobody: ['시체·기절자 발견 없이 완료하기', () => S.stats.bodies === 0],
  accident: ['표적을 모두 사고로 처리', () => S.corpses.filter(c => c.target).length > 0 && S.corpses.filter(c => c.target).every(c => c.accident)],
  nokey: ['카드·비밀번호 없이 완료하기', () => !S.stats.keyDoors],
  vent: ['환풍구를 한 번 이상 쓰기', () => (S.stats.vents || 0) > 0],
  intel: ['엿듣기나 쪽지로 정보 얻기', () => (S.learned || []).length > 0],
  nolure: ['던지는 도구 안 쓰기', () => S.stats.stonesUsed === 0 && S.stats.kunaiUsed === 0],
  fast: ['제한 시간 안에 완료하기', () => S.t < (STAGE.fastT || 330)],
  disguise: ['변장한 채로 표적 처치', () => !!S.stats.disguiseKill],
  noalarm: ['경보를 한 번도 울리지 않기', () => S.stats.alarms === 0],
  roof: ['옥상 계단실로 들어가기', () => (S.stats.roofStair || 0) > 0],
  courier: ['택배 신분으로 장부 훔치기 (상자나 기사 옷)', () => S.stats.gotAs === 'courier' || S.stats.gotAs === 'parcel'],
  staff: ['상회 직원 차림으로 장부 훔치기', () => S.stats.gotAs === 'staff'],
  untouched: ['아무도 해치지 않기 · 기절·처치 0회', () => !S.stats.kills && !(S.stats.ko || 0)],
  story: ['기회 경로 1개 완료하기', () => (S.stats.stories || 0) > 0]
};
const mmss = t => { const m = Math.floor(t / 60), s = Math.round(t % 60); return m + '분' + (s ? ' ' + s + '초' : ''); };
const chName = id => id === 'fast' ? `${mmss(STAGE.fastT || 330)} 안에 완료하기` : (CH[id] || ['?'])[0];
function loadCh() { try { return JSON.parse(localStorage.getItem('yahaeng.ch') || '{}') || {}; } catch (e) { return {}; } }
function saveCh(o) { try { localStorage.setItem('yahaeng.ch', JSON.stringify(o)); } catch (e) {} }
// 별점 해금 장비 (도시): 모든 의뢰의 별을 합친 수로 열린다
const PERKS = [[3, 'pick', '락픽 +1'], [6, 'dart', '다트 +1'], [9, 'sole', '고무 밑창 — 걷기 소음 25% 감소'], [12, 'can', '빈 캔 +2'], [16, 'reach', '긴 팔 — 끌어당기기·돌진 거리 20% 증가'], [20, 'shadow', '그림자 걸음 — 웅크리기 이동 속도 20% 증가']];
const totalStars = () => STAGES.reduce((n, s) => n + (s.challenges ? starsOf(s) : 0), 0);
const perkOn = k => !!(S && S.perks && S.perks[k]);
function applyPerks() {
  S.perks = {}; const n = totalStars(); S.stars0 = n; for (const [need, k] of PERKS) if (n >= need) S.perks[k] = true;
  const P = S.player; if (S.perks.pick) P.picks++; if (S.perks.dart) P.kunai++; if (S.perks.can) P.stones += 2;
}
function starsOf(st) { const c = loadCh()[st.id] || {}; return (c._clear ? 1 : 0) + (st.challenges || []).filter(id => c[id]).length; }
function loadBest() { try { return JSON.parse(localStorage.getItem('yahaeng.best') || '{}') || {}; } catch (e) { return {}; } }
function saveBest(id, rank) {
  const b = loadBest(); if (b[id] && RANKS.indexOf(b[id]) >= RANKS.indexOf(rank)) return;
  b[id] = rank; try { localStorage.setItem('yahaeng.best', JSON.stringify(b)); } catch (e) {}
}

