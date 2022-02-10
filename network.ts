import * as net from 'net'
import {Socket} from 'net'
// import * as $ from 'jquery'
import * as fs from 'fs'
import {BiMap} from 'bimap'
import * as Message from './message'
import {Peer} from './peer'

const config = {
	"port" : 18018,
	"serverTimeoutDuration" : 300000,
	"socketTimeoutDuration" : 60000,
	"myName" : "EasyCoin",
	"bootstrapName" : "Bootstrap",
	"bootstrapAddress" : "localhost",
	"bootstrapPort" : 18020,
	"hardcodedPeerList" : ["localhost:18020"]
}

export function connectAsServer(bootstrapMode=false){
	var myName;
	var port;
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
				Message.handleMessage(data.toString(),thisPeer);
			} catch(e){
				// console.log("Invalid message from "+thisPeer.name+" at "+thisPeer.socket.remoteAddress);
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

	// Choose peers to connect to
	
	const client = new net.Socket();
	const bootstrapPeer = new Peer("no name", client);

	client.connect({port:bootstrapPort, host:bootstrapAddress}, () => {
		console.log("Successfully connected to peer at "+bootstrapAddress+" port "+bootstrapPort);
		sayHello(bootstrapPeer,myName);
		askForPeers(bootstrapPeer);
	});

	client.on('error', (error) => {
		console.log('Error: ' + error);
	});

	client.on('data', data => {
			try{
				Message.handleMessage(data.toString(),bootstrapPeer);
			} catch(e){
				// console.log("Invalid message from "+bootstrapPeer.name+" at "+bootstrapPeer.socket.remoteAddress);
				console.log(e);
				client.destroy();
			}
		});


	client.on('end', () => {
		console.log(client.remoteAddress+" port "+client.remotePort+" closed their connection.");
		// Need to connect to someone else!
	});
}

export function sendMessage(data:string, peer:Peer){
	var socket = peer.socket
	if(socket !== undefined)
		socket.write(data);
	console.log("Sent: "+data)
}

export function sayHello(peer:Peer, myName:string){
	sendMessage(Message.encodeMessage({type:'hello',version:'0.7.0',agent:myName}), peer);
}

export function askForPeers(peer:Peer){
	sendMessage(Message.encodeMessage({type:'getpeers'}), peer);
}

export function discoveredNewPeer(peerAddress: string){
	var discoveredPeerList = readDiscoveredPeers();
	if(!discoveredPeerList.includes(peerAddress))
		discoveredPeerList.push(peerAddress);
	fs.writeFileSync('./discoveredPeerList.json',JSON.stringify(discoveredPeerList),{encoding:'utf-8'});
}

export function sendDiscoveredPeers(peer: Peer){
	var msgObject = {type:"peers", peers:readDiscoveredPeers()};
	sendMessage(Message.encodeMessage(msgObject), peer);
}

export function readDiscoveredPeers(){
	var discoveredPeerList;
	var readText = fs.readFileSync("./discoveredPeerList.json").toString('utf-8');
	try{
		discoveredPeerList = JSON.parse(readText);
	} catch(e){
		console.log("Invalid stored peer list: "+readText);
	}
	// discoveredPeerList = ["localhost:18018","localhost:18020","dionyziz.com:18018","138.197.191.170:18018","[fe80::f03c:91ff:fe2c:5a79]:18018"];
	return discoveredPeerList;
}

// TODO: Figure out @types/net package
// noImplicitAny has been set to false to handle unkown type function arguments. What to do?
