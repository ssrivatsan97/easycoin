// This file is added in HW 2
import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template } from 'runtypes';
import * as network from './network'
import * as message from './message'
import {Peer} from './peer'
import level from 'level-ts'
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
			// let opoint: any;
			// Check that outpoint's txid is available in database.
			// TODO: Fallback if this object is not available
			let opoint: any;
			try{
				opoint = await getObject(input.outpoint.txid)
			} catch(error){
				throw "Invalid transaction: Outpoint "+i+" not found in database";
			}
			// Check that outpoint's txid indeed points to a transaction.
			// Later, also check that it is a transaction in the past chain!
			if (!TxObject.guard(opoint))
				throw "Invalid transaction: Outpoint "+i+" is not a transaction!";
			// Check that outpoint's index is present in the transaction pointed by txid
			if (opoint.outputs.length <= input.outpoint.index)
				throw "Invalid transaction: Invalid index in outpoint "+i;
			// Verify signature on transaction
			if (!(await ed.verify(input.sig, txnullhex, opoint.outputs[i].pubkey)))
				throw "Invalid transaction: Invalid signature in outpoint "+i;
			sumInputValues += opoint.outputs[i].value;
		}
		let sumOutputValues = 0;
		for(let i=0; i<tx.outputs.length; i++){
			if (! /[0-9a-f]{64}/.test(tx.outputs[i].pubkey))
				throw "Invalid transaction: Output "+i+" has invalid public key";
			sumOutputValues += tx.outputs[i].value;
		}
		if (sumInputValues <= sumOutputValues)
			throw "Invalid transaction: Output value > sum of input values"
	} else if(CoinbaseObject.guard(tx)){
		// TODO: Insert any additional logic here
		for(let i=0; i<tx.outputs.length; i++){
			if (! /[0-9a-f]{64}/.test(tx.outputs[i].pubkey))
				throw "Invalid transaction: Output "+i+" has invalid public key";
		}
	}else {
		throw "Invalid transaction: Doesn't match transaction type"
	}

}

// {"type": "transaction", "height":0, "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 50000000000}]}
// with hash = "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3"
// {"object":{"type": "transaction", "height":0, "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 50000000000}]},"type":"object"}
// {"type": "transaction", "inputs": [{"outpoint": {"txid": "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3", "index": 0}, "sig": "aed4d1f13933e195f68add86915c099366f7d198602afb13551df5575dc57013b83d84f70b310e28c72b0c143d8fab6ce2fc38a7f88d466d1ccc88a4b2970809"}], "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 10}]}
// {"object":{"type": "transaction", "inputs": [{"outpoint": {"txid": "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3", "index": 0}, "sig": "aed4d1f13933e195f68add86915c099366f7d198602afb13551df5575dc57013b83d84f70b310e28c72b0c143d8fab6ce2fc38a7f88d466d1ccc88a4b2970809"}], "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 10}]},"type":"object"}