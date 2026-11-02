# v148 공개 배포 검증

검증일: 2026-11-02 (Asia/Seoul).

- 게임 소스·패키지: `d7cb7300b7c10099119dd21f6b2f95750c2763b7`.
- Pages 게임 배포: `a58dbea4e04387ed7205683172f00801b59f3d71`.
- 패키지 원본 SHA-256: `ecb2d9bd366b51c7bfa48480c0841c7b52268e58187acca486ad229e14afeb4e`.
- [Pages 배포 성공](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41473571594).
- [Cloudflare Workers Builds 성공](https://github.com/kkhkkh20-bit/yahaeng/runs/125373708490).

| 공개 주소 | 확인 |
| --- | --- |
| https://kkhkkh20-bit.github.io/yahaeng/ | v148, HTML·버전·스크립트 4개 해시 일치, PC·터치 기본 입력 및 기술 구매·도구 연습 완주 |
| https://kkhkkh20-bit.github.io/yahaeng/playtest-2d/ | 루트와 같은 HTML·버전 파일 |
| https://yahaeng.kkhkkh-20.workers.dev/ | v148, HTML·버전·스크립트 4개 해시 일치, PC·터치 기본 입력 및 기술 구매·도구 연습 완주 |
| https://kkhkkh20-bit.github.io/yahaeng/skills-v148/ | 실제 전후·작은 화면·도구 연습 갤러리 일치 |

두 서비스 모두 PC·실제 CDP 터치로 신체/도구 계열의 기술 3개에 3P 투자 → 현장 도구 연습 → 경비 기절 → 무전기 확보 → 허위 지시 → 연막 → 카메라 뒤로 이동 → 해킹 → 길게 눌러 쿠나이 투척 → 출구·결과 화면을 확인했다. 좌표나 방향을 직접 바꾸지 않고 실제 이동·도구 입력으로 진행했다. 연습 후에도 본편 별은 0개, 배운 기록은 원래 구매한 3개, 잔여 포인트는 1P다. JavaScript 오류는 0개이며 3D 뷰어·모델 요청은 없었다.

[Pages 기본 조작·파일](live-pages-v148.json) · [Cloudflare 기본 조작·파일](live-cloudflare-v148.json) · [Pages PC·터치 구매와 완주](live-pages-journey.json) · [Cloudflare PC·터치 구매와 완주](live-cloudflare-journey.json) · [미러](mirrors.json).

재현:

```sh
python3 tests/tutorial/verify_deployment.py https://kkhkkh20-bit.github.io/yahaeng/ live-pages-v148 --plain
python3 tests/tutorial/tree_journey.py https://kkhkkh20-bit.github.io/yahaeng/ live-pages-journey
```

기존 3D 에피소드와 보존된 시점 자료는 다시 만들지 않았다. `--plain`은 쿼리 경로에 간헐적으로 503을 반환하는 세션 프록시에서 기본 정적 주소를 사용하며, 실제 공개 바이트가 배포 원본과 같은지 검사한다.
