import React from "react"

// import CID from "./cid"

export default class Header extends React.Component {
	static contexts = ["default", "none", "custom"]

	constructor(props) {
		super(props)
		this.state = { value: Header.contexts[0] }
	}

	handleChange = ({ target: { value } }) => this.setState({ value })

	render() {
		// const { value } = this.state
		return (
			<header>
				<a href="#">
					<img src="compass.svg" />
				</a>
				<h1>Underlay Explorer</h1>
				{/* <div>
					<span>Context:</span>
					{Header.contexts.map(context => (
						<label key={context}>
							{context}
							<input
								type="radio"
								name="context"
								value={context}
								checked={value === context}
								onChange={this.handleChange}
							/>
						</label>
					))}
					<div style={{ fontSize: "11px" }}>
						<CID onSubmit={this.props.onSubmit} disabled={value !== "custom"} />
					</div>
				</div> */}
			</header>
		)
	}
}
