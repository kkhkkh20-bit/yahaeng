// 실외 조명은 벽 또는 기둥을 가진다. 광원의 지면 투영과 스위치 위치를 분리한다.
function outdoorLampCell(x,y) {
  if(!inMap(x,y) || SOLID.has(G0[y][x]) || 'WBY'.includes(G0[y][x]))return false;
  const b=bldAt(x,y);return b<0 || !!BLD[b].vacant;
}
function wallLampSites() {
  const out=[];
  BLD.forEach((b,bi)=>{
    if(b.vacant)return;
    for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++) {
      if(G0[y][x]!=='#')continue;
      for(const [nx,ny]of [[-1,0],[1,0],[0,-1],[0,1]]) {
        if(nx===-1&&x!==b.x0 || nx===1&&x!==b.x1 || ny===-1&&y!==b.y0 || ny===1&&y!==b.y1)continue;
        if(!outdoorLampCell(x+nx,y+ny))continue;
        const ax=x*TILE+(nx===-1?0:nx===1?TILE:TILE/2),ay=y*TILE+(ny===-1?0:ny===1?TILE:TILE/2);
        out.push({kind:'wall',b:bi,tx:x,ty:y,ax,ay,nx,ny,x:ax+nx*14,y:ay+ny*14,height:28});
      }
    }
  });return out;
}
function roadsideLampSite(l,used) {
  const sx=Math.floor(l.x/TILE),sy=Math.floor(l.y/TILE),sites=[];
  for(let y=Math.max(0,sy-4);y<=Math.min(MH-1,sy+4);y++)for(let x=Math.max(0,sx-4);x<=Math.min(MW-1,sx+4);x++) {
    if(!outdoorLampCell(x,y))continue;
    const ch=G0[y][x],adj=[[0,1],[0,-1],[1,0],[-1,0]],road=adj.find(([dx,dy])=>inMap(x+dx,y+dy)&&G0[y+dy][x+dx]==='.');
    const edge=adj.find(([dx,dy])=>!inMap(x+dx,y+dy)||G0[y+dy][x+dx]!=='.');
    if(ch==='.'&&!edge)continue;
    const n=ch==='.'&&edge?[-edge[0],-edge[1]]:road||[0,1],ax=tc(x)-(n[0]||1)*22,ay=tc(y)-(n[1]||1)*22;
    if(used.some(p=>dist(p.x,p.y,ax,ay)<38))continue;
    let px=ax+n[0]*22,py=ay+n[1]*22;
    if(!outdoorLampCell(Math.floor(px/TILE),Math.floor(py/TILE))){px=ax;py=ay;}
    const curb=adj.some(([dx,dy])=>inMap(x+dx,y+dy)&&SOLID.has(G0[y+dy][x+dx]));
    sites.push({kind:'street',ax,ay,nx:n[0],ny:n[1],x:px,y:py,height:46,score:dist(l.x,l.y,ax,ay)+(ch==='='?-16:ch==='.'?20:0)-(road?80:curb?24:0)});
  }
  sites.sort((a,b)=>a.score-b.score);
  // 작은 지도에 보도 재질이 없어도 지지대는 실제 가로등으로 표현한다.
  return sites[0] || {kind:'street',ax:l.x,ay:l.y,nx:0,ny:1,x:l.x,y:l.y,height:46};
}
function mountOutdoorLamps(lamps) {
  const sites=wallLampSites(),used=POLES.map(([x,y])=>({x:tc(x),y:tc(y)}));let changed=0;
  for(const l of lamps) {
    if(!l.outdoor || l.hearth || flOf(l))continue;
    if(l.mountVersion===1&&l.mount){used.push({x:l.mount.ax,y:l.mount.ay});continue;}
    l.origin=l.origin||{x:l.x,y:l.y,fl:l.fl||0};
    if(l.pole) {
      const p=POLES.find(([x,y])=>Math.abs(tc(x)-l.x)<1&&Math.abs(tc(y)-l.y)<TILE);
      if(!p)continue;
      l.mount={kind:'pole',ax:tc(p[0]),ay:tc(p[1]),x:l.x,y:l.y,height:26+p[2]*10};
    } else {
      const choices=sites.filter(p=>dist(l.x,l.y,p.x,p.y)<=120&&!used.some(u=>dist(u.x,u.y,p.ax,p.ay)<38));
      // 빛이 이미 길 위에 있다면 중간 벽을 넘어 다른 골목으로 옮기지 않는다.
      const open=!SOLID.has(G0[Math.floor(l.y/TILE)]?.[Math.floor(l.x/TILE)]);
      const valid=choices.filter(p=>!open||castRay(l.x,l.y,Math.atan2(p.y-l.y,p.x-l.x),dist(l.x,l.y,p.x,p.y),0)>=dist(l.x,l.y,p.x,p.y)-3);
      valid.sort((a,b)=>dist(l.x,l.y,a.x,a.y)-dist(l.x,l.y,b.x,b.y));
      l.mount=valid[0]||roadsideLampSite(l,used);
      l.x=l.mount.x;l.y=l.mount.y;
      l.control={x:l.mount.ax+(l.mount.nx||0)*14,y:l.mount.ay+(l.mount.ny||0)*14,fl:0,z:0};
    }
    used.push({x:l.mount.ax,y:l.mount.ay});l.mountVersion=1;l.poly=null;changed++;
  }return changed;
}
function syncOutdoorLamps() {
  const L0=CUR_F;setLayer(0);const n=mountOutdoorLamps(S.lamps);
  if(n) {
    for(const l of S.lamps)if(l.outdoor&&!flOf(l)) {
      l.poly=[];for(let i=0;i<180;i++){const a=i/180*TAU,d=Math.min(l.r,castRay(l.x,l.y,a,l.r)+20);l.poly.push(l.x+Math.cos(a)*d,l.y+Math.sin(a)*d);}
    }
    LG=null;for(const k in lightCache)delete lightCache[k];
  }setLayer(L0);return n;
}
function collideLightPosts(o,r,solid) {
  if(!S || flOf(o) || o.z || solid!==solidAt&&solid!==groundSolidP)return;
  for(const l of S.lamps) {
    const m=l.mount;if(m?.kind!=='street')continue;
    const dx=o.x-m.ax,dy=o.y-m.ay,R=r+4;if(Math.abs(dx)>=R||Math.abs(dy)>=R)continue;
    const d=Math.hypot(dx,dy);if(d>=R)continue;
    const a=d>.001?Math.atan2(dy,dx):0,choices=[];
    for(const da of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI]) {
      const nx=m.ax+Math.cos(a+da)*R,ny=m.ay+Math.sin(a+da)*R;
      const clear=[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]].every(([x,y])=>!solid(Math.floor((nx+x)/TILE),Math.floor((ny+y)/TILE)));
      if(clear)choices.push({x:nx,y:ny,d:dist(o.x,o.y,nx,ny)});
    }
    choices.sort((a,b)=>a.d-b.d);if(choices.length){o.x=choices[0].x;o.y=choices[0].y;}
  }
}
function drawOutdoorLampFixtures() {
  for(const l of S.lamps) {
    const m=l.mount;if(!l.outdoor||flOf(l)||!m||!inView(m.ax,m.ay,150))continue;
    const on=lampOn(l),x=l.x,y=l.y-m.height;
    ctx.save();
    if(m.kind==='street') {
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(m.ax+4,m.ay+4,10,5,0,0,TAU);ctx.fill();
      ctx.fillStyle='#454e53';ctx.fillRect(m.ax-4,m.ay-8,8,12);
      ctx.strokeStyle='#849194';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(m.ax,m.ay);ctx.lineTo(m.ax,m.ay-m.height);ctx.quadraticCurveTo(m.ax+12,m.ay-m.height-8,x,y);ctx.stroke();
      ctx.strokeStyle='#354249';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(m.ax+2,m.ay);ctx.lineTo(m.ax+2,m.ay-m.height+2);ctx.stroke();
    } else {
      const ax=m.ax,ay=m.ay-m.height;
      ctx.fillStyle='#53616a';ctx.fillRect(ax-4,ay-6,8,12);
      ctx.strokeStyle='#77878b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(x,y);ctx.stroke();
    }
    ctx.fillStyle='#202a30';ctx.fillRect(x-9,y-5,18,8);ctx.strokeStyle='#8b9694';ctx.lineWidth=1;ctx.strokeRect(x-9,y-5,18,8);
    ctx.fillStyle=l.broken?'#403d3a':on?'#efe0ad':'#66716d';ctx.fillRect(x-6,y-1,12,3);
    if(l.broken){ctx.strokeStyle='#b0aaa0';ctx.beginPath();ctx.moveTo(x-5,y-3);ctx.lineTo(x+4,y+3);ctx.stroke();}
    if(m.kind!=='pole') {
      const p=lampControl(l);ctx.strokeStyle='#586970';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(m.ax,m.ay-10);ctx.lineTo(p.x,p.y-3);ctx.stroke();ctx.fillStyle='#26333a';ctx.fillRect(p.x-4,p.y-8,8,12);ctx.strokeStyle='#808b88';ctx.strokeRect(p.x-4,p.y-8,8,12);
      ctx.fillStyle=on?'#c3cba1':'#525e61';ctx.fillRect(p.x-1,p.y-5,2,5);
    }
    if(on) {const gr=ctx.createRadialGradient(x,y,0,x,y,15);gr.addColorStop(0,'rgba('+(l.col||'255,217,155')+',.35)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(x-15,y-15,30,30);}
    ctx.restore();
  }
}
