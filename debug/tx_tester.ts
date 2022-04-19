const net = require('net')
import {Socket} from 'net'
import * as ed from '@noble/ed25519'
import level from 'level-ts'
import sha256 from 'fast-sha256'
import {nullSignatures,objectToId} from '../utils'
const canonicalize = require('canonicalize')

const client = new net.Socket();
const port = 18018;
const address = "localhost"

const keysDB = new level('./keysDatabase');

let txTestDB = ""

function writeObject(obj){
	return canonicalize(objectify(obj))+'\n'
}

function objectify(obj){
	return {type:"object", object:obj}
}

async function generateTxs(){
	const pri = await keysDB.get('priHex')
	const pub = await keysDB.get('pubHex')
	
	const validCoinbase = {type: "transaction", height:0, outputs: [{pubkey:pub,value: 50000000000}]}
	// console.log(canonicalize(validCoinbase))
	const validCoinbaseId = objectToId(validCoinbase)

	const nullTx = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	const txSign = Buffer.from(await ed.sign(Buffer.from(canonicalize(nullTx)).toString('hex'), pri)).toString('hex')
	const validTx = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:txSign}], outputs: [{pubkey:pub,value: 10}]}
	const validTxId = objectToId(validTx)

	txTestDB += "Valid coinbase"+'\n'
	txTestDB += writeObject(validCoinbase)+'\n'
	txTestDB += "Valid transaction"+'\n'
	txTestDB += writeObject(validTx)+'\n'

	let nullTx2 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:null}, {outpoint:{txid:validTxId, index: 0}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	const txSign2 = Buffer.from(await ed.sign(Buffer.from(canonicalize(nullTx2)).toString('hex'), pri)).toString('hex')
	let validTx2 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:txSign2}, {outpoint:{txid:validTxId, index: 0}, sig:txSign2}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += "Valid transaction with 2 inputs"+'\n'
	txTestDB += writeObject(validTx2)+'\n'

	let invalidCoinbase1 = {type: "transaction", outputs: [{pubkey:pub,value: 50000000000}]}
	txTestDB += "Invalid coinbase: no height"+'\n'
	txTestDB += writeObject(invalidCoinbase1)+'\n'

	txTestDB += "Random txid in outpoint of input"+'\n'
	let invalidTx1 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId.replace('5','6'), index: 0}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	let tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(invalidTx1)).toString('hex'), pri)).toString('hex')
	invalidTx1 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId.replace('5','6'), index: 0}, sig:tempSig}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx1)+'\n'
	
	txTestDB += "txid points to TestObject instead of transaction"+'\n'
	let invalidTx2 = {type: "transaction", inputs: [{outpoint:{txid:"c90232586b801f9558a76f2f963eccd831d9fe6775e4c8f1446b2331aa2132f2", index: 0}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(invalidTx2)).toString('hex'), pri)).toString('hex')
	invalidTx2 = {type: "transaction", inputs: [{outpoint:{txid:"c90232586b801f9558a76f2f963eccd831d9fe6775e4c8f1446b2331aa2132f2", index: 0}, sig:tempSig}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx2)+'\n'

	txTestDB += "Index exceeding number of outputs"+'\n'
	let invalidTx3 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 1}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(invalidTx3)).toString('hex'), pri)).toString('hex')
	invalidTx3 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 1}, sig:tempSig}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx3)+'\n'

	txTestDB += "Index not an integer"+'\n'
	let invalidTx4 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 2.3}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(invalidTx4)).toString('hex'), pri)).toString('hex')
	invalidTx4 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 2.3}, sig:tempSig}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx4)+'\n'

	txTestDB += "Index is negative"+'\n'
	let invalidTx5 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: -2}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(invalidTx5)).toString('hex'), pri)).toString('hex')
	invalidTx5 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: -2}, sig:tempSig}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx5)+'\n'

	txTestDB += "Null signature"+'\n'
	let invalidTx6 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:null}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx6)+'\n'

	txTestDB += "No signature"+'\n'
	let invalidTx7 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx7)+'\n'

	txTestDB += "Invalid signature"+'\n'
	let invalidTx8 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:invalidTx5.inputs[0].sig}], outputs: [{pubkey:pub,value: 10}]}
	txTestDB += writeObject(invalidTx8)+'\n'

	txTestDB += "Two inputs and fails law of conservation"+'\n'
	let invalidTx9 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:null}, {outpoint:{txid:validTxId, index: 0}, sig:null}], outputs: [{pubkey:pub,value: 5000000000011}]}
	tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(invalidTx9)).toString('hex'), pri)).toString('hex')
	invalidTx9 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:tempSig}, {outpoint:{txid:validTxId, index: 0}, sig:tempSig}], outputs: [{pubkey:pub,value: 5000000000011}]}
	txTestDB += writeObject(invalidTx9)+'\n'

	txTestDB += "Two inputs, two outputs and fails law of conservation"+'\n'
	let invalidTx10 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:null}, {outpoint:{txid:validTxId, index: 0}, sig:null}], outputs: [{pubkey:pub,value: 2000000000011},{pubkey:pub,value: 3000000000011}]}
	tempSig = Buffer.from(await ed.sign(Buffer.from(canonicalize(invalidTx10)).toString('hex'), pri)).toString('hex')
	invalidTx10 = {type: "transaction", inputs: [{outpoint:{txid:validCoinbaseId, index: 0}, sig:tempSig}, {outpoint:{txid:validTxId, index: 0}, sig:tempSig}], outputs: [{pubkey:pub,value: 2000000000011},{pubkey:pub,value: 3000000000011}]}
	txTestDB += writeObject(invalidTx10)+'\n'

	const fs = require('fs');
	fs.writeFile('./txtestDB.txt', txTestDB, 'utf8', ()=>{});
	console.log("Written to file")
}

