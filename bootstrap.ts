import * as network from './network'
import {config} from './constants'
import {initObjectDB} from './objects'
import {initStateDB} from './blocks'
import {initChainDB} from './chains'
import {startSendingTxs} from './send_txs'

Promise.allSettled([initObjectDB(), initStateDB(), initChainDB()])
.then(result => {
	network.connectAsServer(true);
	if (config.sendTxs)
		startSendingTxs();
})