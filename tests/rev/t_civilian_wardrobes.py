"""Four civilian silhouettes keep animation roles, actor scale and campaign identities.
Gallery/map screenshots use the real renderer with positioned inspection cameras.
"""
import asyncio,base64,json,os
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/wardrobes-v247'
BODIES=['hoodieCasual','workApron','femaleCoat','femaleBlazer']
REQUIRED={'idle','walk','run','crouch','death','carried','carriedI','held','heldI','lifted','stabbed','choked','idleC','talk'}
def sources():
 m=json.loads((R/'build/pr/pr_meta.json').read_text());count=0
 for body in BODIES:
  assert REQUIRED<=m['bodies'][body]['anims'].keys(),body
  assert m['bodyGender'][body]==('female'if body.startswith('female')else'male')
  for name in [body,body+'Motion',body+'ReactMotion']:
   bm=m['bodies'][name];a=Image.open(R/'build/pr'/('body_'+name+'.webp')).convert('RGBA');assert a.size==(bm['cols']*64,512)
   for anim,(col,n)in bm['anims'].items():
    for d in range(8):
     for f in range(n):
      box=a.crop(((col+f)*64,d*64,(col+f+1)*64,(d+1)*64)).getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
      assert box and min(box[:2])>0 and max(box[2:])<64,(name,anim,d,f,box);count+=1
  assert set(m['bodies'][body+'ReactMotion']['anims'])=={'stabbed','choked','death'}
 return count
async def main():
 count=sources();O.mkdir(exist_ok=True)
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--enable-unsafe-swiftshader'])
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 1000},has_touch=mobile,is_mobile=mobile);errs=[];q.on('pageerror',lambda e:errs.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');base=os.environ.get('YH_TEST_BASE_URL');await q.goto(base.rstrip('/')+'/build/preview_city.html'if base else(R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.PR.bodies.femaleBlazer');await q.evaluate('document.fonts.ready')
   roles=await q.evaluate('''()=>{const G=__game,want=['hoodieCasual','workApron','femaleCoat','femaleBlazer'],seen=new Set(),main=new Set(),locations={};let explicit=0,children=0,bosses=0;
    for(const id of G.STAGES.map(s=>s.id)){G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();for(const g of G.S.guards){const d=G.STAGE._g?.[g.id];if(d?.body!==undefined&&!g.child){if(g.body!==d.body)throw Error('explicit body changed '+id);explicit++;}if(g.child){if(g.body!=='kid')throw Error('child replaced');children++;}if(g.target&&G.STAGE.targetCast?.[g.tag]){if(G.characterLook(g)!==G.STAGE.targetCast[g.tag].key)throw Error('officer wardrobe changed');bosses++;}if(want.includes(g.body)&&g.civ&&!g.outfit){if(!G.characterLook(g).endsWith('@'+g.body))throw Error('new body falls back');seen.add(g.body);if(G.LEARNING_ROUTE.includes(id)){main.add(g.body);locations[g.body]??={id,guard:g.id};}}}}
    if(main.size!==4)throw Error('new garments absent from main campaign '+JSON.stringify([...main]));
    const hero=G.PR.playerLooks;if(G.PR.looks.ninja!=='heroAgent'||hero.crew!=='heroAgentCrew'||hero.staff!=='heroAgentWorker'||hero.waiter!=='heroAgentFormal')throw Error('hero wardrobe changed');
    for(const body of ['femaleCoat','femaleBlazer']){const look=G.characterLook({id:5,civ:true,body,outfit:'staff',look:0});if(G.PR.bodyGender[look.split('@')[1]]!=='female')throw Error('female role becomes male');}
    return{maps:G.STAGES.length,mainWardrobes:[...main],locations,explicit,children,bosses,heroPreserved:true};}''')
   await q.evaluate('''async()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();await Promise.all(['hoodieCasual','workApron','femaleCoat','femaleBlazer'].flatMap(n=>[n,n+'Motion',n+'ReactMotion']).map(n=>G.prLoadBody(n)));}''')
   render=await q.evaluate('''()=>{const G=__game,c=G.ctx,want=['hoodieCasual','workApron','femaleCoat','femaleBlazer'],out=[];c.canvas.width=c.canvas.height=256;c.setTransform(1,0,0,1,0,0);
    for(const body of want){let signature='',lo=999,hi=0;const k='civ4@'+body;for(let d=0;d<8;d++){c.clearRect(0,0,256,256);if(!G.drawPR(k,128,128,d*Math.PI/4,'idleC',.3))throw Error('blank body '+body);const px=c.getImageData(0,0,256,256).data;let top=256,bottom=0,n=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(px[(y*256+x)*4+3]>128){top=Math.min(top,y);bottom=Math.max(bottom,y);n++;}if(!n)throw Error('body has no pixels');const h=bottom-top+1;lo=Math.min(lo,h);hi=Math.max(hi,h);signature+=Array.from(px).filter((v,i)=>i%4===3).map(v=>v>128?'1':'0').join('');}
     if(lo<35||hi>60)throw Error('new body scale differs from people '+body+':'+lo+','+hi);
     for(const anim of ['stabbed','choked','death'])if(!G.fluidSprite(k,anim,.3,1)?.key.includes(body+'ReactMotion'))throw Error('reaction changes body '+body);
     const pal=G.characterPalette({id:7,civ:true,body,look:2});if(pal.length!==6)throw Error('palette contract changed');out.push({body,minHeight:lo,maxHeight:hi,signature});}
    if(new Set(out.map(o=>o.signature)).size!==4)throw Error('wardrobes only recolour the same silhouette');return out.map(({signature,...r})=>r);}''')
   if not mobile:
    data=await q.evaluate('''()=>{const G=__game,c=G.ctx;c.canvas.width=1280;c.canvas.height=1000;c.setTransform(1,0,0,1,0,0);c.fillStyle='#182630';c.fillRect(0,0,1280,1000);c.fillStyle='#e0dfd3';c.textAlign='center';c.font='20px IBM Plex Sans KR';c.fillText('새 주민 복장 · 실제 게임 렌더러',640,32);c.font='14px IBM Plex Sans KR';c.fillText('기존 팔레트 · 동일 크기 · 8방향과 운반/피해 반응 유지',640,58);const bodies=['hoodieCasual','workApron','femaleCoat','femaleBlazer'],names=['후드','앞치마 작업복','여성 롱코트','여성 블레이저'];for(let i=0;i<4;i++){const y=180+i*205;c.fillStyle='#d0d9dc';c.fillText(names[i],100,y+28);for(let d=0;d<8;d++){G.drawPR('civ4@'+bodies[i],230+d*138,y,d*Math.PI/4,'idleC',.3,1,2.6);c.fillStyle='#a8b9bf';c.fillText(['E','SE','S','SW','W','NW','N','NE'][d],230+d*138,y+40);}for(let a=0;a<4;a++)G.drawPR('civ4@'+bodies[i],390+a*165,y+84,Math.PI/2,['walk','run','carried','stabbed'][a],.35,1,1.5,0,a>1?2:-1);}return c.canvas.toDataURL();}''');(O/'npc-wardrobes.png').write_bytes(base64.b64decode(data.split(',')[1]))
   assert not errs,errs;(O/('touch.json'if mobile else'pc.json')).write_text(json.dumps({'roles':roles,'render':render,'frames':count,'errors':errs},indent=2));print('PASS civilian wardrobes',mobile,json.dumps({'frames':count,'roles':roles,'render':render}),flush=True);await q.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
