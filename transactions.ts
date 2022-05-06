// This file is added in HW 2
import * as network from './network'
import * as message from './message'
import {Peer} from './peer'
import {nullSignatures} from './utils'
import {GeneralTxObject, CoinbaseObject, TxObject, getObject} from './objects'
import {GeneralTxObjectType, CoinbaseObjectType, TxObjectType} from './objects'
const canonicalize = require('canonicalize')
import * as ed from '@noble/ed25519'

export async function validateTx(tx: TxObjectType){
	if(GeneralTxObject.guard(tx)){
		const txnullhex = Buffer.from(nullSignatures(tx)).toString('hex');
		let sumInputValues = 0;
		for(let i=0; i<tx.inputs.length; i++){
			let input = tx.inputs[i];
			let opoint: TxObjectType;
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
				throw "Invalid transaction: Invalid index in outpoint "+i+". Found "+input.outpoint.index+" but expected integer between 0 and "+opoint.outputs.length;
			// Check that the transaction doesn't have duplicate outpoints
			for (let j=0; j<i; j++){
				if (input.outpoint.txid === tx.inputs[j].outpoint.txid && input.outpoint.index === tx.inputs[j].outpoint.index)
					throw "Invalid transaction: Outpoints "+i+" and "+j+" are identical."
			}
			// Verify signature on transaction
			let signValid = false
			try{
				signValid = await ed.verify(input.sig, txnullhex, opoint.outputs[input.outpoint.index].pubkey)
			} catch(error){
				throw "Invalid transaction: Could not validate signature in outpoint "+i+": "+error
			}
			if (!signValid)
				throw "Invalid transaction: Invalid signature in outpoint "+i
			sumInputValues += opoint.outputs[input.outpoint.index].value;
		}
		let sumOutputValues = 0;
		for(let i=0; i<tx.outputs.length; i++){
			if (!Number.isInteger(tx.outputs[i].value) || tx.outputs[i].value < 0)
				throw "Invalid transaction: Value"+tx.outputs[i].value+" of output "+i+" is not non-negative integer"
			if (! /[0-9a-f]{64}/.test(tx.outputs[i].pubkey))
				throw "Invalid transaction: Output "+i+" has invalid public key";
			sumOutputValues += tx.outputs[i].value;
		}
		if (sumInputValues < sumOutputValues)
			throw "Invalid transaction: Output value "+sumOutputValues+" > sum of input values "+sumInputValues
	} else if(CoinbaseObject.guard(tx)){
		if (!Number.isInteger(tx.height) || tx.height < 0)
			throw "Invalid coinbase transaction: Height "+tx.height+" is not non-negative integer"
		if (tx.outputs.length!==1)
			throw "Invalid coinbase transaction: Contains "+tx.outputs.length+" outputs, expected only 1"
		if (! /[0-9a-f]{64}/.test(tx.outputs[0].pubkey))
			throw "Invalid coinbase transaction: Output has invalid public key";
	} else{
		throw "Invalid transaction: Doesn't match transaction type"
	}

}

// IMPORTANT: Validate the transaction before passing it to this function!
export async function inputValue(tx: GeneralTxObjectType){
	let sumInputValues = 0;
	for(let i=0; i<tx.inputs.length; i++){
		let input = tx.inputs[i];
		let opoint = await getObject(input.outpoint.txid)
		sumInputValues += opoint.outputs[input.outpoint.index].value
	}
	return sumInputValues
}

// IMPORTANT: Validate the transaction before passing it to this function!
export function outputValue(tx: TxObjectType){
	let sumOutputValues = 0;
	for(let i=0; i<tx.outputs.length; i++){
		sumOutputValues += tx.outputs[i].value;
	}
	return sumOutputValues
}
