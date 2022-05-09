import { Boolean, Number, String, Literal, Array, Tuple, Record, Union, Static, Template, Partial, Null } from 'runtypes';

export const UTXO = Record({
	txid: String,
	index: Number
})

export type UTXOType = Static<typeof UTXO>
