"""Authored prop bounds, cast continuity and a deliberately delayed atlas load.
Uses positioned/frozen fixtures; native campaign play is verified separately.
"""
import asyncio,hashlib,json,math
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2];O=R/'build/art-v208';O.mkdir(exist_ok=True)

async def main():
 root=R/'src/art/prop-finish';meta=json.loads((root/'meta.json').read_text());image=Image.open(root/'atlas.webp').convert('RGBA')
 assert image.size==(meta['w'],meta['h']) and max(image.size)<=4096
 kinds=set()
 for key,a in meta['frames'].items():
  kinds.add(a['kind']);assert all(math.isfinite(a[k])for k in ['ox','oy','sx','sy','w','h']),key
  assert a['sx']>=0 and a['sy']>=0 and a['sx']+a['w']<=image.width and a['sy']+a['h']<=image.height,key
  box=image.crop((a['sx'],a['sy'],a['sx']+a['w'],a['sy']+a['h'])).getchannel('A').point(lambda v:255 if v>32 else 0).getbbox();assert box,key
  # A displaced mesh or a long baked shadow must not cross the footprint edges.
  assert a['ox']+box[0]>=-4 and a['ox']+box[2]<=a['footprint'][0]*48+4,(key,'horizontal projection',a,box)
  assert a['oy']+box[3]<=a['footprint'][1]*48+4,(key,'below ground',a,box)
 assert len(kinds)>=39 and {'spk','sink','desk2','pc','safe','rug','shelf'}<=kinds
 digest=hashlib.sha256((root/'atlas.webp').read_bytes()).hexdigest()[:20]
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page(viewport={'width':1280,'height':800});errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  release=asyncio.Event();blocked=asyncio.Event()
  async def hold(route):blocked.set();await release.wait();await route.continue_()
  await q.route('**/assets/'+digest+'.webp',hold)
  await q.add_init_script('localStorage.clear();window.requestAnimationFrame=()=>0')
  try:
   await q.goto((R/'public/index.html').as_uri()+'?nostats&review=art-finish',wait_until='domcontentloaded');await q.wait_for_function('!!window.__game',polling=100)
   await asyncio.wait_for(blocked.wait(),10)
   await q.evaluate('''()=>{
    const G=__game;G.start(G.STAGES.findIndex(s=>s.id==='m2'));while(G.DLG.modal)G.advanceDialog();
    if(G.propArtReady)throw Error('late-load fixture did not delay the atlas');
    window.artCore=()=>JSON.stringify([G.GF,G.FURN,G.S.lamps.map(l=>[l.x,l.y,l.r,l.off,l.circuit,l.control]),G.S.guards.map(g=>[g.id,g.x,g.y,g.state,g.route,g.meter]),G.S.stats,G.S.player.x,G.S.player.y]);
     window.artBefore=artCore();window.artMap=G.mapImage();const f=G.FURN.find(f=>f.t==='table'||f.t==='desk2');window.artSurface={surface:f,surfaceU:.5};window.artAnchor=JSON.stringify(G.surfacePoint(artSurface));
   }''')
   release.set();await q.wait_for_function('__game.propArtReady',polling=100)
   assert await q.evaluate('''()=>{const G=__game;G.refreshPropArt();return artCore()===artBefore&&G.mapImage()!==artMap&&Object.keys(G.S.floorC).length===0&&JSON.stringify(G.surfacePoint(artSurface))===artAnchor}'''),'late art load failed to repaint, moved a tabletop object or mutated the world'
   report=await q.evaluate('''async()=>{
    const G=__game,ok=(v,m)=>{if(!v)throw Error(m)},fresh=id=>{G.start(G.STAGES.findIndex(s=>s.id===id));while(G.DLG.modal)G.advanceDialog();return G.S};
    const seen=new Set(),faces=[],hair=new Set(),female=[];let props=0;
    for(const id of ['tB','p0','p1','p2','e1','e2','e3','e4','e5','m2','m4','m6','m7','m5','n1']){
     const S=fresh(id),before=JSON.stringify([G.GF,G.FURN,S.stats,S.guards.map(g=>[g.x,g.y,g.state,g.route,g.meter])]);
     for(const it of G.FURN){seen.add(it.t);const a=G.propArtFrame(it);if(!['dance','locker','wardrobe'].includes(it.t))ok(a,'unreviewed furniture '+id+':'+it.t);if(a){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),state=()=>JSON.stringify([x.getTransform(),x.globalAlpha,x.fillStyle,x.strokeStyle,x.imageSmoothingEnabled]),saved=state();ok(G.drawPropFurn(x,{...it,x:0,y:0},true),'missing live prop '+it.t);ok(state()===saved,'prop leaks drawing state '+it.t);props++;}}
     for(const p of S.props.filter(p=>p.surface)){const at=G.surfacePoint(p),stand=G.surfaceFixture(p),f=p.surface;ok(at.y<(f.y+f.h*.5)*48,'prop is on floor instead of furniture '+id);ok(stand.y===(f.y+f.h/2)*48&&stand.fl===(f.fl||0),'art changed physical reach '+id);}
     ok(before===JSON.stringify([G.GF,G.FURN,S.stats,S.guards.map(g=>[g.x,g.y,g.state,g.route,g.meter])]),'art changes collision, actor or objective state '+id);
     for(const g of S.guards.filter(g=>g.target)){
      const key=G.characterLook(g),body=key.split('@')[1],profile=G.STAGE.targetCast[g.tag],pal=G.characterPalette(g);hair.add(pal[1]);faces.push(profile.name);
      if(['e1','e5','n1'].includes(id)){
       ok(G.PR.bodyGender[body]==='female','female officer uses male silhouette '+id);ok(G.targetPersonaKey(g).includes(body+'PersonaMotion'),'gesture changes the officer body '+id);
       await G.spriteSources.load(body);G.npcDown(g,null,false);const c=S.corpses.at(-1);ok(c?.ch===key&&c.ko,'KO changes the officer body '+id);
       // An older checkpoint can still carry the former male mesh key.
       if(id!=='n1')c.ch=key.split('@')[0]+'@suit';
       G.saveCheckpoint();ok(G.loadCheckpoint()&&G.S.corpses.at(-1).ch===key,'checkpoint loses or fails to migrate body '+id);female.push(profile.name);
      }
     }
    }
    ok(female.length===3&&hair.size>=7,'cast is not visually varied');
    ok(!JSON.stringify([G.STAGES.map(s=>[s.brief,s.story]),G.CASE_SOURCES]).includes('정필수')&&!JSON.stringify([G.STAGES.map(s=>[s.brief,s.story]),G.CASE_SOURCES]).includes('문기석'),'old identity remains in clues');
    return{families:[...seen].sort(),renderedProps:props,femaleOfficers:female,hairColours:hair.size,lateAtlasRepaint:true,worldUnchanged:true,koAndCheckpoint:true};
   }''')
   assert not errors,errors
  finally:release.set();await b.close()
 (O/'checks.json').write_text(json.dumps({'result':report,'assetFamilies':len(kinds),'frames':len(meta['frames']),'atlas':image.size,'errors':errors,'method':__doc__},ensure_ascii=False,indent=2))
 print('PASS art finish',json.dumps(report,ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())
