// 현대 도시 시안: 전쟁 뒤 서울 북쪽 동네 (가상) — 세계관 설정서2의 의뢰 1·4·5
// 타일: '.' 아스팔트 '=' 보도블록 ',' 흙·콘크리트 '#' 벽·담장 'P' 전봇대 'A' 주차된 차 'I' 필로티 기둥 'H' 의류수거함 'W' 맨홀 'B' 화분·화단 'O' 종량제 봉투 'T' 나무 'F' 두꺼비집 'M' 노점 천막
// m.villa(x0, y0, x1, y1, 층수, { kind: 'villa'|'house'|'shop', piloti, use, signs, story, name }) — 실내 평면은 자동, story 는 층별로 먼저 놓을 가구
// 자경대원·물건·쪽지는 { b: 건물 번호, fl: 층(0=1층), at: 'L'|'R'|'S'|'bed'|'bed2'|'room2' } 로 평면 안 자리를 가리킬 수 있다. kind 'civ' = 주민(싸우지 않음, 비명)
const chain = (y, xs) => xs.slice(1).map((x, i) => [[xs[i], y], [x, y]]);
const alleyPlants = (m, rows) => rows.forEach(row => { for (let x = 1; x < 70; x++) if ((x * 7 + row) % 6 === 0 && m.get(x, row) === '.' && '#N'.includes(m.get(x, row - 1))) m.set(x, row, 'B'); });
// 바닥 재질 깔기: 빈 바닥일 때만 (x 유리 조각 · m 철판 · p 물웅덩이 · r 자갈)
// 화단 더 놓기: 빈 바닥일 때만 (밟고 지나가며 숨을 수 있다 — 길을 막지 않는다)
const shrubs = (m, list) => list.forEach(([x, y]) => { if ('.,=g'.includes(m.get(x, y))) m.set(x, y, 'B'); });
const mat = (m, c, list) => list.forEach(([x, y]) => { if ('.,=dg'.includes(m.get(x, y))) m.set(x, y, c); });
const frame = (m, W, H, streetY) => { m.fill(0, 0, W - 1, H - 1, '.'); for (let x = 0; x < W; x++) m.set(x, 0, '#'); for (let y = 0; y < streetY; y++) { m.set(0, y, '#'); m.set(W - 1, y, '#'); } };
const STAGES = [
