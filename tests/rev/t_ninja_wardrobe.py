"""Costume silhouettes, identity/contact continuity and existing campaign roles."""
import asyncio,base64,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/ninja-v245'

def check_sources():
 m=json.loads((R/'build/pr/pr_meta.json').read_text());count=0
 for name in ['coat','vest','jacket','guardPatrol']:
  bm=m['bodies'][name];im=Image.open(R/'build/pr'/('body_'+name+'.webp')).convert('RGBA')
  for anim,(col,n)in bm['anims'].items():
   for d in range(8):
    for f in range(n):
     box=im.crop(((col+f)*64,d*64,(col+f+1)*64,(d+1)*64)).getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
     assert box and min(box[:2])>0 and max(box[2:])<64,(name,anim,d,f,box);count+=1
 # The bright sixth channel belongs to the sash, not a skin/hair antialias edge.
 def accents(name):
  bm=m['bodies'][name];col=bm['anims']['idle'][0];im=Image.open(R/'build/pr'/('body_'+name+'.webp')).convert('RGBA').crop((col*64,128,(col+1)*64,192))
  return sum(1 for r,g,b,a in im.get_flattened_data()if a>128 and r>215 and g>215 and b<60 and abs(r-g)<35)
 assert accents('heroAgent')>=4 and accents('heroAgentFormal')==0
 return count

