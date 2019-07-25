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
		this.selected = null

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
				const graphIds = {}
				store.forGraphs(({ termType, id }) => {
					if (termType === "BlankNode") {
						graphs.push(id)
						graphIds[id] = encode(id)
					} else if (termType !== "DefaultGraph") {
						throw GraphNameError
					}
				})
				this.setState({ store, graphs, graphIds })
			})
			.catch(error => this.setState({ ...Message.nullState, error }))
	}

	renderDefault = () => {
		return <Graph cys={this.cys} graph={""} context={this.state.context} />
	}

	handleMouseOver = id => {
		const { graphs, graphIds } = this.state
		for (const graph of graphs) {
			this.cys[graph].$("#" + id).classes("hover")
			if (id === graphIds[graph]) {
				this.cys[graph].container().classList.add("hover")
			}
		}
		this.cys[""].$("#" + id).classes("hover")
	}

	handleMouseOut = (id, graph) => {
		const { graphs, graphIds } = this.state
		if (id === null) {
			this.cys[graph].$(".hover").classes("")
		} else {
			for (const graph of graphs) {
				this.cys[graph].$("#" + id).classes("")
				if (id === graphIds[graph]) {
					this.cys[graph].container().classList.remove("hover")
				}
			}
			this.cys[""].$("#" + id).classes("")
		}
	}

	handleSelect = (id, sourceGraph) => {
		if (id !== this.selected) {
			this.selected = id
			const { graphs, graphIds } = this.state
			for (const graph of graphs) {
				if (graph !== sourceGraph) {
					this.cys[graph].$(":selected").unselect()
					this.cys[graph].$("#" + id).select()
				}
				if (id === graphIds[graph]) {
					this.cys[graph].container().classList.add("selected")
				}
			}

			if (sourceGraph !== "") {
				this.cys[""].$(":selected").unselect()
				this.cys[""].$("#" + id).select()
			}
		}
	}

	handleUnselect = (id, sourceGraph) => {
		const { graphs, graphIds } = this.state

		const graph = graphs.find(graph => graphIds[graph] === id)
		if (graph !== undefined) {
			this.cys[graph].container().classList.remove("selected")
		}

		if (id === this.selected) {
			this.selected = null

			for (const graph of graphs) {
				if (graph !== sourceGraph) {
					this.cys[graph].$(":selected").unselect()
				}
			}

			if (sourceGraph !== "") {
				this.cys[""].$(":selected").unselect()
			}
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
			if (graphs.length > 0) {
				return (
					<PanelGroup
						direction="row"
						borderColor={Message.BorderColor}
						spacing={1}
						onUpdate={this.handleOuterUpdate}
						panelWidths={[
							{ size: 360, minSize: 240, resize: "dynamic" },
							{ minSize: 100, resize: "stretch" },
						]}
					>
						{this.renderGraph("")}
						{graphs.length > 1 ? (
							<PanelGroup
								direction="column"
								borderColor={Message.BorderColor}
								spacing={1}
								onUpdate={this.handleInnerUpdate}
							>
								{graphs.map(this.renderGraph)}
							</PanelGroup>
						) : (
							this.renderGraph(graphs[0])
						)}
					</PanelGroup>
				)
			} else {
				return this.renderGraph("")
			}
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
