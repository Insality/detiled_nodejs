
[![](media/detiled_logo.png)](https://insality.github.io/detiled/)
[![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/insality) [![Ko-Fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/insality) [![BuyMeACoffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/insality)

[![npm](https://img.shields.io/npm/v/detiled?label=detiled)](https://www.npmjs.com/package/detiled)

**Detiled** - the set of tools to make work with [**Defold**](https://defold.com/) and [**Tiled**](https://www.mapeditor.org/) easier. **Detiled** have designed workflow how to generate **Tiled** tilemaps and tools for generate **Defold** assets from **Tiled** maps.


## Features

- Generate standalone **Tiled** tilesets from **Defold** assets folder
- Generate collection files with gameobjects, collections and tilemaps from created **Tiled** maps
- Generate **Defold** factory and collectionfactory for all tilesets used in generation. This is allow you create DLC folder assets for liveupdate for example
- Generate *mapping file* - list of all usable entities with a lot of additional info (size, properties, urls and other)
- **Defold** script properties is supported - you can adjust it in **Tiled** for each object
- Generate objects into **Defold** collections directly, without any code to spawn it *(can be disabled via layer property)*
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

*Currently in development. For basic workflow it's not required*


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

At export step with `detiled export` will generate the `mapping.json` at `output_folder_path`. This file contains all info from all tilesets, included properties, asset info and all other useful stuff you can use in the game.
Example of mapping of single asset:
```js
"some_tileset_name": { // Records for every processed tileset
	"20": { // Id of object from Tiled map inside tileset
		"object_name": "weapon", // The go name
		"is_collection": false, // Flag if this is collection or not
		"image_name": "tile_0131", // The image assigned to this object
		"image_url": "#sprite", // The anchor image url from go/collection
		"anchor": {
			"x": 0,
			"y": 8
		}, // Offset from object position to center of anchor image
		"width": 16, // Anchor image width
		"height": 16, // Anchor image height
		"go_path": "/example/assets/dungeon/objects/weapon/weapon.go", // File path in game assets
		"properties": {
			"__default_image_name": "tile_0126", // The default image in Defold assets of anchor image
			"weapon:detiled_init_image:detiled_image_url": "#sprite", // Autofill property for script property of generated asset. The same as image_url
			"weapon:detiled_init_image:detiled_init_image": "tile_0131", // Autofill property for script property of generated asset. The same as image_name
			"weapon:weapon_script:power": 20 // Default script property value
		}
	}
}
```


## Generate Tiled tilesets flow

To generate tilesets you should pass the assets folder. The assets folder is a folder with your game assets.

The every object should be placed inside folder with the same name as this folder.
Assets can be **(in priority order)**:
- the `{name}.collection` object inside `{name}` folder
- the `{name}.go` object inside `{name}` folder
- the `{name}.tilesource` object inside `{name}` folder

if asset is not found inside folder, the script goes recursive inside other folders
The tileset name is generated with names of all folders before. For example if your assets placed in `assets->dungeon->objects` the tileset will have the name `assets-dungeon-objects.tsx`

Every asset can have images for **Tiled** items. This images should be placed inside `images` folder in asset folder. For every image in this folder will be generated object for Tiled tileset. If no images was found, will be used the placeholder image.

To place correctly the objects from **Tiled** to **Defold**, the exported will inspect the `*.collection` or `*.go` file to find the anchor image and his position.

Anchor image will be used to gather offset for game object position generation, also this anchor image can be adjusted with relative image of Tiled object for every object inside `images` folder. See `autofill properties` and `anchor image` to get more info.

If you remove or rename asset, it will be removed from tilesets on next tilesets generation. The tileset item ID of removed asset will be never use again (if you generate over existing tilesets).

You can change the images and add new objects (or images for existing object) without any risks.

Due the override issues, keep the `tsx` and `tmx` files under version control.

All properties inside asset will be proposed to Tiled object properties. So you able to override it inside Tiled object properties on map editing. It's very useful to custom the properties of single object *(health of enemy, amount of gold or unique ID to get different data from you game database)*.

You can scale objects and rotate them, this is supported by **Detiled**.


## Generate Defold assets flow

To generate **Defold** assets, you should point the previous generated tilesets folder, the folder with created `tmx` **Tiled** maps and folder, where generated assets should be placed. The generated folder will be erased before generate, so don't modify it or don't place any handmade assets.

To use generated map (it will be collection name with name of the map), include this collection inside your game collection.

For every tilesets will be generated `spawners` - the game object with all required factories or collectionfactories for this tileset.

Every generated map will include all required spawners to able spawn all entities inside *(if you want to spawn in manually)*.

Since **Tiled** tilemap export is not perfect, I recommend you to re-save project in **Defold** after the export step to remove all unintended changes inside your VSC

### Properties
- `no_export` - set to true to skip export of this object layer. Useful if you want create objects of this layer by yourself.
- `z` - set value to adjust the z position of generated object layer


## Glossary
- `Anchor image` - the image from asset, which exported thinks as main image. It find it as game object with sprite component. If sprite component or game object inside collection have the asset name, it will have more priority, than others. Otherwise the sprite with name `#sprite` have more priority than other sprite components
- `Autofill properties` - the `detiled` properties, that can be set automatically on export. It have name `detiled_*`. For example `detiled_init_image` will be setup for all scripts of assets if will be found. You can use `detiled_init_image.script` to setup the image of asset on creating *(since **Defold** is not allow to override go or collection sprite properties directly)*
- `Image anchor` - offset from anchor image to center of game object (or collection). It used to place perfectly objects from **Tiled** to **Defold** on export


## License

- Developed and supported by [Insality](https://github.com/Insality)


## Issues and suggestions

If you have any issues, questions or suggestions please [create an issue](https://github.com/Insality/defold-parser/issues) or contact me: [insality@gmail.com](mailto:insality@gmail.com)


## ❤️ Support project ❤️

Please support me if you like this project! It will help me keep engaged to update **Detiled** and make it even better!

[![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/insality) [![Ko-Fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/insality) [![BuyMeACoffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/insality)

