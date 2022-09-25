const fs = require('fs')

const regex_component = /^([a-z0-9_]+) \{$/i // ends with {
const regex_property_value = /^([a-z_]+): (.*)$/i // name: "value"
const regex_property_string_value = /^(".*")$/ // "value"
const regex_value_is_string = /^".*"$/
const regex_value_is_number = /^-?[0-9.]+$/


function decodeValue(value) {
   if (value.match(regex_value_is_string)) {
	  // обрамление двойными кавычками => строка
	  // убираем " в начале и конце
	  value = value.substring(1, value.length-1)
	  value = value.replace(/\\n/g, "\n")

   } else if (value.match(regex_value_is_number)) {
	  value = parseFloat(value)
   }

   return value
}


function applyElement(obj, key) {
   if (typeof obj[key] == "undefined") {
	  obj[key] = [{}]
	  obj = obj[key][0]
   } else if (Array.isArray(obj[key])) {
	  let newObject = {}
	  obj[key].push(newObject)
	  // reference to new object
	  obj = newObject
   } else {
	  // несколько вхождений одного элемента => конвертируем в массива
	  let firstObject = obj[key]
	  let newObject = {}
	  let newArray = [firstObject, newObject]
	  obj[key] = newArray

	  // reference to last element
	  obj = newObject
   }

   return obj
}


function decodeDefoldObject(text) {
   let curr_obj = {}

   let lines = text.split("\n")

   let prev_reference = []
   let property_name = ''

   lines.forEach(function (line, index) {
	  line = line.trim()
	  let found, name, value

	  if (found = line.match(regex_component)) {
		 name = found[1]
		 prev_reference.push(curr_obj)
		 curr_obj = applyElement(curr_obj, name)
	  } else if (found = line.match(regex_property_value)) {
		 name = found[1]
		 value = found[2]

		 if (curr_obj[name] && !Array.isArray(curr_obj[name])) {
			curr_obj[name] = [ curr_obj[name] ]
		 }
		 if (Array.isArray(curr_obj[name])) {
			curr_obj[name].push(decodeValue(value))
		 } else {
			curr_obj[name] = decodeValue(value.trim())
		 }

		 property_name = name
	  } else if (found = line.match(regex_property_string_value)) {
		 value = found[1]
		 curr_obj[property_name] += decodeValue(value)
	  } else if (line == '}') {
		 curr_obj = prev_reference.pop()
	  } else if (line.startsWith("data:")) {
		// Empty data line case
		curr_obj["data"] = ""
	  } else {
		 if (line.length) {
			console.log('[ERROR]: parse error on line:', line, "index:", index)
		 }
	  }
   })

   return curr_obj
}


const withDotParams = ["x", "y", "z", "w",
"alpha", "outline_alpha", "shadow_alpha",
"text_leading", "text_tracking", "pieFillAngle", "innerRadius"]
const notConstants = ["text", "id"]

function encodeDefoldObject(obj, spaces) {
   let result = ''
   spaces = spaces || 0
   let tabString = ' '.repeat(spaces)

   let keyType, value
   for (let key in obj) {
	  value = obj[key]
	  keyType = typeof value

	  if (keyType == 'object') {
		 if (key == 'data') {
			let encodedChild = encodeDefoldObject(value)

			// ребята из defold зачем-то вложенные данные в data энкодят в строку
			encodedChild = encodedChild.replace(/"/g, '\\"')
			encodedChild = encodedChild.replace(/\n/g, '\\n"\n' + tabString + '"')
			result += tabString + key + ': "' + encodedChild + '"\n'

		 } else if (Array.isArray(obj[key])) {
			let arr = obj[key]
			for (let j = 0; j < arr.length; j++) {
				if (key == "children") {
					let value = arr[j]
					if (!value.match(regex_property_string_value)) {
						value = '"' + arr[j] + '"'
					}
					result += tabString + key + ": " + value + "\n"
				} else if (typeof arr[j] == "number") {
					result += tabString + key + ": " + arr[j] + "\n"
			   } else {
				  result += tabString + key + ' {\n'
				  result += encodeDefoldObject(arr[j], spaces + 2)
				  result += tabString + '}\n'
			   }
			}
		 } else {
			result += tabString + key + ' {\n'
			result += encodeDefoldObject(obj[key], spaces + 2)
			result += tabString + '}\n'
		 }
	  } else if (keyType == 'string') {
		 if (value.match(/^[A-Z_]+$/) && notConstants.indexOf(key) < 0) {
			// ЭТО_КОНСТАНТА - обрамлять кавычками не требуется
			result += tabString + key + ': ' + value + '\n'
		 } else if (value === "false" || value === "true") {
			result += tabString + key + ': ' + value + '\n'
		 } else {
			// другие строки обрамляем двойными кавычками
			// случай с многострочным text
			let text_array = value.split("\n")
			for (let i = 0; i < text_array.length; i++) {
			   let v = text_array[i]
			   if (i == 0) {
				  let postfix = '"\n'
				  if (text_array.length > 1) {
					 postfix = '\\n"\n'
				  }
				  result += tabString + key + ': "' + v + postfix
			   } else if (i == text_array.length - 1) {
				  result += tabString + '"' + v + '"\n'
			   } else {
				  result += tabString + '"' + v + '\\n"\n'
			   }
			}
		 }
	  } else if (keyType == 'number') {
		 let withDot = (withDotParams.indexOf(key) >= 0)

		 if (String(value).indexOf('.') >= 0) {
			withDot = false
		 }

		 if (withDot) {
			value = value.toFixed(1)
		 }

		 result += tabString + key + ': ' + value + '\n'
	  }
   }

   return result
}


function load_from_file(fileName) {
   let content = fs.readFileSync(fileName, 'utf8')
   return decodeDefoldObject(content)
}


function save_to_file(fileName, obj) {
   let encodedData = encodeDefoldObject(obj)
   fs.writeFileSync(fileName, encodedData)
}


module.exports.load_from_file = load_from_file
module.exports.save_to_file = save_to_file
module.exports.decode_object = decodeDefoldObject
