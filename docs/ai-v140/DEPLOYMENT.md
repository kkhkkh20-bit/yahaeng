# v140 공개 배포 확인

- 런타임 소스: `b32566446a1fed79e024920365657bc4b7e9bd7b`
- Pages 런타임 배포: `81116356fe078ab219f07a26d3a0ff79f745032c`
- [Pages 성공 기록](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41411653732)
- Cloudflare Workers Builds 체크: completed / success. 빌드 ID `ba8b8e31-1f1a-4115-878e-0c182a5b981e`.
- [Cloudflare 2D 실행](https://yahaeng.kkhkkh-20.workers.dev/?v=140)
- [Pages 2D 실행](https://kkhkkh20-bit.github.io/yahaeng/?v=140)
- [AI 전후 비교](https://kkhkkh20-bit.github.io/yahaeng/ai-v140/)

두 공개 주소의 HTML·version.json·게임 스크립트 4개가 최종 public/ 파일과 SHA-256이 일치했다. 분할 전 빌드 해시: `e8b815f1ddc0484094971934a1d8748cc4a021caf1529fe1ce1894800b7014e8`.

공개 주소에서 PC 키보드와 세로 터치 브라우저의 시작·이동·웅크리기·메뉴·연습 재진입을 확인했다. 목표 목록을 열어 350ms 동안 게임 시간이 멈추고 닫으면 재개하는 것도 확인했다. 자바스크립트 오류와 3D 리소스 요청은 없었다. [Cloudflare 결과](live-cloudflare.json) · [Pages 결과](live-pages.json).

새 AI 동작은 실제 m2 지형의 통제 장면에서 PC·터치 브라우저로 검사했다. [PC 결과](evidence-pc.json) · [터치 결과](evidence-touch.json). 다른 층·높이·벽·거리의 보고 차단, 실제 들은 무전 경비만 중계, 중계 제압 시 차단, 보지 못한 새 복장 보호, 상태 확인 시간·역할 소유·죽은 담당자 교체·몸 이동 시 취소·중복 집계 방지, 정면/후면 기절자의 신원 지식, 시체 신고와 범인 식별의 분리를 확인했다.

기존 변장·유인 소리·조명 복구·캐비닛/건물 수색·보안 대응·전투/운반·HUD·의뢰 진행 검사도 통과했다. 첫 두 튜토리얼은 실제 키보드/터치 입력으로 AI를 켜고 완주했다. [PC 튜토리얼](tutorial-pc.json) · [터치 튜토리얼](tutorial-touch.json) · [회귀 검사 로그](regressions.txt).

브라우저 시뮬레이션 검사이며 실물 iPhone의 FPS 측정은 아니다. 의뢰 36개 경로 검사는 NPC를 통제한 진행 회귀 검사다. 전략적 보안 단계와 정기 무전 점호에는 기존 게임의 추상화가 남아 있다. `/playtest-2d/`에도 같은 런타임을 반영했고 기존 3D 실험판은 갱신하지 않았다.