generateTxs()

// client.connect({port:port, host:address}, () => {
// 	console.log("Successfully connected to peer at "+address+" port "+port);
// });

// client.on('error', (error) => {
// 	console.log('Error: ' + error);
// });

// client.on('data', data => {
// 	console.log("Received data "+data+" from "+address+":"+port)
// });

// client.on('end', () => {
// 	console.log(client.remoteAddress+" port "+client.remotePort+" closed their connection.");
// });

// Test 1:
// Valid tx with height in coinbase:
// {"height":0,"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":50000000000}],"type":"transaction"}
// {"object":{"height":0,"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":50000000000}],"type":"transaction"},"type":"object"}
// {"inputs":[{"outpoint":{"index":0,"txid":"47ccdf2be98e95e4ce96a4d1561003d01b1d28ddbb3801129e27c1d1d6fcd3f2"},"sig":"a85177419191c702a308b26ce67856e8ea5b80265e683033685225c61ed2b19645662ca9494e8e1b95b20cfd3f41345b31a77fc2943b2c40f6c9778de8e98905"}],"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":10}],"type":"transaction"}
// {"object":{"inputs":[{"outpoint":{"index":0,"txid":"47ccdf2be98e95e4ce96a4d1561003d01b1d28ddbb3801129e27c1d1d6fcd3f2"},"sig":"a85177419191c702a308b26ce67856e8ea5b80265e683033685225c61ed2b19645662ca9494e8e1b95b20cfd3f41345b31a77fc2943b2c40f6c9778de8e98905"}],"outputs":[{"pubkey":"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value":10}],"type":"transaction"},"type":"object"}

// Test 2:
// 
// {"type": "transaction", "height":0, "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 50000000000}]}
// with hash = "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3"
// {"object":{"type": "transaction", "height":0, "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 50000000000}]},"type":"object"}
// {"type": "transaction", "inputs": [{"outpoint": {"txid": "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3", "index": 0}, "sig": "aed4d1f13933e195f68add86915c099366f7d198602afb13551df5575dc57013b83d84f70b310e28c72b0c143d8fab6ce2fc38a7f88d466d1ccc88a4b2970809"}], "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 10}]}
// {"object":{"type": "transaction", "inputs": [{"outpoint": {"txid": "49737b7bca5955a9ea58ab44a00e72ac4804ad2a26b731b99069bdf035e071c3", "index": 0}, "sig": "aed4d1f13933e195f68add86915c099366f7d198602afb13551df5575dc57013b83d84f70b310e28c72b0c143d8fab6ce2fc38a7f88d466d1ccc88a4b2970809"}], "outputs": [{"pubkey": "77bd8ef0bf4d9423f3681b01f8b5b4cfdf0ee69fb356a7762589f1b65cdcab63", "value": 10}]},"type":"object"}