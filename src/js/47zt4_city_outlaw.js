// ---------------------------------------------------------------- 자유 모드 무법: 돈 뺏기 · 시비꾼 · 동네 비우기 · 지구대 털기
// 무엇이든 할 수 있다. 대신 본 사람이 있으면 신고하고, 동네가 기억한다.
//  · 돈 뺏기: 행인 곁에서 [돈 내놔]. 무기를 들었으면 거의 다 내준다. 맨손이면 겁 많은 사람만 내주고, 덩치는 덤빈다, 나머지는 소리치며 도망.
//    털린 사람은 15초 뒤 신고한다(그 전에 기절시키면 못 한다). 옆에서 본 사람은 바로 신고.
//  · 쓰러진 행인(기절·죽음) 주머니 뒤지기: 차림새만큼 들어 있다 (직장인·데이트 차림이 두둑하다)
//  · 시비꾼: 가끔 행인 하나가 다가와 시비를 건다. 때려도 본 사람들은 신고하지 않는다(먼저 건 쪽을 봤다).
//    거의 쓰러질 만큼 맞으면 빈다 → [용서해 준다] 또는 [지갑 턴다]
//  · 동네 비우기: 한 동네 행인을 거의 다 쓰러뜨리면 그 동네가 텅 빈다 (속보 · 수배 ★4 이상)
//  · 지구대 털기: 지구대 1층 증거물 금고(압수 현금)와 무기 보관함(탄약·수류탄·조끼). 안엔 경찰관이 근무한다. 털면 경보가 울린다.
// 스토리 모드에는 아무것도 하지 않는다 (STAGE.cityLife 에서만).
const OL_LINES = {
  rudeOpen: ['뭘 꼬나봐요? 아는 사이예요?', '어깨 쳤잖아요. 사과 안 해요?', '길 한가운데 서 있지 말고 좀 비켜요.', '옷 꼴이 그게 뭐야. 밤에 사람 무섭게.', '여기 우리 동네거든요. 어슬렁거리지 마요.', '방금 저 찍었죠? 폰 내놔 봐요.'],
  rudeMore: ['왜, 한 대 치게? 쳐 봐요, 경찰 부르게.', '말을 못 해요? 귀가 없나.', '이런 사람들 때문에 동네 분위기 버려.', '얼굴 기억해 둘게요. 다음엔 안 넘어가.', '꼴에 째려보기는.'],
  rudeLeave: ['쳇, 상대할 가치도 없네.', '재수 없게 진짜.', '다음에 또 보면 그땐 안 넘어가요.'],
  beg: ['잠, 잠깐만요! 제가 잘못했어요!', '알았어요, 그만! 사과할게요!', '술김에 그랬어요. 한 번만 봐주세요.', '미안합니다, 진짜 미안합니다…'],
  forgive: ['…감사합니다. 다신 안 그럴게요.', '네, 네! 조심히 가세요!', '평생 반성하겠습니다…'],
  giveArmed: ['가, 가져가세요! 이게 다예요!', '해치지 마세요… 지갑 여기요.', '카드는 말고 현금만 가져가세요…'],
  giveTimid: ['아, 알았어요… 이거면 돼요?', '드릴게요, 때리지만 마세요.', '오늘 받은 일당이에요… 다 가져가요.'],
  fight: ['미쳤나, 이게? 덤벼 봐.', '내 돈을 왜 줘? 한번 해 보자.', '사람 잘못 골랐어.'],
  scream: ['강도야! 누가 경찰 좀 불러요!', '도와주세요! 돈 뺏어요!', '저 사람 강도예요!'],
  cheer: ['잘했다! 저 사람 원래 저래요.', '속이 다 시원하네.', '맨날 시비 걸더니 꼴좋다.'] };
