import React from "react"
import ReactDOM from "react-dom"

import Message from "./src/index.jsx"
import CID from "./cid.jsx"

import { base32 } from "./src/utils.js"

const main = document.querySelector("main")

const title = document.title
const url = location.origin + location.pathname

class Index extends React.Component {
	constructor(props) {
		super(props)
		const match = base32.exec(location.search.slice(1))
		if (match === null) {
			this.state = { cid: null, focus: null }
		} else if (location.hash === "" && location.href.slice(-1) === "#") {
			this.state = { cid: match[0], focus: "" }
		} else if (location.hash === "") {
			this.state = { cid: match[0], focus: null }
		} else {
			this.state = { cid: match[0], focus: location.hash.slice(1) }
		}

		history.replaceState(
			this.state,
			title,
			url +
				(this.state.cid === null ? "" : "?" + this.state.cid) +
				(this.state.focus === null ? "" : "#" + this.state.focus)
		)
	}

	componentDidMount() {
		addEventListener("hashchange", () => {
			const state = {}
			if (location.hash === "" && location.href.slice(-1) === "#") {
				state.focus = ""
			} else if (location.hash === "") {
				state.focus = null
			} else {
				state.focus = location.hash.slice(1)
			}

			history.replaceState(
				{ cid: this.state.cid, focus: state.focus },
				title,
				url + location.search + (state.focus === null ? "" : "#" + state.focus)
			)

			this.setState(state)
		})
	}

	handleSubmit = cid => {
		history.pushState({ cid }, title, "?" + cid)
		this.setState({ cid, focus: null })
	}

	handleFocus = focus => {
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
		const { cid, focus } = this.state
		if (cid !== null) {
			return <Message cid={cid} focus={focus} onFocus={this.handleFocus} />
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
