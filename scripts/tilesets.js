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
M.generate_factories = function(data, output_path, mapping) {
	console.log("Start generate factories for", data.name)

	mapping[data.name] = mapping[data.name] || {}
	let tiles = data.tiles

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

		let properties = get_all_properies(tile.properties)
		let anchor = get_anchor(tile)
		let object_name = properties.__object_name

		mapping[data.name][tile.id] = {
			object_name: object_name,
			image_name: properties.__image_name,
			anchor: anchor,
			width: tile.imagewidth,
			height: tile.imageheight,
			properties: properties
		}

		if (!objects_ready[object_name]) {
			let spawner_data = FACTORY_NODE_TEMPLATE.replace("{1}", object_name)
			spawner_data = spawner_data.replace("{2}", properties.__go_path)
			spawner_go += spawner_data 
			objects_ready[object_name] = true
		}

		// delete system properties from generator
		delete properties.__go_path
		delete properties.__object_name
		delete properties.__image_name
	}

	let spawner_folder = path.join(output_path, "spawners")
	fs.mkdirSync(spawner_folder, { recursive: true })
	let spawner_path = path.join(spawner_folder, "spawner_" + data.name + ".go")
	fs.writeFileSync(spawner_path, spawner_go)
	console.log("Add", spawner_path)
}


module.exports = M
