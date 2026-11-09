"""Two real cabinet leaves, supported source cargo, bridge routes and foreground order."""
import asyncio,json,shutil,threading
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/assembly-v247'
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def main():
 O.mkdir(exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
 url=f'http://127.0.0.1:{server.server_port}/build/preview_city.html'
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path=shutil.which('chromium'))
  for touch in [False,True]:
   q=await b.new_page(viewport={'width':390 if touch else 1280,'height':844},has_touch=touch);errors=[];q.on('pageerror',lambda e:errors.append(str(e)));await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(url);await q.wait_for_function('__game?.purchasedReady()&&__game.officeReady()&&__game.purchasedPropsReady()')
   result=await q.evaluate('''()=>{const G=__game,check=(v,m)=>{if(!v)throw Error(m)},C=document.createElement('canvas');C.width=C.height=240;const c=C.getContext('2d');let leaves=0;
    G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();
    for(const type of ['locker','wardrobe'])for(const width of [1,2]){const h={type,furn:true,tx:1,ty:1,w:width,h:1,x:48+width*24,y:72},g=G.cabinetGeometry(h);check(g.doors===2,type+' double-door art uses one hinge');let last=-1;
     for(let i=0;i<=20;i++){const open=i/20,pose=G.purchasedCabinetLeaves(h,open),gap=G.cabinetAperture(h,open);check(pose.length===2,'missing leaf');check(gap.w>=last,'aperture narrows while opening');last=gap.w;check(Math.abs(gap.x+gap.w/2-(g.doorLeft+g.doorRight)/2)<.001,'double aperture shifts sideways');
      check(pose[0].hinge===g.doorLeft&&pose[1].hinge===g.doorRight,'hinge travels');check(Math.abs(G.fixtureGrip(h,open).x-pose[0].handle.x)<.001&&Math.abs(G.fixtureGrip(h,open).y-pose[0].handle.y)<.001,'hand misses visible handle');
      const calls=[],draw=c.drawImage;c.drawImage=function(...a){const M=this.getTransform();if(a[0]===G.purchasedAtlas&&M.f===g.doorTop&&(M.e===g.doorLeft||M.e===g.doorRight))calls.push({args:a.slice(1),M});return draw.apply(this,a)};try{G.drawCabinet(h,'all',c,open)}finally{c.drawImage=draw}
      const L=calls.filter(a=>a.M.e===g.doorLeft),Q=calls.filter(a=>a.M.e===g.doorRight),knobs=calls.filter(a=>a.args[2]===5&&a.args[3]===5),panels=calls.filter(a=>a.args[2]===1);
      check(calls.length===20&&panels.length===18&&knobs.length===2,'missing native panel/knob parts '+type+':'+width+':'+open+':'+calls.length);
      check(L.length===10&&Q.length===10&&calls.every(a=>a.M.a>0),'source face mirrored or wrong hinge');if(open>0)check(L.every(a=>a.M.b>0)&&Q.every(a=>a.M.b<0),'both leaves swing from same side');check(L[0].args[0]!==Q[0].args[0],'same leaf duplicated twice');
      check(knobs.every(a=>a.args[6]===7.5&&a.args[7]===7.5),'knob enlarged on wide cabinet');
      const nativeW=(g.doorRight-g.doorLeft)/2,cos=Math.cos(open*G.cabinetMaxAngle(h));
      for(const leaf of pose){const inset=leaf.i?3.75:5.25;check(Math.abs(leaf.projection-nativeW*cos)<.001,'leaf width projection changed');check(Math.abs(leaf.handle.x-(leaf.hinge+leaf.side*(nativeW-inset)*cos))<.001,'native handle inset drift');}
      leaves+=2;
     }
    }
    let cartons=0;const draw=c.drawImage,cargo=G.purchasedPropCargoBounds(1,1),rect=G.purchasedPropFrame(cargo.key);check(cargo.visibleHeight===45,'tall sight blocker has wrong visible height');c.drawImage=function(...a){if(a[0]===G.purchasedPropsAtlas&&a[1]===rect[0]&&a[2]===rect[1]){cartons++;check(a[7]===48&&a[8]===48,'cargo is not at native 1.5x scale');}return draw.apply(this,a)};try{G.drawPurchasedCargo(c,1,1)}finally{c.drawImage=draw}check(cartons===1,'stable cargo arrangement duplicated');
    const x=G.ctx;for(const ew of [true,false]){x.save();x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,x.canvas.width,x.canvas.height);const w=ew?270:48,h=ew?48:300;G.drawPurchasedBridge({ew},20,20,w,h,'back');const pixels=x.getImageData(20,20,w,h).data;for(let t=0;t<(ew?w:h);t++){const px=ew?t:Math.floor(w/2),py=ew?Math.floor(h/2):t;check(pixels[(py*w+px)*4+3]===255,'deck has a gap or unpainted landing '+ew+':'+t);}x.restore();}
    let bridges=0,crossings=0,ewCount=0,nsCount=0;
    for(let si=0;si<G.STAGES.length;si++){
     G.start(si);while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;S.guards=[];S.cams=[];
     for(const p of G.PLANKS){check(p.a&&p.b,'unjoined bridge '+G.STAGE.id);bridges++;p.ew?ewCount++:nsCount++;const bounds=G.purchasedBridgeBounds(p);check(p.ew?bounds.x<p.x0*48&&bounds.x+bounds.w>(p.x1+1)*48:bounds.y<p.y0*48&&bounds.y+bounds.h>(p.y1+1)*48,'deck does not overlap both rooftops');
      for(const mobile of [false,true])for(const reverse of [false,true]){const a=reverse?p.b:p.a,b=reverse?p.a:p.b,dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);Object.assign(P,{x:a.x*48+24,y:a.y*48+24,z:p.z,fl:0,vx:0,vy:0,trav:null,jump:null,wire:null,ledge:null,hide:null,under:null,vent:null,captive:null,carrying:null,cover:null,snap:null,bodyAnim:null,interact:null,strikeT:0});G.setLayer(0);G.input.sneakToggle=false;G.input.joy=mobile?{x:dx,y:dy,mag:1}:null;S.keys=mobile?{}:dx?{[dx>0?'ArrowRight':'ArrowLeft']:true}:{[dy>0?'ArrowDown':'ArrowUp']:true};let n=0;while(n++<2400&&((b.x*48+24-P.x)*dx+(b.y*48+24-P.y)*dy)>2){S.t+=1/120;G.updatePlayer(1/120);check(!P.trav&&!P.jump&&P.z===p.z,'bridge requires jump, triggers descent or falls '+G.STAGE.id);}check(n<2400,'cannot reach opposite rooftop '+G.STAGE.id);crossings++;G.input.joy=null;S.keys={};}
     }
    }
    check(bridges>=6&&ewCount&&nsCount,'insufficient bridge coverage');return{cabinetLeafSamples:leaves,sourceCargoGroups:cartons,bridges,crossings,ewCount,nsCount};}''')
   # Actual frame ordering: source front rail must be after a same-height hero,
   # while a higher actor is drawn over that rail. Test both route orientations.
   await q.evaluate("__game.prLoadBody('heroAgent')")
   order=await q.evaluate('''()=>{const G=__game,c=G.ctx,draw=c.drawImage,check=(v,m)=>{if(!v)throw Error(m)},rows=[];for(const id of ['m3','m4']){G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player,p=G.PLANKS[0],b=G.purchasedBridgeBounds(p);S.guards=[];S.cams=[];S.facOn=false;S.fade=0;Object.assign(P,{x:b.x+b.w/2,y:b.y+b.h/2,z:p.z,fl:0,mode:'walk',hidden:false,light:.8});G.input.sneakToggle=false;G.setLayer(0);G.moveCamera(2);G.benchDraw(3);
     for(const higher of [false,true]){P.z=p.z+(higher?1:0);const hero=new Set();c.drawImage=function(...a){hero.add(a[0]);return draw.apply(this,a)};try{G.drawPlayer(P)}finally{c.drawImage=draw}const source=G.purchasedFrame(p.ew?'rail':'bridgeSideRail'),events=[];c.drawImage=function(...a){if(hero.has(a[0]))events.push('hero');if(a[0]===G.purchasedAtlas&&a[1]===source[0]&&a[2]===source[1]&&(p.ew?Math.abs(a[6]-(b.y+b.h-G.purchasedFrame('rail')[3]*1.5))<1:Math.abs(a[5]-(b.x-1))<1))events.push('front');return draw.apply(this,a)};try{G.benchDraw(1)}finally{c.drawImage=draw}check(events.includes('hero')&&events.includes('front'),'source actor/front rail not rendered '+id);check(higher?events.lastIndexOf('front')<events.indexOf('hero'):events.indexOf('front')>events.lastIndexOf('hero'),'front rail depth order wrong '+id+':'+higher+':'+events);rows.push({id,higher,events:events.filter((v,i)=>!i||v!==events[i-1])});}
    }return rows;}''')
   assert not errors,errors;(O/('touch.json'if touch else'pc.json')).write_text(json.dumps({'assembly':result,'depthOrder':order,'errors':errors},indent=2));print('PASS physical asset assembly',touch,result,order,flush=True);await q.close()
  await b.close()
 server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
