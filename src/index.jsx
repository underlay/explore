import React from "react"
import ReactDOM from "react-dom"

import Header from "./header"
import Message from "./message"

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
