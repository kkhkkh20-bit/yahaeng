Selected in-game city-study atlas

- Main artist: GuttyKreum, Dotonbori City v3, purchased by the project owner.
- The importer accepts the verified private original tilemap. Its SHA-256 and each selected source rectangle are recorded in `details.json`.
- The original source PNG, purchased ZIPs, Unity assets and reference/demo maps are not distributed in this repository.
- Three vehicle sprites use Kenney RPG Urban Pack 1.0 (CC0). Original source tile IDs and SHA-256 values are recorded separately in the atlas metadata. The game credit already names this pack.
- These are selected parts for the game, not a standalone redistribution of either asset pack.

Rebuild:

```
python tools/import_city_study.py /private/dotonbori/Tilemap/MainTileMap.png --urban /private/kenney-rpg-urban/Tiles
```
