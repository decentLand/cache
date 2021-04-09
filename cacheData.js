const arweave = Arweave.init({
    host: "arweave.net",
    protocol: "https"

});
const readState = smartweave.readContract

// cacher_key is the JWK stringified object of the wallet 
// used to cache each Tribus (low-level)
const cacher_key = ``

// posting_key is the JWK stringified object of the wallet
// used to cache the set of cacher_key results
const posting_key = ``
const cacher_jwk = JSON.parse(cacher_key);
const posting_jwk = JSON.parse(posting_key);


async function cacheAll() {

 	const cache_obj = {}
	const tribuses_id_arr = ["null"];
	const tribuses_object = await getTribusesObjects();

	for (single_tribuses_obj of Object.values(tribuses_object)) {
		tribuses_id_arr.push( (Object.values(single_tribuses_obj))[0]["tribus_id"] )
	};

	for (tribus_id of tribuses_id_arr) {
		console.log(`caching ${tribus_id}`)
		const tribus_posts_object = await cache(tribus_id)

		const tx = await postCacheData(tribus_posts_object, tribus_id)
		cache_obj[tribus_id] = tx.id
	}

	let transaction_B = await arweave.createTransaction({
		data: JSON.stringify(cache_obj)
	}, posting_jwk);

	transaction_B.addTag("Content-Type", "application/json");
	transaction_B.addTag("unix-epoch", Date.now());

	await arweave.transactions.sign(transaction_B, posting_jwk)
	await arweave.transactions.post(transaction_B)

	console.log(`cached object tx.id: ${transaction_B.id}`)

};

async function postCacheData(data_obj, tribus_id) {

	const json = JSON.stringify(data_obj);

	let transaction = await arweave.createTransaction({
		data: json
	}, cacher_jwk);

	transaction.addTag("Content-Type", "application/json");
	transaction.addTag("cashing", tribus_id);
	transaction.addTag("unix-epoch", Date.now());

	await arweave.transactions.sign(transaction, cacher_jwk);
	await arweave.transactions.post(transaction);
	console.log(`TXID ${transaction.id}`);
	return transaction
	
};




 async function cache(tribus_id) {

    
    const postsTxList = await tribusPostsOf(tribus_id);
    const posts_map = new Map();
    const posts_obj = {};

    for (post of postsTxList) {

        const post_body = {};

        const post_text = await arweave.transactions.getData(post, {decode: true, string: true});

        post_body["text"] = post_text

        const post_obj = await arweave.transactions.get(post);
        const tags_list = await post_obj.get("tags");

        for (tag_pair of tags_list) {
            const key = tag_pair.get("name", {decode: true, string: true});
            const value = tag_pair.get("value", {decode: true, string: true});

            if (key == "username" || key == "user-id" || key == "pfp" ||
               key == "tribus-name" || key == "tribus-id" || key == "unix-epoch") {
                post_body[key] = value;
            };
        };

        if (post_body["tribus-id"] != "null"){

        	const user_id = post_body["user-id"];
        	const tribus_id = post_body["tribus-id"]

        	if( !await isHolder(user_id, tribus_id, await getTribusPostsVisibility(tribus_id))){
        		post_body["text"] = `the user/community has decided to hide this post`;


        	}
        }
            	

        Object.defineProperty(posts_obj, post, {
            value: post_body,
            enumerable: true,
            configurable: true,
            writeable: false
        } )
    }

    return posts_obj
};