async def main():
 O.mkdir(exist_ok=True);count=check_sources()
 async with async_playwright()as p:
  b=await p.chromium.launch()
  for mobile in [False,True]:
   q=await b.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},has_touch=mobile,is_mobile=mobile);errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
   await q.add_init_script('requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri());await q.wait_for_function('!!__game&&__game.castArtReady');await q.evaluate('document.fonts.ready')
   roles=await q.evaluate('''()=>{const G=__game,seen=new Set(),check=(v,m)=>{if(!v)throw Error(m)};
    for(const st of G.STAGES){G.start(G.STAGES.indexOf(st));while(G.DLG.modal)G.advanceDialog();
     for(const g of G.S.guards){const key=G.characterLook(g),bn=key.includes('@')?key.split('@')[1]:G.PR.looks[key];if(bn)seen.add(bn);
      const d=G.STAGE._g?.[g.id];if(d?.body!==undefined&&!g.outfit)check(g.body===d.body,'authored body changed '+st.id);
      if(g.child)check(g.body==='kid','child replaced with adult');
      if(g.target&&G.STAGE.targetCast?.[g.tag])check(key===G.STAGE.targetCast[g.tag].key,'officer loses personal outfit '+st.id);
      const pal=G.characterPalette(g);if(pal)check(pal.length===6&&pal.every(c=>/^#[a-f0-9]{6}$/i.test(c)),'invalid palette '+key);
     }
    }
    for(const n of ['coat','vest','jacket','guardPatrol'])check(seen.has(n),'new wardrobe absent from campaign '+n);
    for(const key of ['sam','samB','samR','hunter']){const g={id:0,kind:key==='samB'?'g2':key==='samR'?'g3':'g1',lookout:key==='hunter'};check(JSON.stringify(G.characterPalette(g).slice(2,5))===JSON.stringify(G.characterPalette({id:0,kind:'g1'}).slice(2,5)),'faction uniform changes colour');}
    const guard=G.PR.bodies[G.PR.looks.sam];for(const n of ['idleC','walk','run','punch','climb','hold','death'])check(guard.anims[n],'guard action falls back to old uniform '+n);
    return{maps:G.STAGES.length,newWardrobes:[...seen].filter(n=>['coat','vest','jacket','guardPatrol'].includes(n)),authoredCastPreserved:true,childrenPreserved:true,factionColourPreserved:true};}''')
   await q.evaluate('''async()=>{const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='tB'));while(G.DLG.modal)G.advanceDialog();await Promise.all(Object.keys(G.PR.bodies).filter(n=>n.startsWith('heroAgent')||['coat','vest','jacket','fLong','male','guardPatrol','worker'].includes(n)).map(n=>G.prLoadBody(n)));}''')
   checks=await q.evaluate('''()=>{const G=__game,P=G.S.player,ok=(v,m)=>{if(!v)throw Error(m)},looks=[];let identity;let contacts=0;
    const cv=document.createElement('canvas');cv.width=cv.height=128;
    const portrait=()=>{G.drawFace(cv,G.speakerOf('hero'));return cv.toDataURL();},face=portrait();
    for(const[outfit,disguise,bn]of[[null,null,'heroAgent'],['crew','sam','heroAgentCrew'],['staff','staff','heroAgentWorker'],['waiter','waiter','heroAgentFormal']]){
     P.outfit=outfit;P.disguise=disguise;const key=G.characterLook(P),pal=G.characterPalette(P),skinHair=JSON.stringify(pal.slice(0,2));
     ok((key.includes('@')?key.split('@')[1]:G.PR.looks[key])===bn,'wrong costume '+outfit);if(identity)ok(identity===skinHair,'disguise changes face/hair');identity=skinHair;ok(portrait()===face,'disguise changes portrait');
     for(const anim of ['walk','run','sneak','carry','stab','choke','climb','dress'])ok(G.fluidSprite(key,anim,.3,0)?.key.includes(bn),'action changes costume '+outfit+':'+anim);
     for(let i=0;i<=16;i++){const at={x:300,y:250},s=G.climbContact(key,0,i/4,at);ok(s&&Math.abs((s.hands[0].x+s.hands[1].x)/2-at.x)<.001&&Math.abs((s.hands[0].y+s.hands[1].y)/2-at.y)<.001,'climbing loses grip '+outfit);contacts++;}
     looks.push({outfit,key});
    }
    P.outfit=P.disguise=null;return{looks,contacts,stableIdentity:true,defaultOnlySash:true};}''')
   if not mobile:
    data=await q.evaluate('''()=>{const G=__game,c=G.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle='#1b232d';c.fillRect(0,0,1280,900);c.textAlign='center';c.font='20px IBM Plex Sans KR';c.fillStyle='#e5dfd2';c.fillText('여성 닌자 · 게임에서 사용하는 실제 스프라이트',640,38);
     for(let d=0;d<8;d++){G.drawPR('ninja',80+d*160,160,d*Math.PI/4,'idleC',.2,1,2);c.fillStyle='#ccd1d4';c.font='14px IBM Plex Sans KR';c.fillText(['E','SE','S','SW','W','NW','N','NE'][d],80+d*160,185);}
     const poses=['walk','run','sneak','stab','choke','carry','climb','dress'];for(let i=0;i<8;i++){G.drawPR('ninja',80+i*160,360,Math.PI/2,poses[i],.4,1,2,0,['stab','choke'].includes(poses[i])?5:-1);c.fillStyle='#ccd1d4';c.fillText(['걷기','달리기','웅크림','암살','기절','운반','등반','변장'][i],80+i*160,390);}
     const outfits=['ninja','sam@heroAgentCrew','staff@heroAgentWorker','waiter@heroAgentFormal'];for(let i=0;i<4;i++){G.drawPR(outfits[i],260+i*250,565,Math.PI/2,'idleC',.3,1,2.3);c.fillStyle='#ccd1d4';c.fillText(['잠입복','경비 제복','작업복','정장'][i],260+i*250,600);}
     const keys=['civ4@male','civ4@coat','civ4@vest','civ4@jacket','civ4@fLong','sam','samB','staff@worker'];for(let i=0;i<8;i++){G.drawPR(keys[i],80+i*160,790,Math.PI/2,'idleC',.3,1,2);c.fillStyle='#ccd1d4';c.fillText(['셔츠','긴 코트','조끼','짧은 재킷','원피스','일반 경비','정예 경비','작업복'][i],80+i*160,825);}c.restore();return c.canvas.toDataURL();}''')
    (O/'wardrobe-gallery.png').write_bytes(base64.b64decode(data.split(',')[1]))
   assert not errors,errors;print('PASS ninja wardrobe',mobile,json.dumps({**roles,**checks,'uncroppedNpcFrames':count}),flush=True);await q.close()
  await b.close()
if __name__=='__main__':asyncio.run(main())
