"""Standalone stage setups retain optional-lesson and security rule coverage."""
import subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2]
for name in ['first_session.py','episode_lessons.py','security_rules_walk.py']:
 subprocess.run([sys.executable,str(R/'tests/tutorial'/name)],cwd=R,check=True)
print('PASS optional lesson and security fixtures; compound_live covers first assassination with keyboard and touch')
