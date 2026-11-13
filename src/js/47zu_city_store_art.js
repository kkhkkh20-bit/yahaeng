// ---------------------------------------------------------------- 자유 모드 편의점 실내 그림 (구매한 GuttyKreum Corner Store 팩에서 글자 없는 조각만)
// 편의점·마트 층의 진열대·음료 냉장고·화분을 팩 그림으로 그린다 (32px 원본 · 1.5배 = 한 칸 48px). 그림이 없으면 원래 그림 그대로.
const cornerStoreArt = A.cornerStore || null, cornerStoreAtlas = new Image(); let cornerStoreDirty = false;
cornerStoreAtlas.onload = () => { cornerStoreDirty = true; }; if (cornerStoreArt?.src) cornerStoreAtlas.src = cornerStoreArt.src;
const cornerStoreReady = () => !!cornerStoreArt && cornerStoreAtlas.complete && cornerStoreAtlas.naturalWidth > 0;
function refreshCornerStore() { if (!cornerStoreDirty || !S || typeof mapC === 'undefined' || !mapC) return; const layer = CUR_F; try { setLayer(0); requestMapRebuild(); S.floorC = {}; cornerStoreDirty = false; } finally { setLayer(layer); } }
function cornerStoreBlit(x, name, dx, by) { const r = cornerStoreArt.frames[name]?.rect; if (!r) return false; x.imageSmoothingEnabled = false; x.drawImage(cornerStoreAtlas, ...r, Math.round(dx), Math.round(by - r[3] * 1.5), r[2] * 1.5, r[3] * 1.5); return true; }
const STORE_SIGN = /편의점|마트|슈퍼|시장|상회/;
function cornerStoreFurn(x, it) {
  if (!STAGE.cityLife || !cornerStoreReady()) return false; const bi = bldAt(it.x, it.y), b = BLD[bi], f = it.fl || 0; if (!b) return false;
  if ((b.floorsUse || [])[f] !== 'store' && !(f === 0 && !b.floorsUse)) return false; if (!STORE_SIGN.test((b.signs || [])[f] || b.name || '')) return false;
  const px = it.x * TILE, py = it.y * TILE, bot = py + it.h * TILE;
  if (it.t === 'shelf') { for (let k = 0; k < it.w; k++) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(px + k * TILE + 3, bot - 8, TILE - 6, 6); cornerStoreBlit(x, ['shelfGoods', 'shelfBoxes', 'shelfGoods', 'shelfEmpty'][(it.x + k + it.y * 2) % 4], px + k * TILE, bot - 2); } return true; }
  if (it.t === 'fridge') return cornerStoreBlit(x, ['fridgeBlue', 'fridgeFood', 'fridgeBlue2', 'wallBottles'][((it.x % 4) + 4) % 4], px, bot);   // 벽에 붙은 냉장고: 위쪽은 벽 칸까지 올라간다
  if (it.t === 'plant') return cornerStoreBlit(x, 'plant', px + 8, bot - 2);
  return false;
}
