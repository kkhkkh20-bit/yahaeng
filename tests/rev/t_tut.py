"""Assert the actual introductory journey, replacing the old print-only teleport probe."""
import subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2]
for name in ['first_session.py','episode_lessons.py','security_rules_walk.py']:
 subprocess.run([sys.executable,str(R/'tests/tutorial'/name)],cwd=R,check=True)
print('PASS all five introductory, security and episode lessons with keyboard and touch')
