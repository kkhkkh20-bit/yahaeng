// Generated from the shared CC0 pose baker by tools/build_club_study.py.
import * as THREE from 'three';
export function createPoseDriver(a,b){
 let {model,mixer,bones,mats,clips}=a;
 let model2=b.model,mixer2=b.mixer,bones2=b.bones,mats2=b.mats,clips2=b.clips;
 const partsOn=[[],[]],BODY=null,window={},modular=true,CY=210,RS=128,shadow=new THREE.Object3D(),root=new THREE.Group(),scene=root,grp=new THREE.Group();root.add(model,grp);grp.add(model2);model2.visible=false;
 const renderer={domElement:{toDataURL:()=>''},setSize:()=>{}},renderSprite=()=>{};
const CR = { th: 1.1, kn: 1.9, ft: 0.6, sp: 0.55, sp1: 0.2, hd: 0.45 };
const hp = new THREE.Vector3(), hd = new THREE.Vector3();
const renderFrame = (clip, t, dirA, crouch, hang, hold, relax) => {
  let relaxY = 0;
  // 편한 서기는 걷기의 한 프레임을 멈추지 않는다. 골반·허리의 전진 기울기부터 제거한다.
  const standing = relax && !relax.walk;
  mixer.stopAllAction();
  // 원본의 Idle은 전투 대기다. 발 IK까지 함께 구워진 평상시 서기 클립을 쓴다.
  const act = mixer.clipAction(standing ? (clips.Idle_Neutral || clips.Idle) : clips[clip]);
  act.reset(); act.play(); mixer.setTime(standing ? 0 : t);
  bones.Hips.position.x = 0; bones.Hips.position.z = 0;  // 제자리 (루트 이동 제거)
  model.rotation.set(0, 0, 0); model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  const footY = () => { let m = 1e9; for (const n of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) if (bones[n]) { bones[n].getWorldPosition(hp); m = Math.min(m, hp.y); } return m; };
  if (crouch) {  // 웅크리기: 세계 좌우축 기준으로 허벅지를 앞으로, 무릎을 뒤로 굽히고 상체를 숙인 뒤 발을 땅에 다시 붙인다
    const f0 = footY();
    const rotW = (b, ang) => { if (!b) return; const pq = new THREE.Quaternion(); b.parent.getWorldQuaternion(pq); const qw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang); const d = pq.clone().invert().multiply(qw).multiply(pq); b.quaternion.premultiply(d); b.updateMatrixWorld(true); };
    for (const s of ['Left', 'Right']) { rotW(bones[s + 'UpLeg'], -CR.th * crouch); rotW(bones[s + 'Leg'], CR.kn * crouch); rotW(bones[s + 'Foot'], -CR.ft * crouch); }
    rotW(bones.Spine, CR.sp * crouch); rotW(bones.Spine1, CR.sp1 * crouch); rotW(bones.Head, -CR.hd * crouch);
    model.updateMatrixWorld(true); model.position.y = f0 - footY();
  }
  shadow.visible = hang == null;
  if (hang != null) {  // 전깃줄에 매달린 자세: 두 팔을 머리 위로 곧게, 다리는 늘어뜨리고 조금 흔든다
    const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pq = new THREE.Quaternion();
    const aim = (b, c, dir) => { if (!b || !c) return; b.getWorldPosition(pa); c.getWorldPosition(pb); const cur = pb.sub(pa).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()); b.parent.getWorldQuaternion(pq); b.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq)); b.updateMatrixWorld(true); };
    for (const sd of ['Left', 'Right']) {
      bones[sd + 'Arm'].getWorldPosition(pa); const side = Math.sign(pa.x) || (sd === 'Left' ? 1 : -1);
      aim(bones[sd + 'Arm'], bones[sd + 'ForeArm'], new THREE.Vector3(0.18 * side, 1, 0.05));
      aim(bones[sd + 'ForeArm'], bones[sd + 'Hand'], new THREE.Vector3(0.05 * side, 1, 0.05));
      const sw = (sd === 'Left' ? 1 : -1) * hang * 0.35;
      aim(bones[sd + 'UpLeg'], bones[sd + 'Leg'], new THREE.Vector3(0, -1, sw + 0.12));
      aim(bones[sd + 'Leg'], bones[sd + 'Foot'], new THREE.Vector3(0, -1, sw * 0.6 - 0.15));
    }
  }
  if (relax) {  // 주민 자세: 팔을 몸 옆으로 편하게 내린다 (기본 Idle 은 주먹을 든 자세). relax.talk 이면 오른손으로 손짓, relax.sway 로 살짝 흔들림
    const qa = new THREE.Vector3(), qb = new THREE.Vector3(), qq = new THREE.Quaternion();
    const aimR = (b, c, dir) => { if (!b || !c) return; b.getWorldPosition(qa); c.getWorldPosition(qb); const cur = qb.sub(qa).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()); b.parent.getWorldQuaternion(qq); b.quaternion.premultiply(qq.clone().invert().multiply(q).multiply(qq)); b.updateMatrixWorld(true); };
    const sw = relax.sway || 0;
    if (standing) {
      // 부모인 척추를 먼저 세운 다음 팔을 맞춘다.
      aimR(bones.Spine, bones.Spine1, new THREE.Vector3(0, 1, 0));
      aimR(bones.Spine1, bones.Spine2, new THREE.Vector3(0, 1, 0));
      aimR(bones.Spine2, bones.Neck, new THREE.Vector3(0, 1, 0));
      aimR(bones.Neck, bones.Head, new THREE.Vector3(0, 1, 0.02));
    }
    for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1;
      if (relax.talk && sd === 'Right') { aimR(bones[sd + 'Arm'], bones[sd + 'ForeArm'], new THREE.Vector3(0.25 * side, -1, 0.25)); aimR(bones[sd + 'ForeArm'], bones[sd + 'Hand'], new THREE.Vector3(-0.15 * side + relax.talk * 0.25, 0.35 + relax.talk * 0.25, 1)); continue; }
      aimR(bones[sd + 'Arm'], bones[sd + 'ForeArm'], new THREE.Vector3(0.24 * side, -1, 0.02 + sw * 0.02 * side)); aimR(bones[sd + 'ForeArm'], bones[sd + 'Hand'], new THREE.Vector3(0.08 * side, -1, 0.08)); }
    if (!relax.walk) {  // 원본 Idle의 발 접지는 유지한다. 모듈형 리그는 발과 무릎의 부모가 달라 무릎만 펴면 다리가 꺾인다.
      model.updateMatrixWorld(true); relaxY = -footY();
    }
  }
  if (hold) {  // 상자 들기: 위팔은 앞아래로, 아래팔은 앞으로 모아 가슴 앞에서 두 손을 맞댄다 (상자는 게임에서 그린다)
    const qa = new THREE.Vector3(), qb = new THREE.Vector3(), qq = new THREE.Quaternion();
    const aimH = (b, c, dir) => { if (!b || !c) return; b.getWorldPosition(qa); c.getWorldPosition(qb); const cur = qb.sub(qa).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()); b.parent.getWorldQuaternion(qq); b.quaternion.premultiply(qq.clone().invert().multiply(q).multiply(qq)); b.updateMatrixWorld(true); };
    for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1;
      aimH(bones[sd + 'Arm'], bones[sd + 'ForeArm'], new THREE.Vector3(0.18 * side, -1, 0.32)); aimH(bones[sd + 'ForeArm'], bones[sd + 'Hand'], new THREE.Vector3(-0.32 * side, 0.08, 1)); }  // 위팔은 몸 옆으로 내리고 아래팔만 앞으로 — 배 앞에서 받친다
  }
  model.rotation.y = Math.atan2(Math.cos(dirA), Math.sin(dirA));
  if (!crouch) model.position.set(0, hang != null ? -80 : relaxY, 0); model.updateMatrixWorld(true);
  if (hold) { const a = new THREE.Vector3(), b = new THREE.Vector3(); bones.LeftHand.getWorldPosition(a); bones.RightHand.getWorldPosition(b); a.add(b).multiplyScalar(0.5).project(cam); window.lastHold = [(a.x + 1) / 2 * RS, (1 - (a.y + 1) / 2) * RS]; }  // 두 손 가운데 (상자 자리)
  if (hang != null) { const a = new THREE.Vector3(), b = new THREE.Vector3(); bones.LeftHand.getWorldPosition(a); bones.RightHand.getWorldPosition(b); a.add(b).multiplyScalar(0.5).project(cam); window.lastHand = [(a.x + 1) / 2 * RS, (1 - (a.y + 1) / 2) * RS]; }
  if (clip === 'Death') { bones.Hips.getWorldPosition(hp); bones.Head.getWorldPosition(hd); model.position.set(-(hp.x + hd.x) / 2, 0, -(hp.z + hd.z) / 2); shadow.position.set(0, 1, 0); }
  renderSprite(modular && clip === 'Death' ? CY : 0, modular ? (clip === 'Death' || clip === 'Punch' || hang != null ? 1.6 : window.spritePadding || 1) : 1);
  return renderer.domElement.toDataURL('image/png');
};

