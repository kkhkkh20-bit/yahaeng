"""Four real heroine outfits use planted grips and keep visible cold fallbacks."""
import asyncio,base64,json,os
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/wardrobes-v247'
async def main():
 O.mkdir(exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader']);q=await b.new_page(viewport={'width':1280,'height':1000});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');base=os.environ.get('YH_TEST_BASE_URL');await q.goto(base.rstrip('/')+'/build/preview_city.html'if base else(R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.PR.bodies.heroAgentCabinetMotion');await q.evaluate('document.fonts.ready')
  await q.evaluate("__game.start(__game.STAGES.findIndex(s=>s.id==='tB'));while(__game.DLG.modal)__game.advanceDialog()")
  await q.wait_for_function('__game.purchasedReady()&&__game.officeReady()')
  report=await q.evaluate('''async()=>{const G=__game,P=G.S.player,result=[],gallery=[],workOpen=(p,close)=>{const t=Math.max(0,Math.min(1,(p-.24)/.42)),f=t*t*(3-2*t);return close?1-f:f;};
   for(const[outfit,disguise,body]of [[null,null,'heroAgent'],['crew','sam','heroAgentCrew'],['staff','staff','heroAgentWorker'],['waiter','waiter','heroAgentFormal']]){
    P.outfit=outfit;P.disguise=disguise;const source=body+'CabinetMotion';await G.prLoadBody(body);delete G.spriteSources.loaded[source];
    const h={x:312,y:696,tx:6,ty:14,w:1,h:1,type:'locker',furn:true,fl:0,z:0},foot=G.hideFootprint(h),stand={x:h.x,y:foot.y1-6};P.x=stand.x;P.y=stand.y;
    const cold=G.accessHandSample(h,stand,.5);if(cold.anim!=='openHigh')throw Error('cold source has no legacy fallback '+body);if(!G.drawPR(cold.key,cold.x,cold.y,cold.a,cold.anim,0,1,1,0,cold.frame))throw Error('cold actor invisible '+body);
    await G.prLoadBody(source);let max=0,poses=0;
    for(const type of ['locker','wardrobe'])for(const w of [1,2])for(const closing of [false,true]){
     const h={x:(6+w/2)*48,y:696,tx:6,ty:14,w,h:1,type,furn:true,fl:0,z:0},foot=G.hideFootprint(h),stand={x:h.x,y:foot.y1-6};
     for(let i=0;i<17;i++){
      const progress=i/16,s=G.accessHandSample(h,stand,progress,closing),anim='cabinet'+(closing?'Close':'Open')+(w===2?'Wide':'');
      if(s.anim!==anim||s.frame!==i||!s.key.endsWith('@'+source))throw Error('wrong native grip '+body+':'+anim+':'+JSON.stringify(s));
      if(s.x!==stand.x||s.y!==stand.y||Math.abs(s.a+Math.PI/2)>.001)throw Error('body translated or wrong approach');
      const m=G.PR.bodies[source],scale=m.scales[anim],feet=m[anim+'Feet'][6],hands=m[anim+'Hands'][6][i];
      if(feet[i].some((f,h)=>Math.hypot(f[0]-feet[0][h][0],f[1]-feet[0][h][1])>.000001))throw Error('feet moved');
      if(s.weight===1){const leaves=G.purchasedCabinetLeaves(h,workOpen(progress,closing));for(let j=0;j<2;j++){const actual={x:s.x+(hands[j][0]-32)*scale,y:s.y+13+(hands[j][1]-m.grounds[anim])*scale},handle=leaves[j].handle,error=Math.hypot(actual.x-handle.x,actual.y-handle.y);max=Math.max(max,error);if(error>2)throw Error('actual world wrist misses handle '+body+':'+type+':'+w+':'+i+':'+error);}}
      if(!G.drawPR(s.key,s.x,s.y,s.a,s.anim,0,1,1,0,s.frame))throw Error('native actor invisible');poses++;
      if(type==='locker'&&!closing&&[0,4,8,12,16].includes(i))gallery.push({body,w,i,h,stand,s});
     }
     for(let j=240;j<=720;j++){
      const progress=j/1000,s=G.accessHandSample(h,stand,progress,closing),m=G.PR.bodies[source],scale=m.scales[s.anim],hands=m[s.anim+'Hands'][6][s.frame],leaves=G.purchasedCabinetLeaves(h,workOpen(progress,closing));
      for(let side=0;side<2;side++){const actual={x:s.x+(hands[side][0]-32)*scale,y:s.y+13+(hands[side][1]-m.grounds[s.anim])*scale},handle=leaves[side].handle,error=Math.hypot(actual.x-handle.x,actual.y-handle.y);max=Math.max(max,error);if(error>2)throw Error('quantized grip released before contact ended '+body+':'+type+':'+w+':'+progress+':'+error);}
     }
    }
    result.push({body,coldFallback:cold.anim,poses,maxWorldHandleError:max});
   }
   const c=G.ctx;c.canvas.width=1280;c.canvas.height=2160;c.setTransform(1,0,0,1,0,0);c.fillStyle='#182630';c.fillRect(0,0,1280,2160);c.fillStyle='#e0dfd3';c.textAlign='center';c.font='20px IBM Plex Sans KR';c.fillText('실제 양팔 리그 · 수납장 접촉',640,34);c.font='13px IBM Plex Sans KR';c.fillText('작업 전 접근 · 작업 중 접지 고정 · 기본/넓은 양문',640,59);
   for(let row=0;row<8;row++)for(let col=0;col<5;col++){
    const v=gallery[row*5+col],baseX=130+col*250,baseY=290+row*250;c.save();c.translate(baseX,baseY);c.scale(1.8,1.8);c.translate(-v.stand.x,-v.stand.y);const open=workOpen(v.i/16,false);G.drawCabinet(v.h,'back',c,open);G.drawCabinet(v.h,'front',c,open);G.drawPR(v.s.key,v.s.x,v.s.y,v.s.a,v.s.anim,0,1,1,0,v.s.frame);c.restore();c.fillStyle='#c0d0d8';c.fillText(({'heroAgent':'잠입복','heroAgentCrew':'조직 제복','heroAgentWorker':'직원복','heroAgentFormal':'정장'}[v.body])+' · '+v.w+'칸 · '+v.i+'/16',baseX,baseY+44);
   }
   return{result,png:c.canvas.toDataURL()};}''')
  (O/'cabinet-grips.png').write_bytes(base64.b64decode(report.pop('png').split(',')[1]));(O/'cabinet-runtime.json').write_text(json.dumps(report,indent=2));assert not errors,errors;print('PASS cabinet runtime',json.dumps(report),flush=True);await b.close()
if __name__=='__main__':asyncio.run(main())
