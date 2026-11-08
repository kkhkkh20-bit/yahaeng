"""Import only Yahaeng's selected Office Interior v3 artwork from a private PNG.

The purchaser's ZIP, complete tilemap and individual source collection stay private.
Usage: python tools/import_office_interiors.py /private/Tilemap/MainTileMap.png
"""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
args = parser.parse_args()
digest = hashlib.sha256(args.source.read_bytes()).hexdigest()
if digest != 'cb793dd0023f6450d85474988a3d058c30d7a9b06d6dc872244885e07126324c':
    raise SystemExit('Expected the purchased Office Interior v3 tilemap')
sheet = Image.open(args.source).convert('RGBA')
if sheet.size != (2496, 928):
    raise SystemExit('Unexpected Office Interior source dimensions')

# Coordinates are original 32px cells. Props retain their proportions and alpha.
selection = {
    'floorOak': (27, 3, 28, 4), 'floorCarpet': (27, 19, 28, 20),
    'floorParquet': (27, 11, 28, 12), 'floorTile': (27, 19, 28, 20),
    'wallPanel': (67, 1, 68, 2), 'wallWood': (66, 3, 67, 4),
    'wallPale': (68, 13, 69, 14),
    'deskComputer': (47, 0, 48, 2), 'deskGlass': (49, 0, 51, 2),
    'deskFiles': (51, 0, 53, 2), 'deskLaptop': (47, 6, 49, 8),
    'deskWood': (59, 2, 61, 3), 'deskExecutive': (59, 3, 61, 5),
    'deskSideE': (57, 6, 58, 8), 'deskSideW': (58, 6, 59, 8),
    'tableGlass': (47, 5, 49, 6), 'tableRound': (53, 6, 54, 7),
    'chairRed': (55, 0, 56, 2), 'chairRedE': (56, 1, 57, 3),
    'chairRedW': (54, 1, 55, 3), 'chairRedBack': (55, 2, 56, 4),
    'chairBlue': (57, 14, 58, 15), 'chairBlueE': (58, 15, 59, 16),
    'chairBlueW': (57, 15, 58, 16), 'chairBlueBack': (58, 14, 59, 15),
    'cabinetBlue': (54, 4, 55, 6), 'cabinetWood': (55, 4, 56, 6),
    'cabinetRed': (56, 4, 57, 6), 'filesBlue': (54, 6, 55, 8),
    'filesGold': (55, 6, 56, 8), 'filesRed': (56, 6, 57, 8),
    'monitorRack': (57, 0, 59, 2), 'monitorRackBlue': (59, 0, 61, 2),
    'displayWood': (54, 8, 55, 10), 'displayGlass': (55, 8, 56, 10),
    'counterWood': (56, 8, 58, 10), 'counterGlass': (58, 8, 60, 10),
    'plant': (57, 4, 58, 6), 'plantBlue': (58, 4, 59, 6),
    'printer': (47, 2, 49, 4), 'copier': (49, 2, 50, 4),
    'waterCooler': (61, 10, 62, 12), 'coffee': (46, 11, 47, 12),
    'phone': (46, 1, 47, 2), 'fax': (47, 14, 48, 16),
    'board': (60, 9, 62, 10), 'graph': (58, 10, 59, 12),
    'aircon': (57, 10, 58, 12), 'coatRack': (59, 10, 61, 12),
    'parcel': (61, 12, 62, 13), 'briefcase': (46, 15, 47, 16),
    'fluorescent': (66, 11, 67, 12), 'warmLamp': (66, 10, 67, 11),
    'windowSource': (71, 4, 72, 5),
    'lockerSteel': (54, 10, 55, 12), 'wardrobeWood': (55, 10, 56, 12),
}
parts = []
for name, box in selection.items():
    rect = tuple(n * 32 for n in box)
    if name=='printer':rect=(1504,64,1556,116)
    if name=='copier':rect=(1568,64,1600,106)
    art = sheet.crop(rect)
    if not name.startswith(('floor', 'wall')):
        bounds = art.getbbox()
        if bounds:
            art = art.crop(bounds)
            rect = (rect[0]+bounds[0], rect[1]+bounds[1], rect[0]+bounds[2], rect[1]+bounds[3])
    parts.append((name, art, {'sourceRect': list(rect)}))

# One purchased tile per world cell, rather than four tiny alternating panels.
# The former striped "carpet" was a grille-like source module. Use the actual
# floor tile instead, with matte ceramic / soft carpet palettes and quiet joints.
floor_palettes = {
    'floorTile': [(116,122,124), (108,114,116), (123,129,131), (102,108,110)],
    'floorCarpet': [(82,95,103), (80,93,101), (84,97,105), (79,92,100)],
}
source_colors = [(120,118,138), (71,72,93), (162,163,189), (47,53,81)]
finished=[]
for name,art,meta in parts:
    if name in floor_palettes:
        art=art.crop((0,0,16,16))
        palette=dict(zip(source_colors,floor_palettes[name]))
        art.putdata([(*palette[p[:3]],p[3]) for p in art.get_flattened_data()])
        meta={**meta,'sourceRect':[864,608,880,624],
              'assembly':'single source floor tile; restrained matte palette',
              'palette':{','.join(map(str,k)):list(v) for k,v in palette.items()}}
    elif name in ('floorOak','floorParquet'):
        # Residential wood remains wood, with less grain contrast at phone scale.
        pixels=list(art.get_flattened_data());mean=[sum(p[c]for p in pixels)/len(pixels)for c in range(3)]
        art.putdata([(*(round(mean[c]+(p[c]-mean[c])*.55)for c in range(3)),p[3])for p in pixels])
        meta={**meta,'contrast':.55}
    finished.append((name,art,meta))
