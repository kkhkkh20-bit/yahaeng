"""Offline CC0 furniture restyle; same ground projection as the 2D room art."""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Matrix,Vector
R=Path(__file__).resolve().parents[2];SRC=R/'tools/prerender/furnglb'
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
ONLY=sys.argv[sys.argv.index('--only')+1].split(',') if '--only' in sys.argv else []
FABRIC=[(.15,.23,.29),(.31,.14,.17),(.23,.28,.18)]
FRAMES={};USED=set()

def mat(name,color,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.63;p.inputs['Metallic'].default_value=metal;return m
def cube(name,at,size,m,bevel=.01):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  b=o.modifiers.new('Finished edges','BEVEL');b.width=bevel;b.segments=2
 return o
def cyl(name,at,radius,depth,m,axis='Z'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=depth,location=at);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 if axis=='Y':o.rotation_euler.x=math.pi/2
 return o
def meshes():return [o for o in bpy.context.scene.objects if o.type=='MESH']
def studio():
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=False;s.render.film_transparent=True;s.render.threads_mode='FIXED';s.render.threads=4
 s.world=bpy.data.worlds.new('Soft neutral studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.69,.76,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 s.view_settings.view_transform='Standard';s.view_settings.look='Medium High Contrast';s.view_settings.exposure=-.30
 for loc,power,size in [((-3,-4,8),650,5),((4,2,5),180,4)]:
  d=bpy.data.lights.new('Soft key','AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(d.name,d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.3))-o.location).to_track_quat('-Z','Y').to_euler()
def load(name,tint=0,kind=''):
 USED.add(name);before=set(meshes());bpy.ops.import_scene.gltf(filepath=str(SRC/(name+'.glb')));objects=[o for o in meshes() if o not in before]
 for o in objects:
  for m in o.data.materials:
   if not m or not m.use_nodes:continue
   p=m.node_tree.nodes.get('Principled BSDF');n=m.name.lower()
   color=(.16,.10,.065)if 'wood' in n else FABRIC[tint]if n.startswith('carpet')and'white'not in n else(.76,.74,.67)if'carpetwhite'in n else(.075,.095,.11)if'metaldark'in n else(.22,.27,.29)if'metalmedium'in n else(.69,.72,.70)if'metallight'in n else(.40,.45,.46)if'metal'in n else(.20,.35,.23)if'plant'in n else None
   if kind=='spk'and'wood'in n:color=(.055,.075,.09)
   if 'wooddark'in n:color=(.13,.085,.055)
   if color:p.inputs['Base Color'].default_value=(*color,1)
   p.inputs['Roughness'].default_value=.67;p.inputs['Metallic'].default_value=.18 if'metal'in n and'light'not in n else 0;p.inputs['Alpha'].default_value=1
 return objects
def normalize(objects,w,d,h,center=(0,0,0)):
 bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v)for o in objects for v in o.bound_box];lo=Vector(tuple(min(p[i]for p in pts)for i in range(3)));hi=Vector(tuple(max(p[i]for p in pts)for i in range(3)));mid=(lo+hi)/2
 transforms=[o.matrix_world.copy()for o in objects]
 for o,transform in zip(objects,transforms):
  o.data=o.data.copy();o.parent=None;o.matrix_world=Matrix.Identity(4)
  for v in o.data.vertices:
   p=transform@v.co;v.co=((p.x-mid.x)*w/max(.001,hi.x-lo.x)+center[0],(p.y-mid.y)*d/max(.001,hi.y-lo.y)+center[1],(p.z-lo.z)*h/max(.001,hi.z-lo.z)+center[2])
  o.data.update()
def desk(w=1,monitor=True):
 wood=mat('Walnut',(.16,.10,.065));steel=mat('Graphite steel',(.075,.10,.12),.3);paper=mat('Warm paper',(.73,.71,.63));screen=mat('Blue glass',(.10,.19,.23));keys=mat('Key caps',(.30,.34,.35))
 cube('Desktop',(0,0,.46),(w*.92,.78,.075),wood,.022)
 for x in [-w*.38,w*.38]:
  for y in [-.27,.27]:cube('Leg',(x,y,.21),(.055,.055,.43),steel)
 cube('Drawer',(-w*.32,.03,.25),(.25,.52,.35),steel)
 for z in [.18,.32]:cube('Pull',(-w*.32,-.24,z),(.12,.026,.02),keys,.003)
 if monitor:
  cube('Monitor',(.10,.14,.70),(.56,.075,.34),steel,.012);cube('Glass',(.10,.096,.71),(.49,.006,.26),screen,.002);cube('Monitor neck',(.10,.14,.52),(.06,.06,.11),steel);cube('Monitor foot',(.10,.12,.51),(.23,.16,.025),steel)
  cube('Keyboard',(.10,-.20,.51),(.43,.14,.024),steel,.008)
  for y in range(3):
   for x in range(9):cube('Key',(-.073+x*.043,-.24+y*.041,.526),(.030,.024,.007),keys,.001)
  cube('Mouse',(.40,-.17,.515),(.065,.09,.035),keys,.015)
 cube('Document',(-w*.32,-.10,.508),(.22,.20,.008),paper,.002)
 for y in range(4):cube('Print',(-w*.32,-.16+y*.037,.514),(.14,.010,.002),steel,0)
def shelf(w=3,medical=False):
 steel=mat('Steel',(.25,.30,.31),.3);stock=[mat('Stock '+str(i),c)for i,c in enumerate([(.49,.26,.19),(.47,.51,.39),(.65,.60,.45),(.26,.38,.45)])];label=mat('Labels',(.78,.76,.67))
 for x in [-w*.44,w*.44]:
  for y in [-.31,.31]:cube('Upright',(x,y,.43),(.055,.055,.86),steel,.005)
 for z in [.10,.42,.74]:
  cube('Shelf',(0,0,z),(w*.94,.70,.035),steel,.007)
  for i in range(max(2,round(w*3))):
   x=-w*.39+i*(w*.78/max(1,round(w*3)-1));cube('Carton',(x,0,z+.13),(.19,.39,.22),stock[i%4],.008);cube('Label',(x,-.201,z+.13),(.105,.006,.07),label,.002)
def custom(kind,w,h,tint):
 steel=mat('Dark steel',(.075,.10,.12),.35);rim=mat('Brushed metal',(.43,.48,.48),.5);wood=mat('Walnut',(.16,.10,.065));paper=mat('Linen',(.76,.73,.64))
 if kind in ['desk','desk2','pc']:desk(w,True)
 elif kind=='sink':
  left=load('kitchenSink');normalize(left,.88,.82,.64,(-.5,0,0));right=load('kitchenStove');normalize(right,.88,.82,.64,(.5,0,0))
 elif kind in ['shelf','shelfS','disp']:shelf(w)
 elif kind in ['bar','counter','dj']:
  cube('Cabinet',(0,0,.30),(w*.93,.72,.60),wood,.025);cube('Counter top',(0,0,.64),(w*.98,.82,.08),steel,.018)
  for x in [-w*.34,0,w*.34]:cube('Drawer pull',(x,-.37,.40),(.18,.028,.025),rim,.004)
  if kind=='dj':
   for x in [-w*.27,w*.27]:cyl('Turntable',(x,0,.695),.19,.022,steel);cyl('Record label',(x,0,.710),.055,.008,rim)
   for i in range(4):cube('Fader',(-.09+i*.06,-.03,.70),(.02,.15,.02),rim,.002)
  elif kind=='counter':desk_part=load('laptop');normalize(desk_part,.44,.32,.25,(w*.28,0,.68))
  else:
   for i in range(max(3,round(w*2))):
    glass=mat('Bottle',[(.18,.28,.22),(.34,.20,.16),(.39,.33,.20)][i%3]);x=-w*.39+i*w*.78/max(1,round(w*2)-1);cyl('Bottle',(x,.13,.79),.055,.22,glass);cyl('Bottle neck',(x,.13,.94),.023,.10,glass);cube('Bottle label',(x,.075,.78),(.065,.004,.07),paper,.001)
 elif kind=='safe':
  cube('Safe body',(0,0,.40),(.79,.70,.80),steel,.025);cube('Door',(0,-.365,.40),(.68,.05,.67),rim,.012);cube('Door inset',(0,-.397,.40),(.61,.018,.59),steel,.008);cyl('Combination',(0,-.425,.45),.10,.025,rim,'Y');cube('Handle',(.20,-.43,.24),(.12,.06,.035),rim,.009)
 elif kind=='spk':
  cube('Speaker enclosure',(0,0,.40),(.72,.58,.80),steel,.025)
  for z,r in [(.28,.21),(.64,.11)]:
   cyl('Driver rim',(0,-.30,z),r,.025,rim,'Y');cyl('Driver cone',(0,-.32,z),r*.84,.022,steel,'Y');cyl('Dust cap',(0,-.34,z),r*.31,.025,rim,'Y')
 elif kind=='board':
  cube('Frame',(0,0,.33),(w*.94,.08,.60),rim,.015);cube('Board',(0,-.047,.33),(w*.88,.01,.53),paper,.004)
  for i in range(max(3,round(w*2))):cube('Writing',(-w*.36+i*.25,-.054,.38),(.15,.004,.015),steel,0)
 elif kind=='medcab':
  shelf(w);cube('Medical cabinet face',(0,-.37,.48),(w*.90,.04,.80),paper,.015);red=mat('Medical cross',(.55,.17,.14));cube('Cross',(0,-.397,.53),(.24,.008,.07),red,.002);cube('Cross',(0,-.397,.53),(.07,.008,.24),red,.002)
 elif kind=='pot':
  cyl('Pot',(0,0,.16),.25,.25,steel);cyl('Lid',(0,0,.30),.26,.025,rim);cube('Lid handle',(0,0,.34),(.14,.04,.05),steel)
 else:raise ValueError(kind)
def render(key,rotation,foot,kind,variant):
 bpy.context.view_layer.update()
 objects=meshes();fw,fh=foot;rot=Matrix.Rotation(rotation*math.pi/2,4,'Z');shear=Matrix(((1,0,0,0),(0,1,1,0),(0,0,1,0),(0,0,0,1)))
 target=(fh,fw)if rotation%2 else(fw,fh)
 transforms=[o.matrix_world.copy()for o in objects]
 for o,transform in zip(objects,transforms):
  # Blender decomposes an Object transform into rotation and scale. Bake the
  # shear into private vertices so side views cannot acquire a diagonal skew.
  project=Matrix.Translation(Vector((target[0]/2,-target[1]/2,0)))@shear@rot@transform
  o.data=o.data.copy();o.parent=None;o.matrix_world=Matrix.Identity(4)
  for vertex in o.data.vertices:vertex.co=project@vertex.co
  o.data.update()
 bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v)for o in objects for v in o.bound_box];x0=min(p.x for p in pts)-.05;x1=max(p.x for p in pts)+.05;y0=min(p.y for p in pts)-.05;y1=max(p.y for p in pts)+.05;extent=max(x1-x0,y1-y0);size=math.ceil(extent*96);extent=size/96;cx=(x0+x1)/2;cy=(y0+y1)/2
 s=bpy.context.scene;cam=bpy.data.cameras.new('Orthographic');co=bpy.data.objects.new('Camera',cam);s.collection.objects.link(co);co.location=(cx,cy,20);cam.type='ORTHO';cam.ortho_scale=extent;s.camera=co;s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/(key+'.png'));bpy.ops.render.render(write_still=True)
 FRAMES[key]={'ox':(cx-extent/2)*48,'oy':-(cy+extent/2)*48,'footprint':list(target),'kind':kind,'variant':variant}
 print('PROP_BAKE',key,flush=True)

