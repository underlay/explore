import React from "react"

export const primitives = new Set(["string", "number", "boolean"])

export const primitiveMap = {
	"http://www.w3.org/2001/XMLSchema#string": "string",
	"http://www.w3.org/2001/XMLSchema#integer": "number",
	"http://www.w3.org/2001/XMLSchema#double": "number",
	"http://www.w3.org/2001/XMLSchema#boolean": "boolean",
}
export const classTypes = {
	"http://www.w3.org/ns/prov#Agent": "agent",
	"http://www.w3.org/ns/prov#Person": "agent",
	"http://www.w3.org/ns/prov#SoftwareAgent": "agent",
	"http://www.w3.org/ns/prov#Entity": "entity",
	"http://www.w3.org/ns/prov#Activity": "activity",
}

export function getNodeId(id, parent) {
	const path = []
	if (parent) path.push(parent)
	path.push(id)
	return path.join("::")
}

export function getEdgeId(source, property, index, parent) {
	const path = []
	if (parent) path.push(parent)
	path.push(source)
	path.push(property)
	path.push(index)
	return path.join("::")
}

export function getTableId(id) {
	return `table::${id}`
}

export function getContainerId(id) {
	return `container::${id}`
}

const TypeHeader = ({ types }) =>
	types.map((type, index, { length }) => (
		<tr>
			{index ? null : (
				<td rowSpan={length}>
					<strong>@type</strong>
				</td>
			)}
			<td colSpan="2">{type}</td>
		</tr>
	))

const dwebUriTest = /dweb:\/ipfs\/[a-zA-Z0-9]+$/
const dwebUriPrefix = "dweb:/ipfs/"
export function NodeView({ id, node, parent, nodes, compact }) {
	const {
		"@id": _,
		"@type": type,
		"@graph": graph,
		"@index": index,
		...properties
	} = node
	const shouldRenderObject =
		dwebUriTest.test(id) &&
		Array.isArray(type) &&
		type.includes("http://schema.org/DigitalDocument") &&
		type.includes("http://www.w3.org/ns/prov#Entity") &&
		properties.hasOwnProperty("http://schema.org/fileFormat")
	const objectData =
		shouldRenderObject &&
		`https://gateway.ipfs.io/ipfs/${id.slice(dwebUriPrefix.length)}`
	const typeHeader = Array.isArray(type) ? (
		<TypeHeader types={type.map(t => compact(t, true))} />
	) : null
	const isBlankNode = id.indexOf("_:") === 0 // || id.indexOf("_:") === id.indexOf("::") + 2
	const idHeader = isBlankNode ? null : (
		<tr>
			<td>
				<strong>@id</strong>
			</td>
			<td colSpan="2">{id}</td>
		</tr>
	)
	const rows = []
	Object.keys(properties).forEach(property => {
		const values = properties[property]
		const name = compact(property, true)
		values.forEach(
			({ "@id": id, "@type": type, "@value": value }, index, { length }) => {
				if (nodes.hasOwnProperty(id)) return

				const cells = []
				if (index === 0) {
					cells.push(
						<td
							key="0"
							className="property"
							itemProp={property}
							rowSpan={length}
						>
							{name}
						</td>
					)
				}

				const typeOfValue = typeof value
				const typeName = type ? (
					primitiveMap[type] ? (
						<span className="primitive">{primitiveMap[type]}</span>
					) : (
						compact(type, true)
					)
				) : primitives.has(typeOfValue) ? (
					<span className="primitive">{typeOfValue}</span>
				) : null

				cells.push(
					<td key="1" className="type">
						{typeName}
					</td>
				)

				if (primitives.has(typeOfValue)) {
					cells.push(
						<td key="2" className="value">
							{JSON.stringify(value)}
						</td>
					)
				} else {
					cells.push(<td key="2">{compact(id, false)}</td>)
				}
				rows.push(<tr key={rows.length}>{cells}</tr>)
			}
		)
	})
	const hasDivider = (idHeader || typeHeader) && !!rows.length
	const itemType = type ? type.join(" ") : null
	const classes = new Set(["node"])
	if (type)
		type.forEach(
			type => classTypes.hasOwnProperty(type) && classes.add(classTypes[type])
		)
	const tableId = getTableId(id)
	return (
		<table
			className={Array.from(classes).join(" ")}
			id={tableId}
			itemScope
			itemType={itemType}
		>
			{idHeader}
			{typeHeader}
			{hasDivider && (
				<tr>
					<td colSpan="3">
						<hr />
					</td>
				</tr>
			)}
			{rows}
			{shouldRenderObject && (
				<React.Fragment>
					<tr>
						<td colSpan="3">
							<hr />
						</td>
					</tr>
					<tr className="object">
						<td colSpan="3">
							<object
								width="420"
								height="420"
								type={properties["http://schema.org/fileFormat"][0]["@value"]}
								data={objectData}
							/>
						</td>
					</tr>
				</React.Fragment>
			)}
		</table>
	)
}
