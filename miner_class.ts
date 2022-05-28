import {spawn as spawnThread, Thread, Worker, FunctionThread} from 'threads'
import {spawn as spawnChildProcess} from 'node:child_process'
import {MineFuncType} from './ts_miner_thread'
import {BlockObjectType} from './objects'
import {config} from './constants'
const canonicalize = require('canonicalize')

export class TSMiner {
	miners
	numThreads: number
	isSpawned: boolean
	timeout: number

	constructor(numThreads: number, timeout: number) {
		console.log("Constructing Typescript miner....")
		this.numThreads = numThreads
		this.isSpawned = false
		this.timeout = timeout
	}

	async mine(templateBlock: BlockObjectType, target: string): Promise<BlockObjectType> {
		if (!this.isSpawned) {
			console.log("Initializing "+this.numThreads+" Typescript mining threads.........")
			this.miners = [await spawnThread<MineFuncType>(new Worker(config.tsMinerPath))]
			for (let i = 1; i < this.numThreads; i++) {
				this.miners.push(await spawnThread<MineFuncType>(new Worker(config.tsMinerPath)))
			}
			console.log("Initialized "+this.numThreads+" Typescript mining threads.")
			this.isSpawned = true
		}
		return Promise.any(this.miners.map(miner => miner(templateBlock, target, this.timeout)))
	}
}

export class CPPMiner {
	numThreads: number
	timeout: number

	constructor(numThreads: number, timeout: number) {
		console.log("Constructing C++ miner....")
		this.numThreads = numThreads
		this.timeout = timeout
	}

	async mine(templateBlock: BlockObjectType, target: string): Promise<BlockObjectType> {
		const blockStr = canonicalize(templateBlock)

		const miners = spawnChildProcess(config.cppMinerPath, [blockStr, target, String(this.numThreads), String(this.timeout)]);

		return new Promise((resolve, reject) => {
			miners.stdout.on('data', (data) => {
			  resolve(JSON.parse(Buffer.from(data).toString()))
			});

			miners.on('close', (code) => {
			  reject("Tried for "+(this.timeout/1000)+" second(s), could not find block")
			});
		})
	}
}