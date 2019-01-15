import React from "react"
import ReactDOMServer from "react-dom/server"

import jsonld from "jsonld"
import { getInitialContext, process } from "jsonld/lib/context"
import { compactIri } from "jsonld/lib/compact"

import cytoscape from "cytoscape"
import bilkent from "cytoscape-cose-bilkent"
import label from "cytoscape-node-html-label"

import { style, labelStyle, layoutOptions } from "./style"
import {
	NodeView,
	getNodeId,
	getEdgeId,
	getTableId,
	getContainerId,
} from "./node"

import baseContext from "./base-context.json"
import tikaContext from "./tika-context.json"

cytoscape.use(label)
cytoscape.use(bilkent)

function getContext(base) {
	const activeCtx = getInitialContext({ base })
	const localCtx = [baseContext, tikaContext]
	return process({ activeCtx, localCtx })
}

function initializeNodes(node, elements, map, compact, parent) {
	const { "@id": sourceId, "@graph": graph } = node
	const source = getNodeId(sourceId, parent)
	map[source] = node
	const data = { id: source, shape: "rectangle" }
	if (parent !== null) data.parent = parent
	elements.push({ group: "nodes", data })
	if (Array.isArray(graph)) {
		graph.forEach(node => initializeNodes(node, elements, map, compact, source))
	}
}

function initializeLinks(node, elements, map, compact, parent) {
	const {
		"@id": sourceId,
		"@graph": graph,
		"@type": type,
		"@index": _,
		...properties
	} = node
	const source = getNodeId(sourceId, parent)

	Object.keys(properties).forEach(property =>
		node[property].forEach(({ "@list": list, "@id": targetId }, index) => {
			if (Array.isArray(list)) {
				// TODO: Something???
			} else if (map.hasOwnProperty(targetId)) {
				const id = getEdgeId(sourceId, property, index, parent)
				const name = compact(property, true)
				const target = getNodeId(targetId, parent)
				const data = { id, property, name, source, target }
				if (parent !== null) data.parent = parent
				elements.push({ group: "edges", data })
			}
		})
	)

	if (Array.isArray(graph)) {
		graph.forEach(node => initializeLinks(node, elements, map, compact, source))
	}
}

function assembleHTML(id, node, parent, nodes, compact) {
	const props = { id, node, parent, nodes, compact }
	const element = <NodeView {...props} />
	return ReactDOMServer.renderToStaticMarkup(element)
}

const format = "application/n-quads"

export default class Graph extends React.Component {
	constructor(props) {
		super(props)
		this.state = { error: null }
	}
	componentDidMount() {
		window.addEventListener("hashchange", () => this.fetchHash())
		this.fetchHash()
	}
	fetchHash() {
		const hash = window.location.hash.slice(1)
		if (hash) {
			const base = `dweb:/ipfs/${hash}`
			// const ctx = getInitialContext({ base })
			const ctx = getContext(base)
			this.props.ipfs.files
				.cat(hash)
				.then(file => jsonld.fromRDF(file.toString(), { format }))
				.then(value => this.setState({ value, hash, ctx }))
				.catch(error => this.setState({ error }))
		} else {
			this.setState({ value: null, hash, ctx: null })
		}
	}
	static renderGraph(value, ctx, container) {
		const compact = (iri, vocab) =>
			compactIri({ activeCtx: ctx, iri, relativeTo: { vocab: !!vocab } })

		const elements = []
		const nodes = {}
		value.forEach(node => initializeNodes(node, elements, nodes, compact, null))
		value.forEach(node => initializeLinks(node, elements, nodes, compact, null))

		const tpl = data =>
			assembleHTML(data.id, nodes[data.id], data.parent, nodes, compact)

		const cy = cytoscape({ container, elements, style })
		cy.nodeHtmlLabel([{ tpl }, { tpl, query: ":parent", ...labelStyle }])
		cy.one("render", () => {
			// cy.edges().on("select", evt => {
			// 	evt.target.unselect()
			// 	const [id, property, index] = JSON.parse(evt.target.id())
			// 	const { source, parent } = evt.target.data()
			// 	if (!collapsedEdges.hasOwnProperty(id)) collapsedEdges[id] = {}
			// 	if (!collapsedEdges[id].hasOwnProperty(property))
			// 		collapsedEdges[id][property] = {}
			// 	collapsedEdges[id][property][index] = evt.target.remove()
			// 	const containerId = getContainerId(id)
			// 	const container = document.getElementById(containerId)
			// 	const node = nodes[source][0] // ???
			// 	container.innerHTML = assembleHTML(
			// 		node,
			// 		parent,
			// 		nodes,
			// 		collapsedEdges,
			// 		compact
			// 	)
			// })
			cy.nodes().forEach(node => {
				const id = node.id()
				const tableId = getTableId(id)
				const table = document.getElementById(tableId)
				if (!table) return
				const { parentElement } = table
				const { offsetWidth, offsetHeight } = parentElement
				parentElement.id = getContainerId(id)
				parentElement.classList.add("node-container")
				if (node.isParent()) {
					parentElement.classList.add("compound-node-container")
				}
				node.style("width", offsetWidth)
				node.style("height", offsetHeight)
				if (
					table.firstElementChild.lastElementChild.classList.contains("object")
				) {
					const object =
						table.firstElementChild.lastElementChild.firstElementChild
							.firstElementChild
					object.setAttribute("width", (offsetWidth - 6).toString())
				}
			})
			cy.layout(layoutOptions).run()
		})
	}
	render() {
		const { value, ctx, error } = this.state
		if (value) {
			return (
				<div id="content" ref={div => Graph.renderGraph(value, ctx, div)} />
			)
		} else if (error) {
			return <p className="error">{error.toString()}</p>
		} else {
			return null
		}
	}
}
