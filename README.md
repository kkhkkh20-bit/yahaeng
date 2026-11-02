# 게임 테스트 주소

- 2D 공개본: https://kkhkkh20-bit.github.io/yahaeng/
- 2D Cloudflare 테스트: https://yahaeng.kkhkkh-20.workers.dev/
- 새 사선 시점 구역: https://kkhkkh20-bit.github.io/yahaeng/club-study/
- 에피소드 01 · 마지막 정산: https://kkhkkh20-bit.github.io/yahaeng/episode-one/
- v133 시점·가림 전후 비교: https://kkhkkh20-bit.github.io/yahaeng/camera-v133/
- Cloudflare 배포 설명: [docs/CLOUDFLARE_2D_PLAYTEST.md](docs/CLOUDFLARE_2D_PLAYTEST.md)

# 야행

v150 작업본: 도구 계열에 **전기 조작**을 추가했다. 현장 장비 다음에 1P로 배우면 조명 스위치와 건물·구역 분전반을 조작한다. 시야·소리 기초 연습에서는 임시 기술로 체험한다. 총 27개 기술이다. [변경·검증](docs/ELECTRIC_SKILL_V150.md). Pages 본편에 v149·v150을 함께 반영했다. Cloudflare 테스트 주소의 상태는 [배포 기록](docs/skills-v150/DEPLOYMENT.md)을 참조한다.

