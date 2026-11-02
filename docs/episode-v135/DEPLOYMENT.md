# v135 배포 확인

- 소스: `4f4d609f7cc78cc8e145332c9ce2faa81f4e2821`
- Pages: `d732f9738061277382937f2bfed5c40653e5830d`
- [배포 성공 기록](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41380109635)
- [플레이](https://kkhkkh20-bit.github.io/yahaeng/episode-one/?v=135)
- [전후 화면](https://kkhkkh20-bit.github.io/yahaeng/episode-v135/)

`verify_deployment.py`로 공개 HTTPS의 HTML과 상위 모듈 17개 해시가 로컬 산출물과 같은지 확인했다. PC 키보드와 터치 브라우저에서 소개 → 시작 → 이동 → 메뉴 → 에피소드 복귀가 통과했으며 자바스크립트 오류는 없었다. 자세한 결과는 `live.json`.

모바일은 세로 390×844 터치 브라우저이며 실제 iPhone 측정이 아니다. Cloudflare의 기존 2D 테스트는 `v128-loading-fix`로 유지됨을 확인했다.
