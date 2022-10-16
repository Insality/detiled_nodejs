
[![](media/detiled_logo.png)](https://insality.github.io/detiled/)
[![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/insality) [![Ko-Fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/insality) [![BuyMeACoffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/insality)

[![npm](https://img.shields.io/npm/v/detiled?label=detiled)](https://www.npmjs.com/package/detiled)

**Detiled** - the set of tools to make work with [**Defold**](https://defold.com/) and [**Tiler**](https://www.mapeditor.org/) easier. **Detiled** have designed workflow how to generate **Tiled** tilemaps and tools for generate **Defold** assets from **Tiled** maps.


## Features

- Generate standalone **Tiled** tilesets from **Defold** assets folder
- Generate collection files with gameobjects, collections and tilemaps from created **Tiled** maps
- Generate **Defold** factory and collectionfactory for all tilesets used in generation. This is allow you create DLC folder assets for liveupdate for example
- Generate *mapping file* - list of all usable entities with a lot of additional info (size, properties, urls and other)
- **Defold** script properties is supported - you can adjust it in **Tiled** for each object
- **Tiled** layer groups are supported
- Several images for single asset to generate different **Tiled** tileset objects for easier game objects customization


## Setup

### Node Module

To install **[detiled](https://www.npmjs.com/package/detiled)** use [`npm`](https://docs.npmjs.com/).

```bash
npm install -g detiled
```

For update **detiled** you can use

```bash
npm update -g detiled
```

### Defold Dependency

*Currently in development*


## Usage

### Tiled path

You should point the Tiled location in `TILED` environment field. By default it uses `/Applications/Tiled.app/Contents/MacOS/Tiled` location

### Generate Tiled tilesets *(tsx files)*

Export assets from Defold asset folder to Tiled's tilesets
```
detiled generate_tilesets [defold_assets_folder_path] [output_folder_path]
```

- `defold_assets_folder_path` - is a root folder of your game assets. What is asset in **Detiled** described below
- `output_folder_path` - the output folder for your generated tilesets. It should contains tilesets from previous generation, since **Detiled** can parse it to keep already generated asset indexes. Output folder will contain `.tsx` files and images for this tilesets. This tilesets can be shared with any member of your team to create game maps for example

### Generate Defold stuff

Generate Defold collections and other assets from Tiled's maps and tilesets
```
detiled export [tilesets_folder_path] [maps_folder_path] [output_folder_path]
```
- `tilesets_folder_path` - is a folder with created tilesets in `generate tiled tilesets` step. This folder should contains `tilesets` folder with generated tileset files
- `maps_folder_path`- is a folder with created `.tmx` maps files from Tiled. For each map will be generated `collection` file with all required stuff. For each map will be included factories with all tilesets that this map using
- `output_folder_path` - is folder with all generated Defold stuff. This map is should be not edited due it can be cleaned at export step

### Mapping

At export step with `detiled export` will generate the `mapping.json` file. This file contains all info from all tilesets, included properties, asset info and all other useful stuff you can use in the game


## TODO Docs

- map spawners, how they generated
- assets generating flow
- defold resources generating flow
- groups
- z layering
- custom/additional tiled propeties for export
- scaling/rotate go/collection
- multiply images with single go/collection
- go/collection properties
- autofill properties


## License

- Developed and supported by [Insality](https://github.com/Insality)


## Issues and suggestions

If you have any issues, questions or suggestions please [create an issue](https://github.com/Insality/defold-parser/issues) or contact me: [insality@gmail.com](mailto:insality@gmail.com)


## ❤️ Support project ❤️

Please support me if you like this project! It will help me keep engaged to update **Detiled** and make it even better!

[![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/insality) [![Ko-Fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/insality) [![BuyMeACoffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/insality)

