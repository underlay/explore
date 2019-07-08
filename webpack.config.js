const options = {
	presets: ["@babel/preset-env", "@babel/preset-react"],
	plugins: ["@babel/plugin-proposal-class-properties"],
}

const exclude = /(?:node_modules|\.min\.js$|dist\/)/

module.exports = {
	entry: ["@babel/polyfill", "./src/index.jsx"],
	output: {
		filename: "bundle.min.js",
		path: __dirname + "/dist",
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
