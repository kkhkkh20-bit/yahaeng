// ---------------------------------------------------------------- 그림으로 깐 구역 (큰 도시 시험의 을지로·청계천)
// 구역 한 장을 미리 그려 둔다(tools/import_euljiro_district.py). 칸 판정은 같은 파일의 tiles 를 판 짓기에서 G 에 넣는다.
// 그림은 땅 그림 바로 위, 사람·차보다 아래에 깔린다. 그림이 아직 안 풀렸으면 원래 땅 그림이 보인다.
const districtArt=A.euljiro,districtImg=new Image();
if(districtArt)districtImg.src=districtArt.src;
function drawDistricts(c){
 const d=STAGE.district;if(!d||!districtArt||!districtImg.complete||!districtImg.naturalWidth)return;
 if(CUR_F)return;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(districtImg,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE);c.restore();
}
// 구역 안인가 (px). 자동 가로등·벽등을 구역 그림 위에 더 세우지 않는다
function inDistrict(px,py){const d=STAGE.district;return !!d&&px>=d.x*TILE&&px<(d.x+d.w)*TILE&&py>=d.y*TILE&&py<(d.y+d.h)*TILE;}
