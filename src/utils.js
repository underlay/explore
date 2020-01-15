export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
export const RDF_LANG_STRING =
	"http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"

export const XSD_STRING = "http://www.w3.org/2001/XMLSchema#string"
export const XSD_BOOLEAN = "http://www.w3.org/2001/XMLSchema#boolean"
export const XSD_INTEGER = "http://www.w3.org/2001/XMLSchema#integer"
export const XSD_DOUBLE = "http://www.w3.org/2001/XMLSchema#double"
export const XSD_DATE = "http://www.w3.org/2001/XMLSchema#date"
export const XSD_DATETIME = "http://www.w3.org/2001/XMLSchema#dateTime"

export const FONT_SIZE = 12
export const TAB = 2
export const CHAR = 7.2
export const LINE_HEIGHT = 18
export const FONT_FAMILY = "Monaco, monospace"

export const encode = s => Buffer.from(s).toString("hex")
export const decode = s => Buffer.from(s, "hex").toString("utf8")

export const base58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{49}$/
export const base32 = /^[a-z2-7]{59}$/
export const fragment = /^_:c14n\d+$/
window.encode = encode
