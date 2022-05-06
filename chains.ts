import level from 'level-ts'
import {BlockObject, BlockObjectType, requestAndWaitForObject, getObject} from './objects'
import {validateBlock, getState, doesStateExist} from './blocks'

const DOWNLOAD_TIMEOUT = 5000

// longest chain state
let longestChainTip: string|null = null
let longestChainHeight = 0

export async function updateLongestChain(chaintip: string){
	// Assume that this function is only called with validated blocks
	let height
	try {
		height = (await getState(chaintip)).height
	} catch(error){
		console.log("New chaintip "+chaintip+" not found in state database")
		return
	}
	if (height > longestChainHeight){
		longestChainHeight = height
		longestChainTip = chaintip
	}
}

export function getLongestChainTip(){
	return longestChainTip
}

export function getLongestChainHeight(){
	return longestChainHeight
}

export async function receiveChainTip(chaintip: string){
	if (!await doesStateExist(chaintip)){
		console.log("Chain id "+chaintip+" not found in state database. Requesting network...")
		try{
			await requestAndWaitForObject(chaintip, DOWNLOAD_TIMEOUT)
		} catch(error){
			console.log("Invalid chain "+chaintip+": "+error)
			return
		}
	} else{
		updateLongestChain(chaintip)
	}
}