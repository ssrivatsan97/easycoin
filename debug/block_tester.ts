import * as ed from '@noble/ed25519'
import level from 'level-ts'
import sha256 from 'fast-sha256'
const canonicalize = require('canonicalize')

const T = "00000002af000000000000000000000000000000000000000000000000000000"
const keysDB = new level('./keysDatabase');

function randomNonce(){
	return Buffer.from(ed.utils.randomPrivateKey()).toString('hex')
}

function hexToNumber(hex:string){
  return Number("0x"+hex)
}

function nullSignatures(obj:any){
  // The following replaces all occurrences of the pattern "sig":"<sequence of 128 hex digits>" by the string "sig":null
  return canonicalize(obj).replaceAll(/\"sig\":\"[0-9a-f]{128}\"/g,'\"sig\":null');
}

function objectToId(object: any){
  let enc = new TextEncoder()
  return Buffer.from(sha256(enc.encode(canonicalize(object)))).toString('hex')
}

function writeObject(obj){
  return canonicalize(objectify(obj))+'\n'
}

function objectify(obj){
  return {type:"object", object:obj}
}

function mine(blockWithoutNonce: object){
  let hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  let block
  while (hexToNumber(hash) >= hexToNumber(T)) {
    let nonce = randomNonce()
    // console.log("Nonce: "+nonce)
    block =  Object.assign({nonce}, JSON.parse(JSON.stringify(blockWithoutNonce)))
    hash = objectToId(block)
    // console.log("Hash: "+hash+"\n")
  }
  return block
}

async function generateBlocks() {
  const genesisBlock = {
    T: "00000002af000000000000000000000000000000000000000000000000000000",
    created: 1624219079,
    miner: "dionyziz",
    nonce: "0000000000000000000000000000000000000000000000000000002634878840",
    note: "The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage",
    previd: null,
    txids: [],
    type: "block"
  }
  const genesisId = "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e"

  let blockTestDB = ""

  blockTestDB += "Genesis block"+'\n'
  blockTestDB += writeObject(genesisBlock)

  const invalidBlock1 = {
    T: "00000002bf000000000000000000000000000000000000000000000000000000",
    created: 1624219079,
    miner: "dionyziz",
    nonce: "0000000000000000000000000000000000000000000000000000002634878840",
    note: "The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage",
    previd: null,
    txids: [],
    type: "block"
  }
  blockTestDB += "Incorrect target"+'\n'
  blockTestDB += writeObject(invalidBlock1)

  const invalidBlock2 = {
    T: T,
    created: 1624219079,
    miner: "dionyziz",
    nonce: "0000000000000000000000000000000000000000000000000000002634878840",
    note: "The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage",
    previd: "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e",
    txids: [],
    type: "block"
  }
  blockTestDB += "Proof of Work not valid"+'\n'
  blockTestDB += writeObject(invalidBlock2)

  // const pri = await keysDB.get('priHex')
  const pub = await keysDB.get('pubHex')
  const validCoinbase = {type: "transaction", height:0, outputs: [{pubkey:pub,value: 50000000000}]}
  const validCoinbaseId = objectToId(validCoinbase)

  const validBlockWithoutNonce = {
    T: T,
    created: Date.now(),
    miner: "svatsan",
    note: "First block. Yayy, I have 50 bu now!!",
    previd: "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e",
    txids: [validCoinbaseId],
    type: "block"
  }
  console.log("Mining a valid block ...")
  let startTime = Date.now()
  const validBlock = mine(validBlockWithoutNonce)
  let endTime = Date.now()
  console.log("Mined one block. Time taken " + (endTime-startTime)/1000 + " seconds")
  console.log(validBlock)
  console.log(objectToId(validBlock))

  const fs = require('fs');
  fs.writeFile('./blocktestDB.txt', blockTestDB, 'utf8', ()=>{});
  console.log("Written to file")
}

generateBlocks()