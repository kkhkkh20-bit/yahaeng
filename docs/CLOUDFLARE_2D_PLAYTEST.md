# 기존 2D 게임 Cloudflare 테스트 배포

v136부터 2D 본편과 첫 연습을 개선한 배포본을 `public/index.html`에 제공한다. 이전 v128 동결 테스트에서 갱신했다. 새 사선 구역이나 Three.js 모델은 이 배포본에 포함하지 않는다. 개발 중인 사선 구역 변경으로 외부 테스트본이 바뀌지 않는다.

Cloudflare Workers 프로젝트 `yahaeng`가 이미 GitHub main에 연결되어 있다. 기존 `npx wrangler deploy`가 정적 파일 위치를 찾지 못해 실패했던 문제를 루트 `wrangler.jsonc`로 해결했다.

- 자동 배포 시작: 준비한 `public` 패키지와 소스를 GitHub `main`에 push
- 서버 배포 명령: `npx wrangler deploy` (기존 Workers Builds에서 실행)
- 빌드 명령: 없음
- 루트: `/`
- 정적 파일 경로: `public` (설정 파일에 명시)
- `workers_dev: true`로 프로덕션 주소 활성화, 미리보기 주소는 비활성화.
- 호환 날짜는 설치된 Wrangler/workerd가 지원하는 `2026-10-01`을 사용한다.

`playtest-2d`는 이전 테스트 스냅샷 보관 브랜치다. 현재 정상 서비스는 main에서 배포한다. v136의 main 자동 배포 성공과 공개 응답을 확인했으며, 보관 브랜치의 별도 자동 빌드 실패를 프로덕션 배포 성공으로 간주하지 않는다. 별도의 Workers 프로젝트를 다시 만들 필요는 없다.

정상 실행 URL: https://yahaeng.kkhkkh-20.workers.dev/

원본 보관소는 사용자 선택에 따라 공개 상태를 유지한다. 비공개 저장소로 바꾸더라도 웹 브라우저에 전달되는 실행 JavaScript와 사용되는 이미지는 내려받을 수 있다는 점을 안내했다.

새 스냅샷을 만들 때는 `python3 build.py --cloudflare`로 `dist/cloudflare-2d/`와 Pages 파일 업로드용 `dist/yahaeng-2d-cloudflare.zip`을 만든다. 그다음 `python3 tools/package_cloudflare_2d.py dist/cloudflare-2d/index.html public`으로 캐시 가능한 자산으로 나누고 커밋한다. `public/press`와 이전 자산은 보존한다. 자동 배포는 main의 성공 체크와 공개 주소의 실제 응답을 기준으로 확인한다.

## v150 자동 반영 확인과 이후 게시 절차

GitHub main의 `2a29a4a`에 대한 **Workers Builds: yahaeng** 체크가 성공했고, Cloudflare와 Pages 모두 v150·동일한 `source_sha256`을 반환했다. [실제 성공 체크와 공개 PC·터치 검증](skills-v150/DEPLOYMENT.md).

1. 2D 수정 후 기존 빌드와 패키징으로 `public/index.html`, `public/version.json`, 참조 에셋을 함께 준비한다.
2. 검증한 소스와 public 패키지를 main에 push한다. 기존 Cloudflare GitHub 연결이 자동으로 배포한다. Pages만 갱신한 것으로 끝내지 않는다.
3. 해당 커밋의 `Workers Builds: yahaeng` 체크가 대기 중이면 완료까지 기다린다. 체크가 아직 없거나 Pages가 먼저 갱신된 것만으로 자동 연결이 없다고 판단하지 않는다.
4. 성공 후 Cloudflare 공개 `version.json`의 버전·소스 해시와 실제 HTML·실행 스크립트를 준비한 public과 비교한다. 중요한 조작은 PC·터치에서도 확인한다.

체크 조회: `gh api repos/kkhkkh20-bit/yahaeng/commits/<게시한 커밋 SHA>/check-runs`.

개발 환경에 `CLOUDFLARE_API_TOKEN`이 없다는 사실은 직접 CLI 배포의 제한이다. 기존 서버의 GitHub 자동 배포 연결이 없다는 뜻은 아니다. 자동 배포가 성공한 상황에서 중복 워크플로·새 Workers 프로젝트·추가 토큰을 요구하지 않는다.

검증: `npx wrangler@4.156.0 deploy --dry-run`에서 정적 파일 3개를 읽었고, workerd 로컬 실행과 공개 HTTPS 주소에서 v128·의뢰 6개·사선 시제품 미포함을 확인했다. 공개 Chromium에서 PC 방향키 및 실제 CDP 터치 이동을 확인했고, 응답 HTML의 SHA-256이 고정 public/index.html과 일치했다. 최초 main 수정 커밋 `e9c902d`의 Workers Builds 체크는 성공이며 배포 버전 ID는 `400c71a8-1590-45f1-9de1-344b4d9c274b`다.
