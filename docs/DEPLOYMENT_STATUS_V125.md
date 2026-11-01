# v125 배포 상태 — 2026-11-01 UTC

게임 코드 커밋: `ff44342c752ffc7065c0e0268adbdec0be69a5eb` (`main`에 반영).
배포 파일 커밋: `c02052122541db030f2ff48f0103b06932321009`.
같은 파일의 재배포 트리거: `b5826577cb82e9242bd22f9d0448ca7b67949de3` (`gh-pages`에 반영).

로컬 게시본 PC·모바일 검사, 비교 영상 디코딩, 고정 커밋의 원격 파일 바이트 일치는 통과했다. **GitHub Pages의 실제 새 배포는 실패했다.**

- [첫 배포 41290978244](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41290978244): build 성공, deploy 실패.
- [재시도 41291147315](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41291147315): 같은 이유로 deploy 실패.
- 서버의 응답: `Deployment request failed ... due to in progress deployment. Please cancel 383eaad46df10fed0144e8bbf2ac838e6868f61f first or wait for it to complete.`

이전 v124 Actions 실행은 성공으로 표시되지만 Pages 서버는 위 커밋의 배포가 아직 진행 중이라고 응답한다. Actions 성공과 실제 Pages 배포 잠금 상태를 구분해야 한다. 재시도를 더 반복하거나 게임 파일을 바꿔 해결할 수 있는 코드 오류로 확인되지는 않았다.

현재 연결에서는 Pages 배포 취소에 사용할 API 인증이 준비되지 않아 잠금을 취소하지 못했다. 값이나 자격 증명 파일을 읽지 않았으며 네트워크 정책을 우회하지 않았다. 기존 배포가 종료되거나 Pages 측에서 취소된 뒤 새 배포의 성공을 다시 확인해야 한다. 사이트가 v125라고 단정하지 않는다.

수정본은 `dist/itch/yahaeng_itch.zip`이다. 압축을 풀고 `index.html`을 열어 실행한다. 게임·검증 내용은 [NPC_FEEDBACK_V125.md](NPC_FEEDBACK_V125.md)에 있다.
