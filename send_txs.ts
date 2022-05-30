import {BLOCK_REWARDS} from './constants'
import * as DB from './database'
import {receiveObject, TxObjectType, advertizeObject, getObject} from './objects'
import {objectToId} from './utils'
import {getLongestChainTip} from './chains'
import {getState} from './blocks'
import level from 'level-ts'
import * as ed from '@noble/ed25519'
const canonicalize = require('canonicalize')
import {isDeepStrictEqual} from 'util'

const keysDB = new level('./keysDatabase');

const INITIAL_TXID = "a3530aa752b64c1156fefb123b585a89aaddb13256ed9dfc398e82a411a61837"
const TX_SEND_INTERVAL = 60000

async function saveUnspentTx(txid: string, amount: number) {
	await DB.put("unspentTx", txid)
	await DB.put("unspentAmount", amount)
}

async function getUnspentTxid() {
	if (await DB.exists("unspentTx")) {
		return await DB.get("unspentTx")
	}
	else {
		await saveUnspentTx(INITIAL_TXID, BLOCK_REWARDS)
		return INITIAL_TXID
	}
}

async function getUnspentAmount() {
	if (await DB.exists("unspentAmount")) {
		return await DB.get("unspentAmount")
	}
	else {
		await saveUnspentTx(INITIAL_TXID, BLOCK_REWARDS)
		return BLOCK_REWARDS
	}
}

async function createNewTx(unspentTxid, unspentAmount, pubkey, prikey) {
	const unsignedTx = {
		type: "transaction",
		inputs: [{
			outpoint: {txid: unspentTxid, index: 0},
			sig: null
		}],
		outputs: [{pubkey: pubkey, value: unspentAmount - 1}]
	}
	const txSign = Buffer.from(await ed.sign(Buffer.from(canonicalize(unsignedTx)).toString('hex'), prikey)).toString('hex')
	const signedTx = {
		type: "transaction", 
		inputs: [{
			outpoint: {txid: unspentTxid, index: 0},
			sig: txSign
		}], 
		outputs: [{pubkey: pubkey, value: unspentAmount - 1}]
	}
	return signedTx
}

export async function startSendingTxs() {
	const pubkey = await keysDB.get('pubHex')
	const prikey = await keysDB.get('priHex')
	let currentTxid = await getUnspentTxid()
	let currentAmount = await getUnspentAmount()
	let currentTx = await getObject(currentTxid)
	setInterval(async () => {
		const chaintip = await getLongestChainTip()
		let utxo = {txid:currentTxid, index:0}
		const state = (await getState(chaintip)).state
		if(!state.some((item) => isDeepStrictEqual(item, utxo))){
			advertizeObject(currentTxid)
			return
		}
		currentTx = await createNewTx(currentTxid, --currentAmount, pubkey, prikey)
		currentTxid = objectToId(currentTx)
		await saveUnspentTx(currentTxid, currentAmount)
		console.log("Releasing new transaction: ")
		console.log(currentTx)
		await receiveObject(currentTx)
	}, TX_SEND_INTERVAL)
}