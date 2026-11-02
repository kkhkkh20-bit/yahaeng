"""Inventory the active 2D worlds and flag concrete placement/capacity problems."""
import argparse,asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
R=Path(__file__).resolve().parents[1]
async def audit(args):
 async with async_playwright()as p:
  b=await p.chromium.launch();q=await b.new_page();errors=[];q.on('pageerror',lambda e:errors.append(str(e)))
  await q.add_init_script('window.requestAnimationFrame=()=>0;localStorage.clear()');await q.goto(args.url);await q.wait_for_function('!!window.__game')
  data=await q.evaluate('''()=>{
   const G=__game,worlds=[],families=['ladders','hides','bushes','lamps','cams','doors','props','keyItems','items','vents','notes','traps','poles','wires','bfuses','vehicles'];
   for(let si=0;si<G.STAGES.length;si++){
    const st=G.STAGES[si];if(st.artSlice)continue;G.start(si);while(G.DLG.modal)G.advanceDialog();const S=G.S,objects=[],issues=[];
    for(const family of families)for(const [index,o]of(S[family]||[]).entries()){
     const point=o.x!=null?o:o.sw?{x:(o.sw[0]+.5)*48,y:(o.sw[1]+.5)*48}:o.at?{x:(o.at[0]+.5)*48,y:(o.at[1]+.5)*48}:null;
     const row={family,index,kind:o.kind||o.type||o.k||o.id||family,fl:o.fl||0,z:o.z||0,name:o.name||o.text||null};
     if(point){row.x=point.x/48;row.y=point.y/48;if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||row.x<0||row.y<0||row.x>=G.MW||row.y>=G.MH)issues.push({family,index,issue:'out-of-map'});}
     if(family==='hides'){row.capacity=o.cap;if(o.cap>2)issues.push({family,index,issue:'unbounded-body-storage'});}
     if(family==='ladders'){
      row.gas=!!o.gas;row.to={x:o.tx,y:o.ty,fl:o.tfl||0,z:o.tz||0};
      if(o.kind==='ladder'&&G.tileCh(o.tx,o.ty,0)==='U')issues.push({family,index,issue:'loose-ladder-at-cargo'});
      if(o.gas)issues.push({family,index,issue:'gas-line-used-as-ladder'});
      const from={x:o.x,y:o.y,fl:o.bfl||0,z:o.bz||0},stand=G.searchStandNear(from);if(!stand)issues.push({family,index,issue:'no-standing-space-at-access'});
     }
     if(family==='wires')row.ends=[{x:o.a.x/48,y:o.a.y/48},{x:o.b.x/48,y:o.b.y/48}];objects.push(row);
    }
    const tiles={};for(const row of G.G0)for(const ch of row)tiles[ch]=(tiles[ch]||0)+1;
    const furniture=G.FURN?G.FURN.map(f=>({family:'furniture',kind:f.t,x:f.x,y:f.y,w:f.w,h:f.h,fl:f.fl||0})):[];objects.push(...furniture);
    const counts={};for(const o of objects)counts[o.family]=(counts[o.family]||0)+1;
    worlds.push({id:st.id,tutorial:!!st.tutorial,size:[G.MW,G.MH],buildings:G.BLD.map(b=>({name:b.name||b.kind,x0:b.x0,y0:b.y0,x1:b.x1,y1:b.y1,floors:b.h,vacant:!!b.vacant})),counts,tiles,issues,objects});
   }
   return{worlds};
  }''');data['browserErrors']=errors;assert not errors,errors
  out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(data,ensure_ascii=False,indent=2));print(json.dumps({'worlds':len(data['worlds']),'objects':sum(sum(w['counts'].values())for w in data['worlds']),'issues':{w['id']:len(w['issues'])for w in data['worlds']}},ensure_ascii=False));await b.close()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--url',default=(R/'build/preview_city.html').as_uri());parser.add_argument('--output',default=str(R/'build/world-v144/audit.json'));asyncio.run(audit(parser.parse_args()))
