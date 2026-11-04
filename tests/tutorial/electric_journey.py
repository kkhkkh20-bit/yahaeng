"""Compatibility entry point for the basic room-switch and vent input journey.

Ordinary light switches no longer require purchasing an electrical skill.
The positioned fixtures and native input method are documented in the runner.
"""
import asyncio,sys
from pathlib import Path
from types import SimpleNamespace
from lights_vents_walk import main
R=Path(__file__).resolve().parents[2]
if __name__=='__main__':
 asyncio.run(main(SimpleNamespace(url=sys.argv[1] if len(sys.argv)>1 else (R/'build/preview_city.html').as_uri(),out=str(R/'build/lights-v181/electric-journey'))))
