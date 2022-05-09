import * as net from 'net'
import {Socket} from 'net'

const server = net.createServer();
const port = 18018;

server.on('connection', socket => {
	console.log("New TCP connection");
	console.log("Local port " + socket.localPort + ", local address " + socket.localAddress);
	console.log("Client: " + socket.remoteFamily + "address " + socket.remoteAddress + ", port " + socket.remotePort);
	discoveredNewPeers([socket.localAddress + ":" + socket.localPort.toString()]);
	// console.log(socket.localAddress+":"+socket.localPort.toString())
});

server.listen(port, () => {
	const ser_addr = server.address();
	console.log("Server: " + ser_addr);
	console.log("Listening for connections");
});

async function discoveredNewPeers(peerset: string[]){
	const discoveredPeerList = await readDiscoveredPeers();
	peerset.forEach((item,index) => {
		if(!discoveredPeerList.includes(item))
			discoveredPeerList.push(item);
	});
	await peerDB.put('discoveredPeerList', discoveredPeerList);
}