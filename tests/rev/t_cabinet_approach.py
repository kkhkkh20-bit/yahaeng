"""Central cabinet hand contact and swept 14px body clearance on all campaign maps.
Run --require-clear after map fixtures are repaired to reject blocked cabinets.
The preview bundle supplies physical maps; the helper comes from current source.
"""
import asyncio,json,sys
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/props-v247'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':900});await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()')
  if '--source-preview'in sys.argv:
   # Read current source into an in-memory preview; never rewrite product builds.
   html=(R/'build/preview_city.html').read_text();interior=(R/'src/js/10_interior.js').read_text();stages=(R/'src/stages/99_z_campaign.js').read_text()
   start='function stairWells(g, f) {';end='function buildFloors(st) {'
   html=html[:html.index(start)]+interior[interior.index(start):interior.index(end)]+html[html.index(end):]
   start='// Leave real service space behind the ground-floor camera.';end='// The final job rewards the same assassination/stealth rules as earlier jobs.'
   html=html[:html.index(start)]+stages[stages.index(start):stages.index(end)]+html[html.index(end):]
   await q.route('**/preview_city.html',lambda route:route.fulfill(status=200,content_type='text/html',body=html))
  await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('__game?.S');await q.add_script_tag(content=(R/'src/js/interaction/cabinet_approach.js').read_text()+'\nwindow.CABINET_TEST={cabinetFrontStand,cabinetFrontClear};')
  unit=await q.evaluate('''()=>{const T=CABINET_TEST,check=(v,m)=>{if(!v)throw Error(m)},foot={x0:48,y0:48,x1:144,y1:96},h={furn:true,type:'wardrobe',x:96},blocks=new Set(['1,1','2,1']),solid=(x,y)=>x<0||y<0||x>6||y>6||blocks.has(x+','+y),world={tile:48,footprint:()=>foot,solid};const a=T.cabinetFrontStand(h,world);check(a.x===96&&a.y===108&&a.workStand.x===96&&a.workStand.y===90&&a.entries.length===2,'double cabinet stand is not centered');check(a.entries.every(e=>T.cabinetFrontClear(e,a,foot,solid,48,14)),'entry final sweep is blocked');blocks.add('2,2');check(T.cabinetFrontStand(h,world)===null,'adjacent furniture clips actor at seam');blocks.delete('2,2');blocks.add('0,2');check(!T.cabinetFrontClear({x:24,y:120},a,foot,solid,48,14),'route crosses neighbouring wall');check(T.cabinetFrontStand(h,world)!==null,'unrelated wall blocks valid center');check(T.cabinetFrontStand({...h,type:'bed'},world)===null&&!T.cabinetFrontStand(null,world),'helper changes bed or non-cabinet approach');return {centeredDoubleDoor:true,bodyRadius:14,workBodyRadius:10,groundedFootRadius:6,wallBlocked:true,furnitureBlocked:true};}''')
  result=await q.evaluate('''()=>{const G=__game,T=CABINET_TEST,rows=[];for(let si=0;si<G.STAGES.length;si++){G.start(si);while(G.DLG.modal)G.advanceDialog();const S=G.S,P=S.player;for(const h of S.hides.filter(h=>h.furn&&h.type!=='bed')){G.setLayer(h.fl||0);const foot=G.hideFootprint(h),solid=G.solidFor(h.z||0),world={tile:48,footprint:G.hideFootprint,solid};const before=JSON.stringify({h,FURN:G.FURN}),stand=T.cabinetFrontStand(h,world);if(JSON.stringify({h,FURN:G.FURN})!==before)throw Error('helper mutates map');if(stand&&(stand.x!==h.x||stand.y!==foot.y1+12||!stand.entries.every(e=>T.cabinetFrontClear(e,stand,foot,solid,48,14))||!T.cabinetFrontClear(stand,stand.workStand,foot,solid,48,10)||!T.cabinetFrontClear({x:stand.x,y:stand.y+13},{x:stand.workStand.x,y:stand.workStand.y+13},foot,solid,48,6,false)))throw Error('invalid center sweep '+G.STAGE.id);const row={id:G.STAGE.id,type:h.type,tx:h.tx,ty:h.ty,fl:h.fl||0,w:foot.w,h:foot.h,center:{x:h.x,y:foot.y1+12},stand,front:[]};for(let tx=h.tx;tx<foot.x1/48;tx++)row.front.push({tx,ty:foot.y1/48,ch:G.tileCh(tx,foot.y1/48),solid:solid(tx,foot.y1/48)});const was={x:P.x,y:P.y,fl:P.fl,z:P.z};Object.assign(P,{x:stand?.entries[0]?.x??h.x,y:foot.y1+24,fl:h.fl||0,z:h.z||0});const old=G.hideApproach(h);row.old=old?{stand:old.stand,length:old.length,offset:Math.abs(old.stand.x-h.x)}:null;row.blockers=G.FURN.filter(f=>(f.fl||0)===(h.fl||0)&&f.x<foot.x1/48+1&&f.x+f.w>h.tx-1&&f.y<=foot.y1/48+1&&f.y+f.h>h.ty).map(f=>({...f}));row.neighborhood=[];for(let yy=h.ty-1;yy<=foot.y1/48+2;yy++){const line=[];for(let xx=h.tx-1;xx<=foot.x1/48;xx++)line.push({x:xx,y:yy,ch:G.tileCh(xx,yy),solid:solid(xx,yy)});row.neighborhood.push(line);}Object.assign(P,was);rows.push(row);}}return{maps:G.STAGES.length,total:rows.length,blocked:rows.filter(r=>!r.stand),offsets:rows.reduce((a,r)=>{const k=r.old?.offset??'none';a[k]=(a[k]||0)+1;return a},{}),rows};}''')
  O.mkdir(exist_ok=True);result['sourcePreview']='--source-preview'in sys.argv;result['unit']=unit;(O/'cabinet-audit.json').write_text(json.dumps(result,indent=2));audit_image(result)
  assert result['maps']==27 and result['total']>=100
  print('PASS cabinet central approach',json.dumps({'maps':result['maps'],'total':result['total'],'clear':result['total']-len(result['blocked']),'offsets':result['offsets'],'blocked':[{k:r[k]for k in ['id','tx','ty','fl']}for r in result['blocked']],**unit}),flush=True)
  await b.close()
  if '--require-clear'in sys.argv:assert not result['blocked'], 'Repair the blocked furniture/walls listed in cabinet-audit.json'