// 두 사람 자세 (어깨에 메기 / 뒤에서 붙잡기): 같이 포즈를 잡고, 한쪽은 깊이만 남겨 서로 가린 채 따로 찍는다
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3(), _pq = new THREE.Quaternion();
const aimB = (b, c, dir) => { if (!b || !c) return; b.getWorldPosition(_pa); c.getWorldPosition(_pb); const cur = _pb.sub(_pa).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()); b.parent.getWorldQuaternion(_pq); b.quaternion.premultiply(_pq.clone().invert().multiply(q).multiply(_pq)); b.updateMatrixWorld(true); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const PZ = { cy: 34, cz: 18, gz: 78 };
const rotWB = (b, ang) => { if (!b) return; const pq = new THREE.Quaternion(); b.parent.getWorldQuaternion(pq); const qw = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), ang); b.quaternion.premultiply(pq.clone().invert().multiply(qw).multiply(pq)); b.updateMatrixWorld(true); };
const feetY = Bn => { let m = 1e9; for (const n of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) if (Bn[n]) { Bn[n].getWorldPosition(_pa); m = Math.min(m, _pa.y); } return m; };
// 웅크리기: 허벅지 앞으로·무릎 뒤로·발목, 상체 숙이기(sp), 그 뒤 발을 원래 높이에 다시 붙인다
const squat = (Bn, M, cr, sp) => { M.updateMatrixWorld(true); const f0 = feetY(Bn);
  for (const s of ['Left', 'Right']) { rotWB(Bn[s + 'UpLeg'], -CR.th * cr); rotWB(Bn[s + 'Leg'], CR.kn * cr); rotWB(Bn[s + 'Foot'], -CR.ft * cr); }
  if (sp) { rotWB(Bn.Spine, sp); rotWB(Bn.Spine1, sp * 0.4); }
  M.updateMatrixWorld(true); M.position.y += f0 - feetY(Bn); M.updateMatrixWorld(true); };
