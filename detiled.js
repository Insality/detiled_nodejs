#!/usr/bin/env node
//
//       ___           ___           ___                       ___       ___           ___
//      /\  \         /\  \         /\  \          ___        /\__\     /\  \         /\  \
//     /::\  \       /::\  \        \:\  \        /\  \      /:/  /    /::\  \       /::\  \
//    /:/\:\  \     /:/\:\  \        \:\  \       \:\  \    /:/  /    /:/\:\  \     /:/\:\  \
//   /:/  \:\__\   /::\~\:\  \       /::\  \      /::\__\  /:/  /    /::\~\:\  \   /:/  \:\__\
//  /:/__/ \:|__| /:/\:\ \:\__\     /:/\:\__\  __/:/\/__/ /:/__/    /:/\:\ \:\__\ /:/__/ \:|__|
//  \:\  \ /:/  / \:\~\:\ \/__/    /:/  \/__/ /\/:/  /    \:\  \    \:\~\:\ \/__/ \:\  \ /:/  /
//   \:\  /:/  /   \:\ \:\__\     /:/  /      \::/__/      \:\  \    \:\ \:\__\    \:\  /:/  /
//    \:\/:/  /     \:\ \/__/     \/__/        \:\__\       \:\  \    \:\ \/__/     \:\/:/  /
//     \::/__/       \:\__\                     \/__/        \:\__\    \:\__\        \::/__/
//      ~~            \/__/                                   \/__/     \/__/         ~~
//

const fs = require("fs");
const path = require("path");
const tilesets_generator = require("./detiled_exporter/scripts/generate_tilesets");
const export_tiled = require("./detiled_exporter/scripts/generate_defold");

let COMMANDS = {
	"help": help,
	"generate_tilesets": tilesets_generator.start,
	"export": export_tiled.start,
}


function help() {
	console.log(`
	_|_|_|                      _|_|_|_|_|  _|  _|                  _|
	_|    _|    _|_|                _|          _|    _|_|      _|_|_|
	_|    _|  _|_|_|_|  _|_|_|_|_|  _|      _|  _|  _|_|_|_|  _|    _|
	_|    _|  _|                    _|      _|  _|  _|        _|    _|
	_|_|_|      _|_|_|              _|      _|  _|    _|_|_|    _|_|_|


Hi! The Detiled exporter available commands:


detiled generate_tilesets [defold_assets_folder_path] [output_folder_path]
	-- Export assets from Defold asset folder to Tiled's tilesets


detiled export [tilesets_folder_path] [maps_folder_path] [output_folder_path]
	-- Generate Defold collections and other assets from Tiled's maps and tilesets
`);
};


function start() {
	if (!fs.existsSync(path.join(process.cwd(), "game.project"))) {
		console.log("Error: you should run Detiled inside the root of game.project");
		console.log("Current folder is:", process.cwd());
		return;
	}

	let args = process.argv;
	let command = args[2];
	if (command && COMMANDS[command]) {
		COMMANDS[command](args[3], args[4], args[5], args[6]);
	} else {
		help();
	}
}

start()
