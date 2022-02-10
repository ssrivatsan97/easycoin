import * as network from './network'
// import * as yargs from 'yargs'

// const argv = yargs
// 	.option('port', 'Port to listen on', {
// 		port: {
// 			description: 'port number',
// 			alias: 'p',
// 			type: 'number'
// 		}
// 	})
// 	.help()
// 	.alias('help', 'h').argv;

// var port:number;
// if(argv.port)
// 	port = argv.port;
// else
// 	port = 18018;

network.connectAsServer(true);