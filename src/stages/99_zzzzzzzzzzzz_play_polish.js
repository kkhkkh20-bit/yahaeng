// Room identity comes from a different working arrangement, using owned pixels.
// Keep the stair landings, door/window approaches, objectives and patrol stations clear.
{
 const st=campaignStage('m4');
 st.roomPatches=(st.roomPatches||[]).concat({fl:1,bounds:[35,3,42,9],furniture:[
  {t:'desk2',from:[36,5],remove:true},{t:'chairD',from:[36,6],remove:true},
  {t:'desk2',from:[39,7],remove:true},{t:'chairD',from:[39,8],remove:true}],
  tiles:[[36,5,'w'],[37,5,'w'],[36,6,'w'],[39,5,'w'],[40,5,'w'],[39,6,'w'],[39,7,'w'],[40,7,'w'],[39,8,'w']]});
 st.fixedFurn=(st.fixedFurn||[]).concat([
  {x:36,y:4,w:2,t:'counter',fl:1},{x:39,y:3,t:'cab',fl:1},{x:40,y:3,t:'cab',fl:1},
  {x:38,y:7,w:2,t:'table',fl:1},{x:37,y:7,t:'chair',r:1,fl:1},{x:40,y:7,t:'chair',r:3,fl:1},
  {x:27,y:3,w:2,t:'shelf',fl:1}]);
 st.officeArt.buildings[3]=['club','executive'];st.officeArt.buildings[2]=['dispatch','security'];
 st.officeArt.furniture=(st.officeArt.furniture||[]).concat([
  {x:36,y:4,t:'counter',fl:1,art:'deskFiles'},
  {x:39,y:3,t:'cab',fl:1,art:'filesGold'},{x:40,y:3,t:'cab',fl:1,art:'filesRed'},
  {x:27,y:3,t:'shelf',fl:1,art:'monitorRackBlue'}]);
 st.officeArt.floorZones=[{b:3,fl:1,x0:35,y0:6,x1:41,y1:8,art:'floorCarpet'}];
 st.roomNames={'3:1':'정산 · 상담실','2:1':'감시 관리실'};
 st.camRoom={...st.camRoom,surface:{b:2,types:['desk2']}};
}
{
 const st=campaignStage('m7');
 st.roomPatches=(st.roomPatches||[]).concat([0,1].map(fl=>({fl,bounds:[26,15,31,19],
  furniture:[{t:'desk2',from:[27,17],remove:true},{t:'chairD',from:[27,18],remove:true}],
  tiles:[[27,17,'w'],[28,17,'w'],[27,18,'w']]})));
 st.fixedFurn=(st.fixedFurn||[]).concat([
  {x:27,y:16,w:2,t:'counter',fl:0},{x:30,y:15,t:'cab',fl:0},
  {x:27,y:18,w:2,t:'desk2',fl:1},{x:27,y:17,t:'chairD',r:0,fl:1},
  {x:29,y:15,w:2,t:'shelf',fl:1}]);
 st.officeArt.buildings[1]=['freight','dispatch'];
 st.officeArt.furniture=(st.officeArt.furniture||[]).concat([
  {x:27,y:16,t:'counter',fl:0,art:'counterWood'},
  {x:30,y:15,t:'cab',fl:0,art:'filesBlue'},
  {x:27,y:18,t:'desk2',fl:1,art:'deskLaptop'},
  {x:29,y:15,t:'shelf',fl:1,art:'monitorRackBlue'}]);
 st.officeArt.floorZones=[{b:1,fl:1,x0:26,y0:15,x1:31,y1:16,art:'floorSlate'}];
 st.roomNames={'1:0':'접수 · 송장 확인','1:1':'야간 배차실'};
 st.camRoom={...st.camRoom,surface:{b:1,types:['desk2']}};
}
{
 const st=campaignStage('m6');
 st.roomPatches=(st.roomPatches||[]).concat({fl:0,bounds:[4,8,15,11],
  furniture:[{t:'desk',from:[10,9],remove:true},{t:'desk',from:[13,9],remove:true}],
  tiles:[[10,9,'w'],[13,9,'w']]});
 st.fixedFurn=(st.fixedFurn||[]).concat([{x:12,y:9,t:'cab'},{x:13,y:9,t:'cab'}]);
 st.officeArt.furniture=(st.officeArt.furniture||[]).concat([
  {x:12,y:9,t:'cab',fl:0,art:'filesBlue'},{x:13,y:9,t:'cab',fl:0,art:'filesRed'}]);
 st.roomNames={'0:0':'접견 기록 · 압수품 보관'};
}
