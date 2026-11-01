# v126 배포 완료 — 2026-11-01 UTC

- 게임 코드: `4b87c74635e43ff420aa263328056580a19adb96` (`main` 반영).
- Pages 커밋: `8fef7d4c1112dbfcf3fa69cf21cde7339dc7b488`.
- [배포 실행 41298013667](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41298013667): completed / success.
- Pages API: built. 해당 배포 API: succeed.
- [게임 실행](https://kkhkkh20-bit.github.io/yahaeng/tone-study/game.html?v=126&build=8fef7d4).
- [전후 영상·실시간 의뢰 검수](https://kkhkkh20-bit.github.io/yahaeng/motion-v126/).

실제 HTTPS 사이트에서 루트 HTML, 잉크 HTML, 비교 페이지, 흰 말풍선 이미지, 동작 비교 영상, 실시간 검수 영상을 내려받아 게시 파일과 전체 바이트가 같은지 확인했다.

- 루트 HTML: 11,349,651바이트, SHA-256 `a6f829dd7fcd8530b57c21c2849dd203a6bad9b4f05c03814856cf3b4c372fd8`.
- 잉크 HTML: 11,349,695바이트, SHA-256 `39007dc3fe025e515017b9f529a43745972d882f5b7e3ed678c07443392f6f2c`.

기존 프록시와 TLS 검증을 유지한 Chromium으로 실제 HTTPS 게임 주소에 접속했다. PC·모바일 화면에서 v126, 17프레임 창문 통과 시트, 실제 붙잡기·심문 답변, 흰 말풍선 픽셀 `(247,246,241,255)`을 확인했다. JavaScript 페이지 오류는 없었다. 모바일은 Chromium 터치 화면 모사이며 실제 iPhone 검사로 표현하지 않는다.

구현·게임 검수와 구형 검사 실패 기록은 [MOTION_REVIEW_V126.md](MOTION_REVIEW_V126.md), [검사 결과](motion-v126/validation.json)에 있다.
