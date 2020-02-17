const fs = require("fs")
const path = require("path")
const process = require("process")
const tilesets = require("./scripts/tilesets")
const maps = require("./scripts/maps")

function process_tileset(data, output_path, mapping) {
	tilesets.generate_factories(data, output_path, mapping)
}


function process_map(map_path, data, output_path) {
	let name = path.basename(map_path, ".json")
	console.log("Process map", name)
	maps.generate_spawners(name, data, output_path)

	// Add tilesource name to the map
	for (let i in data.tilesets) {
		let d = data.tilesets[i]
		d.name = path.basename(d.source, ".tsx")
	}

	fs.writeFileSync(map_path, JSON.stringify(data))
}


function process_json(json_path, output_path, mapping) {
	let json_content = JSON.parse(fs.readFileSync(json_path))
	let json_type = json_content.type

	if (json_type == "tileset") {
		process_tileset(json_content, output_path, mapping)
	}
	if (json_type == "map") {
		process_map(json_path, json_content, output_path)
	}
	console.log("")
}


function start_process_dir(tilesets_path, maps_path, output_path) {
	let jsons = []

	let tilesets = fs.readdirSync(tilesets_path)
		.filter(name => name.endsWith(".json"))
		.map(name => path.join(tilesets_path, name))

	let maps = fs.readdirSync(maps_path)
		.filter(name => name.endsWith(".json"))
		.map(name => path.join(maps_path, name))

	jsons = tilesets.concat(maps)

	console.log("Process next files:", jsons)

	let mapping = {}
	for (let i in jsons) {
		process_json(jsons[i], output_path, mapping)
	}

	let mapping_path = path.join(output_path, "mapping.json")
	fs.writeFileSync(mapping_path, JSON.stringify(mapping))
	console.log("Write", mapping_path)
}


function main() {
	console.log("Start tiled generator")
	let tilesets_path = path.join(process.cwd(), process.argv[2])
	let maps_path = path.join(process.cwd(), process.argv[3])
	let output_path = path.join(process.cwd(), process.argv[4])

	if (!fs.existsSync(path.join(process.cwd(), "game.project"))) {
		console.log("Error: you should run script inside the root of game.project")
		return
	}

	start_process_dir(tilesets_path, maps_path, output_path)
}

main()
