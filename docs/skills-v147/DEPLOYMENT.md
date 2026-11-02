# v147 공개 배포 검증

검증일: 2026-11-02 (Asia/Seoul).

- 게임 소스·패키지: `9a4f0ed3e4958f9df31481a5b0b32c542db42678`.
- Pages 게임 배포: `3e1925fe14c626ad07832729e73ccd88a89995b0`.
- 패키지 원본 SHA-256: `32d17a14d14b1128c562ea263f43d45f9b0c993db706f56638260a2f78855ab9`.
- [Pages 배포 성공](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41462716331).
- [Cloudflare Workers Builds 성공](https://github.com/kkhkkh20-bit/yahaeng/runs/125336763036).

| 공개 주소 | 확인 |
| --- | --- |
| https://kkhkkh20-bit.github.io/yahaeng/ | v147, HTML·버전·스크립트 4개 해시 일치, PC·터치 이동·웅크리기·목표 정지/재개·메뉴 재진입, 암살 연습 완주 |
| https://kkhkkh20-bit.github.io/yahaeng/playtest-2d/ | 루트와 같은 v147 버전 파일 |
| https://yahaeng.kkhkkh-20.workers.dev/ | v147, HTML·버전·스크립트 4개 해시 일치, PC·터치 조작, 암살 연습 완주 |

공개 두 서비스의 페이지에서 JavaScript 오류는 0개이며, 3D 뷰어·모델 요청은 없었다. 암살 연습은 실제 의뢰 목록에서 열고, Ctrl로 웅크린 뒤 키보드 이동·B 길게·K 선택으로 두 기술과 출구까지 진행했다. 좌표 변경 없이 완료했으며 결과 화면이 열린 뒤에도 본편 별은 0개다. 로컬에서는 두 기술 모두 실제 CDP 터치로도 검사했다.

[Pages 파일·PC·터치 기록](live-pages-v147.json) · [Cloudflare 파일·PC·터치 기록](live-cloudflare-v147.json) · [Pages 연습 완주](live-practice-pages.json) · [Cloudflare 연습 완주](live-practice-cloudflare.json) · [미러 버전 확인](mirrors.json).

재현:

```sh
python3 tests/tutorial/verify_deployment.py https://kkhkkh20-bit.github.io/yahaeng/ live-pages-v147 --plain
python3 tests/tutorial/skill_practice_walk.py https://kkhkkh20-bit.github.io/yahaeng/
```

`--plain`은 프록시가 쿼리 문자열을 붙인 경로에 간헐적으로 503을 돌려주는 환경에서 기본 정적 주소를 검사한다. 별도 캐시 무효화 문자열 없이도 공개 응답의 실제 바이트가 배포 원본과 같은지 확인한다. 이번 배포는 보존된 사선 3D 에피소드를 다시 만들지 않았다.
