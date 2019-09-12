import React from "react"
import ReactDOM from "react-dom"

import Message from "./src/index.jsx"
import CID from "./cid.jsx"

import { ipfsPath } from "./src/utils.js"

const main = document.querySelector("main")

class Index extends React.Component {
	constructor(props) {
		super(props)
		const match = ipfsPath.exec("/ipfs/" + window.location.hash.slice(1))
		if (match === null) {
			this.state = { path: null, focus: null }
		} else {
			const [_, path, focus] = match
			this.state = { path, focus: focus || null }
		}
	}
	componentDidMount() {
		window.addEventListener("hashchange", () => {
			const hash = window.location.hash.slice(1)
			const match = ipfsPath.exec("/ipfs/" + hash)
			if (match !== null) {
				const [_, path, focus] = match
				this.setState({ path, focus: focus || null })
			} else if (hash !== "") {
				window.location.hash = ""
			} else if (this.state.path !== null) {
				this.setState({ path: null, focus: null })
			}
		})
	}
	handleSubmit = cid => (window.location.hash = cid)
	handleFocus = focus => {
		const hash = focus === null ? "" : "#" + focus
		window.location.hash = this.state.path.slice(6) + hash
	}
	render() {
		const { path, focus } = this.state
		if (path !== null) {
			return <Message path={path} focus={focus} onFocus={this.handleFocus} />
		} else {
			return (
				<div className="empty">
					<p>Enter the hash of a message:</p>
					<CID fontSize="1em" onSubmit={this.handleSubmit} disabled={false} />
				</div>
			)
		}
	}
}

ReactDOM.render(<Index />, main)