const olPick = (L, n) => L[((n | 0) % L.length + L.length) % L.length];
const olArmed = () => typeof wpnOn === 'function' && wpnOn();
const olGround = g => !flOf(g) && !(g.z > 0);
// 지갑 크기: 차림새 (47zt3 옷) 따라
function olWealth(g) {
  if (!g) return 5; if (g.olCash != null) return g.olCash;
  const st = typeof outfitStyleOf === 'function' && typeof civSilhouette === 'function' ? outfitStyleOf(g, civSilhouette(g)) : '';
  const R = { office: [15, 45], date: [10, 35], elder: [5, 25], outdoor: [5, 20], casual: [4, 18], street: [3, 15], delivery: [3, 12], student: [1, 6] }[st] || [4, 16];
  return (g.olCash = R[0] + Math.floor(Math.random() * (R[1] - R[0] + 1)));
}
// 본 사람 (털린 당사자는 빼고 — 당사자는 따로 늦게 신고한다)
function olSeen(x, y, r, except) {
  if (typeof repWitnessMul === 'function') r *= repWitnessMul(x, y);
  return S.guards.some(g => g !== except && (g.civ || g.police) && g.state !== 'DEAD' && !g.off && !g.child && !g.rude && flOf(g) === flOf(S.player) && dist(g.x, g.y, x, y) < r && los(g.x, g.y, x, y) && (g.state === 'PANIC' || Math.abs(angDiff(g.a, Math.atan2(y - g.y, x - g.x))) < 1.6));
}
function olHold(g) { if (!g.routeQ) g.routeQ = g.route; g.route = [{ x: g.x, y: g.y, pause: 999 }]; g.ri = 0; g.path = null; g.moving = false; }
function olFree(g) { if (g.routeQ) { g.route = g.routeQ; g.routeQ = null; g.ri = 0; g.path = null; } }
function olFace(g) { const P = S.player; g.a = Math.atan2(P.y - g.y, P.x - g.x); g.want = g.a; }
function olPose(pose, dur, face) { const P = S.player; startTrav({ pts: [{ x: P.x, y: P.y, f: 0 }, { x: P.x, y: P.y, f: 1 }], dur, phases: [{ to: 1, pose }], face: face ?? P.a }); }
function olCash(n, what) { S.cash = (S.cash || 0) + n; if (typeof fstat === 'function') fstat('earned', n); play('loot', 0.6); if (typeof hudCache !== 'undefined') hudCache.objH = null; toast(`${what} · +${n}만`, 1.6, 'good'); }

