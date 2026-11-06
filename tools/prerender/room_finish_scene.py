"""Offline Blender render: CC0 props and authored Korean switch/window geometry."""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Matrix,Vector
R=Path(__file__).resolve().parents[2];SRC=R/'tools/prerender/room_finish_src'
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
ONLY=sys.argv[sys.argv.index('--only')+1] if '--only' in sys.argv else ''
meta={}
def material(name,color,metal=0,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.62;p.inputs['Metallic'].default_value=metal
 p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission;return m
def cube(name,loc,size,mat,bevel=.01):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Rounded manufactured edges','BEVEL');mod.width=bevel;mod.segments=2
 return o
def scene():
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=False;s.render.film_transparent=True;s.render.threads_mode='FIXED';s.render.threads=4
 s.world=bpy.data.worlds.new('Neutral studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.70,.77,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 s.view_settings.view_transform='Standard';s.view_settings.look='Medium High Contrast';s.view_settings.exposure=-.4
 for loc,power,size in [((-3,-4,8),650,5),((4,2,5),180,4)]:
  data=bpy.data.lights.new('Soft studio light','AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(data.name,data);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
 return s
def meshes():return[o for o in bpy.context.scene.objects if o.type=='MESH']
def normalize(objects,w,d,h,base=0):
 pts=[o.matrix_world@Vector(v)for o in objects for v in o.bound_box];lo=Vector(tuple(min(p[i]for p in pts)for i in range(3)));hi=Vector(tuple(max(p[i]for p in pts)for i in range(3)));center=(lo+hi)/2
 for o in objects:
  mat=o.matrix_world.copy();o.parent=None;o.matrix_world=Matrix.Identity(4)
  for v in o.data.vertices:
   p=mat@v.co;v.co=((p.x-center.x)*w/(hi.x-lo.x),(p.y-center.y)*d/(hi.y-lo.y),(p.z-lo.z)*h/(hi.z-lo.z)+base)
  o.data.update()
def switch(on):
 rim=material('Ivory switch plate',(.56,.59,.57));rock=material('Rocker',(.79,.80,.75));dark=material('Recess',(.075,.09,.10));led=material('Locator LED',(.40,.62,.46),emission=.6 if not on else 0)
 cube('Plate',(0,0,.35),(.17,.035,.23),rim,.012)
 for sign in [-1,1]:
  cube('Recess',(0,sign*.022,.35),(.125,.008,.18),dark,.006)
  o=cube('Rocker',(0,sign*.031,.35),(.105,.025,.16),rock,.006);o.rotation_euler.x=(.14 if on else-.14)*sign
  cube('Locator',(0,sign*.046,.292),(.029,.004,.009),led,.002)
def window(on,opened):
 frame=material('Brushed aluminium',(.35,.40,.41),.65);edge=material('Window gasket',(.065,.085,.10));glass=material('Glass',(.66,.49,.25)if on else(.12,.20,.26),.15,.22 if on else 0);sill=material('Sill',(.48,.50,.47),.3)
 cube('Opening',(0,0,.36),(.87,.04,.62),edge,.005)
 for x in [-.46,.46]:cube('Upright',(x,0,.36),(.05,.09,.72),frame,.008)
 for z in [0,.72]:cube('Horizontal',(0,0,z),(.97,.09,.05),frame,.008)
 cube('Sill',(0,-.035,-.018),(1.03,.20,.05),sill,.012)
 for x in ([.235,.25]if opened else[-.235,.235]):
  cube('Glass pane',(x,-.012,.36),(.405,.025,.61),glass,.003)
  for bx in [x-.215,x+.215]:cube('Pane stile',(bx,-.035,.36),(.025,.055,.64),frame,.004)
  for bz in [.04,.68]:cube('Pane rail',(x,-.035,bz),(.45,.055,.025),frame,.004)
 cube('Latch',(.04 if not opened else .04+.46,-.075,.33),(.025,.025,.09),edge,.004)
def desk():
 wood=material('Walnut desktop',(.18,.115,.075));metal=material('Dark steel',(.075,.095,.105),.5);paper=material('Paper',(.69,.67,.57));screen=material('Monitor',(.085,.13,.15));keys=material('Keyboard',(.17,.19,.20))
 cube('Desktop',(0,0,.43),(1.84,.76,.075),wood,.025)
 for x in [-.77,.77]:
  for y in [-.25,.25]:cube('Desk leg',(x,y,.20),(.065,.065,.40),metal,.009)
 cube('Drawer unit',(-.60,.04,.23),(.39,.52,.39),metal,.014)
 for z in [.15,.29]:cube('Handle',(-.60,-.228,z),(.18,.025,.02),paper,.004)
 cube('Monitor',(.12,.15,.67),(.58,.075,.37),metal,.014);cube('Screen',(.12,.105,.68),(.51,.009,.29),screen,.003);cube('Stand',(.12,.14,.49),(.15,.18,.04),metal,.005)
 cube('Keyboard',(.15,-.20,.48),(.48,.15,.025),keys,.007)
 for row in range(3):
  for col in range(10):cube('Key',(-.05+col*.043,-.25+row*.043,.497),(.031,.026,.01),metal,.001)
 for x,y,z,a in [(-.52,-.13,.477,-.08),(-.49,-.10,.484,.04)]:
  o=cube('Paper',(x,y,z),(.29,.22,.008),paper,.001);o.rotation_euler.z=a
 for x in [-.61,-.56,-.51]:cube('Ledger print',(x,-.17,.49),(.025,.1,.002),metal,0)
def render(key,objects,rotation,footprint=None):
 s=bpy.context.scene;rot=Matrix.Rotation(rotation*math.pi/2,4,'Z');shear=Matrix(((1,0,0,0),(0,1,1,0),(0,0,1,0),(0,0,0,1)))
 for o in objects:
  o.matrix_world=shear@rot@o.matrix_world
  if footprint:o.matrix_world.translation+=Vector((footprint[0]/2,-footprint[1]/2,0))
 bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v)for o in objects for v in o.bound_box];x0=min(p.x for p in pts)-.12;x1=max(p.x for p in pts)+.12;y0=min(p.y for p in pts)-.12;y1=max(p.y for p in pts)+.12
 extent=max(x1-x0,y1-y0);cx=(x0+x1)/2;cy=(y0+y1)/2;size=math.ceil(extent*96);extent=size/96
 cam=bpy.data.cameras.new('Game orthographic projection');co=bpy.data.objects.new('Camera',cam);s.collection.objects.link(co);co.location=(cx,cy,20);co.rotation_euler=(0,0,0);cam.type='ORTHO';cam.ortho_scale=extent;s.camera=co
 s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/(key+'.png'));bpy.ops.render.render(write_still=True)
 meta[key]={'ox':(cx-extent/2)*48,'oy':-(cy+extent/2)*48,'w':size/2,'h':size/2}
 print('ROOM_BAKE',key,flush=True)
