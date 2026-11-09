// Awake people use lit homes and staff quarters. Sleeping/empty rooms keep their
// night state, and revisiting a checkpoint never silently undoes a blackout.
function syncOccupiedLights(restoring=false){
 if(STAGE.artSlice||S.occupiedLightVersion>=249)return;
 const previous=CUR_F,rooms=new Map();
 try{
  for(const g of S.guards){
   if(g.dog||g.z||g.doomed||['DEAD','CAPTIVE','SLEEP'].includes(g.state))continue;
   const fl=flOf(g);
   for(const at of [{x:g.x,y:g.y},...(g.route||[])]){
    const tx=Math.floor(at.x/TILE),ty=Math.floor(at.y/TILE),bi=bldAt(tx,ty),b=BLD[bi],p=PLANS[bi]?.[fl];
    if(!b||b.vacant||(p&&groundedWorld()&&(b.kind==='shop'||STAGE.workBuildings?.includes(bi))))continue;
    // Hand-authored warehouse/estate floors have no apartment plan. Their
    // actual walls still bound light and switch circuits in syncRoomSwitches.
    const candidates=p?[p.store,...p.units.flatMap(u=>[u.living,...u.rooms,u.bath])].filter(Boolean):[b],room=candidates.filter(r=>tx>=r.x0&&tx<=r.x1&&ty>=r.y0&&ty<=r.y1).sort((a,b)=>(a.x1-a.x0+1)*(a.y1-a.y0+1)-(b.x1-b.x0+1)*(b.y1-b.y0+1))[0];if(!room)continue;
    const key=[bi,fl,room.x0,room.y0,room.x1,room.y1].join(':');
    if(!rooms.has(key))rooms.set(key,{key,bi,fl,room,points:[]});rooms.get(key).points.push(at);
   }
  }
  for(const spec of rooms.values()){
   const{bi,fl,room,key,points}=spec;setLayer(fl);
   const inside=l=>flOf(l)===fl&&!l.outdoor&&!l.hearth&&Math.floor(l.x/TILE)>=room.x0&&Math.floor(l.x/TILE)<=room.x1&&Math.floor(l.y/TILE)>=room.y0&&Math.floor(l.y/TILE)<=room.y1;
   const local=S.lamps.filter(inside),cut=(S.bfuses||[]).some(f=>f.b===bi&&f.cut);
   if(cut||local.some(l=>l.off||l.broken||l.cut!=null))continue;
   if(restoring&&S.lamps.some(l=>!l.outdoor&&!l.hearth&&flOf(l)===fl&&bldAt(Math.floor(l.x/TILE),Math.floor(l.y/TILE))===bi&&(l.off||l.broken||l.cut!=null)))continue;
   const sites=[];
   for(let y=room.y0;y<=room.y1;y++)for(let x=room.x0;x<=room.x1;x++)if(!SOLID.has(G[y]?.[x]))for(const[dx,dy]of N8.slice(0,4))if(G[y+dy]?.[x+dx]==='#')sites.push({x:tc(x)+dx*16,y:tc(y)+dy*16});
   for(const point of points){
    if(local.some(l=>lampOn(l)&&dist(l.x,l.y,point.x,point.y)<l.r*.7&&los(l.x,l.y,point.x,point.y)))continue;
    const at=sites.filter(p=>dist(p.x,p.y,point.x,point.y)<210&&los(p.x,p.y,point.x,point.y)).sort((a,b)=>dist(a.x,a.y,point.x,point.y)-dist(b.x,b.y,point.x,point.y))[0];if(!at)continue;
    const lamp={...at,r:240,fl,outdoor:false,off:false,broken:false,poly:[],col:'246,220,177',occupiedRoom:key,occupiedLight:true};
    rebuildLampPolygon(lamp);S.lamps.push(lamp);local.push(lamp);
   }
  }
  S.occupiedLightVersion=249;LG=null;S.floorC={};for(const key in lightCache)delete lightCache[key];refreshBodyLighting();
 }finally{setLayer(previous);}
}
