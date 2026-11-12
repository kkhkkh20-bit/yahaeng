// ---------------------------------------------------------------- 큰 도시: 구역 이름 · 가게 · 중고차 매매 · 도색소
// 구역: 다른 구역에 들어서면 왼쪽 아래에 그 구역 이름이 잠깐 뜬다 (GTA식).
// 가게: 약국 · 편의점 · 철물점 · 공구 가게 앞 문에서 [행동] → 물건 목록에서 산다(돈은 만 원 단위).
// 중고차 매매: 사무실 앞에서 전시장 차를 사고, 전시장에 차를 몰고 와 세우면 판다. 값을 안 내고 전시장 차에 타면 훔친 것이다(수배 둘).
// 도색소: 도색 칸에 차를 세우면 색을 바꾸고 수배가 풀린다(값 50만, 수배 없으면 그냥 지나간다).
const SHOP_ITEMS = {
  약국: [{ name: '구급약 (체력 가득)', price: 40, can: P => P.hp < P.hpMax, buy: P => { P.hp = P.hpMax; } }],
  편의점: [{ name: '담배 한 갑 (+3)', price: 5, buy: P => { P.coins = (P.coins || 0) + 3; } }, { name: '빈 캔 세 개 (+3)', price: 3, buy: P => { P.stones = (P.stones || 0) + 3; } },
    { name: '구급약 (체력 +1)', price: 15, can: P => P.hp < P.hpMax, buy: P => { P.hp = Math.min(P.hpMax, P.hp + 1); } }],
  철물: [{ name: '락픽 두 개 (+2) — 잠긴 차 따기', price: 25, buy: P => { P.picks = (P.picks || 0) + 2; } }, { name: '다트 세 개 (+3)', price: 30, buy: P => { P.kunai = (P.kunai || 0) + 3; } }, { name: '연막탄 (+1)', price: 40, buy: P => { P.smokes = (P.smokes || 0) + 1; } }],
  공구: [{ name: '락픽 두 개 (+2) — 잠긴 차 따기', price: 25, buy: P => { P.picks = (P.picks || 0) + 2; } }, { name: '다트 세 개 (+3)', price: 30, buy: P => { P.kunai = (P.kunai || 0) + 3; } }, { name: '연막탄 (+1)', price: 40, buy: P => { P.smokes = (P.smokes || 0) + 1; } }],
};
const RESPRAY_PRICE = 50, SELL_RATE = 0.3;
function shopsInit() {
  S.shops = []; S.districtName = null;
  if (!STAGE.cityLife) return;
  BLD.forEach((b, bi) => { const name = (b.signs?.[0] || '').trim(); if (b.kind !== 'shop' || !SHOP_ITEMS[name]) return;
    S.shops.push({ name, b: bi, x: (b.x0 + b.x1 + 1) * TILE / 2, y: (b.y1 + 1) * TILE + 14 }); });
  const D = STAGE.dealer; if (!D) return;
  S.dealer = { lot: D.lot.map(v => v * TILE).map((v, i) => i >= 2 ? v + TILE : v), office: { x: tc(D.office[0]), y: tc(D.office[1]) } };
  const R = STAGE.respray?.bay; if (R) S.respray = { x0: R[0] * TILE, y0: R[1] * TILE, x1: (R[2] + 1) * TILE, y1: (R[3] + 1) * TILE };
  // 전시장 차: 값나가는 차로 바꿔 놓고 값표를 단다
  const pool = ['sport', 'suv', 'luxury', 'supercar', 'sedan', 'pickup', 'minivan'];
  S.vehicles.forEach((v, i) => { if (!v.parked || v.police || !inLot(v.x, v.y)) return;
    const type = pool[i % pool.length], nv = makeVehicle({ type, x: v.x, y: v.y, a: v.a, parked: true }); Object.assign(v, nv, { id: v.id }); v.forSale = VTYPES[type].price; });
}
const inLot = (x, y) => S.dealer && x > S.dealer.lot[0] && x < S.dealer.lot[2] && y > S.dealer.lot[1] && y < S.dealer.lot[3];
// [행동] 후보 (cityAction 에서 먼저 본다)
function shopAction() {
  const P = S.player;
  if (P.car) {
    const v = P.car;
    if (inLot(v.x, v.y) && Math.abs(v.v) < 25 && !v.forSale && !v.police && vType(v).price > 0) return { k: 'carSell', v, label: `차 팔기 · ${Math.round(vType(v).price * SELL_RATE)}만` };
    return null;
  }
  if (P.z || flOf(P) || P.hide) return null;
  for (const s of S.shops || []) if (dist(P.x, P.y, s.x, s.y) < 56) return { k: 'shop', s, at: { x: s.x, y: s.y - 40 }, label: s.name };
  if (S.dealer && dist(P.x, P.y, S.dealer.office.x, S.dealer.office.y) < 70) return { k: 'dealer', at: { x: S.dealer.office.x, y: S.dealer.office.y - 40 }, label: '중고차 매매' };
  return null;
}
// 가게 · 중고차 목록 창 (게임은 멈춘다)
function shopPanel(title, rows, onClose) {
  let el = document.getElementById('shopPanel');
  if (!el) { el = document.createElement('div'); el.id = 'shopPanel'; el.setAttribute('role', 'dialog');
    el.style.cssText = 'position:fixed;left:50%;bottom:9%;transform:translateX(-50%);z-index:70;min-width:min(420px,92vw);max-width:94vw;background:rgba(12,14,20,.94);border:2px solid #c9a24a;border-radius:6px;padding:14px 16px;color:#efe6cf;font-family:var(--f-body);box-shadow:0 8px 30px rgba(0,0,0,.6)';
    document.body.appendChild(el); }
  el.replaceChildren(); if (el._esc) { document.removeEventListener('keydown', el._esc, true); el._esc = null; }  // 다시 그릴 때 예전 키 처리기를 뗀다
  const h = document.createElement('div'); h.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:16px';
  const t = document.createElement('b'); t.textContent = title; t.style.cssText = 'font-size:20px';
  const m = document.createElement('span'); m.textContent = `가진 돈 ${S.cash || 0}만`; m.style.cssText = 'color:#c9a24a;font-size:14px'; h.append(t, m); el.append(h);
  for (const r of rows) {
    const b = document.createElement('button'); b.type = 'button'; b.disabled = !r.ok;
    b.style.cssText = 'display:flex;justify-content:space-between;gap:20px;width:100%;margin:4px 0;padding:10px 12px;background:#1d222c;color:inherit;border:1px solid #3b4250;border-radius:4px;font:inherit;font-size:15px;cursor:pointer;opacity:' + (r.ok ? 1 : .45);
    const a = document.createElement('span'), p = document.createElement('span'); a.textContent = r.name; p.textContent = r.price == null ? (r.tag || '') : r.price + '만'; p.style.color = '#c9a24a'; b.append(a, p);
    b.onclick = () => { r.buy(); }; el.append(b);
  }
  const c = document.createElement('button'); c.type = 'button'; c.textContent = '나가기'; c.style.cssText = 'margin-top:8px;width:100%;padding:9px;background:none;color:#b4bcb8;border:1px solid #3b4250;border-radius:4px;font:inherit;cursor:pointer';
  const close = () => { el.remove(); S.shopOpen = false; document.removeEventListener('keydown', esc, true); onClose && onClose(); };
  const esc = e => { if (e.code === 'Escape' || e.code === 'KeyX') { e.preventDefault(); e.stopPropagation(); close(); } };
  c.onclick = close; el.append(c); S.shopOpen = true; el._esc = esc; document.addEventListener('keydown', esc, true);
  (el.querySelector('button:not(:disabled)') || c).focus({ preventScroll: true });
  return close;
}
function pay(price) { if ((S.cash || 0) < price) { play('click', 0.3); return false; } S.cash -= price; play('loot', 0.6); hudCache.objH = null; return true; }
function openShop(s) {
  const P = S.player, items = SHOP_ITEMS[s.name] || [];
  const show = () => shopPanel(s.name + repTag(evDist(P.x, P.y)), items.map(it => ({ name: it.name, price: repPrice(it.price), ok: (S.cash || 0) >= repPrice(it.price) && (!it.can || it.can(P)), buy: () => { if ((!it.can || it.can(P)) && pay(repPrice(it.price))) { it.buy(P); if (typeof syncTools === 'function') syncTools(); show(); } } })));
  show();
}
function openDealer() {
  const lot = S.vehicles.filter(v => v.forSale && !v.dead);
  const show = () => shopPanel('중고차 매매', lot.filter(v => v.forSale).map(v => ({ name: vType(v).name, price: v.forSale, ok: (S.cash || 0) >= v.forSale,
    buy: () => { if (pay(v.forSale)) { v.forSale = null; v.bought = true; show(); } } })));
  show();
}
function sellCar(v) {
  const P = S.player, price = Math.round(vType(v).price * SELL_RATE);
  carExit(true); S.cash = (S.cash || 0) + price; play('loot', 0.7); hudCache.objH = null;
  v.forSale = vType(v).price; v.parked = true; v.ai = false; v.driver = false; v.v = 0;
}
// 매 프레임: 구역 이름 · 훔친 전시장 차 · 도색 칸
function shopsUpdate(dt) {
  if (!STAGE.cityLife) return;
  const P = S.player, name = STAGE.districtAt?.(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
  if (name && name !== S.districtName) { S.districtName = name; showDistrict(name + repTag(name === '청계천' ? '청계천 상가' : name)); }
  const v = P.car;
  if (v && v.forSale) {  // 값을 안 내고 탔다: 훔친 차
    v.forSale = null; addWanted(2, '전시장 차를 훔쳤다'); play('metal', 0.6, 2.2); noise(v.x, v.y, 420, 'alarm', 0);
  }
  if (v && S.respray && Math.abs(v.v) < 20 && v.x > S.respray.x0 && v.x < S.respray.x1 && v.y > S.respray.y0 && v.y < S.respray.y1) {
    if (!v.sprayT) v.sprayT = S.t;
    if (S.t - v.sprayT > 1.2 && S.wanted > 0 && (S.cash || 0) >= RESPRAY_PRICE) {
      S.cash -= RESPRAY_PRICE; S.wanted = 0; v.hue = (v.hue || 0) + 90 + Math.random() * 180; v.sprayT = S.t + 99;
      for (const g of S.guards) if (g.police && g.state === 'ALERT') { g.state = 'RETURN'; g.path = null; g.lastSeen = null; }
      for (const o of S.vehicles) if (o.chase) o.chase = false;
      play('cloth', 0.8); play('loot', 0.5); S.flash = Math.max(S.flash || 0, 0.25); hudCache.objH = null;
    }
  } else if (v) v.sprayT = 0;
}
// 구역 이름: 왼쪽 아래, 2.6초 동안 떴다가 사라진다
function showDistrict(name) {
  let el = document.getElementById('districtName');
  if (!el) { el = document.createElement('div'); el.id = 'districtName'; el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:24px;bottom:96px;z-index:40;pointer-events:none;font:600 26px/1.2 "Yahaeng UI",sans-serif;letter-spacing:-.01em;color:#f2e7c8;text-shadow:0 2px 0 #000,0 0 12px rgba(0,0,0,.8);opacity:0;transition:opacity .4s';
    document.body.appendChild(el); }
  el.textContent = name; el.style.opacity = '1'; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}
// 그림: 전시장 값표 · 도색 칸 표시 (땅 위)
function drawShopMarks() {
  if (!S.dealer || flOf(S.player)) return;
  ctx.save(); ctx.font = '700 13px ' + UI_FONT_FAMILY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const v of S.vehicles) { if (!v.forSale || v.dead || !inView(v.x, v.y, 80)) continue;
    const t = v.forSale + '만', w = ctx.measureText(t).width + 12; ctx.fillStyle = 'rgba(250,240,200,.92)'; ctx.fillRect(v.x - w / 2, v.y - 46, w, 18); ctx.fillStyle = '#7a1a10'; ctx.fillText(t, v.x, v.y - 37); }
  const R = S.respray; if (R && inView((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, 200)) {
    ctx.strokeStyle = 'rgba(255,190,60,.8)'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.strokeRect(R.x0 + 4, R.y0 + 4, R.x1 - R.x0 - 8, R.y1 - R.y0 - 8); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,190,60,.12)'; ctx.fillRect(R.x0 + 4, R.y0 + 4, R.x1 - R.x0 - 8, R.y1 - R.y0 - 8); }
  ctx.restore();
}
