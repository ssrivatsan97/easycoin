import * as network from './network';
import {config} from './constants'
import {initObjectDB} from './objects'
import {initStateDB} from './blocks'
import {initChainDB} from './chains'
import {startMining} from './mine'
import {startSendingTxs} from './send_txs'

Promise.allSettled([initObjectDB(), initStateDB(), initChainDB()])
.then(result => {
	return network.connectAsClient();
})
.then(result => {
	network.connectAsServer();
	if (config.mine)
		startMining();
	if (config.sendTxs)
		startSendingTxs();
})