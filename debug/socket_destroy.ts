import * as net from 'net'
import {Socket} from 'net'

const server = net.createServer();

server.on('connection', socket => {
	console.log("New TCP connection");
	console.log("Local port " + socket.localPort + ", local address " + socket.localAddress);
	console.log("Client: " + socket.remoteFamily + "address " + socket.remoteAddress + ", port " + socket.remotePort);

	socket.on('close', hadError => {
		socket.write("I'm disconnecting due to error")
		if(!hadError)
			console.log("Connection at "+socket.remoteAddress+" port "+socket.remotePort+" closed.");
		else
			console.log("Connection at "+socket.remoteAddress+" port "+socket.remotePort+" closed due to error.");
		socket.destroy();
	});

	socket.on('data', data => {
		socket.end("I do not want any message!")
	});
});

	server.on('error',function(error){
	  console.log('Error: ' + error);
	});

	server.listen(18018, () => {
		const ser_addr = server.address();
		console.log("Server: " + ser_addr);
		console.log("Listening for connections");
	});