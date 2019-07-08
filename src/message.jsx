import React from "react"

import N3 from "n3"
import { getInitialContext, process } from "jsonld/lib/context"
import PanelGroup from "react-panelgroup"

import Graph from "./graph.jsx"
import CID from "./cid.jsx"
import fetchDocument from "./fetch.js"
import { base58, encode } from "./utils.js"

import localCtx from "./context.json"

const format = "application/n-quads"
const processingMode = "json-ld-1.1"

const GraphNameError = new Error(
	"Invalid message: only named graphs with blank graph names are allowed."
)

export default class Message extends React.Component {
	static BorderColor = "#36454F"
	static SelectedBorderColor = "lightgrey"

	static nullState = {
		hash: null,
		error: null,
		store: null,
		graphs: null,
		context: null,
	}

	static ParserOptions = { format, blankNodePrefix: "_:" }
	static parseMessage(data) {
		return new Promise((resolve, reject) => {
			const store = new N3.Store()
			const parser = new N3.StreamParser(Message.ParserOptions)
			parser
				.on("error", reject)
				.on("data", quad => store.addQuad(quad))
				.on("end", () => resolve(store))
				.end(data)
		})
	}

	static getContext(base) {
		const activeCtx = getInitialContext({ base })
		return process({ activeCtx, localCtx, processingMode })
	}

	constructor(props) {
		super(props)
		const hash = window.location.hash.slice(1)

		this.cys = {}

		if (base58.test(hash)) {
			const context = Message.getContext(`ul:/ipfs/${hash}`)
			this.state = { ...Message.nullState, hash, context }
		} else {
			this.state = Message.nullState
		}
	}

	componentDidMount() {
		window.addEventListener("hashchange", () => {
			const hash = window.location.hash.slice(1)
			if (base58.test(hash)) {
				const context = Message.getContext(`ul:/ipfs/${hash}`)
				this.setState({ ...Message.nullState, hash, context }, this.fetchHash)
			} else if (hash !== "") {
				window.location.hash = ""
			} else if (this.state.hash !== null) {
				this.setState(Message.nullState)
			}
		})
		if (this.state.hash !== null) {
			this.fetchHash()
		}
	}

	fetchHash = () => {
		fetchDocument(this.state.hash)
			.then(Message.parseMessage)
			.then(store => {
				const graphs = []
				store.forGraphs(({ termType, id }) => {
					if (termType === "BlankNode") {
						graphs.push(id)
					} else if (termType !== "DefaultGraph") {
						throw GraphNameError
					}
				})
				this.setState({ store, graphs })
			})
			.catch(error => this.setState({ ...Message.nullState, error }))
	}

	renderDefault = () => {
		return <Graph cys={this.cys} graph={""} context={this.state.context} />
	}

	handleMouseOver = id => {
		for (const graph of this.state.graphs) {
			this.cys[graph].$("#" + id).classes("hover")
			if (encode(graph) === id) {
				const container = document.querySelector(`.graph[graph-name="${id}"]`)
				container.classList.add("hover")
			}
		}
		this.cys[""].$("#" + id).classes("hover")
	}

	handleMouseOut = id => {
		for (const graph of this.state.graphs) {
			this.cys[graph].$("#" + id).classes("")
			if (encode(graph) === id) {
				const container = document.querySelector(`.graph[graph-name="${id}"]`)
				container.classList.remove("hover")
			}
		}
		this.cys[""].$("#" + id).classes("")
	}

	handleSelect = (id, sourceGraph) => {
		for (const graph of this.state.graphs) {
			if (graph !== sourceGraph) {
				this.cys[graph].$("#" + id).select()
			}
			if (encode(graph) === id) {
				const container = document.querySelector(`.graph[graph-name="${id}"]`)
				container.classList.add("selected")
			}
		}

		if (sourceGraph !== "") {
			this.cys[""].$("#" + id).select()
		}
	}

	handleUnselect = (id, sourceGraph) => {
		for (const graph of this.state.graphs) {
			if (graph !== sourceGraph) {
				this.cys[graph].$("#" + id).unselect()
			}
			if (encode(graph) === id) {
				const container = document.querySelector(`.graph[graph-name="${id}"]`)
				container.classList.remove("selected")
			}
		}

		if (sourceGraph !== "") {
			this.cys[""].$("#" + id).unselect()
		}
	}

	renderGraph = graph => {
		return (
			<Graph
				key={graph}
				cys={this.cys}
				graph={graph}
				store={this.state.store}
				context={this.state.context}
				onSelect={this.handleSelect}
				onUnselect={this.handleUnselect}
				onMouseOver={this.handleMouseOver}
				onMouseOut={this.handleMouseOut}
			/>
		)
	}

	handleInnerUpdate = _ => {
		for (const graph of this.state.graphs) {
			this.cys[graph].resize()
		}
	}

	handleOuterUpdate = _ => {
		this.handleInnerUpdate()
		this.cys[""].resize()
	}

	render() {
		const { hash, store, graphs, error } = this.state
		if (store !== null) {
			return (
				<PanelGroup
					direction="row"
					borderColor={Message.BorderColor}
					spacing={2}
					onUpdate={this.handleOuterUpdate}
					panelWidths={[
						{ size: 360, minSize: 240, resize: "dynamic" },
						{ minSize: 100, resize: "stretch" },
					]}
				>
					{this.renderGraph("")}
					<PanelGroup
						direction="column"
						borderColor={Message.BorderColor}
						spacing={2}
						onUpdate={this.handleInnerUpdate}
					>
						{graphs.map(this.renderGraph)}
					</PanelGroup>
				</PanelGroup>
			)
		} else if (error !== null) {
			return <p className="error">{error.toString()}</p>
		} else if (hash !== null) {
			return (
				<div className="loading">
					<p>Loading...</p>
				</div>
			)
		} else {
			return (
				<div className="empty">
					<p>Enter the hash of a message:</p>
					<CID
						fontSize="1em"
						onSubmit={cid => (window.location.hash = cid)}
						disabled={false}
					/>
				</div>
			)
		}
	}
}
