const fs = require("fs")
const image_size = require("image-size")
const path = require("path")
const rimraf = require("rimraf")
const defold_object = require("./libs/defold-object")

const TILESET_TEMPLATE = fs.readFileSync(path.join(__filename, "../templates/tileset_xml.template")).toString('utf8')
const TILESET_ITEM_TEMPLATE = fs.readFileSync(path.join(__filename, "../templates/tileset_xml_item.template")).toString('utf8')
const TILESET_ITEM_PROPERTY_TEMPLATE = fs.readFileSync(path.join(__filename, "../templates/tileset_xml_item_property.template")).toString('utf8')
const TILESET_ITEM_TILESOURCE = fs.readFileSync(path.join(__filename, "../templates/tileset_xml_tilesource.template")).toString('utf8')
const TILESET_ITEM_TILEITEM = fs.readFileSync(path.join(__filename, "../templates/tileset_xml_tileitem.template")).toString('utf8')

const TILESETS_DB_NAME = "tilesets.db"
const TILESET_DEFAULT_PREFIX = "assets"

let items = {}
let tilesources = {}
let tilesets_db = {}

const PROPERTY_TYPE_NUMBER = "PROPERTY_TYPE_NUMBER"
const PROPERTY_TYPE_VECTOR3 = "PROPERTY_TYPE_VECTOR3"
const PROPERTY_TYPE_VECTOR4 = "PROPERTY_TYPE_VECTOR4"
const PROPERTY_TYPE_QUAT = "PROPERTY_TYPE_QUAT"
const PROPERTY_TYPE_URL = "PROPERTY_TYPE_URL"
const PROPERTY_TYPE_HASH = "PROPERTY_TYPE_HASH"
const PROPERTY_TYPE_BOOLEAN = "PROPERTY_TYPE_BOOLEAN"


function load_tilesets_db(output_path) {
	let filepath = path.join(output_path, TILESETS_DB_NAME)
	if (fs.existsSync(filepath)) {
		let tileset_data = fs.readFileSync(filepath)
		try {
			tilesets_db = JSON.parse(tilesed_data)
			console.log("Load tilesets.db: ", filepath)
		} catch (err) {
			tilesets_db = {}
		}
	} else {
		tilesets_db = {}
	}
}


function save_tilesets_db(output_path) {
	let filepath = path.join(output_path, TILESETS_DB_NAME)

	fs.writeFileSync(filepath, JSON.stringify(tilesets_db, null, 2))
	console.log("Write tilesets.db:", filepath)
}


function is_asset_folder(target_path) {
	let folder_name = path.basename(target_path)
	let asset_go_path = path.join(target_path, folder_name + ".go")
	return fs.existsSync(asset_go_path)
}


function is_tilesource_folder(target_path) {
	let folder_name = path.basename(target_path)
	let asset_go_path = path.join(target_path, folder_name + ".tilesource")
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


function get_content_in_bracers(line) {
	let regex = /\((.*?)\)/g
	while ((m = regex.exec(line)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		let value =  m[1].trim()

		if ((value.charAt(0) === '"' && value.charAt(value.length -1) === '"') ||
			(value.charAt(0) === "'" && value.charAt(value.length -1) === "'")) {
			value = value.substr(1, value.length -2);
		}

		return value
	}
	return ""
}


function parse_vector(vector) {
	let values = []
	vector.split(",").forEach(function(value) {
		let new_value = value.trim()
		if (new_value.length == 0) {
			new_value = "0"
		}
		if (!new_value.includes(".")) {
			new_value = new_value + ".0"
		}
		values.push(new_value)
	})

	return values.join(", ")
}


function get_properties_from_script(component) {
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
					let key = m[1].trim()
					let type = PROPERTY_TYPE_NUMBER

					let value = m[2].trim()
					if (value.startsWith("hash")) {
						value = get_content_in_bracers(value)
						type = PROPERTY_TYPE_HASH
					}
					if (value.startsWith("msg.url")) {
						value = get_content_in_bracers(value)
						type = PROPERTY_TYPE_URL
					}
					if (value.startsWith("vmath.vector3")) {
						value = get_content_in_bracers(value)
						value = parse_vector(value)
						type = PROPERTY_TYPE_VECTOR3
					}
					if (value.startsWith("vmath.vector4")) {
						value = get_content_in_bracers(value)
						value = parse_vector(value)
						type = PROPERTY_TYPE_VECTOR4
					}
					if (value.startsWith("vmath.quat")) {
						value = get_content_in_bracers(value)
						value = "quat " + parse_vector(value)
						type = PROPERTY_TYPE_QUAT
					}
					if (value.startsWith("resource.")) {
						value = get_content_in_bracers(value)
						type = PROPERTY_TYPE_HASH
					}
					if (value == "true" || value == "false") {
						value = (value == "true") && true || false
						type = PROPERTY_TYPE_BOOLEAN
					}
					properties[key] = {
						value: check_number(value),
						type: type,
					}
				}
			}
		}
	});

	return properties
}


