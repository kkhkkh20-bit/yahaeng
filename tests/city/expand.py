p='/root/game/src/stages_city.js'; s=open(p).read()
def blk(stage_id):
    i=s.index(f"id: '{stage_id}'"); j=s.find("\n{\n  id: '", i+5); j = len(s) if j<0 else j; return i,j
def rep_in(stage_id, a, b):
    global s
    i,j=blk(stage_id); seg=s[i:j]; assert seg.count(a)==1,(stage_id,a[:80],seg.count(a)); s=s[:i]+seg.replace(a,b)+s[j:]
def add_build(stage_id, code):
    global s
    i=s.index(f"id: '{stage_id}'"); j=s.index("  build(m) {", i); k=s.index("\n  },\n", j)
    s=s[:k]+"\n"+code+s[k:]
s=s.replace("for (let x = 1; x < 45; x++) if ((x * 7 + row) % 6 === 0", "for (let x = 1; x < 70; x++) if ((x * 7 + row) % 6 === 0",1)

rep_in('city_med', "W: 46, H: 32, start: [38, 1]", "W: 60, H: 32, start: [38, 1]")
rep_in('city_med', "frame(m, 46, 32, 30); m.fill(0, 30, 45, 31, '=');", "frame(m, 60, 32, 30); m.fill(0, 30, 59, 31, '=');")
rep_in('city_med', "m.villa(1, 12, 18, 20, 4, { name: '자경대 사무실' });", "m.villa(1, 12, 18, 20, 4, { name: '자경대 사무실', back: true });")
add_build('city_med', """    // 동쪽: 공사장(담장 구멍 · 철판 · 자갈 — 지름길이지만 시끄럽다), 뒷골목, 빌라 두 채
    for (let x = 48; x <= 58; x++) { m.set(x, 1, '#'); m.set(x, 9, '#'); } for (let y = 1; y <= 9; y++) { m.set(48, y, '#'); m.set(58, y, '#'); }
    m.fill(49, 2, 57, 8, ','); m.set(48, 5, ','); m.set(53, 9, ',');
    mat(m, 'm', [[50, 4], [51, 4], [52, 4], [53, 4], [54, 6], [55, 6]]); mat(m, 'r', [[49, 7], [50, 7], [51, 7], [56, 3], [57, 3], [56, 4]]);
    m.many('O', [[50, 2], [56, 8]]); m.many('H', [[57, 2], [49, 3]]); m.many('B', [[49, 8], [57, 7]]);
    m.villa(48, 12, 58, 20, 3, { back: true });                                  // 8
    m.villa(48, 23, 58, 29, 2, { kind: 'house' });                               // 9
    [50, 57].forEach(x => { m.pole(x, 11, 2); m.pole(x, 22, 2); }); m.pole(52, 30, 2);
    m.many('B', [[46, 4], [46, 16], [46, 26]]); m.many('W', [[47, 21]]);""")
rep_in('city_med', "[[42, 11], [42, 22]], [[25, 22], [20, 30]], [[34, 22], [32, 30]]],", "[[42, 11], [42, 22]], [[25, 22], [20, 30]], [[34, 22], [32, 30]], ...chain(11, [42, 50, 57]), ...chain(22, [42, 50, 57]), [[42, 30], [52, 30]], [[57, 11], [57, 22]]],")
rep_in('city_med', "{ kind: 'g1', route: [[2, 10, 2], [44, 10, 2]] },", "{ kind: 'g1', route: [[2, 10, 2], [58, 10, 2]] },\n    { kind: 'g2', route: [[46, 2, 2], [46, 29, 2]] },")

rep_in('city_gangnam', "W: 50, H: 37, start: [0, 25], exit: [49, 15.5]", "W: 64, H: 37, start: [0, 25], exit: [63, 15.5]")
rep_in('city_gangnam', "m.fill(0, 0, 49, 36, '.'); for (let x = 0; x < 50; x++) m.set(x, 0, '#'); m.fill(0, 35, 49, 36, '=');", "m.fill(0, 0, 63, 36, '.'); for (let x = 0; x < 64; x++) m.set(x, 0, '#'); m.fill(0, 35, 63, 36, '=');")
rep_in('city_gangnam', "m.fill(0, 12, 49, 12, '='); m.fill(0, 19, 49, 19, '=');", "m.fill(0, 12, 63, 12, '='); m.fill(0, 19, 63, 19, '=');")
rep_in('city_gangnam', "signs: ['CLUB 녹턴', 'VIP 라운지', '기획사'], name: '클럽 녹턴' });", "signs: ['CLUB 녹턴', 'VIP 라운지', '기획사'], name: '클럽 녹턴', back: true });")
add_build('city_gangnam', """    // 동쪽: 모텔(세원타워와 한 칸 틈 — 같은 층 옆 창문으로 건너간다), 주차장(차 사이로 숨는다)
    m.villa(50, 1, 62, 11, 5, { kind: 'shop', use: ['food', 'office', 'office', 'office', 'office'], signs: ['모텔 별밤', '', '', '', ''], plate: '모텔 별밤' });   // 5
    for (let y = 22; y <= 32; y += 4) for (let x = 51; x <= 61; x += 2) if ((x + y) % 3) m.car(x, y, (x + y) % 4);
    m.many('T', [[49, 12], [57, 12], [55, 19]]); m.many('B', [[50, 21], [62, 21], [50, 33], [62, 33]]);
    m.set(56, 20, 'F');""")
