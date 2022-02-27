import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template } from 'runtypes';
import {Peer} from './peer'
import * as network from './network'
const canonicalize = require('canonicalize')

const invalidMsgTimeout = 5000;

const HelloObject = Record({
	type: Literal('hello'),
	version: Template(Literal('0.7.'), Number),
	agent: String
});

const PeersObject = Record({
	type: Literal('peers'),
	peers: Array(String)
});

const GetPeersObject = Record({
	type: Literal('getpeers')
});

// const WhiteSpaceObject = Record({
// 	type: Literal(' ')
// });

const MessageObject = Union(HelloObject, PeersObject, GetPeersObject);

export function parseMessage(msg: string){
	try{
		var obj = JSON.parse(msg);
	} catch(e){
		throw e;
	}
	return MessageObject.check(obj);
}

export function encodeMessage(obj: any){
	return canonicalize(obj) + "\n";
}

// export type HelloObject = Static<typeof HelloObject>;
// export type MessageObject = Static<typeof MessageObject>;

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
		var msgList = data.split('\n');
		msgList.forEach((msgItem,msgIndex) => {
			if(msgItem==='' || msgItem===' ')
				return;
			msgItem = this.jsonBuffer + msgItem
			try{
				var msgObject = parseMessage(msgItem);
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
				throw "Message sent before hello!";
			}
			switch(msgObject.type){
				case 'hello':
					this.peer.introduction(msgObject.agent);
					console.log("Peer "+this.peer.name+" said hello.");
					break;

				case 'peers':
					console.log("Peer "+this.peer.name+" sent some peer addresses.");
					var peerset = msgObject.peers;
					peerset.forEach((item,index) => {
						network.discoveredNewPeer(item);
					});
					break;

				case 'getpeers':
					console.log("Peer "+this.peer.name+" asked for peer addresses.");
					network.sendDiscoveredPeers(this.peer);
					break;
			}
		});
	}
}

// {"type":"peers","peers":["dionyziz.com:18018","138.197.191.170:18018","[fe80::f03c:91ff:fe2c:5a79]:18018"]}