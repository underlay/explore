import React from "react"

import * as N3 from "n3"
import { getInitialContext, process } from "jsonld/lib/context"
import PanelGroup from "react-panelgroup"

import Graph from "./graph.jsx"
import fetchDocument from "./fetch.js"
import { ipfsPath, encode, decode } from "./utils.js"

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
		error: null,
		store: null,
		graphs: null,
		graphIds: null,
		context: null,
	}

	static panelWidths = [
		{ size: 360, minSize: 240, resize: "dynamic" },
		{ minSize: 100, resize: "stretch" },
	]

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

		this.cys = {}
		this.selected = null

		const { path, focus } = props

		const match = ipfsPath.exec(path + (focus === null ? "" : "#" + focus))
		if (match !== null) {
			const context = Message.getContext(`ul:${match[1]}`)
			this.state = { ...Message.nullState, context }
		} else {
			this.state = Message.nullState
		}
	}

	componentDidMount() {
		if (this.state.context === null) {
			return
		}

		fetchDocument(this.props.path)
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

	shouldComponentUpdate({ path, focus }, nextState) {
		const { graphs, graphIds } = nextState
		const f = focus ? encode(focus) : null
		if (path !== this.props.path) {
			return true
		} else if (focus === this.props.focus) {
			for (const key in Message.nullState) {
				if (nextState[key] !== this.state[key]) {
					return true
				}
			}
			return false
		}

		if (this.props.focus !== null && focus === null) {
			for (const graph of graphs) {
				this.cys[graph].$(`:selected[id != '${f}']`).unselect()
				if (f === graphIds[graph]) {
					this.cys[graph].container().parentElement.classList.remove("selected")
				}
			}

			this.cys[""].$(`:selected[id != '${f}']`).unselect()
		} else if (this.props.focus !== focus) {
			for (const graph of graphs) {
				this.cys[graph].$(`:selected[id != '${f}']`).unselect()
				this.cys[graph].$(`:unselected[id = '${f}']`).select()
				if (f === graphIds[graph]) {
					this.cys[graph].container().parentElement.classList.add("selected")
				}
			}

			this.cys[""].$(`:selected[id != '${f}']`).unselect()
			this.cys[""].$(`:unselected[id = '${f}']`).select()
		}

		return false
	}

	handleMouseOver = id => {
		const { graphs, graphIds } = this.state
		for (const graph of graphs) {
			this.cys[graph].$("#" + id).classes("hover")
			if (id === graphIds[graph]) {
				this.cys[graph].container().parentElement.classList.add("hover")
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
					this.cys[graph].container().parentElement.classList.remove("hover")
				}
			}
			this.cys[""].$("#" + id).classes("")
		}
	}

	handleSelect = (id, sourceGraph) => {
		const focus = decode(id)
		if (focus !== this.props.focus) {
			this.props.onFocus(focus)
		}
	}

	handleUnselect = (id, sourceGraph) => {
		const focus = decode(id)
		if (focus === this.props.focus) {
			this.props.onFocus(null)
		}
	}

	renderDefault = () => {
		return (
			<Graph
				cys={this.cys}
				focus={this.props.focus}
				graph={""}
				context={this.state.context}
			/>
		)
	}

	renderGraph = graph => {
		return (
			<Graph
				key={graph}
				cys={this.cys}
				focus={this.props.focus}
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
		const { context, store, graphs, error } = this.state
		if (context === null) {
			return null
		} else if (store !== null && graphs.length === 0) {
			return this.renderGraph("")
		} else if (store !== null) {
			return (
				<PanelGroup
					direction="row"
					borderColor={Message.BorderColor}
					spacing={1}
					onUpdate={this.handleOuterUpdate}
					panelWidths={Message.panelWidths}
				>
					{this.renderGraph("")}
					<PanelGroup
						direction="column"
						borderColor={Message.BorderColor}
						spacing={1}
						onUpdate={this.handleInnerUpdate}
					>
						{graphs.map(this.renderGraph)}
					</PanelGroup>
				</PanelGroup>
			)
		} else if (error !== null) {
			return <p className="error">{error.toString()}</p>
		} else {
			return (
				<div className="loading">
					<p>Loading...</p>
				</div>
			)
		}
	}
}
