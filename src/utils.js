export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"

export const encode = s => Buffer.from(s).toString("hex")

export const base58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{46}$/

window.encode = encode
