import React from "react"
import ReactDOM from "react-dom"

import Header from "./header"
import Message from "./message"

const main = document.querySelector("main")

if (window.location.search === "?fullscreen") {
	ReactDOM.render(<Message />, main)
} else {
	ReactDOM.render(
		<React.Fragment>
			<Header />
			<Message />
		</React.Fragment>,
		main
	)
}
