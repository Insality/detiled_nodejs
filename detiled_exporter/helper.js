const fs = require("fs");

const M = {}

M.log = function(message) {
	console.log("[Di-Tiled]:", message)
};


M.get_files_from = function(target_path, extname) {
	if (!fs.existsSync(target_path)) {
		return [];
	}

	let files_name = fs.readdirSync(target_path);
	if (extname) {
		files_name = files_name.filter(name => name.endsWith("." +  extname));
	}

	return files_name;
};


module.exports = M
