const fs = require("fs")
const path = require("path")
const process = require("process")
const settings = require("../settings.json")

const FACTORY_NODE_TEMPLATE = fs.readFileSync(path.join(__dirname, "../templates/factory_node.template")).toString('utf8')

const M = {}


function get_property(props, prop_name) {
	for (let i in props) {
		if (props[i].name == prop_name) {
			return props[i].value
		}
	}
}


function get_all_properies(props) {
	let map = {}
	for (let i in props) {
		map[props[i].name] = props[i].value
	}
	return map
}


function get_anchor(tile) {
	if (tile.objectgroup) {
		let objects = tile.objectgroup.objects
		for (let i in objects) {
			let object = objects[i]
			if (object.point) {
				return {
					x: tile.imagewidth/2 - object.x,
					y: tile.imageheight/2 - (tile.imageheight - object.y)
				}
			}
		}
	}
	return {
		x: 0,
		y: 0
	}
}


/// Generate new objects for all images
// It is not override previous objects, due to customization
M.generate_objects = function(data, output_path, mapping) {
	console.log("Start generate game objects for", data.name)

	mapping[data.name] = mapping[data.name] || {}
	let tiles = data.tiles
	let generated = 0
	let skipped = 0

	let spawner_go = ""
	let objects_ready = {}

	for (let i in tiles) {
		let tile = tiles[i]
		let tile_image = path.basename(tile.image)
		let props = tile.properties

		if (!props) {
			console.log("No properties at object", tile_image)
			continue
		}

		let object_name = get_property(props, "object_name")
		if (!object_name) {
			console.log("No property `object_name` at object", tile_image)
			continue
		}
		let anchor = get_anchor(tile)

		mapping[data.name][tile.id] = {
			object_name: object_name,
			image_name: tile_image.split(".")[0],
			anchor: anchor,
			width: tile.imagewidth,
			height: tile.imageheight,
			properties: get_all_properies(tile.properties)
		}

		let object_path = path.join(output_path, "objects", data.name)
		fs.mkdirSync(object_path, { recursive: true })

		let object_full_path = path.join(object_path, object_name + ".go")
		let object_game_path = object_full_path.replace(process.cwd(), "")

		if (!objects_ready[object_name]) {
			let spawner_data = FACTORY_NODE_TEMPLATE.replace("{1}", object_name)
			spawner_data = spawner_data.replace("{2}", object_game_path)
			spawner_go += spawner_data 
			objects_ready[object_name] = true
		}
	}

	console.log("End generate objects. Generated: ", generated, "Skipped:", skipped)

	let spawner_folder = path.join(output_path, "spawners")
	fs.mkdirSync(spawner_folder, { recursive: true })
	let spawner_path = path.join(spawner_folder, "spawner_" + data.name + ".go")
	fs.writeFileSync(spawner_path, spawner_go)
	console.log("Add", spawner_path)
}


module.exports = M