async function tribusPostsOf(tribus_id) {

    let name = null;
    let app = null;

    if (tribus_id === "null") {

        name = "public-square";
        app = "PublicSquare";

        const queryObject = {
      query: 
        `query {
  transactions(
    tags: [
        { name: "Content-Type", values: "text/plain" },
        { name: "App-Name", values: "${app}"},
        { name: "tribus-id", values: "${tribus_id}"},
        { name: "tribus-name", values: "${name}"},
        { name: "Type", values: "post"}
      
        ]

    first: 1000000

  ) {
    edges {
      node {
        id
      }
    }
  }
}
`,
    };

    const response = await fetch("https://arweave.net/graphql", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryObject),
    });

    const json = await response.json();
    const data_arr = [];

    const res_arr = json["data"]["transactions"]["edges"];

    for (element of res_arr) {
        const tx_obj = Object.values(element);
        const tx_id = (Object.values(tx_obj[0]));
        data_arr.push(tx_id[0])
    }

    return data_arr


    } else {

        const tribusesTxs = await getTribuses()

        if ( await isValidcXYZContract(tribus_id) ) {


            const valid_tribus_tx = await getValidTxOf(tribus_id);

            // return an empty array if the tribus has been created by a
            // different owner of the cXYZ PSC OR even not created yet
            if (! valid_tribus_tx) {
                return []
            };

            const valid_tribus_tx_obj = await arweave.transactions.get(valid_tribus_tx);


            const tags_list = await valid_tribus_tx_obj.get("tags");

            for (tag_pair of tags_list) {

                const key = tag_pair.get("name", {decode: true, string: true});
                const value = tag_pair.get("value", {decode: true, string: true});

                if (key == "tribus-name") {
                    name = value
                    app = "decent.land"
                };
            };

            const queryObject = {
      query: 
        `query {
  transactions(
    tags: [
        { name: "Content-Type", values: "text/plain" },
        { name: "App-Name", values: "${app}"},
        { name: "tribus-id", values: "${tribus_id}"},
        { name: "tribus-name", values: "${name}"},
        { name: "action", values: "post"}
      
        ]

    first: 1000000

  ) {
    edges {
      node {
        id
      }
    }
  }
}
`,
    };

    const response = await fetch("https://arweave.net/graphql", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryObject),
    });

    const json = await response.json();
    const data_arr = [];

    const res_arr = json["data"]["transactions"]["edges"];

    for (element of res_arr) {
        const tx_obj = Object.values(element);
        const tx_id = (Object.values(tx_obj[0]));
        data_arr.push(tx_id[0])
    }

    return data_arr

        }

    }

};

async function getTribuses(){

    const queryObject = {
      query: 
        `query {
  transactions(
    tags: [
        { name: "Content-Type", values: "application/json" },
        { name: "App-Name", values: "decent.land"},
        { name: "action", values: "createTribus"},
        { name: "version", values: "mainnet"}
      
        ]

    first: 1000000

  ) {
    edges {
      node {
        id
      }
    }
  }
}
`,
    };

    const response = await fetch("https://arweave.net/graphql", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryObject),
    });

    const json = await response.json();
   
    const data_arr = [];

    const res_arr = json["data"]["transactions"]["edges"];

    for (element of res_arr) {
        const tx_obj = Object.values(element);
        const tx_id = (Object.values(tx_obj[0]));
        data_arr.push(tx_id[0])
    }

    return data_arr
};


async function isValidcXYZContract(contract_id){
    const contract_tx = await arweave.transactions.get(contract_id);
    const tags_list = await contract_tx.get("tags");

    for (tag_pair of tags_list) {
        const key = tag_pair.get("name", {decode: true, string: true});
        const value = tag_pair.get("value", {decode: true, string: true});

        if (key == "Contract-Src" && value == "ngMml4jmlxu0umpiQCsHgPX2pb_Yz6YDB8f7G6j-tpI") {
            return true
        }

    }

    return false

};

async function getValidTxOf(tribus_id) {
    const psc_creation_tx = await arweave.transactions.get(tribus_id);
    const psc_owner = psc_creation_tx["owner"];

    const tribusesObject = await getTribusesObjects();

    for (t_obj of tribusesObject) {

        const t_obj_creation_tx = Object.keys(t_obj)[0];
        
        const t_obj_creation_tx_ar_object = 
            await arweave.transactions.get(t_obj_creation_tx);

        const t_obj_creation_tx_owner = t_obj_creation_tx_ar_object["owner"]

        if (t_obj_creation_tx_owner == psc_owner) {
            return t_obj_creation_tx
        };
    }

    return null
    
};

async function getTribusesObjects() {
    const tribuses_objects_arrays = [];
    const tribusesTxs = await getTribuses();

    for (tribus_tx of tribusesTxs) {
        const tribus_holder = {};
        const tx_data = await arweave.transactions.getData(tribus_tx, {decode: true, string: true});
        const value = JSON.parse(tx_data)

        tribus_holder[String(tribus_tx)] = value
  
        tribuses_objects_arrays.push(tribus_holder)

    };

    return tribuses_objects_arrays
};



async function isHolder(address, t_id, visibility) { 

    const data = await readState(arweave, t_id);

    return data["balances"][address] >= visibility
};

async function getTribusPostsVisibility(t_id) {
	const tribuses_object = await getTribusesObjects()

	for (single_tribuses_obj of Object.values(tribuses_object)) {
		const tribus_data_obj =  Object.values(single_tribuses_obj)[0]

		if(tribus_data_obj["tribus_id"] == t_id){
			return tribus_data_obj["post_visibility"]
		}
	};

}


cacheAll()
