// This file is added in HW 2
import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template } from 'runtypes';
import * as network from './network'
import * as message from './message'
import {Peer} from './peer'
import {validateTx} from './transactions'
import {objectToId} from './utils'
import level from 'level-ts'
const canonicalize = require('canonicalize')

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

// TODO: A General TxObject also counts as a CoinbaseObject. What to do?

export const BlockObject = Record({
	type: Literal("block"),
	txids: Array(String),
	nonce: String,
	previd: String,
	created: Number,
	T: String
	// miner and note are optional fields. If a block includes such additional parameters, it would still be considered a valid block object
});

// Only there in order to have a dummy object type for testing
// Hash = "c90232586b801f9558a76f2f963eccd831d9fe6775e4c8f1446b2331aa2132f2"
const TestObject = Record({
	type: Literal("testobject")
});

export const TxObject = Union(GeneralTxObject, CoinbaseObject);
export const Object = Union(GeneralTxObject, CoinbaseObject, BlockObject, TestObject);


const objectDB = new level('./objectDatabase');

export async function getObject(objectid: string){
	if (await objectDB.exists(objectid)){
		const obj = JSON.parse(await objectDB.get(objectid));
		return obj;
	} 
	else {
		throw "Object not found in database";
	}
}

function requestObject(objectid: string, peer:Peer){
	const getObjectMessage = message.encodeMessage({type:"getobject",objectid:objectid});
	network.sendMessage(getObjectMessage,peer);
}

export async function requestObjectIfNotPresent(objectid: string, peer:Peer){
	if (!(await objectDB.exists(objectid))){
		requestObject(objectid,peer)
	}
	else
		console.log("Object already exists")
}

// export function requestAllObject(objectid: string){
// 	const getObjectMessage = message.encodeMessage({type:"getobject",objectid:objectid});
// 	network.broadcastMessage(getObjectMessage);
// }

export function advertizeObject(objectid:string, sender:Peer){
	const iHaveObjectMessage = message.encodeMessage({type:"ihaveobject",objectid:objectid});
	network.broadcastMessageExceptSender(iHaveObjectMessage,sender);
	// network.broadcastMessage(iHaveObjectMessage)
}

export async function receiveObject(object:any, sender:Peer){
	const objectid = objectToId(object);
	if (!(await objectDB.exists(objectid))){
		let objectIsValid = false;
		if (TxObject.guard(object)){
			console.log("Validating transaction...")
			try{
				await validateTx(object)
				objectIsValid=true
				console.log("Transaction is valid")
			} catch(error){
				console.log(error);
			}
		} else
			objectIsValid = true; // For now. This will change when we can validate other object types.
		if(objectIsValid){
			await objectDB.put(objectid, canonicalize(object));
			advertizeObject(objectid,sender);
		}
	} else
		console.log("Object already exists")
}

export async function sendObject(objectid:string, peer:Peer){
	if (await objectDB.exists(objectid)){
		const obj = JSON.parse(await objectDB.get(objectid));
		const objectMessage = message.encodeMessage({type:"object",object:obj});
		network.sendMessage(objectMessage,peer);
	} else {
		throw "Object not found in database";
	}
}

// export type Object = Static<typeof Object>;