const KZ = { lean: 0.28 };
// 두 사람 자세 잡기 (렌더는 안 한다). 핵심 자세 사이는 renderPair 의 blend 로 뼈마다 보간해 중간 프레임을 만든다
function posePair(kind, clip, t) {
  grp.add(model); grp.rotation.y = 0; grp.updateMatrixWorld(true);
  mixer.stopAllAction(); const a1 = mixer.clipAction(clips[clip]); a1.reset(); a1.play(); mixer.setTime(t);
  bones.Hips.position.x = 0; bones.Hips.position.z = 0; model.rotation.set(0, 0, 0); model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  model2.visible = true; model2.rotation.set(0, 0, 0); model2.position.set(0, 0, 0); model2.quaternion.identity();
  mixer2.stopAllAction();
  const B = bones, Q = bones2;
  if (kind === 'carry' || kind === 'lift') {
    const lk = kind === 'lift' ? t : 0;  // lift: t = 1 (허리 숙여 안아 올림) · 2 (어깨에 얹으며 일어섬)
    if (lk) squat(B, model, lk === 1 ? 0.62 : 0.3, lk === 1 ? 0.55 : 0.2);
    const a2 = mixer2.clipAction(clips2.Idle); a2.reset(); a2.play(); mixer2.setTime(0); Q.Hips.position.x = 0; Q.Hips.position.z = 0;
    // 업힌 사람: 몸을 접어 상체는 등 뒤로, 다리는 가슴 앞으로 늘어뜨린다
    const th = Math.atan2(-0.42, -0.9) + (lk === 1 ? KZ.l1 || 0.75 : lk === 2 ? KZ.l2 || 0.3 : 0);
    model2.quaternion.setFromEuler(new THREE.Euler(.25,0,Math.PI*.47));
    model2.updateMatrixWorld(true);
    for (const sd of ['Left', 'Right']) {
      aimB(Q[sd + 'UpLeg'], Q[sd + 'Leg'], V3(sd === 'Left' ? 0.07 : -0.07, -0.86, 0.5)); aimB(Q[sd + 'Leg'], Q[sd + 'Foot'], V3(0, -0.92, -0.38));
      aimB(Q[sd + 'Arm'], Q[sd + 'ForeArm'], V3(sd === 'Left' ? 0.12 : -0.12, -1, -0.18)); aimB(Q[sd + 'ForeArm'], Q[sd + 'Hand'], V3(0, -1, -0.05));
    }
    aimB(Q.Neck, Q.Head, V3(0, -1, -0.25));
    // 업은 사람: 오른팔로 다리를 감싸 쥔다 (들어 올리는 중엔 두 팔을 앞으로 뻗어 허리를 감싼다)
    if (lk === 1) { aimB(B.RightArm, B.RightForeArm, V3(-0.2, -0.45, 0.87)); aimB(B.RightForeArm, B.RightHand, V3(0.55, -0.1, 0.8)); aimB(B.LeftArm, B.LeftForeArm, V3(0.2, -0.45, 0.87)); aimB(B.LeftForeArm, B.LeftHand, V3(-0.55, -0.1, 0.8)); }
    else aimB(B.RightArm, B.RightForeArm, V3(-0.05, -0.55, 0.84)), aimB(B.RightForeArm, B.RightHand, V3(0.62, 0.42, 0.35));
    if (lk === 2) { aimB(B.LeftArm, B.LeftForeArm, V3(0.25, -0.2, 0.9)); aimB(B.LeftForeArm, B.LeftHand, V3(-0.4, 0.5, 0.6)); }
    model.updateMatrixWorld(true); B.RightShoulder.getWorldPosition(_pa); B.RightArm.getWorldPosition(_pb);
    const tgt = V3((_pa.x + _pb.x) / 2, Math.max(_pa.y, _pb.y) + PZ.cy - (lk === 1 ? 26 : lk === 2 ? 8 : 0), (_pa.z + _pb.z) / 2 + PZ.cz + (lk === 1 ? 46 : lk === 2 ? 14 : 0));
    model2.updateMatrixWorld(true); Q.Hips.getWorldPosition(_pa); model2.position.add(tgt.sub(_pa));
  } else if (kind === 'stab' || kind === 'choke') {
    // 당하는 사람은 싸움 자세(Idle)가 아니라 평범하게 선 자세에서 시작한다: 걷기 중간 + 팔 내리고 다리 곧게 (주민 서기와 같은 자세)
    const k = t, a2 = mixer2.clipAction(clips2.Walk); a2.reset(); a2.play(); mixer2.setTime(0.25); Q.Hips.position.x = 0; Q.Hips.position.z = 0;
    model2.position.set(0, 0, PZ.gz - (k === 0 ? -8 : 0)); model2.updateMatrixWorld(true);
    for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1;
      aimB(Q[sd + 'Arm'], Q[sd + 'ForeArm'], V3(0.12 * side, -1, 0.04)); aimB(Q[sd + 'ForeArm'], Q[sd + 'Hand'], V3(0.04 * side, -1, 0.14));
      aimB(Q[sd + 'UpLeg'], Q[sd + 'Leg'], V3(0.07 * side, -1, 0.02)); aimB(Q[sd + 'Leg'], Q[sd + 'Foot'], V3(0.02 * side, -1, -0.04)); }
    model2.updateMatrixWorld(true); model2.position.y -= feetY(Q); model2.updateMatrixWorld(true);
    // 당하는 사람: 0 그대로 서 있음 · 1 몸이 뒤로 젖혀지고 팔이 들린다 · 2 무릎이 꺾이고 늘어진다 · 3 무릎 꿇듯 주저앉는다
    if (k === 0) { aimB(Q.Neck, Q.Head, V3(0.25, 1, 0.1)); }
    if (k === 1) { model2.quaternion.setFromAxisAngle(V3(1, 0, 0), -KZ.lean); model2.updateMatrixWorld(true);
      if (kind === 'choke') { aimB(Q.LeftArm, Q.LeftForeArm, V3(0.35, -0.55, 0.75)); aimB(Q.LeftForeArm, Q.LeftHand, V3(-0.55, 0.75, -0.35)); aimB(Q.RightArm, Q.RightForeArm, V3(-0.35, -0.55, 0.75)); aimB(Q.RightForeArm, Q.RightHand, V3(0.55, 0.75, -0.35)); }
      else { aimB(Q.LeftArm, Q.LeftForeArm, V3(0.35, -0.5, 0.78)); aimB(Q.LeftForeArm, Q.LeftHand, V3(-0.5, 0.8, -0.3)); aimB(Q.RightArm, Q.RightForeArm, V3(-0.7, -0.45, 0.2)); aimB(Q.RightForeArm, Q.RightHand, V3(-0.3, -0.2, -0.6)); }  // 칼: 한 손은 입을 막은 팔을 붙들고, 다른 손은 찔린 옆구리 쪽으로
      aimB(Q.Neck, Q.Head, V3(0, 1, -0.45)); }
    if (k >= 2) { squat(Q, model2, k === 2 ? 0.45 : 0.95, k === 2 ? 0.3 : 0.75);
      for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1; aimB(Q[sd + 'Arm'], Q[sd + 'ForeArm'], V3(0.12 * side, -1, k === 3 ? 0.35 : 0.1)); aimB(Q[sd + 'ForeArm'], Q[sd + 'Hand'], V3(0.05 * side, -1, k === 3 ? 0.3 : 0.05)); }
      aimB(Q.Neck, Q.Head, V3(0, k === 2 ? 0.2 : -0.3, 1)); }
    // 처치하는 사람
    if (k >= 2) squat(B, model, k === 2 ? 0.22 : 0.5, k === 2 ? 0.15 : 0.4);
    if (k === 0) {  // 다가서며 왼손을 입으로, 칼 쥔 오른손은 뒤로 (조르기는 두 팔을 벌려 뻗는다)
      aimB(B.Spine, B.Spine1, V3(0, 1, 0.22));
      aimB(B.LeftArm, B.LeftForeArm, V3(0.25, 0.15, 1)); aimB(B.LeftForeArm, B.LeftHand, V3(-0.3, 0.3, 0.9));
      if (kind === 'choke') { aimB(B.RightArm, B.RightForeArm, V3(-0.25, 0.15, 1)); aimB(B.RightForeArm, B.RightHand, V3(0.3, 0.3, 0.9)); }
      else { aimB(B.RightArm, B.RightForeArm, V3(-0.45, -0.3, -0.5)); aimB(B.RightForeArm, B.RightHand, V3(-0.1, 0.9, -0.2)); }
    } else {  // 1~3: 왼팔로 입·목을 감고, 칼은 옆구리로 찔러 넣었다가 뺀다 (조르기는 오른손이 왼 손목을 잡아 조인다)
      const lo = k === 3 ? -0.35 : k === 2 ? -0.15 : 0;
      aimB(B.LeftArm, B.LeftForeArm, V3(0.15, -0.05 + lo, 1)); aimB(B.LeftForeArm, B.LeftHand, V3(-1, 0.15 + lo * 0.5, 0.25));
      if (kind === 'choke') { aimB(B.RightArm, B.RightForeArm, V3(-0.2, -0.15 + lo, 1)); aimB(B.RightForeArm, B.RightHand, V3(0.85, 0.35 + lo * 0.5, 0.35)); }
      else if (k === 1) { aimB(B.RightArm, B.RightForeArm, V3(-0.12, -0.35, 1)); aimB(B.RightForeArm, B.RightHand, V3(0.15, -0.05, 1)); }
      else { aimB(B.RightArm, B.RightForeArm, V3(-0.2, -0.85, 0.35)); aimB(B.RightForeArm, B.RightHand, V3(-0.05, -0.7, 0.7)); }
      aimB(B.Spine, B.Spine1, V3(0, 1, 0.1 - lo * 0.3));
    }
  } else {
    const a2 = mixer2.clipAction(clips2[clip]); a2.reset(); a2.play(); mixer2.setTime(clip === 'Walk' ? (t + 0.37) % 1 : t); Q.Hips.position.x = 0; Q.Hips.position.z = 0;
    model2.quaternion.setFromAxisAngle(V3(1, 0, 0), -0.12); model2.position.set(0, 0, PZ.gz); model2.updateMatrixWorld(true);
    // 붙잡힌 사람: 목을 감은 팔을 두 손으로 붙들고 고개가 젖혀진다
    aimB(Q.LeftArm, Q.LeftForeArm, V3(0.35, -0.55, 0.75)); aimB(Q.LeftForeArm, Q.LeftHand, V3(-0.55, 0.75, -0.35));
    aimB(Q.RightArm, Q.RightForeArm, V3(-0.35, -0.55, 0.75)); aimB(Q.RightForeArm, Q.RightHand, V3(0.55, 0.75, -0.35));
    aimB(Q.Neck, Q.Head, V3(0, 1, -0.4));
    // 붙잡은 사람: 왼팔로 목을 감고 오른손은 칼을 목에 댄다
    aimB(B.LeftArm, B.LeftForeArm, V3(0.15, -0.05, 1)); aimB(B.LeftForeArm, B.LeftHand, V3(-1, 0.15, 0.25));
    aimB(B.RightArm, B.RightForeArm, V3(-0.15, -0.25, 1)); aimB(B.RightForeArm, B.RightHand, V3(0.7, 0.35, 0.6));
    aimB(B.Spine, B.Spine1, V3(0, 1, 0.12));
  }
}
const snapPose = () => { const o = { b: {}, m: [model.position.clone(), model.quaternion.clone(), model2.position.clone(), model2.quaternion.clone()] };
  for (const [k, Bn] of [['a', bones], ['b', bones2]]) for (const n in Bn) o.b[k + n] = [Bn[n].position.clone(), Bn[n].quaternion.clone()]; return o; };