for name,file,dim,foot in [('sofa','Couch_Medium1.fbx',(1.84,.78,.48),(2,1)),('chair','Chair_4.fbx',(.62,.63,.52),(1,1)),('cab','Drawer_3.fbx',(.83,.76,.64),(1,1))]:
 if ONLY and ONLY!=name:continue
 for r in range(4):
  scene();bpy.ops.import_scene.fbx(filepath=str(SRC/'quaternius'/file));ob=meshes();normalize(ob,*dim)
  for o in ob:
   for m in o.data.materials:
    if m and m.use_nodes:
     for node in m.node_tree.nodes:
      if node.type=='BSDF_PRINCIPLED':node.inputs['Alpha'].default_value=1
  render(name+'-'+str(r),ob,r,foot)
for r in range(4):
 if ONLY and ONLY!='desk':continue
 scene();desk();render('desk-'+str(r),meshes(),r,(2,1))
for on in [False,True]:
 for r in range(4):
  if not ONLY or ONLY=='lamp':
   scene();bpy.ops.import_scene.gltf(filepath=str(SRC/'industrial_wall_lamp/industrial_wall_lamp_1k.gltf'));ob=meshes();normalize(ob,.28,.16,.40,.57)
   for o in ob:
    for m in o.data.materials:
     if not m or not m.use_nodes:continue
     for n in list(m.node_tree.nodes):
      if n.type!='BSDF_PRINCIPLED':continue
      glass='glass' in m.name
      n.inputs['Emission Strength'].default_value=(.32 if glass else .65) if on else 0
      if glass:
       n.inputs['Transmission Weight'].default_value=.35;n.inputs['Emission Color'].default_value=(1,.52,.18,1)
      elif on:
       socket=n.inputs['Emission Color'];link=socket.links[0] if socket.links else None
       if link:
        source=link.from_socket;m.node_tree.links.remove(link);tint=m.node_tree.nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(1,.67,.32,1);m.node_tree.links.new(source,tint.inputs[1]);m.node_tree.links.new(tint.outputs[0],socket)
   render('lamp-'+str(int(on))+'-'+str(r),ob,r)
  if not ONLY or ONLY=='switch':
   scene();switch(on);render('switch-'+str(int(on))+'-'+str(r),meshes(),r)
for on in [False,True]:
 for opened in [False,True]:
  for r in range(4):
   if ONLY and ONLY!='window':continue
   scene();window(on,opened);render('window-'+str(int(on))+'-'+str(int(opened))+'-'+str(r),meshes(),r)
(OUT/'meta.json').write_text(json.dumps(meta,indent=2)+'\n')
