// ---------------------------------------------------------------- 자유 모드 타격감: 주먹·칼·암살·총도 차 충돌만큼 시원하게
// 한 번 맞힐 때마다: 아주 짧은 멈칫(히트스톱) · 맞은 쪽으로 화면이 툭 밀리는 반동 · 살짝 당겨지는 줌 · 충격 파편 · 겹친 소리.
// 쓰러뜨리는 마지막 한 방은 더 세게: 느린 화면 0.2초 · 몸이 뒤로 밀려 쓰러짐 · 흙먼지 · 번쩍임.
// power: 0.6 가벼운 주먹 · 1 칼/총 · 1.4 무거운 주먹 · 1.8 암살·환경 처치 · 2.2 폭발
function hitJuice(o, a, power = 1, finish = false, push = true) {
  if (!STAGE.cityLife || !o) return; const p = power * (finish ? 1.35 : 1);
  S.hitStop = Math.max(S.hitStop || 0, Math.min(0.16, 0.035 + 0.045 * p));
  S.shakeT = Math.max(S.shakeT || 0, Math.min(0.5, 0.08 + 0.12 * p));
  S.kick = { x: Math.cos(a) * 7 * p, y: Math.sin(a) * 7 * p, t: S.t };   // 맞은 방향으로 화면이 밀렸다 돌아온다
  S.zoomKick = Math.max(S.zoomKick || 0, 0.018 * p);
  const at = { x: o.x, y: o.y - 18, fl: flOf(o), z: o.z || 0 };
  spawnEffect('impact', at, { scale: Math.min(1.3, 0.45 + 0.28 * p) });
  if (p >= 1.2) spawnEffect('strike', at, { scale: Math.min(1.2, 0.4 + 0.25 * p) });
  play('thud', Math.min(1, 0.45 + 0.2 * p), finish ? 0.7 : 0.95);
  if (finish) {
    slowMo(0.12 + 0.06 * Math.min(2, p)); S.flash = Math.max(S.flash || 0, 0.06 + 0.03 * p);
    spawnEffect('dust', { x: o.x, y: o.y + 4, fl: flOf(o), z: 0 }, { scale: 0.7 });
    if (p >= 1.6) { spawnEffect('shock', { x: o.x, y: o.y - 8, fl: flOf(o), z: 0 }, { scale: 0.6 }); play('metal', 0.25, 0.6); }
    // 마지막 한 방에 몸이 뒤로 밀려난다 (벽 앞에서는 멈춘다 · 끌어들인 암살처럼 몸을 둘 자리가 정해진 처치는 밀지 않는다)
    if (push) { const kb = 10 + 8 * p; for (let k = kb; k > 0; k -= 4) { const nx = o.x + Math.cos(a) * k, ny = o.y + Math.sin(a) * k; if (!solidAt(Math.floor(nx / TILE), Math.floor(ny / TILE))) { o.x = nx; o.y = ny; break; } } }
  }
}
// 화면 반동은 0.18초에 걸쳐 되돌아온다 (render/icons.js worldTransform 이 읽는다)
function juiceOffset() {
  const K = S.kick; if (!K) return [0, 0, 0]; const f = 1 - (S.t - K.t) / 0.18; if (f <= 0) { S.kick = null; S.zoomKick = 0; return [0, 0, 0]; }
  return [K.x * f * f, K.y * f * f, (S.zoomKick || 0) * f];
}