const mixPose = (A, Bp, f) => { for (const [k, Bn] of [['a', bones], ['b', bones2]]) for (const n in Bn) { const x = A.b[k + n], y = Bp.b[k + n]; if (!x || !y) continue; Bn[n].position.copy(x[0]).lerp(y[0], f); Bn[n].quaternion.copy(x[1]).slerp(y[1], f); }
  model.position.copy(A.m[0]).lerp(Bp.m[0], f); model.quaternion.copy(A.m[1]).slerp(Bp.m[1], f); model2.position.copy(A.m[2]).lerp(Bp.m[2], f); model2.quaternion.copy(A.m[3]).slerp(Bp.m[3], f); model.updateMatrixWorld(true); model2.updateMatrixWorld(true); };
const renderPair = (kind, clip, t, dirA, part, blend) => {
  posePair(kind, clip, t);
  if (blend) { const A = snapPose(); posePair(kind, clip, blend.k1); const Bp = snapPose(); mixPose(A, Bp, blend.f); }
  grp.rotation.y = Math.atan2(Math.cos(dirA), Math.sin(dirA)); grp.updateMatrixWorld(true);
  const pm = i => partsOn[i].map(o => o.material), show = part === 'a' ? mats.concat(pm(0)) : mats2.concat(pm(1)), hide = part === 'a' ? mats2.concat(pm(1)) : mats.concat(pm(0));
  show.forEach(m => { m.colorWrite = true; }); hide.forEach(m => { m.colorWrite = false; });
  model.traverse(o => { if (o.isMesh) o.renderOrder = part === 'a' ? 0 : -1; }); model2.traverse(o => { if (o.isMesh) o.renderOrder = part === 'a' ? -1 : 0; });
  shadow.visible = part === 'a'; shadow.position.set(0, 1, 0);
  renderSprite(modular ? -120 : 0, modular ? 1.8 : 1);
  const url = renderer.domElement.toDataURL('image/png');
  mats.concat(mats2, partsOn[0].map(o => o.material), partsOn[1].map(o => o.material)).forEach(m => { m.colorWrite = true; }); model.traverse(o => { if (o.isMesh) o.renderOrder = 0; }); model2.traverse(o => { if (o.isMesh) o.renderOrder = 0; });
  scene.add(model); model2.visible = false; grp.rotation.y = 0; shadow.visible = true;
  return url;
};

