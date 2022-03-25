// This file is added in HW 2
import * as network from './network'
import * as message from './message'
import {Peer} from './peer'
import {nullSignatures} from './utils'
import {GeneralTxObject, CoinbaseObject, TxObject, getObject} from './objects'
const canonicalize = require('canonicalize')
import * as ed from '@noble/ed25519'

export async function validateTx(tx: any){
	if(GeneralTxObject.guard(tx)){
		const txnullhex = Buffer.from(nullSignatures(tx)).toString('hex');
		let sumInputValues = 0;
		for(let i=0; i<tx.inputs.length; i++){
			let input = tx.inputs[i];
			let opoint: any;
			// Check that outpoint's txid is available in database.
			try{
				opoint = await getObject(input.outpoint.txid)
			} catch(error){
				throw "Invalid transaction: Outpoint "+i+" not found in database";
			}
			// Check that outpoint's txid indeed points to a transaction.
			if (!TxObject.guard(opoint))
				throw "Invalid transaction: Outpoint "+i+" is not a transaction!";
			// Check that outpoint's index is present in the transaction pointed by txid
			if (!Number.isInteger(input.outpoint.index) || input.outpoint.index < 0 || input.outpoint.index >= opoint.outputs.length)
				throw "Invalid transaction: Invalid index in outpoint "+i+". Found "+input.outpoint.index+" but there are only "+opoint.outputs.length+" outputs.";
			// Verify signature on transaction
			if (!(await ed.verify(input.sig, txnullhex, opoint.outputs[i].pubkey)))
				throw "Invalid transaction: Invalid signature in outpoint "+i;
			sumInputValues += opoint.outputs[i].value;
		}
		let sumOutputValues = 0;
		for(let i=0; i<tx.outputs.length; i++){
			if (!Number.isInteger(tx.outputs[i].value) || tx.outputs[i].value < 0)
				throw "Invalid transaction: Output "+i+" has negative value"
			if (! /[0-9a-f]{64}/.test(tx.outputs[i].pubkey))
				throw "Invalid transaction: Output "+i+" has invalid public key";
			sumOutputValues += tx.outputs[i].value;
		}
		if (sumInputValues <= sumOutputValues)
			throw "Invalid transaction: Output value > sum of input values"
	} else if(CoinbaseObject.guard(tx)){
		// TODO: Insert additional logic here later
		if (!Number.isInteger(tx.height) || tx.height < 0)
			throw "Invalid transaction: Coinbase height is not non-negative integer"
		for(let i=0; i<tx.outputs.length; i++){
			if (! /[0-9a-f]{64}/.test(tx.outputs[i].pubkey))
				throw "Invalid transaction: Output "+i+" has invalid public key";
		}
	} else{
		throw "Invalid transaction: Doesn't match transaction type"
	}

}

// Demo valid tx with height in coinbase:
// {"height":0,"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":50000000000}],"type":"transaction"}
// {"object":{"height":0,"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":50000000000}],"type":"transaction"},"type":"object"}
// {"inputs":[{"outpoint":{"index":0,"txid":"47ccdf2be98e95e4ce96a4d1561003d01b1d28ddbb3801129e27c1d1d6fcd3f2"},"sig":"a85177419191c702a308b26ce67856e8ea5b80265e683033685225c61ed2b19645662ca9494e8e1b95b20cfd3f41345b31a77fc2943b2c40f6c9778de8e98905"}],"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":10}],"type":"transaction"}
// {"object":{"inputs":[{"outpoint":{"index":0,"txid":"47ccdf2be98e95e4ce96a4d1561003d01b1d28ddbb3801129e27c1d1d6fcd3f2"},"sig":"a85177419191c702a308b26ce67856e8ea5b80265e683033685225c61ed2b19645662ca9494e8e1b95b20cfd3f41345b31a77fc2943b2c40f6c9778de8e98905"}],"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":10}],"type":"transaction"},"type":"object"}

// {"type": "transaction", "height":0, "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 50000000000}]}
// with hash = "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3"
// {"object":{"type": "transaction", "height":0, "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 50000000000}]},"type":"object"}
// {"type": "transaction", "inputs": [{"outpoint": {"txid": "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3", "index": 0}, "sig": "aed4d1f13933e195f68add86915c099366f7d198602afb13551df5575dc57013b83d84f70b310e28c72b0c143d8fab6ce2fc38a7f88d466d1ccc88a4b2970809"}], "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 10}]}
// {"object":{"type": "transaction", "inputs": [{"outpoint": {"txid": "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3", "index": 0}, "sig": "aed4d1f13933e195f68add86915c099366f7d198602afb13551df5575dc57013b83d84f70b310e28c72b0c143d8fab6ce2fc38a7f88d466d1ccc88a4b2970809"}], "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 10}]},"type":"object"}