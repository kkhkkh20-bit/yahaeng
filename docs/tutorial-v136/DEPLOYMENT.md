# v136 공개 배포 확인

- 소스: `d8535c320eb53733ab3839b46b44dec2f2fb23a5`
- Pages: `39fd935de9f848d1c2ff75e6af0c936d6f2e66ec`
- [Pages 성공 기록](https://github.com/kkhkkh20-bit/yahaeng/actions/runs/41383990876)
- Cloudflare main 빌드: `59082271-f8fa-4064-b135-522bd984604b`, 성공.
- Cloudflare 버전: `2fecafe3-b66e-4516-b3cc-dd34540ee09d`.
- [2D 플레이](https://yahaeng.kkhkkh-20.workers.dev/?v=136)
- [Pages 대체 주소](https://kkhkkh20-bit.github.io/yahaeng/?v=136)

두 공개 주소에서 HTML·version.json·게임 스크립트 4개 해시가 최종 public 산출물과 일치했다. 실제 브라우저 프레임의 PC 키보드 / 세로 터치 시작·이동·웅크리기·메뉴·연습 재진입이 통과했고 자바스크립트 오류와 3D 모듈/모델 요청은 없었다. 결과는 `live-cloudflare.json`, `live-pages.json`. 이 검사는 실제 iPhone 성능 측정이 아니다.

보관용 playtest-2d 브랜치 bd78e55의 별도 자동 빌드 eae4c175-cf84-4c74-9f25-733509be0d93은 실패했다. GitHub 체크에 오류 본문은 제공되지 않았다. 실제 프로덕션 main 빌드와 공개 파일·브라우저 검증은 성공했으므로, 보관 브랜치의 체크를 서비스 적용 여부의 근거로 쓰지 않는다.
