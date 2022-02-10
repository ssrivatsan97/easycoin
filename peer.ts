

export class Peer{
	name: string;
	socket: any;
	introduced: boolean;

	constructor(name:string, socket:any){
		this.name = name;
		this.socket = socket;
		this.introduced = false;
	}

	introduction(name: string){
		this.name = name;
		this.introduced = true;
	}
}