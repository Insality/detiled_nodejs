const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");

const xml_parse_options = {
	ignoreAttributes: false,
	attributeNamePrefix : "@_",
	allowBooleanAttributes: true
};

const M = {}

M.parse = function(xml_path) {
	let tileset_data = fs.readFileSync(xml_path).toString('utf8');
	let parser = new XMLParser(xml_parse_options);
	return parser.parse(tileset_data);
};


M.get_tile_by_id = function(xml_path, id) {
	let parsed = this.parse(xml_path);
	for (let i in parsed.tileset.tile) {
		let tile = parsed.tileset.tile[i];
		if (tile["@_id"] == id) {
			return tile;
		}
	}
	return null;
};

module.exports = M
