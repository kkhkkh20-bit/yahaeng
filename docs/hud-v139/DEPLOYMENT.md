# v139 공개 배포 확인

- 런타임 소스: `8667f533b4e50a7305733d267760698a2c40136a`
- Pages: `fa80e655f37ee57bb91cab2ec1a31bb2f3daac3c`
- [Pages 성공 기록](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41406863857)
- Cloudflare main 빌드: `c1a97360-03af-4038-a10c-78d73018e88c`, Workers Builds 체크 성공.
- Cloudflare 버전: `acfb3fcf-4bf1-44ce-9dc6-8f282068d598`
- [Cloudflare 2D](https://yahaeng.kkhkkh-20.workers.dev/?v=139)
- [Pages 대체 주소](https://kkhkkh20-bit.github.io/yahaeng/?v=139)
- [HUD 전후·상태 화면](https://kkhkkh20-bit.github.io/yahaeng/hud-v139/)

두 공개 주소의 HTML·version.json·게임 스크립트 4개가 최종 `public/` 파일과 SHA-256이 일치했다. 분할 전 빌드 해시는 `8e5e9516707288f2386e886aff8b52a5d7ef9b94304bda5bf77495b97f86ba98`다.

공개 페이지의 PC 키보드 / 세로 터치 브라우저에서 시작·이동·웅크리기·메뉴·연습 재진입을 확인했다. 목표 목록을 열어 350ms 동안 실제 게임 시간이 멈추고, 닫은 뒤 다시 진행되는 것도 검증했다. 자바스크립트 오류와 3D 요청은 없었다. [Cloudflare 결과](live-cloudflare.json) · [Pages 결과](live-pages.json).

이 검증을 위해 `tests/tutorial/verify_deployment.py`에 목록 정지·재개 검사를 추가했다. 브라우저 시뮬레이션이므로 실물 iPhone의 렌더 성능 측정과는 구분한다. 게임 진행과 렌더 프레임 조건을 분리한 시간 검사는 `systems-pc.json`, `systems-touch.json`에 있다.

Pages `/playtest-2d/`에도 같은 분할 산출물을 반영했다. 기존 3D 실험판은 이번 배포에서 갱신하지 않았다.
