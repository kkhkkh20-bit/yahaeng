// 메인 포스터에 맞춘 작동 시안. 기본 실행과 분리하고 ?tone=ink에서만 켠다.
const INK_STUDY=document.documentElement.classList.contains('ink-study');
const INK={paper:'#eee4cf',ink:'#171817',line:'#777366',red:'#b73528',muted:'#b4ad9e'};
const inkPortraits=INK_STUDY&&window.__INK_PORTRAITS__?new Image():null;
if(inkPortraits){
  inkPortraits.onload=()=>{if(typeof DLG!=='undefined'&&DLG.cur?.speaker&&!$('dlg').hidden){const ok=drawFace($('dlgFace'),DLG.cur.speaker);$('dlgFaceBox').hidden=!ok;$('dlg').classList.toggle('noface',!ok);}};
  inkPortraits.src=window.__INK_PORTRAITS__;
}
function drawInkPortrait(cv,sp){
  const col={fc_ninja:0,fc_aide:1,fc_master:2}[sp.face];
  if(!inkPortraits?.complete||!inkPortraits.naturalWidth||col==null)return false;
  const x=cv.getContext('2d'),side=inkPortraits.naturalWidth/3;x.clearRect(0,0,cv.width,cv.height);x.imageSmoothingEnabled=true;
  x.drawImage(inkPortraits,col*side,0,side,inkPortraits.naturalHeight,0,0,cv.width,cv.height);return true;
}
function inkLampColor(l){
  if(!INK_STUDY||STAGE.id!=='m2')return l.col;
  return {'255,60,170':'204,78,54','255,90,190':'204,78,54','60,220,255':'135,204,197','90,220,255':'135,204,197','190,90,255':'177,106,85'}[l.col]||l.col;
}
function drawInkDance(x,it){
  const px=it.x*TILE,py=it.y*TILE,w=it.w*TILE,h=it.h*TILE;
  x.save();x.fillStyle='#181b19';x.fillRect(px,py,w,h);
  // 크기·통행 판정은 그대로 두고 줄눈과 사용 흔적을 고정된 선으로 그린다.
  for(let yy=0;yy<it.h;yy++)for(let xx=0;xx<it.w;xx++){
    const n=(xx*37+yy*61+it.seed*13)%17,tx=px+xx*TILE,ty=py+yy*TILE;
    x.fillStyle=['#30312b','#34342d','#2c302b'][n%3];x.fillRect(tx+1,ty+1,TILE-2,TILE-2);
    x.strokeStyle='#494b40';x.lineWidth=1;x.beginPath();x.moveTo(tx+3,ty+3);x.lineTo(tx+TILE-4,ty+3);x.stroke();
    x.strokeStyle='rgba(194,186,153,.16)';x.beginPath();x.moveTo(tx+7+n,ty+8+n%13);x.lineTo(tx+13+n,ty+11+n%13);if(n%3===0){x.moveTo(tx+12,ty+24+n%12);x.lineTo(tx+17+n,ty+25+n%12);}x.stroke();
  }
  x.strokeStyle='#655b45';x.lineWidth=3;x.strokeRect(px+2,py+2,w-4,h-4);
  // 바닥 가장자리의 가는 금속 띠가 주변 조명을 받는다.
  x.strokeStyle='#92815e';x.lineWidth=1;x.strokeRect(px+4,py+4,w-8,h-8);x.restore();
}
function drawInkClubSigns(P){
  if(!INK_STUDY||STAGE.id!=='m2'||flOf(P)||P.z||P.under||P.vent||tactical)return;
  const club=BLD.findIndex(b=>b.name==='클럽'),plan=PLANS[club]?.[0],vip=plan?.vip;
  const sign=(x,y,text,w=48)=>{if(!inView(x,y,80))return;ctx.save();ctx.fillStyle='#141815';ctx.fillRect(x-w/2,y-8,w,16);ctx.strokeStyle='#b2a582';ctx.lineWidth=1;ctx.strokeRect(x-w/2+.5,y-7.5,w-1,15);ctx.fillStyle='#e4d8b8';ctx.font='600 10px "IBM Plex Sans KR",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y+.5);ctx.restore();};
  if(vip)sign(tc(vip.door[0]),tc(vip.door[1])-22,'VIP');
  const bar=FURN.find(it=>it.t==='bar'&&it.seed===club&&!it.fl);
  if(bar)sign((bar.x+bar.w/2)*TILE,bar.y*TILE+TILE-11,'직원 전용',64);
}
