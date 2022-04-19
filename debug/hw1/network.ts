import * as net from 'net'
import {Socket} from 'net'
import * as fs from 'fs'
import * as Message from './message'
import {Peer} from './peer'
import level from 'level-ts'
import {parseIpPort} from './utils'
const canonicalize = require('canonicalize')

const config = {
	"port" : 18018,
	"serverTimeoutDuration" : 300000,
	"socketTimeoutDuration" : 60000,
	"myName" : "EasyCoin",
	"bootstrapName" : "Bootstrap",
	"bootstrapAddress" : "149.28.220.241",
	"bootstrapPort" : 18018,
	"hardcodedPeerList" : ["localhost:18020", "149.28.220.241:18018"]
}

const peerDB = new level('./discoveredPeerList');

const connectedPeerList: Peer[] = [];

export function connectAsServer(bootstrapMode=false){
	let myName;
	let port;
	if(bootstrapMode){
		myName = config['bootstrapName'];
		port = config['bootstrapPort'];
	}
	else{
		myName = config['myName'];
		port = config['port'];
	}

	const server = net.createServer();

	server.on('connection', socket => {
		console.log("New TCP connection");
		console.log("Local port " + socket.localPort + ", local address " + socket.localAddress);
		console.log("Client: " + socket.remoteFamily + "address " + socket.remoteAddress + ", port " + socket.remotePort);
		const thisPeer = new Peer("no name", socket);
		connectedPeerList.push(thisPeer);
		discoveredNewPeers([socket.localAddress + ":" + socket.localPort.toString()]);
		const msgHandler = new Message.messageHandler(thisPeer);

		server.getConnections( (error,count) => {
			console.log("Number of open connections = " + count);
		});
		console.log("\n");

		sayHello(thisPeer,myName);
		if(!bootstrapMode)
			askForPeers(thisPeer);

		socket.on('close', hadError => {
			if(!hadError)
				console.log("Connection with "+thisPeer.name+" at "+socket.remoteAddress+" port "+socket.remotePort+" closed.");
			else
				console.log("Connection with "+thisPeer.name+" at "+socket.remoteAddress+" port "+socket.remotePort+" closed due to error.");
			socket.destroy();
		});

		socket.on('data', data => {
			try{
				msgHandler.handle(data.toString());
			} catch(e){
				console.log(e);
				socket.destroy();
			}
		});
	});

	server.on('error',function(error){
	  console.log('Error: ' + error);
	});

	server.listen(port, () => {
		const ser_addr = server.address();
		console.log("Server: " + ser_addr.family + " address " + ser_addr.address + ", port " + ser_addr.port);
		console.log("Listening for connections");
	});
}

export async function connectAsClient(){
	const myName = config['myName'];
	const bootstrapPort = config['bootstrapPort'];
	const bootstrapAddress = config['bootstrapAddress'];

	// Try to connect to all known peers in my database
	
	await discoveredNewPeers([bootstrapAddress+":"+bootstrapPort])
	const discoveredPeerList = await readDiscoveredPeers()
	for(let i=0; i<discoveredPeerList.length; i++)
	{
		const peerAddress = discoveredPeerList[i]
		const client = new net.Socket();
		const peer = new Peer("no name", client);
		connectedPeerList.push(peer);
		const msgHandler = new Message.messageHandler(peer);

		let address, port
		try{
			[address, port] = parseIpPort(peerAddress)
		} catch(error){
			console.log("Peer address " + peerAddress + " is invalid: " + error)
		}
		if(address!==undefined && port!==undefined){
			client.connect({port:port, host:address}, () => {
				console.log("Successfully connected to peer at "+address+" port "+port);
				sayHello(peer,myName);
				askForPeers(peer);
			});

			client.on('error', (error) => {
				console.log('Error: ' + error);
			});

			client.on('data', data => {
					try{
						msgHandler.handle(data.toString());
					} catch(e){
						console.log("Invalid message from "+peer.name+" at "+peer.socket.remoteAddress);
						console.log(e);
						client.destroy();
					}
				});


			client.on('end', () => {
				console.log(client.remoteAddress+" port "+client.remotePort+" closed their connection.");
				// Need to connect to someone else!
			});
		}
	}
}

export function sendMessage(data:string, peer:Peer){
	const socket = peer.socket
	if(socket !== undefined)
		socket.write(data);
	console.log("Sent: "+data)
}

export function broadcastMessage(data:string){
	connectedPeerList.forEach((peer,index) => {
		sendMessage(data,peer);
	});
}

export function sayHello(peer:Peer, myName:string){
	sendMessage(Message.encodeMessage({type:'hello',version:'0.7.0',agent:myName}), peer);
}

export function askForPeers(peer:Peer){
	sendMessage(Message.encodeMessage({type:'getpeers'}), peer);
}

export async function discoveredNewPeers(peerset: string[]){
	const discoveredPeerList = await readDiscoveredPeers();
	peerset.forEach((item,index) => {
		if(!discoveredPeerList.includes(item))
			discoveredPeerList.push(item);
	});
	await peerDB.put('discoveredPeerList', discoveredPeerList);
}

export async function sendDiscoveredPeers(peer: Peer){
	const discoveredPeerList = await readDiscoveredPeers();
	const msgObject = {type:"peers", peers:discoveredPeerList};
	sendMessage(Message.encodeMessage(msgObject), peer);
}

export async function readDiscoveredPeers(){
	if(await peerDB.exists('discoveredPeerList'))
		return await peerDB.get('discoveredPeerList');
	else {
		await peerDB.put('discoveredPeerList',[]);
		return [];
	}
}

export function closeDueToError(peer:Peer, error:string){
	console.log(error);
	peer.socket.destroy();
}

// TODO: Figure out @types/net package
// Currently, noImplicitAny has been set to false to handle unkown type function arguments
