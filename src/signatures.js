import jsonld from "jsonld"
import { fromB58String, validate } from "multihashes"

const type = "https://w3id.org/security#LinkedDataSignature2016"
const creator = "http://purl.org/dc/terms/creator"
const created = "http://purl.org/dc/terms/created"
const signatureValue = "https://w3id.org/security#signatureValue"

const base58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/

export const canon = {
	algorithm: "URDNA2015",
	format: "application/n-quads",
}

const prefix = "dweb:/ipns/"
function makeCreator(id) {
	return prefix + id
}

function flattenValue(value) {
	if (typeof value === "object") {
		if (value["@id"]) return value["@id"]
		else if (value["@value"]) return value["@value"]
	} else if (typeof value === "string") return value
	return null
}

function flattenValues(values) {
	if (Array.isArray(values)) return values.map(flattenValue)
	else return flattenValue(values)
}

function testCreator(node) {
	const [string] = flattenValues(node[creator])
	if (string.indexOf(prefix) !== 0) return null
	const id = string.slice(prefix.length)
	if (!base58.test(id)) return null
	try {
		const mh = fromB58String(id)
		validate(mh)
		return id
	} catch (e) {
		console.error(e)
		return null
	}
}

export async function sign(document, ipfs) {
	const context = document["@context"] || {}
	const flattened = await jsonld.flatten(document, context)
	const canonized = await jsonld.canonize(flattened, canon)
	const bytes = ipfs.types.Buffer.from(canonized)
	const { id } = await ipfs.id()
	const { privKey } = ipfs._peerInfo.id
	return new Promise((resolve, reject) =>
		privKey.sign(bytes, (err, sig) => {
			if (err) return reject(err)
			const dateTime = new Date().toISOString()
			const signature = {
				"@id": "#signature",
				"@type": type,
				[creator]: { "@id": makeCreator(id) },
				[created]: {
					"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
					"@value": dateTime,
				},
				[signatureValue]: sig.toString("base64"),
			}
			jsonld
				.compact(signature, context)
				.catch(reject)
				.then(({ "@context": _, ...node }) =>
					resolve({
						"@context": context,
						"@graph": [node, ...flattened["@graph"]],
					})
				)
		})
	)
}

export function testType(node) {
	const values = flattenValues(node["@type"])
	return Array.isArray(values) && values.includes(type)
}

export async function verifySignature(bytes, signature, ipfs) {
	const id = testCreator(signature)
	const [value] = flattenValues(signature[signatureValue])
	const sig = ipfs.types.Buffer.from(value, "base64")
	if (id === null) return false
	const { cid, data } = await ipfs.block.get(id)
	console.assert(id === cid.toBaseEncodedString())
	const key = ipfs.util.crypto.keys.unmarshalPublicKey(data)
	return new Promise((resolve, reject) => {
		key.verify(bytes, sig, (err, res) => {
			if (err) reject(err)
			else resolve(res && id)
		})
	})
}

export async function verify(flattened, ipfs) {
	const signatures = flattened.filter(testType)
	if (signatures.length === 0) return null
	const content = graph.filter(node => !testType(node))
	const canonized = await jsonld.canonize(content, canon)
	const bytes = ipfs.types.Buffer.from(canonized)
	const valid = await Promise.all(
		signatures.map(signature => verifySignature(bytes, signature, ipfs))
	)
	return valid.every(id => !!id)
}

export function getSignatures(flattened) {
	return flattened.filter(testType)
}

export function getNonSignatures(flattened) {
	return flattened.filter(node => !testType(node))
}

export function splitNodes(flattened) {
	const signatures = flattened.filter(testType)
	const nodes = graph.filter(node => !testType(node))
	return { signatures, nodes }
}

export function hasSignature(graph) {
	const signatures = getSignatures(graph)
	return signatures.length > 0
}
