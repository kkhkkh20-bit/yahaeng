# v127 배포 확인 — 2026-11-01 UTC

- 게임 코드: `219d3f04d2776d93d127af424d0659a055d87167` (`main`).
- Pages: `a78ebfeba1338cfe20686e62b50dfcdacf015b2a`.
- [배포 실행 41300831606](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41300831606): completed / success.
- Pages: built. 해당 커밋의 배포 상태: succeed.
- [게임 실행](https://kkhkkh20-bit.github.io/yahaeng/tone-study/game.html?v=127&build=a78ebfe).
- [전후 화면·실시간 검수·그래픽 진단](https://kkhkkh20-bit.github.io/yahaeng/polish-v127/).

실제 HTTPS 게임에서 Chromium PC·모바일 터치 화면을 열어 v127, 공터의 컨테이너·사다리 제거, 식당 경비의 위치·식사 설정, NPC 40명과 카메라 3대를 확인했다. 페이지 오류는 없었다. 비교 페이지의 모든 이미지와 약 159초짜리 녹화 영상의 디코딩도 확인했다. 기존 프록시와 TLS 검증을 유지했다. 실제 iPhone 검사로 표현하지 않는다.

게시된 HTML 두 개, 비교 페이지, 모바일 자세·공터 이미지와 영상 파일을 HTTPS로 내려받아 로컬 게시본과 전체 바이트가 같은지 검사했다.

- 루트 HTML: 11,373,045바이트, SHA-256 `b61a17eca4a8850b5c1e0833a29f03af1a8d387a46102306570bd555bad1d7dc`.
- 잉크 HTML: 11,373,089바이트, SHA-256 `487d509760092ed71eb622f90fd999121cc99f746cbf05b80f8fc0bf173b9fc3`.
- 실시간 영상: 5,117,997바이트, SHA-256 `7f5f7df7b4c618eb43f66120b1d9581316e6369be09155432f7d3a6c4acd1cfa`.

[변경·검수·실패와 수정 기록](POLISH_REVIEW_V127.md), [그래픽 진단과 제안](ART_DIRECTION_REVIEW_V127.md), [검사 결과](polish-v127/validation.json).
