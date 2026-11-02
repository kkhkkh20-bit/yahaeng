# v144 배포 검증

- 게임 소스: `bf88573adb81cc635aec1966b5bf134cf8432327`
- Pages 게임 게시: `5aea6dcb9c316e837738884742258cf86969d890`
- [Pages 게시 성공](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41444561098)
- [Cloudflare Workers 빌드 성공](https://github.com/kkhkkh20-bit/yahaeng/runs/125274575006)
- 패키지 원본 SHA-256: `e5e5e3484185eaf4ea1511e44b75d3a241accb0155f29421ef1b12604e672a05`

두 공개 주소에서 HTML·버전·스크립트 네 개의 SHA-256이 검증한 배포본과 일치했다. PC와 CDP 터치 입력으로 시야·소리 연습 진입, 이동, 웅크리기, 목표 펼치기 중 시간 정지·재개, 메뉴 복귀·재진입을 확인했다. JavaScript 오류와 3D 파일 요청은 없었다. 전후 비교 갤러리 HTTP 200 응답도 확인했다.

[Cloudflare 검증 원본](live-cloudflare.json) · [Pages 검증 원본](live-pages.json) · [119개 접근 경로와 층간 추적](multilevel-pursuit.json)

이 증거 추가는 게임 패키지 바이트를 바꾸지 않는다. 실물 휴대폰 FPS 측정과 모든 의뢰의 자연 플레이 완주는 별도다.