// ---- 돈 뺏기
function olMugTarget() {
  const P = S.player; if (P.car || P.z || P.hide || P.booth || P.carrying || P.trav || S.shopOpen) return null; const pf = flOf(P);
  let best = null, bd = 46;
  for (const g of S.guards) { if (!g.civ || g.off || g.child || g.dog || g.police || g.staff || g.robbed || !npcAlive(g) || g.state === 'CAPTIVE' || g.rideIn || flOf(g) !== pf) continue;
    if (g.evt && !g.rude || g.fist) continue; if (g.rude && !g.beg) continue;   // 시비꾼은 빌 때만 (그 전엔 주먹으로 말한다)
    const d = dist(g.x, g.y, P.x, P.y); if (d >= bd || Math.abs(angDiff(P.a, Math.atan2(g.y - P.y, g.x - P.x))) > 1.4) continue; bd = d; best = g; }
  return best;
}
function olMug(g) {
  const P = S.player; if (!npcAlive(g) || g.robbed) return; const n0 = (S.olN = (S.olN || 0) + 1), armed = olArmed();
  P.a = Math.atan2(g.y - P.y, g.x - P.x); olFace(g); olPose('grab', 0.45);
  const tough = typeof brawlTough === 'function' ? brawlTough(g) : ['big', 'vest'].includes(g.body);
  const give = g.beg || (armed ? Math.random() < (tough ? 0.8 : 0.97) : Math.random() < (tough ? 0.12 : 0.45));
  if (give) {
    const n = olWealth(g); g.robbed = true; olCash(n, g.beg ? '시비꾼 지갑' : '행인 돈');
    gsay(g, olPick(armed && !g.beg ? OL_LINES.giveArmed : OL_LINES.giveTimid, n0), 2.2); if (typeof fstat === 'function') { fstat('mugged'); fstat('mugCash', n); }
    if (g.beg) { olRudeEnd(g, true); after(0.6, () => evFlee(g, P.x, P.y, 14)); return; }
    if (olSeen(P.x, P.y, 260, g)) { addWanted(1, '행인 돈을 뺏는 걸 봤다'); addRep(evDist(P.x, P.y), -2); }
    after(0.7, () => { if (npcAlive(g)) civPanic(g, P.x, P.y, 16); });
    after(15, () => { if (g.state !== 'DEAD' && g.state !== 'CAPTIVE' && !S.over && STAGE.cityLife) { addWanted(1, '털린 행인이 신고했다'); S.wantSpot = { x: g.x, y: g.y }; } });   // 15초 안에 입을 막지 않으면
    return;
  }
  if (tough || Math.random() < 0.3) { gsay(g, olPick(OL_LINES.fight, n0), 1.8); if (!g.fist && !g.routeQ) g.routeQ = g.route; g.fist = true; g.fistT = S.t + 0.4; return; }
  gsay(g, olPick(OL_LINES.scream, n0), 2); noise(g.x, g.y, 260, 'shout', flOf(g)); civPanic(g, P.x, P.y, 16);
  if (olSeen(P.x, P.y, 300, g) || Math.random() < 0.5) addWanted(1, '강도라고 소리쳤다');
}
// ---- 쓰러진 행인 주머니
function olWalletTarget() {
  const P = S.player; if (P.car || P.z || P.hide || P.carrying || P.trav) return null; const pf = flOf(P);
  let best = null, bd = 38;
  for (const c of S.corpses || []) { if (!c.civ || c.wallet || c.carried || c.stashed || c.hidden || (c.fl || 0) !== pf || c.g?.staff) continue; const d = dist(c.x, c.y, P.x, P.y); if (d < bd) { bd = d; best = c; } }
  return best;
}
function olWallet(c) {
  const P = S.player; if (c.wallet) return; c.wallet = true; olPose('crouch', 1.1, Math.atan2(c.y - P.y, c.x - P.x)); play('cloth', 0.5);
  after(1.1, () => { const g = c.g, n = g && !g.robbed ? olWealth(g) : 0; if (g) g.robbed = true;
    if (n) { olCash(n, c.ko ? '기절한 사람 주머니' : '쓰러진 사람 지갑'); if (typeof fstat === 'function') fstat('wallets'); } else toast('빈 지갑이다', 1.2);
    if (!g?.rude && olSeen(c.x, c.y, 220)) addWanted(1, '쓰러진 사람 주머니를 뒤졌다'); });
}

