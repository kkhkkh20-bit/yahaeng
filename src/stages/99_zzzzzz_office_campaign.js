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
 m4:{default:'residence',buildings:{0:'freight',1:'freight',2:['dispatch','executive'],3:['club','executive'],4:'residence',6:'archive',7:'security'},decor:[
  {b:2,fl:1,u:.65,art:'graph',w:44},{b:1,fl:0,u:.35,art:'board',w:68},{b:3,fl:1,u:.7,art:'coatRack',w:70}]},
 m6:{default:'detention',buildings:{0:['detention','detention'],1:['security','archive'],2:'freight',3:'residence'},decor:[
  {b:0,fl:0,u:.6,art:'aircon',w:48},{b:1,fl:0,u:.3,art:'monitorRackBlue',w:72},{b:3,fl:1,u:.3,art:'board',w:74}]},
 m7:{default:'freight',buildings:{0:'freight',1:['dispatch','executive'],2:'residence'},decor:[
  {b:0,fl:0,u:.65,art:'monitorRack',w:70},{b:1,fl:0,u:.6,art:'board',w:80},{b:1,fl:1,u:.6,art:'graph',w:44}]},
 m5:{default:'security',buildings:{0:['security','executive'],1:'archive',2:'residence',3:'dispatch'},decor:[
  {b:0,fl:0,u:.3,art:'monitorRackBlue',w:74},{b:0,fl:1,u:.65,art:'coatRack',w:76},{b:3,fl:0,u:.4,art:'board',w:68}]},
 n1:{default:'estate',buildings:{0:['estate','executive'],1:'residence',2:'residence',3:'security',4:'archive',5:'residence',6:'residence',7:'estate'},decor:[
  {b:0,fl:0,u:.7,art:'coatRack',w:80},{b:0,fl:1,u:.6,art:'graph',w:44},{b:3,fl:0,u:.3,art:'monitorRack',w:64}]}
};
for(const[id,art]of Object.entries(OFFICE_CAMPAIGN))campaignStage(id).officeArt=art;
// Ground paint gives the first depot a readable loading area without adding
// decorative crates or chairs that the player could incorrectly walk through.
campaignStage('tB').dressing.push(
 {kind:'bay',x:25.4,y:8.4,w:4,h:3.3,fl:0,text:'하역'},
 {kind:'bay',x:4.2,y:14.2,w:3,h:2.4,fl:0,text:'대기'}
);