def audit_image(report):
 rows=report['blocked']+[r for r in report['rows']if r['stand']and r['old']and r['old']['offset']][:3]
 if not rows:rows=[r for r in report['rows']if(r['id'],r['tx'],r['ty'],r['fl'])in[('m4',7,18,1),('m5',13,8,0),('city',8,6,1),('city',16,14,1),('city',36,26,1),('city',68,26,1)]]
 im=Image.new('RGB',(1050,90+370*((len(rows)+2)//3)), '#182630');d=ImageDraw.Draw(im);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
 d.text((20,15),'Cabinet physical audit: amber=route end, cyan=safe center, red=blocked',font=font,fill='#e2e7e8');d.text((20,40),'World grid snapshots; diagnostic cells are not game art',font=font,fill='#9fadb5')
 for i,r in enumerate(rows):
  x0=15+i%3*350;y0=90+i//3*370;d.text((x0,y0),f"{r['id']} {r['type']} {r['tx']},{r['ty']} floor {r['fl']+1}",font=font,fill='#edf1e8');line0=r['neighborhood'][0];gx=line0[0]['x'];gy=line0[0]['y'];scale=1.1;pitch=48*scale
  for line in r['neighborhood']:
   for cell in line:
    x=x0+(cell['x']-gx)*pitch;y=y0+35+(cell['y']-gy)*pitch;color='#4d5960'if cell['solid']else'#253c46';d.rectangle((x,y,x+pitch-1,y+pitch-1),fill=color,outline='#687780');d.text((x+5,y+4),cell['ch'],font=font,fill='#e1e4d9')
  for name,col in [('old','#ffbf4b'),('center','#43dbe4'if r['stand']else'#f27166')]:
   point=r[name]['stand']if name=='old'and r[name]else r[name]if name=='center'else None
   if point:
    x=x0+(point['x']/48-gx)*pitch;y=y0+35+(point['y']/48-gy)*pitch;rad=14*scale;d.ellipse((x-rad,y-rad,x+rad,y+rad),outline=col,width=3);d.line((x-4,y,x+4,y),fill=col,width=2);d.line((x,y-4,x,y+4),fill=col,width=2)
  status='center blocked'if not r['stand']else f"route horizontal offset {r['old']['offset']}px";d.text((x0,y0+327),status,font=font,fill='#f9a797'if not r['stand']else'#c5dcd7')
 im.save(O/'cabinet-physical-audit.png')
if __name__=='__main__':asyncio.run(main())
