# 야행

네온 빌라촌의 밤을 무대로 한 2D 탑다운 잠입 암살 웹 게임(“2D 히트맨”). 바닐라 JS 캔버스로 만들고, 빌드 결과는 HTML 파일 하나다.

## 자주 쓰는 명령
```
python3 build.py                 # 빌드 → build/yahaeng_city.html (게시본), build/preview_city.html (테스트용)
python3 build.py --itch          # 빌드 + dist/itch/yahaeng_itch.zip
python3 tools/run_tests.py       # 빌드 → 도달 검사 → 회귀 테스트 → 무작위 조작(fuzz). --quick 은 fuzz 생략
```

## 폴더
- `src/js/` 엔진 모듈 (번호 순서대로 이어 붙는다 — 구성은 `docs/ARCHITECTURE.md`)
- `src/stages/` 의뢰 데이터 (의뢰 하나 = 파일 하나: `11_m1.js` … `15_m5.js`, 연습 `90_tutorial.js`, 짧은 대사 `99_dialogue.js`)
- `src/template.html` 화면 틀·메뉴·HUD·스타일
- `build/` 빌드 재료와 결과: `assets_city.json`(그림·소리·글꼴), `pr/`(캐릭터 8방향 시트), `kit/`(기반 키트: 바닥·나무·가구·쓰레기통), `kit_mk/`(게임이 쓰는 최종 키트: 기반 키트 + MegaKit 건물 외관·옥상 소품)
- `build_assets.py` 그림·소리·글꼴 묶음 생성 (원본 에셋 `dl/` 필요, 저장소에는 없음)
- `tools/prerender/` 3D 렌더 도구 (캐릭터 `run.py`, 기반 키트 `kenney_ruk/bake_base.py`, 건물 `kenney_ruk/spec.py` + `bake_mk.py`)
- `tools/run_tests.py` 테스트 한 번에 돌리기
- `tests/` Playwright 테스트 (`tests/rev/t_*.py` 는 자동으로 테스트 묶음에 들어간다)
- `dist/itch/` itch.io 올릴 파일과 페이지 문구
- `docs/` 설계 문서·배치도
- `VERSION` 지금 판본 (시작 화면에 현재 버전과 빌드 날짜를 표시한다)

## v94

VIP 실제 음용·유인, 목표 고정과 관측 정보, 행동 대상 이름 목록, 준비 단계 안전 저장, 실내 높이·입구 안내를 보강했다. [개발·검증 내역](docs/PRODUCT_IMPLEMENTATION.md) · [전후 화면](docs/product-improvement/index.html).

## v95

실외 조명 91개를 벽부등·가로등·전신주 보안등에 연결하고 스위치·충돌·저장 복구를 맞췄다. [변경·검증 내역](docs/OUTDOOR_LIGHTS.md) · [전후 화면](docs/lighting/index.html).

## 업데이트 순서
1. 고칠 곳의 모듈·의뢰 파일을 고친다
2. 지도나 건물 모양이 바뀌었으면 건물 외관을 다시 굽는다 (`docs/ARCHITECTURE.md` 의 “굽기”)
3. `python3 tools/run_tests.py` 가 모두 통과하는지 본다
4. `VERSION` 을 올리고 커밋한다 (커밋 메시지는 한국어, 판본 번호로 시작)
5. `python3 build.py --itch` 로 게시본·itch 파일을 만든다