// ---- 시비꾼
function olRudeEnd(g, quiet) {
  if (!g || !g.rude) return; const R = g.rude; g.rude = null; g.beg = false; if (S.olRude === g) S.olRude = null; S.olRudeNext = S.t + 50 + Math.random() * 40;
  if (g.evt === 'rude') g.evt = null; setIcon(g, null); if (npcAlive(g)) { olFree(g); if (!quiet) gsay(g, olPick(OL_LINES.rudeLeave, R.n), 2); }
}
function olRudePick() {
  const P = S.player; if (P.car || flOf(P) || S.wanted || S.ev && !S.ev.done && S.ev.engaged || S.shopOpen) return null;
  const ok = g => typeof civTalkOk === 'function' ? civTalkOk(g) : g.civ && npcAlive(g) && !g.evt;
  const L = S.guards.filter(g => ok(g) && !g.robbed && !g.rudeDone && g.state === 'PATROL' && olGround(g) && !g.grp && !['old', 'kid'].includes(g.body) && dist(g.x, g.y, P.x, P.y) > 110 && dist(g.x, g.y, P.x, P.y) < 300 && los(g.x, g.y - 10, P.x, P.y - 10));
  return L.length ? L[(Math.random() * L.length) | 0] : null;
}
function olRudeUpdate(dt) {
  const P = S.player; if (S.olRudeNext == null) S.olRudeNext = S.t + 40 + Math.random() * 30;
  let g = S.olRude;
  if (!g) { if (S.t < S.olRudeNext) return; g = olRudePick(); if (!g) { S.olRudeNext = S.t + 8; return; }
    S.olRude = g; g.rude = { t0: S.t, ph: 'come', n: (S.olN = (S.olN || 0) + 1), said: 0 }; g.rudeDone = true; g.routeQ = g.route; g.bhpMax = Math.max(g.bhpMax || 0, 4); g.bhp = null; g.evt = 'rude'; g.chat = null; setIcon(g, '!'); }
  const R = g.rude; if (!R) { S.olRude = null; return; }
  if (!npcAlive(g)) {   // 쓰러졌다: 혼쭐 (주변이 반긴다)
    if (typeof fstat === 'function') fstat('rudeTaught'); evBanner('시비꾼 참교육', '#9fe0b0'); olCheer(g); g.rude = null; g.beg = false; S.olRude = null; S.olRudeNext = S.t + 60 + Math.random() * 40; return; }
  const d = dist(g.x, g.y, P.x, P.y);
  if (P.car || flOf(P) !== flOf(g) || d > 360 || S.wanted >= 2) { olRudeEnd(g); return; }
  if (R.ph === 'come') { if (d > 44 && !g.fist) { evRun(g, P.x, P.y, 78, dt); if (S.t - R.t0 > 14) olRudeEnd(g); return; }
    R.ph = 'talk'; R.t1 = S.t; olHold(g); olFace(g); gsay(g, olPick(OL_LINES.rudeOpen, R.n), 2.6); R.said = 1; play('click', 0.2, 0.7); return; }
  if (R.ph === 'talk') { if (!g.fist) olFace(g);
    if (R.said === 1 && S.t - R.t1 > 3.2) { R.said = 2; gsay(g, olPick(OL_LINES.rudeMore, R.n), 2.6); }
    if (!g.fist && (d > 170 || S.t - R.t1 > 13)) olRudeEnd(g); return; }
  if (R.ph === 'beg') { olFace(g); g.fist = false; if ((g.begSayT || 0) < S.t) { g.begSayT = S.t + 4; gsay(g, olPick(OL_LINES.beg, R.n++), 2.4); }
    if (S.t - R.tb > 25 || d > 260) { olRudeEnd(g, true); evFlee(g, P.x, P.y, 14); } }
}
function olCheer(g) { let k = 0; for (const o of S.guards) { if (k >= 2 || o === g || !o.civ || o.rude || !npcAlive(o) || o.off || flOf(o) !== flOf(g) || dist(o.x, o.y, g.x, g.y) > 220 || o.state !== 'PATROL') continue; gsay(o, olPick(OL_LINES.cheer, (S.olN | 0) + k), 2.4); k++; } }
function olRudeHit(g) {   // 47zp brawlHit 뒤: 거의 쓰러질 만큼 맞으면 빈다
  const R = g.rude; if (!R || g.beg || !npcAlive(g) || g.bhp == null || g.bhp > 1) return;
  g.beg = true; R.ph = 'beg'; R.tb = S.t; g.fist = false; g.stunT = S.t + 0.6; olHold(g); olFace(g); gsay(g, olPick(OL_LINES.beg, R.n), 2.6); g.begSayT = S.t + 4; setIcon(g, null);
}
function olForgive(g) { if (!g.rude) return; gsay(g, olPick(OL_LINES.forgive, g.rude.n), 2.6); if (typeof fstat === 'function') fstat('rudeTaught'); evBanner('사과를 받아 냈다 · 시비꾼 참교육', '#9fe0b0'); olCheer(g); const d = evDist(g.x, g.y); if (d) addRep(d, 1); olRudeEnd(g, true); after(0.8, () => evFlee(g, S.player.x, S.player.y, 8)); }

