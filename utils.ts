const canonicalize = require('canonicalize')
import sha256 from 'fast-sha256'

// This function is added in HW 3
export function hexToNumber(hex:string){
	return Number("0x"+hex)
}

// This function is added in HW 2
export function nullSignatures(obj:any){
	// The following replaces all occurrences of the pattern "sig":"<sequence of 128 hex digits>" by the string "sig":null
	return canonicalize(obj).replaceAll(/\"sig\":\"[0-9a-f]{128}\"/g,'\"sig\":null');
}

// This function is added in HW 2
export function objectToId(object: any){
	let enc = new TextEncoder()
	return Buffer.from(sha256(enc.encode(canonicalize(object)))).toString('hex')
}


// copied from https://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address
// and https://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
export function validateIpPort(str:string){
	const portRegex = /^([0-9]|[1-9][0-9]{1,3}|[1-5][0-9]{1,4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
	const hostRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])\:([0-9]|[1-9][0-9]{1,3}|[1-5][0-9]{1,4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
	const ipv4Regex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\:([0-9]|[1-9][0-9]{1,3}|[1-5][0-9]{1,4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
	const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\:([0-9]|[1-9][0-9]{1,3}|[1-5][0-9]{1,4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/

	return (ipv4Regex.test(str) || hostRegex.test(str) || ipv6Regex.test(str))
}

export function parseIpPort(str:string){
	if(!validateIpPort(str))
		throw "Invalid peer address"
	let ipPort = str.split(':')
	if(ipPort.length!==2){
		// Maybe it's IPv6
		ipPort = str.split(']:')
		ipPort[0] = ipPort[0].substr(1)
	}
	if(ipPort.length!==2)
		throw "Can't parse into name/ip:port"
	let port = parseInt(ipPort[1])
	if(port!==NaN)
		return [ipPort[0], port]
	else throw "Invalid port"
}