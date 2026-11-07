// A room has one wall control. Lights remain at their authored positions so
// changing the fixture/control does not silently change stealth illumination.
const lampCircuit = l => l.circuit ? S.lamps.filter(o=>o.circuit===l.circuit) : [l];
const sameLampCircuit = (a,b) => !!a&&!!b&&(a===b||!!a.circuit&&a.circuit===b.circuit);
const lampCircuitOff = l => lampCircuit(l).every(o=>o.off||o.broken);
function setLampCircuit(l,off) {
  for(const o of lampCircuit(l))if(!o.broken&&o.cut==null)o.off=off;
  refreshBodyLighting();
}
function syncRoomSwitches() {
  const L0=CUR_F,regions=new Map(),doors=new Set();
  S.lightRooms={};
  for(const d of S.doors||[])for(const p of d.group||[d])doors.add((flOf(p)||0)+':'+p.tx+','+p.ty);
  for(const l of S.lamps) {
    if(l.outdoor||l.hearth)continue;
    const fl=flOf(l),bi=bldAt(Math.floor(l.x/TILE),Math.floor(l.y/TILE)),b=BLD[bi],p=PLANS[bi]?.[fl];setLayer(fl);
    const tx=Math.floor(l.x/TILE),ty=Math.floor(l.y/TILE);
    const rooms=p?[p.store,...p.units.flatMap(u=>[u.living,...u.rooms,u.bath])].filter(Boolean):[];
    const room=rooms.filter(r=>tx>=r.x0&&tx<=r.x1&&ty>=r.y0&&ty<=r.y1).sort((a,b)=>(a.x1-a.x0+1)*(a.y1-a.y0+1)-(b.x1-b.x0+1)*(b.y1-b.y0+1))[0];
    const bounds=room||b||{x0:0,y0:0,x1:MW-1,y1:MH-1};
    const key=fl+':'+bi+':'+[bounds.x0,bounds.y0,bounds.x1,bounds.y1].join(',');
    let region=regions.get(key);
    if(!region){
      const seen=new Map(),parts=[];
      const inside=(x,y)=>x>=bounds.x0&&x<=bounds.x1&&y>=bounds.y0&&y<=bounds.y1&&inMap(x,y)&&!'#NVHOW~UP'.includes(G[y][x])&&!doors.has(fl+':'+x+','+y);
      for(let y=bounds.y0;y<=bounds.y1;y++)for(let x=bounds.x0;x<=bounds.x1;x++){
        if(!inside(x,y)||seen.has(x+','+y))continue;
        const part={id:parts.length,cells:[],sites:[]},q=[[x,y]];seen.set(x+','+y,part);
        for(let i=0;i<q.length;i++){
          const [cx,cy]=q[i];part.cells.push([cx,cy]);
          if(!SOLID.has(G[cy][cx]))for(const [nx,ny]of N8.slice(0,4)){
            if(G[cy+ny]?.[cx+nx]!=='#')continue;
            const at={x:tc(cx)+nx*19,y:tc(cy)+ny*19,fl,z:0,nx,ny,tx:cx,ty:cy};
            const entrances=(room?.door?[room.door]:[]).concat((S.doors||[]).filter(d=>flOf(d)===fl).map(d=>[d.tx,d.ty]));
            at.score=entrances.length?Math.min(...entrances.map(([dx,dy])=>Math.hypot(cx-dx,cy-dy))):Math.hypot(cx-tx,cy-ty);
            // Prefer an entry wall; leave the actual doorway and floor free.
            if(entrances.some(([dx,dy])=>Math.abs(cx-dx)+Math.abs(cy-dy)<=2))at.score-=4;
            part.sites.push(at);
          }
          for(const [dx,dy]of N8.slice(0,4)){const nx=cx+dx,ny=cy+dy,k=nx+','+ny;if(inside(nx,ny)&&!seen.has(k)){seen.set(k,part);q.push([nx,ny]);}}
        }
        part.sites.sort((a,b)=>a.score-b.score||a.ty-b.ty||a.tx-b.tx);parts.push(part);
      }
      region={seen,parts};regions.set(key,region);
    }
    let part=region.seen.get(tx+','+ty);
    if(!part){let best=Infinity;for(const candidate of region.parts)for(const [x,y]of candidate.cells){const d=Math.hypot(x-tx,y-ty);if(d<best){best=d;part=candidate;}}}
    const authored=l.authoredControl&&l.control;
    const at=authored||part?.sites[0];
    // An inaccessible fixture is never a magical switch in the room centre.
    l.control=at?{...at}:null;
    l.circuit=at?(authored?'authored:'+fl+':'+at.x+','+at.y:'room:'+key+':'+part.id):null;
    l.roomSwitch=!!at;
    if(part?.sites.length){
      const used=part.fixtureSites||(part.fixtureSites=[]);
      const sites=part.sites.filter(s=>!used.some(u=>dist(u.x,u.y,s.x,s.y)<32));
      const site=(sites.length?sites:part.sites).reduce((best,s)=>!best||dist(l.x,l.y,s.x,s.y)<dist(l.x,l.y,best.x,best.y)?s:best,null);
      l.fixture={x:site.x+site.nx*5,y:site.y+site.ny*5,nx:-site.nx,ny:-site.ny};used.push(site);
    }else l.fixture=null;
    l.roomName=room===p?.store?({club:'클럽',vip:'VIP룸',office:'사무실',pc:'PC방',food:'식당'}[room?.use]||'실내'):p?.units.some(u=>u.bath===room)?'욕실':p?.units.some(u=>u.living===room)?'거실':room?'방':'실내';
    if(l.circuit&&!S.lightRooms[l.circuit])S.lightRooms[l.circuit]={fl,cells:(part?.cells||[[tx,ty]]).map(([x,y])=>y*MW+x)};
  }
  setLayer(L0);
}
function roomLightOccupants(l) {
  const room=S.lightRooms?.[l.circuit];if(!room)return [];
  return S.guards.filter(g=>!g.dog&&!g.child&&!g.doomed&&!g.climb&&!g.z&&flOf(g)===room.fl&&['PATROL','RETURN','SUSPICIOUS'].includes(g.state)&&room.cells.includes(Math.floor(g.y/TILE)*MW+Math.floor(g.x/TILE)));
}
function reactToRoomDarkness(l,watchers) {
  const people=roomLightOccupants(l),at=lampControl(l);
  for(const g of people){
    endChat(g);g.path=null;g.act=null;g.glanceA=Math.atan2(at.y-g.y,at.x-g.x);g.want=g.glanceA;g.soundWatchUntil=S.t+1.5;g.lightNoticeUntil=S.t+2.4;setIcon(g,'?');
    gsay(g,g.civ?'어? 불이 왜 꺼졌지?':'불이 꺼졌네. 스위치 확인해.',2.4);
  }
  const repair=people.filter(g=>!g.target).sort((a,b)=>(a.civ?1:0)-(b.civ?1:0)||dist(a.x,a.y,at.x,at.y)-dist(b.x,b.y,at.x,at.y))[0];
  if(repair&&!S.guards.some(g=>g.relight&&sameLampCircuit(g.relight.l,l))){
    repair.state='PATROL';repair.relight={l,t:.8,delay:1.3,roomNotice:true};repair.path=null;
  }else if(!people.length)respondToLampOff(l,watchers);
}
function updateRoomRelight(g,dt,spd) {
  const work=g.relight;if(!work)return false;
  const l=work.l,at=lampControl(l);
  if(!l.off||l.broken||l.cut!=null){g.relight=null;g.path=null;return true;}
  g.want=Math.atan2(at.y-g.y,at.x-g.x);g.a+=clamp(angDiff(g.a,g.want),-4*dt,4*dt);
  if(work.delay>0){work.delay-=dt;return true;}
  if(dist(g.x,g.y,at.x,at.y)>34||!los(g.x,g.y,at.x,at.y,g.z||0)){
    work.approach=(work.approach||0)+dt;
    if(work.approach>10){g.relight=null;g.path=null;g.relightRetryAt=S.t+6;return true;}
    if(!g.path?.length)pathTo(g,at.x,at.y);moveAlong(g,spd,dt);return true;
  }
  g.path=null;g.moving=false;work.t-=dt;
  if(work.t<=0){setLampCircuit(l,false);g.relight=null;g.icon=null;play('switch',.4*proxVol(g));gsay(g,'불은 켜 둬야지.',1.8);if(dist(g.x,g.y,S.player.x,S.player.y)<700)toast((g.civ?'주민':'경비')+'이 스위치로 조명을 다시 켰다',2);if(!g.civ)setAlert(1,20);}
  return true;
}
