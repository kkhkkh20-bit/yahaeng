"""Screen text level: the default 'minimal' hides rule/solution text and keeps visual cues; 'full' restores the old guidance.

Same m2 scenes are checked in both modes. Tutorials always stay detailed.
"""
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

R = Path(__file__).resolve().parents[2]
HOOK = '''()=>{window.__cv=new Set();for(const fn of ['fillText','strokeText']){const o=CanvasRenderingContext2D.prototype[fn];CanvasRenderingContext2D.prototype[fn]=function(t,...a){try{if(this.canvas&&this.canvas.id==='game')window.__cv.add(String(t))}catch(e){}return o.call(this,t,...a)}}}'''
SCENE = '''async (mode)=>{
  const G=__game;try{localStorage.setItem('yahaeng.guide',mode)}catch(e){}
  G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
  const S=G.S,P=S.player,tick=s=>{for(let t=0;t<s;t+=1/60)G.update(1/60)};
  S.cams=[];const [g2,g3]=[S.guards[2],S.guards[3]];
  for(const g of [g2,g3]){g.a=g.want=g.post=-Math.PI/2;g.still=true;g.chatCd=999;g.route=[{x:g.x,y:g.y,pause:999}];g.routeLine=null;g.path=null;g.wait=99;}
  g3.x=g2.x+40;g3.y=g2.y;Object.assign(P,{x:g2.x+20,y:g2.y+36,a:-Math.PI/2,mode:'sneak'});G.input.sneakToggle=true;tick(.2);
  G.killGuard(g2);tick(.3);
  const c=S.corpses[0];Object.assign(P,{x:c.x+26,y:c.y+10});tick(.2);
  G.updateHUD(true);window.__cv.clear();G.benchDraw(2);
  const vis=id=>{const e=document.getElementById(id);return !!e&&!e.hidden&&e.checkVisibility({opacityProperty:true,visibilityProperty:true})&&!!e.textContent.trim()};
  S.toasts=[];G.toast('확인용 알림',2,'good');G.toast('표적이 사람을 부른다 — 2초 안에 막으면 퍼지지 않는다',2,'warn');
  const radio=G.episodeRadioMessage();
  const canvasNear=[...window.__cv];
  // Body-risk text is never drawn for the body the player has selected, so step back before sampling it.
  Object.assign(P,{x:c.x+180,y:c.y+40});tick(.1);window.__cv.clear();G.benchDraw(2);const canvasFar=[...window.__cv];
  return {access:vis('accessLbl'),risk:vis('actionRiskLbl'),expo:vis('expoLbl'),dressKey:vis('dressKey'),layer:document.getElementById('layerLbl').textContent,
    canvas:canvasNear,canvasFar,toasts:S.toasts.map(t=>t.text),radioAction:radio?.action||'',radioStory:!!radio?.storyBeat,radio:!!radio,
    bodyClass:document.body.classList.contains('guide-min'),full:G.guideFull?.()};
}'''

async def main():
    bad = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await page.add_init_script('window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}')
        await page.goto((R / 'build/preview_city.html').as_uri() + '?nostats'); await page.wait_for_function('!!window.__game')
        await page.evaluate(HOOK)
        out = {m: await page.evaluate(SCENE, m) for m in ('min', 'full')}
        tut = await page.evaluate('''()=>{const G=__game;localStorage.setItem('yahaeng.guide','min');G.start(G.STAGES.findIndex(s=>s.id==='t0'));while(G.DLG.modal)G.advanceDialog();G.S.toasts=[];G.toast('연습 알림',2,'good');return G.S.toasts.length}''')
        await b.close()
    mn, fu = out['min'], out['full']
    print(json.dumps({k: {x: v for x, v in d.items() if not x.startswith('canvas')} for k, d in out.items()}, ensure_ascii=False))
    def ok(v, m):
        if not v: bad.append(m)
    # minimal
    ok(mn['bodyClass'], 'min: body.guide-min not set')
    ok(not mn['access'] and not mn['risk'], 'min: outfit/zone/risk text still visible')
    ok(not mn['expo'], 'min: exposure word still visible')
    ok(not mn['dressKey'], 'min: duplicate Y clothing key still visible')
    ok('공개' not in mn['layer'] and mn['layer'].strip() != '', 'min: layer label should be floor only: ' + mn['layer'])
    ok(not any('눈에 띄는' in t for t in mn['canvasFar']), 'min: body risk text drawn')
    ok(not any(' — ' in t for t in mn['canvas']), 'min: action prompt keeps description suffix')
    ok(mn['toasts'] == ['표적이 사람을 부른다'], 'min: toasts should be warn facts only: %s' % mn['toasts'])
    ok(not mn['radio'] or mn['radioStory'], 'min: radio coaching message returned')
    # full keeps the previous guidance
    ok(not fu['bodyClass'], 'full: body.guide-min still set')
    ok(fu['access'], 'full: outfit/zone text hidden')
    ok('공개' in fu['layer'], 'full: zone word missing from layer label')
    ok(any('눈에 띄는' in t for t in fu['canvasFar']), 'full: body risk text missing')
    ok(len(fu['toasts']) == 2 and ' — ' in fu['toasts'][1], 'full: toasts changed: %s' % fu['toasts'])
    ok(fu['radio'] and bool(fu['radioAction']), 'full: radio coaching missing')
    # tutorials always detailed
    ok(tut == 1, 'tutorial toast suppressed in minimal mode')
    if errs: bad.append('page errors %s' % errs[:3])
    print('실패' if bad else '통과', bad); sys.exit(1 if bad else 0)

asyncio.run(main())
