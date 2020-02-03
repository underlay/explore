import * as React from "react"
import cytoscape from "cytoscape"
import { N3Store, Quad, Term, Literal } from "n3"
import { compactIri } from "jsonld/lib/compact"

import Node from "./node"

import { RDF, encode, CHAR, TAB, decode } from "./utils"

interface GraphProps {
	store: N3Store
	graph: string
	focus: string
	activeCtx: {}
	onSelect(focus: string): void
	onUnselect(focus: string): void
	onMouseOver(focus: string): void
	onMouseOut(focus: string): void
	onMount(cy: cytoscape.Core): void
	onDestroy(): void
}

interface GraphState {
	store: N3Store
	quads: Quad[]
}

interface Node {
	index?: number
	literals: Map<string, Literal[]>
	types: string[]
}

export default class Graph extends React.Component<GraphProps, GraphState> {
	static DataURIPrefix = "data:image/svg+xml;utf8,"
	static SVGPrefix = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>'

	static BaseLayoutOptions = { padding: 12, animate: false, fit: true }

	static CoseLayout: cytoscape.LayoutOptions = {
		...Graph.BaseLayoutOptions,
		name: "cose",
		randomize: true,
		idealEdgeLength: (ele: any) => (ele.data("name").length + TAB * 8) * CHAR,
	}

	static BreadthFirstLayout: cytoscape.LayoutOptions = {
		...Graph.BaseLayoutOptions,
		name: "breadthfirst",
		spacingFactor: 1,
		circle: false,
	}

	static RandomLayout: cytoscape.LayoutOptions = {
		...Graph.BaseLayoutOptions,
		name: "random",
	}

	static GridLayout: cytoscape.LayoutOptions = {
		...Graph.BaseLayoutOptions,
		name: "grid",
	}

	static Style: cytoscape.Stylesheet[] = [
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
				"text-rotation": "autorotate" as unknown,
			} as cytoscape.Css.Edge,
		},
	]

	static createNode(
		{ id }: Term,
		nodes: Map<string, Node>,
		elements: cytoscape.ElementDefinition[]
	) {
		if (!nodes.has(id)) {
			const node: Node = { literals: new Map(), types: [] }
			if (elements !== null) {
				node.index = elements.length
				elements.push({ group: "nodes", data: { id: encode(id) } })
			}
			nodes.set(id, node)
		}
	}

	static getDerivedStateFromProps(
		{ store, graph }: GraphProps,
		state: GraphState
	): GraphState {
		if (store !== state.store) {
			const quads = store.getQuads(null, null, null, graph)
			return { store, quads }
		} else {
			return null
		}
	}

	cy: cytoscape.Core

	componentDidUpdate(prevProps: GraphProps) {
		const { store, graph } = this.props
		if (prevProps.store !== store || prevProps.graph !== graph) {
			this.cy.elements().remove()
			const elements = this.makeElements()
			this.cy.add(elements)
			this.attachListeners()
			this.focus()
		}
	}

	focus() {
		const { focus, graph } = this.props
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

	makeElements(): cytoscape.ElementDefinition[] {
		const { activeCtx } = this.props
		const { quads } = this.state
		const compact = (iri: string, vocab: boolean) =>
			compactIri({ activeCtx, iri, relativeTo: { vocab: !!vocab } })

		const elements: cytoscape.ElementDefinition[] = []
		const nodes: Map<string, Node> = new Map()

		for (const index of quads.keys()) {
			const {
				subject,
				predicate: { id: iri },
				object,
			} = quads[index]

			Graph.createNode(subject, nodes, elements)
			if (object.termType === "Literal") {
				const { literals } = nodes.get(subject.id)
				if (literals.has(iri)) {
					literals.get(iri).push(object)
				} else {
					literals.set(iri, [object])
				}
			} else if (object.termType === "NamedNode" && iri === RDF.TYPE) {
				nodes.get(subject.id).types.push(object.id)
			} else {
				Graph.createNode(object, nodes, elements)
				elements.push({
					group: "edges",
					data: {
						id: encode(index.toString()),
						iri,
						name: compact(iri, true),
						source: encode(subject.id),
						target: encode(object.id),
					},
				})
			}
		}

		for (const id of nodes.keys()) {
			const { literals, types, index } = nodes.get(id)
			const { data } = elements[index]
			const [svg, width, height] = Node(id, types, literals, compact)
			data.svg = Graph.DataURIPrefix + encodeURIComponent(Graph.SVGPrefix + svg)
			data.width = width
			data.height = height
		}

		return elements
	}

	attachInstance = (ref: HTMLDivElement) => {
		if (ref === null) {
			return
		}

		const { graph, focus, onMount, onDestroy } = this.props
		const elements = this.makeElements()

		const layout = {
			...Graph.BreadthFirstLayout,
			directed: graph === "",
			roots: focus === null ? undefined : `#${encode(focus)}`,
		}

		this.cy = cytoscape({
			container: ref,
			elements,
			layout,
			style: Graph.Style,
			minZoom: 0.1,
			maxZoom: 4,
			zoom: 1,
		})

		this.focus()
		this.attachListeners()

		if (typeof onDestroy === "function") {
			this.cy.on("destroy", _ => onDestroy())
		}

		if (typeof onMount === "function") {
			onMount(this.cy)
		}
	}

	attachListeners() {
		const { onSelect, onUnselect, onMouseOver, onMouseOut } = this.props

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
	}

	handleReset = (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
		this.cy.fit()

	renderBFS = (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		const gridLayout = {
			...Graph.BreadthFirstLayout,
			directed: this.props.graph === "",
		}
		this.cy.layout(gridLayout).run()
	}

	renderGrid = (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
		this.cy.layout(Graph.GridLayout).run()
	renderRandom = (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
		this.cy.layout(Graph.RandomLayout).run()
	renderCose = (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
		this.cy.layout(Graph.CoseLayout).run()

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
				<div className="container" ref={this.attachInstance} />
			</div>
		)
	}
}
