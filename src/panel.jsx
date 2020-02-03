import React, { Fragment } from "react"
import jsonld from "jsonld"
import {
	verifySignature,
	getSignatures,
	getNonSignatures,
	canon,
} from "./signatures"

function ContextView({ base, ctx }) {
	const { "@vocab": vocab, mappings } = ctx
	if (!vocab && Object.keys(mappings).length === 0) return null
	return (
		<Fragment>
			` <h2>Context</h2>
			<table className="context">
				<tbody>
					<tr>
						<td>
							<strong>@base</strong>
						</td>
						<td>{base}</td>
					</tr>
					{typeof vocab === "string" && (
						<tr>
							<td>
								<strong>@vocab</strong>
							</td>
							<td>{vocab}</td>
						</tr>
					)}
					{Object.keys(mappings).map(key => (
						<tr key={key}>
							<td>{key}</td>
							<td>{mappings[key]["@id"]}</td>
						</tr>
					))}
				</tbody>
			</table>
		</Fragment>
	)
}

const Created = "http://purl.org/dc/terms/created"
const Creator = "http://purl.org/dc/terms/creator"
const SignatureValue = "https://w3id.org/security#signatureValue"

const r = /ul:\/node\/[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{46}/
function testCreator(creator) {
	return r.test(creator[0]["@id"])
}

class SignatureView extends React.Component {
	constructor(props) {
		super(props)
		const { value } = this.props
		const signatures = getSignatures(value)
		const nonSignatures = getNonSignatures(value)
		this.state = {
			bytes: null,
			verified: null,
			signatures,
			nonSignatures,
		}
	}
	async componentDidMount() {
		const { ipfs } = this.props
		const { nonSignatures } = this.state
		const canonized = await jsonld.canonize(nonSignatures, canon)
		const bytes = ipfs.types.Buffer.from(canonized)
		this.setState({ bytes })
	}
	async verify(signature, index) {
		const { ipfs } = this.props
		const { bytes } = this.state
		if (bytes !== null) {
			const result = await verifySignature(bytes, signature, ipfs)
			if (result) {
				this.setState({ verified: new Date() })
			} else {
				this.setState({ verified: false })
			}
		}
	}
	renderVerified() {
		const { verified, bytes } = this.state
		if (bytes === null) return null
		if (verified === null) return "unverified"
		if (verified === true) return "verifying..."
		if (verified === false) return "❌ invalid signature"
		if (verified instanceof Date)
			return `✅ verified by you on ${verified.toString()}`
		return "something terrible happened"
	}
	renderVerify(signature, index) {
		const { bytes } = this.state
		const { [Creator]: creator } = signature
		if (!testCreator(creator)) return null
		return (
			<Fragment>
				<tr>
					<td>
						<button
							disabled={bytes === null}
							onClick={() => this.verify(signature, index)}
						>
							{bytes === null ? "loading..." : "Verify Signature"}
						</button>
					</td>
					<td>{this.renderVerified()}</td>
				</tr>
				<tr>
					<td colSpan="2">
						<hr />
					</td>
				</tr>
			</Fragment>
		)
	}
	renderSignature(signature, index) {
		const { bytes } = this.state
		const {
			[Created]: created,
			[Creator]: creator,
			[SignatureValue]: signatureValue,
		} = signature
		return (
			<table key={index} className="signature">
				<tbody>
					{this.renderVerify(signature, index)}
					<tr>
						<td>created</td>
						<td>{created[0]["@value"]}</td>
					</tr>
					<tr>
						<td>creator</td>
						<td>{creator[0]["@id"]}</td>
					</tr>
					<tr>
						<td>signatureValue</td>
						<td>{signatureValue[0]["@value"]}</td>
					</tr>
				</tbody>
			</table>
		)
	}
	render() {
		const { value } = this.props
		const signatures = getSignatures(value)
		if (signatures.length === 0) return null
		return (
			<Fragment>
				<h2>Signature</h2>
				{signatures.map((signature, index) =>
					this.renderSignature(signature, index)
				)}
			</Fragment>
		)
	}
}

export default function PanelView(props) {
	const contextView = <ContextView {...props} />
	const signatureView = <SignatureView {...props} />
	return (
		<Fragment>
			{contextView}
			{contextView && signatureView && <hr />}
			{signatureView}
		</Fragment>
	)
}
