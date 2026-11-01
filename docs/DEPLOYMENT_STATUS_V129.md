# v129 배포·Cloudflare 2D 테스트 확인

2026-11-01 (한국 시간).

- 게임 수정 소스: `b8f49a3` — 사선 시점 이동 배율·방향 보정, 프레임 시간 진행, 평상시 시야와 지면 가림.
- GitHub Pages: `d27529e2cc9a0ac2afb56591f9e06c04f099228a`, [작업 41314362950](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41314362950) success.
- [새 구역](https://kkhkkh20-bit.github.io/yahaeng/club-study/?v=129&build=d27529e): 공개 HTTPS Chromium의 PC 1000×740·터치 화면 390×844에서 v129 / clubStudy / 인물 5개를 확인했다.
- [변경 화면·수치](https://kkhkkh20-bit.github.io/yahaeng/tempo-v129/) 이미지 디코딩 통과, 기존 캠페인에서 사선 구역 미등록·새 모델 요청 없음도 확인했다.
- 공개 HTML·모듈·모델·비교 자료 34개 파일, 합계 43,692,886바이트의 SHA-256이 배포 체크아웃과 일치했다.
- 기존 2D 테스트본은 별도 Cloudflare 주소 https://yahaeng.kkhkkh-20.workers.dev/ 에 v128로 고정했다. 루트 HTML이 public/index.html과 바이트 단위로 일치했고, 공개 브라우저의 방향키·CDP 터치 이동과 의뢰 6개·사선 구역 미포함을 확인했다.

실제 휴대폰 FPS 검증으로 표현하지 않는다. 모의 프레임 주기별 동일 이동 검사는 게임 시간 정책 검증이며 물리적 GPU 성능 측정과 다르다.
