import {getLongestChainTip, getLongestChainHeight} from './chains'
import {getMempool} from './mempool'
import {BLOCK_TARGET, config, NUM_MINING_THREADS, BLOCK_REWARDS, MINING_TIMEOUT} from './constants'
import {receiveObject, BlockObjectType} from './objects'
import {objectToId} from './utils'
import {TSMiner, CPPMiner} from './miner_class'

const Miner = (config.minerType === "cpp") ? CPPMiner : TSMiner

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
		note: "Test block (full target)",
		previd: previd,
		txids: txids,
		nonce: "0000000000000000000000000000000000000000000000000000000000000000"
	}
	
	const miner = new Miner(NUM_MINING_THREADS, MINING_TIMEOUT)

	let block: BlockObjectType
	let startTime = Date.now()
	let endTime
	while(true) {
		console.log("Attempting to mine following block: ")
		console.log(coinbase)
		console.log(blockWithoutNonce)
		try{
			block = await miner.mine(blockWithoutNonce, BLOCK_TARGET)
			endTime = Date.now()
			const timeTaken = (endTime - startTime) / 1000
			console.log("New block mined in "+timeTaken+" s")
			console.log(block)
			await receiveObject(coinbase)
			await receiveObject(block) // takes care of validating, saving and broadcasting the block
			startTime = Date.now()
		} catch(error) {
			console.log("Miners did not find a block in one second.")
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