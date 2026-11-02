# v141 · 배포 검증 진행

- 런타임 소스 커밋: `1542cf83eeeba9c9299dd191d0cc1de02d00682b`
- Pages 준비 커밋: `c93cbdd5d3db266f505c961bef1001a9a137a65e`
- 분할 전 소스 SHA-256: `17eb6b3d26aacd92b66f525a38322feaf702d5fe413e1db39fdd098f7ceb79dd`
- 로컬 분할 산출물: `public/`
- 단일 HTML 실행 ZIP: `dist/itch/yahaeng_itch.zip`

## 완료한 검증

`http://127.0.0.1:8001/public/`에서 공개 배포와 같은 패키지를 검사했다. HTML·version.json·게임 스크립트 4개가 파일 SHA-256과 일치했다. PC 키보드와 터치 브라우저의 시작·이동·웅크리기·목표 목록 정지/재개·메뉴·연습 재진입이 통과했다. 자바스크립트 오류와 3D 요청은 없었다. [검사 결과](local-packaged.json).

핵심 회귀 37개와 도달 검사, 빌드 파이프라인 6개, 이미지 서비스, 동작 트랙·기본 자세·HUD·튜토리얼 실제 입력 검사도 통과했다. [검사 로그](regressions.txt).

Pages 루트와 `/playtest-2d/`에도 같은 파일을 준비했다. 별도 3D 아카이브와 사용자가 만든 보조 HTML은 보존했다. 그 아카이브의 참조까지 확인해 어느 HTML/JS/CSS에서도 쓰지 않는 예전 해시 스크립트만 별도로 정리했다.

## 공개 배포 진행

외부 연결이 복구되어 원격 main과 gh-pages가 직전 v140 커밋임을 확인했다. 검증된 v141 산출물을 반영하고 Cloudflare/Pages 빌드와 두 공개 주소를 확인한다. 완료 뒤 이 문서에 공개 검증 결과와 배포 커밋을 기록한다.
