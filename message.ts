import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template } from 'runtypes';
import {Peer} from './peer'
import * as network from './network'
import {Object,receiveObject,sendObject,requestObjectIfNotPresent} from './objects' // added in HW 2
import {receiveChainTip} from './chains'
import {getLongestChainTip} from './chains'
const canonicalize = require('canonicalize')
import {INVALID_MSG_TIMEOUT} from './constants'

const HelloMessage = Record({
	type: Literal('hello'),
	version: Template(Literal('0.8.'), Number),
	agent: String
});

const PeersMessage = Record({
	type: Literal('peers'),
	peers: Array(String)
});

const GetPeersMessage = Record({
	type: Literal('getpeers')
});

const ErrorMessage = Record({
	type: Literal('error'),
	error: String
});

// next three objects added in HW 2
const GetObjectMessage = Record({
	type: Literal('getobject'),
	objectid: String
});

const IHaveObjectMessage = Record({
	type: Literal('ihaveobject'),
	objectid: String
});

const ObjectMessage = Record({
	type: Literal('object'),
	object: Object
})

// Following types added in HW 4
const GetChainTipMessage = Record({
	type: Literal('getchaintip')
})

const ChainTipMessage = Record({
	type: Literal('chaintip'),
	blockid: String
})

const GetMempoolMessage = Record({
	type: Literal('getmempool')
})

const MempoolMessage = Record({
	type: Literal('mempool'),
	blockid: Array(String)
})

const MessageObject = Union(HelloMessage, PeersMessage, GetPeersMessage, ErrorMessage, GetObjectMessage, IHaveObjectMessage, ObjectMessage, GetChainTipMessage, ChainTipMessage, GetMempoolMessage, MempoolMessage); // changed in HW 4

export function parseMessage(msg: string){
	let parsedMessage 
	try{
		parsedMessage = JSON.parse(msg);
	} catch(e){
		throw "Message could not be parsed into JSON: "+msg;
	}
	let validate = MessageObject.validate(parsedMessage)
	if (!validate.success){
		throw JSON.stringify(validate.details)
	}
	return parsedMessage
}

export function encodeMessage(obj: any){
	return canonicalize(obj) + "\n";
}

export class messageHandler{
	peer:Peer;
	jsonBuffer:string;
	waiting:boolean;
	myTimeout:any;

	constructor(peer:Peer){
		this.jsonBuffer = "";
		this.peer = peer;
		this.waiting = false;
	}

	handle(data:string){
		const msgList = data.split('\n');
		msgList.forEach((msgItem,msgIndex) => {
			if(msgItem==='' || msgItem===' ')
				return;
			msgItem = this.jsonBuffer + msgItem
			let msgObject;
			try{
				msgObject = parseMessage(msgItem);
			} catch(e){
				this.jsonBuffer = msgItem;
				if(!this.waiting){
					this.myTimeout = setTimeout(() => {
						network.closeDueToError(this.peer, "Invalid message: "+msgItem+". Details: "+e)
					}, INVALID_MSG_TIMEOUT);
					this.waiting = true;
				}
				return;
			}
			clearTimeout(this.myTimeout);
			this.waiting = false;
			this.jsonBuffer = "";

			if(!this.peer.introduced && msgObject.type!=='hello'){
				network.closeDueToError(this.peer,"Message sent before hello!");
				return;
			}
			switch(msgObject.type){
				case 'hello':
					this.peer.introduction(msgObject.agent);
					console.log("Peer "+this.peer.name+" said hello.");
					break;

				case 'peers':
					console.log("Peer "+this.peer.name+" sent some peer addresses.");
					network.discoveredNewPeers(msgObject.peers);
					break;

				case 'getpeers':
					console.log("Peer "+this.peer.name+" asked for peer addresses.");
					network.sendDiscoveredPeers(this.peer);
					break;

				case 'error':
					console.log("Error reported by "+this.peer.name);
					console.log(msgObject.error);
					break;

				// next 3 cases added in HW 2
				case 'ihaveobject':
					console.log("Peer "+this.peer.name+" advertized object "+msgObject.objectid);
					requestObjectIfNotPresent(msgObject.objectid,this.peer);
					break;

				case 'getobject':
					console.log("Peer "+this.peer.name+" asked for object "+msgObject.objectid);
					sendObject(msgObject.objectid, this.peer).catch((error) => {
						console.log(error)
					})
					break;

				case 'object':
					console.log("Peer "+this.peer.name+" sent object");
					console.log(msgObject.object);
					receiveObject(msgObject.object,this.peer);
					break;

				// next 2 cases added in HW 4
				case 'getchaintip':
					console.log("Peer "+this.peer.name+" requested for chain tip")
					getLongestChainTip().then((blockid) => {
						network.sendChainTip(this.peer, blockid)
					})
					break

				case 'chaintip':
					console.log("Peer "+this.peer.name+" sent chaintip "+msgObject.blockid)
					receiveChainTip(msgObject.blockid)
					break

				case 'getmempool':
					network.reportError(this.peer, "Getmempool is currently unsupported")
					break

				case 'mempool':
					network.reportError(this.peer, "Mempool is currently unsupported")
					break
			}
		});
	}
}
