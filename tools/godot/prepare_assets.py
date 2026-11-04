#!/usr/bin/env python3
"""Copy existing game resources; never synthesize replacement artwork."""
import base64
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "godot/assets"
manifest = []


def save(source, relative, data=None, note="Original bytes"):
    source = ROOT / source
    target = DEST / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    raw = source.read_bytes() if data is None else data
    target.write_bytes(raw)
    manifest.append({"source": str(source.relative_to(ROOT)), "destination": relative,
                     "sha256": hashlib.sha256(raw).hexdigest(), "conversion": note})


city = json.loads((ROOT / "build/assets_city.json").read_text())
save("build/assets_city.json", "city.png", base64.b64decode(city["atlas"].split(",", 1)[1]),
     "PNG decoded without pixel changes from the existing atlas data URI")
save("build/assets_city.json", "city_frames.json", json.dumps(city["frames"]).encode(),
     "Existing atlas rectangle metadata")
for name in ["step_c0", "kill", "thud", "cloth", "question", "alert", "win", "lose", "click"]:
    save("build/assets_city.json", f"audio/{name}.mp3",
         base64.b64decode(city["sounds"][name].split(",", 1)[1]), "Existing sound data URI decoded")

meta = json.loads((ROOT / "build/pr/pr_meta.json").read_text())
small = {k: meta[k] for k in ["fr", "groundY"]}
small["bodies"] = {}
for body in ["hero", "male", "suit"]:
    data = meta["bodies"][body]
    small["bodies"][body] = {k: data[k] for k in ["anims", "grounds", "scales"]}
    save(f"build/pr/body_{body}.webp", f"original/body_{body}.webp")
save("build/pr/pr_meta.json", "actors.json", json.dumps(small).encode(), "Selected existing animation metadata")
for name in ["pixelfx.webp", "pixelfx.json", "LICENSE.txt"]:
    source = "src/art/fx/" + name
    if not (ROOT / source).exists():
        continue
    save(source, "fx/" + name)
for name in ["sofa", "bar", "plant", "desk", "cab", "tableS", "chairD"]:
    save(f"src/art/quarter/{name}.webp", f"props/{name}.webp")
save("src/art/quarter/meta.json", "props/meta.json")
for name in ["attack", "action", "crouch", "whistle"]:
    save(f"src/art/hud/{name}.svg", f"ui/{name}.svg")
save("src/art/hud/ATTRIBUTION.json", "licenses/HUD-ATTRIBUTION.json")
for source in ["tools/prerender/characters/LICENSE.txt", "src/art/quarter/LICENSE-Quaternius.txt",
               "src/art/quarter/LICENSE-Kenney.txt", "src/fonts/OFL-IBMPlexSansKR.txt"]:
    save(source, "licenses/" + Path(source).name)
font_source = ROOT / "src/fonts/ui-regular.woff2"
font = TTFont(font_source, recalcTimestamp=False)
font.flavor = None
font_target = DEST / "ui/IBM-Plex-Sans-KR.ttf"
font.save(font_target)
manifest.append({"source": "src/fonts/ui-regular.woff2", "destination": "ui/IBM-Plex-Sans-KR.ttf",
                 "sha256": hashlib.sha256(font_target.read_bytes()).hexdigest(),
                 "conversion": "Lossless WOFF2 decompression to sfnt TTF using fontTools; SIL OFL retained"})
(DEST / "SOURCES.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(f"Prepared {len(manifest)} existing resources in {DEST}")
