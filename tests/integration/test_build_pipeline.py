"""Build ownership and deletion safety: disconnected files may never ship silently."""
import contextlib,io,json,sys,tempfile,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[2];sys.path.insert(0,str(R))
from tools.buildlib.modules import runtime_modules
from tools.buildlib.release_assets import prune_assets
from tools.buildlib.assets import campaign_assets
from tools.package_cloudflare_2d import package
class BuildPipeline(unittest.TestCase):
 def test_all_runtime_modules_are_owned_once(self):
  modules=runtime_modules(R)
  self.assertEqual(set(modules),set((R/'src/js').rglob('*.js')))
  self.assertGreater(len(modules),70)
 def test_unlisted_and_duplicate_modules_fail(self):
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);(root/'src/js').mkdir(parents=True);(root/'src/js/main.js').write_text('')
   manifest=root/'src/modules.json';manifest.write_text(json.dumps({'schema':1,'modules':[]}))
   with self.assertRaisesRegex(ValueError,'unlisted'):runtime_modules(root)
   manifest.write_text(json.dumps({'schema':1,'modules':[{'path':'main.js'},{'path':'main.js'}]}))
   with self.assertRaisesRegex(ValueError,'Duplicate'):runtime_modules(root)
 def test_release_keeps_transitive_and_press_dependencies(self):
  with tempfile.TemporaryDirectory()as tmp:
   r=Path(tmp);(r/'assets').mkdir();(r/'press').mkdir()
   (r/'index.html').write_text('<script src="./assets/game.js"></script><a href="https://kenney.nl/assets/retro-urban-kit">credit</a>')
   (r/'assets/game.js').write_text('const sprite="./assets/body.webp";')
   (r/'assets/body.webp').write_bytes(b'body')
   (r/'assets/press.webp').write_bytes(b'press')
   (r/'press/index.html').write_text('<img src="../assets/press.webp">')
   (r/'assets/old-game.js').write_text('unused')
   result=prune_assets(r)
   self.assertEqual(result['pruned_assets'],1)
   self.assertTrue((r/'assets/body.webp').exists())
   self.assertTrue((r/'assets/press.webp').exists())
   self.assertFalse((r/'assets/old-game.js').exists())
   self.assertEqual(prune_assets(r)['pruned_assets'],0)
 def test_missing_or_escaping_dependency_deletes_nothing(self):
  for reference in ['missing.webp','../../private.js']:
   with self.subTest(reference=reference),tempfile.TemporaryDirectory()as tmp:
    r=Path(tmp);(r/'assets').mkdir();(r/'index.html').write_text(f'<img src="./assets/{reference}">')
    spare=r/'assets/spare.js';spare.write_text('spare')
    with self.assertRaises(ValueError):prune_assets(r)
    self.assertTrue(spare.exists())
 def test_repackaging_is_stable_after_pruning(self):
  with tempfile.TemporaryDirectory()as tmp:
   r=Path(tmp);source=r/'source.html';out=r/'release'
   source.write_text('<html><body><script>window.__BUILD_VERSION__="fixture";const image="data:image/png;base64,eA==";'+(' '*600)+'</script></body></html>')
   with contextlib.redirect_stdout(io.StringIO()):package(source,out)
   version=(out/'version.json').read_bytes();index=(out/'index.html').read_bytes()
   (out/'assets/retired.js').write_text('unused')
   with contextlib.redirect_stdout(io.StringIO()):package(source,out)
   self.assertFalse((out/'assets/retired.js').exists())
   self.assertEqual((out/'version.json').read_bytes(),version)
   self.assertEqual((out/'index.html').read_bytes(),index)
 def test_fonts_are_cacheable_and_retained(self):
  with tempfile.TemporaryDirectory()as tmp:
   r=Path(tmp);source=r/'source.html';out=r/'release'
   source.write_text('<html><style>@font-face{font-family:fixture;src:url("data:font/woff2;base64,eA==")}</style><script>window.__BUILD_VERSION__="fixture";'+(' '*600)+'</script></html>')
   with contextlib.redirect_stdout(io.StringIO()):package(source,out)
   self.assertNotIn('data:font/',(out/'index.html').read_text())
   fonts=list((out/'assets').glob('*.woff2'));self.assertEqual(len(fonts),1);self.assertEqual(fonts[0].read_bytes(),b'x')
   self.assertEqual(prune_assets(out)['pruned_assets'],0)
 def test_unused_recorded_music_is_not_in_campaign(self):
  shipped=json.loads(campaign_assets(R));original=json.loads((R/'build/assets_city.json').read_text())
  self.assertNotIn('music',shipped)
  self.assertEqual(shipped['sounds'],original['sounds'])
  self.assertEqual(shipped['atlas'],original['atlas'])
if __name__=='__main__':unittest.main()
