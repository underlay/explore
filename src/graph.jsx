import React from "react"

import cytoscape from "cytoscape"

import { compactIri } from "jsonld/lib/compact"

import Node from "./node.js"

import { RDF_TYPE, encode } from "./utils.js"

export default class Graph extends React.Component {
	static SVGPrefix = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>'
	static DataURIPrefix = "data:image/svg+xml;utf8,"

	// static LayoutOptions = {
	// 	name: "cose-bilkent",
	// 	idealEdgeLength: 144,
	// 	padding: 12,
	// 	animate: false,
	// }

	static LayoutOptions = {
		name: "breadthfirst",
		directed: true,
		grid: false,
		fit: true,
		padding: 12,
		animate: false,
	}

	static Style = [
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
				"border-color": "lightgrey",
			},
		},
		{
			selector: "node:selected",
			style: { "border-color": "#36454f" },
		},
		{
			selector: "node.hover",
			style: { "border-color": "#36454f" },
		},
		{
			selector: "edge",
			style: {
				"curve-style": "bezier",
				width: 5,
				"font-family": "Monaco, monospace",
				"font-size": "12",
				"line-color": "#ddd",
				"target-arrow-color": "#ddd",
				"target-arrow-shape": "triangle",
				label: "data(name)",
				"text-rotation": "autorotate",
			},
		},
	]

	static createNode({ id }, nodes, elements) {
		if (!nodes.hasOwnProperty(id)) {
			const index = elements.length
			nodes[id] = { index, literals: {}, types: [] }
			elements.push({ group: "nodes", data: { id: encode(id) } })
		}
	}

	static getDerivedStateFromProps({ store, graph, context }, prevState) {
		if (store !== prevState.store) {
			const quads = store.getQuads(null, null, null, graph)
			return { store, quads, context }
		} else {
			return {}
		}
	}

	constructor(props) {
		super(props)

		this.state = {}
		this.container = null
	}

	componentDidMount() {
		const {
			cys,
			graph,
			onSelect,
			onUnselect,
			onMouseOver,
			onMouseOut,
		} = this.props
		const { quads, context } = this.state

		if (this.container === null) return

		const compact = (iri, vocab) =>
			compactIri({ activeCtx: context, iri, relativeTo: { vocab: !!vocab } })

		const elements = []
		const nodes = {}

		for (const index in quads) {
			const { subject, predicate, object } = quads[index]
			Graph.createNode(subject, nodes, elements)

			const iri = predicate.id

			if (object.termType === "Literal") {
				const { literals } = nodes[subject.id]
				if (Array.isArray(literals[iri])) {
					literals[iri].push(object)
				} else {
					literals[iri] = [object]
				}
			} else if (object.termType === "NamedNode" && iri === RDF_TYPE) {
				nodes[subject.id].types.push(object.id)
			} else {
				Graph.createNode(object, nodes, elements)

				const id = encode(index.toString())
				const name = compact(iri, true)
				const [source, target] = [subject.id, object.id].map(encode)
				elements.push({
					group: "edges",
					data: { id, iri, name, source, target },
				})
			}
		}

		for (const id in nodes) {
			const { literals, types, index } = nodes[id]
			const { data } = elements[index]
			const [svg, width, height] = Node(id, types, literals, compact)
			data.svg = Graph.DataURIPrefix + encodeURIComponent(Graph.SVGPrefix + svg)
			data.width = width
			data.height = height
		}

		this.cy = cytoscape({
			container: this.container,
			elements,
			layout: Graph.LayoutOptions,
			style: Graph.Style,
			minZoom: 0.2,
			maxZoom: 2,
			zoom: 1,
		})

		cys[graph] = this.cy

		this.cy
			.nodes()
			.on("mouseover", ({ target }) => onMouseOver(target.id(), graph))
			.on("mouseout", ({ target }) => onMouseOut(target.id(), graph))
			.on("select", ({ target }) => onSelect(target.id(), graph))
			.on("unselect", ({ target }) => onUnselect(target.id(), graph))

		this.cy.on("destroy", _ => delete cys[graph])
	}

	componentWillUnmount() {
		this.cy.destroy()
	}

	render() {
		return (
			<div
				className="graph"
				graph-name={encode(this.props.graph)}
				ref={div => (this.container = div)}
			/>
		)
	}
}
