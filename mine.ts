import {spawn, Thread, Worker, FunctionThread} from 'threads'
import {getLongestChainTip, getLongestChainHeight} from './chains'
import {getMempool} from './mempool'
import {BLOCK_TARGET, config, NUM_MINING_THREADS, BLOCK_REWARDS} from './constants'
import {receiveObject, BlockObjectType} from './objects'
import {MineFuncType} from './miner_thread'
import {objectToId} from './utils'

const EASY_TARGET = "00002af0000000000000000000000000000000000000000000000000000000000"

export async function startMining() {
	let timeNow = Math.floor(Date.now()/1000)
	let previd = await getLongestChainTip()
	let height = await getLongestChainHeight() + 1
	let coinbase = {
		type: <"transaction">"transaction",
		height: height,
		outputs: [{pubkey: config.pubkey, value: BLOCK_REWARDS}]
	}
	let coinbaseId = objectToId(coinbase)
	let txids = [coinbaseId].concat(getMempool())
	const blockWithoutNonce = {
		type: <"block">"block",
		T: BLOCK_TARGET,
		created: timeNow,
		miner: config.minerName,
		note: "Test block (easy target)",
		previd: previd,
		txids: txids,
		nonce: "0000000000000000000000000000000000000000000000000000000000000000"
	}
	console.log("Initializing "+NUM_MINING_THREADS+" mining threads.........")
	const miners = [await spawn<MineFuncType>(new Worker("./miner_thread"))]
	for (let i = 1; i < NUM_MINING_THREADS; i++) {
		miners.push(await spawn<MineFuncType>(new Worker("./miner_thread")))
	}
	console.log("Initialized "+NUM_MINING_THREADS+" mining threads.")

	let block: BlockObjectType
	let startTime = Date.now()
	let endTime
	while(true) {
		console.log("Attempting to mine following block: ")
		console.log(coinbase)
		console.log(blockWithoutNonce)
		try{
			const promises = miners.map(miner => miner(blockWithoutNonce, EASY_TARGET))
			block = await Promise.any(promises)
			endTime = Date.now()
			const timeTaken = (endTime - startTime) / 1000
			console.log("New block mined in "+timeTaken+" s")
			console.log(block)
			await receiveObject(coinbase)
			await receiveObject(block) // takes care of validating, saving and broadcasting the block
			startTime = Date.now()
		} catch(error) {
			// console.log("Miners did not find a block in one second.")
		} finally {
			blockWithoutNonce.created = Math.floor(Date.now()/1000)
			blockWithoutNonce.previd = await getLongestChainTip()
			height = await getLongestChainHeight() + 1
			coinbase.height = height
			coinbaseId = objectToId(coinbase)
			blockWithoutNonce.txids = [coinbaseId].concat(getMempool())
		}
	}
}