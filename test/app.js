const assert = require("assert/strict")
const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const request = require("supertest")
const app = require("../app")

function sha256sum(input){
	return crypto.createHash("sha256").update(input).digest("hex")
}


describe("Utilitaries", () => {
	describe("sha256sum", () => {
		it("empty -> empty", () => {
			assert.equal("", "")
		})

		it("git.png -> a6df2fb8...", () => {
			let pic = fs.readFileSync("test/git.png")
			let got = app.sha256sum(pic)
			let want = "a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70"
			assert.equal(got, want)
		})
	})

	describe("storage", () => {
		before(() => app.storage.location = "./test")

		describe("exists", () => {
			it("empty -> ''", () => {
				assert.equal(app.storage.exists(""), "")
			})

			it("git.png -> /path/to/test/git.png", () => {
				let got = app.storage.exists("git")
				let want = path.resolve("./test/git.png")
				assert.equal(got, want)
			})
		})

		describe("read", () => {
			// it("no test for now")
			// is it really useful to test the stdlib
			// as 'read' is just an alias in this case?
		})

		describe("write", () => {
			before(() => fs.writeFileSync("./test/existingfile.txt", "some data"))
			after(() => {
				fs.rmSync("./test/newfile.txt")
				fs.rmSync("./test/existingfile.txt")
			})

			it("empty file / empty data -> Error", () => {
				assert.throws(() => app.storage.write("", ""), Error)
			})

			it("newfile.txt / 'hello world' -> OK" , () => {
				let want = "hello world"
				app.storage.write("newfile.txt", want)
				let got = fs.readFileSync("./test/newfile.txt").toString("ascii")
				assert.equal(got, want)
			})

			it("existingfile.txt / 'some data' -> OK", () => {
				let want = "some data"
				app.storage.write("existingfile.txt", "some data")
				let got = fs.readFileSync("./test/existingfile.txt").toString("ascii")
				assert.equal(got, want)
			})
		})
	})

	describe("isImage", () => {
		it("empty -> false", () => {
			assert.equal(app.isImage(""), false)
		})
		it("git.png -> true", () => {
			let pic = fs.readFileSync("test/git.png")
			assert.equal(app.isImage(pic), true)
		})
		it("app.js -> false", () => {
			let src = fs.readFileSync("test/app.js")
			assert.equal(app.isImage(src), false)
		})
	})
})