function olBegPanel(g) {
  if (!g.rude || !npcAlive(g)) return; const close = () => { if (typeof closeShopPanel === 'function') closeShopPanel(); };
  shopPanel('비는 시비꾼', [{ name: '용서해 준다', price: null, tag: '동네 평판 +1', ok: true, buy: () => { close(); olForgive(g); } },
    { name: '지갑 턴다', price: null, tag: '본 사람들은 못 본 척', ok: true, buy: () => { close(); olMug(g); } },
    { name: '한 대 더', price: null, tag: '', ok: true, buy: () => { close(); g.beg = false; if (g.rude) g.rude.ph = 'talk'; g.rude.t1 = S.t; g.bhp = 1; } }], null, olPick(OL_LINES.beg, g.rude.n));
}
// ---- 동네 비우기: 동네마다 처음 본 행인 명단 → 산 사람이 15% 아래로 내려가면 텅 빈 동네
function olPopUpdate() {
  if ((S.olPopT = (S.olPopT || 0) - 1) > 0) return; S.olPopT = 120;   // 2초쯤마다 (60fps 기준)
  if (!S.olPop) { S.olPop = new Map(); S.olEmpty = S.olEmpty || {};
    for (const g of S.guards) { if (!g.civ || g.child || g.dog || g.evt || g.staff || g.police || flOf(g)) continue; const d = evDist(g.x, g.y); if (!d) continue; let L = S.olPop.get(d); if (!L) S.olPop.set(d, L = []); L.push(g); } }
  for (const [d, L] of S.olPop) { if (S.olEmpty[d] || L.length < 8) continue;
    const alive = L.filter(g => npcAlive(g) || g.state === 'CAPTIVE').length;
    if (alive / L.length < 0.15) { S.olEmpty[d] = true; if (typeof fstat === 'function') fstat('emptied');
      evBanner(`[속보] ${d} 거리에 사람이 사라졌다… 주민 ${L.length - alive}명 쓰러져, 경찰 비상`, '#ff9a86'); if (S.wanted) addWanted(Math.max(0, 4 - S.wanted), `${d}을 비웠다`); addRep(d, -20);
      const all = [...S.olPop.keys()].filter(k => S.olPop.get(k).length >= 8); if (all.length && all.every(k => S.olEmpty[k])) evBanner('[속보] 도시 전체가 숨을 죽였다 · 거리에 남은 사람이 없다', '#ff7a66'); } }
}
function olPopStatus() { if (!S.olPop) return []; return [...S.olPop].map(([d, L]) => ({ d, total: L.length, alive: L.filter(g => npcAlive(g)).length, empty: !!S.olEmpty?.[d] })); }

