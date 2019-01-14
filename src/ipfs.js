import IPFS from "ipfs-http-client"

const ipfs = IPFS("localhost", "5001", { protocol: "http" })

export default ipfs
