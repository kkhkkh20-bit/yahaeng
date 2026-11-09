"""Published visual contracts: item identity, readable objectives and real heading glyphs."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.fieldArtReady');await q.evaluate('document.fonts.ready')
   await q.click('#btnSkillsIntro');await q.evaluate('document.fonts.ready')
   cdp=await q.context.new_cdp_session(q);await cdp.send('DOM.enable');await cdp.send('CSS.enable');root=await cdp.send('DOM.getDocument');node=await cdp.send('DOM.querySelector',{'nodeId':root['root']['nodeId'],'selector':'#skillScreen .sub-head h2'});fonts=await cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node['nodeId']});assert any(f['familyName']=='IBM Plex Sans KR'and f['isCustomFont']and f['glyphCount']>=4 for f in fonts['fonts']),fonts
   await q.click('#btnSkillsBack')
   result=await q.evaluate('''()=>{const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},rows=[];
    for(const tool of ['stone','coin','smoke','radio']){const svg=window.__HUD_ART__['item:'+tool];ok(svg.includes('<image ')&&!svg.includes('<path '),'quick item uses a mismatched vector '+tool);}
    for(const st of G.STAGES){G.start(G.STAGES.indexOf(st));while(G.DLG.modal)G.advanceDialog();G.S.fade=0;G.updateHUD(true);G.benchDraw(2);
     const el=document.getElementById('objectiveSummary'),s=getComputedStyle(el),r=el.getBoundingClientRect();ok(s.whiteSpace!=='nowrap','single-line clipping '+st.id);ok(r.height<=parseFloat(s.lineHeight)*2+.5,'objective exceeds two lines '+st.id);
     if(st.id==='m6')ok(el.textContent.length<32,'long mission paragraph replaces current objective: '+el.textContent);
     const goal=G.nextGoal(),caption=goal&&goal.x!=null?G.goalMarkerCaption(goal,15):'';if(caption)ok(caption.includes('15m'),'distance lost '+st.id);
     rows.push({id:st.id,summary:el.textContent,clipped:el.scrollHeight>el.clientHeight+1});
    }
    ok(rows.every(r=>!r.clipped),'objective text clipped: '+JSON.stringify(rows.filter(r=>r.clipped)));
    // A thrown object on 2F must be drawn above that floor, rather than buried under it.
    G.start(G.STAGES.findIndex(s=>s.id==='m4'));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];S.fade=0;Object.assign(P,{x:27.5*48,y:6.5*48,fl:1,z:0});G.setLayer(1);G.moveCamera(2);G.benchDraw(3);
    const at={x:P.x+48,y:P.y+18},dpr=G.DPRinfo()[0],px=Math.round(((at.x-G.cam.x)*G.SCALE+innerWidth/2)*dpr),py=Math.round(((at.y-G.cam.y)*G.SCALE+innerHeight/2)*dpr),sample=()=>G.ctx.getImageData(px-8,py-8,16,16).data;
    const before=sample(),time=S.t;S.stones=[{x0:at.x,y0:at.y+30,x1:at.x,y1:at.y+30,t:.5,dur:1,fl:1}];S.t=time-1/60;G.benchDraw(1);const after=sample();let diff=0;for(let i=0;i<after.length;i++)diff+=Math.abs(after[i]-before[i]);ok(diff>200,'thrown can is hidden by the upper-floor canvas');
    return{maps:rows.length,items:4,headingGlyphs:true,objectivesNotClipped:true,upperFloorCanVisible:true};}''')
   assert not errors,errors;print('PASS design', 'mobile'if mobile else'PC',json.dumps(result),flush=True);await q.close()
  await b.close()
asyncio.run(main())
