"""Map-edge framing and speech remain visible above building layers on mobile/PC."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch();total=0
  for width,height,touch in [(390,844,True),(844,390,True),(1280,720,False)]:
   pg=await browser.new_page(viewport={'width':width,'height':height},has_touch=touch);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
   await pg.add_init_script('window.requestAnimationFrame=()=>0');await pg.goto((ROOT/'build/preview_city.html').as_uri());await pg.wait_for_function('!!__game')
   result=await pg.evaluate('''({touch})=>{
    const G=__game,check=(v,m)=>{if(!v)throw Error(m)};let cases=0;
    for(const id of ['m1','m2','m3','m4','m5','m6'])for(const zoom of [.75,1,1.6]){
     G.start(G.STAGES.findIndex(s=>s.id===id));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.setZoom(zoom);const P=G.S.player;
     for(const edge of ['top','bottom']){
      Object.assign(P,{x:G.MW*24,y:edge==='top'?24:G.MH*48-24,z:0,fl:0,moving:false,mode:'walk'});
      for(let n=0;n<150;n++)G.moveCamera(1/60);
      const s=G.SCALE,h=innerHeight,bottom=(G.MH*48-G.cam.y)*s+h/2;
      if(G.MH*48*s>=h&&edge==='bottom')check(h-bottom<=(touch?Math.min(140,h*.18):24)+1,id+' excessive blank below map');
      const bounds=G.cameraYBounds();check(G.cam.y>=bounds[0]-1&&G.cam.y<=bounds[1]+1,id+' camera outside vertical bounds');
      const sy=(P.y-G.cam.y)*s+h/2;check(sy>8&&sy<h-8,id+' player clipped at boundary');cases++;
     }
     // Moving along the last tiles eases toward the limit without a sudden camera jump.
     P.y=G.MH*48-240;for(let n=0;n<150;n++)G.moveCamera(1/60);
     for(let n=0;n<100;n++){P.y+=2;const y=G.cam.y;G.moveCamera(1/60);check(Math.abs(G.cam.y-y)*G.SCALE<10,id+' camera snaps at map edge')}
    }
    G.start(G.STAGES.findIndex(s=>s.id==='m5'));for(let i=0;i<60&&G.DLG.modal;i++)G.advanceDialog();G.setZoom(1);const S=G.S,P=S.player,g=S.guards.find(g=>g.rival);S.guards.forEach(q=>{q.x=q.y=-9999});Object.assign(P,{x:27*48+24,y:24*48+24,z:0,fl:0});for(let i=0;i<150;i++)G.moveCamera(1/60);
    Object.assign(g,{x:P.x,y:P.y,z:0,fl:0,state:'PATROL',say:'건물 앞 말풍선 검사',meter:0,icon:null});
    // This is heard mission dialogue; ambient chatter deliberately yields during close actions.
    S.intel={presentation:{cur:{sp:g}}};
    const ctx=G.ctx,fill=ctx.fillText,draw=ctx.drawImage,events=[];
    ctx.fillText=function(t,...a){events.push({text:t});return fill.call(this,t,...a)};ctx.drawImage=function(...a){events.push({img:a[0]});return draw.apply(this,a)};
    try{G.benchDraw(1)}finally{ctx.fillText=fill;ctx.drawImage=draw}
    const speech=events.map((e,i)=>e.text===g.say?i:-1).filter(i=>i>=0),roofs=new Set(G.BLD.flatMap(b=>[b.roofC,b.kit?.c,b.kit?.img,b.kit?.g]).filter(Boolean)),lastRoof=events.reduce((n,e,i)=>roofs.has(e.img)?i:n,-1);
    check(speech.length===1&&speech[0]>lastRoof,'speech is obscured by buildings or rendered twice');
    for(const r of G.SPEECH_R){const sy=(r.y-G.cam.y)*G.SCALE+innerHeight/2;check(sy>=0&&sy+r.h*G.SCALE<innerHeight,'speech clipped vertically')}
    // A speaker close to the upper edge moves its bubble into the visible viewport.
    g.y=G.cam.y-innerHeight/G.SCALE/2+8/G.SCALE;P.y=g.y+24;G.benchDraw(1);check(G.SPEECH_R.length===1,'upper-edge speaker disappeared');for(const r of G.SPEECH_R){const y=(r.y-G.cam.y)*G.SCALE+innerHeight/2;check(y>=8&&y+r.h*G.SCALE<=innerHeight-8,'upper-edge bubble is clipped')}
    return {cases,speechAboveBuildings:true};
   }''',{'touch':touch})
   assert not errors,errors;total+=result['cases'];print('PASS',width,height,result,flush=True);await pg.close()
  print('PASS',total,'camera boundary cases');await browser.close()

asyncio.run(main())
