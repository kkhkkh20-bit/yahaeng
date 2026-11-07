"""Compatibility entrypoint: real first-compound PC/touch playback lives in compound_live."""
import subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2]
subprocess.run([sys.executable,str(R/'tests/tutorial/compound_live.py'),'--stage','p0'],cwd=R,check=True)
