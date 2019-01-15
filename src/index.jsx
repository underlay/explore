import React from "react"
import ReactDOM from "react-dom"
import IPFS from "ipfs"

import Graph from "./graph"

const main = document.querySelector("main")

const ipfs = new IPFS({})
ipfs.on("ready", () => {
	console.log("ready", ipfs, ipfs.get)
	ReactDOM.render(<Graph ipfs={ipfs} />, main)
})
