import * as React from "react"
import { N3Store, Term } from "n3"
import PanelGroup, { PanelWidth } from "react-panelgroup"

import Graph from "./graph"
import { encode } from "./utils"

const GraphNameError = new Error(
	"Invalid message: only named graphs with blank graph names are allowed."
)

interface DatasetProps {
	context?: {}
	store: N3Store
	focus: string
	onFocus(focus: string): void
}

interface DatasetState {
	error: Error
	store: N3Store
	graphs: string[]
	graphIds: { [key: string]: string }
}

export default class Dataset extends React.Component<
	DatasetProps,
	DatasetState
> {
	static BorderColor = "#36454F"
	static SelectedBorderColor = "lightgrey"

	static panelWidths: PanelWidth[] = [
		{ size: 360, minSize: 240, resize: "dynamic" },
		{ minSize: 100, resize: "stretch" },
	]

	cys: { [id: string]: cytoscape.Core }
	selected: {}

	static getDerivedStateFromProps(
		props: DatasetProps,
		state: DatasetState
	): Partial<DatasetState> {
		if (props.store !== state.store) {
			return Dataset.getGraphs(props.store)
		} else {
			return null
		}
	}

	static getGraphs(store: N3Store): Partial<DatasetState> {
		const graphs: string[] = []
		const graphIds: { [id: string]: string } = {}
		const forGraphs = ({ termType, id }: Term) => {
			if (termType === "BlankNode") {
				graphs.push(id)
				graphIds[id] = encode(id)
			} else if (termType !== "DefaultGraph") {
				throw GraphNameError
			}
		}
		store.forGraphs(forGraphs, null, null, null)
		return { graphs, graphIds }
	}

	constructor(props: DatasetProps) {
		super(props)
		this.cys = {}
		this.selected = null
	}

	shouldComponentUpdate(
		{ focus: nextFocus }: DatasetProps,
		nextState: DatasetState
	) {
		if (nextFocus === this.props.focus) {
			for (const key in this.state) {
				const k = key as keyof DatasetState
				if (nextState[k] !== this.state[k]) {
					return true
				}
			}
			return false
		}

		return true
	}

	componentDidUpdate(prevProps: DatasetProps, prevState: DatasetState) {
		const { focus, store } = this.props
		if (prevProps.store !== store || prevProps.focus === focus) {
			return
		}

		const focusId = focus === null ? null : encode(focus)
		for (const graph of this.state.graphs) {
			const cy = this.cys[graph]
			if (focus === null) {
				cy.$(":selected").unselect()
			} else {
				cy.$(`:selected[id != '${focusId}']`).unselect()
				cy.$(`:unselected[id = '${focusId}']`).select()
			}

			if (graph === prevProps.focus) {
				cy.container().parentElement.classList.remove("selected")
			} else if (graph === focus) {
				cy.container().parentElement.classList.add("selected")
			}
		}

		const cy = this.cys[""]
		if (focus === "") {
			cy.container().parentElement.classList.add("selected")
		} else if (prevProps.focus === "") {
			cy.container().parentElement.classList.remove("selected")
		} else if (focus === null) {
			cy.$(":selected").unselect()
		} else {
			cy.$(`:selected[id != '${focusId}']`).unselect()
			cy.$(`:unselected[id = '${focusId}']`).select()
		}
	}

	handleMouseOver = (focus: string) => {
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

	handleMouseOut = (focus: string, graph: string) => {
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

	handleSelect = (focus: string) => {
		if (focus !== this.props.focus) {
			this.props.onFocus(focus)
		}
	}

	handleUnselect = (focus: string) => {
		if (focus === this.props.focus) {
			this.props.onFocus(null)
		}
	}

	renderGraph = (graph: string) => {
		return (
			<Graph
				key={graph}
				focus={this.props.focus}
				graph={graph}
				store={this.props.store}
				activeCtx={this.props.context}
				onSelect={this.handleSelect}
				onUnselect={this.handleUnselect}
				onMouseOver={this.handleMouseOver}
				onMouseOut={id => this.handleMouseOut(id, graph)}
				onMount={cy => (this.cys[graph] = cy)}
				onDestroy={() => delete this.cys[graph]}
			/>
		)
	}

	handleInnerUpdate = (_: PanelWidth) => {
		for (const graph of this.state.graphs) {
			this.cys[graph].resize()
		}
	}

	handleOuterUpdate = (data: PanelWidth) => {
		this.handleInnerUpdate(data)
		this.cys[""].resize()
	}

	render() {
		const { graphs } = this.state
		if (graphs.length === 0) {
			return this.renderGraph("")
		} else {
			return (
				<PanelGroup
					direction="row"
					borderColor={Dataset.BorderColor}
					spacing={1}
					onUpdate={this.handleOuterUpdate}
					panelWidths={Dataset.panelWidths}
				>
					{this.renderGraph("")}
					<PanelGroup
						direction="column"
						borderColor={Dataset.BorderColor}
						spacing={1}
						onUpdate={this.handleInnerUpdate}
					>
						{graphs.map(this.renderGraph)}
					</PanelGroup>
				</PanelGroup>
			)
		}
	}
}
