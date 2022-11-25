const fs = require("fs")
const path = require("path")
const rimraf = require("rimraf")
const image_size = require("image-size")
const defold_parser = require("defold-parser")

const helper = require("../helper")
const constants = require("../constants")
const xml_parser = require("../libs/xml_parser")

const TILESET_TEMPLATE = fs.readFileSync(path.join(__dirname, "templates/tileset_xml.template")).toString('utf8')
const TILESET_ITEM_TEMPLATE = fs.readFileSync(path.join(__dirname, "templates/tileset_xml_item.template")).toString('utf8')
const TILESET_ITEM_PROPERTY_TEMPLATE = fs.readFileSync(path.join(__dirname, "templates/tileset_xml_item_property.template")).toString('utf8')
const TILESET_ITEM_TILESOURCE = fs.readFileSync(path.join(__dirname, "templates/tileset_xml_tilesource.template")).toString('utf8')
const TILESET_ITEM_TILEITEM = fs.readFileSync(path.join(__dirname, "templates/tileset_xml_tileitem.template")).toString('utf8')

let items = {}
let tilesources = {}
let tilesets_db = {}


// Get the data of current tilesets to prevent override of existing entities
// @param output_path string @The folder with .tsx tilesets to override
function parse_tilesets_db_from_tsx(output_path) {
	let tilesets_folder = path.join(output_path, constants.TILESETS_FOLDER_NAME)
	let tilesets = helper.get_files_from(tilesets_folder, "tsx")

	for (let i in tilesets) {
		let tileset = tilesets[i]
		let tileset_name = path.basename(tileset, ".tsx")
		let parsed_tsx = xml_parser.parse(tileset)

		let tileset_info = {}
		for (let j in parsed_tsx.tileset.tile) {
			let tile = parsed_tsx.tileset.tile[j]
			tileset_info[tile["@_class"]] = parseInt(tile["@_id"])
		}
		if (Object.keys(tileset_info).length > 0) {
			tilesets_db[tileset_name] = tileset_info
		}
	}
}


function is_folder_contains_named_file(target_path, file_extension) {
	let folder_name = path.basename(target_path)
	let asset_go_path = path.join(target_path, folder_name + file_extension)
	return fs.existsSync(asset_go_path)
}


function check_number(original) {
	let val = original
	if (!isNaN(parseFloat(val))) {
		val = val.trim()
		if (val.indexOf(".") !== -1) {
			val = val.replace(/0+$/, '')
		}
		if (val == String(parseFloat(val))) {
			return parseFloat(val)
		}
	}

	return original
}


