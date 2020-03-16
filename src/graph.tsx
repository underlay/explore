import * as React from "react"
import cytoscape, { BreadthFirstLayoutOptions } from "cytoscape"
import { N3Store, Quad, Term, Literal } from "n3"
import { compactIri } from "jsonld/lib/compact"

import Node from "./node"

import {
	RDF,
	encode,
	decode,
	Style,
	BreadthFirstLayout,
	GridLayout,
	CoseLayout,
	DataURIPrefix,
	SVGPrefix
} from "./utils"

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

interface Node {
	index?: number
	literals: Map<string, Literal[]>
	types: string[]
}

function createNode(
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

function makeElements(
	activeCtx: {},
	quads: Quad[]
): cytoscape.ElementDefinition[] {
	const compact = (iri: string, vocab: boolean) =>
		compactIri({ activeCtx, iri, relativeTo: { vocab: !!vocab } })

	const elements: cytoscape.ElementDefinition[] = []
	const nodes: Map<string, Node> = new Map()

	for (const index of quads.keys()) {
		const {
			subject,
			predicate: { id: iri },
			object
		} = quads[index]

		createNode(subject, nodes, elements)
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
			createNode(object, nodes, elements)
			elements.push({
				group: "edges",
				data: {
					id: encode(index.toString()),
					iri,
					name: compact(iri, true),
					source: encode(subject.id),
					target: encode(object.id)
				}
			})
		}
	}

	for (const id of nodes.keys()) {
		const { literals, types, index } = nodes.get(id)
		const { data } = elements[index]
		const [svg, width, height] = Node(id, types, literals, compact)
		data.svg = DataURIPrefix + encodeURIComponent(SVGPrefix + svg)
		data.width = width
		data.height = height
	}

	return elements
}

const makeListener = (handler: (target: string) => void) => ({
	target
}: cytoscape.EventObject) => handler(decode(target.id()))

function attachListeners(
	cy: cytoscape.Core,
	{ onSelect, onUnselect, onMouseOver, onMouseOut, focus, graph }: GraphProps
) {
	const n = cy.nodes()
	if (typeof onMouseOver === "function") {
		n.on("mouseover", makeListener(onMouseOver))
	}

	if (typeof onMouseOut === "function") {
		n.on("mouseout", makeListener(onMouseOut))
		cy.on("mouseout", _ => onMouseOut(null))
	}

	if (typeof onSelect === "function") {
		n.on("select", ({ target }: cytoscape.EventObject) => {
			const id = decode(target.id())
			onSelect(id)
		})
	}

	if (typeof onUnselect === "function") {
		n.on("unselect", ({ target }: cytoscape.EventObject) => {
			const id = decode(target.id())
			onUnselect(id)
		})
	}

	if (focus === graph) {
		cy.container().parentElement.classList.add("selected")
	} else if (focus !== null && focus !== "") {
		cy.$(`#${encode(focus)}`).select()
	}
}

function makeEvents(
	ref: React.MutableRefObject<cytoscape.Core>,
	graph: string
): {
	[name: string]: (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
} {
	const directed = graph === ""
	return {
		reset: _ => ref.current.fit(),
		bfs: _ =>
			ref.current
				.layout({
					...BreadthFirstLayout,
					directed
				} as BreadthFirstLayoutOptions)
				.run(),
		grid: () => ref.current.layout(GridLayout).run(),
		random: () => ref.current.layout(RandomSource).run(),
		cose: () => ref.current.layout(CoseLayout).run()
	}
}

export default function(props: GraphProps) {
	const { store, graph, focus, activeCtx, onMount, onDestroy } = props
	const quads = React.useMemo(() => store.getQuads(null, null, null, graph), [
		store,
		graph
	])

	const elements = React.useMemo(() => makeElements(activeCtx, quads), [
		activeCtx,
		quads
	])

	const ref: React.MutableRefObject<cytoscape.Core> = React.useRef(null)
	const cy = ref.current

	const events = React.useMemo(() => makeEvents(ref, graph), [graph])

	React.useEffect(() => {
		if (cy !== null) {
			cy.elements().remove()
			cy.add(elements)
			attachListeners(cy, props)
		}
	}, [store, graph, activeCtx])

	const attachRef = React.useCallback((div: HTMLDivElement) => {
		if (div === null) {
			return
		} else if (ref.current !== null) {
			return
		}

		const layout = {
			...BreadthFirstLayout,
			directed: graph === "",
			roots: focus === null ? undefined : `#${encode(focus)}`
		}

		ref.current = cytoscape({
			container: div,
			elements,
			layout,
			style: Style,
			minZoom: 0.1,
			maxZoom: 4,
			zoom: 1
		})

		if (typeof onDestroy === "function") {
			ref.current.on("destroy", _ => onDestroy())
		}

		if (typeof onMount === "function") {
			onMount(ref.current)
		}

		attachListeners(ref.current, props)
	}, [])

	const className = graph === "" ? "graph default" : "graph"
	return (
		<div className={className}>
			<div className="control">
				<span>{graph || null}</span>
				<button onClick={events.random}>Random</button>
				<button onClick={events.grid}>Grid</button>
				<button onClick={events.bfs}>BFS</button>
				<button onClick={events.cose}>Cose</button>|
				<button onClick={events.reset}>Reset</button>
			</div>
			<div className="container" ref={attachRef} />
		</div>
	)
}
