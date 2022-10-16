const fs = require("fs");
const path = require("path");

const M = {}

const PROPERTY_TYPE_NUMBER = "PROPERTY_TYPE_NUMBER"
const PROPERTY_TYPE_VECTOR3 = "PROPERTY_TYPE_VECTOR3"
const PROPERTY_TYPE_VECTOR4 = "PROPERTY_TYPE_VECTOR4"
const PROPERTY_TYPE_QUAT = "PROPERTY_TYPE_QUAT"
const PROPERTY_TYPE_URL = "PROPERTY_TYPE_URL"
const PROPERTY_TYPE_HASH = "PROPERTY_TYPE_HASH"
const PROPERTY_TYPE_BOOLEAN = "PROPERTY_TYPE_BOOLEAN"

const MAP_PROPERTY_TYPE = {
	PROPERTY_TYPE_BOOLEAN: 'type="bool"',
	PROPERTY_TYPE_NUMBER: 'type="float"',
}


M.log = function(message) {
	console.log("[Di-Tiled]:", message)
};


M.contains_count = function(string, substring) {
	return string.split(substring).length - 1;
};


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


M.script_to_defold_property = function(key, value) {
	key = key.trim()
	value = value.trim()

	let type = PROPERTY_TYPE_NUMBER
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

	return {
		key: key,
		value: value,
		type: type
	}
}

M.defold_to_tiled_property_value = function(key, value, type) {
	if (type == PROPERTY_TYPE_NUMBER) {
		value = parseFloat(value)
	}
	if (type == PROPERTY_TYPE_BOOLEAN) {
		value = (value == "true") && true || false
	}
	if (type == PROPERTY_TYPE_QUAT) {
		value = "quat " + value
	}

	return {
		key: key,
		value: value,
		type: type
	}
}


M.defold_to_tiled_property_xml_type = function(type) {
	return MAP_PROPERTY_TYPE[type] || ""
}


M.tiled_to_defold_property = function(key, value, type) {
	let defold_type = PROPERTY_TYPE_NUMBER

	if (type == "string") {
		defold_type = PROPERTY_TYPE_HASH
		let sep_count = M.contains_count(value, ", ")
		if (value.startsWith("quat ")) {
			value = value.replace("quat ", "")
			defold_type = PROPERTY_TYPE_QUAT
		} else {
			if (sep_count == 2) {
				defold_type = PROPERTY_TYPE_VECTOR3
			}
			if (sep_count == 3) {
				defold_type = PROPERTY_TYPE_VECTOR4
			}
		}
	}

	if (type == "bool") {
		value = value && "true" || "false"
		defold_type = PROPERTY_TYPE_BOOLEAN
	}

	if (type == "float") {
		defold_type = PROPERTY_TYPE_NUMBER
		value = "" + value
	}

	return {
		key: key,
		value: value,
		type: defold_type
	}
}


// @param target_path string
// @param extname string|nil
M.get_files_from = function(target_path, extname) {
	if (!fs.existsSync(target_path)) {
		return [];
	}

	let files_name = fs.readdirSync(target_path);
	if (extname) {
		files_name = files_name.filter(name => name.endsWith("." +  extname));
	}
	files_name = files_name.map(name => path.join(target_path, name))

	return files_name;
};


module.exports = M
