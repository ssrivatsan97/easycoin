import * as network from './network'
import {initDBs} from './init'

initDBs().then(result => {
	network.connectAsServer(true);
})