// ---- 지구대 털기
const OL_SAFE_CD = 600, OL_ARMS_CD = 480;
function olStationOf(bi) { const b = BLD[bi]; return !!b && (b.name === '지구대' || b.plateName === '지구대'); }
function olStationFurn(bi, t) { const b = BLD[bi]; return FURN.find(it => it.t === t && (t !== 'locker' || it.arms) && !(it.fl || 0) && it.x >= b.x0 && it.x <= b.x1 && it.y >= b.y0 && it.y <= b.y1); }
function olStationSeen(bi) { const P = S.player; return S.guards.some(g => g.police && npcAlive(g) && !g.off && flOf(g) === flOf(P) && dist(g.x, g.y, P.x, P.y) < 420 && los(g.x, g.y - 10, P.x, P.y - 10) && Math.abs(angDiff(g.a, Math.atan2(P.y - g.y, P.x - g.x))) < 1.7); }
function olStationCops(bi) { const P = S.player; for (const g of (S.staffB?.get(bi) || [])) if (g.police && npcAlive(g)) { g.fist = true; g.fistT = S.t + 0.6; if (!g.routeQ) g.routeQ = g.route; } }
function olAlarm(bi, n, why) { play('alarm', 0.5); noise(S.player.x, S.player.y, 600, 'alarm', flOf(S.player)); if (S.wanted < n) addWanted(n - S.wanted, why); olStationCops(bi); }
function olStationAction() {
  const P = S.player; if (P.car || P.z || P.hide || P.trav || flOf(P)) return null;
  const bi = bldAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)); if (bi < 0 || !olStationOf(bi)) return null;
  const near = it => it && dist(P.x, P.y, (it.x + it.w / 2) * TILE, (it.y + it.h / 2) * TILE) < 62;
  const safe = olStationFurn(bi, 'safe'), arms = olStationFurn(bi, 'locker');
  S.olSt = S.olSt || {};
  if (near(safe)) { const cd = (S.olSt['s' + bi] || 0) - S.t; return { k: 'evAct', at: { x: (safe.x + 0.5) * TILE, y: safe.y * TILE - 30 }, label: cd > 0 ? `증거물 금고 · 비어 있다 (${Math.ceil(cd / 60)}분 뒤)` : '증거물 금고 털기 (압수 현금)', fn: () => { if (cd <= 0) olSafe(bi, safe); } }; }
  if (near(arms)) { const cd = (S.olSt['a' + bi] || 0) - S.t; return { k: 'evAct', at: { x: (arms.x + 0.5) * TILE, y: arms.y * TILE - 30 }, label: cd > 0 ? `무기 보관함 · 비어 있다 (${Math.ceil(cd / 60)}분 뒤)` : '무기 보관함 털기 (탄약·수류탄·조끼)', fn: () => { if (cd <= 0) olArms(bi, arms); } }; }
  return null;
}
function olSafe(bi, it) {
  const P = S.player, T = 3.4; S.olSt['s' + bi] = S.t + OL_SAFE_CD; olPose('crouch', T, Math.atan2((it.y + 0.5) * TILE - P.y, (it.x + 0.5) * TILE - P.x));
  for (const t of [0.4, 1.0, 1.6, 2.2, 2.8]) after(t, () => play('metal', 0.25, 1.6 + Math.random() * 0.3));
  after(1.0, () => { if (olStationSeen(bi)) olAlarm(bi, 3, '지구대 금고를 털다 들켰다'); });
  after(T, () => { const n = 250 + ((Math.random() * 9) | 0) * 25; olCash(n, '증거물 금고 압수 현금'); if (typeof fstat === 'function') fstat('stationRob');
    evBanner(`지구대 금고 털이 · +${n}만 · 곧 경보가 울린다`, '#ffd76a');
    after(6, () => { olAlarm(bi, 2, '지구대 금고 경보가 울렸다'); evBanner('[속보] 지구대 증거물 금고 털려… 경찰 "끝까지 추적"', '#ff9a86'); }); });
}
function olArms(bi, it) {
  const P = S.player, T = 2.2; S.olSt['a' + bi] = S.t + OL_ARMS_CD; olPose('crouch', T, Math.atan2((it.y + 0.5) * TILE - P.y, (it.x + 0.5) * TILE - P.x)); play('metal', 0.4, 1.2);
  after(0.8, () => { if (olStationSeen(bi)) olAlarm(bi, 3, '지구대 무기고를 털다 들켰다'); });
  after(T, () => { S.guns = S.guns || {}; S.guns.pistol = (S.guns.pistol || 0) + 24; S.guns.grenade = (S.guns.grenade || 0) + 2; if (!S.wpn) S.wpn = 'pistol';
    if (typeof ARMOR_MAX !== 'undefined') P.armor = Math.min(ARMOR_MAX, (P.armor || 0) + 2); if (typeof gunChip === 'function') gunChip(); play('click', 0.5, 0.8); play('loot', 0.5);
    toast('권총 탄 +24 · 수류탄 +2 · 방탄조끼', 2.2, 'good'); if (typeof fstat === 'function') fstat('stationArms');
    after(4, () => olAlarm(bi, 2, '지구대 무기고 경보가 울렸다')); });
}
// 지구대 1층 근무자: 사무실 직원 대신 경찰관 (밤새 근무 · 경찰 옷)
function olStationStaff(bi, list) {
  if (!olStationOf(bi)) return list;
  const sg = BLD[bi].signs || [];
  for (const g of list || []) { if (g.shopF && sg[g.shopF] && sg[g.shopF] !== '지구대') continue;   // 윗층 법무사·부동산은 그대로
    g.police = true; g.fac = 'P'; g.outfit = 'police'; g.staff = 'cop'; g.torch = false; g.radio = false; g.cvk = null;
    if (typeof prWarm === 'function' && typeof charOf === 'function') try { prWarm([charOf(g)], true); } catch (e) { } }
  return list;
}
if (typeof CHAT !== 'undefined') { CHAT_ROLE.cop = '경찰관';
  CHAT.cop = { hi: ['무슨 일로 오셨어요? 신고하러 오셨어요?', '분실물이면 저 서류부터 쓰세요.', '네, 지구대입니다. 말씀하세요.'],
    again: ['또 오셨네. 아까 그 일은 해결됐어요?', '자주 보네요. 이 근처 사세요?', '오늘만 세 번째예요, 선생님.'],
    reg: ['아, 그분. 커피 한 잔 하고 가요. 믹스밖에 없지만.', '오셨어요? 오늘은 조용하네요. 아직은.', '선생님 덕에 이 동네 신고가 좀 줄었어요.'],
    chat: ['요즘 밤마다 취객 신고만 서른 건이에요.', '뒤쪽 금고요? 압수품 넣어 두는 거예요. 손대면 큰일 나요.', '무기 보관함 열쇠는 소장님만 갖고 있어요. …대충 그렇다고요.', '순찰차 기름값 아끼라고 공문 내려왔어요. 웃기죠.'],
    late: ['새벽 세 시엔 꼭 누가 싸워요. 꼭.', '이 시간엔 졸음이 제일 무서운 범인이에요.', '야간 근무 끝나면 국밥 한 그릇이 낙이에요.'] }; }

