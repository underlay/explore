const remoteURL = "https://gateway.underlay.store"
const localURL = "http://localhost:8080"

const origin = window.location.hostname === "localhost" ? localURL : remoteURL

export default function fetchHash(hash) {
	const [root, ...rest] = hash.split("#")
	const url = `${origin}/ipfs/${root}`
	return fetch(url).then(res => res.text())
}
