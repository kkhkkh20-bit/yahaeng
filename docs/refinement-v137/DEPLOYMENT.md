# v137 공개 배포 확인

- 런타임 소스: `429f372a87995956b32cc885c692b98076eedbe9`
- Pages: `3ba839ea32275904ee5b47a325c5e06f032a9a9b`
- [Pages 성공 기록](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41389251307)
- Cloudflare main 빌드: `03113c9e-d818-436f-bad8-daf5eca5db16`, GitHub Workers Builds 체크 성공.
- Cloudflare 버전: `5ac36c11-97af-441b-923e-730cd9b74fe2`
- [2D 플레이](https://yahaeng.kkhkkh-20.workers.dev/?v=137)
- [Pages 대체 주소](https://kkhkkh20-bit.github.io/yahaeng/?v=137)
- [창문 전후·튜토리얼 화면](https://kkhkkh20-bit.github.io/yahaeng/refinement-v137/)

두 공개 주소의 HTML·version.json·게임 스크립트 4개 해시가 최종 `public/` 산출물과 모두 일치했다. 분할 전 2D 빌드 SHA-256은 `58c45a700cebdf50e9fd3219c900bf4a973301823d7bde6957a56b8170a699f6`다.

실제 브라우저 프레임에서 PC 키보드와 세로 터치의 시작·이동·웅크리기·메뉴·연습 재진입이 통과했다. 자바스크립트 오류와 3D 모듈/모델 요청은 없었다. [Cloudflare 결과](live-cloudflare.json) · [Pages 결과](live-pages.json). 이 검사는 실제 iPhone 성능 측정이 아니다.

원래 `episode-one/`, `club-study/` 실험판은 유지했다. 보관용 `playtest-2d` 소스 브랜치는 갱신하지 않았으며 실제 Cloudflare 프로덕션은 `main`으로 배포했다. Pages의 `/playtest-2d/` 정적 대체 주소는 같은 2D 산출물로 갱신했다.
