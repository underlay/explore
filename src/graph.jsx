import React from "react"

import cytoscape from "cytoscape"

import { compactIri } from "jsonld/lib/compact"

import Node from "./node.js"

import { RDF_TYPE, encode, CHAR, TAB } from "./utils.js"

export default class Graph extends React.Component {
	static SVGPrefix = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>'
	static DataURIPrefix = "data:image/svg+xml;utf8,"

	static LayoutOptions = {
		padding: 12,
		animate: false,
		fit: true,
	}

	static CoseLayout = Object.assign(
		{
			name: "cose",
			randomize: true,
			idealEdgeLength: ele => (ele.data("name").length + TAB * 8) * CHAR,
		},
		Graph.LayoutOptions
	)

	static BreadthFirstLayout = Object.assign(
		{ name: "breadthfirst", spacingFactor: 1 },
		Graph.LayoutOptions
	)

	static RandomLayout = Object.assign({ name: "random" }, Graph.LayoutOptions)
	static GridLayout = Object.assign({ name: "grid" }, Graph.LayoutOptions)

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
				label: "data(name)",
				width: 8,
				"font-size": 12,
				"line-color": "#ccc",
				"edge-distances": "node-position",
				"text-background-color": "ghostwhite",
				"text-background-padding": 4,
				"text-background-opacity": 1,
				"curve-style": "bezier",
				"font-family": "Monaco, monospace",
				"target-arrow-color": "#ccc",
				"target-arrow-shape": "triangle",
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
			focus,
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

		const layout = Object.assign(
			{ directed: graph === "" },
			Graph.BreadthFirstLayout
		)

		this.cy = cytoscape({
			container: this.container,
			elements,
			layout,
			style: Graph.Style,
			minZoom: 0.1,
			maxZoom: 4,
			zoom: 1,
		})

		cys[graph] = this.cy

		this.cy
			.nodes()
			.on("mouseover", ({ target }) => onMouseOver(target.id(), graph))
			.on("mouseout", ({ target }) => onMouseOut(target.id(), graph))
			.on("select", ({ target }) => onSelect(target.id(), graph))
			.on("unselect", ({ target }) => onUnselect(target.id(), graph))

		this.cy
			.on("destroy", _ => delete cys[graph])
			.on("mouseout", _ => onMouseOut(null, graph))

		if (focus !== null) {
			const f = encode(focus)
			if (focus !== "") {
				this.cy.$(`#${f}`).select()
			}
			if (focus === graph) {
				this.cy.container().parentElement.classList.add("selected")
			}
		}
	}

	componentWillUnmount() {
		this.cy.destroy()
	}

	handleReset = _ => this.cy.fit()

	renderBFS = _ => {
		const layout = Object.assign(
			{ directed: this.props.graph === "" },
			Graph.BreadthFirstLayout
		)
		this.cy.layout(layout).run()
	}

	renderGrid = _ => this.cy.layout(Graph.GridLayout).run()
	renderRandom = _ => this.cy.layout(Graph.RandomLayout).run()
	renderCose = _ => this.cy.layout(Graph.CoseLayout).run()

	render() {
		const { graph } = this.props
		const graphName = graph === "" ? null : <span>{this.props.graph}</span>
		return (
			<div className="graph">
				<div className="control">
					<span>{graphName}</span>
					<button onClick={this.renderRandom}>Random</button>
					<button onClick={this.renderGrid}>Grid</button>
					<button onClick={this.renderBFS}>BFS</button>
					<button onClick={this.renderCose}>Cose</button>|
					<button onClick={this.handleReset}>Reset</button>
				</div>
				<div className="container" ref={div => (this.container = div)} />
			</div>
		)
	}
}
