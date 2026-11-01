# Cloudflare 2D 첫 접속 로딩 수정

신고: 시작·의뢰 선택·설정 모두 반응하지 않고 무한 로딩. 신고자의 기기·브라우저 정보는 제공되지 않았다. 같은 증상이 일반 Chrome 첫 접속에서는 재현되지 않았으며, 서버는 정상 응답했다. 특정 기기의 원인을 확정했다고 주장하지 않는다.

확인한 결함과 수정:

- 이전 게시 파일: 11,376,661바이트 HTML. 메뉴가 먼저 파싱되어 보이더라도 뒤의 이미지 데이터·코드 수신과 파싱이 끝나기 전에는 이벤트가 연결되지 않았다.
- 이미지 170개를 같은 출처의 해시 파일로 옮기고 스크립트 4개를 순서를 지키는 defer 파일로 분리. 새 HTML은 159,783바이트. 해시 자산은 1년 캐시, HTML은 재검증.
- 부팅 전 설정 화면은 즉시 열림. 시작·의뢰 선택을 누르면 준비 후 한 번 실행. 필수 파일 수신 실패와 30초 지연은 재접속 링크 표시. 오류 원문도 짧게 표시하여 다음 신고를 진단할 수 있게 함.
- 선택적인 가구 이미지의 decode를 기다리느라 게임 초기화가 막히던 의존성 제거. 필수 아틀라스 실패도 감지.
- 게임 내용은 v128 2D 동결본이다. 새 3D 구역·룰·미션 변경은 넣지 않았다. public/press 소개 파일도 유지했다.

검증은 `tests/rev/t_cloudflare_startup.py`. Chrome PC·터치, Firefox, WebKit 엔진에서 설정·의뢰·시작을 실제 클릭. decode API가 없는 상황, 스크립트 다운로드를 지연한 상황, 다운로드 실패 상황을 별도로 확인한다. Linux WebKit은 실제 iPhone 검증을 대신하지 않는다.

재생성: `python3 tools/package_cloudflare_2d.py /path/to/self-contained-2d.html`. 현재 public/index.html은 이미 분할되었으므로 입력으로 쓰지 않는다. Git의 직전 공개 2D 원본에서 부팅 부분만 수정한 HTML을 입력했다.

배포 확인: Cloudflare 연결 브랜치는 `playtest-2d`였다. 소스 main의 dfaf6f0과 별도로 테스트 브랜치 094c42a에 같은 public 파일을 반영했다. Cloudflare Workers Builds a3e71a9c-4cc7-427f-988d-2743037a493f가 실패했으나 GitHub 체크에는 오류 본문이 없었다. 사용자의 Cloudflare 로그를 요청했다. 로컬 Wrangler dry-run은 186개 정적 파일을 읽고 통과했다.

대체 공개 주소 `https://kkhkkh20-bit.github.io/yahaeng/playtest-2d/`를 게시하여 실제 HTTPS PC·모바일 클릭, 이동, 지연 다운로드, 실패 복구를 재확인했다. 이 기록은 Cloudflare 재배포 성공을 의미하지 않는다.
