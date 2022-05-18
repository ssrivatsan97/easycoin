import * as network from './network'
import {initObjectDB} from './objects'
import {initStateDB} from './blocks'
import {initChainDB} from './chains'

Promise.allSettled([initObjectDB(), initStateDB(), initChainDB()])
.then(result => {
	network.connectAsServer(true);
})