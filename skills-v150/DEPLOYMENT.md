# v150 배포 상태

2026-11-03 (Asia/Seoul). **Pages 본편 v150 배포 완료**. 소스 main과 gh-pages push가 성공했고 Pages build and deployment도 성공했다. 이전 v149 다트·은신 기습 해금 변경을 함께 배포했다.

[공개 본편](https://kkhkkh20-bit.github.io/yahaeng/) · [공개 PC·터치 전기 기술 구매·조명 조작](live-electric-journey.json) · [상태·패키지](release-status.json). 공개 검사는 실제 스위치 앞에 배치하는 통제 조건으로 UI를 검증한다. 기초 연습의 전체 이동 완주는 별도 로컬 검사에서 확인했다.

Cloudflare 테스트 주소는 마지막 확인 시 v148이다. 이 환경에는 직접 배포 인증이 없고 main 자동 배포 완료도 관측되지 않아 Cloudflare까지 갱신됐다고 표시하지 않는다.

추가 공개 패키지 검사는 세션 연결 지연과 모바일 부팅 타임아웃으로 완료하지 못했다. 최종 로컬 패키지 해시와 공개 PC·터치 전기 기술 구매·조명 조작 검사는 통과했다. 런타임 배포 이후 검증 문서 후속 push는 다시 HTTP 503으로 막혀 로컬 커밋에 보관한다.
