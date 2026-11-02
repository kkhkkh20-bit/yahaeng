# 기존 2D 게임 Cloudflare 테스트 배포

v136부터 2D 본편과 첫 연습을 개선한 배포본을 `public/index.html`에 제공한다. 이전 v128 동결 테스트에서 갱신했다. 새 사선 구역이나 Three.js 모델은 이 배포본에 포함하지 않는다. 개발 중인 사선 구역 변경으로 외부 테스트본이 바뀌지 않는다.

Cloudflare Workers 프로젝트 `yahaeng`가 이미 GitHub main에 연결되어 있다. 기존 `npx wrangler deploy`가 정적 파일 위치를 찾지 못해 실패했던 문제를 루트 `wrangler.jsonc`로 해결했다.

- 배포 명령: `npx wrangler deploy`
- 빌드 명령: 없음
- 루트: `/`
- 정적 파일 경로: `public` (설정 파일에 명시)
- `workers_dev: true`로 프로덕션 주소 활성화, 미리보기 주소는 비활성화.
- 호환 날짜는 설치된 Wrangler/workerd가 지원하는 `2026-10-01`을 사용한다.

`playtest-2d`는 이전 테스트 스냅샷 보관 브랜치다. 현재 정상 서비스는 main에서 배포한다. v136의 main 자동 배포 성공과 공개 응답을 확인했으며, 보관 브랜치의 별도 자동 빌드 실패를 프로덕션 배포 성공으로 간주하지 않는다. 별도의 Workers 프로젝트를 다시 만들 필요는 없다.

정상 실행 URL: https://yahaeng.kkhkkh-20.workers.dev/

원본 보관소는 사용자 선택에 따라 공개 상태를 유지한다. 비공개 저장소로 바꾸더라도 웹 브라우저에 전달되는 실행 JavaScript와 사용되는 이미지는 내려받을 수 있다는 점을 안내했다.

새 스냅샷을 만들 때는 `python3 build.py --cloudflare`로 `dist/cloudflare-2d/`와 Pages 파일 업로드용 `dist/yahaeng-2d-cloudflare.zip`을 만든다. 그다음 `python3 tools/package_cloudflare_2d.py dist/cloudflare-2d/index.html public`으로 캐시 가능한 자산으로 나누고 커밋한다. `public/press`와 이전 자산은 보존한다. 자동 배포는 main의 성공 체크와 공개 주소의 실제 응답을 기준으로 확인한다.

검증: `npx wrangler@4.156.0 deploy --dry-run`에서 정적 파일 3개를 읽었고, workerd 로컬 실행과 공개 HTTPS 주소에서 v128·의뢰 6개·사선 시제품 미포함을 확인했다. 공개 Chromium에서 PC 방향키 및 실제 CDP 터치 이동을 확인했고, 응답 HTML의 SHA-256이 고정 public/index.html과 일치했다. 최초 main 수정 커밋 `e9c902d`의 Workers Builds 체크는 성공이며 배포 버전 ID는 `400c71a8-1590-45f1-9de1-344b4d9c274b`다.
