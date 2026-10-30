# 의뢰 1 (히트맨식 재구성) 경로 봇: 택배 · 직원 조끼 · 정전 · 엿듣기 → 기회 · 반장 눈썰미
# 플레이어를 길 따라 한 칸씩(걷는 속도로) 옮기며 진짜 AI 앞을 지나가게 한다
import asyncio, sys
from playwright.async_api import async_playwright
SK = '() => { const g = window.__game; for (let i = 0; i < 30 && g.DLG.modal; i++) g.advanceDialog(); }'
H = """window.T = {
  G: () => window.__game, S: () => window.__game.S,
  at(x, y) { const P = this.S().player; P.fl = 0; P.z = 0; P.x = x * 48 + 24; P.y = y * 48 + 24; },
  away(...tags) { for (const g of this.S().guards) if (tags.includes(g.tag) || tags.includes(g.id)) { g.x = -5000; g.y = -5000; g.route = [{ x: -5000, y: -5000, pause: 999 }]; g.path = null; g.wander = null; g.sched = null; } },
  async walk(x, y, ms = 330) { const G = this.G(), P = G.S.player; G.setLayer(0); const path = G.astar(Math.floor(P.x / 48), Math.floor(P.y / 48), x, y);
    for (const p of path) { if (G.S.over) return 'over'; P.a = Math.atan2(p.y - P.y, p.x - P.x); P.x = p.x; P.y = p.y; P.moving = true; P.mode = 'walk'; await new Promise(r => setTimeout(r, ms)); } P.moving = false; return path.length; },
  bad() { return this.S().guards.filter(g => !g.civ && ['WARN', 'ALERT'].includes(g.state)).map(g => g.tag || g.id + ':' + g.state); },
  npc(t) { return this.S().guards.find(g => g.tag === t); }
};"""
async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///root/game/build/preview_city.html'); await pg.wait_for_timeout(1500)
        async def fresh():
            await pg.evaluate('() => window.__game.start(0)'); await pg.wait_for_timeout(300); await pg.evaluate(SK); await pg.evaluate(H)
        # 1 택배: 트럭 옆 상자를 들고 → 샛길 → 뒷마당(자경대원 ③ 앞) → 뒷문 → 창고 → (직원·② 없을 때) 사무실 장부
        await fresh(); await pg.evaluate("T.away(1, 'boss', 'kid', 'clerk', 'courier')")
        await pg.evaluate('T.at(48, 28)'); await pg.wait_for_timeout(200)
        lab = await pg.evaluate('() => { const a = T.G().secondaryAction(); T.G().actCarry(); return a.label; }'); await pg.wait_for_function('!T.S().player.interact'); r = [lab, await pg.evaluate('T.S().player.item && T.S().player.item.id')]; print('상자', r)
        if r[1] != 'box': bad.append('택배 상자를 못 든다 %s' % r)
        for (x, y) in [(46, 22), (46, 5), (34, 4), (30, 7), (33, 9)]:
            await pg.evaluate(f'T.walk({x}, {y})')
        r = await pg.evaluate('() => [T.bad(), T.S().stats.detected, T.S().stories.find(s => s.d.id === "courier").step]'); print('택배 → 창고', r)
        if r[0] or r[1]: bad.append('택배 상자를 들고 뒷마당·창고에서 들켰다 %s' % r)
        await pg.evaluate('T.walk(36, 9)'); await pg.wait_for_timeout(300)
        print('책상 행동', await pg.evaluate('() => { const a = T.G().primaryAction().label; T.G().actPrimary(); return a; }')); await pg.wait_for_timeout(1300)  # 장부는 책상 위: [행동]으로 챙긴다
        r = await pg.evaluate('() => [T.S().items[0].got, T.S().stats.gotAs, T.S().stories.find(s => s.d.id === "courier").done]'); print('택배 장부', r)
        if r != [True, 'parcel', True]: bad.append('택배 경로로 장부·기회 완료가 안 된다 %s' % r)
        # 2 엿듣기 → 기회 '담배 타임' 발견 → 막내 기절 → 수거함 → 조끼 → 뒷마당·창고를 지나 사무실(② 있음)
        await fresh(); await pg.evaluate("T.away('boss')")
        await pg.evaluate('T.at(20, 26)')
        r = None
        for t in range(60):
            await pg.wait_for_timeout(500); r = await pg.evaluate('() => [T.S().learned.slice(), (T.S().stories.find(s => s.d.id === "smoke") || {}).found]')
            if r[1]: break
        print('엿듣기', r)
        if not r[1]: bad.append('편의점 앞 수다로 담배 타임 기회가 안 열린다 %s' % r)
        await pg.evaluate('''() => { const k = T.npc('kid'); k.x = 21 * 48 + 24; k.y = 3 * 48 + 24; k.ri = 0; k.wait = 99; k.a = Math.PI; k.want = Math.PI; k.path = null; }''')
        await pg.evaluate('T.walk(23, 3)'); await pg.evaluate('() => { const P = T.S().player, k = T.npc("kid"); P.x = k.x + 30; P.y = k.y; P.a = Math.PI; }')
        lab = await pg.evaluate('() => T.G().primaryAction().label'); await pg.evaluate('() => T.G().actPrimary()'); await pg.wait_for_timeout(900)
        await pg.evaluate('() => { const c = T.S().corpses.find(c => c.tag === "kid"); T.S().player.x = c.x + 18; T.S().player.y = c.y; }'); await pg.wait_for_timeout(100)
        await pg.wait_for_function('!T.G().actionBusy()'); a1 = await pg.evaluate('() => { const a = T.G().secondaryAction().label; T.G().actCarry(); return a; }'); await pg.wait_for_function('!T.S().player.interact')
        a2 = await pg.evaluate('() => { const a = T.G().secondaryAction().label; T.G().actCarry(); return a; }'); await pg.wait_for_timeout(700)
        await pg.evaluate('T.walk(19, 3)'); a3 = await pg.evaluate('() => { const a = T.G().secondaryAction().label; T.G().actCarry(); return a; }'); await pg.wait_for_timeout(700)
        r = await pg.evaluate('() => [T.S().player.outfit, T.S().corpses.find(c => c.tag === "kid").stashed, T.S().stories.find(s => s.d.id === "smoke").step]'); print('막내', lab, a1, a2, a3, r)
        if r[0] != 'staff' or not r[1]: bad.append('막내 기절 → 조끼 → 숨기기가 안 된다 %s' % r)
        for (x, y) in [(30, 4), (30, 7), (33, 9), (36, 9)]:
            await pg.evaluate(f'T.walk({x}, {y})')
        await pg.wait_for_timeout(300); await pg.evaluate('() => T.G().actPrimary()'); await pg.wait_for_timeout(1300)  # 책상에서 챙기기
        r = await pg.evaluate('() => [T.bad(), T.S().items[0].got, T.S().stats.gotAs, T.S().player.disguiseBlown]'); print('조끼 → 장부', r)
        if r[0] or not r[1] or r[2] != 'staff': bad.append('직원 조끼로 사무실 장부까지 못 간다 %s' % r)
        # 3 사장 눈썰미: 조끼 차림으로 사장 코앞에 서 있으면 알아채고 신고하러 간다
        await fresh(); await pg.evaluate('() => { const P = T.S().player; P.outfit = "staff"; P.disguise = "staff"; P.disguiseBlown = false; }')
        await pg.evaluate('''() => { const b = T.npc('boss'); b.x = 33 * 48 + 24; b.y = 13 * 48 + 24; b.wait = 99; b.a = 0; b.want = 0; b.path = null; T.at(34, 13); }''')
        r = None
        for t in range(16):
            await pg.wait_for_timeout(250); r = await pg.evaluate('() => [T.S().player.disguiseBlown, T.npc("boss").state]')
            if r[0]: break
        print('사장 눈썰미', r)
        if not r[0] or r[1] not in ('REPORT', 'PANIC'): bad.append('사장이 직원 조끼를 알아보지 못한다 %s' % r)
        # 4 정전: 상회 두꺼비집 → 사무실 쪽 ②가 고치러 간다
        await fresh(); await pg.evaluate("T.away('boss', 'kid', 'courier')")
        r = await pg.evaluate('() => { const S = T.S(), f = S.bfuses.find(f => f.b === 1); T.at(Math.floor(f.x / 48), Math.floor(f.y / 48)); return [T.G().primaryAction().label]; }')
        await pg.evaluate('() => { const a = T.G().primaryAction(); if (a.k === "bfuse") T.G().actPrimary(); else if (a.alt && a.alt.k === "bfuse") T.G().actCarry(); }')
        st = None
        for t in range(30):
            await pg.wait_for_timeout(300); st = await pg.evaluate('() => [T.S().guards[1].state, T.S().bfuses.find(f => f.b === 1).cut]')
            if st[0] == 'FUSE': break
        print('정전', r, st)
        if st[0] != 'FUSE': bad.append('두꺼비집을 내려도 자경대원이 고치러 오지 않는다 %s %s' % (r, st))
        print('errs', errs[:3]); await b.close()
    print('문제', bad); sys.exit(1 if bad or errs else 0)
asyncio.run(main())
