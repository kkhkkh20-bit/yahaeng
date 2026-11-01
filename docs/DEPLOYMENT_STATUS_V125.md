# v125 배포 상태 — 2026-11-01 UTC

**배포 완료.** GitHub Pages 상태 `built`, 이번 Pages 배포 상태 `succeed`, Actions 실행 `success`, 실제 사이트 파일 일치까지 확인했다.

- 게임 코드: `ff44342c752ffc7065c0e0268adbdec0be69a5eb`.
- 배포 커밋: `6436bb16bae4e37e34f7ece1285c9f0d5b344c46` (`gh-pages`). 게임 파일은 이전에 검증한 v125와 동일하다.
- [성공한 배포 실행 41293942551](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41293942551).
- [게임 실행](https://kkhkkh20-bit.github.io/yahaeng/tone-study/game.html?v=125).
- [말풍선·심문·수납함 전후 비교](https://kkhkkh20-bit.github.io/yahaeng/feedback-v125/).

## 확인한 내용

실제 HTTPS 사이트에서 받은 루트 HTML, 잉크 버전 HTML, 비교 페이지, 출입 영상을 로컬 게시 파일과 바이트 단위로 비교했다. 모두 일치한다.

- `index.html`: 10,296,132바이트, SHA-256 `8c8de84a2459ec89aef691567f61eb9e4bd971b1dac79475561b362fe39a063b`.
- `tone-study/game.html`: 10,296,176바이트, SHA-256 `d2c841759cf3d9de205b7463557b67a929ab7c0ecadb65a1ccde74af27203954`.
- 비교 페이지와 사물함 출입 영상도 원본과 일치.

사이트에서 받은 HTML을 임시 로컬 서버로 실행해 PC·모바일 화면에서 v125 표시와 실제 붙잡기 → 심문 → 적의 답변 말풍선을 확인했다. 페이지 JavaScript 오류는 없었다. 원격 페이지를 모바일 기기에서 직접 플레이한 검사와는 구분한다. 새 환경에서 여섯 의뢰의 심문 48회 검사도 다시 통과했다.

## 이전 실패와 복구

초기 배포와 재시도 실행 `41290978244`, `41291147315`, `41291462036`은 Pages 서버가 v124 커밋 `383eaad46df10fed0144e8bbf2ac838e6868f61f`의 배포를 진행 중으로 판단해 실패했다. 당시 클라우드의 네트워크 정책이 GitHub 관리 API와 사이트 접속을 차단했으므로 직접 관리·사이트 확인도 불가능했다. 토큰의 존재 여부만으로 인증이 없다고 판단할 수 있는 상황은 아니었다.

접속 정책 적용 후 기존 인증으로 GitHub API가 정상 응답했다. v124는 완료 상태였으며 최신 파일을 다시 푸시해 새 Pages 실행을 시작했다. 이번 실행은 성공했고 사이트도 v125로 갱신됐다.

실패 작업만 재실행한 `41291462036` 요청은 대기열에 남았다. 일반 취소와 강제 취소 API 모두 `Cannot cancel a workflow re-run that has not yet queued`(409)를 반환했다. 이 대기 요청이 취소됐다고 주장하지 않는다. 그 요청의 게임 파일도 이번에 게시된 v125와 같다.

수정·검증 내용은 [NPC_FEEDBACK_V125.md](NPC_FEEDBACK_V125.md)에 있다.
