// 3D 표시 시험: 3D 빌드(build.py --club)에서 주소에 ?view3d=<의뢰 id> 가 있으면 그 의뢰를 3D로 그린다.
// 규칙·속도·판정은 2D 그대로이고 화면·입력만 바뀐다(view3dOn). 의뢰 데이터 보정이 모두 끝난 뒤에 적용되도록 맨 마지막 파일에 둔다.
if (window.__CLUB_STUDY__) {
  const want = new URLSearchParams(location.search).get('view3d');
  const st = want && STAGES.find(s => s.id === want && !s.artSlice);
  if (st) { st.view3d = true; window.__VIEW3D__ = st.id; }
}