function process_asset(asset_path, tileset_path) {
	let tileset_name = tileset_path.join("-")
	items[tileset_name] = items[tileset_name] || []

	console.log("Process asset", asset_path, tileset_path)
	let asset_name = path.basename(asset_path)

	let images = fs.readdirSync(path.join(asset_path, "images"))
		.filter(name => name.endsWith(".png"))

	let anchor_x = 0
	let anchor_y = 0

	let go_path = path.join(asset_path, asset_name + ".go")
	let go_parsed = defold_object.load_from_file(go_path)

	let go_properties = {}

	for (let i in go_parsed.components) {
		let elem = go_parsed.components[i]
		if (elem.component && elem.component.endsWith(".script")) {
			let properties = get_properties_from_script(elem.component)
			for (let prop in properties) {
				if (go_properties[prop]) {
					console.log("Error: go property duplicate", go_path, prop)
				}
				go_properties[prop] = properties[prop]
			}
		}
		if (elem.properties) {
			for (let prop_key in elem.properties) {
				let prop = elem.properties[prop_key]
				if (prop.type == "PROPERTY_TYPE_NUMBER") {
					prop.value = parseFloat(prop.value)
				}
				// id, value, type  (PROPERTY_TYPE_NUMBER, PROPERTY_TYPE_VECTOR3, PROPERTY_TYPE_STRING
				go_properties[prop.id] = {
					value: prop.value,
					type: prop.type
				}
			}
		}
	}

	console.log(go_properties)

	for (let i in go_parsed.embedded_components) {
		let elem = go_parsed.embedded_components[i]
		if (elem.id == "sprite") {
			anchor_x = elem.position[0].x
			anchor_y = elem.position[0].y
		}
	}

	for (let i in images) {
		let image = images[i]
		let image_path = path.join(asset_path, "images", images[i])
		let size = image_size(image_path)

		let item = {
			image: image_path,
			item: asset_name,
			properties: go_properties,
			width: size.width,
			height: size.height,
			anchor_x: anchor_x + size.width/2,
			anchor_y: anchor_y + size.height/2,
			go_path: "/" + path.relative(process.cwd(), go_path)
		}
		items[tileset_name].push(item)
	}
}


function process_tilesource(asset_path, tileset_path) {
	let tileset_name = tileset_path.join("_")
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
	tileset_path = tileset_path || [ TILESET_DEFAULT_PREFIX ]
	let files = fs.readdirSync(assets_folder)
	let folders = files.filter(name => fs.statSync(path.join(assets_folder, name)).isDirectory())

	for (let i in folders) {
		let target_path = path.join(assets_folder, folders[i])
		if (is_asset_folder(target_path)) {
			process_asset(target_path, tileset_path)
		} else if (is_tilesource_folder(target_path)) {
			process_tilesource(target_path, tileset_path)
		} else {
			let folder_name = path.basename(target_path)
			let new_path = tileset_path.slice()
			new_path.push(folder_name)
			process_dir(target_path, output_path, new_path)
		}
	}
}

function get_item_name(item_data) {
	return item_data.item + "-" + path.basename(item_data.image, ".png")
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

			let new_image_path = path.join(images_folder, name)
			new_image_path = path.join(new_image_path, path.basename(data.image))

			fs.mkdirSync(path.dirname(new_image_path), { recursive: true })
			fs.copyFileSync(data.image, new_image_path)
			item = item.replace("{IMAGE_PATH}", path.relative(tileset_folder, new_image_path))

			let properties = ""
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__object_name").replace("{VALUE}", data.item).replace("{TYPE}", "") + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__go_path").replace("{VALUE}", data.go_path).replace("{TYPE}", "") + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__image_name").replace("{VALUE}", path.basename(data.image, ".png")).replace("{TYPE}", "")

			for (let key in data.properties) {
				let property_type = data.properties[key].type
				let property = data.properties[key].value
				let type = ""
				if (property_type == PROPERTY_TYPE_BOOLEAN) {
					type = 'type="bool"'
				}
				if (property_type == PROPERTY_TYPE_NUMBER) {
					type = 'type="float"'
				}

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
		console.log("Write tileset", tileset_path)
		fs.writeFileSync(tileset_path, tileset)
	}

	for (let category in tilesources) {
		for (let index in tilesources[category]) {
			let tilesource = tilesources[category][index]
			let name = tilesource.name

			let tileset = TILESET_ITEM_TILESOURCE.replace("{TILESET_NAME}", name)
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

			let tileset_path = path.join(tileset_folder, name + ".tsx")
			console.log("Write tilesource tileset", tileset_path)
			fs.writeFileSync(tileset_path, tileset)
		}
	}
}


function main() {
	console.log("Start generate tilesets")
	let assets_folder = path.join(process.cwd(), process.argv[2])
	let output_path = path.join(process.cwd(), process.argv[3])

	if (!fs.existsSync(path.join(process.cwd(), "game.project"))) {
		console.log("Error: you should run script inside the root of game.project")
		return
	}

	items = {}
	load_tilesets_db(output_path)

	process_dir(assets_folder, output_path)
	write_tilesets(output_path, items)

	save_tilesets_db(output_path)
}

main()
