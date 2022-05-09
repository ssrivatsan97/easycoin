import * as ed from '@noble/ed25519'
import level from 'level-ts'
import sha256 from 'fast-sha256'
const canonicalize = require('canonicalize')
const fs = require('fs');

const T = "00000002af000000000000000000000000000000000000000000000000000000"
// const testKeysDB = new level('./testKeysDatabase');

function randomNonce(){
  return Buffer.from(ed.utils.randomPrivateKey()).toString('hex')
}

function hexToNumber(hex:string){
  return Number("0x"+hex)
}

// Return true if first hex is strictly smaller than second hex
// Assume that inputs are hex strings of equal length
function isSmallerHex(hex1:string, hex2:string) {
  return hex1.localeCompare(hex2) < 0
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

function mine(blockWithoutNonce: object, target: string = T){
  let hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  let block
  let startTime = Date.now()
  let ctr = 0
  let minhash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  while (! isSmallerHex(hash, target)) {
    let nonce = randomNonce()
    let created = Date.now()
    block =  Object.assign(JSON.parse(JSON.stringify(blockWithoutNonce)), {nonce, created})
    hash = objectToId(block)
    ctr++
    if (isSmallerHex(hash, minhash)){
      minhash = hash
    }
    if (ctr % 10000000 === 0) {
      console.log("Minimum hash so far: "+minhash)
    }
  }
  let endTime = Date.now()
  console.log("Mined one block. Time taken " + (endTime-startTime)/1000 + " seconds")
  return block
}

async function generateCoinbaseAndDoubleSpend(coinbaseHeight: number = 1) {
  const privateKey2 = ed.utils.randomPrivateKey();
  const publicKey2 = Buffer.from(await ed.getPublicKey(privateKey2)).toString('hex');
  const coinbase2 = {type: "transaction", height:coinbaseHeight, outputs: [{pubkey:publicKey2,value: 50000000000000}]}
  const coinbase2Id = objectToId(coinbase2)

  let randomPublicKey = randomNonce()
  const tx1Unsigned = {
    type: "transaction",
    inputs: [{
      outpoint: {
        txid: coinbase2Id,
        index: 0
      },
      sig: null
    }],
    outputs: [{
      pubkey: randomPublicKey,
      value: 49000000000000
    }]
  }
  let tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(tx1Unsigned)).toString('hex'), privateKey2)).toString('hex')
  const tx1Signed = {
    type: "transaction",
    inputs: [{
      outpoint: {
        txid: coinbase2Id,
        index: 0
      },
      sig: tempSig
    }],
    outputs: [{
      pubkey: randomPublicKey,
      value: 49000000000000
    }]
  }

  randomPublicKey = randomNonce()
  const tx2Unsigned = {
    type: "transaction",
    inputs: [{
      outpoint: {
        txid: coinbase2Id,
        index: 0
      },
      sig: null
    }],
    outputs: [{
      pubkey: randomPublicKey,
      value: 48000000000000
    }]
  }
  tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(tx2Unsigned)).toString('hex'), privateKey2)).toString('hex')
  const tx2Signed = {
    type: "transaction",
    inputs: [{
      outpoint: {
        txid: coinbase2Id,
        index: 0
      },
      sig: tempSig
    }],
    outputs: [{
      pubkey: randomPublicKey,
      value: 48000000000000
    }]
  }
  return [coinbase2, tx1Signed, tx2Signed]
}