// Continuous two-person handling: reach, gather, raise, settle on shoulder.
const renderHandling =(t,dirA,part)=>{
  const keys=[0,.34,.7,1];
  const pose=i=>{
    posePair(i===1||i===2?'lift':'carry','Idle',i===1?1:i===2?2:0);
    if(i===0){
      renderFrame('Walk',.25,0,0,undefined,false,{sway:0});grp.add(model);grp.rotation.y=0;
      mixer2.stopAllAction();const clip=mixer2.clipAction(clips2.Death);clip.reset();clip.play();mixer2.setTime(3.45);
      bones2.Hips.position.x=0;bones2.Hips.position.z=0;model2.position.set(0,0,0);model2.quaternion.identity();model2.visible=true;
    }
    grp.updateMatrixWorld(true);const dy=-feetY(bones);model.position.y+=dy;if(i!==0)model2.position.y+=dy;grp.updateMatrixWorld(true);
  };
  t=Math.max(0,Math.min(1,t));let i=0;while(i<2&&t>keys[i+1])i++;
  pose(i);const A=snapPose();pose(i+1);const B=snapPose();let f=(t-keys[i])/(keys[i+1]-keys[i]);f=f*f*(3-2*f);mixPose(A,B,f);
  grp.rotation.y=Math.atan2(Math.cos(dirA),Math.sin(dirA));grp.updateMatrixWorld(true);
  const pm=i=>partsOn[i].map(o=>o.material),show=part==='a'?mats.concat(pm(0)):mats2.concat(pm(1)),hide=part==='a'?mats2.concat(pm(1)):mats.concat(pm(0));
  show.forEach(m=>m.colorWrite=true);hide.forEach(m=>m.colorWrite=false);model.traverse(o=>{if(o.isMesh)o.renderOrder=part==='a'?0:-1;});model2.traverse(o=>{if(o.isMesh)o.renderOrder=part==='a'?-1:0;});
  shadow.visible=false;renderSprite(-40,2*(window.spritePadding||1));const url=renderer.domElement.toDataURL('image/png');
  mats.concat(mats2,pm(0),pm(1)).forEach(m=>m.colorWrite=true);model.traverse(o=>{if(o.isMesh)o.renderOrder=0;});model2.traverse(o=>{if(o.isMesh)o.renderOrder=0;});scene.add(model);model2.visible=false;grp.rotation.y=0;shadow.visible=true;return url;
};

