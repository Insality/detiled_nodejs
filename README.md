[![](media/detiled_logo.png)](https://insality.github.io/detiled/)

**De-Tiled Workflow** - bunch of tools to make work with Defold and Tiler easier.
Tiled Generator can do next stuff:

- Generate Tiled tilesets from Defold assets folder
- Generade Defold factories and collections from Tiled map and tilesets
- Generate mapping - list of all usable entities

## Setup

-- TODO

## Usage

Okay, need to refactor all project
But current usage:

### Generate tilesets

`node generate_tilesets.js {assets_folder} {output_folder}`
If in output folder exists file *tilesets.db*, is will be loaded.
Tool should be called from game.project folder
Output folder can be use separatly in Tiles (for example by your level designers)


### Generate Defold stuff

`node index.js {folder_with_tilesets.json} {folder_with_maps.json} {output_folder}`


Tilesets and maps should be exported from Tiled as json
or with command:

`tiled --export-tileset tileset.tsx tileset.json`
`tiled --export-map map.tmx map.json`

Generator will create spawners (go with factories) for every tileset
Generator will create map_spawner collection with only used spawners in this map for every map


### Mapping
The most important file after generate tilesets: tilesets.db. It can help to keep id of resources persistant on the maps
Don't lose it and better to store it under VCS


## License

Developed by [Insality](https://github.com/Insality)

**MIT** License


## Issues and suggestions

If you have any issues, questions or suggestions please [create an issue](https://github.com/Insality/defold-tiled-generator/issues) or contact me: [insality@gmail.com](mailto:insality@gmail.com)


## ISSUES
No exporter found for target file. - add .collection exported in tiled