RECIPES={
 'bed':('bedSingle',1,2,.43),'bedD':('bedDouble',2,2,.43),'cbed':('bedSingle',1,2,.49),
 'sofa':('loungeSofa',2,1,.56),'sofaV':('loungeSofa',2,1,.56),
 'chair':('chairCushion',1,1,.56),'chairD':('chairDesk',1,1,.58),'cab':('bookcaseClosedDoors',1,1,.85),
 'table':('table',2,1,.46),'tableS':('tableCoffeeSquare',1,1,.34),'nstand':('sideTableDrawers',1,1,.44),
 'plant':('pottedPlant',1,1,.85),'fridge':('kitchenFridge',1,1,1.02),'kcab':('kitchenCabinetDrawer',1,1,.62),
 'ksink':('kitchenSink',1,1,.64),'bsink':('bathroomSink',1,1,.60),'stove':('kitchenStove',1,1,.64),
 'sink':(None,2,1,.64),
 'bath':('bathtub',2,1,.37),'toilet':('toilet',1,1,.52),'washer':('washer',1,1,.64),
 'spk':(None,1,1,.82),'boxes':('cardboardBoxClosed',1,1,.60),'lamp':('lampRoundFloor',1,1,.84),
 'rug':('rugRectangle',2,2,.025),'tv':('cabinetTelevision',2,1,.43),
 'desk':(None,1,1,.75),'desk2':(None,2,1,.75),'pc':(None,1,1,.75),
 'shelf':(None,3,1,.86),'shelfS':(None,1,1,.86),'disp':(None,2,1,.64),
 'bar':(None,4,1,.97),'counter':(None,2,1,.94),'dj':(None,2,1,.72),
 'safe':(None,1,1,.80),'board':(None,3,1,.63),'medcab':(None,2,1,.89),'pot':(None,1,1,.36),
}
VARIANTS={'bed','bedD','cbed','sofa','sofaV','rug','chair','chairD'}
for kind,(model,w,h,height)in RECIPES.items():
 if ONLY and kind not in ONLY:continue
 for v in range(3 if kind in VARIANTS else 1):
  for r in range(4):
   studio()
   if model:
    ob=load(model,v,kind);normalize(ob,w*.88,h*.82,height)
    if kind=='rug':
     border=mat('Woven border',tuple(c*.65+.19 for c in FABRIC[v]));
     for y in [-.74,.74]:cube('Border',(0,y,.030),(1.58,.025,.008),border,.003)
     for x in [-.79,.79]:cube('Border',(x,0,.030),(.025,1.50,.008),border,.003)
     for y in [-.66,.66]:cube('Inner border',(0,y,.031),(1.41,.012,.006),border,.002)
    if kind in ['table','tableS']:
     paper=mat('Table setting',(.73,.70,.62));ink=mat('Printed cover',(.19,.25,.27))
     if kind=='table':
      cyl('Plate',(.34,0,height+.014),.13,.018,paper);cyl('Cup',(-.36,.12,height+.045),.06,.085,paper)
     else:
      cube('Magazine',(-.10,0,height+.014),(.31,.24,.024),ink,.004);cube('Paper',(-.10,0,height+.028),(.27,.20,.006),paper,.001)
    if kind=='tv':ob=load('televisionModern');normalize(ob,1.0,.12,.39,(0,.14,.43))
    if kind=='boxes':
     label=mat('Parcel label',(.72,.68,.54));tape=mat('Packing tape',(.55,.43,.27));cube('Tape',(0,0,.608),(.10,.84,.015),tape,.002);cube('Shipping label',(.18,-.05,.614),(.22,.22,.008),label,.002)
   else:custom(kind,w,h,v)
   rotation=(r+1)%4 if kind=='sofaV'else r
   render(kind+'-'+str(r)+'-'+str(v),rotation,(w,h),kind,v)
(OUT/'meta.json').write_text(json.dumps({'frames':FRAMES,'models':sorted(USED)},indent=2))