// 대사창 얼굴(초상): 편하게 선 자세에서 머리·어깨만 가까이, 정면에서 살짝 비껴 원근 카메라로 찍는다 (키 색 → 게임에서 팔레트로 칠함)
const fcam = new THREE.PerspectiveCamera(20, 1, 1, 5000);
const renderFace = (side, size) => {
  size = size || 160; renderer.setSize(size, size);
  mixer.stopAllAction(); const a = mixer.clipAction(clips.Walk); a.reset(); a.play(); mixer.setTime(0.25);
  bones.Hips.position.x = 0; bones.Hips.position.z = 0; model.rotation.set(0, 0, 0); model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  for (const sd of ['Left', 'Right']) { const sg = sd === 'Left' ? 1 : -1; aimB(bones[sd + 'Arm'], bones[sd + 'ForeArm'], V3(0.12 * sg, -1, 0.02)); aimB(bones[sd + 'ForeArm'], bones[sd + 'Hand'], V3(0.04 * sg, -1, 0.12)); }
  aimB(bones.Spine, bones.Spine1, V3(0, 1, 0.02)); aimB(bones.Neck, bones.Head, V3(0, 1, 0.04));
  const h = new THREE.Vector3(); bones.Head.getWorldPosition(h); const top = new THREE.Vector3(); (bones.HeadTop_End || bones.Head).getWorldPosition(top);
  const hh = Math.max(20, top.y - h.y), c = h.clone().add(V3(0, hh * 0.15, 0)), d = hh * 6.4, sd = side || 0.42;
  fcam.position.set(c.x + Math.sin(sd) * d, c.y + hh * 0.6, c.z + Math.cos(sd) * d); fcam.lookAt(c.x, c.y - hh * 0.2, c.z); fcam.updateProjectionMatrix();
  shadow.visible = false; renderer.render(scene, fcam); shadow.visible = true;
  const url = renderer.domElement.toDataURL('image/png'); renderer.setSize(RS, RS); return url;
};
window.boneNames = () => Object.keys(bones);
// 동작 포즈: climb (배관·벽·전봇대 타기, 팔다리 번갈아) / vault (창문·난간 넘기: 짚기 → 몸 접어 넘기 → 착지)
const renderPose = (name, k, dirA) => {
  mixer.stopAllAction(); const act = mixer.clipAction(clips.Idle); act.reset(); act.play(); mixer.setTime(0);
  bones.Hips.position.x = 0; bones.Hips.position.z = 0;
  model.rotation.set(0, 0, 0); model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  const B = bones;
  const footY = () => { let m = 1e9; for (const n of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) if (B[n]) { B[n].getWorldPosition(_pa); m = Math.min(m, _pa.y); } return m; };
  const rotW = (b, ang) => { const pq = new THREE.Quaternion(); b.parent.getWorldQuaternion(pq); const qw = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), ang); b.quaternion.premultiply(pq.clone().invert().multiply(qw).multiply(pq)); b.updateMatrixWorld(true); };
  let lift = 0;
  if (name === 'climb') {
    const s = Math.sin(k / 4 * Math.PI * 2);
    rotW(B.Spine, 0.18);
    for (const [sd, sg] of [['Left', 1], ['Right', -1]]) {
      const e = s * sg, side = sd === 'Left' ? 1 : -1;
      const shoulder = new THREE.Vector3(); B[sd+'Arm'].getWorldPosition(shoulder);
      const target = V3(side*9, shoulder.y+62+e*35, shoulder.z+86);
      const upper=B[sd+'Arm'], elbow=B[sd+'ForeArm'], hand=B[sd+'Hand'];
      const ep=new THREE.Vector3(),hp=new THREE.Vector3();elbow.getWorldPosition(ep);hand.getWorldPosition(hp);
      const len1=ep.distanceTo(shoulder),len2=hp.distanceTo(ep),axis=target.clone().sub(shoulder),distance=Math.min(axis.length(),len1+len2-.01);axis.normalize();
      const along=(len1*len1-len2*len2+distance*distance)/(2*distance),bend=Math.sqrt(Math.max(0,len1*len1-along*along));
      const outward=V3(side,0,0).addScaledVector(axis,-side*axis.x).normalize();
      const elbowTarget=shoulder.clone().addScaledVector(axis,along).addScaledVector(outward,bend);
      aimB(upper,elbow,elbowTarget.sub(shoulder));elbow.getWorldPosition(ep);aimB(elbow,hand,target.sub(ep));
      aimB(B[sd + 'UpLeg'], B[sd + 'Leg'], V3(0.08 * side, -0.75 + 0.75 * Math.max(0, -e), 0.6));
      aimB(B[sd + 'Leg'], B[sd + 'Foot'], V3(0, -1, -0.1));
    }
    aimB(B.Neck, B.Head, V3(0, 1, 0.25));
  } else if (name === 'lean') {  // 벽에 등을 붙이고 선 자세: 몸을 젖히고 두 손은 벽을 짚고 한쪽 발바닥을 벽에 댄다
    rotW(B.Spine, -0.14); rotW(B.Spine1, -0.06);
    for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1;
      aimB(B[sd + 'Arm'], B[sd + 'ForeArm'], V3(0.1 * side, -1, -0.22)); aimB(B[sd + 'ForeArm'], B[sd + 'Hand'], V3(0.05 * side, -1, -0.3)); }
    aimB(B.RightUpLeg, B.RightLeg, V3(-0.08, -0.8, 0.45)); aimB(B.RightLeg, B.RightFoot, V3(0, -0.75, -0.66));
    aimB(B.LeftUpLeg, B.LeftLeg, V3(0.1, -1, 0.04)); aimB(B.LeftLeg, B.LeftFoot, V3(0, -1, -0.02));
    aimB(B.Neck, B.Head, V3(k ? 0.45 : 0, 1, k ? 0.1 : 0.05));
  } else if (name === 'hug' || name === 'hugStep') {  // 웅크려 벽에 바짝 붙음: 등·엉덩이를 벽에, 무릎을 굽히고 두 손바닥으로 벽을 짚는다. hug k: 0 정면 · 1 왼쪽 살핌 · 2 오른쪽 살핌 / hugStep k: 옆걸음 4장
    const SPR = name === 'hugStep' ? [[0.16, -0.16, 0, 0], [0.42, -0.16, 0.18, 0], [0.28, -0.34, 0, 0.12], [0.16, -0.08, 0, 0]][k] : [0.2, -0.2, 0, 0];
    aimB(B.LeftUpLeg, B.LeftLeg, V3(SPR[0], -1, SPR[2])); aimB(B.LeftLeg, B.LeftFoot, V3(0, -1, 0));
    aimB(B.RightUpLeg, B.RightLeg, V3(SPR[1], -1, SPR[3])); aimB(B.RightLeg, B.RightFoot, V3(0, -1, 0));
    aimB(B.Spine, B.Spine1, V3(0, 1, -0.06));
    const cr = 0.8; for (const sd of ['Left', 'Right']) { rotW(B[sd + 'UpLeg'], -CR.th * cr); rotW(B[sd + 'Leg'], CR.kn * cr); rotW(B[sd + 'Foot'], -CR.ft * cr); }
    rotW(B.Spine, -0.22); rotW(B.Spine1, 0.05);  // 상체는 세워 벽에 붙인다
    for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1;
      aimB(B[sd + 'Arm'], B[sd + 'ForeArm'], V3(0.2 * side, -1, -0.1)); aimB(B[sd + 'ForeArm'], B[sd + 'Hand'], V3(0.14 * side, -1, -0.22)); }
    aimB(B.Neck, B.Head, V3(0, 1, 0.08));
    const yaw = name === 'hug' ? [0, 0.95, -0.95][k] : 0;
    if (yaw && B.Head) { const pq = new THREE.Quaternion(); B.Head.parent.getWorldQuaternion(pq); const qw = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw); B.Head.quaternion.premultiply(pq.clone().invert().multiply(qw).multiply(pq)); B.Head.updateMatrixWorld(true); }
  } else if (name === 'stoop') {  // 바닥에 누운 사람을 잡으려 허리·무릎을 굽히고 두 팔을 아래로 뻗는다
    for (const sd of ['Left', 'Right']) { rotW(B[sd + 'UpLeg'], -CR.th * 0.7); rotW(B[sd + 'Leg'], CR.kn * 0.7); rotW(B[sd + 'Foot'], -CR.ft * 0.7); }
    rotW(B.Spine, 0.75); rotW(B.Spine1, 0.3);
    for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1; aimB(B[sd + 'Arm'], B[sd + 'ForeArm'], V3(0.18 * side, -0.85, 0.5)); aimB(B[sd + 'ForeArm'], B[sd + 'Hand'], V3(0.05 * side, -0.8, 0.6)); }
    aimB(B.Neck, B.Head, V3(0, 0.3, 1));
  } else if (name === 'vault') {
    if (k === 1) {  // 몸을 접어 넘는 순간: 허벅지를 가슴으로, 두 손은 창턱을 짚는다
      aimB(B.Spine, B.Spine1, V3(0, 0.55, 0.85)); aimB(B.Spine1, B.Spine2, V3(0, 0.45, 0.9));
      for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1;
        aimB(B[sd + 'UpLeg'], B[sd + 'Leg'], V3(0.15 * side, 0.1, 1)); aimB(B[sd + 'Leg'], B[sd + 'Foot'], V3(0, -0.85, -0.5));
        aimB(B[sd + 'Arm'], B[sd + 'ForeArm'], V3(0.2 * side, -0.7, 0.7)); aimB(B[sd + 'ForeArm'], B[sd + 'Hand'], V3(0, -1, 0.15)); }
      lift = 95;
    } else {  // 0: 짚으려 웅크림 · 2: 착지
      const cr = k === 0 ? 0.45 : 0.65;
      for (const sd of ['Left', 'Right']) { rotW(B[sd + 'UpLeg'], -CR.th * cr); rotW(B[sd + 'Leg'], CR.kn * cr); rotW(B[sd + 'Foot'], -CR.ft * cr); }
      rotW(B.Spine, CR.sp * cr * 1.2); rotW(B.Spine1, CR.sp1 * cr);
      for (const sd of ['Left', 'Right']) { const side = sd === 'Left' ? 1 : -1;
        if (k === 0) { aimB(B[sd + 'Arm'], B[sd + 'ForeArm'], V3(0.15 * side, -0.35, 0.95)); aimB(B[sd + 'ForeArm'], B[sd + 'Hand'], V3(0, -0.6, 0.8)); }
        else { aimB(B[sd + 'Arm'], B[sd + 'ForeArm'], V3(0.6 * side, -0.5, 0.5)); aimB(B[sd + 'ForeArm'], B[sd + 'Hand'], V3(0.4 * side, -0.6, 0.6)); } }
    }
  }
  model.updateMatrixWorld(true); const fy = footY();
  model.position.y = -fy + lift - (name === 'climb' ? 200 : 0); model.updateMatrixWorld(true);  // 타기: 팔이 잘리지 않게 200 내려 찍는다 (게임에서 14px 올려 그린다)
  model.rotation.y = Math.atan2(Math.cos(dirA), Math.sin(dirA)); model.updateMatrixWorld(true);
  shadow.visible = name === 'vault' && k !== 1; shadow.position.set(0, 1, 0);
  renderSprite(modular && name === 'climb' ? CY - 100 : 0, modular ? (name === 'climb' ? 1.25 : ['vault','stoop'].includes(name) ? 1.6 : 1) : 1); shadow.visible = true;
  return renderer.domElement.toDataURL('image/png');
};

