import level from 'level-ts'
const DB = new level('./database');

// TODO (f possible): function to delete all objects, all states or chains

export async function get(key: string){
	return await DB.get(key)
}

export async function exists(key: string){
	return await DB.exists(key)
}

export async function put(key: string, object: any){
	await DB.put(key, object)
}

export async function clear(prefix: string){
	const iterator = DB.iterate({})
	for await (const {key,value} of iterator){
		if (key.startsWith(prefix)){
			await DB.del(key)
		}
	}
	await iterator.end()
}