import * as React from "react"
import * as ReactDOM from "react-dom"
import * as jsonld from "jsonld"
import IPFS from "ipfs-http-client"
import { Store, StreamParser, N3Store, Term } from "n3"
import { getInitialContext } from "jsonld/lib/context"

import Dataset from "./src/index"
import CID from "./cid"
import localCtx from "./src/context.json"

import { base32, fragment } from "./src/utils"

const main = document.querySelector("main")

const title = document.title
const url = location.origin + location.pathname

interface State {
	cid: string
	focus: string
	store: N3Store
	error: Error
	context: {}
}

const ipfs = IPFS({ host: "localhost", port: "5001", protocol: "http" })
const format = "application/n-quads"

class Index extends React.Component<{}, State> {
	static getContext(base: string): {} {
		const activeCtx = getInitialContext({ base })
		return (jsonld as any).processContext(activeCtx, localCtx, {})
	}

	static ParserOptions = { format, blankNodePrefix: "_:" }
	static ParseMessage = (data: Buffer): Promise<N3Store> =>
		new Promise((resolve, reject) => {
			const store = new Store()
			const parser = new StreamParser(Index.ParserOptions)
			parser
				.on("error", reject)
				.on("data", quad => store.addQuad(quad))
				.on("end", () => resolve(store))
				.end(data)
		})

	constructor(props: {}) {
		super(props)

		const state: State = {
			cid: null,
			focus: null,
			store: null,
			error: null,
			context: null,
		}

		const match = base32.exec(location.search.slice(1))
		const hash = location.hash.slice(0)
		let href = url
		if (match !== null) {
			state.cid = match[0]
			href += "?" + match[0]
			if (hash === "" && location.href.slice(-1) === "#") {
				state.focus = ""
				href += "#"
			} else if (fragment.test(hash)) {
				state.focus = hash
				href += "#" + hash
			}
		}

		this.state = state
		location.hash = state.focus
		history.replaceState(state, title, href)
	}

	componentDidMount() {
		addEventListener("hashchange", () => {
			if (this.state.cid === null) {
				return
			}

			const state: { focus: string } = { focus: null }
			const hash = location.hash.slice(1)
			if (hash === "" && location.href.slice(-1) === "#") {
				state.focus = ""
			} else if (fragment.test(hash)) {
				state.focus = hash
			}

			this.setState(({ focus, cid }) => {
				if (focus !== state.focus) {
					const href =
						url + "?" + cid + state.focus === null ? "" : "#" + state.focus
					history.replaceState({ cid, focus: state.focus }, title, href)
					return state
				} else {
					return null
				}
			})
		})

		if (this.state.cid !== null) {
			this.fetchDataset()
		}
	}

	componentDidUpdate(prevProps: {}, prevState: State) {
		const { cid } = this.state
		if (cid !== null && prevState.cid !== cid) {
			this.fetchDataset()
		}
	}

	fetchDataset() {
		const { cid } = this.state
		Promise.all([
			Index.getContext(`u:${cid}`),
			ipfs.cat(cid).then(Index.ParseMessage),
		] as [Promise<{}>, Promise<N3Store>])
			.then(([context, store]: [{}, N3Store]) =>
				this.setState({ store, context })
			)
			.catch(error => {
				console.error(error)
				this.setState({ error })
			})
	}

	handleSubmit = (cid: string) => {
		history.pushState({ cid }, title, "?" + cid)
		this.setState({ cid, focus: null })
	}

	handleFocus = (focus: string) => {
		if (focus === null) {
			history.pushState(
				{ cid: this.state.cid, focus },
				title,
				url + location.search
			)
			this.setState({ focus })
		} else {
			location.hash = focus
		}
	}

	render() {
		const { store, cid, focus, error } = this.state
		if (error !== null) {
			return <p className="error">{error.toString()}</p>
		} else if (store !== null) {
			return <Dataset store={store} focus={focus} onFocus={this.handleFocus} />
		} else if (cid !== null) {
			return <p className="loading">Loading...</p>
		} else {
			return (
				<div className="empty">
					<p>Enter the hash of a message:</p>
					<CID onSubmit={this.handleSubmit} disabled={false} />
				</div>
			)
		}
	}
}

ReactDOM.render(<Index />, main)