// Opening covers and latches: an actual two-hand grip, lift/pull, release.
const renderAccessPose =(kind,t,dirA)=>{
  renderFrame('Walk',.25,0,0,undefined,false,{sway:0});const A=snapPose();
  const low=kind==='low',bin=kind==='bin',pull=Math.max(0,Math.min(1,(t-.28)/.34));
  if(low)renderFrame('Idle',0,0,.55);else renderFrame('Walk',.25,0,0,undefined,false,{sway:0});
  model.rotation.set(0,0,0);model.updateMatrixWorld(true);model.position.y-=feetY(bones);model.updateMatrixWorld(true);
  for(const [sd,side]of [['Left',1],['Right',-1]]){
    const arm=bones[sd+'Arm'],elbow=bones[sd+'ForeArm'],hand=bones[sd+'Hand'],sp=new THREE.Vector3(),ep=new THREE.Vector3(),hp=new THREE.Vector3();arm.getWorldPosition(sp);elbow.getWorldPosition(ep);hand.getWorldPosition(hp);
    const target=V3(side*18,sp.y+(low?-100+pull*35:bin?(sd==='Left'?-55:50+pull*70):-10+pull*16),sp.z+(bin?100-pull*14:85-pull*28)),l1=ep.distanceTo(sp),l2=hp.distanceTo(ep),axis=target.clone().sub(sp),d=Math.min(axis.length(),l1+l2-.01);axis.normalize();
    const along=(l1*l1-l2*l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along)),out=V3(side,0,0).addScaledVector(axis,-side*axis.x).normalize();
    aimB(arm,elbow,sp.clone().addScaledVector(axis,along).addScaledVector(out,bend).sub(sp));elbow.getWorldPosition(ep);aimB(elbow,hand,target.sub(ep));
  }
  const B=snapPose(),weight=Math.min(1,t/.22,Math.max(0,(1-t)/.24));mixPose(A,B,weight*weight*(3-2*weight));
  model.updateMatrixWorld(true);model.position.y-=feetY(bones);model.rotation.y=Math.atan2(Math.cos(dirA),Math.sin(dirA));model.updateMatrixWorld(true);
  shadow.visible=false;renderSprite(0,1.8);shadow.visible=true;return renderer.domElement.toDataURL('image/png');
};
// Foot-normalized, bone-interpolated entry poses; reverse the same frames on exit.
const renderHidePose = (kind, t, dirA) => {
  if(kind==='ledgePull'){
    renderFrame('Idle',0,dirA,0,0);const A=snapPose();
    // One hand keeps the edge; the other reaches above, pulls down and releases.
    model.rotation.set(0,0,0);model.updateMatrixWorld(true);
    const pull=Math.max(0,Math.min(1,(t-.18)/.32));
    aimB(bones.RightArm,bones.RightForeArm,V3(-.2,.8-pull*1.5,.65));
    aimB(bones.RightForeArm,bones.RightHand,V3(.12,.65-pull*1.3,.8));
    model.rotation.y=Math.atan2(Math.cos(dirA),Math.sin(dirA));model.updateMatrixWorld(true);const B=snapPose();
    const weight=Math.min(1,t/.16,Math.max(0,(1-t)/.32));mixPose(A,B,weight);
    shadow.visible=false;renderSprite(0,1.6);shadow.visible=true;return renderer.domElement.toDataURL('image/png');
  }
  if(kind==='vault'){
    // Step over a bin rim with one supporting leg. Opening the lid uses a
    // separate planted-foot pose; no vault/jump animation is reused here.
    renderFrame('Walk',.25,0,0,undefined,false,{sway:0});const A=snapPose();
    renderFrame('Idle',0,0,.6);model.rotation.set(0,0,0);model.updateMatrixWorld(true);
    const raise=Math.sin(Math.PI*Math.min(1,t/.7));
    aimB(bones.LeftUpLeg,bones.LeftLeg,V3(.05,-1,.65*raise));aimB(bones.LeftLeg,bones.LeftFoot,V3(0,-1,-.4*raise));
    for(const [sd,side]of [['Left',1],['Right',-1]]){aimB(bones[sd+'Arm'],bones[sd+'ForeArm'],V3(.2*side,-.25,.8));aimB(bones[sd+'ForeArm'],bones[sd+'Hand'],V3(-.15*side,.15,.8));}
    const B=snapPose(),u=Math.min(1,t/.4);mixPose(A,B,u*u*(3-2*u));model.updateMatrixWorld(true);model.position.y-=feetY(bones);model.rotation.y=Math.atan2(Math.cos(dirA),Math.sin(dirA));model.updateMatrixWorld(true);
    model2.visible=false;shadow.visible=false;renderSprite(0,1.6);shadow.visible=true;return renderer.domElement.toDataURL('image/png');
  }
  const keys=kind==='duck'?[0,1]:['drop','leap'].includes(kind)?[0,.38,.78,1]:[0,.23,.57,1];
  const pose=i=>{
    if(kind==='pass'){if(i===0||i===3)renderFrame('Walk',.25,dirA,0,undefined,false,{sway:0});else renderPose('vault',i-1,dirA);return;}
    if(['drop','leap'].includes(kind)){if(i===0){if(kind==='drop')renderFrame('Idle',0,dirA,0,0);else renderFrame('Walk',.25,dirA,0,undefined,false,{sway:0});}else if(i===3)renderFrame('Walk',.25,dirA,0,undefined,false,{sway:0});else renderPose('vault',i===1?1:2,dirA);return;}
    if(i===0)renderFrame('Walk',.25,dirA,0,undefined,false,{sway:0});
    else if(kind==='duck'||i===3)renderFrame('Idle',0,dirA,.75);
    else renderPose('vault',i-1,dirA);
  };
  t=Math.max(0,Math.min(1,t));let k=0;while(k<keys.length-2&&t>keys[k+1])k++;
  pose(k);const A=snapPose();pose(k+1);const B=snapPose();
  let f=(t-keys[k])/(keys[k+1]-keys[k]);f=f*f*(3-2*f);mixPose(A,B,f);
  model.updateMatrixWorld(true);model.position.y-=feetY(bones);model.updateMatrixWorld(true);
  model2.visible=false;shadow.visible=false;renderSprite(0,1.6);shadow.visible=true;
  return renderer.domElement.toDataURL('image/png');
};


