import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template, Partial, Null } from 'runtypes';
import level from 'level-ts'

export const UTXO = Record({
	txid: String,
	index: Number
})

export type UTXOType = Static<typeof UTXO>

const utxoDB = new level('./utxoDatabase')
// Database will store blockid : UTXOType []
// This is naive snapshot of state at each block

export async function addUTXOSet (blockid: string, utxoSet: UTXOType[]) {
	if (!await utxoDB.exists(blockid)) {
		await utxoDB.put(blockid, utxoSet)
	}
}

export async function getUTXOSet (blockid: string) {
	return await utxoDB.get(blockid)
}