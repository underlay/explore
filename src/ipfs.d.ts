declare module "ipfs-http-client" {
	export = NewIpfsClient

	function NewIpfsClient(options: {
		host: string
		port: string
		protocol: string
	}): IPFS

	interface IPFS {
		cat(cid: string): { next(): Promise<{ value: Buffer; done: boolean }> }
	}
}
