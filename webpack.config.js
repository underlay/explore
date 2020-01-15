const path = require("path")

const options = {
	presets: ["@babel/preset-env", "@babel/preset-react"],
	plugins: ["@babel/plugin-proposal-class-properties"],
}

const exclude = /(?:node_modules|\.min\.js$|dist\/)/

module.exports = {
	entry: ["babel-polyfill", path.resolve("index.jsx")],
	output: {
		filename: "index.min.js",
		path: path.resolve("lib"),
	},

	resolve: {
		extensions: [".js", ".jsx", ".json"],
	},

	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude,
				use: [{ loader: "babel-loader", options }],
			},
		],
	},
}
