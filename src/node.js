import {
	RDF_TYPE,
	RDF_LANG_STRING,
	FONT_SIZE,
	FONT_FAMILY,
	LINE_HEIGHT,
	XSD_STRING,
	XSD_BOOLEAN,
	XSD_INTEGER,
	XSD_DOUBLE,
	XSD_DATE,
	XSD_DATETIME,
	TAB,
	CHAR,
} from "./utils"

const prefixFills = {
	schema: "#990000",
	rdf: "#005A9C",
	prov: "green",
	ipfs: "#6ACAD1",
}

const valueClasses = {
	[XSD_STRING]: "s",
	[XSD_BOOLEAN]: "b",
	[XSD_INTEGER]: "n",
	[XSD_DOUBLE]: "n",
	[XSD_DATE]: "d",
	[XSD_DATETIME]: "d",
}

const STYLE = `<style>
text { fill: black }
.q {
  fill: black;
  fill-opacity: 0.5;
}
.t { fill-opacity: 0.5 }
.s { fill: #0077AA }
.b { fill: #FF9900 }
.n { fill: #CA7841 }
.d { fill: #990055 }
</style>`

const maxWidth = 96
const wrapWidth = 84

const quote = '<tspan class="q">"</tspan>'

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
	const text = className ? `text class="${className}"` : "text"
	if (suffix === "") {
		return `<${text} x="${x}" y="${y}">@${prefix}</text>`
	} else if (prefix === "") {
		if (suffix[0] === "_" && suffix[1] === ":") {
			const label = suffix.slice(2)
			return `<${text} x="${x}" y="${y}"><tspan class="q">_:</tspan>${label}</text>`
		} else if (suffix.indexOf(":") >= 0) {
			return `<${text} x="${x}" y="${y}">${suffix}</text>`
		} else {
			return `<${text} x="${x}" y="${y}">${suffix}</text>`
		}
	} else if (prefixFills.hasOwnProperty(prefix)) {
		return `<${text} x="${x}" y="${y}"><tspan fill="${prefixFills[prefix]}">${prefix}</tspan>${suffix}</text>`
	} else {
		return `<${text} x="${x}" y="${y}"><tspan>${prefix}</tspan>${suffix}</text>`
	}
}

function renderLiteral({ value, datatype: { id }, language }, x, y) {
	// Sometimes this happens??
	if (id && id[0] === "<" && id[id.length - 1] === ">") {
		id = id.slice(1, -1)
	}

	if (id === RDF_LANG_STRING && false) {
	} else if (valueClasses.hasOwnProperty(id)) {
		// Adjust for quotes (not rendered on non-string primitives)
		const adjustedValue = id === XSD_STRING ? quote + value + quote : value
		const adjustedX = id === XSD_STRING ? x : x + CHAR
		return `<text x="${adjustedX}" y="${y}" class="s">${adjustedValue}</text>`
	} else {
		return `<text x="${x}" y="${y}">${quote + value + quote}</text>`
	}
}

const getLength = ([prefix, suffix]) => prefix.length + suffix.length

export default function Node(id, types, literals, compact) {
	const literalKeys = Object.keys(literals)
	const compactKeys = literalKeys.map(key => compactStyle(key, compact, true))
	const compactRDFTypes = types.map(type => compactStyle(type, compact, true))
	const compactDataTypes = literalKeys.map(key =>
		literals[key].map(literal => {
			if (literal.datatype.id === RDF_LANG_STRING) {
				return [literal.language, ""]
			} else {
				return compactStyle(literal.datatype.id, compact, true)
			}
		})
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
			for (let i = 0; i < compactRDFTypes.length; i++) {
				lines.push(
					renderTerm(
						compactRDFTypes[i],
						propertiesOffset,
						top + LINE_HEIGHT * i
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
			for (let k = 0; k < compactDataTypes[i].length; k++) {
				lines.push(
					renderTerm(
						compactDataTypes[i][k],
						propertiesOffset,
						top + (k + j) * LINE_HEIGHT,
						"t"
					)
				)
			}
			for (let k = 0; k < literals[literalKeys[i]].length; k++) {
				const literal = literals[literalKeys[i]][k]
				lines.push(
					renderLiteral(
						literal,
						propertiesOffset + (dataTypes + TAB) * CHAR,
						top + (k + j) * LINE_HEIGHT
					)
				)
			}

			return j + compactDataTypes[i].length
		}, 0)

		height = top + h * LINE_HEIGHT - 10
	}

	if (height === LINE_HEIGHT + 2) {
		height += 2
	}

	lines[0] = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" font-size="${FONT_SIZE}" font-family="${FONT_FAMILY}">`

	lines.push("</svg>")

	return [lines.join("\n"), width, height]
}
