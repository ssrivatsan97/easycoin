import {BlockObject, BlockObjectType, requestAndWaitForObject} from './objects'
import {validateBlock, getState, doesStateExist} from './blocks'
import {DOWNLOAD_TIMEOUT, GENESIS_ID} from './constants'
import * as DB from './database'
import {updateMempoolState} from './mempool'


// longest chain state
// Database contains 2 keys, longestChainTip and longestChainHeight
// Initial values are genesis id and 0 respectively
export async function initChainDB(){
	if (!(await DB.exists("longestChainTip") && await DB.exists("longestChainHeight"))){
		await DB.put("longestChainTip",GENESIS_ID)
		await DB.put("longestChainHeight",0)
	}
}

export async function clearChainDB(){
	await DB.clear("longestChain")
}

export async function getLongestChainTip(){
	try{
		return await DB.get("longestChainTip")
	} catch(error){
		console.log("Error: could not read longestChainTip from chain DB")
	}
}

export async function getLongestChainHeight(){
	try{
		return await DB.get("longestChainHeight")
	} catch(error){
		console.log("Error: could not read longestChainHeight from chain DB")
	}
}

export async function setLongestChain(blockid: string, height: number){
	await DB.put("longestChainHeight", height)
	await DB.put("longestChainTip", blockid)
}

export async function updateLongestChain(blockid: string){
	// Assume that this function is only called with validated blocks
	let blockState
	try {
		blockState = await getState(blockid)
	} catch(error){
		console.log("New chaintip "+blockid+" not found in state database")
		return
	}
	const oldChainTip = await getLongestChainTip()
	const longestChainHeight = await getLongestChainHeight()
	if (blockState.height > longestChainHeight){
		await setLongestChain(blockid, blockState.height)
		console.log("Update longest chain to "+blockid+", height = "+blockState.height)
		await updateMempoolState(blockState.state, oldChainTip, blockid, blockState.height - longestChainHeight)
	}
}

export async function receiveChainTip(blockid: string){
	if (!await doesStateExist(blockid)){
		console.log("Chain with blockid "+blockid+" not found in state database. Requesting network...")
		try{
			await requestAndWaitForObject(blockid, DOWNLOAD_TIMEOUT) // This will receive block, validate and update longest chain
		} catch(error){
			console.log("Invalid chain "+blockid+": "+error)
			return
		}
	} else{
		updateLongestChain(blockid)
	}
}