import React from "react"
import ReactDOM from "react-dom"

import Graph from "./graph"
import ipfs from "./ipfs"

const main = document.querySelector("main")

ReactDOM.render(<Graph ipfs={ipfs} />, main)
