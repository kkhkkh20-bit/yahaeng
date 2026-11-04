# 야행 · Godot VIP 비교판

Godot **4.6.3**의 실제 2D 프로젝트다. 기존 웹 게임을 iframe으로 감싸지 않는다.
원작 캠페인은 그대로 두고, 엔진 이전의 가능성과 비용을 확인하는 작은 독립 구역이다.

## 실행

Godot에서 `project.godot`를 열고 F6 또는 F5로 실행한다.
CLI: `godot --path godot`. 별도 애드온이나 JavaScript 런타임이 필요 없다.
웹 비교판의 제작·리소스 출처 화면에서 `project.zip`도 받을 수 있다.
압축을 풀면 바로 열 수 있는 프로젝트가 있고, 저장소의 변환·배포 도구는 별도다.

목표는 **흡연 구역 실장 제거 → 2층 장부 회수 → 왼쪽 골목 탈출**이다.
직원복은 선택이고, 기술 해금은 없다. 모든 기능을 처음부터 사용할 수 있다.

| 조작 | PC | 터치 |
| --- | --- | --- |
| 이동 / 달리기 | WASD·방향키 / Shift | 왼쪽 스틱 / 끝까지 밀기 |
| 웅크리기 | Ctrl | 오른쪽 원형 버튼 |
| 기절 / 제거 | 뒤에서 Z 짧게 / 길게 | 공격 버튼 짧게 / 길게 |
| 옷·장부·문·탈출 | E 또는 X | 행동 버튼, 실제 대상 이름 표시 |
| 소리로 유인 | V | 작은 휘파람 버튼 |
| 일시정지 | Esc | 오른쪽 위 Ⅱ |

## 구현한 부분

- 원작의 캐릭터·8방향 이동·짝 모션, 가구, 타일, 효과음, PixelFX, 한국어 글꼴 재사용.
- `CharacterBody2D`의 원형 충돌, 벽 엄폐, 층별 독립 물리 레이어.
- `AStarGrid2D` 순찰·수색·추격. 경비가 계단 진입을 **목격하면** 실제 계단까지 걸어가 위아래층을 따라간다.
- 실제 물리 raycast로 벽·닫힌 문에 잘리는 시야와, 의심·발각·공격 준비 표시.
- 출입 구역과 복장 허용 범위의 상시 표시. 직원복은 1층 직원 구역만 허용한다.
- 문을 닫을 때 같은 층의 사람·시신만 확인하고, 실제 장애물의 이름을 안내한다.
- PC에서 터치 HUD 숨김. 모바일에는 겹치지 않는 원형 버튼과 독립 멀티터치 스틱.
- 성공·실패·재시작·일시정지. 포커스를 잃으면 자동 일시정지.
- 모바일 세로 화면에서는 회전 안내를 띄우고 게임을 일시정지한다.

전체 이식은 아니다. CCTV·기록 삭제, 시신 운반, 전 캠페인·상점·기술 트리·세이브는 아직 옮기지 않았다.
계단은 2D 층 연결 방식이고, 3D 계단을 모델링한 것이 아니다. 전투·맵 아트도 비교용 단계다.
엔진 이전만으로 재미나 그래픽 품질이 자동으로 해결됐다고 평가하지 않는다.

## 코드 위치와 수정

- `scenes/main.tscn`: 진입 씬.
- `scripts/game.gd`: 두 층의 작은 맵 구성, 임무, 출입 판정, 상호작용.
- `scripts/actor.gd`: 이동, 경비 AI, 물리 시야, 모션.
- `scripts/map_view.gd`, `scripts/hud.gd`: 기존 리소스 배치와 반응형 HUD.
- `scripts/palette.gdshader`: 원작 JS의 의미색 팔레트 치환을 Godot 셰이더로 이전.
- `assets/SOURCES.json`: 사용한 기존 파일과 변환 결과의 SHA-256. 라이선스는 `assets/licenses/`, `assets/fx/LICENSE.txt`.

원작의 방대한 JS 코드를 그대로 실행하는 호환 계층은 만들지 않았다. 게임 규칙은 GDScript로 재구현했다.
캐릭터 그림은 새로 생성하지 않았다. 원본을 픽셀 변경 없이 8방향 애니메이션별로 잘라
한 장의 최대 크기를 640×512로 줄였다. 한국어 WOFF2는 fontTools로 TTF 컨테이너로 풀었다.

## 재현 가능한 빌드와 검사

```sh
# 의존성: Godot 4.6.3 + 동일 버전 web_nothreads_release export template,
# Python fontTools/brotli, 기존 tools/prerender/node_modules의 three(fflate).
python3 tools/godot/prepare_assets.py
godot --headless --path godot --script scripts/extract_animations.gd
godot --headless --editor --path godot --import
godot --headless --path godot --script tests/regression.gd
python3 tools/godot/export_web.py
python3 -m http.server 8031 --bind 127.0.0.1
# 별도 터미널: pip install playwright, Chromium 또는 CHROMIUM 경로 준비
python3 tools/godot/play_web.py --url http://127.0.0.1:8031/public/godot-vip/
python3 tools/godot/play_web.py --url http://127.0.0.1:8031/public/godot-vip/ --mobile
```

웹 빌드는 WebGL 2 Compatibility, 스레드 비활성화로 공유 메모리 헤더가 필요 없다.
공식 WASM 37.7MB를 gzip 약 9.4MB로 묶고, 런타임과 팩 합계 다운로드는 약 12MB다.
개별 파일을 Cloudflare의 25MiB 제한 아래로 유지한다. 해당 WASM 요청만 풀어 엔진에 넘기며,
DecompressionStream이 없는 브라우저는 MIT 라이선스 fflate를 사용한다.
공식 엔진 JS/WASM을 게임 규칙에 맞춰 패치하지 않는다.

`window.yahaengGodotState`는 실제 플레이 검사에 사용하는 **읽기 전용 스냅샷**이다.
이를 수정해도 Godot 내부 상태는 바뀌지 않는다. 웹 플레이 검사는 키보드·실제 CDP 터치 이벤트로만 조작한다.
