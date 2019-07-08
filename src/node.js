import {
	RDF_TYPE,
	FONT_SIZE,
	FONT_FAMILY,
	LINE_HEIGHT,
	TAB,
	CHAR,
} from "./utils"

const prefixes = {
	schema: "#990000",
	rdf: "#005A9C",
	prov: "green",
	ipfs: "#6ACAD1",
}

const values = {
	"http://www.w3.org/2001/XMLSchema#string": "#0077AA",
	"http://www.w3.org/2001/XMLSchema#boolean": "#FF9900",
	"http://www.w3.org/2001/XMLSchema#integer": "#CA7841",
	"http://www.w3.org/2001/XMLSchema#double": "#CA7841",
	"http://www.w3.org/2001/XMLSchema#date": "#990055",
	"http://www.w3.org/2001/XMLSchema#dateTime": "#990055",
}

const STYLE = `<style>
text {
  fill: black;
}
.quote {
  fill: black;
  fill-opacity: 0.5;
  visibility: hidden;
}
.datatype {
  fill-opacity: 0.5;
}
.prefix[prefix="schema"] {
  fill: #990000;
}
.prefix[prefix="rdf"] {
  fill: #005A9C;
}
.prefix[prefix="prov"] {
  fill: green;
}
.prefix[prefix="ipfs"] {
  fill: #6acad1;
}
.value[type="http://www.w3.org/2001/XMLSchema#string"] {
  fill: #0077AA;
}
.value[type="http://www.w3.org/2001/XMLSchema#string"] .quote {
  visibility: visible;
}
.value[type="http://www.w3.org/2001/XMLSchema#boolean"] {
  fill: #FF9900;
}
.value[type="http://www.w3.org/2001/XMLSchema#integer"] {
  fill: #CA7841;
}
.value[type="http://www.w3.org/2001/XMLSchema#double"] {
  fill: #CA7841;
}
.value[type="http://www.w3.org/2001/XMLSchema#date"] {
  fill: #990055;
}
.value[type="http://www.w3.org/2001/XMLSchema#dateTime"] {
  fill: #990055;
}
</style>`

function compactStyle(term, compact, vocab) {
	const compacted = compact(term, vocab)
	if (compacted !== undefined && compacted !== term) {
		const index = compacted.indexOf(":")
		if (index > -1) {
			return [compacted.slice(0, index), compacted.slice(index)]
		} else {
			return ["", compacted]
		}
	} else {
		return ["", term]
	}
}

function renderTerm([prefix, suffix], x, y, className) {
	const classNames = className ? ` class="${className}"` : ""
	const tspan =
		prefix && `<tspan class="prefix" prefix="${prefix}">${prefix}</tspan>`
	return `<text${classNames} x="${x}" y="${y}">${tspan + suffix}</text>`
}

function renderLiteral(literal, type, x, y) {
	const quote = '<tspan class="quote">"</tspan>'
	const value = quote + literal.value + quote
	return `<text x="${x}" y="${y}" class="value" type="${type}">${value}</text>`
}

const getLength = ([prefix, suffix]) => prefix.length + suffix.length

export default function Node(id, types, literals, compact) {
	const literalKeys = Object.keys(literals)
	const compactKeys = literalKeys.map(key => compactStyle(key, compact, true))
	const compactRDFTypes = types.map(type => compactStyle(type, compact, true))
	const compactDataTypes = literalKeys.map(key =>
		literals[key].map(literal =>
			compactStyle(literal.datatype.id, compact, true)
		)
	)

	const name = compactStyle(id, compact, false)
	const type = compactStyle(RDF_TYPE, compact, true)

	const rdfTypes =
		compactRDFTypes.length &&
		Math.max.apply(null, compactRDFTypes.map(getLength))

	const properties = Math.max(
		types.length && getLength(type),
		literalKeys.length && Math.max.apply(null, compactKeys.map(getLength))
	)

	const propertiesOffset = 6 + (properties + TAB) * CHAR

	const dataTypes =
		literalKeys.length &&
		Math.max.apply(
			null,
			compactDataTypes.map(types => Math.max.apply(null, types.map(getLength)))
		)

	const dataValues =
		literalKeys.length &&
		Math.max.apply(
			null,
			literalKeys.flatMap(key =>
				literals[key].map(literal => 1 + literal.value.length + 1)
			)
		)

	const width =
		2 * 6 +
		CHAR *
			Math.max(
				TAB,
				getLength(name),
				properties + TAB + Math.max(rdfTypes, dataTypes + TAB + dataValues)
			)

	const lines = ["", STYLE, renderTerm(name, 6, 16)]
	let height = LINE_HEIGHT + 2

	if (types.length || literalKeys.length) {
		lines.push(
			`<line x1="6" y1="22" x2="${width -
				6}" y2="22" stroke="lightgrey" stroke-opacity="1"/>`
		)

		let top = 40

		if (types.length) {
			lines.push(renderTerm(type, 6, top))
			for (const index in compactRDFTypes) {
				lines.push(
					renderTerm(
						compactRDFTypes[index],
						propertiesOffset,
						top + LINE_HEIGHT * index
					)
				)
			}

			if (literalKeys.length) {
				const y = top + compactRDFTypes.length * LINE_HEIGHT - 12
				top = y + 16
				lines.push(
					`<line x1="${propertiesOffset}" y1="${y}" x2="${width -
						6}" y2="${y}" stroke="lightgrey" stroke-opacity="1"/>`
				)
			} else {
				top += LINE_HEIGHT * types.length
			}
		}

		const h = compactKeys.reduce((j, term, i) => {
			lines.push(renderTerm(term, 6, top + j * LINE_HEIGHT))
			for (const k in compactDataTypes[i]) {
				lines.push(
					renderTerm(
						compactDataTypes[i][k],
						propertiesOffset,
						top + (k + j) * LINE_HEIGHT,
						"datatype"
					)
				)
			}

			for (const k in literals[literalKeys[i]]) {
				const literal = literals[literalKeys[i]][k]
				lines.push(
					renderLiteral(
						literal,
						literal.datatype.id,
						propertiesOffset + (dataTypes + TAB) * CHAR,
						top + (k + j) * LINE_HEIGHT
					)
				)
			}

			return j + compactDataTypes[i].length
		}, 0)

		height = top + h * LINE_HEIGHT - 10
	}

	lines[0] = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" font-size="${FONT_SIZE}" font-family="${FONT_FAMILY}">`

	lines.push("</svg>")

	return [lines.join("\n"), width, height]
}
