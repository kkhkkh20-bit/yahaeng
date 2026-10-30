"""Modular people: complete action sheets and stable identity through disguises."""
import asyncio,json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
SK='''()=>{const g=window.__game;for(let i=0;i<50&&g.DLG.modal;i++)g.advanceDialog()}'''
async def main():
 meta=json.loads((ROOT/'build/pr/pr_meta.json').read_text())
 assert meta['style']=='modular'
 required={'idle','walk','run','sneak','crouch','hang','carry','carried','grab','held','climb','vault','lift','lifted','stab','stabbed','choke','choked','hold','hug','hugStep'}
 for body in ['hero','heroSuit','heroWorker','heroCrew']:
  bm=meta['bodies'][body];assert required<=bm['anims'].keys(),body
  im=Image.open(ROOT/f'build/pr/body_{body}.webp').convert('RGBA');fr=meta['fr']
  assert im.size==(bm['cols']*fr,8*fr)
  for direction in range(8):
   for anim,(col,n) in bm['anims'].items():
    for i in range(n):
     a=im.crop(((col+i)*fr,direction*fr,(col+i+1)*fr,(direction+1)*fr)).getchannel('A')
     assert a.getbbox(),(body,direction,anim,i)
 assert len(meta['holdHand'])==8 and all(len(p)==2 for p in meta['holdHand'])
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'build/preview_city.html').as_uri()+'?nostats');await pg.wait_for_function('!!window.__game')
  await pg.evaluate('window.__game.start(0)');await pg.evaluate(SK)
  looks=await pg.evaluate('''()=>{const g=window.__game,P=g.S.player,out=[];for(const [of,pal] of [[null,null],['crew','samB'],['staff','staff'],['courier','courier'],['waiter','waiter'],['cater','cater']]){P.outfit=of;P.disguise=pal;out.push({outfit:of,key:g.characterLook(P),skinHair:g.characterPalette(P).slice(0,2)});}P.outfit=null;P.disguise=null;return out}''')
  assert len({x['key'] for x in looks})==6
  for x in looks:
   body=x['key'].split('@')[1] if '@' in x['key'] else meta['looks'][x['key']]
   assert meta['bodyGender'][body]=='female',x
   assert x['skinHair']==looks[0]['skinHair'],x
  npc=await pg.evaluate('''()=>{const g=window.__game;return ['staff','courier','waiter'].map(outfit=>g.characterLook({outfit,civ:true,body:'fBob',look:0,id:1}))}''')
  assert all(meta['bodyGender'][x.split('@')[1]]=='female' for x in npc),npc
  # A pre-existing body key from a saved game must still resolve to a baked sheet.
  for key in ['big','fLong','fBob','fTail','old','coat','pack','kid','helmet']:assert key in meta['bodies']
  assert meta['faces']['cols']['hero']!=meta['faces']['cols']['suit']
  await pg.wait_for_timeout(600)
  assert not errors,errors
  # Palette compaction must preserve neutral pixels, semi-transparent edges,
  # all five key colors, and the previous Float32 rounding behaviour.
  source=(ROOT/'src/js/15_graphics.js').read_text()
  functions=source[source.index('function prPrep(img) {'):source.index('const prSplit =')]
  parity=await pg.evaluate('''(functions)=>{
   const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(',');
   return new Function('hexRgb',functions+`
    const cv=document.createElement('canvas');cv.width=32;cv.height=16;
    const cx=cv.getContext('2d');const colors=['#ff0000','#00ff00','#0000ff','#ff00ff','#00ffff','#777777','#171a20','#aa4422'];
    colors.forEach((c,i)=>{cx.globalAlpha=i%2?.3:1;cx.fillStyle=c;cx.fillRect(i*3,2,2,10)});
    const base=prPrep(cv),pal=['#e6b38a','#141414','#313b46','#34404e','#161a1e'];
    const actual=prPaint(base,pal).getContext('2d').getImageData(0,0,32,16).data;
    const expected=cx.getImageData(0,0,32,16).data,P=pal.map(h=>hexRgb(h).split(',').map(Number)),K=[[1,0,0],[0,1,0],[0,0,1],[1,0,1],[0,1,1]];
    for(let j=0;j<expected.length;j+=4){const rgb=Array.from(expected.slice(j,j+3)),mx=Math.max(...rgb),ch=mx-Math.min(...rgb);if(!expected[j+3]||ch<20||!mx)continue;
     let k=0,bd=9;K.forEach((v,i)=>{const q=v.reduce((q,x,c)=>q+(rgb[c]/mx-x)**2,0);if(q<bd){bd=q;k=i}});
     const wt=Math.fround(Math.min(1,(ch-20)/60)),s=Math.fround(Math.min(1.35,mx/255*1.25));for(let c=0;c<3;c++)expected[j+c]=P[k][c]*s*wt+rgb[c]*(1-wt);
    }
    // Canvas stores premultiplied alpha; read both paths through a canvas.
    const ref=cx.createImageData(32,16);ref.data.set(expected);cx.putImageData(ref,0,0);const roundtrip=cx.getImageData(0,0,32,16).data;
    return {equal:Array.from(actual).every((x,i)=>x===roundtrip[i]),sparse:base.pixels.length<32*16};
   `)(hexRgb);
  }''',functions)
  assert parity=={'equal':True,'sparse':True},parity
  await b.close()
 print('characters: full 8-direction action sheets, female disguises/NPCs, old body keys and portraits passed')
asyncio.run(main())
