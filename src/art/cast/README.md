# Cast presentation

`portraits.webp` contains sixteen human busts, packed in 128px cells. These are original generated illustrations, not purchased GuttyKreum art. The heroine follows the previously approved navy-jacket female agent reference. The fourth cell of the source generation contained an animal portrait; the importer excludes it and inserts the dedicated heroine there. No dog portrait is shipped.

`dog.webp` contains the **in-game** stray dog: eight directions, idle, two walking contacts and a grounded down pose. It is original generated art normalized to 32px cells, displayed at the environment's 1.5 scale. It is not represented as an animal supplied with the purchased city or office packs. The existing dog AI, hearing and collision are unchanged.

`tools/import_cast_art.py HERO CAST DOG` reproduces the packed atlases from the recorded source images. JSON files retain source hashes and frame order; the large source generations are not shipped.
