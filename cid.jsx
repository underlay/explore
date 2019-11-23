import React from "react"

import { base32 } from "./src/utils.js"

export default class CID extends React.Component {
	constructor(props) {
		super(props)
		this.state = { value: "", valid: false }
	}

	handleChange = ({ target: { value } }) =>
		this.setState({ value, valid: base32.test(value) })

	handleSubmit = event => {
		this.props.onSubmit(this.state.value)
	}

	render() {
		const { disabled } = this.props
		const { value, valid } = this.state
		return (
			<form className="cid" onSubmit={this.handleSubmit}>
				<input
					className="hash"
					placeholder="QmFoo..."
					type="text"
					value={value}
					onChange={this.handleChange}
					disabled={disabled}
				/>
				<input
					className="go"
					type="submit"
					value="Go"
					disabled={disabled || !valid}
				/>
			</form>
		)
	}
}
