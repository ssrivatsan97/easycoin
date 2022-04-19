const canonicalize = require('canonicalize')

export function parseIpPort(str:string){
	let ipPort = str.split(':')
	if(ipPort.length!==2){
		// Maybe it's IPv6
		ipPort = str.split(']:')
		ipPort[0] = ipPort[0].substr(1)
	}
	if(ipPort.length!==2)
		throw "Too many colons"
	let port = parseInt(ipPort[1])
	if(port!==NaN)
		return [ipPort[0], port]
	else throw "Invalid port"
}