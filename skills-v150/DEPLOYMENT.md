# v150 배포 상태

2026-11-03 (Asia/Seoul). **Pages와 Cloudflare 모두 v150 배포 완료**. 이전 v149 다트·은신 기습 해금 변경도 포함한다.

Cloudflare는 GitHub main에 연결된 기존 **Workers Builds: yahaeng**에서 자동 배포됐다. 대기 중이던 빌드가 완료되기 전에 구버전 응답을 보고 미반영으로 판단했던 상태를 정정한다. 개발 환경의 직접 Wrangler 배포 인증이 없어도 서버의 기존 GitHub 연결은 자동 배포한다. 별도 배포 프로젝트나 두 번째 CI 파이프라인은 추가하지 않았다.

- 자동 배포 소스: `2a29a4ac031f1dd12cdf81b9eb07339a4c176aac`
- Cloudflare 성공 체크: [Workers Builds: yahaeng](https://github.com/kkhkkh20-bit/yahaeng/runs/125405385669)
- [실제 성공 체크](cloudflare-auto-build.json) · [공개 HTML·버전·4개 스크립트 해시](live-cloudflare-package.json)
- [Cloudflare PC·터치 전기 기술 구매·스위치 조작](live-cloudflare-journey.json) · [Pages PC·터치 검사](live-electric-journey.json)
- [상태·패키지](release-status.json)

두 주소의 버전과 source_sha256은 같다. Cloudflare의 HTML·version.json·4개 실행 스크립트도 준비한 public 패키지와 각각 일치한다. 공개 UI 검사는 실제 의뢰 스위치 앞에 배치하는 통제 조건에서 구매 전 제한 → 실제 기술 구매 → 켜기·끄기를 확인한다. 기초 연습 전체의 실제 이동 완주는 별도 로컬 검사에서 확인했다.

앞으로는 main에 준비한 public 패키지를 함께 올리고 **Workers Builds 성공 + 공개 version.json 및 실행 파일 일치**까지 확인한다. Pages가 먼저 갱신됐거나 Cloudflare가 잠시 구버전을 반환한다는 이유만으로 연결이 끊겼다고 판단하지 않는다. 빌드 실패나 실제 내용 불일치는 별도로 확인한다.
