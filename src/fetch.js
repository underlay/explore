const remoteURL = "https://gateway.underlay.store"
const localURL = "http://localhost:8080"

const origin = window.location.hostname === "localhost" ? localURL : remoteURL

export default function fetchHash(path) {
	const [root, ...rest] = path.split("#")
	return fetch(origin + root).then(res => res.text())
}
