// This file added in HW 3
import { Boolean, Number as RNumber, String, Literal, Array, Tuple, Record, Union, Static, Template, Partial, Null } from 'runtypes';
import level from 'level-ts'
import {isDeepStrictEqual} from 'util'
import {objectToId, isSmallerHex} from './utils'
import {CoinbaseObject, CoinbaseObjectType, GeneralTxObject, getObject, doesObjectExist, BlockObjectType, requestAndWaitForObject} from './objects'
import {validateTx, inputValue, outputValue} from './transactions'
import {UTXO, UTXOType} from './utxo'
import {updateLongestChain} from './chains'
import {BLOCK_REWARDS, BLOCK_TARGET, GENESIS_ID, DOWNLOAD_TIMEOUT} from './constants'

const BlockState = Record({
	height: RNumber,
	state: Array(UTXO)
})
type BlockStateType = Static<typeof BlockState>

const stateDB = new level('./utxoDatabase')
// Database will store blockid : {height, UTXOset}
// This is naive snapshot of state at each block

export async function initStateDB(){
	await stateDB.put(GENESIS_ID, {height:0, state:[]})
}

export async function setState (blockid: string, state: BlockStateType) {
	if (!await stateDB.exists(blockid)) {
		await stateDB.put(blockid, state)
	}
}

export async function getState (blockid: string) {
	return await stateDB.get(blockid)
}

export async function doesStateExist (blockid: string) {
	return await stateDB.exists(blockid)
}

export async function validateBlock(block: BlockObjectType){
	if(block.T !== BLOCK_TARGET)
		throw "Invalid block: Incorrect target "+block.T
	if(! /[0-9a-f]{64}/.test(block.nonce))
		throw "Invalid block: Nonce is not a 256-bit hex string: "+block.nonce
	const blockid = objectToId(block)
	if(!isSmallerHex(blockid, BLOCK_TARGET))
		throw "Invalid block: Block hash does not match target: "+blockid
	if(block.previd !== null && !/[0-9a-f]{64}/.test(block.previd))
		throw "Invalid block: previd is not a 256-bit hex string: "+block.previd
	if(block.previd === null && blockid !== GENESIS_ID)
		throw "Incorrect genesis block"
	if(!Number.isInteger(block.created) || block.created < 0)
		throw "Invalid block: Timestamp is not a non-negative integer"
	let currentTime = Math.floor(Date.now() / 1000)
	console.log("Verification time "+currentTime)
	if(block.created > currentTime)
		throw "Invalid block: Timestamp "+block.created+" is in the future (current timestamp "+currentTime+")"

	// Retrieve previous blocks and validate them
	let prevBlock
	if(block.previd !== null){
		try{
			prevBlock = await getObject(block.previd)
		} catch(error){
			console.log("Block with id "+block.previd+" not found in database. Requesting network...")
			try{
				prevBlock = await requestAndWaitForObject(block.previd, DOWNLOAD_TIMEOUT)
			} catch(error){
				throw "Invalid block: Error with parent block: "+error
			}
		}
		if(block.created <= prevBlock.created)
		throw "Invalid block: Timestamp "+block.created+" not later than parent block's timestamp "+prevBlock.created
	}
	
	// if(typeof block.miner!=="undefined" && ! /[ -~]{1,128}/.test(block.miner))
	// 	throw "Invalid block: Only ASCII-printable strings up to 128 characters accepted in miner"
	// if(typeof block.note!=="undefined" && ! /[ -~]{1,128}/.test(block.note))
	// 	throw "Invalid block: Only ASCII-printable strings up to 128 characters accepted in note"
	
	let hasCoinbase = false
	let coinbase: any
	let input_sum = 0
	let output_sum = 0
	let height: number
	let newUtxoSet: UTXOType[]
	if (block.previd === null){
		newUtxoSet = []
		height = 0
	}
	else if(block.previd === GENESIS_ID){
		newUtxoSet = []
		height = 1
	}
	else{
		try {
			let prevState = await getState(block.previd)
			newUtxoSet = prevState.state
			height = prevState.height + 1
		} catch(error) {
			throw "Could not validate block: could not find prev block's UTXO set"
		}
	}
	// Check if transactions exist in the database, if not request them.
	let txs: any[] = []
	let promises: Promise<any>[] = []
	for(let i=0; i<block.txids.length; i++){
		try{
			txs[i] = await getObject(block.txids[i])
		} catch(error){
			console.log("Transaction "+i+" with id "+block.txids[i]+" not found in database. Requesting network...")
			promises.push(requestAndWaitForObject(block.txids[i], DOWNLOAD_TIMEOUT)
				.then((value) => {
					txs[i] = value
				})
				.catch((error) => {
					throw "Invalid block: Transaction "+i+": "+error
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
			if(tx.height !== height)
				throw "Invalid block: Incorrect height in coinbase, expected "+height+", found "+tx.height
			hasCoinbase = true
			coinbase = tx
			newUtxoSet.push({txid:block.txids[i], index:0})
		} else if(GeneralTxObject.guard(tx)){
			// Check that coinbase is not spent in any transaction
			// Validate transaction as per utxo state
			for(let j=0; j<tx.inputs.length; j++){
				if(hasCoinbase && tx.inputs[j].outpoint.txid===objectToId(coinbase)){
					throw "Invalid block: Coinbase is spent in transaction "+i+" input "+j+" in the same block"
				}
				let inputUtxo = {txid:tx.inputs[j].outpoint.txid, index:tx.inputs[j].outpoint.index}
				if(!newUtxoSet.some((item) => isDeepStrictEqual(item, inputUtxo))){
					throw "Invalid block: Input "+j+" of transaction "+i+" does not match an unspent output"
				}
				newUtxoSet = newUtxoSet.filter((item) => !isDeepStrictEqual(item, inputUtxo))
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
		} else{
			throw "Invalid block: txid "+block.txids[i]+" at index "+i+" is not a transaction"
		}
	}
	// Check value of coinbase output
	if(hasCoinbase && coinbase.outputs[0].value > input_sum-output_sum+BLOCK_REWARDS)
		throw "Invalid block: Coinbase earns "+coinbase.outputs[0].value+", expected max "+BLOCK_REWARDS+" + "+input_sum+" - "+output_sum+" = "+(input_sum-output_sum+BLOCK_REWARDS)

	// If you reach here, it means the block is valid. So add an entry to the UTXO set.
	await setState(blockid, {height:height, state:newUtxoSet})
	await updateLongestChain(blockid)
}
