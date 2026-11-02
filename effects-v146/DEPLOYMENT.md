# v146 배포 검증

- 게임 소스: `c7c3c2ccb75f4afd8bb4db7d5958120b0b25a75e`
- Pages 게시: `41df589390b7663da80324db080c99831259668d`
- [Pages 게시 성공](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41453942912)
- [Cloudflare 빌드 성공](https://github.com/kkhkkh20-bit/yahaeng/runs/125305895366)
- 패키지 원본 SHA-256: `a9e4e8e6063dfce8bc1ae8d2babb284fc69d44bca8c32968513c227971f8186d`

두 공개 기본 주소에서 HTML·버전·스크립트 네 개의 SHA-256이 로컬 배포 패키지와 일치했다. 새 효과 WebP도 두 주소에서 HTTP 200과 바이트 일치를 확인했다. 플레이어가 사용하는 기본 주소와 일반 정적 경로로 검증했다.

각 주소에서 PC 키보드와 CDP 터치 입력으로 시야·소리 연습 진입, 이동, 웅크리기, 목표 펼치기 중 시간 정지·재개, 메뉴 복귀·연습 재진입을 통과했다. JavaScript 오류와 3D 파일 요청은 없었다. 모든 의뢰의 자연 플레이 완주나 실물 휴대폰 FPS 측정은 별도다.

[Pages 입력·해시 원본](live-pages.json) · [Cloudflare 입력·해시 원본](live-cloudflare.json) · [새 효과 이미지·배포 상태](deployment-status.json)

이 증거 추가는 검증한 게임 패키지 바이트를 바꾸지 않는다.
