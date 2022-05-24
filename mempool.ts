import {UTXOType} from './utxo'
import {TxObjectType, CoinbaseObject, GeneralTxObject, getObject, requestAndWaitForObject} from './objects'
import {validateTx, validateTxWrtState} from './transactions'
import {objectToId} from './utils'
import {DOWNLOAD_TIMEOUT} from './constants'

let mempool: string[] = []
let mempoolState: UTXOType[] = []

export function getMempool(){
	return mempool
}

export async function receiveMempool(txids: string[]){
	let promises: Promise<any>[] = []
	for(let i=0; i<txids.length; i++){
		try{
			let tx = await getObject(txids[i])
			addTxToMempool(tx)
		} catch(error){
			console.log("Transaction "+i+" with id "+txids[i]+" not found in database. Requesting network...")
			promises.push(requestAndWaitForObject(txids[i], DOWNLOAD_TIMEOUT)
				.catch((error) => {
					console.log("Did not add transaction "+txids[i]+" to mempool: "+error as string)
				})
			)
		}
	}
	await Promise.allSettled(promises)
}

// Assume that standalone transaction verification has already been done
export function addTxToMempool(tx: TxObjectType){
	const txid = objectToId(tx)
	if (CoinbaseObject.guard(tx)){
		return
	}
	if (mempool.includes(txid)){
		return
	}
	try{
		mempoolState = validateTxWrtState(tx, mempoolState)
	} catch(error){
		console.log("Did not add transaction "+txid+" to mempool: "+error as string)
		return
	}
	mempool.push(txid)
	console.log("Added transaction "+txid+" to mempool")
}

// TODO: Improve latency by awaiting all getObject promises at once

export async function updateMempoolState(newState: UTXOType[], oldChainTip: string, newChainTip: string, heightDiff: number){
	// Update mempool state to new state	
	const oldMempool = mempool
	mempool = []
	mempoolState = newState

	// Track back along the new chain util it matches the height of the old chain
	let newChainPointer = newChainTip
	for (let i = 0; i < heightDiff; i++){
		let block
		try {
			block = await getObject(newChainPointer)
		} catch(error){
			console.log("Block "+newChainPointer+" not found in database! What?! How?!")
			return
		}
		newChainPointer = block.previd
	}

	// Get transactions from old chain until the fork with the new chain
	const oldChainTxs: any[] = []
	let oldChainPointer = oldChainTip
	while (oldChainPointer !== newChainPointer){
		let oldChainBlock
		try {
			oldChainBlock = await getObject(oldChainPointer)
		} catch(error){
			console.log("Block "+oldChainPointer+" not found in database! What?! How?!")
			return
		}
		for (let i = oldChainBlock.txids.length - 1; i >= 0; i--){
			let tx
			try {
				tx = await getObject(oldChainBlock.txids[i])
			} catch(error){
				console.log("Transaction "+oldChainBlock.txids[i]+" in Block "+oldChainPointer+" not found in database! What?! How?!")
				return
			}
			oldChainTxs.push(tx)
		}
		oldChainPointer = oldChainBlock.previd

		let newChainBlock
		try {
			newChainBlock = await getObject(newChainPointer)
		} catch(error){
			console.log("Block "+newChainPointer+" not found in database! What?! How?!")
			return
		}
		newChainPointer = newChainBlock.previd
	}

	// Try to add transactions from the old chain into the new mempool
	for (let i = oldChainTxs.length - 1; i >= 0; i--){
		addTxToMempool(oldChainTxs[i])
	}

	// Try to add transactions from the old mempool into the new mempool
	for (let i = 0; i < oldMempool.length; i++){
		let tx
		try{
			tx = await getObject(oldMempool[i])
		} catch(error){
			console.log("Transaction "+mempool[i]+" not found in database! What?! How?!")
			return
		}
		addTxToMempool(tx)
	}
	console.log("Completed mempool update after new chain "+newChainTip)
}