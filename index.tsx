import * as React from "react"
import * as ReactDOM from "react-dom"
import * as jsonld from "jsonld"
import IPFS from "ipfs-http-client"
import { getInitialContext } from "jsonld/lib/context"

import Dataset from "./src/index"
import CID from "./cid"
import localCtx from "./src/context.json"

import { base32, fragment, parseMessage } from "./src/utils"

const main = document.querySelector("main")

const title = document.title
const url = location.origin + location.pathname
const makeUrl = ({ cid, focus }: { cid: string; focus: string }) =>
	url + (cid === null ? "" : "?" + cid) + (focus === null ? "" : "#" + focus)

const ipfs = IPFS({ host: "localhost", port: "5001", protocol: "http" })

function getContext(base: string): Promise<{}> {
	const activeCtx = getInitialContext({ base })
	return (jsonld as any).processContext(activeCtx, localCtx, {})
}

function Index(_: {}) {
	const [cid, setCid] = React.useState(null)
	const [store, setStore] = React.useState(null)
	const [focus, setFocus] = React.useState(null)
	const [error, setError] = React.useState(null)
	const [context, setContext] = React.useState(null)

	// Set CID and hash from query string
	React.useEffect(() => {
		const { hash, search } = window.location
		const match = base32.exec(search.slice(1))
		const state: { cid: string; focus: string } = {
			cid: null,
			focus: null
		}

		if (match !== null) {
			setCid(match[0])
			state.cid = match[0]
			if (hash === "" && location.href.slice(-1) === "#") {
				setFocus("")
				state.focus = "#"
			} else if (fragment.test(hash.slice(1))) {
				setFocus(hash.slice(1))
				state.focus = hash.slice(1)
			}
		}

		const href = makeUrl(state)
		history.replaceState(state, title, href)

		addEventListener("popstate", ({ state: { cid, focus } }) => {
			setCid(cid)
			setStore(null)
			setFocus(focus)
		})

		const onHashChange = () => {
			const { hash, href } = window.location
			if (hash === "" && href.slice(-1) === "#") {
				setFocus("")
			} else if (fragment.test(hash.slice(1))) {
				setFocus(hash.slice(1))
			} else {
				setFocus(null)
			}
		}

		addEventListener("hashchange", onHashChange)
		return () => removeEventListener("hashchange", onHashChange)
	}, [])

	React.useEffect(() => {
		if (error !== null) {
			console.error(error)
		}
	}, [error])

	// Fetch dataset
	React.useEffect(() => {
		const state = { cid, focus }
		const href = makeUrl(state)
		if (href !== window.location.href) {
			history.pushState(state, title, href)
		}

		let cancelled = false
		if (cid !== null) {
			async function cat() {
				const chunks: Buffer[] = []
				for await (const chunk of ipfs.cat(cid)) {
					chunks.push(chunk)
				}
				const data = Buffer.concat(chunks)
				const store = await parseMessage(data)
				if (!cancelled) {
					setStore(store)
				}
			}
			cat().catch(setError)
		}
		return () => {
			cancelled = true
		}
	}, [cid])

	React.useEffect(() => {
		if (cid !== null) {
			getContext(`ul:${cid}`).then(setContext)
		}
	}, [cid])

	const handleFocus = React.useCallback((id: string) => {
		console.log("setting fragment", id)
		if (id === null) {
			history.pushState({ cid, focus: id }, title, url + location.search)
			setFocus(null)
		} else {
			location.hash = id
		}
	}, [])

	if (error !== null) {
		return <p className="error">{error.toString()}</p>
	} else if (store !== null && context !== null) {
		return (
			<Dataset
				store={store}
				focus={focus}
				onFocus={handleFocus}
				context={context}
			/>
		)
	} else if (cid !== null) {
		return <p className="loading">Loading...</p>
	} else {
		return (
			<div className="empty">
				<p>Enter the hash of a message:</p>
				<CID onSubmit={setCid} disabled={false} />
			</div>
		)
	}
}

ReactDOM.render(<Index />, main)
