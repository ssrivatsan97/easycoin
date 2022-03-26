import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template } from 'runtypes';
import {Peer} from './peer'
import * as network from './network'
const canonicalize = require('canonicalize')

const invalidMsgTimeout = 1000;

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


const MessageObject = Union(HelloMessage, PeersMessage, GetPeersMessage, ErrorMessage);

export function parseMessage(msg: string){
	try{
		return MessageObject.check(JSON.parse(msg));
	} catch(e){
		throw "Message could not be parsed into JSON: "+msg;
	}
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
						network.closeDueToError(this.peer, "Invalid message: "+msgItem)
					}, invalidMsgTimeout);
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
			}
		});
	}
}

// export type HelloMessage = Static<typeof HelloMessage>;
// export type MessageObject = Static<typeof MessageObject>;