// ---- 행동 버튼 · 갱신 연결
function olActions(out) {
  const P = S.player; if (P.car) return out;
  const st = olStationAction(); if (st) out.push(st);
  const g = olMugTarget();
  if (g && g.beg) out.push({ k: 'evAct', at: { x: g.x, y: g.y - 56 }, label: '비는 시비꾼 · 어떻게 할까', fn: () => olBegPanel(g) });
  else if (g) out.push({ k: 'evAct', at: { x: g.x, y: g.y - 56 }, label: olArmed() ? '돈 내놔 (위협)' : '돈 뺏기', fn: () => olMug(g) });
  const c = olWalletTarget(); if (c) out.push({ k: 'evAct', at: { x: c.x, y: c.y - 40 }, label: c.ko ? '기절한 사람 주머니 뒤지기' : '쓰러진 사람 지갑 뒤지기', fn: () => olWallet(c) });
  return out;
}
function olUpdate(dt) { if (!STAGE.cityLife || !S.guards) return; olRudeUpdate(dt); olPopUpdate(); }
if (typeof cityActionList === 'function') { const _cal = cityActionList; cityActionList = function () { const out = _cal.apply(this, arguments); return STAGE.cityLife ? olActions(out) : out; }; }
if (typeof staffUpdate === 'function') { const _su = staffUpdate; staffUpdate = function (dt) { const r = _su.apply(this, arguments); olUpdate(dt); return r; }; }
if (typeof staffSpawn === 'function') { const _ss = staffSpawn; staffSpawn = function (bi) { const r = _ss.apply(this, arguments); return STAGE.cityLife ? olStationStaff(bi, r) : r; }; }
if (typeof staffInit === 'function') { const _si = staffInit; staffInit = function () { _si.apply(this, arguments); S.olRude = null; S.olRudeNext = null; S.olPop = null; S.olEmpty = {}; S.olSt = {}; S.olPopT = 0; }; }
if (typeof brawlHit === 'function') { const _bh = brawlHit; brawlHit = function (g) { const r = _bh.apply(this, arguments); if (STAGE.cityLife && g && g.rude) olRudeHit(g); return r; }; }
if (typeof FREE_ACH !== 'undefined') FREE_ACH.push(
  ['mugger', '길거리 강도', '행인 10명 털기', s => (s.mugged || 0) >= 10, 60], ['teach', '참교육', '시비꾼 3명 혼내기', s => (s.rudeTaught || 0) >= 3, 60],
  ['heist', '지구대 털이', '지구대 금고 털기', s => (s.stationRob || 0) >= 1, 150], ['ghost', '유령 동네', '한 동네를 텅 비우기', s => (s.emptied || 0) >= 1, 50]);
