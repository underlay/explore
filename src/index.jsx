import React from "react"
import ReactDOM from "react-dom"

import cytoscape from "cytoscape"
import bilkent from "cytoscape-cose-bilkent"

import Header from "./header"
import Message from "./message"

cytoscape.use(bilkent)

const main = document.querySelector("main")

function Browser({}) {
	return (
		<React.Fragment>
			<Header />
			<Message />
		</React.Fragment>
	)
}

ReactDOM.render(<Browser />, main)
