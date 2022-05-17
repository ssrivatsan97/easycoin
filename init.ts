import {initObjectDB} from './objects'
import {initStateDB} from './blocks'
import {initChainDB} from './chains'

export async function initDBs(){
	console.log("Initializing databases with genesis block and genesis block state...")
	let p1 = initObjectDB()
	let p2 = initStateDB()
	let p3 = initChainDB()
	await Promise.allSettled([p1,p2,p3])
}