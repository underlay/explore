export default function fetchHash(hash) {
	const [root, id] = hash.split("#")
	const url = `https://gateway.underlay.store/ipfs/${root}`
	return fetch(url).then(res => res.text())
}
