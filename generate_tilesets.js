const fs = require("fs")
const image_size = require("image-size")
const path = require("path")
const rimraf = require("rimraf")
const defold_object = require("./libs/defold-object")

const TILESET_TEMPLATE = fs.readFileSync(path.join(__filename, "../templates/tileset_xml.template")).toString('utf8')
const TILESET_ITEM_TEMPLATE = fs.readFileSync(path.join(__filename, "../templates/tileset_xml_item.template")).toString('utf8')
const TILESET_ITEM_PROPERTY_TEMPLATE = fs.readFileSync(path.join(__filename, "../templates/tileset_xml_item_property.template")).toString('utf8')


let items = {}

function is_asset_folder(target_path) {
	let folder_name = path.basename(target_path)
	let asset_go_path = path.join(target_path, folder_name + ".go")
	return fs.existsSync(asset_go_path)
}


function process_asset(asset_path, tileset_path) {
	let tileset_name = tileset_path.join("_")
	items[tileset_name] = items[tileset_name] || []
	console.log("Process asset", asset_path, tileset_path)
	let asset_name = path.basename(asset_path)

	let images = fs.readdirSync(path.join(asset_path, "images"))
		.filter(name => name.endsWith(".png"))

	let anchor_x = 0
	let anchor_y = 0

	let go_path = path.join(asset_path, asset_name + ".go")
	let go_parsed = defold_object.LoadFromFile(go_path)
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
			width: size.width,
			height: size.height,
			anchor_x: anchor_x + size.width/2,
			anchor_y: anchor_y + size.height/2,
			go_path: "/" + path.relative(process.cwd(), go_path)
		}
		items[tileset_name].push(item)
	}
}


function process_dir(assets_folder, output_path, tileset_path) {
	tileset_path = tileset_path || []
	let files = fs.readdirSync(assets_folder)
	let folders = files.filter(name => fs.statSync(path.join(assets_folder, name)).isDirectory())

	for (let i in folders) {
		let target_path = path.join(assets_folder, folders[i])
		if (is_asset_folder(target_path)) {
			process_asset(target_path, tileset_path)
		} else {
			let folder_name = path.basename(target_path)
			let new_path = tileset_path.slice()
			new_path.push(folder_name)
			process_dir(target_path, output_path, new_path)
		}
	}
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
			let item = TILESET_ITEM_TEMPLATE.replace("{ITEM_ID}", i)
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
	process_dir(assets_folder, output_path)
	write_tilesets(output_path, items)
}

main()
