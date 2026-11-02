# v141 · 산출물 검증과 공개 반영 대기

- 런타임 소스 커밋: `1542cf83eeeba9c9299dd191d0cc1de02d00682b`
- Pages 준비 커밋: `c93cbdd5d3db266f505c961bef1001a9a137a65e`
- 분할 전 소스 SHA-256: `17eb6b3d26aacd92b66f525a38322feaf702d5fe413e1db39fdd098f7ceb79dd`
- 로컬 분할 산출물: `public/`
- 단일 HTML 실행 ZIP: `dist/itch/yahaeng_itch.zip`

## 완료한 검증

`http://127.0.0.1:8001/public/`에서 공개 배포와 같은 패키지를 검사했다. HTML·version.json·게임 스크립트 4개가 파일 SHA-256과 일치했다. PC 키보드와 터치 브라우저의 시작·이동·웅크리기·목표 목록 정지/재개·메뉴·연습 재진입이 통과했다. 자바스크립트 오류와 3D 요청은 없었다. [검사 결과](local-packaged.json).

핵심 회귀 37개와 도달 검사, 빌드 파이프라인 6개, 이미지 서비스, 동작 트랙·기본 자세·HUD·튜토리얼 실제 입력 검사도 통과했다. [검사 로그](regressions.txt).

Pages 루트와 `/playtest-2d/`에도 같은 파일을 준비했다. 별도 3D 아카이브와 사용자가 만든 보조 HTML은 보존했다. 그 아카이브의 참조까지 확인해 어느 HTML/JS/CSS에서도 쓰지 않는 예전 해시 스크립트만 별도로 정리했다.

## 외부 연결 때문에 확인하지 못한 부분

현재 작업 환경에서 GitHub·GitHub API·Cloudflare 공개 주소 요청이 모두 HTTP 503을 반환한다. `git push origin HEAD:main`은 upstream 연결 오류 또는 RPC 503으로 실패했고, 원격 ref 조회도 503이라 업로드 성공을 확인할 수 없다. 공개 CI/Cloudflare/Pages 배포 및 공개 URL 검증은 완료로 표시하지 않는다. 네트워크가 복구되면 원격 ref를 먼저 확인한 뒤 main과 준비된 gh-pages를 반영하고 `tests/tutorial/verify_deployment.py`로 두 공개 주소를 검증해야 한다.

로컬 소스·배포 산출물·검수 기록은 커밋으로 저장했다. 로컬 실행 결과를 공개 사이트의 검증 결과로 간주하지 않는다.