return {handling(t,a){renderHandling(t,a,'a');grp.add(model);grp.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));model2.visible=true;},offsetPartner(v){const yaw=grp.rotation.y;model2.position.add(v.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-yaw));},reach(side,target,weight=1){if(weight<.001)return 0;root.updateMatrixWorld(true);const B=bones,s=new THREE.Vector3(),e=new THREE.Vector3(),w=new THREE.Vector3();B[side+'Arm'].getWorldPosition(s);B[side+'ForeArm'].getWorldPosition(e);B[side+'Hand'].getWorldPosition(w);target=w.clone().lerp(target,weight);const initialHip=B.Spine.quaternion.clone(),direction=target.clone().sub(s);direction.y=0;direction.normalize();const full=e.distanceTo(s)+w.distanceTo(e);for(const lean of [.0,.15,.3,.45,.6,.75,.9,1.05,1.2,1.35]){B.Spine.quaternion.copy(initialHip);B.Spine.updateMatrixWorld(true);aimB(B.Spine,B.Spine1,new THREE.Vector3(direction.x*Math.sin(lean*weight),Math.cos(lean*weight),direction.z*Math.sin(lean*weight)));root.updateMatrixWorld(true);B[side+'Arm'].getWorldPosition(s);B[side+'ForeArm'].getWorldPosition(e);B[side+'Hand'].getWorldPosition(w);if(s.distanceTo(target)<full*.99)break;}const u=e.distanceTo(s),v=w.distanceTo(e),dir=target.clone().sub(s),d=Math.min(dir.length(),(u+v)*.995);dir.normalize();const pole=new THREE.Vector3(side==='Left'?1:-1,-.45,.1);pole.addScaledVector(dir,-pole.dot(dir)).normalize();const a=(u*u-v*v+d*d)/(2*Math.max(.0001,d)),h=Math.sqrt(Math.max(0,u*u-a*a)),elbow=s.clone().addScaledVector(dir,a).addScaledVector(pole,h);aimB(B[side+'Arm'],B[side+'ForeArm'],elbow.sub(s).normalize());B[side+'ForeArm'].getWorldPosition(e);aimB(B[side+'ForeArm'],B[side+'Hand'],target.clone().sub(e).normalize());root.updateMatrixWorld(true);B[side+'Hand'].getWorldPosition(w);return w.distanceTo(target);},snapshot:snapPose,mix:mixPose,pair(kind,clip,t,a){if(clip==='Walk'&&(kind==='carry'||kind==='grab')){posePair(kind,clip,t);grp.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));model2.visible=true;return;}const k=Math.min(2,Math.floor(t));posePair(kind,clip,k);const A=snapPose();posePair(kind,clip,k+1);const B=snapPose();mixPose(A,B,t-k);grp.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));model2.visible=true;},root,model,get partner(){return model2},setPrimary(a){model.removeFromParent();({model,mixer,bones,mats,clips}=a);root.add(model);},setPartner(b){model2.removeFromParent();({model:model2,mixer:mixer2,bones:bones2,mats:mats2,clips:clips2}=b);grp.add(model2);},renderFrame,renderPair,renderHandling,renderFace,renderPose,renderAccessPose,renderHidePose,reset(){root.add(model);grp.rotation.set(0,0,0);grp.position.set(0,0,0);root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);root.updateMatrixWorld(true);model2.visible=false;}};
}
