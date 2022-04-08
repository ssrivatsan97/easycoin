import * as net from 'net'
import {Socket} from 'net'
import * as fs from 'fs'
import * as Message from './message'
import {Peer} from './peer'
import level from 'level-ts'
import {parseIpPort, validateIpPort} from './utils'
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
		discoveredNewPeers([socket.localAddress + ":" + socket.localPort]);
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
			connectedPeerList.forEach((item,index) => {
				if(item===thisPeer)
					connectedPeerList.splice(index,1)
			})
		});

		socket.on('data', data => {
			console.log("Data received from "+socket.remoteAddress+" port "+socket.remotePort+": "+data)
			msgHandler.handle(data.toString());
		});

		socket.on('error', error => {
			console.log("Connection error with "+socket.remoteAddress+" port "+socket.remotePort+": "+ error)
		})
	});

	server.on('error',function(error){
	  console.log('Error: ' + error);
	});

	server.listen(port, () => {
		const ser_addr = server.address();
		console.log("Server: " + ser_addr);
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
		let peer;
		let msgHandler;

		let address, port
		try{
			[address, port] = parseIpPort(peerAddress)
		} catch(error){
			console.log("Peer address " + peerAddress + " is invalid: " + error)
			discoveredPeerList.splice(i--,1)
			console.log("Removing "+peerAddress+" from discovered peer list")
		}
		if(address!==undefined && port!==undefined){
			client.connect({port:port, host:address}, () => {
				console.log("Successfully connected to peer at "+address+" port "+port);
				peer = new Peer("no name", client);
				connectedPeerList.push(peer);
				msgHandler = new Message.messageHandler(peer)
				sayHello(peer,myName);
				askForPeers(peer);
			});

			client.on('error', (error) => {
				console.log("Connection error with "+client.remoteAddress+" port "+client.remotePort+": "+ error)
				discoveredPeerList.splice(i--,1)
			});

			client.on('data', data => {
				console.log("Data received from "+client.remoteAddress+" port "+client.remotePort+": "+data)
				msgHandler.handle(data.toString());
			});

			client.on('close', (hadError) => {
				if(!hadError)
					console.log("Connection with "+client.remoteAddress+" port "+client.remotePort+" closed.");
				else
					console.log("Connection with "+client.remoteAddress+" port "+client.remotePort+" closed due to error.");
				connectedPeerList.forEach((item,index) => {
					if(item===peer)
						connectedPeerList.splice(index,1)
				})
				// Need to connect to someone else!
			});
		}
	}
	await peerDB.put('discoveredPeerList', discoveredPeerList)
}

export function sendMessage(data:string, peer:Peer){
	const socket = peer.socket
	if(socket !== undefined)
		socket.write(data);
	console.log("Sent: "+data+" to "+socket.remoteAddress+":"+socket.remotePort)
}

export function broadcastMessage(data:string){
	connectedPeerList.forEach((peer,index) => {
		sendMessage(data,peer);
	});
}

export function broadcastMessageExceptSender(data:string, sender:Peer){
	connectedPeerList.forEach((peer,index) => {
		if(peer!==sender)
			sendMessage(data,peer);
	});
}

export function sayHello(peer:Peer, myName:string){
	sendMessage(Message.encodeMessage({type:'hello',version:'0.8.0',agent:myName}), peer);
}

export function askForPeers(peer:Peer){
	sendMessage(Message.encodeMessage({type:'getpeers'}), peer);
}

export async function discoveredNewPeers(peerset: string[]){
	const discoveredPeerList = await readDiscoveredPeers();
	peerset.forEach((item,index) => {
		if(!discoveredPeerList.includes(item) && validateIpPort(item))
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

export function reportError(peer:Peer, error:string){
	console.log(error);
	sendMessage(Message.encodeMessage({type:"error", error:error}), peer)
}

export function closeDueToError(peer:Peer, error:string){
	reportError(peer, error)
	setTimeout(() => {
		peer.socket.destroy();
	}, 500)
}

// TODO: Figure out @types/net package
// Currently, noImplicitAny has been set to false to handle unkown type function arguments
