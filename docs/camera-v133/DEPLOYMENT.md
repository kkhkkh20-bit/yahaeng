# v133 공개 검증

- 개선판: https://kkhkkh20-bit.github.io/yahaeng/episode-one/?v=133
- 같은 위치 전후: https://kkhkkh20-bit.github.io/yahaeng/camera-v133/
- 구현 소스: 6da6217
- Pages: 1dfdcfab37f832811565d7c60638d0906df73c17
- 배포 작업: https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41365289924 — 성공

실제 HTTPS에서 PC 1000×740와 터치 390×844의 소개·출발·이동·메뉴·소개 복귀를 확인했다. 양쪽 모두 v133, 카메라 54도, 지면 구획 기반 건물 절개를 로드했다. 터치의 기본 가로 지면 폭은 8m, 주인공 발의 기준 위치는 가로 45%·세로 60%다. 브라우저 오류는 없고 index와 제작 JS 14개가 로컬 게시물의 SHA-256과 일치한다(`live.json`).

로컬에서는 두 화면 크기 × 여섯 위치의 실제 렌더 픽셀과 지면 표본 50개를 검사했다. 확대·역투영·네이티브 핀치·이동 입력 해제·기존 확대 저장값 분리도 통과했다. 8방향 이동, 벽·창문 시야, 수납함과 층 표시·페이드·시체·혈흔·은신 용량, PC/터치 처치 입력을 회귀 검사했다. PC 번호판·계단 경로와 터치 맨홀·창문 경로를 활성 AI로 다시 완주했고, 모바일 덕트 우회·손 조작·기습 후 실내 복귀도 통과했다.

자동 완주 시간과 렌더 호출 시간은 실제 iPhone FPS 측정이 아니다. 기존 2D Cloudflare는 v128-loading-fix를 유지한다. public/과 playtest-2d는 변경하지 않았다.
