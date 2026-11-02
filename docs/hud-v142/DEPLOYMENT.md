# v142 배포 검증

- 2D 소스: `d9901948d254cc0ff304a4e3bbacd97e6c78c08f`
- Pages 게임 게시: `0d0becc698966a52b908d100bb34d875fd9061e7`
- [Pages 게시 작업 성공](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41435404532)
- [Cloudflare Workers 빌드 성공](https://dash.cloudflare.com/16fbf9f8389e8ddbdd9c0e3bba5b823a/workers/services/view/yahaeng/production/builds/ad14db65-9899-48f6-9f24-ba87f1695309)
- 패키지 원본 SHA-256: `db3af167956af654e9b2c5b7e643e4e1c453e9fa5471965b8dc021b87d869c04`

두 공개 주소의 HTML·버전·스크립트 네 개를 로컬 검증본과 SHA-256으로 대조했다. 각 주소에서 PC와 CDP 터치 입력으로 연습 진입, 이동, 웅크리기, 목표 확인 중 시간 정지·재개, 메뉴 복귀·재진입을 통과했다. JavaScript 오류와 3D 파일 요청은 없었다.

- [Cloudflare 실제 검증](live-cloudflare.json) · [게임](https://yahaeng.kkhkkh-20.workers.dev/?v=142)
- [Pages 실제 검증](live-pages.json) · [게임](https://kkhkkh20-bit.github.io/yahaeng/?v=142)

실물 iPhone 성능 측정 결과는 포함하지 않는다. 배포 증거 문서 추가는 게임 패키지 바이트를 바꾸지 않는다.
