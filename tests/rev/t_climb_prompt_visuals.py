"""Climb framing and unobtrusive, ready-only action prompts."""
import asyncio, json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 meta=json.loads((ROOT/'build/pr/pr_meta.json').read_text());n=0
 for body in ['key','hero','heroSuit','heroWorker','heroCrew']:
  bm=meta if body=='key' else meta['bodies'][body]
  im=Image.open(ROOT/'build/pr'/('key.webp' if body=='key' else f'body_{body}.webp')).convert('RGBA')
  fr=meta['fr'];col,count=bm['anims']['climb']
  assert 1<bm['scales']['climb']<2 and 0<bm['grounds']['climb']<fr
  for d in range(8):
   for f in range(count):
    box=im.crop(((col+f)*fr,d*fr,(col+f+1)*fr,(d+1)*fr)).getchannel('A').getbbox()
    assert box and min(box[:2])>=2 and max(box[2:])<=fr-2,(body,d,f,box)
    n+=1
 print('PASS',n,'climb frames retain transparent margins',flush=True)
 async with async_playwright() as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   pg=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile)
   errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
   await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats&tone=ink');await pg.wait_for_function('!!__game',polling=100)
   result=await pg.evaluate('''mobile=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)},routes=[];
    for(const sid of ['m2','m4','m6']){
     G.start(G.STAGES.findIndex(s=>s.id===sid));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();
     const S=G.S,P=S.player,l=S.ladders.find(l=>l.kind==='pipe'&&!l.bz&&!l.bfl);check(l,'no pipe '+sid);
     S.guards=[];S.cams=[];Object.assign(P,{x:l.x,y:l.y,fl:0,z:0});G.setLayer(0);
     const tick=()=>{for(let i=0;i<500&&P.trav;i++){S.t+=.02;G.updatePlayer(.02);G.runTimers()}check(!P.trav,'unfinished traversal')};
     G.actPrimary({k:'up',l,viaZ:true});check(P.trav,'pipe up absent');tick();check((P.z||0)===(l.tz||0)&&(P.fl||0)===(l.tfl||0),'wrong roof landing');
     G.actPrimary({k:'down',l,viaZ:true});check(P.trav,'pipe down absent');tick();check(!P.z&&!P.fl&&Math.hypot(P.x-l.x,P.y-l.y)<30,'wrong ground landing');routes.push(sid);
    }
    const rows=[{key:mobile?'공격':'Z',text:'기절',ready:true},{key:mobile?'붙잡기':'C',text:'붙잡기',ready:true},{key:'X',text:'추가 정보 없음',ready:false}];
    for(const zoom of [.75,1,1.6]){
     G.setZoom(zoom);const r=G.encounterRect(0,0,rows);check((r[3]-r[1])*G.SCALE<=36.1,'prompt grows with zoom');
     const c=G.ctx,fr=c.fillRect,ft=c.fillText,rects=[],texts=[];c.fillRect=function(...a){rects.push(a);return fr.apply(this,a)};c.fillText=function(t,...a){texts.push(t);return ft.call(this,t,...a)};
     try{G.drawEncounter(0,0,rows)}finally{c.fillRect=fr;c.fillText=ft}
     check(texts.includes('붙잡기')&&!texts.some(t=>t.includes('추가')),'unavailable prompt printed');
     check(mobile?rects.length===0:rects.length===2&&rects.every(r=>r[3]*G.SCALE<=16.1),'large background panel returns');
    }
    return {routes,compact:true};
   }''',mobile)
   assert not errors,errors;print('PASS','touch' if mobile else 'desktop',result,flush=True);await pg.close()
  await b.close()
asyncio.run(main())
