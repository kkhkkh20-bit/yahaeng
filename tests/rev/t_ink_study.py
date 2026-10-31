"""Optional ink art direction preserves physical data and authored control geometry."""
import asyncio,hashlib,json
from pathlib import Path
from playwright.async_api import async_playwright
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parents[2]
async def main():
 font=TTFont(ROOT/'src/fonts/ink-display.woff').getBestCmap()
 assert all(ord(c)in font for c in 'VIP의뢰선택임무완료실패대청소배신'), 'display font misses actual headings'
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   snapshots=[];rects=[]
   for ink in [False,True]:
    pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile)
    errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    await pg.add_init_script('''window.requestAnimationFrame=()=>0;let seed=12345;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}''')
    await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats'+('&tone=ink'if ink else''));await pg.wait_for_function('!!__game')
    assert await pg.evaluate('__game.inkStudy')==ink
    result=await pg.evaluate('''()=>{const G=__game,out=[];for(const id of ['m2','m4','m6','m1','m3','m5']){
     G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
     const S=G.S,P=S.player,light=[];
     for(let f=0;f<G.GF.length;f++)if(G.GF[f])for(const [x,y]of [[4,10],[25,12],[29,12],[40,6]])light.push(G.lightAtG((x+.5)*48,(y+.5)*48,f));
     out.push({id,grids:G.GF,doors:S.doors.map(d=>[d.x,d.y,d.fl,d.locked,d.keyLock]),stairs:S.ladders.map(l=>[l.kind,l.tx,l.ty,l.bfl,l.tfl,l.tz,l.roofDoor]),furniture:G.FURN.map(f=>[f.t,f.x,f.y,f.w,f.h,f.fl]),lamps:S.lamps.map(l=>[l.x,l.y,l.r,l.fl,l.col,l.off,l.broken,G.lampControl(l)]),light,look:G.characterLook(P),player:[P.x,P.y,P.fl,P.z,P.hp,P.kunai,P.outfit],target:S.guards.filter(g=>g.target).map(g=>[g.x,g.y,g.fl,g.z]),goal:G.nextGoal().text});
    }return out;}''')
    snapshots.append(result)
    await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'));for(let i=0;i<60&&__game.DLG.modal;i++)__game.advanceDialog();__game.updateHUD(true)")
    rects.append(await pg.locator('#btnAct,#btnCarry,#btnGrab,#btnTool,#btnCrouch,#btnScan,#btnPause').evaluate_all('(a)=>a.map(e=>{const r=e.getBoundingClientRect();return[e.id,r.x,r.y,r.width,r.height]})'))
    if ink:
     await pg.wait_for_function('__game.inkPortraits?.complete&&__game.inkPortraits.naturalWidth>0',polling=100)
     hashes=await pg.evaluate('''()=>{const G=__game,cv=document.createElement('canvas');cv.width=cv.height=128;return ['hero','aide','master'].map(role=>{if(!G.drawFace(cv,G.speakerOf(role)))throw Error('missing portrait');return cv.toDataURL();});}''')
     assert len(set(hashes))==3,'main cast portraits not distinct'
     await pg.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='m2'),true)");await pg.evaluate('document.fonts.ready')
     assert await pg.evaluate('document.documentElement.scrollWidth===innerWidth'),'briefing horizontal overflow'
     # Meaningful text contrast after moving from a dark UI to paper.
     contrast=await pg.evaluate('''()=>{const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number),lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),bg=lum(rgb(getComputedStyle(document.querySelector('#brief')).backgroundColor));return ['#brName','#brTodo b','#brTodo li span','#brDetails summary'].map(s=>{const fg=lum(rgb(getComputedStyle(document.querySelector(s)).color));return[Math.max(bg,fg)+.05,Math.min(bg,fg)+.05].reduce((a,b)=>a/b);});}''')
     assert min(contrast)>=4.5,contrast
     await pg.locator('#btnBrGo').click();await pg.evaluate("__game.say([['hero','확인.']],true);__game.advanceDialog()")
     r=await pg.evaluate('''()=>{const a=document.querySelector('#dlg').getBoundingClientRect(),b=document.querySelector('#dlgFaceBox').getBoundingClientRect();return b.top>=a.top&&b.bottom<=a.bottom&&b.left>=a.left&&b.right<=a.right&&a.left>=0&&a.right<=innerWidth}''');assert r,'portrait detaches from dialogue'
    assert not errors,errors;await pg.close()
   for old,new in zip(snapshots[0],snapshots[1]):
    assert old==new, (mobile,old['id'],'art mode changes collision, lighting or mission data')
   assert rects[0]==rects[1],(mobile,rects)
   print('PASS', 'touch'if mobile else'desktop','six maps/lighting/missions identical; control rectangles identical; portraits/contrast',flush=True)
  await b.close()
asyncio.run(main())
