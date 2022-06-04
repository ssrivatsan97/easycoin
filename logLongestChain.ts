import * as fs from 'fs'
import {getLongestChainTip} from './chains'
import {getObject} from './objects'
import {getState} from './blocks'
import {GENESIS_ID, GENESIS_BLOCK} from './constants'
const canonicalize = require('canonicalize')

export async function log(chaintip?: string) {
	const date = Date()
	let blockid: string
	if (typeof chaintip !== "undefined"){
		blockid = chaintip 
	}
	else{
		try{
			blockid = await getLongestChainTip()
		} catch(error){
			console.log("Could not read chaintip to log chain")
			return
		}
	}
	let text = ""
	while (blockid !== GENESIS_ID) {
		let block
		let height
		try{
			block = await getObject(blockid)
		} catch(error){
			console.log("Could not read block "+blockid+" to log chain")
			return
		}
		try{
			height = (await getState(blockid)).height
		} catch(error){
			console.log("Could not read state of block "+blockid+" to log chain")
			return
		}
		text += height + " " + blockid + "\n"
		text += canonicalize(block) + "\n\n"
		blockid = block.previd
	}
	text += "0 " + GENESIS_ID + "\n"
	text += canonicalize(GENESIS_BLOCK)
	fs.writeFileSync('./snapshots/chain_'+date.toString()+'.txt', text)
	console.log("Logged longest chain snapshot")
}