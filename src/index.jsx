import React from "react"
import ReactDOM from "react-dom"

import Assertion from "./assertion"

import ipfs from "./ipfs"

const main = document.querySelector("main")

ReactDOM.render(<Assertion ipfs={ipfs} />, main)
