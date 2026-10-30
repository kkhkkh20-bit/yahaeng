// 물건·장소 이름 뒤의 조사. '(으)로', '을(를)' 같은 편집용 표기를 화면에 내보내지 않는다.
function withJosa(word, pair) {
  const text = String(word == null ? '' : word); if (!text) return text;
  const end = text.trim().replace(/[)\]}'"”’]+$/u, '').slice(-1), code = end.charCodeAt(0) - 0xac00;
  const digit = { 0: 21, 1: 8, 3: 16, 6: 1, 7: 8, 8: 8 };
  const jong = code >= 0 && code < 11172 ? code % 28 : digit[end] || (/[LR]/i.test(end) ? 8 : /[MN]/i.test(end) ? 1 : 0);
  const forms = pair.split('/'), consonant = jong && !(pair === '으로/로' && jong === 8);
  return text + forms[consonant ? 0 : 1];
}
function holdHint(a) { return a.hold ? (a.holdOnly ? '길게 누르기' : '길게 ' + a.hold) : ''; }
function actionCaption(a, label = a.label || '') { const hold = holdHint(a); return label + (hold ? ' · ' + hold : ''); }
// 저장된 물건의 위치·획득 여부는 유지하고, 표시 이름만 현재 의뢰 정의를 따른다.
function refreshItemNames() {
  const defs = STAGE.props || [];
  for (const p of (S.props || []).concat(S.player.item ? [S.player.item] : [])) {
    const d = defs.find(d => d.id === p.id); if (d && d.name) p.name = d.name;
  }
}
