import * as network from './network';
import {initDBs} from './init'

initDBs().then(result => {
	return network.connectAsClient();
}).then(result => {
	network.connectAsServer();
})