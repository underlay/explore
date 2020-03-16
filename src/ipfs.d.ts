type buffer = Buffer

declare module "ipfs-http-client" {
	export type Buffer = buffer

	export default function NewIpfsClient(options: {
		host: string
		port: string
		protocol: string
	}): IPFS

	interface IPFS {
		cat(cid: string): Iterable<Promise<Buffer>>
	}
}
