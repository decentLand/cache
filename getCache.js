const arweave = Arweave.init({})

async function getCacheData() {
	const archiver_addr = "rB86LBc5uSm68ZGh5v2sdiM-8r4uFOZ35VZwBvnesqo"
	const last_tx = await arweave.wallets.getLastTransactionID(archiver_addr)

	const last_cache_data = await arweave.transactions.getData(last_tx, {decode: true, string: true});

	const cache_object = JSON.parse(last_cache_data);
	const cache = new Map( Object.entries(cache_object) );


	const hash = window.location.hash.substring(1);
	if (hash) {
		if ( cache.has(hash) ) {
			const data =  cache.get(hash)
			return await arweave.transactions.getData(data, {decode: true, string: true})
		}
	} else {
		const data =  cache.get("null");
		return await arweave.transactions.getData(data, {decode: true, string: true})
	}

	
};

getCacheData()
