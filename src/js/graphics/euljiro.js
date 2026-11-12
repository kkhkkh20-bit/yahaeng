// ---------------------------------------------------------------- 도시를 가로지르는 강 (큰 도시 시험의 청계천)
// STAGE.river = {y, rows}: 맵 가로 전체에 걸친 강 줄. 그림은 src/art/euljiro/river.webp (tools/import_river_strip.py).
// 4칸 주기 축대 그림을 이어 깔고, 세로 도로가 지나는 곳은 도로가 그대로 다리가 되며 양옆에 다리 난간을 세운다.
// 칸 판정(축대·물·난간)은 판 짓기에서 같은 규칙으로 G 에 넣는다 (riverColumn).
const riverArt=A.cityRiver,riverImg=new Image();
if(riverArt)riverImg.src=riverArt.src;
// 그 칸 열이 강에서 무엇인가: 'road' 다리 위 도로 · 'railL'/'railR' 다리 난간 · 'ladder'/'quay' 축대 (p = 주기 안 열)
function riverColumn(tx){
 for(const r of STAGE.roadsX||[]){if(tx>=r&&tx<r+4)return{k:'road'};if(tx===r-1)return{k:'railL'};if(tx===r+4)return{k:'railR'};}
 const n=riverArt?riverArt.period:4,p=((tx%n)+n)%n,seg=Math.floor(tx/n);
 return{k:seg%5===2?'ladder':'quay',p};
}
function drawRiver(c){
 const R=STAGE.river;if(!R||CUR_F||!riverArt||!riverImg.complete||!riverImg.naturalWidth)return;
 const [vx,vy,vw,vh]=viewRect(60),y=R.y*TILE,h=R.rows*TILE;if(vy>y+h||vy+vh<y)return;
 const T=riverArt.tile;c.save();c.imageSmoothingEnabled=false;
 for(let tx=Math.max(0,Math.floor(vx/TILE));tx<=Math.min(MW-1,Math.floor((vx+vw)/TILE));tx++){
  const col=riverColumn(tx);if(col.k==='road')continue;const f=riverArt.frames[col.k==='railL'||col.k==='railR'?col.k:col.k];
  const sx=f[0]+(col.p||0)*T;c.drawImage(riverImg,sx,f[1],T,f[3],tx*TILE,y,TILE,h);
 }
 c.restore();
}
// 강 줄 안인가 (px). 자동 가로등·벽등을 그림 위에 더 세우지 않는다
function inRiver(px,py){const R=STAGE.river;return !!R&&py>=R.y*TILE&&py<(R.y+R.rows)*TILE;}