describe("Routes", () => {
	before(() => app.storage.location = "./test/storage")

	describe("POST /images", () => {
		after(() => fs.rmSync("./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70.png"))

		it("empty -> 400", done => {
			request(app.app)
				.post("/images")
				.expect(400, done)
		})

		it("git.png -> OK", done => {
			request(app.app)
				.post("/images")
				.attach("image", "./test/git.png")
				.expect(200, done)
		})

		it("git.png (2nd time) -> OK", done => {
			request(app.app)
				.post("/images")
				.attach("image", "./test/git.png")
				.expect(200, done)
		})

		it("app.js -> 400", done => {
			request(app.app)
				.post("/images")
				.attach("source", "./test/app.js")
				.expect(400, done)
		})
	})

	describe("GET /images/:id", () => {
		before(() => fs.copyFileSync("./test/git.png", "./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70.png"))
		after(() => fs.rmSync("./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70.png"))

		it("git.png (by id) -> OK", done => {
			request(app.app)
				.get("/images/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70")
				.expect(200, done)
		})

		it("inexistant id -> 404", done => {
			request(app.app)
				.get("/images/helloworldthisisgod")
				.expect(404, done)
		})
	})

	describe("GET /generator", () => {
		before(() => {
			fs.copyFileSync("./test/git.png", "./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70.png")
			fs.copyFileSync("./test/wireguard.webp", "./test/storage/0ea30173599a253144645605d6de5efc301386e55454292ef477bb0539670094.webp")
			fs.copyFileSync("./test/transmission.jpg", "./test/storage/e40ddc6196d3c800884f0537a258a6de58f93ca75410194625b225659cafca5d.jpg")
		})
		after(() => {
			fs.rmSync("./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70.png")
			fs.rmSync("./test/storage/0ea30173599a253144645605d6de5efc301386e55454292ef477bb0539670094.webp")
			fs.rmSync("./test/storage/e40ddc6196d3c800884f0537a258a6de58f93ca75410194625b225659cafca5d.jpg")
			fs.rmSync("./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70-100-100-cover-100.png")
			fs.rmSync("./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70-600-300-fill-100.png")
			fs.rmSync("./test/storage/e40ddc6196d3c800884f0537a258a6de58f93ca75410194625b225659cafca5d-480-480-cover-30.jpg")
			fs.rmSync("./test/storage/0ea30173599a253144645605d6de5efc301386e55454292ef477bb0539670094-300-300-cover-30.webp")
		})

		it("empty -> 400", done => {
			request(app.app)
				.get("/generator")
				.expect(400, done)
		})

		it("wrong 'height' / 'width' -> 400", done => {
			request(app.app)
				.get("/generator")
				.query({
					src: "a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70",
					height: "-1",
					width: "-1",
				})
				.expect(400, done)
		})

		it("wrong 'fit' -> 400", done => {
			request(app.app)
				.get("/generator")
				.query({
					src: "a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70",
					height: "383",
					width: "383",
					fit: "nopitwontwork",
				})
				.expect(400, done)
		})

		it("wrong 'quality' -> 400", done => {
			request(app.app)
				.get("/generator")
				.query({
					src: "a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70",
					height: "383",
					width: "383",
					quality: "-1",
				})
				.expect(400, done)
		})

		it("inexistant src -> 404", done => {
			request(app.app)
				.get("/generator")
				.query({ src: "thisfiledoesntexist"	})
				.expect(404, done)
		})

		it("custom 'height' / 'width' -> OK", done => {
			request(app.app)
				.get("/generator")
				.query({
					src: "a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70",
					height: "100",
					width: "100",
				})
				.expect(200)
				.then(() => {
					setTimeout(() => {
						var got = sha256sum(fs.readFileSync("./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70-100-100-cover-100.png"))
						var want = "36ea8691917e2f55d0233a53a35ef3e767649ceb912c67341575df4f25e355e2"
						assert.equal(got, want)
						done()
					}, 20)
				})
				.catch(err => done(err))
		})

		it("custom 'fit' with custom geometry -> OK", done => {
			request(app.app)
				.get("/generator")
				.query({
					src: "a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70",
					height: "600",
					width: "300",
					fit: "fill",
				})
				.expect(200)
				.then(() => {
					setTimeout(() => {
						var got = sha256sum(fs.readFileSync("./test/storage/a6df2fb8c4b89a8e76c9fbf7b0b9e5d26266c2014a6493f14800d7b4e184bd70-600-300-fill-100.png"))
						var want = "fa3c11f9db5a7ba1b860e9176c35fc69bd879476d93a7afce072ac30777807cb"
						assert.equal(got, want)
						done()
					}, 20)
				})
				.catch(err => done(err))
		})

		it("custom 'quality' (jpg) -> OK", done => {
			request(app.app)
				.get("/generator")
				.query({
					src: "e40ddc6196d3c800884f0537a258a6de58f93ca75410194625b225659cafca5d",
					height: "480",
					width: "480",
					quality: "30",
				})
				.expect(200)
				.then(() => {
					setTimeout(() => {
						var got = sha256sum(fs.readFileSync("./test/storage/e40ddc6196d3c800884f0537a258a6de58f93ca75410194625b225659cafca5d-480-480-cover-30.jpg"))
						var want = "a177b2622326beb996ee181f6ab051567c71205cea0aa71a121bd532ec55e3f5"
						assert.equal(got, want)
						done()
					}, 20)
				})
				.catch(err => done(err))
		})

		it("custom 'quality' (webp) -> OK", done => {
			request(app.app)
				.get("/generator")
				.query({
					src: "0ea30173599a253144645605d6de5efc301386e55454292ef477bb0539670094",
					height: "300",
					width: "300",
					quality: "30",
				})
				.then(() => {
					setTimeout(() => {
						var got = sha256sum(fs.readFileSync("./test/storage/0ea30173599a253144645605d6de5efc301386e55454292ef477bb0539670094-300-300-cover-30.webp"))
						// due to the WEBP quality/compression algorithm, the SHA256 sum won't always be the same.
						// after several (>100) tests, it only produces two distinct results
						var want1 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
						var want2 = "fd3dca5b2d8e7aa7121a98902e00dae34f81b326d71b5a6c91212084ff1ee495"
						assert.match(got, new RegExp(want1 + "|" + want2))
						done()
					}, 20)
				})
				.catch(err => done(err))
		})
	})

})
