const crypto = require("crypto")
const express = require("express")
const fileUpload = require("express-fileupload");
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const port = 3000
const app = express()


//// CONFIGS

// express module to parse 'multipart/form-data' requests
app.use(fileUpload())


//// UTILS

// compute the SHA256 sum of the input buffer
function sha256sum(input){
	return crypto.createHash("sha256").update(input).digest("hex")
}

// implementation of a filesystem storage
const storage = {
	// in _real_ world, this should be an interface with those methods
	// this would furnish some abstraction over the storage (database, filesystem, cdn, etc)

	// storage-internal use only
	_location: process.env.STORAGE_LOCATION || "/images",
	get location() { return this._location },
	set location(loc) { this._location = path.resolve(loc) },

	exists: function(id) {
		if (id === "") return ""
		var dir = fs.opendirSync(storage.location)
		let dirent
		while ((dirent = dir.readSync()) !== null) {
			var ext = path.extname(dirent.name)
			if (dirent.name.slice(0, -ext.length) === id) {
				dir.close()
				return storage.location + "/" + dirent.name
			}
		}
		dir.close()
		return ""
	},

	read: function(filename) {
		return fs.readFileSync(storage.location + "/" + filename)
	},

	write: function(filename, data) {
		if (filename === "") {
			throw new Error("empty filename")
		}

		if (!fs.existsSync(storage.location)) {
      		fs.mkdirSync(storage.location, { recursive: true})
    	}
    	fs.writeFileSync(storage.location + "/" + filename, data)
	}
}

// verify if a file is an image by comparing the header's first 4 bytes to known values
function isImage(data) {
	var headers = {
    	jpg: "ffd8ffe0",
    	png: "89504e47",
    	webp: "52494646",
	}

	var header = data.toString("hex", 0, 4);
	return Object.values(headers).includes(header)
}


//// ROUTES

// POST /images :: upload a new image in high resolution
app.post("/images", (req, res) => {
	if (!req.files || Object.keys(req.files).length === 0) {
      	return res.status(400).end("no file uploaded")
    }
    var keys = Object.keys(req.files)
    var image = req.files[keys[0]]
	var filename = sha256sum(image.data)
	var ext = path.extname(image.name)

	if (!isImage(image.data)) {
		return res.status(400).end("file is not an image")
	}

	try {
		// picture.mv(storage.location + "/" + filename + ext)  // fs-storage specific solution
		storage.write(filename + ext, image.data)
		return res.end("unoptimized image id: " + filename)
	} catch (err) {
		return res.status(500).end(err)
	}
})

// GET /images/:id :: get the specified (un)optimized image
app.get("/images/:id", (req, res) => {
	var id = req.params.id
	fullname = storage.exists(id)
	if (fullname === "") {
		return res.status(404).end("image not found")
	} else {
		return res.sendFile(fullname)
	}
})

// GET /generator :: transform and optimize an image
app.get("/generator", (req, res) => {
	var source = req.query.src
	var height = req.query.height
	var width = req.query.width
	var fit = req.query.fit || "cover"
	var quality = req.query.quality || "100"

	if (source === undefined) {
		return res.status(400).end("src is missing")
	}

	height = parseInt(height)
	width = parseInt(width)
	if (height <= 0 || width <= 0) {
		return res.status(400).end("height|width must be greater than zero")
	}

	if (!["cover", "contain", "fill", "inside", "outside"].includes(fit)) {
		return res.status(400).end("fit must be in: 'cover', 'contain', 'fill', 'inside', 'outside'")
	}

	quality = parseInt(quality)
	if (quality < 0 || 100 < quality) {
		return res.status(400).end("quality must be between 0 and 100 (included)")
	}

	var sourcepath = storage.exists(source)
	if (sourcepath === "") {
		return res.status(404).end("source image not found")
	}

	// /path/to/src_id-height-width-fit-quality.ext
	var ext = path.extname(sourcepath)
	var outputname = [source, height, width, fit, quality].join("-")
	outputpath = path.dirname(sourcepath) + "/" + outputname + ext

	if (storage.exists(outputname) === outputpath) {
		// this image already exists
		return res.end("optimized image id: " + outputname)
	}

	var newimg = sharp(sourcepath)
		.resize({
			width: width,
			height: height,
			fit: fit
		})

	if (quality !== 100 && [".jpg", ".webp"].includes(ext)) {
		switch (ext) {
			case ".jpg": newimg.jpeg({quality: quality}); break
			case ".webp": newimg.webp({ quality: quality }); break
			default: res.status(500).end("switch broken, abort and kill")
		}
	}

	newimg.toFile(outputpath)
	res.end("optimized image id: " + outputname)
})


app.listen(port, () => {
  	console.log(`listening at http://localhost:${port}`)
})


// only 'app' should be exported but the tests reauire those functions to be exported as well
module.exports = {sha256sum: sha256sum, storage: storage, isImage: isImage, app: app}
