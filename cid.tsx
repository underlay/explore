import * as React from "react"

import { base32 } from "./src/utils"

interface CIDProps {
	onSubmit(value: string): void
	disabled: boolean
}

export default class CID extends React.Component<
	CIDProps,
	{ value: string; valid: boolean }
> {
	constructor(props: CIDProps) {
		super(props)
		this.state = { value: "", valid: false }
	}

	handleChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) =>
		this.setState({ value, valid: base32.test(value) })

	handleSubmit = (_: React.FormEvent<HTMLFormElement>) =>
		this.props.onSubmit(this.state.value)

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
