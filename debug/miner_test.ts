import {spawn, Thread, Worker, FunctionThread} from 'threads'
import {BLOCK_TARGET, config, NUM_MINING_THREADS, GENESIS_ID} from '../constants'
import {objectToId} from '../utils'
import {MineFuncType} from '../miner_thread'
import {BlockObjectType} from '../objects'

const EASY_TARGET = "00002af0000000000000000000000000000000000000000000000000000000000"

export async function startMining() {
	let miningCount = 0
	let maxBlocks = 10
	let miningTimes: number[] = []
	let timeNow = Math.floor(Date.now()/1000)
	let previd = GENESIS_ID
	let txids = []
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
	console.log("Initializing mining thread(s).........")
	const miner1 = await spawn<MineFuncType>(new Worker("../miner_thread"))
	const miner2 = await spawn<MineFuncType>(new Worker("../miner_thread"))
	const miner3 = await spawn<MineFuncType>(new Worker("../miner_thread"))
	const miner4 = await spawn<MineFuncType>(new Worker("../miner_thread"))

	console.log("Initialized 4 mining thread(s).")

	let block: BlockObjectType
	let startTime = Date.now()
	let endTime
	while(miningCount < maxBlocks) {
		try{
			block = await Promise.any([
				miner1(blockWithoutNonce, BLOCK_TARGET),
				miner2(blockWithoutNonce, BLOCK_TARGET),
				miner3(blockWithoutNonce, BLOCK_TARGET),
				miner4(blockWithoutNonce, BLOCK_TARGET)
			])
			endTime = Date.now()
			const timeTaken = (endTime - startTime) / 1000
			console.log("New block mined in "+timeTaken+" s")
			console.log(block)
			console.log(objectToId(block))
			miningTimes.push(timeTaken)
			miningCount++
			blockWithoutNonce.previd = objectToId(block)
			startTime = Date.now()
		} catch(error) {
		} finally {
			blockWithoutNonce.created = Math.floor(Date.now()/1000)
		}
	}
	Thread.terminate(miner1)
	Thread.terminate(miner2)
	Thread.terminate(miner3)
	Thread.terminate(miner4)
	return miningTimes
}

startMining()
.then((result) => {
	console.log("Mining times (s): "+result)
	let total = 0;
	for(let i = 0; i < result.length; i++) {
    	total += result[i];
	}
	console.log("Average = "+(total/result.length)+" s.")
})