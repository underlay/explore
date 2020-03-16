import * as React from "react"
import { N3Store, Term } from "n3"
import PanelGroup, { PanelWidth } from "react-panelgroup"

import GraphView from "./graph"
import { encode, BorderColor, PanelWidths, decode } from "./utils"

const GraphNameError = new Error(
	"Invalid message: only named graphs with blank graph names are allowed."
)

export const Graph = GraphView

interface DatasetProps {
	context: {}
	store: N3Store
	focus: string
	onFocus(focus: string): void
}

export default function Dataset({
	store,
	context,
	focus,
	onFocus
}: DatasetProps) {
	const {
		current: cys
	}: React.MutableRefObject<Map<string, cytoscape.Core>> = React.useRef(
		new Map()
	)

	const graphs = React.useMemo(() => {
		const graphs: string[] = []
		const forGraphs = ({ termType, id }: Term) => {
			if (termType === "BlankNode") {
				graphs.push(id)
			} else if (termType !== "DefaultGraph") {
				throw GraphNameError
			}
		}

		store.forGraphs(forGraphs, null, null, null)
		return graphs
	}, [store])

	const focusRef = React.useRef(focus)

	React.useEffect(() => {
		focusRef.current = focus
	}, [focus])

	const handleOuterUpdate = (_: PanelWidth) => {
		for (const graph of graphs) {
			cys.get(graph).resize()
		}
	}

	const handleInnerUpdate = (data: PanelWidth) => {
		handleInnerUpdate(data)
		cys.get("").resize()
	}

	const handleMouseOver = React.useCallback((id: string) => {
		for (const [graph, cy] of cys.entries()) {
			if (id !== "") {
				cy.$("#" + encode(id)).classes("hover")
			}

			if (id === graph) {
				cy.container().parentElement.classList.add("hover")
			}
		}
	}, [])

	const handleMouseOut = React.useCallback((id: string, graph: string) => {
		if (id === null) {
			cys
				.get(graph)
				.$(".hover")
				.forEach(ele => {
					const id = decode(ele.id())
					if (cys.has(id)) {
						cys
							.get(id)
							.container()
							.parentElement.classList.remove("hover")
					}
				})
				.classes("")
		} else {
			for (const [graph, cy] of cys.entries()) {
				if (id !== "") {
					cy.$("#" + encode(id)).classes("")
				}

				if (id === graph) {
					cy.container().parentElement.classList.remove("hover")
				}
			}
		}
	}, [])

	const handleSelect = React.useCallback((id: string) => {
		if (id !== focusRef.current) {
			const f = encode(id)
			for (const [graph, cy] of cys.entries()) {
				if (graph === id) {
					cy.container().parentElement.classList.add("selected")
				} else if (id !== "") {
					cy.$(`#${f}:unselected`).select()
				}

				if (focusRef.current !== null) {
					if (graph === focusRef.current) {
						cy.container().parentElement.classList.remove("selected")
					} else if (id !== "") {
						cy.$(`[id != "${f}"]:selected`).unselect()
					}
				}
			}

			onFocus(id)
		}
	}, [])

	const handleUnselect = React.useCallback((id: string) => {
		if (id === focusRef.current) {
			for (const [graph, cy] of cys.entries()) {
				if (id === graph) {
					cy.container().parentElement.classList.remove("selected")
				}
				cy.$(`:selected`).unselect()
			}

			onFocus(null)
		}
	}, [])

	const renderGraph = (graph: string) => (
		<GraphView
			key={graph}
			focus={focus}
			graph={graph}
			store={store}
			activeCtx={context}
			onSelect={handleSelect}
			onUnselect={handleUnselect}
			onMouseOver={handleMouseOver}
			onMouseOut={id => handleMouseOut(id, graph)}
			onMount={cy => cys.set(graph, cy)}
			onDestroy={() => cys.delete(graph)}
		/>
	)

	return (
		<PanelGroup
			direction="row"
			borderColor={BorderColor}
			spacing={1}
			onUpdate={handleOuterUpdate}
			panelWidths={PanelWidths}
		>
			{renderGraph("")}
			<PanelGroup
				direction="column"
				borderColor={BorderColor}
				spacing={1}
				onUpdate={handleInnerUpdate}
			>
				{graphs.map(renderGraph)}
			</PanelGroup>
		</PanelGroup>
	)
}
