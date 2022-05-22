// This file is added in HW 2
import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template, Partial, Null } from 'runtypes';
const canonicalize = require('canonicalize')
import * as network from './network'
import * as message from './message'
import {Peer} from './peer'
import {validateTx} from './transactions'
import {validateBlock} from './blocks'
import {objectToId} from './utils'
import * as DB from './database'
import {GENESIS_ID, GENESIS_BLOCK} from './constants'

const Outpoint = Record({
	txid: String,
	index: Number
});

export const GeneralTxObject = Record({
	type: Literal("transaction"),
	inputs: Array(Record({outpoint:Outpoint,sig:String})),
	outputs: Array(Record({pubkey:String,value:Number}))
});

export const CoinbaseObject = Record({
	type: Literal("transaction"),
	height: Number,
	outputs: Array(Record({pubkey:String,value:Number}))
});

export const BlockObject = Record({
	type: Literal("block"),
	txids: Array(String),
	nonce: String,
	previd: String.Or(Null),
	created: Number,
	T: String
}).And(Partial({
	miner: String,
	note: String
}));

// Only there in order to have a dummy object type for testing
// Hash = "c90232586b801f9558a76f2f963eccd831d9fe6775e4c8f1446b2331aa2132f2"
const TestObject = Record({
	type: Literal("testobject")
});

export const TxObject = Union(GeneralTxObject, CoinbaseObject);
export const Object = Union(GeneralTxObject, CoinbaseObject, BlockObject, TestObject);

export type GeneralTxObjectType = Static<typeof GeneralTxObject>
export type CoinbaseObjectType = Static<typeof CoinbaseObject>
export type TxObjectType = Static<typeof TxObject>
export type BlockObjectType = Static<typeof BlockObject>
export type ObjectType = Static<typeof Object>

export async function initObjectDB(){
	await DB.put("object:"+GENESIS_ID, canonicalize(GENESIS_BLOCK))
}

export async function clearObjectDB(){
	await DB.clear("object:")
}

export async function getObject(objectid: string){
	if (await doesObjectExist(objectid)){
		const obj = JSON.parse(await DB.get("object:"+objectid));
		return obj;
	} 
	else {
		throw "Object not found in database";
	}
}

export async function doesObjectExist(objectid: string){
	return await DB.exists("object:"+objectid)
}

export async function saveObject(objectid: string, object: any){
	await DB.put("object:"+objectid, canonicalize(object))
}

function requestObject(objectid: string, peer:Peer){
	const getObjectMessage = message.encodeMessage({type:"getobject",objectid:objectid});
	console.log("Requesting peer "+peer.name+" for object "+objectid)
	network.sendMessage(getObjectMessage,peer);
}

export async function requestObjectIfNotPresent(objectid: string, peer:Peer){
	if (!(await doesObjectExist(objectid))){
		requestObject(objectid,peer)
	}
	else
		console.log("Object already exists with objectid "+objectid)
}

export function requestAllObject(objectid: string){
	const getObjectMessage = message.encodeMessage({type:"getobject",objectid:objectid});
	console.log("Requesting network for object "+objectid)
	network.broadcastMessage(getObjectMessage);
}

// Function to callback (resolve function) on receiving a certain object
// NOTE: It will send back unvalidated object!
let objectWaiters: {[objectid: string]: {resolve: ((obj: any) => void), reject: ((obj: any) => void)}[]} = {}

export function requestAndWaitForObject(objectid: string, timeout: number){
	return new Promise((resolve,reject) => {
		if(typeof objectWaiters[objectid] === "undefined"){
			objectWaiters[objectid] = [{resolve, reject}]
		} else{
			objectWaiters[objectid].push({resolve, reject})
		}
		setTimeout(() => {
			reject("Object with id "+objectid+" not found in network")
		}, timeout)
		requestAllObject(objectid)
	})
}

export function advertizeObject(objectid:string, sender:Peer){
	const iHaveObjectMessage = message.encodeMessage({type:"ihaveobject",objectid:objectid});
	console.log("Gossip I have object "+objectid+" to all peers")
	network.broadcastMessageExceptSender(iHaveObjectMessage,sender);
}

export async function receiveObject(object:any, sender:Peer){
	const objectid = objectToId(object);
	let invalidError = ""
	if (!(await doesObjectExist(objectid))){
		let objectIsValid = false;
		if (TxObject.guard(object)){
			console.log("Validating transaction...")
			try{
				await validateTx(object)
				objectIsValid=true
				console.log("Transaction is valid")
			} catch(error){
				console.log(error);
				invalidError = error as string
				network.reportError(sender, error as string)
			}
		} else if (BlockObject.guard(object)){ // This case added in HW 3
			console.log("Validating block...")
			try{
				await validateBlock(object)
				objectIsValid=true
				console.log("Block is valid")
			} catch(error){
				console.log(error);
				invalidError = error as string
				network.reportError(sender, error as string)
			}
		}
		if(objectIsValid){
			// Object is now being saved in the block and transaction validation functions
			// await saveObject(objectid, object);
			advertizeObject(objectid,sender);
		}
		if (typeof objectWaiters[objectid] !== "undefined"){ // Added in HW 3
			if (objectIsValid) {
				let resolves = objectWaiters[objectid].map(waiter => waiter.resolve)
				for (let resolve of resolves){
					resolve(object)
				}
			} else {
				let rejects = objectWaiters[objectid].map(waiter => waiter.reject)
				for (let reject of rejects){
					reject("Object with id "+objectid+" was invalid: "+invalidError)
				}
			}
			delete objectWaiters[objectid]
		}
	} else{
		console.log("Object already exists with objectid "+objectid)
		if (typeof objectWaiters[objectid] !== "undefined"){ // Added in HW 3
			let resolves = objectWaiters[objectid].map(waiter => waiter.resolve)
			for (let resolve of resolves){
				resolve(object)
			}
			delete objectWaiters[objectid]
		}
	}
}

export async function sendObject(objectid:string, peer:Peer){
	try{
		const obj = await getObject(objectid);
		const objectMessage = message.encodeMessage({type:"object",object:obj});
		console.log("Sending object "+objectid+" to peer "+peer.name)
		network.sendMessage(objectMessage,peer);
	} catch(error) {
		throw error;
	}
}