rep_in('city_gangnam', "decor: [['lane', 0, 16, 49], ['zebra', 22, 13, 6, 'v'], ['zebra', 45, 13, 6, 'v']],", "decor: [['lane', 0, 16, 63], ['zebra', 22, 13, 6, 'v'], ['zebra', 45, 13, 6, 'v'], ['park', 51, 22, 5], ['park', 51, 26, 5], ['park', 51, 30, 5]],")
rep_in('city_gangnam', "{ kind: 'g1', route: [[1, 12, 2], [48, 12, 2]] },", "{ kind: 'g1', route: [[1, 12, 2], [62, 12, 2]] },\n    { kind: 'g2', route: [[50, 24, 2], [62, 24, 2], [62, 32, 2], [50, 32, 2]] }, { kind: 'g1', b: 5, at: 'S', post: 90 },")
rep_in('city_gangnam', "reinf: [49, 13],", "reinf: [63, 13],")

rep_in('city_forest', "W: 48, H: 34, start: [2, 31], exit: [23, 33.5]", "W: 60, H: 40, start: [2, 37], exit: [23, 39.5]")
rep_in('city_forest', "m.fill(0, 0, 47, 33, 'g');", "m.fill(0, 0, 59, 39, 'g');")
rep_in('city_forest', "for (let x = 0; x < 48; x++) { if (x < 22 || x > 24) m.set(x, 33, 'T'); m.set(x, 0, 'T'); } for (let y = 0; y < 34; y++) { m.set(0, y, 'T'); m.set(47, y, 'T'); }", "for (let x = 0; x < 60; x++) { if (x < 22 || x > 24) m.set(x, 39, 'T'); m.set(x, 0, 'T'); } for (let y = 0; y < 40; y++) { m.set(0, y, 'T'); m.set(59, y, 'T'); }")
rep_in('city_forest', "for (let y = 0; y < 34; y++) { const x = y < 17 ? 30 : 31;", "for (let y = 0; y < 40; y++) { const x = y < 17 ? 30 : 31;")
rep_in('city_forest', "m.fill(22, 18, 24, 33, 'd');", "m.fill(22, 18, 24, 39, 'd');")
rep_in('city_forest', "for (let y = 1; y < 33; y++) for (let x = 1; x < 47; x++) { if (!free(x, y)) continue;", "// 동쪽 산길(좁은 흙길 · 자갈) → 별장 뒷담 구멍\n    m.fill(52, 9, 52, 36, 'd'); m.fill(47, 8, 52, 8, 'd'); m.set(46, 8, 'd'); m.fill(36, 36, 52, 36, 'd'); m.fill(33, 26, 36, 36, 'd');\n    mat(m, 'r', [[52, 30], [52, 31], [52, 18], [52, 19], [49, 8]]);\n    m.villa(54, 28, 58, 33, 1, { kind: 'house', name: '사냥꾼 오두막' });   // 6\n    for (let y = 1; y < 39; y++) for (let x = 1; x < 59; x++) { if (!free(x, y)) continue;")
rep_in('city_forest', "m.fill(1, 29, 4, 32, 'g'); m.many('B', [[3, 29], [5, 31]]);", "m.fill(1, 35, 4, 38, 'g'); m.many('B', [[3, 35], [5, 37]]);")
rep_in('city_forest', "{ kind: 'dog', route: [[25, 25, 1.5], [21, 32, 1.5]] },", "{ kind: 'dog', route: [[25, 25, 1.5], [21, 36, 1.5]] },\n    { kind: 'g1', at: [52, 22], post: 90, lookout: true }, { kind: 'g2', route: [[52, 12, 2], [52, 34, 2]] },")
rep_in('city_forest', "decor: [['shade', 0, 0, 47, 33, 0.12, '0,20,10']],", "decor: [['shade', 0, 0, 59, 39, 0.12, '0,20,10']],")
rep_in('city_forest', "hints: ['풀숲에 숨고,", "hints: ['별장 정문은 지킨다. 동쪽 산길로 돌아가면 뒷담에 개구멍이 있다(자갈은 시끄럽다).', '풀숲에 숨고,")

