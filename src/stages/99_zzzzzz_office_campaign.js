// Nine distinct locations share the purchased pixels, not the same decoration.
// Existing missions, geometry, patrols and skill progression are retained.
const OFFICE_CAMPAIGN={
 tB:{default:'freight',buildings:{0:'freight',1:['dispatch','archive'],2:'freight'},decor:[
  {b:1,fl:0,u:.27,art:'board',w:78},{b:0,fl:0,u:.7,art:'aircon',w:48}]},
 p0:{default:'freight',buildings:{0:['dispatch','executive'],1:'freight'},decor:[
  {b:0,fl:0,u:.32,art:'board',w:72},{b:0,fl:1,u:.72,art:'coatRack',w:74}]},
 e2:{default:'freight',buildings:{0:'freight',1:['exchange','security','executive']},decor:[
  {b:0,fl:0,u:.25,art:'aircon',w:48},{b:1,fl:1,u:.27,art:'monitorRackBlue',w:80},{b:1,fl:2,u:.3,art:'graph',w:44}]},
 m2:{default:'residence',buildings:{0:['dispatch','archive'],1:['club','executive'],2:'detention',3:'residence',4:'residence',5:'archive',6:'residence',7:['residence','archive']},decor:[
  {b:0,fl:0,u:.4,art:'board',w:74},{b:0,fl:1,u:.7,art:'graph',w:44},{b:1,fl:0,u:.3,art:'coatRack',w:76}]},
 m4:{default:'residence',buildings:{0:'freight',1:'freight',2:['dispatch','executive'],3:['club','club'],4:'residence',6:'archive',7:'security'},decor:[
  {b:2,fl:1,u:.65,art:'graph',w:44},{b:1,fl:0,u:.35,art:'board',w:68},{b:3,fl:1,u:.7,art:'coatRack',w:70}]},
 m6:{default:'detention',buildings:{0:['detention','detention'],1:['security','archive'],2:'freight',3:'residence'},decor:[
  {b:0,fl:0,u:.6,art:'aircon',w:48},{b:1,fl:0,u:.3,art:'monitorRackBlue',w:72},{b:3,fl:1,u:.3,art:'board',w:74}]},
 m7:{default:'freight',buildings:{0:'freight',1:['dispatch','archive'],2:'residence'},decor:[
  {b:0,fl:0,u:.65,art:'monitorRack',w:70},{b:1,fl:0,u:.6,art:'board',w:80},{b:1,fl:1,u:.6,art:'graph',w:44}]},
 m5:{default:'security',buildings:{0:['security','executive'],1:'archive',2:'residence',3:'dispatch'},decor:[
  {b:0,fl:0,u:.3,art:'monitorRackBlue',w:74},{b:0,fl:1,u:.65,art:'coatRack',w:76},{b:3,fl:0,u:.4,art:'board',w:68}]},
 n1:{default:'estate',buildings:{0:['estate','estate'],1:'residence',2:'residence',3:'security',4:'archive',5:'residence',6:'residence',7:'estate'},decor:[
  {b:0,fl:0,u:.7,art:'coatRack',w:80},{b:0,fl:1,u:.6,art:'graph',w:44},{b:3,fl:0,u:.3,art:'monitorRack',w:64}]}
};
// Existing furniture becomes a lounge pair / rear meeting station rather than
// another repeated row. The shared room-patch path also migrates checkpoints.
campaignStage('m4').roomPatches=(campaignStage('m4').roomPatches||[]).concat({fl:1,bounds:[35,3,45,9],
 furniture:[{t:'desk2',from:[39,5],to:[39,7]},{t:'chairD',from:[39,6],to:[39,8]}],
 tiles:[[39,5,'w'],[40,5,'w'],[39,6,'w']]});
campaignStage('m5').roomPatches=(campaignStage('m5').roomPatches||[]).concat({fl:1,bounds:[13,3,26,9],
 furniture:[{t:'desk2',from:[17,5],to:[17,8]},{t:'chairD',from:[17,6],to:[17,7],r:0}],
 tiles:[[17,5,'w'],[18,5,'w'],[17,6,'w']]});
OFFICE_CAMPAIGN.m5.furniture=[
 {fl:1,t:'desk2',x:14,y:5,art:'deskExecutive'},
 {fl:1,t:'desk2',x:17,y:8,art:'tableGlass'},
 {fl:1,t:'desk2',x:20,y:5,art:'deskGlass'}
];
for(const[id,art]of Object.entries(OFFICE_CAMPAIGN))campaignStage(id).officeArt=art;
// Reference compositions: an operations board, a recording bank and a display
// shelf identify each workplace. They occupy existing solid wall spans only.
const OFFICE_WALL_GROUPS={
 tB:[{b:1,fl:0,u:.64,art:'monitorRack',w:88},{b:1,fl:1,u:.5,art:'board',w:84}],
 p0:[{b:0,fl:0,u:.7,art:'monitorRack',w:88},{b:0,fl:1,u:.3,art:'displayWood',w:42},{b:0,fl:1,u:.5,art:'board',w:78}],
 e2:[{b:1,fl:0,u:.55,art:'board',w:84},{b:1,fl:1,u:.66,art:'monitorRackBlue',w:88},{b:1,fl:2,u:.68,art:'displayGlass',w:42}],
 m2:[{b:0,fl:1,u:.35,art:'board',w:84},{b:1,fl:1,u:.65,art:'displayWood',w:42}],
 m4:[{b:2,fl:0,u:.65,art:'monitorRack',w:80},{b:3,fl:1,u:.3,art:'displayWood',w:42}],
 m6:[{b:0,fl:1,u:.4,art:'board',w:84},{b:1,fl:0,u:.7,art:'monitorRackBlue',w:88}],
 m7:[{b:1,fl:1,u:.3,art:'board',w:78},{b:0,fl:0,u:.3,art:'board',w:84}],
 m5:[{b:0,fl:0,u:.65,art:'monitorRackBlue',w:88},{b:0,fl:1,u:.38,art:'displayWood',w:42}],
 n1:[{b:0,fl:1,u:.3,art:'displayWood',w:42},{b:4,fl:0,u:.5,art:'board',w:70}]
};
for(const[id,decor]of Object.entries(OFFICE_WALL_GROUPS))OFFICE_CAMPAIGN[id].decor.push(...decor);
// Ground paint gives the first depot a readable loading area without adding
// decorative crates or chairs that the player could incorrectly walk through.
campaignStage('tB').dressing.push(
 {kind:'bay',x:25.4,y:8.4,w:4,h:3.3,fl:0,text:'하역'},
 {kind:'bay',x:4.2,y:14.2,w:3,h:2.4,fl:0,text:'대기'}
);
