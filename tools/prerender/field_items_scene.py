"""Original folded garments and paper folders, matching the game's 2D projection."""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Matrix,Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True);META={}
def mat(name,col,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=.72;p.inputs['Metallic'].default_value=metal;return m
def box(name,loc,size,m,bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:mod=o.modifiers.new('Manufactured edge','BEVEL');mod.width=bevel;mod.segments=2
 return o
def start():
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=False;s.render.film_transparent=True;s.render.threads_mode='FIXED';s.render.threads=4
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.6,.66,.75,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.65;s.view_settings.view_transform='Standard';s.view_settings.look='Medium High Contrast';s.view_settings.exposure=-.4
 d=bpy.data.lights.new('Softbox','AREA');d.energy=650;d.size=4;o=bpy.data.objects.new('Softbox',d);s.collection.objects.link(o);o.location=(-3,-4,8);o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
def garment(apron=False):
 cloth=mat('Cotton',(.19,.24,.16) if not apron else(.45,.46,.42));seam=mat('Seams',(.11,.14,.10));ivory=mat('Apron and shirt',(.69,.70,.64));button=mat('Buttons',(.57,.53,.40),.45)
 box('Folded uniform',(0,0,.045),(.44,.54,.09),cloth,.035)
 for side in [-1,1]:
  o=box('Folded sleeve',(side*.22,-.055,.11),(.16,.41,.07),cloth,.023);o.rotation_euler.z=side*.22
  box('Cuff',(side*.24,-.20,.15),(.13,.09,.025),seam,.012)
 box('Inner shirt',(0,.18,.11),(.17,.15,.02),ivory,.01)
 for side in [-1,1]:
  o=box('Collar',(side*.068,.18,.14),(.095,.19,.04),cloth,.01);o.rotation_euler.z=side*.40
 box('Button placket',(0,-.04,.116),(.026,.34,.012),seam,.002)
 for y in [-.17,-.07,.03]:box('Button',(0,y,.13),(.025,.025,.012),button,.007)
 for side in [-1,1]:
  box('Pocket',(side*.135,.04,.115),(.09,.105,.014),cloth,.005);box('Pocket flap',(side*.135,.09,.127),(.10,.022,.012),seam,.003)
 if apron:
  box('Folded apron',(0,-.13,.16),(.35,.23,.025),ivory,.012);box('Apron pocket',(0,-.14,.179),(.17,.10,.01),ivory,.004)
 else:box('Uniform shoulder patch',(.24,.08,.152),(.075,.065,.012),button,.005)
def paper(folder=True):
 manila=mat('Manila folder',(.47,.34,.19));ivory=mat('Paper',(.76,.74,.66));ink=mat('Printed lines',(.19,.21,.20));steel=mat('Steel clip',(.40,.45,.46),.7);seal=mat('Red seal',(.36,.10,.08))
 if folder:
  box('Folder',(0,0,.018),(.65,.45,.036),manila,.014);box('Index tab',(-.19,.23,.02),(.20,.06,.036),manila,.007)
 for i in range(3):
  o=box('Paper sheet',(-.025+i*.012,-.008+i*.014,.045+i*.009),(.52,.36,.008),ivory,.002);o.rotation_euler.z=-.05+i*.02
 box('Heading',(-.10,.10,.074),(.26,.014,.002),ink,0)
 for i in range(5):box('Printed line',(-.025,.055-i*.04,.074),(.35 if i<4 else .20,.008,.002),ink,0)
 box('Stamped mark',(.16,-.10,.075),(.065,.065,.002),seal,.003)
 if folder:
  for x in [-.21,-.175]:box('Clip side',(x,.16,.08),(.009,.13,.009),steel,.003)
  box('Clip bend',(-.1925,.22,.08),(.045,.01,.009),steel,.004)
def render(key):
 s=bpy.context.scene;obs=[o for o in s.objects if o.type=='MESH'];shear=Matrix(((1,0,0,0),(0,1,1,0),(0,0,1,0),(0,0,0,1)))
 for o in obs:o.matrix_world=shear@o.matrix_world
 bpy.context.view_layer.update();pts=[o.matrix_world@Vector(p)for o in obs for p in o.bound_box];x0=min(p.x for p in pts)-.08;x1=max(p.x for p in pts)+.08;y0=min(p.y for p in pts)-.08;y1=max(p.y for p in pts)+.08;cx=(x0+x1)/2;cy=(y0+y1)/2;size=math.ceil(max(x1-x0,y1-y0)*96);extent=size/96
 d=bpy.data.cameras.new('Game projection');o=bpy.data.objects.new('Camera',d);s.collection.objects.link(o);o.location=(cx,cy,20);d.type='ORTHO';d.ortho_scale=extent;s.camera=o;s.render.resolution_x=size;s.render.resolution_y=size;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/(key+'.png'));bpy.ops.render.render(write_still=True);META[key]={'ox':(cx-extent/2)*48,'oy':-(cy+extent/2)*48}
for key,kind in [('coat',0),('apron',1),('folder',2),('paper',3)]:
 start();garment(kind==1) if kind<2 else paper(kind==2);render(key)
(OUT/'meta.json').write_text(json.dumps(META,indent=2))
