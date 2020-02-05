import { N3Store, Store, StreamParser, Quad, ParserOptions } from "n3"
import { LayoutOptions, Stylesheet, Css } from "cytoscape"
import { PanelWidth } from "react-panelgroup"

export const XSD = {
	STRING: "http://www.w3.org/2001/XMLSchema#string",
	BOOLEAN: "http://www.w3.org/2001/XMLSchema#boolean",
	INTEGER: "http://www.w3.org/2001/XMLSchema#integer",
	DOUBLE: "http://www.w3.org/2001/XMLSchema#double",
	DATE: "http://www.w3.org/2001/XMLSchema#date",
	DATETIME: "http://www.w3.org/2001/XMLSchema#dateTime"
}

export const RDF = {
	TYPE: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
	LANG_STRING: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
}

export const FONT_SIZE = 12
export const TAB = 2
export const CHAR = 7.2
export const LINE_HEIGHT = 18
export const FONT_FAMILY = "Monaco, monospace"

export const encode = (s: string) => Buffer.from(s).toString("hex")
export const decode = (s: string) => Buffer.from(s, "hex").toString("utf8")

export const base32 = /^[a-z2-7]{59}$/
export const fragment = /^_:c14n(\d+)$/

export const parseMessage = (data: Buffer): Promise<N3Store> =>
	new Promise((resolve, reject) => {
		const store = new Store()
		const parser = new StreamParser({
			format: "application/n-quads",
			blankNodePrefix: "_:"
		} as ParserOptions)
		parser
			.on("error", reject)
			.on("data", (quad: Quad) => store.addQuad(quad))
			.on("end", () => resolve(store))
			.end(data)
	})

export const DataURIPrefix = "data:image/svg+xml;utf8,"
export const SVGPrefix = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>'
export const BaseLayoutOptions = { padding: 12, animate: false, fit: true }
export const CoseLayout: LayoutOptions = {
	...BaseLayoutOptions,
	name: "cose",
	randomize: true,
	idealEdgeLength: (ele: any) => (ele.data("name").length + TAB * 8) * CHAR
}

export const BreadthFirstLayout: LayoutOptions = {
	...BaseLayoutOptions,
	name: "breadthfirst",
	spacingFactor: 1,
	circle: false
}

export const RandomLayout: LayoutOptions = {
	...BaseLayoutOptions,
	name: "random"
}

export const GridLayout: LayoutOptions = {
	...BaseLayoutOptions,
	name: "grid"
}

export const Style: Stylesheet[] = [
	{
		selector: "node",
		style: {
			shape: "rectangle",
			"background-color": "floralwhite",
			"background-image": "data(svg)",
			width: "data(width)",
			height: "data(height)",
			"border-width": 1,
			"border-style": "solid",
			"border-color": "lightgrey"
		}
	},
	{
		selector: "node:selected",
		style: { "border-color": "#36454f" }
	},
	{
		selector: "node.hover",
		style: { "border-color": "#36454f" }
	},
	{
		selector: "edge",
		style: {
			label: "data(name)",
			width: 8,
			"font-size": 12,
			"line-color": "#ccc",
			"edge-distances": "node-position",
			"text-background-color": "ghostwhite",
			"text-background-padding": "4",
			"text-background-opacity": 1,
			"curve-style": "bezier",
			"font-family": "Monaco, monospace",
			"target-arrow-color": "#ccc",
			"target-arrow-shape": "triangle",
			"text-rotation": "autorotate" as unknown
		} as Css.Edge
	}
]

export const BorderColor = "#36454F"
export const PanelWidths: PanelWidth[] = [
	{ size: 360, minSize: 240, resize: "dynamic" },
	{ minSize: 100, resize: "stretch" }
]
