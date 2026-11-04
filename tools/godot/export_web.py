#!/usr/bin/env python3
"""Export official single-thread Godot WASM and package it below the host asset limit."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "build/godot-vip"
PUBLIC = ROOT / "public/godot-vip"
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run(["godot", "--headless", "--path", str(ROOT / "godot"), "--export-release", "Web"], check=True)
html = (OUT / "index.html").read_text()
config = json.loads(re.search(r"const GODOT_CONFIG = (.*);", html)[1])
config["ensureCrossOriginIsolationHeaders"] = False
config["packRevision"] = hashlib.sha256((OUT / "index.pck").read_bytes()).hexdigest()[:16]
PUBLIC.mkdir(parents=True, exist_ok=True)
for name in ["index.js", "index.pck", "index.audio.worklet.js", "index.audio.position.worklet.js"]:
    shutil.copyfile(OUT / name, PUBLIC / name)
wasm = (OUT / "index.wasm").read_bytes()
(PUBLIC / "index.wasm.gz").write_bytes(gzip.compress(wasm, compresslevel=9, mtime=0))
shutil.copyfile(ROOT / "tools/prerender/node_modules/three/examples/jsm/libs/fflate.module.js", PUBLIC / "fflate.module.js")
shell = (ROOT / "tools/godot/web_shell.html").read_text().replace("__GODOT_CONFIG__", json.dumps(config, ensure_ascii=False))
(PUBLIC / "index.html").write_text(shell)
with zipfile.ZipFile(PUBLIC / "project.zip", "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted((ROOT / "godot").rglob("*")):
        relative = path.relative_to(ROOT / "godot")
        if not path.is_file() or ".godot" in relative.parts or path.name == "export_credentials.cfg":
            continue
        info = zipfile.ZipInfo("yahaeng-godot-vip/" + str(relative), (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())
manifest = {"version": "godot-vip-1", "engine": "Godot 4.6.3", "threads": False, "files": {}}
for path in sorted(PUBLIC.rglob("*")):
    if path.is_file() and path.name != "version.json":
        raw = path.read_bytes()
        assert len(raw) < 25 * 1024 * 1024, (path, len(raw))
        manifest["files"][str(path.relative_to(PUBLIC))] = {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
manifest["wasm_uncompressed_sha256"] = hashlib.sha256(wasm).hexdigest()
(PUBLIC / "version.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print("WEB_READY", sum(f["bytes"] for f in manifest["files"].values()), "bytes; official WASM gzip", (PUBLIC / "index.wasm.gz").stat().st_size)