v149: 다트 기본 지급을 없애고, 다트 운용과 은신 기습을 배워야 사용하도록 바꿨다. 신체 8개·암살 9개·도구 9개, 총 26개 기술을 선행 조건과 포인트로 선택해 배운다. 처음 4P와 의뢰 별 보상을 사용하며, 쿠나이·연막·무전 역이용·CCTV 해킹과 현장 도구 연습을 추가했다. [초기 능력·해금 변경](docs/ABILITY_LOCKS_V149.md) · [기술·조사](docs/SKILL_TREES_V148.md) · [실제 화면](https://kkhkkh20-bit.github.io/yahaeng/skills-v149/).

v147: 별 3개에 쌍암살, 6개에 연속 암살을 배운다. K로 선택하고 B를 길게 눌러 발동하며, 새 암살 기술 연습에서 둘 다 시험할 수 있다. [조사·구현·검증](docs/ASSASSIN_SKILLS_V147.md) · [화면](https://kkhkkh20-bit.github.io/yahaeng/skills-v147/).

v146: PixelFX 효과 8종을 접촉·타격·총구·획득·풀숲·착지에 적용했습니다. 풀숲의 플레이어용 숨기 행동을 제거하고 웅크려 걸어 들어가는 자동 은폐로 튜토리얼과 조작을 통일했습니다. [변경·검증](docs/EFFECTS_V146.md) · [전후 화면](https://kkhkkh20-bit.github.io/yahaeng/effects-v146/)

v145: 변장의 출입 범위와 가까운 신원 확인을 강화하고, 업무 공간의 실제 조명을 보충했습니다. 갈아입기 3초·보안구역 복장 통과 제한·CCTV 보정과 층별 조명 판정을 수정했습니다. [변경·검증](docs/DISGUISE_LIGHTING_V145.md) · [전후 화면](https://kkhkkh20-bit.github.io/yahaeng/balance-v145/)

v144: 대사와 오브젝트 배치를 정리하고, 컨테이너·배관·전선의 쉬운 우회로와 무제한 은닉을 제거했습니다. 조명 회로·경비 역할·도구 사용을 실제 시설에 맞춰 조정했습니다. [변경·검증](docs/WORLD_REALISM_V144.md) · [전후 화면](https://kkhkkh20-bit.github.io/yahaeng/world-v144/)

v143: 층·지붕을 통과하는 발견을 막고, 경비가 접근 가능한 계단을 따라 마지막 목격 층과 옥상까지 추적하도록 수정했습니다. [변경·검증](docs/AI_HEIGHT_V143.md) · [화면](https://kkhkkh20-bit.github.io/yahaeng/ai-v143/)

v142: 플레이 HUD의 반복 테두리·큰 원형 버튼을 줄이고, 목표와 위험 안내를 정돈했습니다. [변경·검증](docs/HUD_V142.md) · [전후 화면](https://kkhkkh20-bit.github.io/yahaeng/hud-v142/)

v141: 렌더·AI·상호작용·그래픽을 역할별로 분리하고, 명시적 빌드 목록·임무별 이미지 수명·참조 기반 배포 정리를 추가했습니다. [구조·용량·검증](docs/REFACTOR_V141.md)

v140: 목격자별 복장 기억, 실제로 들리는 보고, 무전 완료 후 정보 공유, 동료 상태 확인과 주변 경계. [레퍼런스·설계·검증](docs/AI_REALISM_V140.md) · [전후 화면](https://kkhkkh20-bit.github.io/yahaeng/ai-v140/)

네온 빌라촌의 밤을 무대로 한 2D 탑다운 잠입 암살 웹 게임(“2D 히트맨”). 바닐라 JS 캔버스로 만들고, 빌드 결과는 HTML 파일 하나다.

## 자주 쓰는 명령
```
python3 build.py                 # 빌드 → build/yahaeng_city.html (게시본), build/preview_city.html (테스트용)
python3 build.py --itch          # 빌드 + dist/itch/yahaeng_itch.zip
python3 build.py --episode --club # 사선 에피소드와 기존 구역 → build/episode-one/, build/club-study/
python3 tools/run_tests.py       # 빌드 → 도달 검사 → 회귀 테스트 → 무작위 조작(fuzz). --quick 은 fuzz 생략
```

## 폴더
- `src/js/` 엔진 모듈 (`src/modules.json` 순서로 조합한다 — 구성은 `docs/ARCHITECTURE.md`)
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

## v139

HUD의 목표·경계·은신 표시를 정리하고 짧은 세로/가로 화면을 맞췄다. 목표·행동 선택 중에는 시간을 멈추고, 도구의 잔량·실행 가능 상태를 맞췄다. 낮은 프레임에서 이동과 타이머까지 느려지던 2D 시간 처리를 고쳤다. [전체 리뷰·검증](docs/HUD_SYSTEMS_V139.md) · [전후 화면](docs/hud-v139/index.html).

## v138

클럽 옆 통로와 소품 바닥을 맞추고, 기절 소리와 동료 발견 신고를 구분했다. 조명을 끄는 모습을 본 경비의 항의·복구와 실제 은신처 수색을 연결했다. 붙잡은 적은 먼저 기절시킨 뒤 운반하며, 화단에는 안쪽으로 내려놓아 숨긴다. [변경·검수](docs/FEEDBACK_V138.md) · [비교 화면](docs/feedback-v138/index.html).

## v137

측면 창문을 외벽 창틀로 다듬고, 첫 연습에 불 끄기·어두운 길 통과를 추가했다. 경비는 소리 유인을 분담하고 반복 소리를 경계하며, 스위치로 가서 불을 켠다. 승인한 Impeccable과 Ponytail 리뷰 도구를 설치·적용했다. [수정·검수](docs/REFINEMENT_V137.md) · [비교 화면](docs/refinement-v137/index.html).

## v136

2D 본편으로 돌아와 시야·소리 학습을 첫 연습으로 분리했다. 다음 연습에서 붙잡기·기절·변장·은닉을 익힌다. 시야는 한 겹, 발소리는 짧은 점선 물결로 정리했다. [학습 구성·검수](docs/TUTORIAL_V136.md) · [화면](docs/tutorial-v136/index.html).

## v133

사선 카메라를 높이고 모바일의 가로 지면 범위를 넓혔다. 지붕의 원형 점무늬 구멍을 통로를 따르는 건물 절개로 교체하고, 창문 시야·화면 방향 이동·핀치 확대를 함께 맞췄다. [참고 화면·변경·검수](docs/CAMERA_REVIEW_V133.md).

## v132

사선 구역의 독립 의뢰 **마지막 정산**. 송대건 처치와 원본 장부 회수 후 탈출한다. 번호판·계단, 맨홀·창문, 환풍구 우회로를 사용한다. [기획·검증](docs/EPISODE_ONE.md).

## v118

6개 의뢰를 실시간 AI 상태로 완료까지 점검하고, 수납함에서 사람 꺼내기·숨긴 표적 위치·잠긴 방 입구·식사 유인 안내를 개선했다. [전체 리뷰와 검증](docs/FULL_MISSION_REVIEW_V118.md) · [완료 화면과 새 동작](docs/mission-review-v118/index.html).

## v113

장부를 미끼로 실장을 불러내는 매복 공략을 추가하고, 준비에 맞춘 목표 안내·평상시 화면·층별 수색과 강제 은신 해제를 다듬었다. [변경·검증 내역](docs/PLAY_LOOP_V113.md) · [전후 화면·검증 영상](docs/fun-v113/index.html).

## v112

맨홀·환풍구·수납함의 손 조작과 출입, 옥상 간판의 해제·낙하·충돌을 연결했다. [변경·검증 내역](docs/STORAGE_MOTION.md) · [실제 동작 영상](docs/access-v112/index.html).

## v94

VIP 실제 음용·유인, 목표 고정과 관측 정보, 행동 대상 이름 목록, 준비 단계 안전 저장, 실내 높이·입구 안내를 보강했다. [개발·검증 내역](docs/PRODUCT_IMPLEMENTATION.md) · [전후 화면](docs/product-improvement/index.html).

## v95

실외 조명 91개를 벽부등·가로등·전신주 보안등에 연결하고 스위치·충돌·저장 복구를 맞췄다. [변경·검증 내역](docs/OUTDOOR_LIGHTS.md) · [전후 화면](docs/lighting/index.html).

## v96

의뢰의 필수 목표를 먼저 보이게 정리하고 대화 초상화를 패널 안에 통합했다. 붙잡기 접근 예고·조건 안내를 추가했다. [변경·검증 내역](docs/PRESENTATION.md) · [전후 화면](docs/presentation/index.html).

## v97

현재 목표와 지도 안내의 중복을 줄이고 공격·붙잡기·심문 선택을 한 패널에 모았다. 실제 시야에 맞춘 위험 표시, 계단·문턱과 접촉 확인, VIP 경호원 대기 경로를 보정했다. [변경·검증 내역](docs/PLAY_CLARITY.md) · [전후 화면](docs/play-clarity/index.html).

## 잉크 누아르 미술 시안

메인 포스터에 맞춘 선택형 시안이다. `?tone=ink`에서 활성화하며 VIP 클럽·주요 인물 초상·UI를 함께 비교한다. [방향·자산·검증](docs/INK_STUDY.md) · [PC/모바일 화면](docs/ink-study/index.html).

## 업데이트 순서
1. 고칠 곳의 모듈·의뢰 파일을 고친다
2. 지도나 건물 모양이 바뀌었으면 건물 외관을 다시 굽는다 (`docs/ARCHITECTURE.md` 의 “굽기”)
3. `python3 tools/run_tests.py` 가 모두 통과하는지 본다
4. `VERSION` 을 올리고 커밋한다 (커밋 메시지는 한국어, 판본 번호로 시작)
5. `python3 build.py --itch` 로 게시본·itch 파일을 만든다
