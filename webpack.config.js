module.exports = {
	// Enable sourcemaps for debugging webpack's output.
	devtool: "source-map",

	entry: {
		index: __dirname + "/index.tsx",
	},

	output: {
		filename: "[name].min.js",
		path: __dirname + "/lib",
	},

	resolve: {
		// Add '.ts' and '.tsx' as resolvable extensions.
		extensions: [".js", ".ts", ".tsx"],
	},

	module: {
		rules: [
			{
				test: /\.(css)$/,
				options: { publicPath: "lib", name: "[name].[ext]" },
				loader: "file-loader",
			},
			{
				enforce: "pre",
				test: /\.js$/,
				loader: "source-map-loader",
			},
			{
				test: /\.ts(x?)$/,
				exclude: /node_modules/,
				use: [{ loader: "ts-loader" }],
			},
		],
	},

	externals: {
		react: "React",
		"react-dom": "ReactDOM",
	},
}
