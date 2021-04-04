const arweave = Arweave.init({})

async function getCacheData() {
	const archiver_addr = "the public address of the wallet you are using to cache the data"
//   get the last cache data JSON object
	const last_tx = await arweave.wallets.getLastTransactionID(archiver_addr)

	const last_cache_data = await arweave.transactions.getData(last_tx, {decode: true, string: true});
	const cache_object = JSON.parse(last_cache_data);
	const cache = new Map( Object.entries(cache_object) );

	return cache

	
};

getCacheData()
