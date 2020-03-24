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

let items = {}
let tilesources = {}
let tilesets_db = {}


function load_tilesets_db(output_path) {
	let filepath = path.join(output_path, TILESETS_DB_NAME)
	if (fs.existsSync(filepath)) {
		tilesets_db = JSON.parse(fs.readFileSync(filepath))
		console.log("Load tilesets.db: ", filepath)
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


function process_asset(asset_path, tileset_path) {
	let tileset_name = tileset_path.join("_")
	items[tileset_name] = items[tileset_name] || []

	console.log("Process asset", asset_path, tileset_path)
	let asset_name = path.basename(asset_path)

	let images = fs.readdirSync(path.join(asset_path, "icons"))
		.filter(name => name.endsWith(".png"))

	let anchor_x = 0
	let anchor_y = 0

	let go_path = path.join(asset_path, asset_name + ".go")
	let go_parsed = defold_object.load_from_file(go_path)
	for (let i in go_parsed.embedded_components) {
		let elem = go_parsed.embedded_components[i]
		if (elem.id == "sprite") {
			anchor_x = elem.position[0].x
			anchor_y = elem.position[0].y
		}
	}

	for (let i in images) {
		let image = images[i]
		let image_path = path.join(asset_path, "icons", images[i])
		let size = image_size(image_path)

		let item = {
			image: image_path,
			item: asset_name,
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
	console.log("Process tilesource", tilesource_path, tileset_path)

	let tilesource_data = fs.readFileSync(tilesource_path).toString('utf8')
	let tile_width = parseInt(tilesource_data.match(/tile_width: (.*)/)[1])
	let tile_height = parseInt(tilesource_data.match(/tile_height: (.*)/)[1])
	let tile_image = tilesource_data.match(/image: "(.*)"/)[1]

	let image_path = path.join(process.cwd(), tile_image)
	let size = image_size(image_path)

	let tileset = {
		name: asset_name,
		width: tile_width,
		height: tile_height,
		image_path: image_path,
		tilesource: tilesource_path,
		image_width: size.width,
		image_height: size.height
	}
	tilesources[tileset_name].push(tileset)
}


function process_dir(assets_folder, output_path, tileset_path) {
	tileset_path = tileset_path || []
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


function get_item_id(tileset, item_data) {
	let item_id = item_data.item + ":" + path.basename(item_data.image, ".png")

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
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__object_name").replace("{VALUE}", data.item) + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__go_path").replace("{VALUE}", data.go_path) + "\n"
			properties += TILESET_ITEM_PROPERTY_TEMPLATE.replace("{KEY}", "__image_name").replace("{VALUE}", path.basename(data.image, ".png"))

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
