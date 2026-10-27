# 야행 구조

## 빌드가 하는 일
`build.py` 가 `src/js/*.js` 를 파일 이름 순서로 이어 붙여 즉시 실행 함수 하나(`(function () { … })();`)로 감싸고, `src/stages/*.js` 를 이어 붙인 의뢰 데이터, `src/template.html`, 미리 만든 그림 자료(`build/assets_city.json`, `build/pr/`, `build/kit_mk/kit.json`)와 함께 HTML 파일 하나로 만든다.

- 모듈은 같은 함수 범위를 나눠 쓴다. 다른 모듈의 함수·변수를 import 없이 그대로 부른다.
- `function` 선언은 순서와 상관없이 쓸 수 있다. 다만 **맨 위에서 바로 실행되는 코드**(예: `const X = …` 의 초기화식)는 앞 번호 모듈에 있는 것만 쓸 수 있다.
- 새 모듈은 비어 있는 번호에 끼운다. 번호는 5 간격이다.

## 엔진 모듈 (`src/js/`)
| 파일 | 맡은 일 |
|---|---|
| `00_core.js` | 테마 표시, 타일 크기, 막힘·시선 가림 칸 종류, 수학 도우미, 난이도, 이동 속도 |
| `05_map.js` | 지도 만들기 도구(`m.villa`, `m.fill` …), 층 전환 `setLayer` |
| `10_interior.js` | 건물 실내 자동 평면(방·가구·계단), 위층 계단실 구멍 `stairWells`, 가구 그림 |
| `15_graphics.js` | 아틀라스 그리기, 구운 키트 붙이기(건물 외관·바닥·옥상 소품) |
| `20_audio.js` | 효과음·음악 |
| `25_records.js` | 도전 과제·최고 기록 저장 |
| `30_state.js` | 판 시작(`newGame`): 지도·층·사다리·전깃줄·문·창문·경비·주민 만들기 |
| `35_light_noise.js` | 빛 세기, 알림·도움말, 소리 퍼짐(`noise`) |
| `38_zones.js` | 구역(공개·출입 금지·적진) 판정, 수상한 행동, 출입 금지 경고 흐름 |
| `40_guard_ai.js` | 시야(`canSee`), 길 찾기, 층 넘어 쫓기, 경비·주민 상태(순찰·의심·수색·발각 …) |
| `45_player.js` | 이동·충돌·발소리·도구 겨누기 |
| `50_opps_checkpoint.js` | 암살 기회, 체크포인트 |
| `55_wires.js` | 전봇대·전깃줄 |
| `60_interact.js` | 행동 버튼(처치·운반·숨기·문·계단 …)과 그 실행, 처치·숨기 동작 시작 |
| `65_update.js` | 한 프레임 갱신 순서, 경보 단계, 카메라 |
| `70_render.js` | 화면 그리기(땅·건물·사람·어둠·표시), 캐릭터 동작 그리기 |
| `75_dialog.js` | 대사 상자 |
| `80_hud.js` | HUD·미니맵·목표 문구·결과 화면 |
| `85_loop.js` | 주 루프, 화면 크기, 확대, 전술 지도 |
| `90_input.js` | 키보드·터치 입력, 메뉴, 테스트용 `window.__game` |

## 의뢰 데이터 (`src/stages/`)
의뢰 하나는 객체 하나다. 주요 항목:
- `W, H, start, exit, build(m)`: 지도 크기·출발·출구, 지도 그리기 (`m.villa(x0, y0, x1, y1, 층수, { kind, use, signs, name })` 로 건물을 놓으면 실내 평면은 자동)
- `guards`: `{ kind: 'g1'|'g2'|'civ'|'dog', at: [x, y], post: 바라보는 각도 }` 또는 `{ route: [[x, y, 멈춤초], …] }`. `fl`(층), `wander`(서성이는 사각형), `target`(표적), `radio`(무전기) 등
- `zones`: 구역. `[[x0, y0, x1, y1, 'pub'|'res'|'hos', 'roof'|null, 이름표], …]` 뒤에 적은 것이 우선한다.
  - 적지 않은 곳: 거리 = 공개, 건물 안·지붕 = 출입 금지
  - `zones` 자체가 없는 의뢰는 옛 규칙(어디서나 적진)을 따른다
- `items`(훔칠 것), `wires`(전깃줄), `lamps`, `challenges`(도전 과제 키, 정의는 `25_records.js` 앞의 `CH`), `hints`, `brief`

## 굽기 (지도·건물 모양이 바뀌었을 때)
```
python3 build.py
cd tools/prerender/kenney_ruk && python3 spec.py 6 && python3 bake_mk.py m1     # 바뀐 의뢰만 (생략하면 전부)
cd /root/game && python3 build.py
```
- `spec.py` 는 게임이 정한 건물·옥상 배치를 `spec.json` 으로 뽑는다.
- `bake_mk.py` 는 기반 키트(`build/kit/kit.json`)에 MegaKit 건물 외관을 더해 `build/kit_mk/` 에 저장한다.
- 기반 키트(바닥·나무·가구)를 바꿀 때만 `bake_base.py` 를 돌린다.
- 캐릭터 동작을 더할 때는 `tools/prerender/render.html` 에 포즈를 만들고 `run.py` 의 `ANIMS` 끝에 붙인 뒤 `python3 run.py` 로 `build/pr/` 를 다시 만든다.

## 테스트
`python3 tools/run_tests.py` 로 돌린다. 하는 일:
1. 빌드
2. 도달 검사: 출구·물건·경비 자리에 닿을 수 있는지 (`window.__game.validate()`)
3. 회귀 테스트 `tests/rev/t_*.py` 등. 병렬로 돌리고, 실패한 것은 혼자 한 번 더 돌린다.
4. 무작위 조작 6판

로그는 `build/test_logs/` 에 남는다. 새 기능을 넣으면 `tests/rev/t_기능.py` 를 하나 더한다.
- 문제가 있으면 0 이 아닌 코드로 끝나게 쓴다.
- 페이지 오류는 `print('errs', errs[:3])` 로 내보낸다.

## 정리 예정
- 엔진에 남은 옛 테마(조선·네온 시험판) 분기(`JOSEON`, `NEO`, `!CITY`)는 지금 쓰지 않는다. 모듈을 하나씩 손볼 때 테스트와 함께 걷어 낸다.
- 의뢰 2~5는 구역 규칙으로 하나씩 다시 짠다.