async function generateBlocks() {
  // Genesis block
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

  // blockTestDB += "Genesis block"+'\n'
  // blockTestDB += writeObject(genesisBlock)
  // blockTestDB += genesisId+'\n\n'

  // Invalid block 1: incorrect target but correct proof of work
  /*
  const invalidBlock1WithoutNonce = {
    T: "f000000000000000000000000000000000000000000000000000000000000000",
    // created: 0,
    // nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "Block with incorrect target",
    previd: genesisId,
    txids: [],
    type: "block"
  }
  console.log("Mining invalid block 1 ...")
  const invalidBlock1 = mine(invalidBlock1WithoutNonce, "f000000000000000000000000000000000000000000000000000000000000000")
  // const invalidBlock1 = invalidBlock1WithoutNonce
  blockTestDB += "Incorrect target"+'\n'
  blockTestDB += writeObject(invalidBlock1)
  blockTestDB += objectToId(invalidBlock1)+'\n\n'

  console.log(blockTestDB)
  fs.writeFile('./blocktestDB1.txt', blockTestDB, 'utf8', ()=>{});
  console.log("Written to file")

  // Invalid block: coinbase transaction spent twice in the next block
  
  blockTestDB = ""
  const [coinbase2, tx1Signed, tx2Signed] = await generateCoinbaseAndDoubleSpend(1)
  const coinbase2Id = objectToId(coinbase2)
  blockTestDB += "Coinbase transaction" + '\n'
  blockTestDB += writeObject(coinbase2)
  blockTestDB += coinbase2Id + '\n\n'
  
  const coinbaseBlock2WithoutNonce = {
    T: T,
    created: 0,
    nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block has a coinbase transaction",
    previd: genesisId,
    txids: [coinbase2Id],
    type: "block"
  }
  console.log("Mining coinbase block ...")
  const coinbaseBlock2 = mine(coinbaseBlock2WithoutNonce)
  // const coinbaseBlock2 = coinbaseBlock2WithoutNonce
  const coinbaseBlock2Id = objectToId(coinbaseBlock2)
  blockTestDB += "Coinbase block" + '\n'
  blockTestDB += writeObject(coinbaseBlock2)
  blockTestDB += coinbaseBlock2Id+'\n\n'

  blockTestDB += "First transaction that spends coinbase" + '\n'
  blockTestDB += writeObject(tx1Signed)
  blockTestDB += objectToId(tx1Signed) + '\n\n'
  
  blockTestDB += "Second transaction that spends coinbase" + '\n'
  blockTestDB += writeObject(tx2Signed)
  blockTestDB += objectToId(tx2Signed) + '\n\n'

  const blockSpendsTwiceWithoutNonce = {
    T: T,
    created: 0,
    nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block spends coinbase transaction twice",
    previd: coinbaseBlock2Id,
    txids: [objectToId(tx1Signed), objectToId(tx2Signed)],
    type: "block"
  }
  console.log("Mining invalid block 2 ...")
  const blockSpendsTwice = mine(blockSpendsTwiceWithoutNonce)
  // const blockSpendsTwice = blockSpendsTwiceWithoutNonce
  const invalidBlock2Id = objectToId(blockSpendsTwice)
  blockTestDB += "Block spends same transaction twice" + '\n'
  blockTestDB += writeObject(blockSpendsTwice)
  blockTestDB += invalidBlock2Id + '\n\n'

  console.log(blockTestDB)
  fs.writeFile('./blocktestDB2.txt', blockTestDB, 'utf8', ()=>{});
  console.log("Written to file")

  // Invalid block: Spend same transaction twice across two blocks.

  blockTestDB = ""
  const [coinbase3, tx3Signed, tx4Signed] = await generateCoinbaseAndDoubleSpend(1)
  const coinbase3Id = objectToId(coinbase3)
  blockTestDB += "Coinbase transaction" + '\n'
  blockTestDB += writeObject(coinbase3)
  blockTestDB += coinbase3Id + '\n\n'
  
  const coinbaseBlock3WithoutNonce = {
    T: T,
    created: 0,
    nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block has a coinbase transaction",
    previd: genesisId,
    txids: [coinbase3Id],
    type: "block"
  }
  console.log("Mining coinbase block ...")
  const coinbaseBlock3 = mine(coinbaseBlock3WithoutNonce)
  // const coinbaseBlock3 = coinbaseBlock3WithoutNonce
  const coinbaseBlock3Id = objectToId(coinbaseBlock3)
  blockTestDB += "Coinbase block" + '\n'
  blockTestDB += writeObject(coinbaseBlock3)
  blockTestDB += coinbaseBlock3Id+'\n\n'

  blockTestDB += "First transaction that spends coinbase" + '\n'
  blockTestDB += writeObject(tx3Signed)
  blockTestDB += objectToId(tx3Signed) + '\n\n'
  
  blockTestDB += "Second transaction that spends coinbase" + '\n'
  blockTestDB += writeObject(tx4Signed)
  blockTestDB += objectToId(tx4Signed) + '\n\n'

  const blockSpendsOnceWithoutNonce = {
    T: T,
    created: 0,
    nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block spends coinbase transaction once (it is valid)",
    previd: coinbaseBlock3Id,
    txids: [objectToId(tx3Signed)],
    type: "block"
  }
  console.log("Mining block that spends coinbase ...")
  const blockSpendsOnce = mine(blockSpendsOnceWithoutNonce)
  // const blockSpendsOnce = blockSpendsOnceWithoutNonce
  const blockSpendsOnceId = objectToId(blockSpendsOnce)
  blockTestDB += "Block spends coinbase once" + '\n'
  blockTestDB += writeObject(blockSpendsOnce)
  blockTestDB += blockSpendsOnceId + '\n\n'

  const blockSpendsAgainWithoutNonce = {
    T: T,
    created: 0,
    nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block spends coinbase transaction again (it is invalid)",
    previd: blockSpendsOnceId,
    txids: [objectToId(tx4Signed)],
    type: "block"
  }
  console.log("Mining invalid block that spends coinbase again ...")
  const blockSpendsAgain = mine(blockSpendsAgainWithoutNonce)
  // const blockSpendsAgain = blockSpendsAgainWithoutNonce
  const invalidBlock3Id = objectToId(blockSpendsAgain)
  blockTestDB += "Block spends coinbase again (invalid)" + '\n'
  blockTestDB += writeObject(blockSpendsAgain)
  blockTestDB += invalidBlock3Id + '\n\n'

  console.log(blockTestDB)
  fs.writeFile('./blocktestDB3.txt', blockTestDB, 'utf8', ()=>{});
  console.log("Written to file")
  */

  // Mine block that spends coinbase that doesn't exist
  blockTestDB = ""
  const [coinbase4, tx5Signed, tx6Signed] = await generateCoinbaseAndDoubleSpend(1)
  const coinbase4Id = objectToId(coinbase4)
  blockTestDB += "Coinbase transaction" + '\n'
  blockTestDB += writeObject(coinbase4)
  blockTestDB += coinbase4Id+'\n\n'

  blockTestDB += "Transaction that spends coinbase" + '\n'
  blockTestDB += writeObject(tx5Signed)
  blockTestDB += objectToId(tx5Signed) + '\n\n'

  const blockSpendsUnknownUTXOWithoutNonce = {
    T: T,
    // created: 0,
    // nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block spends a coinbase transaction not in its prev blocks",
    previd: genesisId,
    txids: [objectToId(tx5Signed)],
    type: "block"
  }
  console.log("Mining block that spends coinbase not in its prev blocks ...")
  const blockSpendsUnknownUTXO = mine(blockSpendsUnknownUTXOWithoutNonce)
  // const blockSpendsUnknownUTXO = blockSpendsUnknownUTXOWithoutNonce
  const invalidBlock4Id = objectToId(blockSpendsUnknownUTXO)
  blockTestDB += "Block that spends coinbase not in its prefix" + '\n'
  blockTestDB += writeObject(blockSpendsUnknownUTXO)
  blockTestDB += invalidBlock4Id+'\n\n'

  console.log(blockTestDB)
  fs.writeFile('./blocktestDB4.txt', blockTestDB, 'utf8', ()=>{});
  console.log("Written to file")

  // Mine valid block
  blockTestDB = ""
  const [coinbase5, tx7Signed, tx8Signed] = await generateCoinbaseAndDoubleSpend(1)
  const coinbase5Id = objectToId(coinbase5)
  blockTestDB += "Coinbase transaction" + '\n'
  blockTestDB += writeObject(coinbase5)
  blockTestDB += coinbase5Id+'\n\n'

  const coinbaseBlock5WithoutNonce = {
    T: T,
    // created: 0,
    // nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block has a coinbase transaction",
    previd: genesisId,
    txids: [coinbase5Id],
    type: "block"
  }
  console.log("Mining coinbase block ...")
  const coinbaseBlock5 = mine(coinbaseBlock5WithoutNonce)
  // const coinbaseBlock5 = coinbaseBlock5WithoutNonce
  const coinbaseBlock5Id = objectToId(coinbaseBlock5)
  blockTestDB += "Coinbase block" + '\n'
  blockTestDB += writeObject(coinbaseBlock5)
  blockTestDB += coinbaseBlock5Id+'\n\n'

  blockTestDB += "Transaction that spends coinbase" + '\n'
  blockTestDB += writeObject(tx7Signed)
  blockTestDB += objectToId(tx7Signed) + '\n\n'

  const [coinbase6, tx9Signed, tx10Signed] = await generateCoinbaseAndDoubleSpend(2)
  coinbase6.outputs[0].value = 51000000000000
  const coinbase6Id = objectToId(coinbase6)
  blockTestDB += "Another coinbase transaction" + '\n'
  blockTestDB += writeObject(coinbase6)
  blockTestDB += coinbase6Id+'\n\n'

  const validBlock1WithoutNonce = {
    T: T,
    // created: 0,
    // nonce: "0000000000000000000000000000000000000000000000000000000000000000",
    miner: "grader",
    note: "This block has another coinbase and spends earlier coinbase",
    previd: coinbaseBlock5Id,
    txids: [coinbase6Id, objectToId(tx7Signed)],
    type: "block"
  }
  console.log("Mining valid block 1 ...")
  const validBlock1 = mine(validBlock1WithoutNonce)
  // const validBlock1 = validBlock1WithoutNonce
  const validBlock1Id = objectToId(validBlock1)
  blockTestDB += "Valid block" + '\n'
  blockTestDB += writeObject(validBlock1)
  blockTestDB += validBlock1Id+'\n\n'

  console.log(blockTestDB)
  fs.writeFile('./blocktestDB5.txt', blockTestDB, 'utf8', ()=>{});
  console.log("Written to file")
}

generateBlocks()