import {BLOCK_REWARDS} from './constants'
import * as DB from './database'
import {receiveObject} from './objects'
import {objectToId} from './utils'
import level from 'level-ts'
import * as ed from '@noble/ed25519'
const canonicalize = require('canonicalize')

const keysDB = new level('./keysDatabase');

const INITIAL_TXID = "69233ce9d1b2777c39643151a956a8d013ab2b4730823b589ef2edfa49f1b6a7"
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

export async function startSendingTxs() {
	const pubkey = await keysDB.get('pubHex')
	const priKey = await keysDB.get('priHex')
	setInterval(async () => {
		const txid = await getUnspentTxid()
		const amount = await getUnspentAmount()
		const unsignedTx = {
			type: "transaction",
			inputs: [{
				outpoint: {txid: txid, index: 0},
				sig: null
			}],
			outputs: [{pubkey: pubkey, value: amount - 1}]
		}
		const txSign = Buffer.from(await ed.sign(Buffer.from(canonicalize(unsignedTx)).toString('hex'), priKey)).toString('hex')
		const signedTx = {
			type: "transaction", 
			inputs: [{
				outpoint: {txid:txid, index: 0},
				sig: txSign
			}], 
			outputs: [{pubkey: pubkey, value: amount - 1}]
		}
		const newTxid = objectToId(signedTx)
		await saveUnspentTx(newTxid, amount - 1)
		console.log("Releasing new transaction: ")
		console.log(signedTx)
		await receiveObject(signedTx)
	}, TX_SEND_INTERVAL)
}