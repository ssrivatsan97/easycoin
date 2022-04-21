// This file added in HW 3
import {isDeepStrictEqual} from 'util'
import {objectToId, isSmallerHex} from './utils'
import {CoinbaseObject, getObject, BlockObjectType, requestAndWaitForObject} from './objects'
import {validateTx, inputValue, outputValue} from './transactions'
import {UTXOType, addUTXOSet, getUTXOSet} from './utxo'

const BLOCK_REWARDS = 50000000000000
const BLOCK_TARGET = "00000002af000000000000000000000000000000000000000000000000000000"
const GENESIS_ID = "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e"

const TX_DOWNLOAD_TIMEOUT = 10000

// TODO: Avoid race condition in waiting for transactions.
// TODO: Update node on Vultr
// TODO: Recursively request and validate parent block

export async function validateBlock(block: BlockObjectType){
	if(block.T !== BLOCK_TARGET)
		throw "Invalid block: Incorrect target "+block.T
	if(! /[0-9a-f]{64}/.test(block.nonce))
		throw "Invalid block: Nonce is not a 256-bit hex string: "+block.nonce
	const blockid = objectToId(block)
	if(!isSmallerHex(blockid, BLOCK_TARGET))
		throw "Invalid block: Block hash does not match target: "+blockid
	// previd test may not be needed once we do chain validation where we look for the block with previd
	// if(! /[0-9a-f]{64}/.test(block.previd))
	// 	throw "Invalid block: previd is not a 256-bit hex string: "+block.previd
	if(!Number.isInteger(block.created) || block.created < 0)
		throw "Invalid block: Timestamp is not a non-negative integer"
	if(typeof block.miner!=="undefined" && ! /[ -~]{1,128}/.test(block.miner))
		throw "Invalid block: Only ASCII-printable strings up to 128 characters accepted in miner"
	if(typeof block.note!=="undefined" && ! /[ -~]{1,128}/.test(block.note))
		throw "Invalid block: Only ASCII-printable strings up to 128 characters accepted in note"
	
	let hasCoinbase = false
	let coinbase
	let input_sum = 0
	let output_sum = 0
	let newUtxoSet
	if (block.previd === null || block.previd === GENESIS_ID){
		newUtxoSet = []
	}
	else{
		try {
			newUtxoSet = await getUTXOSet(block.previd)
		} catch(error) {
			throw "Could not validate block: could not find prev block's UTXO set"
		}
	}
	// Check if transactions exist in the database, if not request them.
	let txs: any[] = []
	let promises: Promise<any>[] = []
	for(let i=0; i<block.txids.length; i++){
		// let tx
		try{
			txs[i] = await getObject(block.txids[i])
		} catch(error){
			console.log("Transaction "+i+" with id "+block.txids[i]+" not found in database. Requesting network...")
			promises.push(requestAndWaitForObject(block.txids[i], TX_DOWNLOAD_TIMEOUT)
				.then((value) => {
					txs[i] = value
				})
				.catch((error) => {
					throw "Invalid block: Transaction "+i+" with id "+block.txids[i]+" not found in network."
				})
			)
		}
	}
	try{
		await Promise.all(promises)
	} catch(error){
		throw error
	}


	for(let i=0; i<block.txids.length; i++){
		let tx = txs[i]
		if(CoinbaseObject.guard(tx)){
			if(i!==0)
				throw "Invalid block: Found coinbase transaction at index "+i+", expected coinbase only at index 0"
			hasCoinbase = true
			coinbase = tx
			newUtxoSet.push({txid:block.txids[i], index:0})
		}else{
			// Validate transaction by checking syntax and that outpoints exist and have sufficient value
			try{
				await validateTx(tx)
			} catch(error){
				throw "Invalid block: Transaction "+i+" is not valid: "+error
			}
			// Check that coinbase is not spent in any transaction
			// Validate transaction as per utxo state
			for(let j=0; j<tx.inputs.length; j++){
				if(tx.inputs[j].outpoint.txid===objectToId(coinbase)){
					throw "Invalid block: Coinbase is spent in transaction "+i+" input "+j+" in the same block"
				}
				let utxo = {txid:tx.inputs[j].outpoint.txid, index:tx.inputs[j].outpoint.index}
				if(!newUtxoSet.some((item) => isDeepStrictEqual(item, utxo))){
					throw "Invalid block: Input "+j+" of transaction "+i+" does not match an unspent output"
				}
				newUtxoSet = newUtxoSet.filter((item) => !isDeepStrictEqual(item, utxo))
			}
			// Add outputs to new UTXO set
			for(let j=0; j<tx.outputs.length; j++){
				newUtxoSet.push({txid:block.txids[i], index:j})
			}
			try{
				input_sum += await inputValue(tx)
				output_sum += outputValue(tx)
			} catch(error){
				throw "Error occurred while counting inputs and outputs of transaction "+i+": "+error
			}
		}
	}
	// Check value of coinbase output
	if(hasCoinbase && coinbase.outputs[0].value > input_sum-output_sum+BLOCK_REWARDS)
		throw "Invalid block: Coinbase earns "+coinbase.outputs[0].value+", expected "+BLOCK_REWARDS+" + "+input_sum+" - "+output_sum+" = "+(input_sum-output_sum+BLOCK_REWARDS)

	// If you reach here, it means the block is valid. So add an entry to the UTXO set.
	await addUTXOSet(blockid, newUtxoSet)
}