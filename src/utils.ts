export const XSD = {
	STRING: "http://www.w3.org/2001/XMLSchema#string",
	BOOLEAN: "http://www.w3.org/2001/XMLSchema#boolean",
	INTEGER: "http://www.w3.org/2001/XMLSchema#integer",
	DOUBLE: "http://www.w3.org/2001/XMLSchema#double",
	DATE: "http://www.w3.org/2001/XMLSchema#date",
	DATETIME: "http://www.w3.org/2001/XMLSchema#dateTime",
}

export const RDF = {
	TYPE: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
	LANG_STRING: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
}

export const FONT_SIZE = 12
export const TAB = 2
export const CHAR = 7.2
export const LINE_HEIGHT = 18
export const FONT_FAMILY = "Monaco, monospace"

export const encode = (s: string) => Buffer.from(s).toString("hex")
export const decode = (s: string) => Buffer.from(s, "hex").toString("utf8")

export const base32 = /^[a-z2-7]{59}$/
export const fragment = /^_:c14n(\d+)$/
