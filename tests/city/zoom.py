import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
im = Image.open(src).convert('RGBA'); S = 6; step = int(sys.argv[7]) if len(sys.argv) > 7 else 16
c = im.crop((x0 * step, y0 * step, (x1 + 1) * step, (y1 + 1) * step)).resize(((x1 - x0 + 1) * step * S, (y1 - y0 + 1) * step * S), Image.NEAREST)
bg = Image.new('RGBA', c.size, (60, 60, 70, 255)); bg.alpha_composite(c); d = ImageDraw.Draw(bg)
for i in range(x1 - x0 + 2): d.line((i * step * S, 0, i * step * S, bg.height), fill=(255, 255, 0, 120))
for j in range(y1 - y0 + 2): d.line((0, j * step * S, bg.width, j * step * S), fill=(255, 255, 0, 120))
for i in range(x1 - x0 + 1):
    for j in range(y1 - y0 + 1): d.text((i * step * S + 2, j * step * S + 2), f'{x0+i},{y0+j}', fill=(255, 255, 0, 255))
bg.save(out)
