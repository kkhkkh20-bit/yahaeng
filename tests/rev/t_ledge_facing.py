"""All four edge profiles use real sprite rows and keep hands on the same grip."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();q=await b.new_page();await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto((R/'build/preview_city.html').as_uri()+'?nostats');await q.wait_for_function('!!window.__game',polling=100)
  await q.click('#btnQuick');await q.click('#btnBrGo');await q.wait_for_timeout(250)
  rows=await q.evaluate('''()=>{
   const G=__game,P=G.S.player,c=G.ctx,draw=c.drawImage,rows=[],ok=(v,m)=>{if(!v)throw Error(m)};
   for(const [nx,ny,row]of [[1,0,0],[0,1,2],[-1,0,4],[0,-1,6]]){
    Object.assign(P,{x:400,y:400,fl:0,z:1,ledge:{x:nx,y:ny},jump:null,trav:null,wire:null,hide:null,moving:false});
    G.S.ledgePull=null;const h=G.ledgeGrip(P),key=G.characterLook(P),m=G.PR.bodies?.[key.includes('@')?key.split('@')[1]:G.PR.looks?.[key]]||G.PR,s=m.scales?.hang||G.PR.scales?.hang||1;
    const samples=[];c.drawImage=function(...a){if(a.length===9)samples.push(a);return draw.apply(this,a)};
    try{G.drawPlayer(P)}finally{c.drawImage=draw;}
    ok(samples.length,'actual hanging sprite not drawn');const a=samples[samples.length-1];
    ok(a[2]===row*G.PR.fr,'edge profile reversed '+[nx,ny]);
    const hands=m.hangHands?.[row]?.[0]||G.PR.hangHands[row][0],hx=(hands[0][0]+hands[1][0])/2,hy=(hands[0][1]+hands[1][1])/2;
    ok(Math.abs(a[5]+hx*s-h.x)<.01&&Math.abs(a[6]+hy*s-h.y)<.01,'sprite hands leave wall grip '+JSON.stringify({normal:[nx,ny],row,h,key,scale:s,hands,draw:a.slice(1),anim:m.anims.hang}));
    const root=G.ledgeRoot(P);ok(Math.abs(root.x-(a[5]+G.PR.fr*s/2))<.01,'release root uses a different facing');
    rows.push({normal:[nx,ny],spriteRow:row,grip:h,root});
   }
   return rows;
  }''')
  out=R/'build/lights-v181';out.mkdir(exist_ok=True);(out/'ledge-facing.json').write_text(json.dumps(rows,indent=2));print('PASS four actual hanging sprite profiles, pinned hands and release roots');await b.close()
asyncio.run(main())
