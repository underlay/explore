import React from "react"

import cytoscape from "cytoscape"

import { compactIri } from "jsonld/lib/compact"

import Node from "./node.js"

import { RDF_TYPE, encode, CHAR, TAB, decode } from "./utils.js"

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
			nodes[id] = { literals: {}, types: [] }
			if (elements !== null) {
				nodes[id].index = elements.length
				elements.push({ group: "nodes", data: { id: encode(id) } })
			}
		}
	}

	constructor(props) {
		super(props)
		const { store, graph } = props
		const quads = store.getQuads(null, null, null, graph)
		this.state = { quads }
		this.container = null
	}

	componentDidMount() {
		const {
			graph,
			focus,
			context: activeCtx,
			onSelect,
			onUnselect,
			onMouseOver,
			onMouseOut,
			onMount,
			onDestroy,
		} = this.props

		const { quads } = this.state

		if (this.container === null) return

		const compact = (iri, vocab) =>
			compactIri({ activeCtx, iri, relativeTo: { vocab: !!vocab } })

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

				const id =
					graph === null
						? encode(quads[index].graph.id)
						: encode(index.toString())
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
			{
				directed: graph === "",
				circle: graph === null,
				roots: graph === null ? `#${encode(focus)}` : undefined,
			},
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

		if (focus !== null) {
			const f = encode(focus)
			if (focus !== "") {
				this.cy.$(`#${f}`).select()
			}
			if (focus === graph) {
				this.cy.container().parentElement.classList.add("selected")
			}
		}

		const n = this.cy.nodes()
		if (typeof onMouseOver === "function") {
			n.on("mouseover", ({ target }) => onMouseOver(decode(target.id())))
		}
		if (typeof onMouseOut === "function") {
			n.on("mouseout", ({ target }) => onMouseOut(decode(target.id())))
			this.cy.on("mouseout", _ => onMouseOut(null))
		}
		if (typeof onSelect === "function") {
			n.on("select", ({ target }) => onSelect(decode(target.id())))
		}
		if (typeof onUnselect === "function") {
			n.on("unselect", ({ target }) => onUnselect(decode(target.id())))
		}

		if (typeof onDestroy === "function") {
			this.cy.on("destroy", _ => onDestroy())
		}

		if (typeof onMount === "function") {
			onMount(this.cy)
		}
	}

	componentWillUnmount() {
		this.cy.destroy()
	}

	handleReset = _ => this.cy.fit()

	renderBFS = _ => {
		const { graph } = this.props
		const layout = Object.assign(
			{ directed: graph === "", circle: graph === null },
			Graph.BreadthFirstLayout
		)
		this.cy.layout(layout).run()
	}

	renderGrid = _ => this.cy.layout(Graph.GridLayout).run()
	renderRandom = _ => this.cy.layout(Graph.RandomLayout).run()
	renderCose = _ => this.cy.layout(Graph.CoseLayout).run()

	render() {
		const { graph } = this.props
		const className = graph === "" ? "graph default" : "graph"
		return (
			<div className={className}>
				<div className="control">
					<span>{graph || null}</span>
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