parts=finished

# The original deskComputer crop was a tall instrument cabinet. Use the actual
# laptop workstation's upper half, excluding its built-in chair. Source pixels
# stay at one density: narrow desks splice table ends rather than squash them.
table=next(a for k,a,_ in parts if k=='tableGlass')
for name in ['deskComputer','deskGlass','deskFiles','deskLaptop']:
    narrow=name=='deskComputer';w=32 if narrow else 64
    base=table.copy()
    if narrow:
        base=Image.new('RGBA',(32,table.height))
        base.alpha_composite(table.crop((0,0,16,table.height)),(0,0))
        base.alpha_composite(table.crop((48,0,64,table.height)),(16,0))
    desk=Image.new('RGBA',(w,48));desk.alpha_composite(base,(0,48-base.height))
    top=(1520,192,1552,224)if narrow else(1504,192,1568,224)
    desk.alpha_composite(sheet.crop(top),(0,0));rects=[top,[1504,160,1568,192]]
    if name=='deskFiles':
        papers=(1568,64,1592,86);desk.alpha_composite(sheet.crop(papers),(1,12));rects.append(papers)
    if name=='deskGlass':
        phone=next(a for k,a,_ in parts if k=='phone')
        desk.alpha_composite(phone,(34,9));rects.append([1472,32,1504,64])
    parts=[(k,desk,{'sourceRects':rects,'assembly':'actual laptop desktop and glass table; no embedded chair'})if k==name else(k,a,m)for k,a,m in parts]

# Reception seats share the original compact office chair silhouette. Burgundy
# upholstery replaces the blue fabric only; frame, wheels and pixel size survive.
for suffix in ['', 'E', 'W', 'Back']:
    source='chairBlue'+suffix
    seat=next(a for k,a,_ in parts if k==source).copy()
    ramp=[(47,43,56),(68,52,63),(96,64,73),(126,86,90),(165,122,117)]
    seat.putdata([(*ramp[min(4,int((p[0]+p[1]+p[2])/3)//40)],p[3])if p[2]>p[0]*1.15 else p for p in seat.get_flattened_data()])
    parts.append(('chairLounge'+suffix,seat,{'derivedFrom':source,'assembly':'original compact chair, muted burgundy fabric ramp'}))

# Industrial slate shares the matte tile, never the striped grille. The night
# overlay remains dynamic, never baked into each room.
for name, source, mul in [('floorSlate','floorTile',(.67,.72,.77)),
                          ('floorWine','floorParquet',(.70,.58,.65)),
                          ('floorIvory','floorTile',(1.12,1.09,1.02))]:
    a = next(a for k,a,_ in parts if k==source).copy()
    px=a.load()
    for y in range(a.height):
        for x in range(a.width):
            r,g,b,alpha=px[x,y]
            px[x,y]=(*(min(255,round(v*m))for v,m in zip((r,g,b),mul)),alpha)
    parts.append((name,a,{'derivedFrom':source,'paletteMultiplier':mul}))

# Stateful windows use the purchased jamb pixels with a transparent aperture.
a=next(a for k,a,_ in parts if k=='windowSource')
border=Image.new('RGBA',(32,16))
border.alpha_composite(a.crop((0,0,32,5)),(0,0))
border.alpha_composite(a.crop((0,a.height-5,32,a.height)),(0,11))
for y in range(5,11):
    border.alpha_composite(a.crop((0,7,4,8)),(0,y))
    border.alpha_composite(a.crop((28,7,32,8)),(28,y))
parts.append(('windowFrame',border,{'derivedFrom':'windowSource','assembly':'jambs with transparent stateful aperture'}))

# Pack a modest, game-specific atlas. No complete source tilemap is distributed.
atlas=Image.new('RGBA',(1024,512));frames={};x=y=row=0
for name,a,meta in parts:
    if x+a.width+4>atlas.width:x=0;y+=row+4;row=0
    if y+a.height+4>atlas.height:raise SystemExit('Atlas too small')
    atlas.alpha_composite(a,(x,y));frames[name]={'rect':[x,y,a.width,a.height],**meta}
    x+=a.width+4;row=max(row,a.height)
atlas=atlas.crop((0,0,1024,y+row+4))
dest=ROOT/'src/art/office';dest.mkdir(parents=True,exist_ok=True)
atlas.save(dest/'interiors.webp',lossless=True,method=6)
meta={'pack':'GuttyKreum Office Interior v3','source':'https://guttykreum.itch.io/japanese-office-interior-game-assets',
      'sourceSha256':digest,'sourceSize':list(sheet.size),'frames':frames,'size':list(atlas.size)}
(dest/'interiors.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('Office campaign atlas:',len(frames),'frames;',atlas.size)
