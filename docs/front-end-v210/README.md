# v210: 골목에서 시작하는 야행

메인 메뉴는 실제 게임 엔진의 한국 골목을 연출한 타이틀 아트를 사용한다. 사용자 지정 방향은 픽셀 골목·네온·간결한 메뉴다. 게임 플레이 증거와 연출용 타이틀 아트는 구분한다. 아트 출처와 재현 방법은 `src/art/title/PROVENANCE.json` 및 `tools/capture_noir_title.py`에 있다.

첫 에피소드는 행동이 바뀌면 올빼미의 혼잣말 또는 까마귀의 무전이 상단 안에서 짧게 나온다. 큰 대화창을 움직임 공간에 띄우지 않는다. 전체 설명은 목표를 펼쳐 읽을 수 있다. 3번째 의뢰부터 작은 실내 잠입을 구성했다. 물류실은 변장으로 통과한 뒤 담당자가 돌아선 틈에 서류를 챙긴다. 배송 창고는 순찰 한 명과 CCTV 한 대를 조합한다. 보안 단말은 실내에 두며, 녹화만 된 경우에는 즉시 경보가 울리지 않는다.

빈 지붕 텍스처 목록과 투명한 건물 아트가 아래층을 노출하던 문제를 수정했다. 지붕 캔버스와 건물 아트 바닥을 불투명하게 그린다. 저장된 이전 보안 단말 위치는 증거와 전원 상태를 유지한 채 실내 위치로 이관한다.

## 검증 재현

- `python build.py`와 `python tools/package_cloudflare_2d.py build/yahaeng_city.html`
- `PYTHONPATH=tests/support YH_TEST_HTTP=1 python tools/capture_front_end.py`: 1440×900, 390×844, 320×568, 844×390, 390×640에서 제목, 시작 버튼, 저장된 메뉴, 설정 화면 및 가로 넘침 확인.
- `PYTHONPATH=tests/support YH_TEST_HTTP=1 python tests/rev/t_roof_privacy.py`: 14개 지도 지붕 불투명성, 실제 문서 책상을 감시하는 CCTV, 접근 가능한 시야 밖 작업점, 보안 단말 위치/저장 이관 확인.
- `PYTHONPATH=tests/support:tests/tutorial YH_TEST_HTTP=1 python tests/tutorial/first_night_live.py --url http://127.0.0.1:8001/public/`: 실제 키보드/CDP 터치 입력, 일반 RAF와 활성 AI로 운반책 처치 → 변장 → 순찰 중 서류 회수 → CCTV에 녹화되는 실수 → 체크포인트 재시도 → 전선 분리 → 회수/탈출을 검사한다.

브라우저 검증은 Chromium 모바일 에뮬레이션이며 실제 iPhone Safari 검증이나 사전 지식 없는 사용자의 재미 평가를 대신하지 않는다. 게임 이동 검증은 알려진 지도와 독립 시작 상태를 사용한다. 타이틀 연출은 플레이 검증에 포함하지 않는다.

## 디자인 마감

Impeccable 검수에서 한글 네온/실외등, 세로 화면의 캐릭터 구도, 설정 프레임 여백을 지적받아 수정했다. 최종 검수는 세 항목 해결 및 ship 판정이다. 기계 검사는 새 front-end.css 지적 없이 기존 템플릿의 작은 글씨와 여백/대비 문제를 보고했다. 기존 화면 전체가 새 디자인으로 검수됐다는 의미는 아니다. 새 디자인 규칙은 루트 DESIGN.md와 .impeccable/design.json에 기록했다.
