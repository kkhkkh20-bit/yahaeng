# v141 · 공개 배포 완료

- 런타임 소스 커밋: `1542cf83eeeba9c9299dd191d0cc1de02d00682b`
- Pages 준비 커밋: `c93cbdd5d3db266f505c961bef1001a9a137a65e`
- 분할 전 소스 SHA-256: `17eb6b3d26aacd92b66f525a38322feaf702d5fe413e1db39fdd098f7ceb79dd`
- 로컬 분할 산출물: `public/`
- 단일 HTML 실행 ZIP: `dist/itch/yahaeng_itch.zip`

## 완료한 검증

`http://127.0.0.1:8001/public/`에서 공개 배포와 같은 패키지를 검사했다. HTML·version.json·게임 스크립트 4개가 파일 SHA-256과 일치했다. PC 키보드와 터치 브라우저의 시작·이동·웅크리기·목표 목록 정지/재개·메뉴·연습 재진입이 통과했다. 자바스크립트 오류와 3D 요청은 없었다. [검사 결과](local-packaged.json).

핵심 회귀 37개와 도달 검사, 빌드 파이프라인 6개, 이미지 서비스, 동작 트랙·기본 자세·HUD·튜토리얼 실제 입력 검사도 통과했다. [검사 로그](regressions.txt).

Pages 루트와 `/playtest-2d/`에도 같은 파일을 준비했다. 별도 3D 아카이브와 사용자가 만든 보조 HTML은 보존했다. 그 아카이브의 참조까지 확인해 어느 HTML/JS/CSS에서도 쓰지 않는 예전 해시 스크립트만 별도로 정리했다.

## 공개 배포 확인

- 공개 소스: `0a522afb63abdfa594cb13dd4797322ff14d243c`
- Pages 런타임 배포: `70284f78717a8b233e004bf3975d8495701166bc`
- [Pages 배포 성공](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41428869989)
- Cloudflare Workers Builds: completed / success. 빌드 ID `3eb9c661-16b5-40d0-b907-3d4d5dc67641`.
- [Cloudflare 실행](https://yahaeng.kkhkkh-20.workers.dev/?v=141)
- [Pages 실행](https://kkhkkh20-bit.github.io/yahaeng/?v=141)
- [구조·용량·전후 화면](https://kkhkkh20-bit.github.io/yahaeng/refactor-v141/)

두 공개 주소의 HTML·version.json·게임 스크립트 4개가 검증한 public/ 파일과 SHA-256이 일치했다. 각각 PC 키보드와 터치 브라우저에서 시작·이동·웅크리기·목표 목록 정지/재개·메뉴·연습 재진입을 확인했다. 버전은 v141이며 자바스크립트 오류와 3D 요청은 없었다. [Cloudflare 결과](live-cloudflare.json) · [Pages 결과](live-pages.json).

이 기록은 브라우저 검증이며 실물 휴대폰 FPS 측정은 아니다. 배포 이후 추가하는 검수 기록 커밋은 런타임 산출물을 바꾸지 않는다.
