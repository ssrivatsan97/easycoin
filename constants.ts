export const config = {
	"port" : 18018,
	"serverTimeoutDuration" : 300000,
	"socketTimeoutDuration" : 60000,
	"myName" : "EasyCoin", // Please change this
	"bootstrapName" : "Bootstrap",
	"bootstrapAddress" : "149.28.220.241",
	"bootstrapPort" : 18020,
	"hardcodedPeerList" : ["149.28.220.241:18018"],
	"mine" : false, // Do you want to mine?
	"sendTxs" : true, // Do you want to issue transactions? (you need to have a key pair and some bu in your account to do this!)
	"minerName" : "EasyCoin", // Please change this
	"minerType" : "cpp", // options : either "cpp" or "ts" (default is "ts")
	"cppMinerPath" : "./marabu_miner/build/MinerStandalone", // Path to C++ miner executable. Check if this path is correct after building C++ miner (see README)
	"tsMinerPath" : "./ts_miner_thread", // Path to Typescript miner code.
	"pubkey" : "8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9"
}

export const INVALID_MSG_TIMEOUT = 1000 // How long to wait for receiving fragmented messages
export const DOWNLOAD_TIMEOUT = 30000 // How long to wait to receive previous blocks and transactions in a block (for Vultr, recommend using 30000)
export const MINING_TIMEOUT = 60000 // How often does the miner refresh the block that it should mine (larger => less chance of mining on the wrong chain but less efficient)
export const NUM_MINING_THREADS = 4 // Number of mining threads. Play around with this to see how many you can use.

export const BLOCK_REWARDS = 50000000000000
export const BLOCK_TARGET = "00000002af000000000000000000000000000000000000000000000000000000"
export const GENESIS_ID = "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e"
export const GENESIS_BLOCK = {
	T:"00000002af000000000000000000000000000000000000000000000000000000",
	created:1624219079,
	miner:"dionyziz",
	nonce:"0000000000000000000000000000000000000000000000000000002634878840",
	note:"The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage",
	previd:null,
	txids:[],
	type:"block"
}