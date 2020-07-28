import React, { useEffect, useCallback, useState } from "react"
import ReactDOM from "react-dom"
import jsonld from "jsonld"
import { useDebounce } from "use-debounce"
import { QuadT, Store, Parse } from "n3.ts"
import "rdf-cytoscape/rdf-cytoscape.css"

import { Dataset } from "rdf-cytoscape"

const main = document.querySelector("main")

const jsonLdFormat = "json-ld",
	nQuadsFormat = "n-quads"
const initialFormat = jsonLdFormat
const initialText = JSON.stringify(
	{
		"@context": {
			"@vocab": "http://schema.org/",
		},
		"@type": "Person",
		name: "John Doe",
	},
	null,
	"  "
)

async function parseText(text: string, format: string): Promise<Store> {
	if (format === jsonLdFormat) {
		const doc = JSON.parse(text)
		const quads = (await jsonld.toRDF(doc)) as QuadT[]
		for (const quad of quads) {
			if (quad.subject.termType === "BlankNode") {
				const value = quad.subject.value
				if (value.startsWith("_:")) {
					quad.subject.value = value.slice(2)
				}
			}
			if (quad.object.termType === "BlankNode") {
				const value = quad.object.value
				if (value.startsWith("_:")) {
					quad.object.value = value.slice(2)
				}
			}
			if (quad.graph.termType === "BlankNode") {
				const value = quad.graph.value
				if (value.startsWith("_:")) {
					quad.graph.value = value.slice(2)
				}
			}
		}
		return new Store(quads)
	} else if (format === nQuadsFormat) {
		return new Store(Parse(text))
	} else {
		throw new Error(`Invalid format ${format}`)
	}
}

type Format = typeof jsonLdFormat | typeof nQuadsFormat

function Index(
	props:
		| {
				frame?: false
		  }
		| {
				frame: true
				format: Format
				src: string
		  }
) {
	const [error, setError] = useState(null as string | null)
	const [format, setFormat] = useState(
		props.frame ? props.format : initialFormat
	)

	const handleFormatChange = useCallback(
		({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
			if (value === jsonLdFormat || value === nQuadsFormat) {
				setFormat(value)
			}
		},
		[]
	)

	const [value, setValue] = useState(initialText)
	const handleValueChange = useCallback(
		(event: React.ChangeEvent<HTMLTextAreaElement>) =>
			setValue(event.target.value),
		[]
	)

	const [store, setStore] = useState(null as Store | null)
	const [text] = useDebounce(value, 1000)
	useEffect(() => {
		parseText(text, format)
			.then((store) => {
				setStore(store)
				setError(null)
			})
			.catch((error) => {
				setStore(null)
				setError(error.toString())
			})
	}, [text, format])

	if (props.frame) {
		return <Frame store={store} error={error} />
	}

	return (
		<React.Fragment>
			<div className="input">
				<a href="https://github.com/underlay/explore">underlay/explore</a>
				<hr />
				<header>
					<span>input type:</span>
					<label>
						<input
							type="radio"
							value={nQuadsFormat}
							name="format"
							// disabled={true}
							checked={format === nQuadsFormat}
							onChange={handleFormatChange}
						></input>
						N-Quads
					</label>
					<label>
						<input
							type="radio"
							value={jsonLdFormat}
							name="format"
							checked={format === jsonLdFormat}
							onChange={handleFormatChange}
						></input>
						JSON-LD
					</label>
				</header>
				<textarea value={value} onChange={handleValueChange}></textarea>
			</div>
			<Frame store={store} error={error} />
		</React.Fragment>
	)
}

function Frame({
	store,
	error,
}: {
	store: Store | null
	error: string | null
}) {
	return (
		<div className="rdf-cytoscape">
			{store === null ? (
				<p className="error">{error || "Loading..."}</p>
			) : (
				<Dataset dataset={store} />
			)}
		</div>
	)
}

ReactDOM.render(<Index />, main)
