# v128 배포 확인

2026-11-01. 소스는 main에 반영했고 GitHub Pages 공개 주소에서도 확인했다.

- 게임 코드: `3746fe5` — 클럽 사선 시점과 운반·시체 표시 후속 수정.
- 비교·검증 자료: `528f9e8`.
- Pages 배포: `d30451e537f89516a346405817da5350855cb488`.
- [배포 작업 41309943642](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41309943642): `completed / success`. Pages API도 `built`.
- [새 구역](https://kkhkkh20-bit.github.io/yahaeng/club-study/?v=128&build=d30451e): 실제 HTTPS Chromium에서 PC 1000×740, 터치 화면 390×844로 열어 v128 / clubStudy / 인물 5개 / 경비·주민 4개와 화면 표시를 확인했다.
- [화면 비교](https://kkhkkh20-bit.github.io/yahaeng/club-v128/?v=128&build=d30451e): 모바일 전환과 이미지 디코딩 통과.
- [기존 캠페인](https://kkhkkh20-bit.github.io/yahaeng/tone-study/game.html?v=128&build=d30451e): 별도 사선 구역이 의뢰 목록에 등록되지 않고 Three.js·새 모델을 요청하지 않는 것을 확인했다.
- 공개된 HTML·스크립트·라이선스·모델·비교 이미지·영상·결과 JSON 총 40개 파일의 SHA-256이 배포 체크아웃과 일치했다(합계 68,570,070바이트, 일반 플레이 한 번의 다운로드 크기를 뜻하지 않음).

검증 기기는 실제 휴대폰이 아니라 클라우드 Chromium의 모바일 화면·터치 입력 환경이다. 실기기 성능 결과로 표현하지 않는다. 상세 경로·영상 재생 방식·후속 수정의 구분은 [검증 기록](CLUB_STUDY_VALIDATION_V128.md)을 참고한다.