function get_properties_from_script(component, component_name, go_id) {
	let script_data = fs.readFileSync(path.join(process.cwd(), component)).toString('utf8')
	let regex = /go.property\(\s*[\"\'](.*)[\"\']\s*,\s*(.*)\s*\)/g
	let properties = {}

	script_data.split("\n").forEach(function(line, index, arr) {
		if (line.startsWith("go.property")) {
			while ((m = regex.exec(line)) !== null) {
				// This is necessary to avoid infinite loops with zero-width matches
				if (m.index === regex.lastIndex) {
					regex.lastIndex++;
				}
				if (m[1] && m[2]) {
					let property_info = helper.script_to_defold_property(m[1], m[2])
					properties[go_id + ":" + component_name + ":" + property_info.key] = {
						value: check_number(property_info.value),
						type: property_info.type,
					}
				}
			}
		}
	});

	return properties
}


function parse_properties_from_go(go_parsed, go_properties, go_id) {
	for (let i in go_parsed.components) {
		let elem = go_parsed.components[i]
		let component = elem.component[0]
		if (component && component.endsWith(".script")) {
			let properties = get_properties_from_script(component, elem.id[0], go_id)
			for (let prop in properties) {
				if (go_properties[prop]) {
					helper.log("Error: go property duplicate", go_path, prop)
				}
				go_properties[prop] = properties[prop]
			}
		}

		if (elem.properties) {
			for (let prop_key in elem.properties) {
				let prop = elem.properties[prop_key]
				let property_info = helper.defold_to_tiled_property_value(prop.id[0], prop.value[0], prop.type[0])

				go_properties[go_id + ":" + elem.id[0] + ":" + property_info.key] = {
					value: property_info.value,
					type: property_info.type
				}
			}
		}
	}
}


function get_parent_go(collection_data, go_id) {
	for (i in collection_data.embedded_instances) {
		let go_info = collection_data.embedded_instances[i]
		if (go_info.children && go_info.children.indexOf(go_id) >= 0) {
			return go_info
		}
	}

	return null
}


function get_go_anchor_from_collection(collection_data, go_id) {
	let anchors = { x: 0, y: 0 }
	// Iterate over included go's
	for (i in collection_data.embedded_instances) {
		let go_info = collection_data.embedded_instances[i]
		if (go_info.id[0] == go_id) {
			anchors.x = anchors.x + go_info.position[0].x[0]
			anchors.y = anchors.y + go_info.position[0].y[0]

			let parent_go = get_parent_go(collection_data, go_id)
			while (parent_go) {
				anchors.x = anchors.x + parent_go.position[0].x[0]
				anchors.y = anchors.y + parent_go.position[0].y[0]
				parent_go = get_parent_go(collection_data, parent_go.id[0])
			}
		}
	}

	return anchors
}


function process_collection_asset(asset_path, tileset_path) {
	let tileset_name = tileset_path.join("-")
	items[tileset_name] = items[tileset_name] || []

	helper.log("Process collection asset", path.relative(process.cwd(), asset_path), tileset_path.join("-"))

	let asset_name = path.basename(asset_path)
	let image_folder_path = path.join(asset_path, constants.ASSETS_IMAGES_FOLDER)
	let images = []
	if (fs.existsSync(image_folder_path)) {
		images = fs.readdirSync(image_folder_path)
			.filter(name => name.endsWith(".png"))
	}

	let anchors = [] // with different priorities
	let default_image = null
	let image_url = null
	let go_path = path.join(asset_path, asset_name + ".collection")
	let go_parsed = defold_parser.load_from_file(go_path)
	let go_properties = {}

	for (i in go_parsed.embedded_instances) {
		let go_info = go_parsed.embedded_instances[i]
		let go_data = go_info.data[0]
		parse_properties_from_go(go_data, go_properties, go_info.id[0])

		// TODO: Image priority: asset_name.go#asset_name, asset_name.go#sprite, #sprite

		if (go_info.id[0] == "tiled_anchor") {
			anchors[0] = get_go_anchor_from_collection(go_parsed, go_info.id[0])
		}

		for (let j in go_data.embedded_components) {
			let component = go_data.embedded_components[j]
			if (component.id[0] == "sprite") {
				let go_anchor = get_go_anchor_from_collection(go_parsed, go_info.id[0])
				anchors[1] = {}
				anchors[1].x = component.position[0].x[0] + go_anchor.x
				anchors[1].y = component.position[0].y[0] + go_anchor.y
				default_image = component.data[0].default_animation[0]
				image_url = go_info.id[0] + "#" + component.id[0]
			}
		}
	}

	let anchor = anchors[0] || anchors[1] || { x: 0, y: 0 }
	if (images.length > 0) {
		for (let i in images) {
			let image_path = path.join(image_folder_path, images[i])
			let size = image_size(image_path)

			let item = helper.get_assets_item_data(image_path, asset_name, go_properties, size,
				anchor, go_path, default_image, image_url, true)
			items[tileset_name].push(item)
		}
	} else {
		let item = helper.get_assets_item_data(null, asset_name, go_properties, constants.DEFAULT_IMAGE_SIZE,
			anchor, go_path, null, null, true)
		items[tileset_name].push(item)
	}
}


function process_asset(asset_path, tileset_path) {
	let tileset_name = tileset_path.join("-")
	items[tileset_name] = items[tileset_name] || []

	helper.log("Process game object asset", path.relative(process.cwd(), asset_path), tileset_path.join("-"))

	let asset_name = path.basename(asset_path)
	let image_folder_path = path.join(asset_path, constants.ASSETS_IMAGES_FOLDER)
	let images = []
	if (fs.existsSync(image_folder_path)) {
		images = fs.readdirSync(image_folder_path)
			.filter(name => name.endsWith(".png"))
	}

	let anchor = { x: 0, y: 0 }
	let default_image = null
	let image_url = null
	let go_path = path.join(asset_path, asset_name + ".go")
	let go_parsed = defold_parser.load_from_file(go_path)
	let go_properties = {}

	parse_properties_from_go(go_parsed, go_properties, asset_name)

	for (let i in go_parsed.embedded_components) {
		let elem = go_parsed.embedded_components[i]
		if (elem.id[0] == "sprite") {
			anchor.x = elem.position[0].x[0]
			anchor.y = elem.position[0].y[0]
			default_image = elem.data[0].default_animation[0].replace(/\\\"/g, "")
			image_url = "#" + elem.id[0]
		}
	}

	if (images.length > 0) {
		for (let i in images) {
			let image_path = path.join(image_folder_path, images[i])
			let size = image_size(image_path)

			let item = helper.get_assets_item_data(image_path, asset_name, go_properties, size,
					anchor, go_path, default_image, image_url, false)
			items[tileset_name].push(item)
		}
	} else {
		let item = helper.get_assets_item_data(null, asset_name, go_properties, constants.DEFAULT_IMAGE_SIZE,
			anchor, go_path, null, null, false)
		items[tileset_name].push(item)
	}
}


function process_tilesource(asset_path, tileset_path) {
	let tileset_name = tileset_path.join("-")
	tilesources[tileset_name] = tilesources[tileset_name] || []

	let asset_name = path.basename(asset_path)
	let tilesource_path = path.join(asset_path, asset_name + ".tilesource")

	let tilesource_data = fs.readFileSync(tilesource_path).toString('utf8')
	let tile_width = parseInt(tilesource_data.match(/tile_width: (.*)/)[1])
	let tile_height = parseInt(tilesource_data.match(/tile_height: (.*)/)[1])
	let tile_spacing = parseInt(tilesource_data.match(/tile_spacing: (.*)/)[1]) || 0
	let tile_margin = parseInt(tilesource_data.match(/tile_margin: (.*)/)[1]) || 0
	let tile_image = tilesource_data.match(/image: "(.*)"/)[1]

	let image_path = path.join(process.cwd(), tile_image)
	let size = image_size(image_path)

	let tileset = {
		name: asset_name,
		width: tile_width,
		height: tile_height,
		image_path: image_path,
		tilesource_path: "/" + path.relative(process.cwd(), tilesource_path),
		image_width: size.width,
		image_height: size.height,
		tile_spacing: tile_spacing,
		tile_margin: tile_margin,
	}
	tilesources[tileset_name].push(tileset)
}


function process_dir(assets_folder, output_path, tileset_path) {
	tileset_path = tileset_path || [ constants.ASSETS_FOLDER_NAME ]
	let files = fs.readdirSync(assets_folder)
	let folders = files.filter(name => fs.statSync(path.join(assets_folder, name)).isDirectory())

	for (let i in folders) {
		let target_path = path.join(assets_folder, folders[i])
		if (is_folder_contains_named_file(target_path, ".collection")) {
			process_collection_asset(target_path, tileset_path)
		} else if (is_folder_contains_named_file(target_path, ".go")) {
			process_asset(target_path, tileset_path)
		} else if (is_folder_contains_named_file(target_path, ".tilesource")) {
			process_tilesource(target_path, tileset_path)
		} else {
			// Recursive assets search
			let folder_name = path.basename(target_path)
			let new_path = tileset_path.slice()
			new_path.push(folder_name)
			process_dir(target_path, output_path, new_path)
		}
	}
}

function get_item_name(item_data) {
	if (item_data.image_name) {
		return item_data.item + "-" + item_data.image_name
	} else {
		return item_data.item + "-" + item_data.item
	}
}


function get_item_id(tileset, item_data) {
	let item_id = get_item_name(item_data)

	tilesets_db[tileset] = tilesets_db[tileset] || {}

	if (tilesets_db[tileset][item_id] === undefined) {
		let max_id = -1
		for (let i in tilesets_db[tileset]) {
			max_id = Math.max(tilesets_db[tileset][i], max_id)
		}
		tilesets_db[tileset][item_id] = max_id + 1
	}

	return tilesets_db[tileset][item_id]
}


function write_tilesets(output_path, items) {
	let tileset_folder = path.join(output_path, "tilesets")
	let images_folder = path.join(output_path, "images")

	rimraf.sync(images_folder)
	rimraf.sync(tileset_folder)
	fs.mkdirSync(images_folder, { recursive: true })
	fs.mkdirSync(tileset_folder, { recursive: true })

	for (let name in items) {
		let item_list = items[name]

		let tileset = TILESET_TEMPLATE.replace("{TILESET_NAME}", name)
		tileset = tileset.replace("{TILESET_COUNT}", item_list.length)
		let max_width = 0
		let max_height = 0

		let tileset_items = ""
		for (let i in item_list) {
			let data = item_list[i]
			let item_id = get_item_id(name, data)
			let item = TILESET_ITEM_TEMPLATE.replace("{ITEM_ID}", item_id)
			item = item.replace("{ITEM_CLASS}", get_item_name(data))
			item = item.replace("{IMAGE_WIDTH}", data.width)
			item = item.replace("{IMAGE_HEIGHT}", data.height)
			item = item.replace("{ANCHOR_X}", data.anchor_x)
			item = item.replace("{ANCHOR_Y}", data.anchor_y)

			let tiled_image_name = name + "-" + get_item_name(data) + ".png"
			let new_image_path = path.join(images_folder, name)
			let image_path = data.image_path || path.join(process.cwd(), constants.DEFAULT_IMAGE)
			new_image_path = path.join(new_image_path, tiled_image_name)

			fs.mkdirSync(path.dirname(new_image_path), { recursive: true })
			fs.copyFileSync(image_path, new_image_path)
			item = item.replace("{IMAGE_PATH}", path.relative(tileset_folder, new_image_path))

			let properties = ""
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__object_name").replace("{VALUE}", data.item).replace("{TYPE}", "") + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__go_path").replace("{VALUE}", data.go_path).replace("{TYPE}", "") + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__image_name").replace("{VALUE}", path.basename(image_path, ".png")).replace("{TYPE}", "") + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__is_collection").replace("{VALUE}", data.is_collection && "true" || "false").replace("{TYPE}", 'type="bool"') + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__default_image_name").replace("{VALUE}", data.default_image).replace("{TYPE}", "")
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__image_url").replace("{VALUE}", data.image_url).replace("{TYPE}", "")

			for (let key in data.properties) {
				let property_type = data.properties[key].type
				let property = data.properties[key].value
				let type = helper.defold_to_tiled_property_xml_type(property_type)
				properties += "\n" + TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", key).replace("{VALUE}", property).replace("{TYPE}", type)
			}

			item = item.replace("{PROPERTIES}", properties)

			max_width = Math.max(data.width, max_width)
			max_height = Math.max(data.height, max_height)
			tileset_items += item
		}

		tileset = tileset.replace("{ITEMS}", tileset_items)
		tileset = tileset.replace("{TILESET_WIDTH}", max_width)
		tileset = tileset.replace("{TILESET_HEIGHT}", max_height)

		let tileset_path = path.join(tileset_folder, name + ".tsx")
		helper.log("Write tileset", tileset_path)
		fs.writeFileSync(tileset_path, tileset)
	}

	for (let category in tilesources) {
		for (let index in tilesources[category]) {
			let tilesource = tilesources[category][index]
			let filename = category + "-" + tilesource.name

			let tileset = TILESET_ITEM_TILESOURCE.replace("{TILESET_NAME}", tilesource.name)
			tileset = tileset.replace("{TILESET_WIDTH}", tilesource.width)
			tileset = tileset.replace("{TILESET_HEIGHT}", tilesource.height)
			tileset = tileset.replace("{TILESET_SPACING}", tilesource.tile_spacing)
			tileset = tileset.replace("{TILESET_MARGIN}", tilesource.tile_margin)
			tileset = tileset.replace("{TILESOURCE_PATH}", tilesource.tilesource_path)
			let count = (tilesource.image_height / tilesource.height) * (tilesource.image_width / tilesource.width)
			tileset = tileset.replace("{TILESET_COUNT}", count)

			let image_path = path.join(images_folder, category)
			image_path = path.join(image_path, path.basename(tilesource.image_path))

			fs.mkdirSync(path.dirname(image_path), { recursive: true })
			fs.copyFileSync(tilesource.image_path, image_path)

			let item = TILESET_ITEM_TILEITEM.replace("{TILESET_PATH}", path.relative(tileset_folder, image_path))
			item = item.replace("{IMAGE_WIDTH}", tilesource.image_width)
			item = item.replace("{IMAGE_HEIGHT}", tilesource.image_height)
			tileset = tileset.replace("{ITEMS}", item)

			let tileset_path = path.join(tileset_folder, filename + ".tsx")
			helper.log("Write tilesource tileset", tileset_path)
			fs.writeFileSync(tileset_path, tileset)
		}
	}
}


function start(assets_folder_path, output_folder_path) {
	helper.log("Start generate tilesets from Defold assets")
	let assets_folder = path.resolve(assets_folder_path)
	let output_path = path.resolve(output_folder_path)

	parse_tilesets_db_from_tsx(output_path)
	process_dir(assets_folder, output_path)
	write_tilesets(output_path, items)
}


module.exports.start = start
