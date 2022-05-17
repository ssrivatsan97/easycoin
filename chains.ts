import level from 'level-ts'
import {BlockObject, BlockObjectType, requestAndWaitForObject, getObject} from './objects'
import {validateBlock, getState, doesStateExist} from './blocks'
import {DOWNLOAD_TIMEOUT, GENESIS_ID} from './constants'

// longest chain state
// Databse contains 2 keys, longestChainTip and longestChainHeight
// Initial values are genesis id and 0 respectively
const chainDB = new level('./chainDatabase')
// let longestChainTip: string = "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e"
// let longestChainHeight = 0

export async function initChainDB(){
	await chainDB.put("longestChainTip",GENESIS_ID)
	await chainDB.put("longestChainHeight",0)
}

export async function updateLongestChain(blockid: string){
	// Assume that this function is only called with validated blocks
	let height
	try {
		height = (await getState(blockid)).height
	} catch(error){
		console.log("New chaintip "+blockid+" not found in state database")
		return
	}
	let longestChainHeight = await getLongestChainHeight()
	if (height > longestChainHeight){
		await setLongestChain(blockid, height)
		// longestChainHeight = height
		// longestChainTip = blockid
		console.log("Update longest chain to "+blockid+", height = "+height)
	}
}

export async function getLongestChainTip(){
	try{
		return await chainDB.get("longestChainTip")
	} catch(error){
		console.log("Error: could not read longestChainTip from chain DB")
	}
	// return longestChainTip
}

export async function getLongestChainHeight(){
	try{
		return await chainDB.get("longestChainHeight")
	} catch(error){
		console.log("Error: could not read longestChainHeight from chain DB")
	}
	// return longestChainHeight
}

async function setLongestChain(blockid: string, height: number){
	await chainDB.put("longestChainHeight", height)
	await chainDB.put("longestChainTip", blockid)
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