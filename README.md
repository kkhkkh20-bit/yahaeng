# 야행 · 기존 2D 버전 외부 테스트

v128 기존 2D 캠페인의 고정 배포본. 새 사선 시점 구역은 포함하지 않는다.
소스 기준: https://github.com/kkhkkh20-bit/yahaeng/commit/ce76dc5

Cloudflare Pages에서 이 저장소를 GitHub로 연결하고 다음을 지정한다.

| 항목 | 값 |
| --- | --- |
| Production branch | `playtest-2d` |
| Framework preset | `None` |
| Build command | 비워 둠 |
| Build output directory | `/` |
| Root directory | 기본값 유지 |

빌드가 끝난 HTML과 필요한 자산이 index.html에 포함되어 있다. Node 설치, 빌드 명령, API 키 환경 변수는 필요 없다. Cloudflare 프로젝트가 이 브랜치에 연결된 뒤에는 브랜치의 새 커밋으로 자동 배포된다. 소스 main 변경은 이 고정 테스트본에 자동 반영되지 않는다.

공식 연결 안내: https://developers.cloudflare.com/pages/get-started/git-integration/
