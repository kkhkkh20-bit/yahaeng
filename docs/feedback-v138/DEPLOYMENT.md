# v138 최종 공개 배포 확인

- 기능 소스: `cd76984543e1f6ebe0f4d5138ab60f31e2adc064`
- 기존 저장 호환을 포함한 최종 런타임 소스: `1cba112ca7b39508cda5c0c9768d9e8bf085d02d`
- 최종 Pages: `36b958c00d362a8e5a59153e31daaed6f6413ab5`
- [Pages 성공 기록](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41393254926)
- Cloudflare main 빌드: `75b2dbd1-dac4-4aff-b907-6c501491faaa`, Workers Builds 체크 성공.
- Cloudflare 버전: `762b4269-9a9d-4bdd-b71f-ddbbbf742945`
- [Cloudflare 2D](https://yahaeng.kkhkkh-20.workers.dev/?v=138)
- [Pages 대체 주소](https://kkhkkh20-bit.github.io/yahaeng/?v=138)
- [전후 화면·동작](https://kkhkkh20-bit.github.io/yahaeng/feedback-v138/)

기존 체크포인트 통로 보완을 반영한 뒤 두 공개 주소를 다시 확인했다. HTML·version.json·스크립트 4개가 최종 `public/` 파일과 SHA-256이 모두 일치했다. 분할 전 빌드 해시는 `f0cbec42a7bd4f7699b412019e9d4969fd6c21bb4cacd4ed16d9b515f9fff025`다.

PC 키보드 / 세로 터치 브라우저의 시작·이동·웅크리기·메뉴·연습 재진입이 통과했고, 자바스크립트 오류와 3D 요청은 없었다. [Cloudflare 결과](live-cloudflare.json) · [Pages 결과](live-pages.json). 실제 iPhone 성능 측정은 아니다.

기존 저장 호환 검사에서는 예전 `O` 장애물이 들어 있는 체크포인트를 복원해 해당 칸이 열린 상태인지와 기존 기절 통계가 보존되는지 확인했다. [PC](feedback-pc.json) · [터치](feedback-touch.json). 새로 시작한 맵과 복원한 맵 모두 열린 통로를 사용한다.

Pages `/playtest-2d/`에도 같은 분할 빌드를 반영했다. `episode-one/`, `club-study/` 실험판과 보관용 소스 브랜치는 수정하지 않았다.
