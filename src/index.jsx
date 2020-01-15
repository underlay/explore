import React from "react"

import N3StreamParser from "n3/lib/N3StreamParser"
import N3Store from "n3/lib/N3Store"

import jsonld from "jsonld"
import { getInitialContext } from "jsonld/lib/context"
import PanelGroup from "react-panelgroup"
import IPFS from "ipfs-http-client"

import Graph from "./graph.jsx"
import { fragment, base32, encode } from "./utils.js"

import localCtx from "./context.json"

const format = "application/n-quads"

const GraphNameError = new Error(
	"Invalid message: only named graphs with blank graph names are allowed."
)

const ipfs = IPFS({ host: "localhost", port: "5001", protocol: "http" })

export default class Message extends React.Component {
	static BorderColor = "#36454F"
	static SelectedBorderColor = "lightgrey"

	static nullState = {
		base: null,
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
	static ParseMessage = data =>
		new Promise((resolve, reject) => {
			const store = new N3Store()
			const parser = new N3StreamParser(Message.ParserOptions)
			parser
				.on("error", reject)
				.on("data", quad => store.addQuad(quad))
				.on("end", () => resolve(store))
				.end(data)
		})

	static getContext(base) {
		const activeCtx = getInitialContext({ base })
		return jsonld.processContext(activeCtx, localCtx, {
			// documentLoader,
		})
	}

	constructor(props) {
		super(props)

		this.cys = {}
		this.selected = null

		const { cid, focus } = props

		if (base32.test(cid) && (focus === null || fragment.test(focus))) {
			this.state = { ...Message.nullState, cid, focus }
		} else {
			this.state = Message.nullState
		}
	}

	async componentDidMount() {
		if (this.state.cid === null) {
			return
		}

		Promise.all([
			Message.getContext(`u:${this.state.cid}`),
			ipfs.cat(this.props.cid).then(Message.ParseMessage),
		])
			.then(([context, store]) => {
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
				this.setState({ store, graphs, graphIds, context })
			})
			.catch(error => {
				console.error(error)
				this.setState({ ...Message.nullState, error })
			})
	}

	shouldComponentUpdate({ cid: nextCid, focus: nextFocus }, nextState) {
		if (nextCid !== this.props.cid) {
			return true
		} else if (nextFocus === this.props.focus) {
			for (const key in Message.nullState) {
				if (nextState[key] !== this.state[key]) {
					return true
				}
			}
			return false
		}

		return true
	}

	componentDidUpdate(prevProps, prevState) {
		const { focus, cid } = this.props
		if (prevProps.cid !== cid || prevProps.focus === focus) {
			return
		}

		const focusId = focus === null ? null : encode(focus)
		for (const graph of this.state.graphs) {
			if (focus === null) {
				this.cys[graph].$(":selected").unselect()
			} else {
				this.cys[graph].$(`:selected[id != '${focusId}']`).unselect()
				this.cys[graph].$(`:unselected[id = '${focusId}']`).select()
			}

			if (graph === prevProps.focus) {
				this.cys[graph].container().parentElement.classList.remove("selected")
			} else if (graph === focus) {
				this.cys[graph].container().parentElement.classList.add("selected")
			}
		}

		if (focus === "") {
			this.cys[""].container().parentElement.classList.add("selected")
		} else if (prevProps.focus === "") {
			this.cys[""].container().parentElement.classList.remove("selected")
		} else if (focus === null) {
			this.cys[""].$(":selected").unselect()
		} else {
			this.cys[""].$(`:selected[id != '${focusId}']`).unselect()
			this.cys[""].$(`:unselected[id = '${focusId}']`).select()
		}
	}

	handleMouseOver = focus => {
		const { graphs, graphIds } = this.state
		const id = encode(focus)
		for (const graph of graphs) {
			if (focus !== "") {
				this.cys[graph].$("#" + id).classes("hover")
			}
			if (id === graphIds[graph]) {
				this.cys[graph].container().parentElement.classList.add("hover")
			}
		}
		if (focus !== "") {
			this.cys[""].$("#" + id).classes("hover")
		}
	}

	handleMouseOut = (focus, graph) => {
		const { graphs, graphIds } = this.state
		if (focus === null) {
			this.cys[graph].$(".hover").classes("")
		} else {
			const id = encode(focus)
			for (const graph of graphs) {
				if (id !== "") {
					this.cys[graph].$("#" + id).classes("")
				}
				if (id === graphIds[graph]) {
					this.cys[graph].container().parentElement.classList.remove("hover")
				}
			}
			if (id !== "") {
				this.cys[""].$("#" + id).classes("")
			}
		}
	}

	handleSelect = focus => {
		if (focus !== this.props.focus) {
			this.props.onFocus(focus)
		}
	}

	handleUnselect = focus => {
		if (focus === this.props.focus) {
			this.props.onFocus(null)
		}
	}

	renderGraph = graph => {
		return (
			<Graph
				key={graph}
				focus={this.props.focus}
				graph={graph}
				store={this.state.store}
				context={this.state.context}
				onSelect={this.handleSelect}
				onUnselect={this.handleUnselect}
				onMouseOver={this.handleMouseOver}
				onMouseOut={id => this.handleMouseOut(id, graph)}
				onMount={cy => (this.cys[graph] = cy)}
				onDestroy={() => delete this.cys[graph]}
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
