# 야행 · 기존 2D 버전 외부 테스트

v136 기존 2D 본편 개선판. 첫 연습에서 시야·소리를 익히고 다음 연습에서 제압·변장·은닉을 배운다. 시야는 적당 한 겹이다. 새 사선 시점 구역은 포함하지 않는다.
소스 기준: https://github.com/kkhkkh20-bit/yahaeng/commit/907f77c

## 이미 만든 Workers 프로젝트에서 배포

프로젝트 이름은 `yahaeng`이다. Cloudflare의 Settings → Builds에서 Production branch를 `playtest-2d`로 지정한다.

- Build command: 비워 둠
- Deploy command: `npx wrangler deploy`
- Root directory: `/` (기본값)

`wrangler.jsonc`가 실행 파일 위치 `public`을 지정한다. `Could not detect a directory containing static files` 오류를 해결하는 설정이다. 서버 Worker 코드나 별도 빌드는 필요 없다.

## Pages 프로젝트에서 배포

Cloudflare Pages에서 이 저장소를 GitHub로 연결하고 다음을 지정한다.

| 항목 | 값 |
| --- | --- |
| Production branch | `playtest-2d` |
| Framework preset | `None` |
| Build command | 비워 둠 |
| Build output directory | `public` |
| Root directory | 기본값 유지 |

빌드가 끝난 HTML과 필요한 자산이 public/index.html에 포함되어 있다. 이 브랜치가 연결된 뒤에는 새 커밋으로 자동 배포된다. main의 개발 변경은 이 고정 테스트본에 자동 반영되지 않는다.

GitHub 저장소를 비공개로 전환해도 Cloudflare GitHub 앱에 이 저장소 접근 권한이 유지되어야 한다. 브라우저로 전달되는 게임 실행 파일은 내려받을 수 있으며, 저장소 비공개는 실행 코드 암호화를 뜻하지 않는다.

공식 연결 안내: https://developers.cloudflare.com/pages/get-started/git-integration/
