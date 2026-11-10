// Work surfaces and a wall-side utility corner give each room a purpose.
// Keep lower windows, door/stair landings and the right-hand terminal approach free.
{
 const s=campaignStage('m4');
 s.officeArt.surfaceDecor=[
  {x:38,y:7,t:'table',fl:1,art:'briefcase',u:.25,v:.35},
  {x:38,y:7,t:'table',fl:1,art:'phone',u:.74,v:.42,scale:1},
 ];
 s.officeArt.decor.push({b:3,fl:1,art:'board',u:.4,w:72});
 s.fixedFurn.push({x:35,y:8,t:'plant',fl:1});
 s.officeArt.furniture.push({x:35,y:8,t:'plant',fl:1,art:'plantBlue'});
}
{
 const s=campaignStage('m7');
 s.officeArt.surfaceDecor=[
  {x:27,y:16,t:'counter',fl:0,art:'briefcase',u:.30,v:.35},
  {x:27,y:16,t:'counter',fl:0,art:'parcel',u:.71,v:.30,scale:1},
 ];
 s.fixedFurn.push({x:26,y:19,t:'cab',fl:1});
 s.officeArt.furniture.push({x:26,y:19,t:'cab',fl:1,art:'waterCooler'});
 s.officeArt.decor.push({b:1,fl:0,art:'board',u:.5,w:72});
}
{
 const s=campaignStage('m6');
 s.officeArt.floorZones=[...(s.officeArt.floorZones||[]),{b:0,fl:0,x0:4,y0:10,x1:8,y1:10,art:'floorIvory'}];
 s.officeArt.decor.push({b:0,fl:0,art:'board',u:.24,w:72});
}