rep_in('city_doc', "W: 46, H: 36, start: [17, 2]", "W: 58, H: 36, start: [17, 2]")
rep_in('city_doc', "m.fill(0, 0, 45, 35, ','); for (let x = 0; x < 46; x++) m.set(x, 0, '#'); for (let y = 0; y < 31; y++) { m.set(0, y, '#'); m.set(45, y, '#'); }", "m.fill(0, 0, 57, 35, ','); for (let x = 0; x < 58; x++) m.set(x, 0, '#'); for (let y = 0; y < 31; y++) { m.set(0, y, '#'); m.set(57, y, '#'); }")
rep_in('city_doc', "m.fill(0, 31, 45, 34, '.'); m.fill(0, 35, 45, 35, '=');", "m.fill(0, 31, 57, 34, '.'); m.fill(0, 35, 57, 35, '=');")
rep_in('city_doc', "[10, 20, 30].forEach(y => { for (let x = 1; x < 45; x++) m.set(x, y, '#'); [8, 25, 34, 42].forEach(x => m.set(x, y, 'J')); });", "[10, 20, 30].forEach(y => { for (let x = 1; x < 57; x++) m.set(x, y, '#'); [8, 25, 34, 42, 46].forEach(x => m.set(x, y, 'J')); });")
rep_in('city_doc', "[8, 21, 29], [25, 21, 29], [34, 21, 29]].forEach(", "[8, 21, 29], [25, 21, 29], [34, 21, 29], [46, 1, 9], [46, 11, 19], [46, 21, 29]].forEach(")
add_build('city_doc', """    // 동쪽 줄: 집 세 채
    H(47, 1, 56, 7, 2); H(47, 11, 56, 17, 2, { kind: 'villa' }); H(47, 21, 56, 27, 2);   // 14-16
    m.many('B', [[56, 9], [56, 19], [56, 29]]); [[51, 9], [51, 19], [51, 29], [52, 31]].forEach(([x, y]) => m.pole(x, y, 2));""")
rep_in('city_doc', "decor: [['shade', 0, 11, 45, 20, 0.08], ['shade', 0, 21, 45, 30, 0.15], ['shade', 0, 31, 45, 35, 0.22]],", "decor: [['shade', 0, 11, 57, 20, 0.08], ['shade', 0, 21, 57, 30, 0.15], ['shade', 0, 31, 57, 35, 0.22]],")
rep_in('city_doc', "[[21, 29], [18, 31]], [[40, 29], [42, 31]], [[40, 9], [40, 19]]],", "[[21, 29], [18, 31]], [[40, 29], [42, 31]], [[40, 9], [40, 19]], [[40, 9], [51, 9]], [[40, 19], [51, 19]], [[40, 29], [51, 29]], [[42, 31], [52, 31]]],")
rep_in('city_doc', "{ kind: 'g1', route: [[1, 8, 2], [44, 8, 2]] },", "{ kind: 'g1', route: [[1, 8, 2], [56, 8, 2]] },")

rep_in('city_market', "W: 46, H: 32, start: [30, 1]", "W: 58, H: 32, start: [30, 1]")
rep_in('city_market', "frame(m, 46, 32, 20); m.fill(0, 20, 45, 20, '='); m.fill(0, 23, 45, 23, '='); m.fill(0, 30, 45, 31, '=');", "frame(m, 58, 32, 20); m.fill(0, 20, 57, 20, '='); m.fill(0, 23, 57, 23, '='); m.fill(0, 30, 57, 31, '=');")
add_build('city_market', """    // 동쪽: 빌라, 금은방 빌딩(전당포와 두 칸 틈 — 3층 옆 창문으로 전당포에 들어간다), 철물 창고
    m.villa(47, 1, 56, 8, 3);                                                                                                  // 9
    m.villa(47, 12, 56, 19, 4, { kind: 'shop', use: ['store', 'office', 'office', 'pc'], signs: ['금은방', '세무사', '사무실', '당구장'], back: true });   // 10
    m.villa(47, 24, 56, 29, 2, { kind: 'shop', use: ['store', 'office'], signs: ['철물', '창고'] });                          // 11
    [44, 50].forEach(x => m.tent(x, 9, 'R')); [50, 56].forEach(x => { m.pole(x, 11, 2); m.pole(x, 20, 2); }); m.pole(48, 30, 2);
    m.many('H', [[46, 22], [57, 21]]);""")
rep_in('city_market', "...chain(30, [7, 17, 26, 38]), [[15, 11], [13, 20]],", "...chain(30, [7, 17, 26, 38, 48]), ...chain(11, [42, 50, 56]), ...chain(20, [43, 50, 56]), [[15, 11], [13, 20]],")
rep_in('city_market', "{ kind: 'g1', route: [[2, 11, 2], [44, 11, 2]] },", "{ kind: 'g1', route: [[2, 11, 2], [56, 11, 2]] },")
rep_in('city_market', "crowd: [[1, 10, 44, 10, 0, 7]],", "crowd: [[1, 10, 56, 10, 0, 9]],")
open(p,'w').write(s); print('ok')
