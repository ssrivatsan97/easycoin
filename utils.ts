const canonicalize = require('canonicalize')
import sha256 from 'fast-sha256'

// This function is added in HW 3
export function hexToNumber(hex:string){
	return Number("0x"+hex)
}

// This function is added in HW 2
export function nullSignatures(obj:any){
	// The following replaces all occurrences of the pattern "sig":"<sequence of 128 hex digits>" by the string "sig":null
	return canonicalize(obj).replace(/\"sig\":\"[0-9a-f]{128}\"/,'\"sig\":null');
}

// This function is added in HW 2
export function objectToId(object: any){
	return Buffer.from(sha256(canonicalize(object))).toString('hex')
}

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