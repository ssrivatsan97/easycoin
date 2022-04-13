import sha256 from 'fast-sha256'
const canonicalize = require('canonicalize')
// import {objectToId} from '../utils'

var enc = new TextEncoder()
var dec = new TextDecoder("utf-8")

let obj1 = {inputs:[{outpoint:{index:0,txid:"47ccdf2be98e95e4ce96a4d1561003d01b1d28ddbb3801129e27c1d1d6fcd3f2"},sig:"a85177419191c702a308b26ce67856e8ea5b80265e683033685225c61ed2b19645662ca9494e8e1b95b20cfd3f41345b31a77fc2943b2c40f6c9778de8e98905"}],outputs:[{pubkey:"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9",value:10}],type:"transaction"}
let str1 = canonicalize(obj1)
let uint1 = enc.encode(str1)
let hash1 = Buffer.from(sha256(uint1)).toString('hex')

let obj2 = {inputs:[{outpoint:{index:0,txid:"47ccdf2be98e95e4ce96a4d1561003d01b1d28ddbb3801129e27c1d1d6fcd3f2"},sig:"p85177419191c702a308b26ce67856e8ea5b80265e683033685225c61ed2b19645662ca9494e8e1b95b20cfd3f41345b31a77fc2943b2c40f6c9778de8e98905"}],outputs:[{pubkey:"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9",value:10}],type:"transaction"}
let str2 = canonicalize(obj2)
let uint2 = enc.encode(str2)
let hash2 = Buffer.from(sha256(uint2)).toString('hex')

console.log("Object 1:")
console.log(str1)
console.log(uint1)
console.log("Object ID: "+hash1)

console.log("Object 2:")
console.log(str2)
console.log(uint2)
console.log("Object ID: "+hash2)
console.log("Both are same? "+(hash1===hash2))