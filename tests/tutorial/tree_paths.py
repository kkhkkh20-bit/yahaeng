"""Native skill review entry point; shares the current card/purchase scenarios."""
import asyncio,importlib.util,sys
from pathlib import Path
source=Path(__file__).resolve().parents[1]/'rev/t_skill_tree_finish.py'
spec=importlib.util.spec_from_file_location('skill_card_review',source)
review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
if __name__=='__main__':asyncio.run(review.main(sys.argv[1]if len(sys.argv)>1 else None))
