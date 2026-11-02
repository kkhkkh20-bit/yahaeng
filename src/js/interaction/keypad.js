function openKeypad(d) {
  const el = document.getElementById('keypad'); if (!el) { if (hasK('code')) { setDoor(d, false); d.group.forEach(t => t.keyLock = false); } return; }
  clearPlayerInput();closeEnvPicker();S.keypad = { d, buf: '', bad: 0 }; el.hidden = false;document.body.classList.add('keypadopen');document.getElementById('kpStatus').textContent='';el.focus({preventScroll:true}); S.player.vx = 0; S.player.vy = 0; input.aiming = null;
  document.getElementById('kpHint').textContent = hasK('code') ? '확인한 비밀번호: ' + STAGE.code : '번호 미확인';
  kpShow(); play('click', 0.3);
}
function kpShow() { const k = S.keypad; if (!k) return; const n = (STAGE.code || '0000').length; document.getElementById('kpDisp').textContent = Array.from({ length: n }, (_, i) => k.buf[i] || '·').join(' '); }
function closeKeypad() { const el = document.getElementById('keypad'); if (el) el.hidden = true; document.body.classList.remove('keypadopen');if(el?.contains(document.activeElement))canvas.focus({preventScroll:true});if (S) S.keypad = null; }
// 들킬 듯할 때 짧게 똑딱 — 알아채는 정도가 오를수록 높고 빠르게
// 시체가 자경대원 눈에 띌 수 있는 자리인가 (누가 그쪽을 보면 보인다)
function updateCorpseRisk(dt) {
  if ((S.crT = (S.crT || 0) - dt) > 0) return; S.crT = 0.3;
  for (const c of S.corpses) {
    c.risk = false; if (c.stashed || c.carried || c.discovered || c.hidden || c.accident) continue;
    for (const g of S.guards) { if (g.state === 'DEAD' || g.state === 'CAPTIVE' || g.climb || flOf(g) !== flOf(c) || (g.z || 0) !== (c.z || 0) || dist(g.x, g.y, c.x, c.y) > 520) continue;
      const gg = Object.create(g); gg.a = Math.atan2(c.y - g.y, c.x - g.x); if (canSee(gg, c.x, c.y, c.light, false, false, c.z || 0, flOf(c)) > 0) { c.risk = true; break; } }
  }
}
function kpBeep(ok) { if (!AC || muted) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = ok ? 'sine' : 'square'; o.frequency.value = ok ? 1320 : 220; g.gain.setValueAtTime(0.08, t); g.gain.linearRampToValueAtTime(0, t + (ok ? 0.12 : 0.35)); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4); }
function kpPress(v) {
  const k = S && S.keypad; if (!k || k.unlocking) return; const n = (STAGE.code || '0000').length;
  const status=document.getElementById('kpStatus');if(/^[0-9]$/.test(v)){status.textContent='';status.dataset.state='';}
  if (v === 'x') { closeKeypad(); return; }
  if (v === '<') { k.buf = k.buf.slice(0, -1); kpShow(); play('click', 0.15); return; }
  if (v === 'ok' || (v.length === 1 && k.buf.length + 1 === n && (k.buf += v))) {
    if (v !== 'ok' && v.length === 1) kpShow();
    if (k.buf.length < n) return;
    if (k.buf === STAGE.code) {
      k.unlocking = true;status.textContent='잠금 해제';status.dataset.state='good';
      if (!hasK('code')) { S.player.keys.code = true; S.learned.push('비밀번호 ' + STAGE.code + ' · 직접 입력해 확인'); }  // 어디서 봤든 맞는 비번을 넣었으면 알아낸 것으로 친다
      const d = k.d; kpBeep(true); after(0.26, () => { d.group.forEach(t => t.keyLock = false); setDoor(d, false); S.stats.keyDoors = (S.stats.keyDoors || 0) + 1; play('metal', 0.4); toast('비밀번호 일치 · 문이 열렸다', 1.8, 'good'); closeKeypad(); });
    } else {
      kpBeep(false); k.bad++;status.textContent=k.bad>=2?'불일치 · 경고음 증가':'번호 불일치';status.dataset.state='bad'; noise(k.d.x, k.d.y, 70 + k.bad * 30, 'beep', k.d.fl || 0);
      const el = document.getElementById('kpDisp'); el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
      toast(k.bad >= 2 ? '비밀번호 불일치 · 경고음이 커진다' : '비밀번호가 틀렸다', 1.4, 'warn'); k.buf = ''; setTimeout(kpShow, 350);
    }
    return;
  }
  if (/^[0-9]$/.test(v) && k.buf.length < n) { k.buf += v; play('click', 0.2); kpShow(); }
}
function doorAct(dr) {
  const P = S.player;
  if (dr.gate && dr.locked) {
    const dx = P.x - dr.x, dy = P.y - dr.y, ok = dr.gate === 'n' ? dy < 0 : dr.gate === 's' ? dy > 0 : dr.gate === 'w' ? dx < 0 : dx > 0;
    return ok ? { k: 'door', d: dr, label: '빗장 풀기' } : { k: 'keymsg', d: dr, label: '반대편에서 빗장 해제 필요' };
  }
  if (dr.keyLock === 'code' && dr.locked) return { k: 'keypad', d: dr, label: '비밀번호 입력' };
  if (dr.keyLock && dr.locked && !hasK(dr.keyLock) && P.picks > 0) return { k: 'pick', d: dr, o: { kind: 'door', d: dr, x: dr.x, y: dr.y }, label: `락픽으로 열기 · 남은 락픽 ${P.picks}개` };
  return dr.keyLock && dr.locked ? { k: hasK(dr.keyLock) ? 'door' : 'keymsg', d: dr, label: hasK(dr.keyLock) ? withJosa(keyName(dr.keyLock), '으로/로') + ' 열기' : keyName(dr.keyLock) + ' 필요 · 락픽 없음' } : { k: 'door', d: dr, label: dr.locked ? '문 열기' : '문 닫기' };
}
// 암살하려고 다가가는 중에는 Space가 문·비번·조명·두꺼비집·쪽지 같은 다른 행동을 하지 않는다 (그 행동은 Z로 넘긴다)
