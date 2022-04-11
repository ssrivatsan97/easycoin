// This file added in HW 3
import {objectToId, hexToNumber} from './utils'
import {CoinbaseObject, getObject, BlockObjectType} from './objects'
import {validateTx, inputValue, outputValue} from './transactions'

const BLOCK_REWARDS = 50000000000000
const BLOCK_TARGET = "00000002af000000000000000000000000000000000000000000000000000000"

// TODO: Testing!!

export async function validateBlock(block: BlockObjectType){
	if(block.T !== BLOCK_TARGET)
		throw "Invalid block: Incorrect target "+block.T
	if(! /[0-9a-f]{64}/.test(block.nonce))
		throw "Invalid block: Nonce is not a 256-bit hex string: "+block.nonce
	const blockid = objectToId(block)
	if(hexToNumber(blockid) >= hexToNumber(BLOCK_TARGET))
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
	for(let i=0; i<block.txids.length; i++){
		// Mark tx as invalid if it is not found in database.
		let tx
		try{
			tx = await getObject(block.txids[i])
		} catch(error){
			throw "Invalid block: Transaction "+i+" with id "+block.txids[i]+" not found in database"
		}
		if(CoinbaseObject.guard(tx)){
			if(i!==0)
				throw "Invalid block: Found coinbase transaction at index "+i+", expected coinbase only at index 0"
			hasCoinbase = true
			coinbase = tx
		}else{
			// Validate transaction by checking syntax and that outpoints exist and have sufficient value
			try{
				await validateTx(tx)
			} catch(error){
				throw "Invalid block: Transaction "+i+" is not valid: "+error
			}
			// TODO later: Validate transaction with respect to utxo, i.e. check double spending of utxos
			// Check that coinbase is not spent in any transaction
			for(let j=0; j<tx.inputs.length; j++){
				if(tx.inputs[j].outpoint.txid===objectToId(coinbase))
					throw "Invalid block: Coinbase is spent in transaction "+i+" input "+j+" in the same block"
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
}