import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template } from 'runtypes';
import {Peer} from './peer'
import * as network from './network'

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
	return JSON.stringify(obj) + "\n";
}

// export type HelloObject = Static<typeof HelloObject>;
// export type MessageObject = Static<typeof MessageObject>;

export function handleMessage(data:string, peer:Peer){
	var msgList = data.split('\n');
	msgList.forEach((msgItem,msgIndex) => {
		if(msgItem==='' || msgItem===' ')
			return;
		try{
			var msgObject = parseMessage(msgItem);
		} catch(e){
			console.log("Invalid message: "+msgItem);
			throw e;
		}
		if(!peer.introduced && msgObject.type!=='hello'){
			throw "Message sent before hello!";
		}
		switch(msgObject.type){
			case 'hello':
				peer.introduction(msgObject.agent);
				console.log("Peer "+peer.name+" said hello.");
				break;

			case 'peers':
				console.log("Peer "+peer.name+" sent some peer addresses.");
				var peerset = msgObject.peers;
				peerset.forEach((item,index) => {
					network.discoveredNewPeer(item);
				});
				break;

			case 'getpeers':
				console.log("Peer "+peer.name+" asked for peer addresses.");
				network.sendDiscoveredPeers(peer);
				break;
		}
	});
}

// {"type":"peers","peers":["dionyziz.com:18018","138.197.191.170:18018","[fe80::f03c:91ff:fe2c:5a79]:18018"]}